# clipboard2md

A web app that converts HTML from your clipboard into Markdown. Paste any HTML content and instantly get clean Markdown — ready to review and copy.

## Features

- **Paste to convert** — Just hit Ctrl+V with HTML in your clipboard
- **Markdown tab** (default) — View the converted Markdown source and a rendered preview
- **HTML tab** — Inspect the original HTML source and see it rendered
- **One-click copy** — Copy the Markdown to your clipboard with a single button
- **GFM support** — Tables, strikethrough, and other GitHub Flavored Markdown extensions

## Tech Stack

- [Astro](https://astro.build/) — Static site framework
- [React](https://react.dev/) — UI components
- [Tailwind CSS](https://tailwindcss.com/) v4 — Styling
- [unified](https://unifiedjs.com/) ecosystem — HTML → Markdown conversion
  - rehype-parse → rehype-remark → remark-stringify

> [!NOTE]
> `turndown` is more popular for HTML to Markdown conversion, but I chose the unified ecosystem for better control, extensibility, and more beautiful Markdown output.

## Development

```bash
pnpm install
node --run dev
```

## Build

```bash
node --run build
node --run preview
```

## AI usage note

Scaffolded with GitHub Copilot CLI powered by Claude Opus 4.6.
