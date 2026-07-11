# clipboard2md

https://tats-u.github.io/clipboard2md/

A web app that converts HTML from your clipboard into Markdown. Paste any HTML content and instantly get clean Markdown — ready to review and copy.

## Features

- **Paste to convert** — Just hit Ctrl+V with HTML in your clipboard
- **Markdown tab** (default) — View the converted Markdown source and a rendered preview. Edit the Markdown source and see the preview update in real-time
- **HTML tab** — Inspect the original or formatted HTML source and see it rendered
- **One-click copy** — Copy the plain or _quoted_ Markdown to your clipboard with a single button
- **Customizable and versatile output** — Adjust the Markdown output style with options for lists, line breaks, and more. Suitable for various use cases like quotations, translations, and AI prompts. The most customizable HTML → Markdown converter on the web.
- **Battle-tested** — Tested with various real-world HTML content to ensure reliable conversion
- **Open source and privacy-friendly** — No tracking, no ads, and no data collection. All code is open source and runs entirely in your browser.
- **Optional bug reporting** — The Report Issue menu lets you either open a prefilled GitHub issue or copy a reusable report template with the HTML input and Markdown output for manual editing.

## Tech Stack

- [Astro](https://astro.build/) — Static site framework
- [React](https://react.dev/) — UI components
- [Tailwind CSS](https://tailwindcss.com/) v4 — Styling
- [unified](https://unifiedjs.com/) ecosystem — HTML → Markdown conversion
  - rehype-parse → many rehype plugins → rehype-remark → several remark plugins → remark-stringify

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

Most feature changes and improvements are implemented through instructions given to LLMs:

- Claude Opus 4.6 (including scaffolding) (Before [being removed from the Pro plan](https://github.blog/changelog/2026-04-20-changes-to-github-copilot-plans-for-individuals/#opus-models-removed-from-pro))
- GPT-5.4 (after Opus 4.6 was removed)
- MAI-Code-1-Flash
- Claude Haiku 4.5 (litest tasks)
