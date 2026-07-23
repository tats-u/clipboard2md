import { describe, expect, it } from 'vitest';
import { defaultSettings, normalizeSettings } from '../settings';

describe('normalizeSettings', () => {
  it('maps the legacy stripLinks setting to stripNonAutolinks', () => {
    expect(normalizeSettings({ stripLinks: true })).toMatchObject({
      ...defaultSettings,
      stripNonAutolinks: true,
    });
  });

  it('keeps unsafeBareAutolinks disabled by default', () => {
    expect(normalizeSettings()).toMatchObject({
      ...defaultSettings,
      unsafeBareAutolinks: false,
    });
  });

  it('keeps convertNonSemanticBoldItalic disabled by default', () => {
    expect(normalizeSettings()).toMatchObject({
      ...defaultSettings,
      convertNonSemanticBoldItalic: false,
    });
  });
});
