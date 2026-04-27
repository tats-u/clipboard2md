import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import { defaultHandlers } from 'hast-util-to-mdast';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import { toHtml } from 'hast-util-to-html';
import type { Settings } from './settings';

const BARE_AUTOLINK_PATTERN = /(?:https?:\/\/|www\.)[^\s<]+/g;

function rehypeRemoveComments() {
  return (tree: any) => {
    const walk = (node: any) => {
      if (node.children) {
        node.children = node.children.filter((child: any) => child.type !== 'comment');
        node.children.forEach(walk);
      }
    };
    walk(tree);
  };
}

function remarkStripEmptyLinks() {
  return (tree: any) => {
    visit(tree, 'link', (node: any, index: number | undefined, parent: any) => {
      if (index === undefined || !parent) return;
      if (!node.url) {
        parent.children.splice(index, 1, ...node.children);
        return index;
      }
    });
  };
}

function remarkBareAutolinks() {
  return (tree: any) => {
    visit(tree, 'link', (node: any, index: number | undefined, parent: any) => {
      if (index === undefined || !parent) return;
      if (node.children.length !== 1 || node.children[0].type !== 'text') return;

      const text = node.children[0].value as string;
      const url = node.url as string;

      let bareText: string | null = null;

      if (text === url) {
        bareText = url;
      } else if (
        /^https?:\/\//.test(url) &&
        text === url.replace(/^https?:\/\//, '') &&
        text.startsWith('www.')
      ) {
        bareText = text;
      }

      if (bareText && /^(https?:\/\/|www\.)/.test(bareText)) {
        parent.children[index] = { type: 'text', value: bareText };
        return index;
      }
    });
  };
}

/**
 * Custom table handler: tries default GFM table conversion,
 * falls back to raw HTML for tables that can't be represented in GFM.
 */
function createTableHandler() {
  return (state: any, node: any) => {
    try {
      return defaultHandlers.table(state, node);
    } catch {
      // Non-GFM-compatible table — output as raw HTML block
      const html = toHtml(node, { allowDangerousHtml: true });
      return { type: 'html', value: html };
    }
  };
}

function createBreakHandler(brStyle: Settings['brStyle']) {
  return () => {
    switch (brStyle) {
      case 'spaces':
        return '  \n';
      case 'newline':
        return '\n';
      case 'backslash':
      default:
        return '\\\n';
    }
  };
}

function restoreBareAutolinkEscapes(markdown: string): string {
  return markdown
    .replace(/https\\:/g, 'https:')
    .replace(/http\\:/g, 'http:')
    .replace(/www\\./g, 'www.')
    .replace(BARE_AUTOLINK_PATTERN, (url) => url.replace(/\\_/g, '_'));
}

export async function htmlToMarkdown(
  html: string,
  settings?: Partial<Settings>,
): Promise<string> {
  const bullet = settings?.listMarker ?? '-';
  const brStyle = settings?.brStyle ?? 'backslash';
  const rule = settings?.hrStyle ?? '*';

  const result = await unified()
    .use(rehypeParse)
    .use(rehypeRemoveComments)
    .use(rehypeRemark, {
      handlers: {
        table: createTableHandler(),
      },
    } as any)
    .use(remarkStripEmptyLinks)
    .use(remarkBareAutolinks)
    .use(remarkGfm)
    .use(remarkStringify, {
      bullet,
      rule,
      setext: false,
      handlers: {
        break: createBreakHandler(brStyle),
      },
    })
    .process(html);

  let md = String(result);

  // remark-gfm escapes punctuation in bare URLs to prevent autolinks;
  // undo this since we intentionally want GFM autolinks.
  md = restoreBareAutolinkEscapes(md);

  return md;
}
