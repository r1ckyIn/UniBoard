# Railway Cold-Start Characterisation — Phase 38 PERF-03

> **STATUS: MEASUREMENT PENDING — HUMAN ACTION REQUIRED**
>
> This document is the stub created by Plan 38-03. Tasks 1-3 shipped the
> infrastructure (measurement script + GH Actions workflows). Task 4 (this
> document's body) intentionally blocks on a human-in-the-loop measurement
> because (a) the measurement takes ~150 min wall-clock and (b) the warmup
> activation decision requires human judgement on cost/benefit.
>
> **Phase 38 cannot be fully verified until the TBD placeholders below are
> replaced with real measured values + a warmup decision.**

---

## Measurement Spec

| Field      | Value                                                                |
| ---------- | -------------------------------------------------------------------- |
| Tooling    | `frontend/tests/e2e/perf/measure-coldstart.ts` + `.github/workflows/railway-coldstart-measure.yml` |
| Endpoint   | `${NEXT_PUBLIC_API_URL}/healthz`                                     |
| N          | 10 samples                                                           |
| Idle gap   | 15 minutes between samples (forces Railway container cold-start)     |
| Timeout    | 30 s per sample                                                      |
| Percentile | p50 = 5th sample (sorted); p95 = 10th sample (sorted) for N=10       |
| Threshold  | p95 > 2000 ms → enable `railway-warmup.yml` schedule (per D-A5)      |

## How to Run the Measurement

### Option A — GitHub Actions (recommended, hands-off)

1. Ensure the repo secret `NEXT_PUBLIC_API_URL` is set (Settings → Secrets
   and variables → Actions → New repository secret). Value = the Railway
   production URL, e.g. `https://uniboard-production.up.railway.app`.
2. Navigate to **GitHub → Actions → "Railway Cold-Start Measurement" → Run
   workflow**. Accept the default inputs (N=10, IDLE=15).
3. Wait ~150 min. The workflow emits an `::notice::` line with `p50=<n>ms
   p95=<n>ms` and uploads `samples.txt` as a build artifact.
4. Download `samples.txt` from the workflow run page → Artifacts section.

### Option B — Local (slower, tethered)

```bash
# Requires Node 22+ (--experimental-strip-types is stable in 22.6+)
export NEXT_PUBLIC_API_URL="https://uniboard-production.up.railway.app"
cd frontend
for i in 1 2 3 4 5 6 7 8 9 10; do
  echo "--- Sample $i of 10 ---"
  node --experimental-strip-types tests/e2e/perf/measure-coldstart.ts
  if [ "$i" -lt 10 ]; then sleep 900; fi
done
```

Collect each printed `SAMPLE_MS=<n>` line by hand; sort ascending to obtain
p50 (index 5) and p95 (index 10).

---

## Raw Samples (ms, sorted ascending)

> **TBD — Fill after running the measurement. Replace the 10 placeholder
> rows with real values. Example format:**

| # | Value (ms) |
| - | ---------- |
| 1 | TBD        |
| 2 | TBD        |
| 3 | TBD        |
| 4 | TBD        |
| 5 | TBD        |
| 6 | TBD        |
| 7 | TBD        |
| 8 | TBD        |
| 9 | TBD        |
| 10 | TBD       |

## Percentiles

- p50: **TBD ms** (5th sorted sample)
- p95: **TBD ms** (10th sorted sample)

## Decision (per D-A5 threshold: p95 > 2000 ms → enable warmup)

> **TBD — Select exactly ONE checkbox after measurement, delete the other.**

- [ ] **p95 ≤ 2000 ms** → Warmup NOT enabled. `.github/workflows/railway-warmup.yml`
      remains in `workflow_dispatch`-only state. No further action required
      for PERF-03. Re-measure in 6 months or after a Railway plan change.

- [ ] **p95 > 2000 ms** → Warmup ENABLED. Activation steps performed:
  1. Edited `.github/workflows/railway-warmup.yml`: removed the leading
     `# ` from the `# schedule:` and `#   - cron: "*/10 * * * *"` lines.
  2. Committed as `chore(38-03): enable railway warmup cron (p95=<value>ms)`.
  3. Verified next scheduled run appears in GH Actions UI within ~15 min
     of landing on the default branch.

## Follow-up (if warmup is enabled)

- **48 h re-measure:** run the same workflow; expect p95 to drop below 2000 ms.
  Record the new numbers in a second "Re-measurement" section below.
- **GH Actions usage audit:** warmup runs ~144 times/day × ~5 s each ≈ 12 min/day,
  well under the free-tier 2000 min/month budget. Monitor via Settings →
  Billing & plans → Actions usage.
- **Escalation path:** if warmup is active AND p95 remains > 2000 ms after 48 h
  (unlikely — would indicate warmup is not actually keeping Railway warm),
  reopen D-A5 and consider Railway paid always-on as a carve-out exception.

---

## Phase 38 Gate

Until the TBD placeholders are replaced with real measurements and a decision
is recorded, Plan 38-03 is considered "infrastructure complete, measurement
pending". The phase may proceed with Plans 38-01, 38-02, and 38-04 in
parallel; cold-start warmup activation is independent of the prefetch work.

**When you finish the measurement**, commit the updated `coldstart-report.md`
AND (if applicable) the schedule-uncomment edit in a single atomic commit, then
notify `/gsd-verify-work 38` to close PERF-03.
