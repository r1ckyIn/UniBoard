/**
 * Phase 39 plan-3 — MOTION-02 SSE streaming keyframe assertions.
 *
 * File-as-text vitest unit (idiom mirrored from
 * __tests__/styles/tokens-css.test.ts and motion-tokens.test.ts).
 * Loads frontend/app/globals.css once at module scope and runs cheap
 * regex assertions against the source.
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
 * `alternate` reappears in the streaming-cursor-blink animation token.
 *
 * Phase 40 SHARED-02's <StreamingCursor> + <StreamingText> components
 * consume these keyframes. Plan-3 only adds the CSS primitives.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(__dirname, "../../app/globals.css"),
  "utf8",
);

describe("Phase 39 SSE keyframes (MOTION-02)", () => {
  it("declares @keyframes streaming-cursor-blink", () => {
    expect(source).toMatch(/@keyframes\s+streaming-cursor-blink\s*\{/);
  });

  it("declares @keyframes streaming-chunk-fadein", () => {
    expect(source).toMatch(/@keyframes\s+streaming-chunk-fadein\s*\{/);
  });

  it("uses step-end timing for cursor blink (NOT alternate per RESEARCH Q7)", () => {
    // The animation token must contain `step-end infinite` AND must NOT
    // contain `alternate`. `alternate` produces a 2s perceived period;
    // `infinite` alone with the 50/50.01 keyframe gives the canonical
    // 1s terminal-cursor blink.
    const blinkDef = source.match(
      /--animate-streaming-cursor-blink:\s*streaming-cursor-blink\s+[^;]+;/,
    );
    expect(blinkDef).not.toBeNull();
    expect(blinkDef?.[0]).toMatch(/step-end\s+infinite/);
    expect(blinkDef?.[0]).not.toMatch(/alternate/);
  });

  it("declares semantic alias --motion-stream-cursor-period: 1s", () => {
    expect(source).toMatch(/--motion-stream-cursor-period:\s*1s/);
  });

  it("chunk fadein uses --motion-fast token", () => {
    // Per RESEARCH §Code Example 7: chunk fadein duration is the same
    // 150ms feedback band as --motion-fast. Plan-3 wires the alias to
    // var(--motion-fast) so a future tier rebalance updates both at once.
    expect(source).toMatch(
      /--motion-stream-chunk-fadein:\s*var\(--motion-fast\)/,
    );
  });
});
