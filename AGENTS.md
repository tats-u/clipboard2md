This repository is a React + Astro web app for converting pasted HTML from the clipboard into Markdown, then previewing and copying it.

Main directories:

- `src/`: Source code used for the build. In most tasks, this is the area you'll be editing.
  - `components/`: Interactive React ones
  - `pages/`: Non-interactive Astro layouts and static pages
  - `styles/`: CSS files

Use pnpm for package management. This project requires a Node version that supports `node --run`; therefore, use:

- ✅ `node --run <task> ...`
- ✅ `pnpm <task> ...`
- ✅ `pnpm <command> ...`
- ✅ `pnpx <package> ...`
- ❌ `npm ...`
- ❌ `npx ...`

If pnpm is not installed, use `ask_user` or `askUserQuestion` to tell the user this repository requires pnpm and ask them to install it. If those tools are unavailable, report the issue and stop work.
