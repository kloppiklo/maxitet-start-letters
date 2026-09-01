import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "/maxitet-start-letters/",
  root: "pages",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../dist-pages",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./pages/index.html", import.meta.url)),
        schedule: fileURLToPath(new URL("./pages/schedule/index.html", import.meta.url)),
      },
    },
  },
});
