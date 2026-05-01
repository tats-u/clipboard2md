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

    it('preserves underscores in bare URL autolinks', async () => {
      const html =
        '<a href="https://example.com/autolink_with_underscore">https://example.com/autolink_with_underscore</a>';
      const md = await htmlToMarkdown(html);
      expect(md.trim()).toBe('https://example.com/autolink_with_underscore');
    });

    it('preserves emphasis-like underscores inside bare URL autolinks', async () => {
      const html =
        '<a href="https://example.com/a(_b_)c">https://example.com/a(_b_)c</a>';
      const md = await htmlToMarkdown(html);
      expect(md.trim()).toBe('https://example.com/a(_b_)c');
    });

    it('keeps markdown link syntax for non-autolink URLs', async () => {
      const html = '<a href="https://example.com">click here</a>';
      const md = await htmlToMarkdown(html);
      expect(md).toContain('[click here](https://example.com)');
    });

    it('keeps markdown link syntax when the link title must be preserved', async () => {
      const html = '<a href="https://example.com" title="Example">https://example.com</a>';
      const md = await htmlToMarkdown(html, { linkTitleStyle: 'preserve' });
      expect(md.trim()).toBe('[https://example.com](https://example.com "Example")');
    });

    it('removes matching link titles by default and emits a bare autolink when possible', async () => {
      const html = '<a href="http://example.com/" title="http://example.com/">http://example.com/</a>';
      const md = await htmlToMarkdown(html);
      expect(md.trim()).toBe('http://example.com/');
    });

    it('removes all link titles when configured', async () => {
      const html = '<a href="https://example.com" title="Example">click here</a>';
      const md = await htmlToMarkdown(html, { linkTitleStyle: 'remove-all' });
      expect(md.trim()).toBe('[click here](https://example.com)');
    });

    it('keeps matching link titles when configured not to strip them', async () => {
      const html = '<a href="http://example.com/" title="http://example.com/">http://example.com/</a>';
      const md = await htmlToMarkdown(html, { linkTitleStyle: 'preserve' });
      expect(md.trim()).toBe('[http://example.com/](http://example.com/ "http://example.com/")');
    });

    it('outputs plain text for anchor without href', async () => {
      const html =
        '<a href="https://spec.commonmark.org/0.31.2/#example-43">Example 43</a>' +
        '<a class="dingus" title="open in interactive dingus">Try It</a>';
      const md = await htmlToMarkdown(html);
      expect(md).toContain('[Example 43](https://spec.commonmark.org/0.31.2/#example-43)');
      expect(md).not.toContain('<>');
      expect(md).toContain('Try It');
    });
  });

  describe('thematic break (hr) style', () => {
    const html = '<p>before</p><hr><p>after</p>';

    it('uses *** as default thematic break', async () => {
      const md = await htmlToMarkdown(html);
      expect(md).toContain('***');
      expect(md).toContain('before');
      expect(md).toContain('after');
    });

    it('respects hrStyle setting *', async () => {
      const md = await htmlToMarkdown(html, { hrStyle: '*' });
      expect(md).toContain('***');
    });

    it('respects hrStyle setting -', async () => {
      const md = await htmlToMarkdown(html, { hrStyle: '-' });
      expect(md).toContain('---');
      expect(md).not.toContain('***');
    });

    it('respects hrStyle setting _', async () => {
      const md = await htmlToMarkdown(html, { hrStyle: '_' });
      expect(md).toContain('___');
      expect(md).not.toContain('***');
    });
  });

  describe('br style', () => {
    const html = '<p>line1<br>line2</p>';

    it('uses backslash line break by default', async () => {
      const md = await htmlToMarkdown(html);
      expect(md).toContain('line1\\\nline2');
    });

    it('respects brStyle setting backslash', async () => {
      const md = await htmlToMarkdown(html, { brStyle: 'backslash' });
      expect(md).toContain('line1\\\nline2');
    });

    it('respects brStyle setting spaces', async () => {
      const md = await htmlToMarkdown(html, { brStyle: 'spaces' });
      expect(md).toMatch(/line1  \nline2/);
    });

    it('respects brStyle setting newline', async () => {
      const md = await htmlToMarkdown(html, { brStyle: 'newline' });
      expect(md).toContain('line1\nline2');
      // Should NOT have backslash or trailing spaces before the newline
      expect(md).not.toMatch(/line1\\\n/);
      expect(md).not.toMatch(/line1  \n/);
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

  describe('safe HTML preservation', () => {
    it('preserves safe attributes and unwraps stripped span/div wrappers', async () => {
      const html = [
        '<div dir="auto">Hello <span lang="ja">こんにちは</span></div>',
        '<div><span lang="zh">你好</span> <span lang="ko">안녕하세요</span></div>',
        '<div class="outer"><span class="inner">plain</span></div>',
        '<div dir="ltr">left to right only</div>',
        '<div dir="rtl">right to left only</div>',
      ].join('');

      const md = await htmlToMarkdown(html, { allowRawHtml: true });

      expect(md).toContain('<div dir="auto">Hello <span lang="ja">こんにちは</span></div>');
      expect(md).toContain('<span lang="zh">你好</span>');
      expect(md).toContain('<span lang="ko">안녕하세요</span>');
      expect(md).toContain('plain');
      expect(md).toContain('left to right only');
      expect(md).toContain('right to left only');
      expect(md).not.toContain('<div>你好');
      expect(md).not.toContain('<div>plain</div>');
      expect(md).not.toContain('<span>plain</span>');
      expect(md).not.toContain('<div dir="ltr">left to right only</div>');
      expect(md).not.toContain('<div dir="rtl">right to left only</div>');
    });

    it('drops dir without lang but keeps meaningful direction metadata', async () => {
      const html = [
        '<p dir="ltr">Plain paragraph</p>',
        '<p dir="rtl">Arabic paragraph</p>',
        '<p dir="ltr" lang="en">English paragraph</p>',
        '<p dir="rtl" lang="ar">مرحبا</p>',
      ].join('');

      const md = await htmlToMarkdown(html, { allowRawHtml: true });

      expect(md).toContain('Plain paragraph');
      expect(md).toContain('Arabic paragraph');
      expect(md).not.toContain('<p dir="ltr">Plain paragraph</p>');
      expect(md).not.toContain('<p dir="rtl">Arabic paragraph</p>');
      expect(md).toContain('<p dir="ltr" lang="en">English paragraph</p>');
      expect(md).toContain('<p dir="rtl" lang="ar">مرحبا</p>');
    });

    it('preserves ruby tags when safe HTML is allowed', async () => {
      const html =
        '<p><ruby>不運<rt>ハードラック</rt></ruby>と<ruby>踊<rt>ダンス</rt></ruby>っちまったんだよ……</p>';

      const md = await htmlToMarkdown(html, { allowRawHtml: true });

      expect(md).toContain('<ruby>不運<rt>ハードラック</rt></ruby>');
      expect(md).toContain('<ruby>踊<rt>ダンス</rt></ruby>');
    });

    it('preserves additional allowed safe HTML tags', async () => {
      const html = [
        '<dl><dt>用語</dt><dd><dfn>定義</dfn></dd></dl>',
        '<p><i>italic</i> <b>bold</b> <s>strike</s></p>',
        '<p><q cite="https://example.com/quote">quote</q> <cite>source</cite></p>',
        '<p><u>underline</u> <ins>inserted</ins></p>',
      ].join('');

      const md = await htmlToMarkdown(html, { allowRawHtml: true });

      expect(md).toContain('<dl><dt>用語</dt><dd><dfn>定義</dfn></dd></dl>');
      expect(md).toContain('<i>italic</i> <b>bold</b> <s>strike</s>');
      expect(md).toContain('<q cite="https://example.com/quote">quote</q> <cite>source</cite>');
      expect(md).toContain('<u>underline</u> <ins>inserted</ins>');
    });
  });
});
