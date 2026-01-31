import type { APIRoute } from "astro";
import { prisma } from "../../../../lib/db";
import { getSessionFromRequest } from "../../../../lib/auth";

export const POST: APIRoute = async ({ request }) => {
  const session = await getSessionFromRequest(request);
  const discordId = session?.discordId;
  if (!discordId) return new Response(null, { status: 302, headers: { Location: "/api/auth/signin" } });

  const user = await prisma.user.upsert({ where: { discordId: String(discordId) }, update: {}, create: { discordId: String(discordId) }});
  const network = await prisma.network.findFirst({ where: { ownerId: user.id } });
  if (!network) return new Response(null, { status: 302, headers: { Location: "/dashboard" } });

  const form = await request.formData();
  const userDiscordId = String(form.get("userDiscordId") || "").trim();
  const networkRoleId = String(form.get("networkRoleId") || "");
  if (!userDiscordId || !networkRoleId) return new Response("Bad request", { status: 400 });

  const role = await prisma.networkRole.findFirst({ where: { id: networkRoleId, networkId: network.id } });
  if (!role) return new Response("Role not found", { status: 404 });

  await prisma.roleGrant.create({ data: { networkRoleId, userDiscordId, grantedByDiscordId: String(discordId) } });
  return new Response(null, { status: 302, headers: { Location: "/dashboard/members" } });
};
