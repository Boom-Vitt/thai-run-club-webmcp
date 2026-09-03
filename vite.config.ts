import { cloudflare } from "@cloudflare/vite-plugin";
import { sites } from "@openai/sites-vite-plugin";
import { defineConfig } from "vite";

const webMcpHeaders = {
  "Origin-Agent-Cluster": "?1",
  "Permissions-Policy": "tools=(self)",
};

export default defineConfig(({ mode }) => ({
  plugins: mode === "test" ? [] : [sites(), cloudflare({ viteEnvironment: { name: "server" } })],
  server: {
    host: "127.0.0.1",
    port: 5187,
    strictPort: true,
    headers: webMcpHeaders,
  },
  preview: {
    host: "127.0.0.1",
    port: 5187,
    strictPort: true,
    headers: webMcpHeaders,
  },
  build: {
    target: "es2023",
    sourcemap: true,
  },
}));
