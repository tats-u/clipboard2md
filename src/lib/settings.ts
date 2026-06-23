import { defaultSchema } from 'rehype-sanitize';

export type LinkTitleStyle =
  | 'remove-all'
  | 'remove-matching-url'
  | 'preserve-links'
  | 'preserve-all';

export interface Settings {
  listMarker: '-' | '*' | '+';
  brStyle: 'backslash' | 'spaces' | 'newline';
  hrStyle: '*' | '-' | '_';
  linkTitleStyle: LinkTitleStyle;
  imageStyle: 'preserve-size' | 'markdown' | 'placeholder';
  stripLinks: boolean;
  strictCommonMark: boolean;
  allowRawHtml: boolean;
}

export const defaultSettings: Settings = {
  listMarker: '-',
  brStyle: 'backslash',
  hrStyle: '*',
  linkTitleStyle: 'remove-matching-url',
  imageStyle: 'preserve-size',
  stripLinks: false,
  strictCommonMark: true,
  allowRawHtml: true,
};

export function normalizeLinkTitleStyle(value: unknown): LinkTitleStyle {
  switch (value) {
    case 'remove-all':
    case 'remove-matching-url':
    case 'preserve-links':
    case 'preserve-all':
      return value;
    case 'preserve':
      return 'preserve-links';
    default:
      return defaultSettings.linkTitleStyle;
  }
}

export function normalizeSettings(settings?: Partial<Settings> | null): Settings {
  return {
    ...defaultSettings,
    ...settings,
    linkTitleStyle: normalizeLinkTitleStyle(settings?.linkTitleStyle),
  };
}

export const preservedSafeHtmlTags = [
  'b',
  'cite',
  'dd',
  'dfn',
  'dl',
  'dt',
  'i',
  'ins',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'u',
] as const;

// Extend GitHub's default sanitization schema with additional safe attributes
// and explicitly preserved safe tags that we want to survive sanitization.
// The default schema already allows many structural/semantic tags such as
// details, summary, abbr, mark, figure, figcaption, ins, del, sub, sup,
// kbd, var, samp, and tables.
// id/name are auto-prefixed with "user-content-" (default clobber behavior).
// class, style, on* handlers are NOT in any allow list so they are stripped.
export const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    ...preservedSafeHtmlTags,
  ],
  attributes: {
    ...defaultSchema.attributes,
    // Add lang and dir as globally allowed attributes
    '*': [
      ...(defaultSchema.attributes?.['*'] || []),
      'lang',
      'dir',
    ],
  },
};
