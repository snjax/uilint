import type { Locator, Page } from '@playwright/test';
import type {
  ElemSnapshot,
  FrameRect,
  LayoutSpec,
  SelectorDescriptor,
  SnapshotStore,
  TextMetrics,
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

const zeroRect = (): FrameRect => ({
  left: 0,
  top: 0,
  width: 0,
  height: 0,
});

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
  type GeometryPayload = {
    box: FrameRect;
    view: FrameRect;
    canvas: FrameRect;
    text: string;
  textMetrics: TextMetrics | null;
  };

  const geometry = await safeCall(() =>
    nth.evaluate<GeometryPayload | null>(node => {
      const doc = node.ownerDocument ?? document;
      const win = doc.defaultView ?? window;
      const scrollX =
        win.scrollX ?? doc.documentElement?.scrollLeft ?? doc.body?.scrollLeft ?? 0;
      const scrollY =
        win.scrollY ?? doc.documentElement?.scrollTop ?? doc.body?.scrollTop ?? 0;

      const toFrameRect = (rect: DOMRect): FrameRect => ({
        left: rect.left + scrollX,
        top: rect.top + scrollY,
        width: rect.width,
        height: rect.height,
      });

      const rectRight = (rect: FrameRect): number => rect.left + rect.width;
      const rectBottom = (rect: FrameRect): number => rect.top + rect.height;

      const intersect = (a: FrameRect, b: FrameRect): FrameRect => {
        const left = Math.max(a.left, b.left);
        const top = Math.max(a.top, b.top);
        const right = Math.min(rectRight(a), rectRight(b));
        const bottom = Math.min(rectBottom(a), rectBottom(b));
        return {
          left,
          top,
          width: Math.max(0, right - left),
          height: Math.max(0, bottom - top),
        };
      };

      const baseRect = node.getBoundingClientRect();
      const box = toFrameRect(baseRect);

      const canvasWidth = Math.max(node.scrollWidth ?? 0, baseRect.width);
      const canvasHeight = Math.max(node.scrollHeight ?? 0, baseRect.height);
      const canvas: FrameRect = {
        left: box.left,
        top: box.top,
        width: canvasWidth,
        height: canvasHeight,
      };

      const viewportRect: FrameRect = {
        left: scrollX,
        top: scrollY,
        width: win.innerWidth ?? doc.documentElement?.clientWidth ?? doc.body?.clientWidth ?? 0,
        height:
          win.innerHeight ?? doc.documentElement?.clientHeight ?? doc.body?.clientHeight ?? 0,
      };

      let view = intersect(box, viewportRect);
      let current = node.parentElement;
      while (current) {
        const style = win.getComputedStyle(current);
        const overflowX = style.overflowX === 'visible' ? style.overflow : style.overflowX;
        const overflowY = style.overflowY === 'visible' ? style.overflow : style.overflowY;
        const clipsX = overflowX && overflowX !== 'visible';
        const clipsY = overflowY && overflowY !== 'visible';
        if (clipsX || clipsY) {
          const clipRect = toFrameRect(current.getBoundingClientRect());
          view = intersect(view, clipRect);
        }
        current = current.parentElement;
      }

      const mergeRects = (a: FrameRect, b: FrameRect): FrameRect => {
        const left = Math.min(a.left, b.left);
        const top = Math.min(a.top, b.top);
        const right = Math.max(rectRight(a), rectRight(b));
        const bottom = Math.max(rectBottom(a), rectBottom(b));
        return {
          left,
          top,
          width: Math.max(0, right - left),
          height: Math.max(0, bottom - top),
        };
      };

      const collectTextMetrics = (): TextMetrics => {
        const walker = doc.createTreeWalker(
          node,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode(textNode) {
              const value = textNode?.textContent ?? '';
              return /\S/.test(value) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            },
          },
        );
        const rects: FrameRect[] = [];
        while (walker.nextNode()) {
          const textNode = walker.currentNode as Text;
          if (!textNode) continue;
          const range = doc.createRange();
          range.selectNodeContents(textNode);
          const clientRects = range.getClientRects();
          for (let i = 0; i < clientRects.length; i += 1) {
            const rect = clientRects.item(i);
            if (!rect || rect.width === 0 || rect.height === 0) continue;
            rects.push(toFrameRect(rect));
          }
        }

        if (!rects.length) {
          return {
            lineCount: 0,
            lineRects: [],
            boundingRect: null,
          };
        }

        const rowTolerance = 1;
        const lines: FrameRect[] = [];
        rects.forEach(rect => {
          const index = lines.findIndex(line => Math.abs(line.top - rect.top) <= rowTolerance);
          if (index === -1) {
            lines.push(rect);
            return;
          }
          lines[index] = mergeRects(lines[index]!, rect);
        });

        const boundingRect = lines.reduce<FrameRect | null>(
          (acc, line) => {
            if (!acc) return line;
            return mergeRects(acc, line);
          },
          null,
        );

        return {
          lineCount: lines.length,
          lineRects: lines,
          boundingRect,
        };
      };

      return {
        box,
        view,
        canvas,
        text: node.textContent ?? '',
        textMetrics: collectTextMetrics(),
      };
    }),
  );

  const visible = (await safeCall(() => nth.isVisible())) ?? false;

  const fallbackRect = zeroRect();
  const box = geometry?.box ?? fallbackRect;
  const view = geometry?.view ?? fallbackRect;
  const canvas = geometry?.canvas ?? fallbackRect;
  const text = geometry?.text ?? ((await safeCall(() => nth.textContent())) ?? '');
  const textMetrics = geometry?.textMetrics ?? undefined;

  return {
    selector: descriptor.selector,
    index,
    box,
    view,
    canvas,
    visible,
    present: true,
    text,
    textMetrics,
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

