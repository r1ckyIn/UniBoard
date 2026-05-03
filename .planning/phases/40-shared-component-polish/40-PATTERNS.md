---
phase: 40
slug: shared-component-polish
generated: 2026-04-30
analog_search_scope: frontend/components, frontend/hooks, frontend/__tests__, frontend/tests/e2e, frontend/app, frontend/eslint.config.mjs
files_classified: 45
analogs_found: 45
no_analog_count: 0
---

# Phase 40 — Pattern Map

> Per-file analog mapping for the planner. Each new/modified file gets the closest existing analog (same role + same data flow), with concrete code excerpts and line refs. The planner copies these patterns into PLAN.md actions.

**Phase 39 has no PATTERNS.md** (predates the gsd-pattern-mapper agent). Structure here is fresh, mirroring the GSD canonical PATTERNS.md schema.

---

## File Classification

### NEW files (11)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `frontend/components/ui/Button.tsx` | component (cva primitive) | request-response (DOM event) | `frontend/components/shared/FeedbackButton.tsx` (typed-prop button shape) + `frontend/lib/utils/cn.ts` (twMerge) | role-match (no prior cva) |
| `frontend/components/ui/Input.tsx` | component (cva primitive with slots) | request-response (DOM event) | `frontend/components/deadlines/DeadlineAiChat.tsx` lines 119–129 (input + icon row) + `cn` | role-match (no prior cva) |
| `frontend/components/shared/StreamingAssistant.tsx` | component (chat assistant view) | streaming (SSE chunks) | `frontend/components/shared/AiChatBubble.tsx` lines 22–43 (assistant branch + cursor span) | exact (replaces this branch) |
| `frontend/components/shared/UserMessage.tsx` | component (chat user view) | request-response (static text render) | `frontend/components/shared/AiChatBubble.tsx` lines 22–34 (user branch) | exact (replaces this branch) |
| `frontend/hooks/useStreamingText.ts` | hook (chunk-index adapter) | streaming (delta-driven setState) | `frontend/hooks/use-ai-stream.ts` lines 25–140 (SSE → state machine) | role-match (lighter wrapper) |
| `frontend/__tests__/components/ui/Button.test.tsx` | test (Vitest + RTL) | unit (RTL render → screen assertion) | `frontend/__tests__/auth/LoginForm.test.tsx` lines 1–130 + `frontend/__tests__/design-system/RoughCard.test.tsx` | exact |
| `frontend/__tests__/components/ui/Input.test.tsx` | test | unit | `frontend/__tests__/auth/LoginForm.test.tsx` (form input + userEvent) + `RoughCard.test.tsx` (custom className merge) | exact |
| `frontend/__tests__/components/shared/StreamingAssistant.test.tsx` | test | unit (rerender for streaming state) | `frontend/__tests__/hooks/use-ai-stream.test.ts` (renderHook + vi.mock SSE) + `RoughCard.test.tsx` (DOM class assertions) | role-match |
| `frontend/__tests__/components/shared/UserMessage.test.tsx` | test | unit | `frontend/__tests__/design-system/RoughCard.test.tsx` (children render + className) | exact |
| `frontend/__tests__/hooks/useStreamingText.test.ts` | test (renderHook) | unit (rerender chain) | `frontend/__tests__/hooks/use-ai-stream.test.ts` lines 1–80 | exact |
| `frontend/tests/e2e/perf/phase40-sidebar-60fps.spec.ts` | test (Playwright spec stub, env-gated) | env-gated E2E | `frontend/tests/e2e/perf/coldstart.spec.ts` (`@ts-nocheck` + `test.skip(true, ...)` stub) + `frontend/tests/e2e/phase39-transition-parity.spec.ts` (full env-gated active spec) | exact (Phase 39 SEED-39 carry-forward) |

### MODIFIED files (4 structural + 36 sweep + 2 lockfile)

| File | Role | Data Flow | Closest Analog (extension target) | Match Quality |
|------|------|-----------|-----------------------------------|---------------|
| `frontend/app/globals.css` | config (Tailwind v4 CSS-first) | build-time | self (existing `@theme` block lines 3–232) | self-extension |
| `frontend/eslint.config.mjs` | config (ESLint flat config) | build-time | self (existing `no-restricted-syntax` block lines 28–57) | self-extension |
| `frontend/components/layout/Sidebar.tsx` | component (layout, two-layer rewrite) | DOM/CSS animation | self (current width-anim implementation lines 45–139) | self-rewrite (preserves contain + 1px border insights) |
| `frontend/__tests__/eslint/no-raw-transition.test.ts` | test (ESLint rule fixtures) | unit (Linter in-process) | self (existing 4 fixtures lines 81–135) | self-extension |
| `frontend/components/deadlines/DeadlineAiChat.tsx` | component (caller migration) | streaming consumer | self (current AiChatBubble import + map lines 7, 87–104) | caller-migration |
| `frontend/components/course-detail/AiCourseChat.tsx` | component (caller migration) | streaming consumer | self (current AiChatBubble import + map lines 7, 78–96) | caller-migration |
| `frontend/__tests__/components/layout/Sidebar.test.tsx` | test (NEW because none exists today) | unit | `frontend/__tests__/design-system/RoughCard.test.tsx` (two-layer DOM assertion idiom) | role-match |
| 36 files with verbose-form `transition-*` | various (sweep target) | mechanical sweep | Phase 39 SEED-40 sed playbook (LEARNINGS) | identical pass with new shorthand |
| `frontend/package.json` | config (deps) | build-time | self (add `class-variance-authority`) | self-extension |
| `frontend/pnpm-lock.yaml` | config (lockfile) | build-time | auto-generated by `pnpm add` | mechanical |

### DELETED files (1)

| File | Reason |
|------|--------|
| `frontend/components/shared/AiChatBubble.tsx` | Replaced by StreamingAssistant + UserMessage (D-40-05). 2 callers migrate atomically. |

---

## Code Excerpts

### A. cn / twMerge utility (every new component depends on this)

**File:** `frontend/lib/utils/cn.ts` (entire file, 8 lines)
```ts
import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind conflict resolution.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Why it matters:** `cn` is the universal merge helper. cva variants compose with `cn(buttonVariants({...}), className)` at the variant call site to honor caller overrides. tailwind-merge resolves Tailwind conflicts (e.g., caller `w-full` overriding default width).

---

### B. Button primitive analog (FeedbackButton.tsx — typed-prop button with conditional className)

**File:** `frontend/components/shared/FeedbackButton.tsx` lines 1–23, 41–73 — closest existing typed-prop button shape. NO cva exists in the repo today; this is the closest extant pattern for "Props interface → conditional className via cn()".

```tsx
"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useFeedback } from "@/hooks/use-feedback";

