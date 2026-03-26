/**
 * Convert markdown text into a blockquote by prepending `> ` to each line.
 * Trailing empty lines are excluded so the output does not end with a bare `>`.
 */
export function quoteMarkdown(markdown: string): string {
  return markdown
    .replace(/\n$/, '')
    .split('\n')
    .map((line) => (line === '' ? '>' : `> ${line}`))
    .join('\n');
}
