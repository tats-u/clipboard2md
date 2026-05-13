import { describe, it, expect } from 'vitest';
import { htmlToMarkdown } from '../html-to-markdown';

describe('tabstop/tabindex debug', () => {
  it('shows current behavior with tabstop anchor in heading', async () => {
    const html = '<h2 id="heading">Heading<a tabstop="-1" href="#heading">#</a></h2>';
    const md = await htmlToMarkdown(html);
    console.log('tabstop OUTPUT:', JSON.stringify(md));
    expect(md).toBeDefined();
  });
  
  it('shows current behavior with tabindex anchor in heading', async () => {
    const html = '<h2 id="heading">Heading<a tabindex="-1" href="#heading">#</a></h2>';
    const md = await htmlToMarkdown(html);
    console.log('tabindex OUTPUT:', JSON.stringify(md));
    expect(md).toBeDefined();
  });
  
  it('shows tabstop anchor in paragraph', async () => {
    const html = '<p>Text <a tabstop="-1" href="#section">¶</a></p>';
    const md = await htmlToMarkdown(html);
    console.log('para tabstop OUTPUT:', JSON.stringify(md));
    expect(md).toBeDefined();
  });
});
