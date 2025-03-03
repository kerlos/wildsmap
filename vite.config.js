import { defineConfig } from "vite";
import { readFileSync } from "fs";

const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  base: "/wildsmap/",
  build: {
    // Optimize chunk size
    chunkSizeWarningLimit: 2000,
    // Reduce file name length
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});
