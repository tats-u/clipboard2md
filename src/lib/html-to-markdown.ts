import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import { defaultHandlers as hastToMdastHandlers } from 'hast-util-to-mdast';
import { defaultHandlers as mdastToMarkdownHandlers } from 'mdast-util-to-markdown';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import { toHtml } from 'hast-util-to-html';
import type { Settings } from './settings';

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

function getEffectiveLinkTitle(
  node: any,
  linkTitleStyle: Settings['linkTitleStyle'],
): string | null {
  if (linkTitleStyle === 'remove-all') return null;
  if (linkTitleStyle === 'remove-matching-url' && node.title === node.url) return null;
  return typeof node.title === 'string' ? node.title : null;
}

function getLinkNodeForMarkdown(
  node: any,
  linkTitleStyle: Settings['linkTitleStyle'],
) {
  const effectiveTitle = getEffectiveLinkTitle(node, linkTitleStyle);
  if (
    effectiveTitle === node.title ||
    (effectiveTitle === null && (node.title === null || node.title === undefined))
  ) {
    return node;
  }

  return { ...node, title: effectiveTitle };
}

function normalizeAutolinkText(text: string, url: string): string {
  if (!/^https?:\/\/|^www\./.test(text)) return text;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname === '/' && !parsedUrl.search && !parsedUrl.hash) {
      return text.replace(/\/$/, '');
    }
  } catch {
    // Ignore invalid URLs and keep the original text unchanged.
  }

  return text;
}

function getBareAutolinkLiteral(
  node: any,
  linkTitleStyle: Settings['linkTitleStyle'],
): string | null {
  if (getEffectiveLinkTitle(node, linkTitleStyle)) return null;
  if (node.children.length !== 1 || node.children[0].type !== 'text') return null;

  const text = node.children[0].value as string;
  const url = node.url as string;
  const urlWithoutProtocol = url.replace(/^https?:\/\//, '');

  if (!/^(https?:\/\/|www\.)/.test(text)) return null;

  if (text === url) {
    return normalizeAutolinkText(text, url);
  }

  if (/^https?:\/\//.test(url) && text === urlWithoutProtocol && text.startsWith('www.')) {
    return normalizeAutolinkText(text, url);
  }

  return null;
}

function createLinkHandler(linkTitleStyle: Settings['linkTitleStyle']) {
  const defaultLinkHandler = mdastToMarkdownHandlers.link;

  const handler = (node: any, _parent: any, state: any, info: any) => {
    const bareAutolink = getBareAutolinkLiteral(node, linkTitleStyle);
    if (bareAutolink) {
      return bareAutolink;
    }

    return defaultLinkHandler(getLinkNodeForMarkdown(node, linkTitleStyle), _parent, state, info);
  };

  handler.peek = (node: any, _parent: any, state: any) => {
    const bareAutolink = getBareAutolinkLiteral(node, linkTitleStyle);
    if (bareAutolink) {
      return bareAutolink.charAt(0);
    }

    return defaultLinkHandler.peek(getLinkNodeForMarkdown(node, linkTitleStyle), _parent, state);
  };

  return handler;
}

/**
 * Custom table handler: tries default GFM table conversion,
 * falls back to raw HTML for tables that can't be represented in GFM.
 */
function createTableHandler() {
  return (state: any, node: any) => {
    try {
      return hastToMdastHandlers.table(state, node);
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

export async function htmlToMarkdown(
  html: string,
  settings?: Partial<Settings>,
): Promise<string> {
  const bullet = settings?.listMarker ?? '-';
  const brStyle = settings?.brStyle ?? 'backslash';
  const rule = settings?.hrStyle ?? '*';
  const linkTitleStyle = settings?.linkTitleStyle ?? 'remove-matching-url';

  const result = await unified()
    .use(rehypeParse)
    .use(rehypeRemoveComments)
    .use(rehypeRemark, {
      handlers: {
        table: createTableHandler(),
      },
    } as any)
    .use(remarkStripEmptyLinks)
    .use(remarkGfm)
    .use(remarkStringify, {
      bullet,
      rule,
      setext: false,
      handlers: {
        break: createBreakHandler(brStyle),
        link: createLinkHandler(linkTitleStyle),
      },
    })
    .process(html);

  return String(result);
}
