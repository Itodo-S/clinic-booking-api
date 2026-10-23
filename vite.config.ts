import { resolve } from "node:path";
import { getRequestListener } from "@hono/node-server";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
import { defineConfig } from "vitest/config";

const env = loadEnv("development", process.cwd(), "");

/** In development, serves the Hono app from the Vite dev server so one command runs everything. */
const api: Plugin = {
  name: "api",
  configureServer(server) {
    Object.assign(process.env, env);
    server.middlewares.use((req, res, next) => {
      if (!/^\/(web-)?api(\/|$)/.test(req.url ?? "")) return next();
      server
        .ssrLoadModule(resolve("src/app.ts"))
        .then(({ app }) => getRequestListener(app.fetch)(req, res))
        .catch(next);
    });
  },
};

export default defineConfig({
  root: "web",
  plugins: [react(), tailwindcss(), api],
  build: { outDir: "../dist", emptyOutDir: true },
  test: {
    root: ".",
    include: ["test/**/*.test.ts"],
    env: loadEnv("test", process.cwd(), ""),
    // Every test file resets the same database, so files must not run concurrently.
    fileParallelism: false,
  },
});
