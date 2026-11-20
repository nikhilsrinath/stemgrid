// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://stemgrid.in",
  // The main site is the entry point in dev: `npm run dev` opens it in the browser.
  // The simulator is a separate app on :3001 (simulator.stemgrid.in in production).
  server: { port: 4321, open: true },
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
