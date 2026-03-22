import { defaultSchema } from 'rehype-sanitize';

export interface Settings {
  listMarker: '-' | '*' | '+';
  brStyle: 'backslash' | 'spaces' | 'newline';
  hrStyle: '*' | '-' | '_';
  allowRawHtml: boolean;
}

export const defaultSettings: Settings = {
  listMarker: '-',
  brStyle: 'backslash',
  hrStyle: '*',
  allowRawHtml: true,
};

// Extend GitHub's default sanitization schema with additional safe attributes.
// The default already allows: dl, dt, dd, ruby, rt, rp, details, summary,
// abbr, mark, figure, figcaption, ins, del, sub, sup, kbd, var, samp, tables, etc.
// id/name are auto-prefixed with "user-content-" (default clobber behavior).
// class, style, on* handlers are NOT in any allow list so they are stripped.
export const sanitizeSchema = {
  ...defaultSchema,
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
