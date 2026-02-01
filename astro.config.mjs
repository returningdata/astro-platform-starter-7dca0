import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";

export default defineConfig({
  output: "server",
  adapter: netlify(),

  // ✅ Force-disable Astro assets feature (Netlify adapter currently fails when it's enabled)
  experimental: {
    assets: false,
  },
});
