import { Auth } from "@auth/core";
import Discord from "@auth/core/providers/discord";

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET!;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL!;

export async function authHandler(req: Request) {
  const res = await Auth(req, {
    basePath: "/api/auth",
    secret: AUTH_SECRET,
    trustHost: true,
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
        const baseUrl = PUBLIC_APP_URL.replace(/\/$/, "");
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        if (url.startsWith(PUBLIC_APP_URL)) return url;
        return baseUrl;
      },
    },
  });

  // Auth.js returns HTTP 500 for error pages which causes issues.
  // If the response is the error page, change status to 200 so the page renders properly.
  if (res.status === 500) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      // This is an Auth.js error page, return with 200 status instead
      return new Response(res.body, {
        status: 200,
        headers: res.headers,
      });
    }
  }

  return res;
}

export async function getSessionFromRequest(request: Request) {
  try {
    const u = new URL(request.url);
    const sessionUrl = new URL("/api/auth/session", u.origin);
    const sessionReq = new Request(sessionUrl.toString(), { headers: request.headers });
    const res = await authHandler(sessionReq);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
