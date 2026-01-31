import type { APIRoute } from "astro";
import { prisma } from "../../../../lib/db";
import { getSessionFromRequest } from "../../../../lib/auth";

export const POST: APIRoute = async ({ request }) => {
  const session = await getSessionFromRequest(request);
  const discordId = session?.discordId;
  if (!discordId) return new Response(null, { status: 302, headers: { Location: "/api/auth/signin" } });

  const form = await request.formData();
  const grantId = String(form.get("grantId") || "");
  if (!grantId) return new Response("Bad request", { status: 400 });

  await prisma.roleGrant.update({ where: { id: grantId }, data: { revokedAt: new Date() } });
  return new Response(null, { status: 302, headers: { Location: "/dashboard/members" } });
};
