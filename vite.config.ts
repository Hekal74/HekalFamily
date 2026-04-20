import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isGithubActions = process.env.GITHUB_ACTIONS === "true";

// https://vite.dev/config/
export default defineConfig({
	base: isGithubActions && repositoryName ? `/${repositoryName}/` : "/",
	plugins: [react(), tailwindcss()],
});
