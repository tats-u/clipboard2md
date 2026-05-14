import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeRemark from 'rehype-remark';
import { defaultHandlers as hastToMdastHandlers } from 'hast-util-to-mdast';
import { defaultHandlers as mdastToMarkdownHandlers } from 'mdast-util-to-markdown';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { SKIP, visit } from 'unist-util-visit';
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

function rehypeDropDirWithoutLang() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (!node.properties?.dir) return;
      if (node.properties?.lang) return;
      delete node.properties.dir;
    });
  };
}

function rehypeDropEmptyProperties() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (!node.properties) return;

      for (const [key, value] of Object.entries(node.properties)) {
        if (value === null || value === undefined) {
          delete node.properties[key];
          continue;
        }

        if (typeof value === 'boolean') {
          if (!value) {
            delete node.properties[key];
          }
          continue;
        }

        if (typeof value === 'string' && value.length === 0) {
          delete node.properties[key];
          continue;
        }

        if (Array.isArray(value)) {
          const filtered = value.filter(
            (entry) =>
              entry !== null &&
              entry !== undefined &&
              (typeof entry === 'string' ? entry.length > 0 : true),
          );
          if (filtered.length === 0) {
            delete node.properties[key];
            continue;
          }
          node.properties[key] = filtered;
        }
      }
    });
  };
}

const tableCellSpanPropertyNames = ['colSpan', 'rowSpan'] as const;

function normalizeTableCellSpan(value: unknown): number | null {
  const normalized =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isInteger(normalized) || normalized <= 1) {
    return null;
  }

  return normalized;
}

function rehypeNormalizeTableCellSpans() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'td' && node.tagName !== 'th') return;
      if (!node.properties) return;

      for (const propertyName of tableCellSpanPropertyNames) {
        const normalizedSpan = normalizeTableCellSpan(node.properties[propertyName]);
        if (normalizedSpan === null) {
          delete node.properties[propertyName];
          continue;
        }

        node.properties[propertyName] = normalizedSpan;
      }
    });
  };
}

function rehypeDropIdAndClass() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (!node.properties) return;
      delete node.properties.id;
      delete node.properties.className;
      // `tabIndex` (from HTML `tabindex`) has no meaning in Markdown output,
      // similar to id/class.
      delete node.properties.tabIndex;
    });
  };
}

const headingTagNames = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
// Decorative permalink symbols used by documentation generators (e.g. #, ¶, §)
const decorativeAnchorTextPattern = /^[#¶§]+$/u;

function collectText(node: any): string {
  if (node.type === 'text') return node.value as string;
  if (!node.children) return '';
  return (node.children as any[]).map(collectText).join('');
}

// rehype-parse stores the HTML `tabindex` attribute as `tabIndex` (number).
function isTabindexMinusOne(node: any): boolean {
  return node.type === 'element' && node.tagName === 'a' && node.properties?.tabIndex === -1;
}

function stripTabindexAnchors(node: any): void {
  if (!node.children) return;
  node.children = (node.children as any[]).filter((child: any) => !isTabindexMinusOne(child));
  (node.children as any[]).forEach(stripTabindexAnchors);
}

function rehypeDropTabindexAnchors() {
  return (tree: any) => {
    // Remove <a tabindex="-1"> inside headings (any depth)
    visit(tree, 'element', (node: any) => {
      if (!headingTagNames.has(node.tagName)) return;
      stripTabindexAnchors(node);
      return SKIP;
    });

    // Extra condition: also remove <a tabindex="-1"> anywhere whose entire
    // text content consists only of decorative symbols (#, ¶, §).
    // These are permalink/anchor icons that add no value in Markdown output.
    visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
      if (!isTabindexMinusOne(node)) return;
      if (index === undefined || !parent?.children) return;
      if (!decorativeAnchorTextPattern.test(collectText(node))) return;
      (parent.children as any[]).splice(index, 1);
      return [SKIP, index];
    });
  };
}

const transparentWrapperTags = new Set(['article', 'div', 'section', 'span']);

function rehypeUnwrapTransparentWrappers() {
  return (tree: any) => {
    visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
      if (index === undefined || !parent?.children) return;
      if (!transparentWrapperTags.has(node.tagName)) return;
      if (Object.keys(node.properties ?? {}).length > 0) return;

      parent.children.splice(index, 1, ...(node.children ?? []));
      return [SKIP, index];
    });
  };
}

const emptyPhrasingContainerTypes = new Set(['delete', 'emphasis', 'link', 'strong']);

function markdownNodeHasMeaningfulContent(node: any): boolean {
  switch (node.type) {
    case 'text':
      return /\S/u.test(node.value ?? '');
    case 'inlineCode':
    case 'html':
      return typeof node.value === 'string' && node.value.length > 0;
    case 'break':
    case 'image':
    case 'imageReference':
    case 'linkReference':
      return true;
    default:
      return Array.isArray(node.children) && node.children.some(markdownNodeHasMeaningfulContent);
  }
}

function remarkUnwrapEmptyPhrasingContainers() {
  return (tree: any) => {
    visit(
      tree,
      (node: any) => emptyPhrasingContainerTypes.has(node.type),
      (node: any, index: number | undefined, parent: any) => {
        if (index === undefined || !parent) return;
        if (node.type === 'link' && !node.url) {
          parent.children.splice(index, 1, ...node.children);
          return [SKIP, index];
        }
        if (!markdownNodeHasMeaningfulContent(node)) {
          parent.children.splice(index, 1, ...node.children);
          return [SKIP, index];
        }
      },
    );
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
  if (node.children.length === 0) return null;
  if (node.children.some((child: any) => child.type !== 'text')) return null;

  const text = node.children.map((child: any) => child.value).join('') as string;
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
function tableContainsNodesThatNeedRawHtml(node: any, allowRawHtml: boolean): boolean {
  let shouldFallback = false;

  visit(node, 'element', (child: any) => {
    if (child === node) return;
    if (shouldPreserveRawHtml(child, allowRawHtml)) {
      shouldFallback = true;
      return SKIP;
    }
  });

  return shouldFallback;
}

function createTableHandler(allowRawHtml: boolean) {
  return (state: any, node: any) => {
    if (tableContainsNodesThatNeedRawHtml(node, allowRawHtml)) {
      return createRawHtmlNode(state, node);
    }

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
    table: createTableHandler(settings.allowRawHtml),
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
    .use(rehypeDropTabindexAnchors)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeDropIdAndClass)
    .use(rehypeDropDirWithoutLang)
    .use(rehypeDropEmptyProperties)
    .use(rehypeNormalizeTableCellSpans)
    .use(rehypeUnwrapTransparentWrappers)
    .use(rehypeRemark, {
      handlers: createRehypeRemarkHandlers(resolvedSettings),
    } as any)
    .use(remarkUnwrapEmptyPhrasingContainers)
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
