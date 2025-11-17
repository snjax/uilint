/**
 * @notice Snapshot of a DOM element captured via Playwright.
 */
export interface ElemSnapshot {
  readonly selector: string;
  readonly index?: number;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
  readonly visible: boolean;
  readonly present: boolean;
  readonly text: string;
  readonly meta?: Record<string, unknown>;
}

/**
 * @notice Runtime wrapper around an `ElemSnapshot`.
 * @dev Exposes derived geometry helpers and keeps snapshots immutable.
 */
export interface Elem {
  readonly name: string;
  readonly snap: ElemSnapshot;

  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;

  readonly visible: boolean;
  readonly present: boolean;
  readonly text: string;

  findChild?(key: string): Elem | undefined;
}

/**
 * @notice Collection of runtime elements.
 */
export type Group = Elem[];

/**
 * @notice Options used to construct an `Elem`.
 */
export interface ElemFactoryOptions {
  readonly name: string;
  readonly snapshot: ElemSnapshot;
  readonly findChild?: (key: string) => Elem | undefined;
}

/**
 * @notice Type alias describing numeric predicates used by layout constraints.
 */
export type Range = (value: number) => boolean;

/**
 * @notice Structured description of a violated constraint.
 */
export interface Violation {
  readonly constraint: string;
  readonly message: string;
  readonly details?: unknown;
}

/**
 * @notice Minimal interface implemented by all layout constraints.
 */
export interface Constraint {
  readonly name: string;
  check(): Violation[];
}

class ElemImpl implements Elem {
  public readonly name: string;
  public readonly snap: ElemSnapshot;
  private readonly childResolver?: (key: string) => Elem | undefined;

  constructor(options: ElemFactoryOptions) {
    this.name = options.name;
    this.snap = options.snapshot;
    this.childResolver = options.findChild;
  }

  public get left(): number {
    return this.snap.left;
  }

  public get top(): number {
    return this.snap.top;
  }

  public get right(): number {
    return this.snap.right;
  }

  public get bottom(): number {
    return this.snap.bottom;
  }

  public get width(): number {
    return this.snap.width;
  }

  public get height(): number {
    return this.snap.height;
  }

  public get centerX(): number {
    return this.snap.left + this.snap.width / 2;
  }

  public get centerY(): number {
    return this.snap.top + this.snap.height / 2;
  }

  public get visible(): boolean {
    return this.snap.visible;
  }

  public get present(): boolean {
    return this.snap.present;
  }

  public get text(): string {
    return this.snap.text;
  }

  public findChild(key: string): Elem | undefined {
    return this.childResolver?.(key);
  }
}

/**
 * @notice Factory helper that creates runtime elements from snapshots.
 * @param options Element metadata and snapshot payload.
 * @returns Immutable runtime element.
 */
export function createElem(options: ElemFactoryOptions): Elem {
  return new ElemImpl(options);
}

