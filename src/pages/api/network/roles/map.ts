import type { APIRoute } from "astro";
import { prisma } from "../../../../lib/db";
import { getSessionFromRequest } from "../../../../lib/auth";

export const POST: APIRoute = async ({ request }) => {
  const session = await getSessionFromRequest(request);
  const discordId = session?.discordId;
  if (!discordId) return new Response(null, { status: 302, headers: { Location: "/api/auth/signin" } });

  const form = await request.formData();
  const networkRoleId = String(form.get("networkRoleId") || "");
  const guildId = String(form.get("guildId") || "");
  const roleDiscordId = String(form.get("roleDiscordId") || "").trim();
  const required = form.get("required") === "on";

  if (!networkRoleId || !guildId) return new Response("Bad request", { status: 400 });

  if (!roleDiscordId) {
    await prisma.roleMapping.deleteMany({ where: { networkRoleId, guildId } });
  } else {
    await prisma.roleMapping.upsert({
      where: { networkRoleId_guildId: { networkRoleId, guildId } },
      update: { roleDiscordId, required },
      create: { networkRoleId, guildId, roleDiscordId, required }
    });
  }

  return new Response(null, { status: 302, headers: { Location: `/dashboard/roles/mapping?id=${encodeURIComponent(networkRoleId)}` } });
};