interface FeedbackButtonProps {
  threadId: string;
  initialFeedback?: "thumbs_up" | "thumbs_down" | null;
  size?: "sm" | "md";
}

export default function FeedbackButton({
  threadId,
  initialFeedback = null,
  size = "sm",
}: FeedbackButtonProps) {
  const [currentFeedback, setCurrentFeedback] = useState(initialFeedback);
  // ...
  const btnBase =
    "p-[3px] rounded-[4px] transition-colors [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)] cursor-pointer border-none bg-transparent";

  return (
    <button
      type="button"
      onClick={() => handleFeedback("thumbs_up")}
      disabled={isPending}
      className={cn(
        btnBase,
        currentFeedback === "thumbs_up"
          ? "text-[#788c5d] bg-[rgba(120,140,93,0.15)]"
          : "text-[#b5b3aa] hover:text-[#788c5d] hover:bg-[rgba(120,140,93,0.08)]",
      )}
      aria-label="Helpful"
    >
      <ThumbsUp size={iconSize} />
    </button>
  );
}
```

**Patterns to copy / replace for Button.tsx:**
1. `"use client"` directive at file head — every interactive primitive needs this.
2. `interface XxxProps { ... }` — but Button extends `ButtonHTMLAttributes<HTMLButtonElement>` instead of plain interface (so `disabled`, `onClick`, `type`, `aria-label` etc. flow through `{...props}`).
3. `cn(base, variantClasses, className)` order — base first, variant second, caller className last so caller wins via twMerge.
4. **Replace** the inline `btnBase` 102-char string with `cva()` variants object (per RESEARCH Pattern 1) — and the resulting Button.tsx should USE the new `transition-claude-fast` shorthand (Pattern 6), not the verbose form.
5. **Add** `forwardRef<HTMLButtonElement, ButtonProps>` wrap (FeedbackButton omits this; Button needs it because it's a foundational primitive that callers may want to ref for focus management — Phase 41 A11Y groundwork).
6. **Add** `displayName = "Button"` after forwardRef (React DevTools).

---

### C. Input primitive analog (current `<input>` usage in DeadlineAiChat)

**File:** `frontend/components/deadlines/DeadlineAiChat.tsx` lines 119–129 — closest existing input shape. Will be replaced as part of caller migration.

```tsx
<input
  type="text"
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={handleKeyDown}
  disabled={isStreaming}
  className="flex-1 border-[1.5px] border-[#e8e5dd] rounded-full bg-[#f6f5f0] px-[20px] py-[10px] text-[0.82rem] text-[#2d2d2a] outline-none focus:border-[#d97757] transition-colors disabled:opacity-50"
  placeholder={t("aiPlaceholder")}
/>
```

**Patterns to copy / replace for Input.tsx:**
1. Native `<input>` element — no abstraction over the DOM type.
2. Spreading caller `{...props}` (DeadlineAiChat does this implicitly via inline JSX; cva primitive does it explicitly).
3. The `border-[1.5px]` + `rounded-full` (search) vs `rounded-lg` (default) split → maps to `variant: "default" | "search"` per D-40-02.
4. **Replace** inline `transition-colors` with `transition-claude-fast` shorthand inside cva base.
5. **Add** `leftIcon`/`rightIcon` slot pattern per RESEARCH Pattern 2 — wrap in `<div className="relative">` + `absolute` positioned slot divs only when icon prop present (early-return without wrapper when no icon, to avoid extra DOM noise on plain inputs).
6. **Replace** hex literals (`#d97757`) with token utilities (`focus:border-orange focus:shadow-[0_0_0_3px_var(--color-orange-soft)]`) per Phase 39 token map.

---

### D. Two-layer DOM analog (RoughCard.tsx — the closest existing two-layer transform component)

**File:** `frontend/components/design-system/RoughCard.tsx` lines 115–139 — closest extant pattern of "outer wrapper for transform/contain effects + inner content shell". Sidebar's two-layer rewrite mirrors this geometry but with `translateX` instead of `transition-shadow`.

```tsx
return (
  <div
    ref={containerRef}
    data-testid="rough-card-outer"
    className={cn(
      "relative overflow-visible p-[10px]",
      "transition-shadow duration-[0.28s] ease-[cubic-bezier(.4,0,.2,1)]",
      !disableHover && "hover:shadow-card-hover hover:-translate-y-px",
      className
    )}
  >
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[2] overflow-visible"
    />
    <div
      className={cn(
        "relative bg-card-bg shadow-card overflow-hidden rounded-[6px]",
        padding
      )}
    >
      <div className="relative z-[1]">{children}</div>
    </div>
  </div>
);
```

**Geometric pattern transferable to Sidebar:**
- Outer `<div>` is the layout occupier; inner content shell is positioned/transformed independently. (Sidebar: outer `<aside>` 68px = layout occupier; inner panel 224px = transform target.)
- `relative` outer + `absolute inset-0` inner is the analog of Sidebar's `fixed inset-y-0 left-0 w-[68px]` outer + `absolute inset-y-0 left-0 w-[224px]` inner.
- `overflow-hidden` + `[contain:layout_paint]` on outer (Sidebar — preserved from current v2.0 line 67) confines paint to the subtree.

---

### E. Current Sidebar.tsx (the modification target — what to preserve, what to swap)

**File:** `frontend/components/layout/Sidebar.tsx` (entire current implementation, 141 lines) — the file Plan-3 rewrites.

**Preserve (Phase 39 v2.0 wins from `999.1-sidebar-transform-based-architecture-refactor` work):**
- Line 9–14: `lucide-react` icon imports + `LucideIcon` typing.
- Line 17–34: `NavItem` interface + `navItems[]` + `bottomItems[]` arrays (literal mirrored verbatim per RESEARCH Pattern 5 lines 763–780).
- Line 37–43: `useTranslations`, `usePathname`, `isActive` helper (verbatim).
- Line 67: `[contain:layout_paint]` (current line 67) — moves from outer `<aside>` to inner panel per RESEARCH §Pattern 5; outer `<aside>` ALSO keeps it per Pattern 5 line 803 to confine the transform's repaint window.
- Line 62: `border-r border-[rgba(20,20,19,.08)]` (1px right border replacing v2.0 bleeding shadow — Quick Task 260420-n29 fix; STAY on outer `<aside>` per Pattern 5 line 802).

