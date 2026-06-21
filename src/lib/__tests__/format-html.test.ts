import { describe, expect, it } from 'vitest';
import { formatHtml } from '../format-html';

describe('formatHtml', () => {
  it('formats html with prettier', async () => {
    await expect(formatHtml('<div><p>Hello</p><p>World</p></div>')).resolves.toBe(
      '<div>\n  <p>Hello</p>\n  <p>World</p>\n</div>\n',
    );
  });
});
