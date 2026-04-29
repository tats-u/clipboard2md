import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import { defaultHandlers as hastToMdastHandlers } from 'hast-util-to-mdast';
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

function getBareAutolinkLiteral(node: any): string | null {
  if (node.title) return null;
  if (node.children.length !== 1 || node.children[0].type !== 'text') return null;

  const text = node.children[0].value as string;
  const url = node.url as string;

  if (!/^(https?:\/\/|www\.)/.test(text)) return null;

  if (text === url) {
    return text;
  }

  if (/^https?:\/\//.test(url) && text === url.replace(/^https?:\/\//, '') && text.startsWith('www.')) {
    return text;
  }

  return null;
}

function canFormatLinkAsAutolink(node: any, state: any): boolean {
  const raw = node.children?.length === 1 && node.children[0].type === 'text'
    ? (node.children[0].value as string)
    : '';

  return Boolean(
    !state.options.resourceLink &&
      node.url &&
      !node.title &&
      node.children &&
      node.children.length === 1 &&
      node.children[0].type === 'text' &&
      (raw === node.url || `mailto:${raw}` === node.url) &&
      /^[a-z][a-z+.-]+:/i.test(node.url) &&
      !/[\0- <>\u007F]/.test(node.url),
  );
}

function serializeDefaultLink(node: any, state: any, info: any): string {
  const quote = state.options.quote === "'" ? "'" : '"';
  const titleConstruct = quote === '"' ? 'titleQuote' : 'titleApostrophe';
  const tracker = state.createTracker(info);

  if (canFormatLinkAsAutolink(node, state)) {
    const stack = state.stack;
    state.stack = [];
    const exit = state.enter('autolink');
    let value = tracker.move('<');
    value += tracker.move(
      state.containerPhrasing(node, {
        before: value,
        after: '>',
        ...tracker.current(),
      }),
    );
    value += tracker.move('>');
    exit();
    state.stack = stack;
    return value;
  }

  const exit = state.enter('link');
  const exitLabel = state.enter('label');
  let value = tracker.move('[');
  value += tracker.move(
    state.containerPhrasing(node, {
      before: value,
      after: '](',
      ...tracker.current(),
    }),
  );
  value += tracker.move('](');
  exitLabel();

  if ((!node.url && node.title) || /[\0- \u007F]/.test(node.url)) {
    const exitDestination = state.enter('destinationLiteral');
    value += tracker.move('<');
    value += tracker.move(
      state.safe(node.url, { before: value, after: '>', ...tracker.current() }),
    );
    value += tracker.move('>');
    exitDestination();
  } else {
    const exitDestination = state.enter('destinationRaw');
    value += tracker.move(
      state.safe(node.url, {
        before: value,
        after: node.title ? ' ' : ')',
        ...tracker.current(),
      }),
    );
    exitDestination();
  }

  if (node.title) {
    const exitTitle = state.enter(titleConstruct);
    value += tracker.move(` ${quote}`);
    value += tracker.move(
      state.safe(node.title, {
        before: value,
        after: quote,
        ...tracker.current(),
      }),
    );
    value += tracker.move(quote);
    exitTitle();
  }

  value += tracker.move(')');
  exit();

  return value;
}

function createLinkHandler() {
  const handler = (node: any, _parent: any, state: any, info: any) => {
    const bareAutolink = getBareAutolinkLiteral(node);
    if (bareAutolink) {
      return bareAutolink;
    }

    return serializeDefaultLink(node, state, info);
  };

  handler.peek = (node: any, _parent: any, state: any) => {
    const bareAutolink = getBareAutolinkLiteral(node);
    if (bareAutolink) {
      return bareAutolink.charAt(0);
    }

    return canFormatLinkAsAutolink(node, state) ? '<' : '[';
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
        link: createLinkHandler(),
      },
    })
    .process(html);

  return String(result);
}
