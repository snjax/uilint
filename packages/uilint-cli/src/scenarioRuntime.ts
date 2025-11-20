import type { Page } from '@playwright/test';
import type { LayoutReport, LayoutSpec, ViewportClass } from '@uilint/core';
import type { NamedViewport } from './types';

type PageGotoOptions = Parameters<Page['goto']>[1];

export interface ScenarioSnapshotOptions {
  viewTag?: string;
  viewportClass?: ViewportClass;
}

export interface ScenarioRuntime {
  page: Page;
  viewport: NamedViewport;
  viewportClass: ViewportClass;
  baseUrl: string;
  goto: (path: string, options?: PageGotoOptions) => Promise<void>;
  snapshot: (name: string, spec: LayoutSpec, options?: ScenarioSnapshotOptions) => Promise<LayoutReport>;
}

export type ScenarioModule = (runtime: ScenarioRuntime) => Promise<void> | void;

export interface ScenarioDefinition {
  name: string;
  run: ScenarioModule;
}

// Overload: defineScenario(name: string, scenario: ScenarioModule)
export function defineScenario(name: string, scenario: ScenarioModule): ScenarioDefinition;
// Overload: defineScenario(scenario: ScenarioModule) - inferred anonymous scenario
export function defineScenario(scenario: ScenarioModule): ScenarioDefinition;

export function defineScenario(arg1: string | ScenarioModule, arg2?: ScenarioModule): ScenarioDefinition {
  if (typeof arg1 === 'string') {
    if (!arg2) {
      throw new Error('defineScenario: missing scenario function when name provided');
    }
    return { name: arg1, run: arg2 };
  }
  // For anonymous scenario
  return { name: 'unknown', run: arg1 };
}
