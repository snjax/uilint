import type { UilintConfig } from './types';

export type {
  LayoutConfig,
  LayoutScenarioEntry,
  LayoutServerConfig,
  NamedViewport,
  UilintConfig,
  ViewportSize,
} from './types';
export { runUilintCli } from './cli';
export type { ScenarioRuntime, ScenarioModule, ScenarioSnapshotOptions } from './scenarioRuntime';
export { defineScenario } from './scenarioRuntime';

export function defineUilintConfig<T extends UilintConfig>(config: T): T {
  return config;
}
