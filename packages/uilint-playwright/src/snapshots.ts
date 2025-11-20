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

const zeroRect = (): FrameRect => ({
  left: 0,
  top: 0,
  width: 0,
  height: 0,
});

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
  
  // Optimization: Use evaluateAll to fetch everything in one go.
  // This reduces N+1 round-trips to 1 round-trip.
  
  try {
    type BrowserSnapshot = {
    box: FrameRect;
    view: FrameRect;
    canvas: FrameRect;
    text: string;
  textMetrics: TextMetrics | null;
      visible: boolean;
  };

    const rawSnapshots = await locator.evaluateAll<BrowserSnapshot[]>((elements) => {
      return elements.map(node => {
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
        
        // Visibility check: Simplified version for bulk check.
        // Playwright's isVisible is more complex (style, opacity, visibility, etc.)
        // We do a basic check here.
        const style = win.getComputedStyle(node);
        const isVisible = style.visibility !== 'hidden' && 
                          style.display !== 'none' && 
                          style.opacity !== '0' &&
                          box.width > 0 && box.height > 0;

      return {
        box,
        view,
        canvas,
        text: node.textContent ?? '',
        textMetrics: collectTextMetrics(),
          visible: isVisible
        };
      });
    });

    return rawSnapshots.map((raw, index) => ({
    selector: descriptor.selector,
    index,
      box: raw.box,
      view: raw.view,
      canvas: raw.canvas,
      visible: raw.visible,
    present: true,
      text: raw.text,
      textMetrics: raw.textMetrics ?? undefined,
    }));

  } catch (e) {
    // If evaluateAll fails (e.g. selector not found is handled by locator check usually, 
    // but if locator exists but elements detached?), return empty
    return [];
  }
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
