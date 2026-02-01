import type { APIRoute } from "astro";
import { prisma } from "../../../lib/db";
import { hashCode } from "../../../lib/hashing";
import { getSessionFromRequest } from "../../../lib/auth";

const PEPPER = process.env.AUTH_CODE_PEPPER!;

function errorRedirect(message: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: `/authorize?error=${encodeURIComponent(message)}` }
  });
}

export const POST: APIRoute = async ({ request }) => {
  if (!PEPPER) return errorRedirect("Server configuration error. Please contact support.");

  const session = await getSessionFromRequest(request);
  const discordId = session?.discordId;
  if (!discordId) return new Response(null, { status: 302, headers: { Location: "/api/auth/signin?callbackUrl=/authorize" } });

  const form = await request.formData();
  // Normalize: trim whitespace, convert to uppercase, remove any dashes/spaces
  const rawInput = String(form.get("code") || "");
  const raw = rawInput.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!raw) return errorRedirect("Please enter an authorization code.");

  const codeHash = hashCode(raw, PEPPER);

  const auth = await prisma.authCode.findUnique({ where: { codeHash } });
  if (!auth) {
    // Try lowercase variant as fallback for backwards compatibility
    const codeHashLower = hashCode(rawInput.trim().toLowerCase().replace(/[\s-]/g, ""), PEPPER);
    const authLower = await prisma.authCode.findUnique({ where: { codeHash: codeHashLower } });
    if (!authLower) return errorRedirect("Invalid code. Make sure you copied the full code from the bot.");
    // Use the lowercase match
    if (authLower.redeemedAt) return errorRedirect("This code has already been used.");
    if (new Date(authLower.expiresAt).getTime() < Date.now()) return errorRedirect("This code has expired. Please generate a new one.");

    const user = await prisma.user.upsert({
      where: { discordId: String(discordId) },
      update: {},
      create: { discordId: String(discordId) }
    });

    const network = await prisma.network.upsert({
      where: { ownerId: user.id },
      update: {},
      create: { ownerId: user.id, name: "My Network" }
    });

    await prisma.guild.upsert({
      where: { guildDiscordId: authLower.guildDiscordId },
      update: { guildName: authLower.guildName, networkId: network.id },
      create: { networkId: network.id, guildDiscordId: authLower.guildDiscordId, guildName: authLower.guildName }
    });

    await prisma.authCode.update({ where: { id: authLower.id }, data: { redeemedAt: new Date() } });

    return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
  }
  if (auth.redeemedAt) return errorRedirect("This code has already been used.");
  if (new Date(auth.expiresAt).getTime() < Date.now()) return errorRedirect("This code has expired. Please generate a new one.");

  const user = await prisma.user.upsert({
    where: { discordId: String(discordId) },
    update: {},
    create: { discordId: String(discordId) }
  });

  const network = await prisma.network.upsert({
    where: { ownerId: user.id },
    update: {},
    create: { ownerId: user.id, name: "My Network" }
  });

  await prisma.guild.upsert({
    where: { guildDiscordId: auth.guildDiscordId },
    update: { guildName: auth.guildName, networkId: network.id },
    create: { networkId: network.id, guildDiscordId: auth.guildDiscordId, guildName: auth.guildName }
  });

  await prisma.authCode.update({ where: { id: auth.id }, data: { redeemedAt: new Date() } });

  return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
};