**Swap (the architectural refactor):**
| Current line(s) | What it does | Replace with |
|-----------------|--------------|--------------|
| Line 47–48: `"fixed inset-y-0 left-0 w-[var(--spacing-sidebar-w)]"` | width-anim scaffold | KEEP outer `<aside>` at 68px stable; outer is now layout occupier ONLY |
| Line 49: `"bg-dark flex flex-col py-5 z-[100]"` | background + layout direction on `<aside>` | MOVE `bg-dark flex flex-col py-5` to inner panel; KEEP `z-[100]` on outer |
| Line 52: `"transition-[width] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]"` | animates width property (causes layout reflow) | DELETE — outer no longer animates |
| Line 63: `"hover:w-[var(--spacing-sidebar-w-expanded)] group"` | `:hover` width swap + `group` for child opacity | MOVE `group` to outer `<aside>`; REPLACE width swap with inner `translate-x-[-156px] group-hover:translate-x-0` (RESEARCH Pattern 5 line 813) |
| Line 96: `"transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]"` (in nav `<Link>`) | verbose-form transition | REPLACE with `transition-claude-fast` shorthand (D-40-03) |
| Line 124: same verbose form (bottom nav `<Link>`) | same | REPLACE with `transition-claude-fast` |
| Line 75/103/131: `transition-opacity duration-[0.28s]` (label fade) | opacity transition with literal duration | REPLACE with `transition-claude-base` shorthand (250ms ≈ 0.28s; minor cosmetic shift acceptable per D-40-03) |
| Active state lines 97–99, 125–127: `bg-[rgba(217,119,87,.18)] text-orange` | hardcoded orange-soft hex | REPLACE with `bg-orange-soft text-orange` per RESEARCH Pattern 5 line 845 (D-40-09 active-highlight-inside-inner-panel pattern) |

**RESEARCH Pattern 5 final JSX template** (RESEARCH.md lines 791–887) is the canonical target — copy that structure verbatim, with `[contain:layout_paint]` on BOTH outer and inner panel, `will-change-transform` on inner.

---

### F. AiChatBubble.tsx (the deletion target — what to preserve in StreamingAssistant + UserMessage)

**File:** `frontend/components/shared/AiChatBubble.tsx` (entire 44 lines).

```tsx
"use client";

import { cn } from "@/lib/utils/cn";

interface AiChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export default function AiChatBubble({
  role,
  content,
  isStreaming = false,
}: AiChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex mb-[8px]", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] px-[14px] py-[10px] rounded-[12px] text-[0.82rem] leading-[1.55] whitespace-pre-wrap",
          isUser
            ? "bg-[#d97757] text-white rounded-br-[4px]"
            : "bg-[#eae7e0] text-[#2d2d2a] rounded-bl-[4px]",
        )}
      >
        {content}
        {isStreaming && !content && (
          <span className="inline-block w-[6px] h-[14px] bg-[#9b9b94] animate-pulse ml-[2px]" />
        )}
        {isStreaming && content && (
          <span className="inline-block w-[2px] h-[14px] bg-[#9b9b94] animate-pulse ml-[1px]" />
        )}
      </div>
    </div>
  );
}
```

**Splitting plan:**
| Current branch | Goes to | Mutations |
|----------------|---------|-----------|
| User branch lines 23–24 (`justify-end`) + line 30 (`bg-[#d97757] text-white rounded-br-[4px]`) | `UserMessage.tsx` | Replace `bg-[#d97757]` → `bg-orange` (Phase 39 token); KEEP `rounded-br-[4px]` (visual contract — D-40-05 user-bubble preserved) |
| Assistant branch lines 23–24 (`justify-start`) + line 31 (`bg-[#eae7e0] text-[#2d2d2a] rounded-bl-[4px]`) | `StreamingAssistant.tsx` | DELETE all bubble styling — assistant goes no-bubble (D-40-05); replace `text-[#2d2d2a]` → `text-text-1`; ADD `font-serif text-body leading-[1.65]` for Source Serif 4 flow (RESEARCH Pattern 4 line 652) |
| Cursor span lines 35–40 (`animate-pulse`) | `StreamingAssistant.tsx` (assistant only — user never streams) | REPLACE `animate-pulse` (Tailwind built-in pulse, wrong rhythm) → inline style `animation: streaming-cursor-blink var(--motion-stream-cursor-period) step-end infinite` (Phase 39 LEARNINGS — `step-end infinite`, NEVER `alternate`) |
| Existing wrapper `flex justify-{end\|start}` | Both new components keep their own flex wrapper | StreamingAssistant: `flex justify-start mb-[12px]`; UserMessage: `flex justify-end mb-[8px]` |

---

### G. SSE hook analog (use-ai-stream.ts — the source feeding useStreamingText)

**File:** `frontend/hooks/use-ai-stream.ts` lines 25–140 (entire hook). Lighter wrapper analog for `useStreamingText`.

**Excerpted shape (the parts useStreamingText must compose with):**
```ts
export interface UseAiStreamReturn {
  messages: ChatMessage[];
  // ...
  isStreaming: boolean;
  // ...
}

export function useAiStream(courseId: string, language: string = "en"): UseAiStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  // ...
  // SSE consumption per token event:
  // assistantContent += event.data.text as string;
  // setMessages((prev) => { /* update last message content */ });
}
```

