/**
 * Convert markdown text into a blockquote by prepending `> ` to each line.
 * A trailing newline in the input is preserved (so a new unquoted line begins
 * after pasting), but no bare `>` is emitted for it.
 */
export function quoteMarkdown(markdown: string): string {
  const hasTrailingNewline = markdown.endsWith('\n');
  const trimmed = hasTrailingNewline ? markdown.slice(0, -1) : markdown;
  const quoted = trimmed
    .split('\n')
    .map((line) => (line === '' ? '>' : `> ${line}`))
    .join('\n');
  return hasTrailingNewline ? quoted + '\n' : quoted;
}
