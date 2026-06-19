import { defineConfig, searchForWorkspaceRoot } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    // Allow importing the shared Tiled maps from the repo-root assets folder.
    fs: { allow: [searchForWorkspaceRoot(process.cwd())] },
  },
});
