import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeRemark from 'rehype-remark';
import { defaultHandlers as hastToMdastHandlers } from 'hast-util-to-mdast';
import { defaultHandlers as mdastToMarkdownHandlers } from 'mdast-util-to-markdown';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { visit } from 'unist-util-visit';
import { toHtml } from 'hast-util-to-html';
import { preservedSafeHtmlTags, sanitizeSchema, type Settings } from './settings';

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

function rehypeDropRedundantLtrDir() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.properties?.dir !== 'ltr') return;
      if (typeof node.properties?.lang === 'string' && node.properties.lang.length > 0) return;
      delete node.properties.dir;
    });
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
    return text;
  }

  if (/^https?:\/\//.test(url) && text === urlWithoutProtocol && text.startsWith('www.')) {
    return text;
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

const preservedTagsSet = new Set<string>(preservedSafeHtmlTags);
const markdownCompatibleAttributeNames = new Map<string, Set<string>>([
  ['a', new Set(['href', 'title'])],
  ['img', new Set(['alt', 'src', 'title'])],
  ['li', new Set(['checked'])],
  ['ol', new Set(['start'])],
  ['td', new Set(['align'])],
  ['th', new Set(['align'])],
]);

function hasSignificantPropertyValues(node: any): boolean {
  return Object.values(node.properties ?? {}).some((value) => {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value;
    return String(value).length > 0;
  });
}

function hasOnlyMarkdownCompatibleAttributes(node: any): boolean {
  const propertyNames = Object.keys(node.properties ?? {});
  if (propertyNames.length === 0) return true;

  const allowedAttributes = markdownCompatibleAttributeNames.get(node.tagName);
  if (!allowedAttributes) return false;
  return propertyNames.every((propertyName) => allowedAttributes.has(propertyName));
}

function createRawHtmlNode(state: any, node: any) {
  const result = {
    type: 'html',
    value: toHtml(node, { allowDangerousHtml: true }),
  };
  state.patch(node, result);
  return result;
}

function shouldPreserveRawHtml(node: any, allowRawHtml: boolean): boolean {
  if (!allowRawHtml) return false;
  if (preservedTagsSet.has(node.tagName)) return true;
  if (hasOnlyMarkdownCompatibleAttributes(node)) return false;
  return hasSignificantPropertyValues(node);
}

function createRehypeRemarkHandlers(settings: Settings) {
  const handlers = {
    ...hastToMdastHandlers,
    table: createTableHandler(),
  } as Record<string, any>;
  const tagNames = new Set([...Object.keys(handlers), ...preservedTagsSet]);

  return Object.fromEntries(
    Array.from(tagNames).map((tagName) => [
      tagName,
      (state: any, node: any, parent: any) => {
        if (shouldPreserveRawHtml(node, settings.allowRawHtml)) {
          return createRawHtmlNode(state, node);
        }

        const handler = handlers[tagName];
        return handler ? handler(state, node, parent) : state.all(node);
      },
    ]),
  );
}

export async function htmlToMarkdown(
  html: string,
  settings?: Partial<Settings>,
): Promise<string> {
  const resolvedSettings: Settings = {
    listMarker: settings?.listMarker ?? '-',
    brStyle: settings?.brStyle ?? 'backslash',
    hrStyle: settings?.hrStyle ?? '*',
    linkTitleStyle: settings?.linkTitleStyle ?? 'remove-matching-url',
    allowRawHtml: settings?.allowRawHtml ?? true,
  };

  const result = await unified()
    .use(rehypeParse)
    .use(rehypeRemoveComments)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeDropRedundantLtrDir)
    .use(rehypeRemark, {
      handlers: createRehypeRemarkHandlers(resolvedSettings),
    } as any)
    .use(remarkStripEmptyLinks)
    .use(remarkGfm)
    .use(remarkStringify, {
      bullet: resolvedSettings.listMarker,
      rule: resolvedSettings.hrStyle,
      setext: false,
      handlers: {
        break: createBreakHandler(resolvedSettings.brStyle),
        link: createLinkHandler(resolvedSettings.linkTitleStyle),
      },
    })
    .process(html);

  return String(result);
}
