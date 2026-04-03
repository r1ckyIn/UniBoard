import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Polyfill ResizeObserver for jsdom (used by Rough.js components)
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    private callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill IntersectionObserver for jsdom (used by scroll-spy)
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(private callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
  } as unknown as typeof globalThis.IntersectionObserver;
}

// Mock scrollIntoView for jsdom (not implemented in jsdom)
if (typeof Element.prototype.scrollIntoView === "undefined") {
  Element.prototype.scrollIntoView = vi.fn();
}
