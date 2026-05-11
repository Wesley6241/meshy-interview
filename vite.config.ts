import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function fromRoot(pathname: string) {
  return fileURLToPath(new URL(pathname, import.meta.url));
}

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: fromRoot("index.html"),
        popup: fromRoot("popup.html"),
        content: fromRoot("src/content/main.tsx"),
        background: fromRoot("src/background/main.ts"),
      },
      output: {
        entryFileNames(chunkInfo) {
          if (chunkInfo.name === "content") {
            return "assets/content.js";
          }

          if (chunkInfo.name === "background") {
            return "assets/background.js";
          }

          return "assets/[name]-[hash].js";
        },
      },
    },
  },
});
