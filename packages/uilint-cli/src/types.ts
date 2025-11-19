export interface ViewportSize {
  width: number;
  height: number;
}

export interface NamedViewport {
  name: string;
  size: ViewportSize;
}

export interface LayoutScenarioEntry {
  module: string;
  exportName?: string;
  viewports?: string[];
}

export interface LayoutServerConfig {
  host?: string;
  port?: number;
}

export type BuildStep = string | (() => Promise<void> | void);

export interface LayoutConfig {
  distDir: string;
  build?: BuildStep;
  server?: LayoutServerConfig;
  scenarios: Record<string, LayoutScenarioEntry>;
  viewports?: Record<string, ViewportSize>;
  viewportGroups?: Record<string, string[]>;
}

export interface UilintConfig {
  layout?: LayoutConfig;
}

export interface LoadedConfig {
  config: UilintConfig;
  configPath: string;
  configDir: string;
}
