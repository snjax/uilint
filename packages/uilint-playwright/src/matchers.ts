import type { Page, TestInfo } from '@playwright/test';
import type { LayoutReport, LayoutRunOptions, LayoutSpec } from '@uilint/core';
import { runLayoutSpec } from './runner.js';

/**
 * @notice Minimal subset of Playwright's expect API used for matcher installation.
 */
type ExpectLike = {
  extend(matchers: Record<string, (...args: unknown[]) => unknown>): void;
};

/**
 * @notice Runtime context Playwright binds when invoking custom matchers.
 */
interface MatcherContext {
  isNot?: boolean;
  testInfo?: TestInfo;
}

/**
 * @notice Additional options supported by the uilint matcher.
 */
export interface MatcherRunOptions extends LayoutRunOptions {
  testInfo?: TestInfo;
}

/**
 * @notice Formats up to five violations into a log-friendly summary.
 */
function formatViolations(report: LayoutReport): string {
  const lines = report.violations.slice(0, 5).map(v => `- ${v.constraint}: ${v.message}`);
  return lines.join('\n');
}

/**
 * @notice Attaches a JSON layout report to Playwright test output when available.
 */
async function attachReport(
  testInfo: TestInfo | undefined,
  spec: LayoutSpec,
  report: LayoutReport,
): Promise<void> {
  if (!testInfo) return;
  const body = Buffer.from(JSON.stringify(report, null, 2), 'utf-8');
  await testInfo.attach(`uilint-layout-report-${spec.name}`, {
    body,
    contentType: 'application/json',
  });
}

/**
 * @notice Playwright matcher that fails when a layout spec reports violations.
 * @param page Playwright page instance.
 * @param spec Layout spec defined via `@uilint/core`.
 * @param options Optional matcher run options (viewTag, testInfo attachment).
 */
export async function toMatchLayout(
  this: MatcherContext,
  page: Page,
  spec: LayoutSpec,
  options?: MatcherRunOptions,
): Promise<{ pass: boolean; message: () => string }> {
  const { testInfo: providedTestInfo, viewTag } = options ?? {};
  const report = await runLayoutSpec(page, spec, viewTag ? { viewTag } : undefined);
  const pass = report.violations.length === 0;
  if (!pass) {
    await attachReport(providedTestInfo ?? this.testInfo, spec, report);
  }
  const positiveMessage = pass
    ? `Layout spec "${spec.name}" matched with no violations.`
    : `Layout spec "${spec.name}" has ${report.violations.length} violation(s):\n${formatViolations(
        report,
      )}`;
  const negativeMessage = pass
    ? `Expected layout to have violations for spec "${spec.name}", but none were found.`
    : `Expected layout not to match spec "${spec.name}", but it has violations.`;

  return {
    pass,
    message: () => (this.isNot ? negativeMessage : positiveMessage),
  };
}

export const uilintMatchers: Record<string, (this: unknown, ...args: unknown[]) => unknown> = {
  // The matcher signature is enforced by Playwright's expect.extend at runtime.
  // We keep the exported `toMatchLayout` strongly typed and cast here for compatibility.
  toMatchLayout: toMatchLayout as unknown as (this: unknown, ...args: unknown[]) => unknown,
};

/**
 * @notice Installs uilint matchers into a given `expect` instance.
 * @param expectInstance Expect-like object (typically Playwright's `expect`).
 */
export function installUilintMatchers(expectInstance: ExpectLike): void {
  expectInstance.extend(uilintMatchers);
}

/**
 * @notice Convenience helper that throws when layout violations are detected.
 * @param page Playwright page instance.
 * @param spec Layout spec defined via `@uilint/core`.
 * @param options Optional matcher run options (viewTag, testInfo).
 * @returns Layout report when no violations occur.
 * @throws Error with formatted summary when violations are present.
 */
export async function assertLayout(
  page: Page,
  spec: LayoutSpec,
  options?: MatcherRunOptions,
): Promise<LayoutReport> {
  const { viewTag } = options ?? {};
  const report = await runLayoutSpec(page, spec, viewTag ? { viewTag } : undefined);
  if (report.violations.length) {
    const summary = formatViolations(report);
    throw new Error(
      `Layout spec "${spec.name}" failed with ${report.violations.length} violation(s):\n${summary}`,
    );
  }
  return report;
}

