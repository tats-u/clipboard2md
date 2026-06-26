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

    it('unwraps heading self-links when the href fragment matches the heading id', async () => {
      const html =
        '<h3 id="whats-new"><a class="heading-link" href="https://github.blog/changelog/2026-06-19-ai-credits-consumed-per-user-now-in-the-copilot-usage-metrics-api/#whats-new">What’s new<span class="heading-hash pl-2 text-italic text-bold" aria-hidden="true"></span></a></h3>';
      const md = await htmlToMarkdown(html);

      expect(md.trim()).toBe('### What’s new');
      expect(md).not.toContain('[What’s new]');
    });

    // Google AI search
    it('converts role heading with aria-level into markdown headings', async () => {
      const html = [
        '<div role="heading" aria-level="3">micromark の特徴<span></span></div>',
        '<div><a href="https://github.com/micromark/micromark">micromark</a> は、最も普及している Markdown プロセッサツールチェーン群である「unified / remark」ファミリーの最下層を支えるエンジンとして開発されました。</div>',
      ].join('');

      const md = await htmlToMarkdown(html);

      expect(md.trim()).toBe(
        '### micromark の特徴\n\n[micromark](https://github.com/micromark/micromark) は、最も普及している Markdown プロセッサツールチェーン群である「unified / remark」ファミリーの最下層を支えるエンジンとして開発されました。',
      );
    });

    // (Google AI search)
    it('does not convert role heading when aria-level is invalid', async () => {
      const html = '<div role="heading" aria-level="7">Title</div>';
      const md = await htmlToMarkdown(html);
      expect(md.trim()).toBe('Title');
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

  // Microsoft 365 Copilot Chat
  describe('style tag removal', () => {
    it('strips style tags and their CSS from output', async () => {
      const html = `<style>
em {
  font-style: normal;
  text-emphasis: filled dot;
}
</style><p>ここは<em>絶対に</em>圏点にしてください</p>`;

      const md = await htmlToMarkdown(html);

      expect(md).toContain('ここは');
      expect(md).toContain('絶対に');
      expect(md).toContain('圏点にしてください');
      expect(md).not.toContain('font-style');
      expect(md).not.toContain('text-emphasis');
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

    it('outputs only link labels when configured', async () => {
      const html = '<p>Visit <a href="https://example.com">Example</a> now</p>';
      const md = await htmlToMarkdown(html, { stripLinks: true });
      expect(md.trim()).toBe('Visit Example now');
    });

    it('preserves formatted link labels when stripping links', async () => {
      const html = '<a href="https://example.com">click <strong>here</strong></a>';
      const md = await htmlToMarkdown(html, { stripLinks: true });
      expect(md.trim()).toBe('click **here**');
    });

    it('keeps markdown link syntax when the link title must be preserved', async () => {
      const html = '<a href="https://example.com" title="Example">https://example.com</a>';
      const md = await htmlToMarkdown(html, { titleStyle: 'preserve-links' });
      expect(md.trim()).toBe('[https://example.com](https://example.com "Example")');
    });

    it('removes matching link titles by default and emits a bare autolink when possible', async () => {
      const html = '<a href="http://example.com/" title="http://example.com/">http://example.com/</a>';
      const md = await htmlToMarkdown(html);
      expect(md.trim()).toBe('http://example.com/');
    });

    it('unwraps stripped span wrappers inside links while preserving the original href', async () => {
      const html = `
        <span class="outer"></span>
        <a
          dir="ltr"
          href="https://t.co/f5nEuuFyJc"
          rel="noopener noreferrer nofollow"
          role="link"
          class="link-wrapper"
          style="color: rgb(29, 155, 240);"
        ><span
            aria-hidden="true"
            class="protocol"
          >https://</span>code.videolan.org/videolan/dav1d</a
        >
      `;

      const md = await htmlToMarkdown(html);

      expect(md.trim()).toBe(
        '[https://code.videolan.org/videolan/dav1d](https://t.co/f5nEuuFyJc)',
      );
      expect(md).not.toContain('class=""');
      expect(md).not.toContain('<span>');
    });

    it('removes all link titles when configured', async () => {
      const html = '<a href="https://example.com" title="Example">click here</a>';
      const md = await htmlToMarkdown(html, { titleStyle: 'remove-all' });
      expect(md.trim()).toBe('[click here](https://example.com)');
    });

    // Google AI search
    it('strips aria-label from links so inline markdown links stay inline', async () => {
      const html = `
        <p>
          ITやプログラミングの文脈では、<span data-processed="true"><a
            href="https://github.com/micromark/micromark"
            aria-label="GitHubのmicromark. リンクのプレビュー。サイト: GitHub。"
          >GitHubのmicromark</a></span>を指します
        </p>
      `;

      const md = await htmlToMarkdown(html, { allowRawHtml: true });

      expect(md.trim()).toBe(
        'ITやプログラミングの文脈では、[GitHubのmicromark](https://github.com/micromark/micromark)を指します',
      );
      expect(md).not.toContain('aria-label');
      expect(md).not.toContain('\n\n<a ');
    });

    it('keeps matching link titles when configured not to strip them', async () => {
      const html = '<a href="http://example.com/" title="http://example.com/">http://example.com/</a>';
      const md = await htmlToMarkdown(html, { titleStyle: 'preserve-links' });
      expect(md.trim()).toBe('[http://example.com/](http://example.com/ "http://example.com/")');
    });

    it('removes non-link titles by default', async () => {
      const html = '<p><q title="Greeting">Hello</q></p>';
      const md = await htmlToMarkdown(html, { allowRawHtml: true });
      expect(md.trim()).toBe('<q>Hello</q>');
    });

    it('keeps non-link titles when configured to preserve all titles', async () => {
      const html = '<p><q title="Greeting">Hello</q></p>';
      const md = await htmlToMarkdown(html, { allowRawHtml: true, titleStyle: 'preserve-all' });
      expect(md.trim()).toBe('<q title="Greeting">Hello</q>');
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

    it('drops empty links instead of emitting empty markdown link syntax', async () => {
      const html =
        '<h2 id="ai-slop"><a class="header-anchor-link" href="https://example.com/ai-slop" aria-hidden="true"></a>AI slopとは何か</h2>';
      const md = await htmlToMarkdown(html);
      expect(md.trim()).toBe('## AI slopとは何か');
      expect(md).not.toContain('[](');
    });

    it('unwraps empty phrasing containers that have no meaningful content', async () => {
      const html = '<p>Hello<strong></strong><em> </em><del></del>world</p>';
      const md = await htmlToMarkdown(html);
      expect(md.trim()).toBe('Hello world');
      expect(md).not.toContain('****');
      expect(md).not.toContain('__ __');
      expect(md).not.toContain('~~~~');
    });
  });

  describe('image output', () => {
    it('preserves raw HTML for sized images by default', async () => {
      const html = '<p><img src="https://example.com/cat.png" alt="Cat" width="320" height="180"></p>';
      const md = await htmlToMarkdown(html);

      expect(md).toContain('<img src="https://example.com/cat.png" alt="Cat" width="320" height="180">');
      expect(md).not.toContain('![Cat]');
    });

    it('always uses Markdown image syntax when configured', async () => {
      const html = '<p><img src="https://example.com/cat.png" alt="Cat" title="Sleepy" width="320" height="180"></p>';
      const md = await htmlToMarkdown(html, { imageStyle: 'markdown' });

      expect(md.trim()).toBe('![Cat](https://example.com/cat.png)');
      expect(md).not.toContain('"Sleepy"');
      expect(md).not.toContain('<img');
      expect(md).not.toContain('width=');
      expect(md).not.toContain('height=');
    });

    it('strips image titles when configured to keep link titles only', async () => {
      const html = '<p><img src="https://example.com/cat.png" alt="Cat" title="Sleepy" width="320" height="180"></p>';
      const md = await htmlToMarkdown(html, {
        imageStyle: 'markdown',
        titleStyle: 'preserve-links',
      });

      expect(md.trim()).toBe('![Cat](https://example.com/cat.png)');
      expect(md).not.toContain('"Sleepy"');
    });

    it('keeps image titles only when configured to preserve all titles', async () => {
      const html = '<p><img src="https://example.com/cat.png" alt="Cat" title="Sleepy" width="320" height="180"></p>';
      const md = await htmlToMarkdown(html, {
        imageStyle: 'markdown',
        titleStyle: 'preserve-all',
      });

      expect(md.trim()).toBe('![Cat](https://example.com/cat.png "Sleepy")');
    });

    it('replaces images with placeholder text that includes alt text when configured', async () => {
      const html = '<p>Before <img src="https://example.com/cat.png" alt="Cat"> after</p>';
      const md = await htmlToMarkdown(html, { imageStyle: 'placeholder' });

      expect(md.trim()).toBe('Before (Image: Cat) after');
    });

    it('uses a generic placeholder when alt text is missing or empty', async () => {
      const html = '<p><img src="https://example.com/cat.png" alt=""> <img src="https://example.com/dog.png"></p>';
      const md = await htmlToMarkdown(html, { imageStyle: 'placeholder' });

      expect(md.trim()).toBe('(Image) (Image)');
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

  describe('strict CommonMark', () => {
    it('escapes surrounding CJK characters around strong emphasis by default', async () => {
      const html = '<p>この<strong>「語句」</strong>は</p>';
      const md = await htmlToMarkdown(html);

      expect(md).toContain('&#x306E;**「語句」**&#x306F;');
      expect(md).not.toContain('この**「語句」**は');
    });

    it('keeps surrounding CJK characters unescaped around strong emphasis when disabled', async () => {
      const html = '<p>この<strong>「語句」</strong>は</p>';
      const md = await htmlToMarkdown(html, { strictCommonMark: false });

      expect(md.trim()).toBe('この**「語句」**は');
      expect(md).not.toContain('&#x306E;');
      expect(md).not.toContain('&#x306F;');
    });

    it('keeps surrounding CJK characters unescaped around strikethrough when disabled', async () => {
      const html = '<p>この<del>「語句」</del>は</p>';
      const md = await htmlToMarkdown(html, { strictCommonMark: false });

      expect(md.trim()).toBe('この~~「語句」~~は');
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

    it('drops meaningless copied colspan attributes so simple tables stay in GFM', async () => {
      const html = `
        <table>
          <tr>
            <th colspan="undefined">漢字</th>
            <th colspan="undefined">注音（ボポモフォ）</th>
            <th colspan="undefined">倉頡（Cangjie）</th>
          </tr>
          <tr>
            <td colspan="undefined"><strong>中</strong></td>
            <td colspan="undefined"><code>5</code> <code>j</code> <code>/</code> <code>(Space)</code></td>
            <td colspan="undefined"><code>L</code> <code>(Space)</code></td>
          </tr>
        </table>`;

      const md = await htmlToMarkdown(html);

      expect(md).toMatch(/\|\s*漢字\s*\|\s*注音（ボポモフォ）\s*\|\s*倉頡（Cangjie）\s*\|/);
      expect(md).toMatch(/\|\s*\*\*中\*\*\s*\|\s*`5` `j` `\/` `\(Space\)`\s*\|\s*`L` `\(Space\)`\s*\|/);
      expect(md).not.toContain('<th');
      expect(md).not.toContain('<td');
      expect(md).not.toContain('<strong>');
      expect(md).not.toContain('<code>');
      expect(md).not.toContain('colspan');
      expect(md).not.toContain('undefined');
    });

    it('falls back to raw HTML when table spans are meaningful', async () => {
      const html = `
        <table>
          <tr>
            <th colspan="2">見出し</th>
          </tr>
          <tr>
            <td>A</td>
            <td>B</td>
          </tr>
        </table>`;

      const md = await htmlToMarkdown(html, { allowRawHtml: true });

      expect(md).toContain('<table>');
      expect(md).toContain('<th colspan="2">見出し</th>');
      expect(md).not.toContain('| 見出し |');
    });
  });

  describe('code block language detection', () => {
    it('prefers language metadata on pre over ancestor divs', async () => {
      const html = `
        <div data-lang="bash">
          <pre data-lang="shellscript"><code>npx create-react-router@latest my-react-router-app</code></pre>
        </div>`;

      const md = await htmlToMarkdown(html);

      expect(md.trim()).toBe(
        '```shellscript\nnpx create-react-router@latest my-react-router-app\n```',
      );
    });

    it('detects data-lang from up to two ancestor divs', async () => {
      const html = `
        <div class="code-frame" data-lang="bash">
          <div class="code-copy"></div>
          <div class="highlight">
            <pre><code>cd $PROJECT_DIR_NAME\npnpm dev\n</code></pre>
          </div>
        </div>`;

      const md = await htmlToMarkdown(html);

      expect(md.trim()).toBe('```bash\ncd $PROJECT_DIR_NAME\npnpm dev\n```');
    });

    it('detects language-* classes on ancestor divs and stops at the nearest match', async () => {
      const html = `
        <div class="language-ts">
          <section>
            <div class="language-sh active">
              <pre><code>pnpm add -D shiki\n</code></pre>
            </div>
          </section>
        </div>`;

      const md = await htmlToMarkdown(html);

      expect(md.trim()).toBe('```sh\npnpm add -D shiki\n```');
    });
  });

  describe('safe HTML preservation', () => {
    it('preserves safe attributes and unwraps stripped span/div wrappers', async () => {
      const html = [
        '<div dir="auto" lang="en">Hello <span lang="ja">こんにちは</span></div>',
        '<div><span lang="zh">你好</span> <span lang="ko">안녕하세요</span></div>',
        '<div class="outer"><span class="inner">plain</span></div>',
        '<div dir="ltr">left to right only</div>',
        '<div dir="rtl">right to left only</div>',
      ].join('');

      const md = await htmlToMarkdown(html, { allowRawHtml: true });

      expect(md).toContain('<div dir="auto" lang="en">Hello <span lang="ja">こんにちは</span></div>');
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

    it('converts block-only children inside preserved HTML wrappers into markdown blocks', async () => {
      const html = [
        '<dl>',
        '  <dt>dt</dt>',
        '  <dd>',
        '    <p>dd p1</p>',
        '    <p>dd p2</p>',
        '    <p>dd p3 <strong>strong</strong> <em>em</em> <a href="https://example.com/">a</a> <img src="data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==" alt="1px"></p>',
        '  </dd>',
        '  <dt>dt2</dt>',
        '  <dd>dd2</dd>',
        '  <dt>dt3</dt>',
        '  <dd><p>dd3 p</p><pre class="language-bash"><code>echo pre code</code></pre></dd>',
        '</dl>',
        '',
        '<details open>',
        '  <summary>summary</summary>',
        '  <p>details p1</p>',
        '  <p>details p2</p>',
        '</details>',
      ].join('\n');

      const md = await htmlToMarkdown(html);

      expect(md).toBe(
        '<dl>\n<dt>dt</dt>\n<dd>\n\ndd p1\n\ndd p2\n\ndd p3 **strong** *em* [a](https://example.com/) ![1px](data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==)\n\n</dd>\n<dt>dt2</dt>\n<dd>dd2</dd>\n<dt>dt3</dt>\n<dd>\n\ndd3 p\n\n```bash\necho pre code\n```\n\n</dd>\n</dl>\n\n<details>\n<summary>summary</summary>\n\ndetails p1\n\ndetails p2\n\n</details>\n',
      );
      expect(md).not.toContain('<details open>');
      expect(md).not.toContain('<p>dd p1</p>');
      expect(md).not.toContain('<pre class="language-bash">');
      expect(md).toContain('```bash\necho pre code\n```');
    });
  });

  describe('tabindex anchor removal', () => {
    it('removes <a tabindex="-1"> from inside headings', async () => {
      const html = '<h2 id="heading">Heading<a tabindex="-1" href="#heading">#</a></h2>';
      const md = await htmlToMarkdown(html);
      expect(md.trim()).toBe('## Heading');
    });

    it('removes <a tabindex="-1"> from all heading levels', async () => {
      const levels = [1, 2, 3, 4, 5, 6] as const;
      for (const level of levels) {
        const html = `<h${level} id="s">Title<a tabindex="-1" href="#s">¶</a></h${level}>`;
        const md = await htmlToMarkdown(html);
        expect(md.trim()).toBe(`${'#'.repeat(level)} Title`);
      }
    });

    it('removes <a tabindex="-1"> that is a nested descendant of a heading', async () => {
      const html = '<h2 id="h">Text <span><a tabindex="-1" href="#h">#</a></span></h2>';
      const md = await htmlToMarkdown(html);
      expect(md.trim()).toBe('## Text');
    });

    it('removes <a tabindex="-1"> with decorative-only content outside headings', async () => {
      const html = '<p>Section <a tabindex="-1" href="#section">¶</a></p>';
      const md = await htmlToMarkdown(html);
      expect(md).not.toContain('¶');
      expect(md).not.toContain('#section');
      expect(md).toContain('Section');
    });

    it('keeps <a tabindex="-1"> with meaningful link text outside headings', async () => {
      const html = '<p>See <a tabindex="-1" href="#details">more details</a></p>';
      const md = await htmlToMarkdown(html);
      expect(md).toContain('[more details](#details)');
    });

    it('strips tabindex attribute from all elements', async () => {
      const html = '<p tabindex="0">Text <span tabindex="-1">word</span></p>';
      const md = await htmlToMarkdown(html, { allowRawHtml: true });
      expect(md).not.toContain('tabindex');
      expect(md).toContain('Text');
      expect(md).toContain('word');
    });
  });

  describe('id/class stripping', () => {
    it('strips id and class everywhere while unwrapping empty structural wrappers', async () => {
      const html = [
        '<section id="base64_functions">',
        '<article class="doc-entry">',
        '<div class="markdown">',
        '<p id="summary">Utilities for <span id="label" lang="ja" class="inline">base64</span> encoding and decoding.</p>',
        '</div>',
        '</article>',
        '</section>',
      ].join('');

      const md = await htmlToMarkdown(html, { allowRawHtml: true });

      expect(md).toContain('Utilities for');
      expect(md).toContain('<span lang="ja">base64</span>');
      expect(md).not.toContain('<span id=');
      expect(md).not.toContain('<span class=');
      expect(md).not.toContain('id=');
      expect(md).not.toContain('class=');
      expect(md).not.toContain('user-content-');
      expect(md).not.toContain('<section');
      expect(md).not.toContain('<article');
      expect(md).not.toContain('<div');
    });

    it('does not add an extra blank line after heading wrapper divs ending in block content', async () => {
      const html = [
        '<p dir="auto">After this, make sure to re-run <code>yarn build</code> to fix the broken <code>./dist/main.js</code>.</p>',
        '<div class="markdown-heading" dir="auto">',
        '<h2 tabindex="-1" class="heading-element" dir="auto">License</h2>',
        '<a id="user-content-license" class="anchor" aria-label="Permalink: License" href="https://github.com/tats-u/prettier-plugin-md-nocjsp/#license">',
        '<svg data-component="Octicon" class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"></svg>',
        '</a>',
        '</div>',
        '<p dir="auto">MIT License (same as Prettier itself)</p>',
      ].join('');

      const md = await htmlToMarkdown(html);

      expect(md).toBe(
        'After this, make sure to re-run `yarn build` to fix the broken `./dist/main.js`.\n\n## License\n\nMIT License (same as Prettier itself)\n',
      );
    });

    it('keeps inline safe HTML inside a paragraph without extra blank lines', async () => {
      const html = '<p>Utilities for <span lang="ja">base64</span> encoding and decoding.</p>';

      const md = await htmlToMarkdown(html, { allowRawHtml: true });

      expect(md.trim()).toBe('Utilities for <span lang="ja">base64</span> encoding and decoding.');
      expect(md).not.toContain('\n\n<span lang="ja">');
      expect(md).not.toContain('</span>\n\n');
    });
  });
});
