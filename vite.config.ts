import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

// Paths served by the React app (app.html). Must match the rewrites in vercel.json.
export const APP_ROUTES = /^\/(blog|contato|whatsapp|programas|oportunidades|privacidade|checkout|editor)(\/|$|\?)/;

/** Dev-server equivalent of the Vercel rewrites. */
function spaFallback(): Plugin {
  return {
    name: "vm-spa-fallback",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url && APP_ROUTES.test(req.url) && !req.url.includes(".")) req.url = "/app.html";
        next();
      });
    },
    configurePreviewServer(server) {
      // Apply the production security headers from vercel.json so `vite preview` tests them.
      const globalHeaders: { key: string; value: string }[] =
        JSON.parse(readFileSync(resolve(__dirname, "vercel.json"), "utf8")).headers.find((h: { source: string }) => h.source === "/(.*)")?.headers ?? [];
      server.middlewares.use((_req, res, next) => {
        for (const h of globalHeaders) {
          // Local preview runs on plain http://localhost — skip HTTPS-only directives there.
          if (h.key === "Strict-Transport-Security") continue;
          res.setHeader(h.key, h.key === "Content-Security-Policy" ? h.value.replace("; upgrade-insecure-requests", "").replace(/https:\/\/\*\.supabase\.co/g, "$& http://127.0.0.1:54321").replace(/wss:\/\/\*\.supabase\.co/, "$& ws://127.0.0.1:54321") : h.value);
        }
        next();
      });
      server.middlewares.use((req, _res, next) => {
        if (req.url && APP_ROUTES.test(req.url) && !req.url.includes(".")) req.url = "/app.html";
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), spaFallback()],
  build: {
    sourcemap: false, // don't ship readable source to production
    rollupOptions: {
      input: { main: resolve(__dirname, "index.html"), app: resolve(__dirname, "app.html") },
    },
  },
  server: { port: 5173, strictPort: true },
});
