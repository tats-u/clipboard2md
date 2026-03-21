import { describe, it, expect } from 'vitest';
import { htmlToMarkdown } from '../html-to-markdown';

describe('htmlToMarkdown', () => {
  describe('basic conversion', () => {
    it('converts simple HTML to markdown', async () => {
      const html = '<h1>Hello</h1><p>World</p>';
      const md = await htmlToMarkdown(html);
      expect(md).toContain('# Hello');
      expect(md).toContain('World');
    });

    it('uses ATX headings (not setext)', async () => {
      const html = '<h1>One</h1><h2>Two</h2><h3>Three</h3>';
      const md = await htmlToMarkdown(html);
      expect(md).toContain('# One');
      expect(md).toContain('## Two');
      expect(md).toContain('### Three');
      expect(md).not.toMatch(/^=+$/m);
      expect(md).not.toMatch(/^-+$/m);
    });
  });

  describe('list marker', () => {
    it('uses - as default list marker', async () => {
      const html = '<ul><li>a</li><li>b</li></ul>';
      const md = await htmlToMarkdown(html);
      expect(md).toContain('- a');
      expect(md).toContain('- b');
    });

    it('respects listMarker setting *', async () => {
      const html = '<ul><li>a</li><li>b</li></ul>';
      const md = await htmlToMarkdown(html, { listMarker: '*' });
      expect(md).toContain('* a');
    });

    it('respects listMarker setting +', async () => {
      const html = '<ul><li>a</li><li>b</li></ul>';
      const md = await htmlToMarkdown(html, { listMarker: '+' });
      expect(md).toContain('+ a');
    });
  });

  describe('HTML comment removal', () => {
    it('strips HTML comments from output', async () => {
      const html = '<p>before</p><!-- comment --><p>after</p>';
      const md = await htmlToMarkdown(html);
      expect(md).not.toContain('comment');
      expect(md).toContain('before');
      expect(md).toContain('after');
    });

    it('strips StartFragment/EndFragment comments', async () => {
      const html = '<!--StartFragment--><p>content</p><!--EndFragment-->';
      const md = await htmlToMarkdown(html);
      expect(md).not.toContain('StartFragment');
      expect(md).not.toContain('EndFragment');
      expect(md).toContain('content');
    });
  });

  describe('bare autolinks', () => {
    it('outputs bare URL for http autolinks', async () => {
      const html = '<a href="https://example.com">https://example.com</a>';
      const md = await htmlToMarkdown(html);
      expect(md.trim()).toBe('https://example.com');
    });

    it('outputs bare www for www autolinks', async () => {
      const html = '<a href="http://www.example.com">www.example.com</a>';
      const md = await htmlToMarkdown(html);
      expect(md.trim()).toBe('www.example.com');
    });

    it('keeps markdown link syntax for non-autolink URLs', async () => {
      const html = '<a href="https://example.com">click here</a>';
      const md = await htmlToMarkdown(html);
      expect(md).toContain('[click here](https://example.com)');
    });
  });

  describe('table fallback', () => {
    it('converts simple GFM-compatible tables', async () => {
      const html = `
        <table>
          <thead><tr><th>A</th><th>B</th></tr></thead>
          <tbody><tr><td>1</td><td>2</td></tr></tbody>
        </table>`;
      const md = await htmlToMarkdown(html);
      expect(md).toContain('| A');
      expect(md).toMatch(/\| -/); // separator row
    });

    it('falls back to raw HTML for complex tables (CSS spec example)', async () => {
      const html = `<html><body>
<!--StartFragment-->The following informative table summarizes language conventions
\t\tfor classifying fullwidth colon and dot punctuation:

\t\t
    <table class="data">
     <colgroup class="header">
     </colgroup><colgroup span="2">
     </colgroup><thead>
      <tr>
       <td>
       </td><th>colon punctuation 
       </th><th>dot punctuation
\t\t\t
     </th></tr></thead><tbody>
      <tr>
       <th>Simplified Chinese (horizontal) 
       </th><td>closing 
       </td><td>closing
\t\t\t\t
      </td></tr><tr>
       <th>Simplified Chinese (vertical) 
       </th><td>closing 
       </td><td>closing
\t\t\t\t
      </td></tr><tr>
       <th>Traditional Chinese 
       </th><td>middle dot 
       </td><td>middle dot
\t\t\t\t
      </td></tr><tr>
       <th>Korean 
       </th><td>middle dot 
       </td><td>closing
\t\t\t\t
      </td></tr><tr>
       <th>Japanese 
       </th><td>middle dot 
       </td><td>closing
\t\t
    </td></tr></tbody></table>
    <p>Note that for Chinese fonts at least,
\t\tthe author observes that the standard convention is often not followed.</p><!--EndFragment-->
</body>
</html>`;
      // Should NOT throw
      const md = await htmlToMarkdown(html, { listMarker: '-', allowRawHtml: true });
      expect(md).toBeDefined();
      expect(md.length).toBeGreaterThan(0);
      // Should contain the table content (either as GFM table or raw HTML)
      expect(md).toContain('colon punctuation');
      expect(md).toContain('Japanese');
      expect(md).toContain('middle dot');
      // Should contain surrounding text
      expect(md).toContain('informative table');
      expect(md).toContain('standard convention');
    });
  });
});
