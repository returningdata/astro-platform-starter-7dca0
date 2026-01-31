import type { APIRoute } from "astro";
import { authHandler } from "../../../lib/auth";

export const ALL: APIRoute = async ({ request }) => {
  return authHandler(request);
};
