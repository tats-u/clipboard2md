import { describe, it, expect } from 'vitest';
import { quoteMarkdown } from '../quote-markdown';

describe('quoteMarkdown', () => {
  it('quotes single-line text', () => {
    expect(quoteMarkdown('hello')).toBe('> hello');
  });

  it('quotes multi-line text with blank line separator', () => {
    expect(quoteMarkdown('a\n\nb\n')).toBe('> a\n>\n> b');
  });

  it('does not add trailing > for trailing newline', () => {
    const result = quoteMarkdown('a\n\nb\n');
    expect(result).not.toMatch(/>\s*$/);
  });

  it('handles text without trailing newline', () => {
    expect(quoteMarkdown('a\n\nb')).toBe('> a\n>\n> b');
  });

  it('handles empty string', () => {
    expect(quoteMarkdown('')).toBe('>');
  });
});