**Patterns useStreamingText.ts copies:**
1. `"use client"` directive — RESEARCH Pattern 3 includes it. Existing `use-ai-stream.ts` does NOT include it (line 1 is the import). **Decision: align with existing convention — omit `"use client"` from useStreamingText.ts.** Hooks consumed only by client components inherit the client-boundary from the consumer.
2. Named export of TypeScript interfaces `UseStreamingTextOptions` + `UseStreamingTextReturn` (mirrors use-ai-stream's `ChatMessage` + `UseAiStreamReturn`).
3. `useState` — D-40-05 + RESEARCH Q3 lock-in is `useState` (not `useReducer`, not `useDeferredValue`).
4. **Diverges:** useStreamingText is a thin adapter — `chunkIndex` bumps via `useEffect(() => setChunkIndex(p => p+1), [source])`. RESEARCH Pattern 3 (lines 559–576) is the canonical implementation — copy verbatim.

---

### H. Vitest hook test analog (use-ai-stream.test.ts)

**File:** `frontend/__tests__/hooks/use-ai-stream.test.ts` lines 1–80 — the closest analog for `useStreamingText.test.ts`.

```ts
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/lib/api/ai-stream", () => ({
  streamAiResponse: vi.fn(async function* () {
    yield { event: "status", data: { phase: "searching" } };
    // ...
  }),
}));

vi.mock("@/lib/auth/store", () => ({
  useAuthStore: { getState: () => ({ accessToken: "test-token" }) },
}));

import { useAiStream } from "@/hooks/use-ai-stream";

describe("useAiStream sources event", () => {
  it("parses sources event into state.sources (AIFEAT-02 / Phase 34)", async () => {
    const { result } = renderHook(() => useAiStream("fake-course-id"));

    act(() => {
      result.current.sendMessage("What is X?");
    });

    await waitFor(() => {
      expect(result.current.sources.length).toBe(1);
    });
  });
});
```

**Patterns useStreamingText.test.ts copies:**
1. `import { describe, it, expect } from "vitest"` + `import { renderHook } from "@testing-library/react"` — convention already in use.
2. `import { useStreamingText } from "@/hooks/useStreamingText"` — `@/` path alias (vitest.config.ts maps `@` → `./`).
3. **Diverges:** useStreamingText doesn't need `vi.mock("@/lib/api/...")` because it doesn't call SSE — it only consumes upstream-provided `source` prop. Use `renderHook` with `initialProps` + `rerender` to drive state changes (RESEARCH Pattern 9 lines 1100–1148 is the canonical test).
4. Test descriptions match VALIDATION.md Per-Task map exactly:
   - `"initial empty state"` (40-02-01)
   - `"chunkIndex bumps"` (40-02-02)
   - `"stream complete"` (40-02-03)
   - `"isStreaming false on completion"` (40-02-04)

---

### I. Vitest component test analog (RoughCard.test.tsx) — for Button/Input/Sidebar/StreamingAssistant/UserMessage

**File:** `frontend/__tests__/design-system/RoughCard.test.tsx` lines 1–91 — closest non-stub component test. Demonstrates DOM class assertion idiom + caller-className-merge testing.

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("roughjs", () => ({
  default: {
    svg: () => ({
      rectangle: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
    }),
  },
}));

import RoughCard from "@/components/design-system/RoughCard";

describe("RoughCard", () => {
  it("renders children content", () => {
    render(
      <RoughCard>
        <span data-testid="card-child">Hello Card</span>
      </RoughCard>
    );

    expect(screen.getByTestId("card-child")).toBeInTheDocument();
  });

  it("applies two-layer structure: outer has padding gap, inner has bg/shadow", () => {
    const { container } = render(
      <RoughCard>
        <span>Content</span>
      </RoughCard>
    );

    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain("overflow-visible");
    expect(outerDiv.className).toContain("p-[10px]");
    expect(outerDiv.className).not.toContain("bg-card-bg");

    const innerDiv = outerDiv.querySelector(".bg-card-bg") as HTMLElement;
    expect(innerDiv).toBeInTheDocument();
    expect(innerDiv.className).toContain("rounded-[6px]");
  });

  it("accepts custom className on outer wrapper", () => {
    const { container } = render(
      <RoughCard className="custom-class"><span>Content</span></RoughCard>
    );
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain("custom-class");
  });
});
```

**Patterns the 5 new component tests copy:**

1. **Render harness** — `render(<Component {...props}>children</Component>)` + `screen.getByRole(...)` or `getByTestId(...)`.
2. **Class-string assertion** — `expect(el.className).toContain("bg-orange")` not `toMatch` (twMerge yields a stable space-joined string).
3. **For `Button.test.tsx` (40-01-01..08):** Use `screen.getByRole("button", { name: "Click" })` + `expect(btn.className).toContain("bg-orange")` etc. RESEARCH Pattern 9 lines 1153–1189 is the canonical RED stub.
4. **For `Input.test.tsx` (40-01-09..14):** Use `screen.getByRole("textbox")` + `getByPlaceholderText` for placeholder assertion. Test `leftIcon`/`rightIcon` slot rendering by passing `<svg data-testid="lefticon" />` and asserting it's present.
5. **For `StreamingAssistant.test.tsx` (40-02-05..07):** Test cursor mount via `expect(container.querySelector('[aria-hidden]')).toBeInTheDocument()` when `isStreaming=true`; test cursor unmount with `rerender({isStreaming: false})` followed by `expect(container.querySelector('[aria-hidden]')).not.toBeInTheDocument()`. Test Source Serif 4: `expect(container.firstChild?.firstChild?.className).toContain("font-serif")`.
6. **For `UserMessage.test.tsx` (40-02-08..09):** Test right-aligned `expect(container.firstChild.className).toContain("justify-end")`; test orange bubble: `expect(bubbleDiv.className).toContain("bg-orange")`; test text content via `screen.getByText(content)`.
7. **For `Sidebar.test.tsx` (40-03-01..05):** Need to mock `next-intl`, `@/lib/i18n/navigation` (Link, usePathname), `lucide-react` (or just let it pass — icons render fine in jsdom). Mirror the LoginForm.test.tsx mock idiom (lines 7–94 of that file) — extensive `vi.mock(...)` blocks.

**Mock idioms from `frontend/__tests__/auth/LoginForm.test.tsx` lines 7–94 (CITED, copy verbatim):**

```tsx
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "nav.dashboard": "Dashboard",
      "nav.timetable": "Timetable",
      // ... per nav key
    };
    return map[key] ?? key;
  },
}));

// Mock i18n navigation (Link + usePathname)
vi.mock("@/lib/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
  usePathname: () => "/timetable",
}));
```

---

### J. ESLint rule test extension analog (no-raw-transition.test.ts — self extension)

**File:** `frontend/__tests__/eslint/no-raw-transition.test.ts` lines 22–135 (entire file). Plan-1 EXTENDS it.

**The existing `lintCode()` helper (lines 63–79) is reusable verbatim** — no setup change. Add 4 new `it(...)` blocks before the closing `});`:

```ts
// ──────────────────────────────────────────────────────────
// Phase 40 D-40-03 + D-40-04 fixtures (NEW — 4 tests)
// ──────────────────────────────────────────────────────────

it("flags verbose tokenized form (D-40-03 SEED-40 shorthand encouragement)", () => {
  if (!parserAvailable) return;
  const code = `const x = <div className="transition-all [transition-duration:var(--motion-fast)] [transition-timing-function:var(--ease-claude-out)]" />;`;
  const messages = lintCode(code);
  const restricted = messages.filter((m) => m.ruleId === "no-restricted-syntax");
  expect(restricted.length).toBeGreaterThan(0);
});

