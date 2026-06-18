import { defaultSchema } from 'rehype-sanitize';

export interface Settings {
  listMarker: '-' | '*' | '+';
  brStyle: 'backslash' | 'spaces' | 'newline';
  hrStyle: '*' | '-' | '_';
  linkTitleStyle: 'remove-all' | 'remove-matching-url' | 'preserve';
  strictCommonMark: boolean;
  allowRawHtml: boolean;
}

export const defaultSettings: Settings = {
  listMarker: '-',
  brStyle: 'backslash',
  hrStyle: '*',
  linkTitleStyle: 'remove-matching-url',
  strictCommonMark: true,
  allowRawHtml: true,
};

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
