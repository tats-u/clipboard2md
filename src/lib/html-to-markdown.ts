import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize from 'rehype-sanitize';
import rehypeRemark from 'rehype-remark';
import { defaultHandlers as hastToMdastHandlers } from 'hast-util-to-mdast';
import { defaultHandlers as mdastToMarkdownHandlers } from 'mdast-util-to-markdown';
import remarkGfm from 'remark-gfm';
import remarkCjkFriendly from 'remark-cjk-friendly/bidi';
import remarkCjkFriendlyGfmStrikethrough from 'remark-cjk-friendly-gfm-strikethrough/bidi';
import remarkStringify from 'remark-stringify';
import { SKIP, visit } from 'unist-util-visit';
import { toHtml } from 'hast-util-to-html';
import {
  defaultSettings,
  preservedSafeHtmlTags,
  sanitizeSchema,
  type Settings,
} from './settings';

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

function rehypeRemoveStyleElements() {
  return (tree: any) => {
    visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
      if (node.tagName !== 'style') return;
      if (index === undefined || !parent?.children) return;
      parent.children.splice(index, 1);
      return [SKIP, index];
    });
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

function normalizeHeadingLevel(value: unknown): number | null {
  const normalized =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isInteger(normalized) || normalized < 1 || normalized > 6) {
    return null;
  }

  return normalized;
}

function rehypeNormalizeAriaHeadings() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (node.properties?.role !== 'heading') return;

      const level =
        normalizeHeadingLevel(node.properties?.ariaLevel) ??
        normalizeHeadingLevel(node.properties?.['aria-level']);
      if (level === null) return;

      node.tagName = `h${level}`;
      delete node.properties.role;
      delete node.properties.ariaLevel;
      delete node.properties['aria-level'];
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

const codeBlockLanguageClassPattern = /^language-(.+)$/;

function normalizeCodeBlockLanguage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getCodeBlockLanguageFromProperties(node: any): string | null {
  const dataLang =
    normalizeCodeBlockLanguage(node.properties?.dataLang) ??
    normalizeCodeBlockLanguage(node.properties?.['data-lang']);
  if (dataLang) return dataLang;

  const classNames = node.properties?.className;
  const values = Array.isArray(classNames) ? classNames : typeof classNames === 'string' ? [classNames] : [];

  for (const value of values) {
    const match = codeBlockLanguageClassPattern.exec(String(value));
    if (match) return normalizeCodeBlockLanguage(match[1]);
  }

  return null;
}

function getCodeBlockLanguage(node: any, ancestors: any[]): string | null {
  const selfLanguage = getCodeBlockLanguageFromProperties(node);
  if (selfLanguage) return selfLanguage;

  let checkedDivAncestors = 0;

  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const ancestor = ancestors[index];
    if (ancestor.type !== 'element' || ancestor.tagName !== 'div') continue;

    checkedDivAncestors += 1;
    const ancestorLanguage = getCodeBlockLanguageFromProperties(ancestor);
    if (ancestorLanguage) return ancestorLanguage;
    if (checkedDivAncestors >= 2) break;
  }

  return null;
}

function rehypeAnnotateCodeBlockLanguage() {
  return (tree: any) => {
    const ancestors: any[] = [];

    const walk = (node: any) => {
      if (node.type === 'element' && node.tagName === 'pre') {
        const language = getCodeBlockLanguage(node, ancestors);
        if (language) {
          node.data = { ...node.data, clipboard2mdCodeLang: language };
        }
      }

      if (!Array.isArray(node.children)) return;

      ancestors.push(node);
      for (const child of node.children) {
        walk(child);
      }
      ancestors.pop();
    };

    walk(tree);
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
      // `aria-label` has no Markdown equivalent and can force raw HTML output.
      delete node.properties.ariaLabel;
      delete node.properties['aria-label'];
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
  const stack = [node];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    switch (current.type) {
      case 'text':
        if (/\S/.test(current.value ?? '')) return true;
        break;
      case 'inlineCode':
      case 'html':
        if (typeof current.value === 'string' && current.value.length > 0) return true;
        break;
      case 'break':
      case 'image':
      case 'imageReference':
      case 'linkReference':
        return true;
      default:
        if (Array.isArray(current.children)) {
          stack.push(...current.children);
        }
        break;
    }
  }

  return false;
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

function createPreHandler() {
  const defaultPreHandler = hastToMdastHandlers.pre;

  return (state: any, node: any) => {
    const result = defaultPreHandler(state, node);
    const language = normalizeCodeBlockLanguage(node.data?.clipboard2mdCodeLang);

    if (language && result?.type === 'code' && !result.lang) {
      result.lang = language;
    }

    return result;
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
    pre: createPreHandler(),
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
  const resolvedSettings: Settings = { ...defaultSettings, ...settings };

  const processor = unified()
    .use(rehypeParse)
    .use(rehypeRemoveComments)
    .use(rehypeRemoveStyleElements)
    .use(rehypeNormalizeAriaHeadings)
    .use(rehypeDropTabindexAnchors)
    .use(rehypeAnnotateCodeBlockLanguage)
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
    .use(remarkGfm);

  if (!resolvedSettings.strictCommonMark) {
    processor.use(remarkCjkFriendly).use(remarkCjkFriendlyGfmStrikethrough);
  }

  const result = await processor
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