it("does NOT flag the shorthand form transition-claude-fast (D-40-03)", () => {
  if (!parserAvailable) return;
  const code = `const x = <div className="transition-claude-fast hover:bg-orange" />;`;
  const messages = lintCode(code);
  const restricted = messages.filter((m) => m.ruleId === "no-restricted-syntax");
  expect(restricted).toEqual([]);
});

it("flags var(--ease) legacy alias (D-40-04 deprecation)", () => {
  if (!parserAvailable) return;
  const code = `const x = <div className="transition" style={{ transition: "color 0.28s var(--ease)" }} />;`;
  // String literal "color 0.28s var(--ease)" trips the rule.
  const messages = lintCode(code);
  const restricted = messages.filter((m) => m.ruleId === "no-restricted-syntax");
  expect(restricted.length).toBeGreaterThan(0);
});

it("flags var(--ease-fast) legacy alias (D-40-04 deprecation)", () => {
  if (!parserAvailable) return;
  const code = `const x = <div style={{ transition: "opacity 0.15s var(--ease-fast)" }} />;`;
  const messages = lintCode(code);
  const restricted = messages.filter((m) => m.ruleId === "no-restricted-syntax");
  expect(restricted.length).toBeGreaterThan(0);
});
```

**Source for ESLint rule extension itself:** `frontend/eslint.config.mjs` lines 28–57 + RESEARCH.md Pattern 7 (lines 939–1009). The rule extension order matters per RESEARCH §"Verification once installed" (lines 1011–1017) — sweep callers FIRST, then commit ESLint extension, otherwise `pnpm lint --max-warnings 0` blocks CI.

---

### K. Tailwind v4 `@utility` block analog (globals.css `@theme` self-extension)

**File:** `frontend/app/globals.css` lines 1–232 (current `@theme` block). Plan-1 ADDS three `@utility` blocks at the **top level** (NOT nested in `@theme`).

**Insertion point:** Immediately after the closing `}` of the `@theme` block (line 232), before the `@supports not (color: oklch(0% 0 0))` block (line 241).

**Content per RESEARCH Pattern 6 (lines 916–932) verbatim:**

```css
/* === Phase 40 plan-1: SEED-40 motion utility shorthands === */
@utility transition-claude-fast {
  transition-property: all;
  transition-duration: var(--motion-fast);
  transition-timing-function: var(--ease-claude-out);
}

@utility transition-claude-base {
  transition-property: all;
  transition-duration: var(--motion-base);
  transition-timing-function: var(--ease-claude-out);
}

