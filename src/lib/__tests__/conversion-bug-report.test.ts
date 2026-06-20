import { describe, expect, it } from 'vitest';
import { createConversionBugReportUrls } from '../conversion-bug-report';
import { defaultSettings } from '../settings';

function readSearchParams(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

describe('createConversionBugReportUrls', () => {
  it('prefills the issue form with html, markdown, and settings when the URL is short enough', () => {
    const { directUrl, fallbackUrl, shouldUseFallback } = createConversionBugReportUrls({
      html: '<p>Hello</p>',
      markdown: 'Hello',
      settings: defaultSettings,
    });

    expect(shouldUseFallback).toBe(false);

    const directParams = readSearchParams(directUrl);
    expect(directParams.get('template')).toBe('conversion-bug-report.yml');
    expect(directParams.get('problematic_html')).toBe('<p>Hello</p>');
    expect(directParams.get('actual_markdown')).toBe('Hello');
    expect(directParams.get('conversion_settings')).toContain('- strictCommonMark: true');

    const fallbackParams = readSearchParams(fallbackUrl);
    expect(fallbackParams.get('problematic_html')).toBe('');
    expect(fallbackParams.get('actual_markdown')).toBe('');
  });

  it('switches to fallback mode when the autofill URL is too long', () => {
    const longHtml = `<div>${'x'.repeat(8000)}</div>`;
    const { directUrl, fallbackUrl, shouldUseFallback } = createConversionBugReportUrls({
      html: longHtml,
      markdown: 'short markdown',
      settings: defaultSettings,
    });

    expect(directUrl.length).toBeGreaterThan(fallbackUrl.length);
    expect(shouldUseFallback).toBe(true);
  });
});
