import type { APIRoute } from "astro";
import { prisma } from "../../../lib/db";
import { hashCode } from "../../../lib/hashing";
import { getSessionFromRequest } from "../../../lib/auth";

const PEPPER = process.env.AUTH_CODE_PEPPER!;

export const POST: APIRoute = async ({ request }) => {
  if (!PEPPER) return new Response("Missing AUTH_CODE_PEPPER", { status: 500 });

  const session = await getSessionFromRequest(request);
  const discordId = session?.discordId;
  if (!discordId) return new Response(null, { status: 302, headers: { Location: "/api/auth/signin" } });

  const form = await request.formData();
  const raw = String(form.get("code") || "").trim();
  if (!raw) return new Response("Missing code", { status: 400 });

  const codeHash = hashCode(raw, PEPPER);

  const auth = await prisma.authCode.findUnique({ where: { codeHash } });
  if (!auth) return new Response("Invalid code", { status: 400 });
  if (auth.redeemedAt) return new Response("Code already used", { status: 400 });
  if (new Date(auth.expiresAt).getTime() < Date.now()) return new Response("Code expired", { status: 400 });

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