@utility transition-claude-slow {
  transition-property: all;
  transition-duration: var(--motion-slow);
  transition-timing-function: var(--ease-claude-out);
}
```

**Tailwind v4 caveat:** `@utility` is a top-level CSS at-rule, NOT nested inside `@theme` (a frequent mistake). Verified by RESEARCH §Pattern 6 line 935 with WebFetch citation.

**Phase 39 LEARNINGS guard:** PostCSS minifier strips empty rules — but `@utility` blocks have declarations (`transition-property: all` etc.), so they survive to production CSS. Verify with the existing Phase 39 verification idiom: post-deploy MCP grep on `_next/static/css/*.css` for `transition-claude-fast`.

---

### L. Playwright env-gated stub analog (Phase 39's transition-parity spec)

**File:** `frontend/tests/e2e/phase39-transition-parity.spec.ts` (entire 114 lines) — the canonical Phase 39 SEED-39 carry-forward pattern.

**Excerpted shape:**
```ts
import { test, expect } from "@playwright/test";
import {
  loginAsPerfTestUser,
  shouldRunPerfSuite,
} from "./perf/helpers/auth";
import { installFixedClock } from "./perf/helpers/clock";

test.describe("@phase40 @sidebar-60fps — Sidebar 60fps Intel Mac", () => {
  test.skip(
    !shouldRunPerfSuite(),
    "Phase 40 SHARED-03 60fps verification requires PERF_TEST_PASSWORD + Supabase env vars (matches Phase 38 P04 / Phase 39 P03 gates). Baselines on Intel Mac via human UAT post-deploy.",
  );

  test.beforeEach(async ({ page }) => {
    await installFixedClock(page);
    await loginAsPerfTestUser(page);
  });

  test("hover-expand achieves >55fps median on Sidebar (Intel Mac target)", async ({ page }) => {
    // ... per RESEARCH Pattern 10 lines 1218-1244
  });
});
```

**Helpers already exist** (no need to create):
- `frontend/tests/e2e/perf/helpers/auth.ts` — `shouldRunPerfSuite()` + `loginAsPerfTestUser(page)` (verified 2026-04-30, 132 lines).
- `frontend/tests/e2e/perf/helpers/clock.ts` — `installFixedClock(page)` (Phase 38 P04).

**Path note:** RESEARCH locates the spec at `frontend/tests/e2e/perf/phase40-sidebar-60fps.spec.ts` (under `perf/`). Phase 39's spec was at `tests/e2e/` (top-level) explicitly per its line 14–17 comment. **Plan-3 follows RESEARCH path** (`tests/e2e/perf/`). Confirm `playwright.config.ts` `testMatch` glob covers both `tests/e2e/*.spec.ts` AND `tests/e2e/perf/*.spec.ts` — `coldstart.spec.ts` and `first-paint.spec.ts` already live under `perf/` and run, so the glob is permissive.

**Frontmatter pragma:** Phase 39 spec did NOT use `@ts-nocheck` because `@playwright/test` was installed by Phase 38 P04. Phase 40 spec also skips `@ts-nocheck` for the same reason. (Only `coldstart.spec.ts` retains `@ts-nocheck` because of its older comment about the Phase 38 P04 dependency.)

---

### M. Caller migration analog (DeadlineAiChat.tsx + AiCourseChat.tsx — same shape)

**Files:** `frontend/components/deadlines/DeadlineAiChat.tsx` lines 7, 87–104 + `frontend/components/course-detail/AiCourseChat.tsx` lines 7, 78–96 — both have identical migration shape.

**Current shared structure (DeadlineAiChat lines 87–104, AiCourseChat lines 78–96):**
```tsx
{messages.map((msg, i) => {
  const isLatest = i === messages.length - 1;
  const isLatestAssistant = isLatest && msg.role === "assistant";
  return (
    <Fragment key={i}>
      <AiChatBubble
        role={msg.role}
        content={msg.content}
        isStreaming={isStreaming && isLatestAssistant}
      />
      {isLatestAssistant && sources.length > 0 && (
        <Sources sources={sources} />
      )}
    </Fragment>
  );
})}
```

**Migration target (RESEARCH Pattern 4 lines 718–734 — copy verbatim):**
```tsx
import StreamingAssistant from "@/components/shared/StreamingAssistant";
import UserMessage from "@/components/shared/UserMessage";
// (delete: import AiChatBubble from "@/components/shared/AiChatBubble";)

{messages.map((msg, i) => {
  const isLatest = i === messages.length - 1;
  const isLatestAssistant = isLatest && msg.role === "assistant";
  return (
    <Fragment key={i}>
      {msg.role === "user" ? (
        <UserMessage content={msg.content} />
      ) : (
        <StreamingAssistant
          content={msg.content}
          isStreaming={isStreaming && isLatestAssistant}
        />
      )}
      {isLatestAssistant && sources.length > 0 && (
        <Sources sources={sources} />
      )}
    </Fragment>
  );
})}
```

**Side effect — Input + Send button (DeadlineAiChat lines 119–137, AiCourseChat lines 113–129):** These ALSO migrate to `<Input variant="search" />` + `<Button variant="primary" iconOnly size="md" className="rounded-full" />` per Pattern 8 mapping table. Plan-1 (Button/Input creation) and plan-2 (caller migration) overlap — planner sequence: plan-1 creates primitives + sweeps callers including AiChat input/button; plan-2 migrates the bubble component on top. Or planner can fold both caller migrations into plan-2 atomically. **Recommendation: Plan-1 sweeps Button + Input only; Plan-2 only touches bubble migration.** Avoids dual-touching the same files in same wave.

---

### N. AiChatBubble caller exhaustion grep (verified 2026-04-30)

**Result:** 2 callers + the source file itself.

```
components/course-detail/AiCourseChat.tsx
components/shared/AiChatBubble.tsx           (the source — gets deleted)
components/deadlines/DeadlineAiChat.tsx
```

No predict/digest callers (verified — Phase 40 RESEARCH Q12 + this re-grep). The "3 callers" mentioned in CONTEXT line 53 was forward-looking; today's reality is 2.

**Predict / Digest deferred:** If digest's MarkdownDigest or predict's StudyRecCard add streaming AI output later, they'll consume the same StreamingAssistant component — pattern is forward-compatible.

---

### O. Sed playbook reuse (Phase 39 LEARNINGS pattern)

**Source:** Phase 39 LEARNINGS (39-LEARNINGS.md) lesson "BSD sed playbook over jscodeshift/ts-morph" + RESEARCH Pattern 8 (lines 1027–1063).

**Phase 40 reuses the exact sed pass structure** with the new shorthand — no novel command to invent. The playbook scaffold (5 sed passes covering fast/base/slow × all/colors) is in RESEARCH lines 1033–1053; planner copies verbatim into Plan-1 task.

**Phase 39 LEARNINGS guard:** Lesson "Sed migration creates timing-function token override bugs" — after sed, manually inspect Sidebar.tsx, DeadlineCard.tsx, PredictCard.tsx, NotificationsSection.tsx for stale `ease-[cubic-bezier(...)]` literals. Phase 40's 56 occurrences are subset of Phase 39's already-cleaned files, so risk is reduced but not zero — keep a 5-minute manual audit step in Plan-1.

---

## Pattern Categories (cross-file groupings)

### Group 1: cva primitive group (2 files)
**Files:** `Button.tsx`, `Input.tsx`

**Shared scaffold:**
1. `"use client"` directive at top.
2. Imports: `forwardRef`, `type {Element}HTMLAttributes` from `react`; `cva, type VariantProps` from `class-variance-authority`; `cn` from `@/lib/utils/cn`.
3. `const xxxVariants = cva([base classes], { variants: {...}, defaultVariants: {...} })`.
4. `interface XxxProps extends ElementHTMLAttributes<HTMLElement>, VariantProps<typeof xxxVariants> { /* slot props */ }`.
5. `export const Xxx = forwardRef<HTMLElement, XxxProps>(({className, ...variantProps, ...props}, ref) => ( <element ref={ref} className={cn(xxxVariants({...variantProps}), className)} {...props} /> ));`.
6. `Xxx.displayName = "Xxx";`.
7. `export { xxxVariants };` (so callers/tests can introspect variant builder).

**Source of truth:** RESEARCH Pattern 1 (Button) + Pattern 2 (Input) — copy verbatim with token-bound class strings.

---

### Group 2: chat component group (2 files, 1 hook)
**Files:** `StreamingAssistant.tsx`, `UserMessage.tsx`, `useStreamingText.ts`

**Shared scaffold:**
1. `"use client"` for components; hook omits (per use-ai-stream convention).
2. Each component has minimal props: `content: string` + (assistant only) `isStreaming?: boolean`.
3. Default-export pattern (matches existing AiChatBubble.tsx / FeedbackButton.tsx default export — repository convention).
4. Both components flat-render; no `forwardRef` (no caller scenario for ref forwarding on these).
5. Phase 39 SSE primitives consumed via inline `style={{ animation: "streaming-cursor-blink ..." }}` (cursor) + Tailwind arbitrary `animate-[streaming-chunk-fadein_var(--motion-fast)_var(--ease-claude-out)_forwards]` (text fadein) — RESEARCH Pattern 4.
6. `aria-hidden` on cursor `<span>` (decorative; screen readers skip).

---

### Group 3: Vitest unit test group (5 component tests + 1 hook test)
**Files:** `Button.test.tsx`, `Input.test.tsx`, `StreamingAssistant.test.tsx`, `UserMessage.test.tsx`, `Sidebar.test.tsx`, `useStreamingText.test.ts`

**Shared scaffold:**
1. `import { describe, it, expect, vi } from "vitest";` (vi only when mocking).
2. `import { render, screen } from "@testing-library/react";` (components) or `import { renderHook } from "@testing-library/react";` (hook).
3. Mock blocks before `import` of subject under test (Vitest hoists `vi.mock` calls).
4. `import Subject from "@/components/.../Subject";` — `@/` path alias.
5. `describe("Subject", () => { it("...", () => { ... }); });` — test names match VALIDATION.md Per-Task IDs verbatim (so `pnpm test -t "primary variant"` finds the right test for 40-01-01).

---

### Group 4: caller-migration group (2 files)
**Files:** `DeadlineAiChat.tsx`, `AiCourseChat.tsx`

**Shared mutation scaffold:**
1. `import AiChatBubble from "@/components/shared/AiChatBubble";` → DELETE.
2. ADD `import StreamingAssistant from "@/components/shared/StreamingAssistant";`.
3. ADD `import UserMessage from "@/components/shared/UserMessage";`.
4. Replace JSX block (DeadlineAiChat lines 87–104, AiCourseChat lines 78–96) with the role-conditional render per Excerpt M.

---

### Group 5: ESLint config self-extension group (2 files)
**Files:** `eslint.config.mjs`, `__tests__/eslint/no-raw-transition.test.ts`

**Shared scaffold:**
1. `eslint.config.mjs` block at line 28–57 already has `no-restricted-syntax` rule with 2 selectors (Literal + TemplateElement). EXTEND the array with 4 new selectors (verbose Literal, verbose TemplateElement, var(--ease) Literal, var(--ease) TemplateElement) per RESEARCH Pattern 7.
2. `no-raw-transition.test.ts` already has 4 fixtures (lines 81–135). EXTEND with 4 new `it(...)` fixtures per Excerpt J. Each fixture follows the existing `if (!parserAvailable) return;` guard pattern and uses the existing `lintCode()` helper.

---

### Group 6: Tailwind v4 CSS config group (1 file)
**File:** `app/globals.css`

**Shared scaffold:**
1. Insert 3 `@utility` blocks (transition-claude-fast/base/slow) at top-level immediately after the closing `}` of the `@theme` block.
2. Each block is 5 lines: `@utility name { transition-property: all; transition-duration: var(--motion-X); transition-timing-function: var(--ease-claude-out); }`.

---

### Group 7: Sidebar two-layer rewrite group (2 files: 1 component + 1 NEW test)
**Files:** `Sidebar.tsx`, `__tests__/components/layout/Sidebar.test.tsx`

**Shared scaffold:**
1. **Sidebar.tsx**: Full structural rewrite per RESEARCH Pattern 5 (lines 791–887). Outer `<aside>` becomes 68px stable layout occupier with `[contain:layout_paint]` + `border-r` + `group`. Inner `<div>` becomes 224px panel with `absolute inset-y-0 left-0 bg-dark` + `translate-x-[-156px] group-hover:translate-x-0` + `transition-claude-base will-change-transform` + `[contain:layout_paint]`.
2. **Sidebar.test.tsx**: NEW file (no existing test). Mocks: `next-intl` (useTranslations stub), `@/lib/i18n/navigation` (Link, usePathname). Five tests per VALIDATION.md 40-03-01..05. Use `container.firstChild` to assert outer `<aside>` className, `container.firstChild?.firstChild` for inner panel.

---

### Group 8: Playwright env-gated stub (1 file)
**File:** `tests/e2e/perf/phase40-sidebar-60fps.spec.ts`

**Shared scaffold:**
1. Mirror `tests/e2e/phase39-transition-parity.spec.ts` lines 53–113 — `test.describe` + `test.skip(!shouldRunPerfSuite(), "...")` + `beforeEach(installFixedClock + loginAsPerfTestUser)` + actual frame-timing test.
2. Two tests: (a) hover-expand FPS measurement via `requestAnimationFrame` instrumentation (RESEARCH Pattern 10 lines 1218–1244); (b) main content X-position stability assertion (RESEARCH lines 1246–1262).
3. `import { shouldRunPerfSuite, loginAsPerfTestUser } from "./helpers/auth";` (relative path — the helper is at `tests/e2e/perf/helpers/auth.ts` and the new spec is at `tests/e2e/perf/phase40-sidebar-60fps.spec.ts`, so import is `./helpers/auth`).

---

### Group 9: 36-file mechanical sweep group
**Files:** 36 .tsx/.ts files with verbose-form `transition-(all|colors) [transition-duration:var(--motion-X)] [transition-timing-function:var(--ease-claude-out)]` className.

**Shared mutation:** Sed pass per RESEARCH Pattern 8 lines 1033–1053. Mechanical, no per-file judgment beyond the post-sed manual audit for stale `ease-[cubic-bezier(...)]` literals (Phase 39 LEARNINGS guard).

**File list (regenerable):**
```bash
cd frontend && grep -rEln "transition-(all|colors)\s+\[transition-duration:var\(--motion-(fast|base|slow)\)\]" components/ app/ | sort
```
Verified count 2026-04-30: 36 files (matches CONTEXT D-40-03 + RESEARCH Pattern 8 expectations).

---

## Naming Conventions

Detected from analogs in this codebase.

| Element | Convention | Example | Source |
|---------|-----------|---------|--------|
| Component file | `PascalCase.tsx` | `Button.tsx`, `RoughCard.tsx`, `AiChatBubble.tsx` | repo-wide |
| Hook file | `use-kebab-case.ts` (Phase 34+) | `use-ai-stream.ts`, `use-feedback.ts` | `frontend/hooks/` |
| Hook name (export) | `useCamelCase` | `useAiStream`, `useFeedback` | repo-wide |
| Test file | `<Subject>.test.tsx` mirroring component name | `RoughCard.test.tsx`, `LoginForm.test.tsx` | repo-wide |
| Test directory | mirrors `components/` subdirs OR groups by feature | `__tests__/dashboard/`, `__tests__/auth/`, `__tests__/design-system/`, `__tests__/hooks/`, `__tests__/eslint/` | repo-wide |
| Type/Interface | `PascalCase`, `Props` suffix for component props | `ButtonProps`, `RoughCardProps`, `UseAiStreamReturn` | repo-wide |
| Component default export | `export default function Component(...)` for non-cva components | AiChatBubble, FeedbackButton, RoughCard | repo-wide |
| Cva primitive export | `export const Xxx = forwardRef<..., XxxProps>(...)` + named export of variants | (NEW for Phase 40 — RESEARCH Pattern 1) | repo introduces new convention |

**Phase 40 deviation flag:** RESEARCH Pattern 1 + 2 use `export const Button = forwardRef(...)` (NAMED export). Existing components (AiChatBubble, RoughCard, FeedbackButton) use `export default function Xxx(...)`. The cva primitive group introduces a NEW named-export convention because (a) `forwardRef` returns a component, (b) named export pairs nicely with `export { buttonVariants }`. **Planner accepts this divergence — it's the cva idiom and matches cva.style/docs.** Tests import via `import { Button } from "@/components/ui/Button"` (named).

`useStreamingText.ts` follows the existing `use-` prefix naming convention BUT the file is camelCase (`useStreamingText.ts`), NOT kebab-case (`use-streaming-text.ts`). VALIDATION.md and CONTEXT.md both spell it as `useStreamingText.ts`. RESEARCH Pattern 3 also uses `useStreamingText.ts`. **Planner: stick with camelCase per RESEARCH/VALIDATION/CONTEXT alignment** — it's a minor deviation from existing kebab-case convention but explicitly chosen across all upstream artifacts.

---

## Import / Export Conventions

| Convention | Example | Notes |
|-----------|---------|-------|
| Path alias `@/` → `frontend/` | `import { cn } from "@/lib/utils/cn";` | Vitest config (`vitest.config.ts` lines 13–17) + Next.js convention |
| Default export for plain components | `export default function AiChatBubble(...)` | repo-wide |
| Named export for cva primitives | `export const Button = forwardRef(...)` + `export { buttonVariants };` | NEW for Phase 40 — cva idiom |
| Named export for hooks | `export function useAiStream(...)` (use-ai-stream.ts line 25) | repo-wide |
| Type import via `type` keyword | `import { type ReactNode } from "react";` (AnimatedEntry.tsx line 3) or `import type { CitationSource } from "@/lib/api/ai-stream";` (Sources.tsx line 13) | repo-wide; both forms acceptable |
| `"use client"` directive | First line of file, before any imports, for any component using hooks/state/event handlers | Verified across all `frontend/components/**/*.tsx` interactive components |
| Hooks: NO `"use client"` directive | hooks are imported into client components which carry the directive | use-ai-stream.ts has no `"use client"` (line 1: import statement directly) |
| No barrel files in components | callers import from full path `@/components/ui/Button`, not `@/components/ui` | repo-wide — no `index.ts` files exist in `components/` subdirs |

---

## Threat Model References

VALIDATION.md flags 4 XSS-relevant tasks:
- 40-01-08 (Button focus-visible ring) — XSS guard via React text-node escape (default).
- 40-01-14 (Input disabled state) — XSS guard via `type="text"` default (no raw-HTML sink).
- 40-02-01 (useStreamingText initial empty state) — XSS guard: streaming text rendered via React text node, never via raw-HTML injection APIs.
- 40-02-09 (UserMessage renders text content) — XSS guard: text passed as children/prop, React escapes by default.

**Pattern across all 4:** React's default text-node rendering is the mitigation. NO raw-HTML sinks (no `innerHTML` writes, no React unsafe-HTML props, no `eval`). The new components inherit AiChatBubble.tsx's existing posture (zero XSS surface today). No new threat surface introduced by Phase 40.

---

## Cross-References

| Pattern | RESEARCH.md location | Existing file |
|---------|---------------------|---------------|
| Button cva primitive | RESEARCH §Pattern 1 lines 315–429 | new — analog `frontend/components/shared/FeedbackButton.tsx` |
| Input cva primitive | RESEARCH §Pattern 2 lines 431–522 | new — analog input snippet in `frontend/components/deadlines/DeadlineAiChat.tsx:121` |
| useStreamingText | RESEARCH §Pattern 3 lines 524–616 | new — analog `frontend/hooks/use-ai-stream.ts` |
| StreamingAssistant + UserMessage | RESEARCH §Pattern 4 lines 618–736 | new — analog `frontend/components/shared/AiChatBubble.tsx` |
| Sidebar two-layer | RESEARCH §Pattern 5 lines 738–897 | rewrite of `frontend/components/layout/Sidebar.tsx` |
| @utility blocks | RESEARCH §Pattern 6 lines 899–937 | self-extend `frontend/app/globals.css` |
| ESLint extension | RESEARCH §Pattern 7 lines 939–1009 | self-extend `frontend/eslint.config.mjs` |
| Sed playbook | RESEARCH §Pattern 8 lines 1019–1092 + Phase 39 LEARNINGS | mechanical sweep of 36 files |
| Vitest TDD RED | RESEARCH §Pattern 9 lines 1094–1190 | new tests — analog `frontend/__tests__/auth/LoginForm.test.tsx` + `RoughCard.test.tsx` |
| Playwright env-gated stub | RESEARCH §Pattern 10 lines 1192–1264 + Phase 39 SEED-39 | new — analog `frontend/tests/e2e/phase39-transition-parity.spec.ts` |

---

## Files With No Strong Analog (planner notes)

| File | Reason | Mitigation |
|------|--------|-----------|
| `frontend/components/ui/Button.tsx` (cva form) | NO existing cva component in repo; first use | RESEARCH Pattern 1 is the canonical template — copy verbatim. Planner does not need to invent. |
| `frontend/components/ui/Input.tsx` (cva form) | NO existing cva component in repo | RESEARCH Pattern 2 is canonical. |
| `frontend/__tests__/components/layout/Sidebar.test.tsx` | NO existing Sidebar test | Mock idiom from `LoginForm.test.tsx` lines 7–94 (next-intl, navigation mocks). DOM assertion idiom from `RoughCard.test.tsx` (two-layer assertions). |

All three files have RESEARCH or analog coverage; no genuine gap remains.

---

## Phase 40 Pattern Ordering for Plan-1 (sweep + ESLint)

To prevent CI breakage, **Plan-1 sweeps in this order** (per RESEARCH §"Verification once installed" lines 1011–1017):

1. **Step 1 (sed sweep):** Run Pattern 8 sed passes — verbose tokenized form → `transition-claude-fast/base/slow` shorthand across 36 files.
2. **Step 2 (manual audit):** Inspect Sidebar.tsx, DeadlineCard.tsx, PredictCard.tsx, NotificationsSection.tsx for stale `ease-[cubic-bezier(...)]` literals (Phase 39 LEARNINGS guard).
3. **Step 3 (CSS):** Add `@utility transition-claude-fast/base/slow` to `globals.css` (Pattern 6).
4. **Step 4 (lint):** Run `pnpm lint --max-warnings 0` — verify zero violations BEFORE adding new rules.
5. **Step 5 (ESLint extension):** Add 4 new selectors to `eslint.config.mjs` (Pattern 7).
6. **Step 6 (test):** Add 4 new fixtures to `no-raw-transition.test.ts` (Excerpt J).
7. **Step 7 (verify):** `pnpm lint --max-warnings 0 && pnpm test --run` — both green.

**Steps 5–7 cannot run before steps 1–4** or `pnpm lint` blocks the commit because the legacy verbose form is then forbidden but 36 files still contain it.

---

## PATTERN MAPPING COMPLETE
