/**
 * Phase 39 plan-3 — MOTION-02 SSE streaming keyframe assertions.
 *
 * File-as-text vitest unit (idiom mirrored from
 * __tests__/styles/tokens-css.test.ts and motion-tokens.test.ts).
 * Loads frontend/app/globals.css + StreamingAssistant.tsx at module
 * scope and runs cheap regex assertions against the source.
 *
 * IMPORTANT — RESEARCH §Q7 correction to CONTEXT.md D-15:
 *   D-15 originally said "1s step-end infinite alternate".
 *   RESEARCH proves `alternate` is wrong: with `alternate`, the keyframe
 *   replays in reverse on the second iteration, producing a 2s perceived
 *   period (not the desired 1s blink). The canonical terminal-cursor
 *   pattern is `1s step-end infinite` (no alternate); opacity flips at
 *   the 50% / 50.01% boundary inside the keyframe itself.
 *   Source: amitmerchant.com/simple-blinking-cursor-animation-using-css/
 *
 * This test enforces the Q7 correction — the assertion MUST FAIL if
 * `alternate` reappears in the cursor animation declaration.
 *
 * Phase 40 SHARED-02's StreamingAssistant component consumes the keyframe
 * via an inline `animation: streaming-cursor-blink ...` style (NOT via the
 * @theme --animate-streaming-cursor-blink utility class), so the source
 * of truth for the timing string moved to StreamingAssistant.tsx.
 *
 * Phase 40 code review WR-06: --animate-streaming-* @theme tokens were
 * removed (they generated utility classes no consumer used). This test
 * was updated to assert against the StreamingAssistant inline animation
 * declaration, which is the actual consumer path.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cssSource = readFileSync(
  resolve(__dirname, "../../app/globals.css"),
  "utf8",
);

const assistantSource = readFileSync(
  resolve(__dirname, "../../components/shared/StreamingAssistant.tsx"),
  "utf8",
);

describe("Phase 39 SSE keyframes (MOTION-02)", () => {
  it("declares @keyframes streaming-cursor-blink", () => {
    expect(cssSource).toMatch(/@keyframes\s+streaming-cursor-blink\s*\{/);
  });

  it("declares @keyframes streaming-chunk-fadein", () => {
    expect(cssSource).toMatch(/@keyframes\s+streaming-chunk-fadein\s*\{/);
  });

  it("StreamingAssistant cursor uses step-end timing (NOT alternate per RESEARCH Q7)", () => {
    // The cursor animation declaration must contain `step-end infinite` AND
    // must NOT contain `alternate`. `alternate` produces a 2s perceived
    // period; `infinite` alone with the 50/50.01 keyframe gives the
    // canonical 1s terminal-cursor blink.
    // Source of truth post-WR-06: StreamingAssistant inline `animation:`
    // string (the @theme --animate-* token was removed as no consumer
    // referenced the generated utility class).
    const blinkDecl = assistantSource.match(
      /animation:\s*["']?streaming-cursor-blink\s+[^"'`]+["']?/,
    );
    expect(blinkDecl).not.toBeNull();
    expect(blinkDecl?.[0]).toMatch(/step-end/);
    expect(blinkDecl?.[0]).toMatch(/infinite/);
    expect(blinkDecl?.[0]).not.toMatch(/alternate/);
  });

  it("declares semantic alias --motion-stream-cursor-period: 1s", () => {
    expect(cssSource).toMatch(/--motion-stream-cursor-period:\s*1s/);
  });

  it("chunk fadein uses --motion-fast token", () => {
    // Per RESEARCH §Code Example 7: chunk fadein duration is the same
    // 150ms feedback band as --motion-fast. The semantic alias remains in
    // globals.css even after WR-06 removed the dead --animate-* utility
    // wrapper, so future tier rebalance still has a single token to swap.
    expect(cssSource).toMatch(
      /--motion-stream-chunk-fadein:\s*var\(--motion-fast\)/,
    );
  });
});
