import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify";

export default defineConfig({
  output: "server",
  adapter: netlify(),

  // Netlify adapter currently doesn't support Astro "assets"
  assets: false,
});
