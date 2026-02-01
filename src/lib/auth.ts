import { Auth } from "@auth/core";
import Discord from "@auth/core/providers/discord";

const AUTH_SECRET = process.env.AUTH_SECRET!;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL!;

export function authHandler(req: Request) {
  return Auth(req, {
    secret: AUTH_SECRET,
    trustHost: true,
    basePath: "/api/auth",
    providers: [
      Discord({
        clientId: DISCORD_CLIENT_ID,
        clientSecret: DISCORD_CLIENT_SECRET,
      }),
    ],
    session: { strategy: "jwt" },
    callbacks: {
      async jwt({ token, profile }) {
        if (profile && (profile as any).id) {
          token.discordId = String((profile as any).id);
          token.name = token.name ?? (profile as any).username ?? (profile as any).global_name;
          if ((profile as any).avatar) {
            token.avatarUrl = `https://cdn.discordapp.com/avatars/${(profile as any).id}/${(profile as any).avatar}.png?size=128`;
          }
        }
        return token;
      },
      async session({ session, token }) {
        (session as any).discordId = (token as any).discordId;
        (session as any).avatarUrl = (token as any).avatarUrl;
        return session;
      },
      async redirect({ url }) {
        // Normalize PUBLIC_APP_URL by removing trailing slash to prevent double slashes
        const baseUrl = PUBLIC_APP_URL.replace(/\/$/, "");
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        if (url.startsWith(PUBLIC_APP_URL) || url.startsWith(baseUrl)) return url;
        return baseUrl;
      },
    },
  });
}

export async function getSessionFromRequest(request: Request) {
  const u = new URL(request.url);
  const sessionUrl = new URL("/api/auth/session", u.origin);
  const sessionReq = new Request(sessionUrl.toString(), { headers: request.headers });
  const res = await authHandler(sessionReq);
  if (!res.ok) return null;
  return await res.json();
}
