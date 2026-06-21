let prettierPromise: Promise<{
  prettier: typeof import('prettier/standalone');
  htmlPlugin: typeof import('prettier/plugins/html');
}> | null = null;

async function getPrettier() {
  if (!prettierPromise) {
    prettierPromise = Promise.all([
      import('prettier/standalone'),
      import('prettier/plugins/html'),
    ]).then(([prettier, htmlPlugin]) => ({ prettier, htmlPlugin }));
  }

  return prettierPromise;
}

export async function formatHtml(html: string) {
  const { prettier, htmlPlugin } = await getPrettier();

  return prettier.format(html, {
    parser: 'html',
    plugins: [htmlPlugin],
    printWidth: 80,
    tabWidth: 2,
  });
}
