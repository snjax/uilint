import type { Page } from '@playwright/test';
import type { LayoutReport, LayoutSpec } from '@uilint/core';
import type { NamedViewport } from './types';

type PageGotoOptions = Parameters<Page['goto']>[1];

export interface ScenarioSnapshotOptions {
  viewTag?: string;
}

export interface ScenarioRuntime {
  page: Page;
  viewport: NamedViewport;
  baseUrl: string;
  goto: (path: string, options?: PageGotoOptions) => Promise<void>;
  snapshot: (name: string, spec: LayoutSpec, options?: ScenarioSnapshotOptions) => Promise<LayoutReport>;
}

export type ScenarioModule = (runtime: ScenarioRuntime) => Promise<void> | void;

export function defineScenario<T extends ScenarioModule>(scenario: T): T {
  return scenario;
}
