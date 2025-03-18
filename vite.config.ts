import { defineConfig } from "vite";
import vercel from "vite-plugin-vercel";

export default defineConfig({
  plugins: [vercel()],
  server: {
    port: 3000,
  },
  build: {
    sourcemap: true,
  },
  // Ensure TypeScript files are processed correctly
  resolve: {
    extensions: [".ts", ".js", ".json"],
  },
});
