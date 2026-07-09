import type { Settings } from './settings';

const ISSUE_URL = 'https://github.com/tats-u/clipboard2md/issues/new';
export const CONVERSION_BUG_TEMPLATE = 'conversion-bug-report.yml';
export const CONVERSION_BUG_REPORT_TITLE = 'Conversion bug: ';
export const ISSUE_URL_LENGTH_LIMIT = 7500;

interface ConversionBugReportFields {
  title: string;
  template: string;
  problematic_html: string;
  actual_markdown: string;
  expected_markdown: string;
  reason: string;
  conversion_settings: string;
}

interface BuildConversionBugReportOptions {
  html: string;
  markdown: string;
  settings: Settings;
}

export interface ConversionBugReportUrls {
  directUrl: string;
  fallbackUrl: string;
  shouldUseFallback: boolean;
}

function formatSettings(settings: Settings): string {
  return [
    `- listMarker: ${settings.listMarker}`,
    `- brStyle: ${settings.brStyle}`,
    `- hrStyle: ${settings.hrStyle}`,
    `- titleStyle: ${settings.titleStyle}`,
    `- imageStyle: ${settings.imageStyle}`,
    `- stripNonAutolinks: ${settings.stripNonAutolinks}`,
    `- unsafeBareAutolinks: ${settings.unsafeBareAutolinks}`,
    `- strictCommonMark: ${settings.strictCommonMark}`,
    `- allowRawHtml: ${settings.allowRawHtml}`,
  ].join('\n');
}

function buildFields({ html, markdown, settings }: BuildConversionBugReportOptions, includeSourceContent: boolean): ConversionBugReportFields {
  return {
    title: CONVERSION_BUG_REPORT_TITLE,
    template: CONVERSION_BUG_TEMPLATE,
    problematic_html: includeSourceContent ? html : '',
    actual_markdown: includeSourceContent ? markdown : '',
    expected_markdown: '',
    reason: '',
    conversion_settings: formatSettings(settings),
  };
}

function buildIssueUrl(fields: ConversionBugReportFields): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(fields)) {
    params.set(key, value);
  }

  return `${ISSUE_URL}?${params.toString()}`;
}

function getFence(content: string): string {
  const backtickRuns = content.match(/`+/g) ?? [];
  const longestRun = backtickRuns.reduce((max, run) => Math.max(max, run.length), 0);
  return '`'.repeat(Math.max(3, longestRun + 1));
}

function buildClipboardSection(label: string, language: string, content: string): string {
  const fence = getFence(content);
  return `${label}:\n\n${fence}${language}\n${content}\n${fence}`;
}

export function createConversionBugReportClipboardText({ html, markdown }: Pick<BuildConversionBugReportOptions, 'html' | 'markdown'>): string {
  return [
    buildClipboardSection('Input', 'html', html),
    buildClipboardSection('Actual', 'md', markdown),
    buildClipboardSection('Expected', 'md', markdown),
  ].join('\n\n');
}

export function createConversionBugReportUrls(options: BuildConversionBugReportOptions): ConversionBugReportUrls {
  const directUrl = buildIssueUrl(buildFields(options, true));
  const fallbackUrl = buildIssueUrl(buildFields(options, false));

  return {
    directUrl,
    fallbackUrl,
    shouldUseFallback: directUrl.length > ISSUE_URL_LENGTH_LIMIT,
  };
}
