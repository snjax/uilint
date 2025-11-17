import type { Locator, Page } from '@playwright/test';
import type {
  ElemSnapshot,
  LayoutSpec,
  SelectorDescriptor,
  SnapshotStore,
} from '@uilint/core';

type RegularSelectorDescriptor = SelectorDescriptor & { kind: 'css' | 'xpath' };

const locatorCache = new WeakMap<Page, Map<string, Locator>>();

/**
 * @notice Builds a cache key for a locator based on selector type + string.
 * @param descriptor Selector descriptor limited to `css` or `xpath`.
 * @returns Stable cache key used to memoize locators.
 */
function locatorKey(descriptor: RegularSelectorDescriptor): string {
  return `${descriptor.kind}:${descriptor.selector}`;
}

/**
 * @notice Returns a cached locator for the descriptor or creates one.
 * @param page Playwright page instance.
 * @param descriptor Normalized selector descriptor.
 * @returns Playwright locator to query matching DOM nodes.
 */
function getLocator(page: Page, descriptor: RegularSelectorDescriptor): Locator {
  let pageCache = locatorCache.get(page);
  if (!pageCache) {
    pageCache = new Map();
    locatorCache.set(page, pageCache);
  }
  const key = locatorKey(descriptor);
  const cached = pageCache.get(key);
  if (cached) return cached;

  const locator =
    descriptor.kind === 'xpath'
      ? page.locator(`xpath=${descriptor.selector}`)
      : page.locator(descriptor.selector);
  pageCache.set(key, locator);
  return locator;
}

/**
 * @notice Wraps Playwright calls and surfaces `null` instead of throwing.
 * @typeParam T Underlying result type.
 * @param fn Async function performing a Playwright call.
 * @returns Resolved value or `null` when an error occurs.
 */
async function safeCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

/**
 * @notice Converts a locator instance/element index into an `ElemSnapshot`.
 * @param descriptor Selector descriptor for the element.
 * @param locator Playwright locator targeting all matching elements.
 * @param index Zero-based index of the target element inside the locator set.
 * @returns Snapshot capturing geometry/visibility/text of the element.
 */
async function snapshotForLocator(
  descriptor: RegularSelectorDescriptor,
  locator: Locator,
  index: number,
): Promise<ElemSnapshot> {
  const nth = locator.nth(index);
  const boundingBox = await safeCall(() => nth.boundingBox());
  const left = boundingBox?.x ?? 0;
  const top = boundingBox?.y ?? 0;
  const width = boundingBox?.width ?? 0;
  const height = boundingBox?.height ?? 0;

  const visible = (await safeCall(() => nth.isVisible())) ?? false;
  const text = (await safeCall(() => nth.textContent())) ?? '';

  return {
    selector: descriptor.selector,
    index,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    visible,
    present: true,
    text,
  };
}

/**
 * @notice Collects snapshots for all elements matching a specific descriptor.
 * @param page Playwright page instance.
 * @param descriptor Selector descriptor associated with an element or group key.
 * @returns Array of snapshots, one per matched node (may be empty).
 */
async function collectForDescriptor(
  page: Page,
  descriptor: SelectorDescriptor,
): Promise<ElemSnapshot[]> {
  if (descriptor.kind === 'special') {
    return [];
  }

  const typedDescriptor = descriptor as RegularSelectorDescriptor;
  const locator = getLocator(page, typedDescriptor);
  const count = await locator.count();
  if (count === 0) {
    return [];
  }

  const snapshots: ElemSnapshot[] = [];
  for (let index = 0; index < count; index += 1) {
    snapshots.push(await snapshotForLocator(typedDescriptor, locator, index));
  }
  return snapshots;
}

/**
 * @notice Collects all element/group snapshots required by a layout spec.
 * @param page Playwright page instance.
 * @param spec Layout spec whose selectors will be evaluated.
 * @returns Snapshot store keyed by spec element/group keys.
 */
export async function collectSnapshots(page: Page, spec: LayoutSpec): Promise<SnapshotStore> {
  const store: SnapshotStore = {};

  await Promise.all(
    Object.entries(spec.elements).map(async ([key, descriptor]) => {
      if (descriptor.kind === 'special') return;
      store[key] = await collectForDescriptor(page, descriptor);
    }),
  );

  await Promise.all(
    Object.entries(spec.groups).map(async ([key, descriptor]) => {
      store[key] = await collectForDescriptor(page, descriptor);
    }),
  );

  return store;
}

