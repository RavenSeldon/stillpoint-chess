import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    // TypeScript emits the individually testable core modules into dist/assets first.
    emptyOutDir: false,
    target: "es2022",
  },
});
