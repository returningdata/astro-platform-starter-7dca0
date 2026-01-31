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

  const grants = await prisma.roleGrant.findMany({
    where: { revokedAt: null, networkRole: { networkId: network.id } },
    include: { networkRole: { include: { mappings: { include: { guild: true } } } } }
  });

  const data: any[] = [];
  for (const g of grants) {
    for (const m of g.networkRole.mappings) {
      data.push({
        type: "ADD_ROLE",
        status: "PENDING",
        networkId: network.id,
        guildDiscordId: m.guild.guildDiscordId,
        userDiscordId: g.userDiscordId,
        roleDiscordId: m.roleDiscordId
      });
    }
  }

  if (data.length) {
    await prisma.syncAction.createMany({ data, skipDuplicates: false });
  }

  return new Response(null, { status: 302, headers: { Location: "/dashboard/sync" } });
};
