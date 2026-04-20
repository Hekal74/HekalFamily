# Hekal Family Tree

Interactive family tree built with `React + Vite + TypeScript`.

## Run locally

```bash
pnpm install
pnpm dev
```

## Deploy to GitHub Pages

This project is already configured for GitHub Pages through GitHub Actions.

### 1. Create a GitHub repository

Create an empty repo on GitHub, for example: `hekal-family-tree`

### 2. Connect the local project to GitHub

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git add .
git commit -m "Initial family tree site"
git push -u origin main
```

### 3. Enable GitHub Pages

On GitHub:

1. Open `Settings`
2. Open `Pages`
3. In `Build and deployment`, choose `GitHub Actions`

After that, every push to `main` will build and deploy the site automatically.

## Useful commands

```bash
pnpm lint
pnpm build
pnpm preview
```
