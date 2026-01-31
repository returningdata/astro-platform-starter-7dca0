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
  const name = String(form.get("name") || "").trim();
  const description = String(form.get("description") || "").trim() || null;
  if (!name) return new Response("Missing name", { status: 400 });

  await prisma.networkRole.create({ data: { networkId: network.id, name, description } });
  return new Response(null, { status: 302, headers: { Location: "/dashboard/roles?msg=Role%20created" } });
};
