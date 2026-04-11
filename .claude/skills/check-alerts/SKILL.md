# Check Alerts — Automated Alert Processing Pipeline

Collect Sentry/Vercel/Gmail alerts, analyze root causes, and report findings. With `--fix` flag, also writes regression tests and creates fix PRs.

## Triggers

- "check alerts", "检查告警", "有没有新的 bug", "Sentry 有什么"
- Scheduled: `/schedule create --cron "0 */4 * * *" --prompt "/check-alerts"`

## Modes

| Invocation | Behavior |
|------------|----------|
| `/check-alerts` | Default: Collect + Analyze + Report (no code changes) |
| `/check-alerts --fix` | Full pipeline: includes Test + Fix + PR |
| `/check-alerts --dry-run` | Collect only, no analysis |

## Project Context (pass verbatim to every agent)

- **Sentry org:** `yuan-qin` (EU region — API host is `yuan-qin.sentry.io`, NOT `sentry.io`)
- **Sentry projects:** `uniboard-api` (Python/FastAPI), `uniboard-web` (Next.js)
- **Sentry auth:** env var `SENTRY_AUTH_TOKEN` loaded from `.env` at `/Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard/.env`
- **GitHub repo:** `r1ckyIn/UniBoard`
- **Vercel teamId:** `team_IDR2wIZhqOMQgtmoPE6RMXtS`
- **Vercel projectId:** `prj_z55Z01ASULUWu1oGjW8ezuzrrjwQ`
- **Vercel projectName:** `uni-board`
- **Backend path:** `src/` (Python)
- **Frontend path:** `frontend/` (Next.js)
- **Safety gates:** always read `rules/safety-gates.md` before triage/fix decisions

> teamId/projectId come from `.vercel/project.json`. If they change, update this file — they are pinned intentionally so agents do not spend tool calls re-discovering.

---

## STRICT MCP INVOCATION PROTOCOL (do not deviate)

This protocol is the canonical invocation reference. **Every agent in this pipeline — and Claude itself — MUST follow it exactly.** The underlying lesson: *none of these tools can be called directly without first loading their JSONSchema via `ToolSearch`.* Skipping the ToolSearch step causes `InputValidationError` and wastes a round-trip.

### Sentry (NO MCP — curl fallback is the ONLY path)

| Rule | Reason |
|------|--------|
| Do NOT search for `mcp__sentry__*` every run | Confirmed unavailable as of 2026-04-11. If Sentry MCP ever ships, update this file. |
| Use curl against `yuan-qin.sentry.io` (NOT `sentry.io`) | `yuan-qin` is the EU region subdomain and the only host that serves our org |
| Load token via `set -a; source .env; set +a` | Inline `$(grep...)` breaks on special characters; `export`-style parsing in zsh escapes some token chars |
| Never paste the raw token into a command | Reference `$SENTRY_AUTH_TOKEN` only |

**Canonical curl commands** (use exactly these — do not improvise):

```bash
# Load token
set -a; source /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard/.env; set +a

# Unresolved issues last 24h for uniboard-api
curl -s -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://yuan-qin.sentry.io/api/0/projects/yuan-qin/uniboard-api/issues/?query=is:unresolved&statsPeriod=24h" \
  | python3 -c "import sys,json; data=json.load(sys.stdin); print(json.dumps([{k: i.get(k) for k in ['id','shortId','title','level','count','firstSeen','lastSeen','metadata']} for i in data], indent=2))"

# Same for uniboard-web (swap project slug)
curl -s -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://yuan-qin.sentry.io/api/0/projects/yuan-qin/uniboard-web/issues/?query=is:unresolved&statsPeriod=24h" \
  | python3 -c "import sys,json; data=json.load(sys.stdin); print(json.dumps([{k: i.get(k) for k in ['id','shortId','title','level','count','firstSeen','lastSeen','metadata']} for i in data], indent=2))"

# Latest event (for stack trace) — use the numeric id, not the shortId
curl -s -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://yuan-qin.sentry.io/api/0/issues/{id}/events/latest/"

# List all issues for a project (any status)
curl -s -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  "https://yuan-qin.sentry.io/api/0/projects/yuan-qin/uniboard-api/issues/?statsPeriod=7d"
```

**If a curl call returns non-200**: print the HTTP status and body. Do not silently continue. Common failures:
- `401` → token expired or wrong region (check that host is `yuan-qin.sentry.io` not `sentry.io`)
- `404` → project slug typo (`uniboard-api` / `uniboard-web`, not `uni-board-*`)
- `429` → rate limited; wait 60s

### Gmail (MCP available — read-only)

| Rule | Reason |
|------|--------|
| Tools are **deferred** — must load schemas via `ToolSearch(query="select:...")` first | Calling before load returns `InputValidationError` |
| Tools registered as `mcp__claude_ai_Gmail__gmail_*` | Other Gmail MCP namespaces (e.g. `mcp__gmail__*`) do NOT exist in this project |
| **Read-only** capabilities only: profile, labels, search, read message, read thread, list drafts, create draft | There is no `gmail_send_message` or `gmail_modify_thread`; do not promise to "mark as read" |
| Query syntax uses Gmail operators (`from:`, `is:unread`, `newer_than:`) | Standard Gmail search, not SQL |

**Canonical schema load** (always run first, idempotent):

```
ToolSearch(query="select:mcp__claude_ai_Gmail__gmail_search_messages,mcp__claude_ai_Gmail__gmail_read_message,mcp__claude_ai_Gmail__gmail_get_profile,mcp__claude_ai_Gmail__gmail_list_labels", max_results=4)
```

**Canonical calls**:

```
# Search unread alert emails from Sentry or Vercel in the last 24h
mcp__claude_ai_Gmail__gmail_search_messages(
  q="from:(sentry.io OR vercel.com) is:unread newer_than:1d",
  maxResults=20
)

# Read a specific message by ID (obtained from search)
mcp__claude_ai_Gmail__gmail_read_message(messageId="<id from search result>")

# Profile sanity check (should return emailAddress = rickyqin919@gmail.com)
mcp__claude_ai_Gmail__gmail_get_profile()
```

**Full tool registry** (in this project):
- `mcp__claude_ai_Gmail__gmail_get_profile`
- `mcp__claude_ai_Gmail__gmail_list_labels`
- `mcp__claude_ai_Gmail__gmail_search_messages`
- `mcp__claude_ai_Gmail__gmail_read_message`
- `mcp__claude_ai_Gmail__gmail_read_thread`
- `mcp__claude_ai_Gmail__gmail_list_drafts`
- `mcp__claude_ai_Gmail__gmail_create_draft`

### Vercel (MCP available — primary path, NOT `gh api deployments`)

| Rule | Reason |
|------|--------|
| **Prefer Vercel MCP over `gh api repos/.../deployments`** | `gh api` only surfaces GitHub-side deployment records; it cannot access runtime logs, build logs, or real Vercel state (READY / ERROR / BUILDING) |
| Every Vercel MCP call requires BOTH `teamId` and `projectId` | They are not optional; missing either returns a validation error |
| `since` / `until` for `get_runtime_logs` use relative strings like `"24h"`, `"1h"`, `"7d"` | Not Unix epochs, not ISO strings |
| `level` is an array: `["error","fatal"]` | Single string fails schema |
| Do NOT call `deploy_to_vercel` from this skill | Deployment is triggered by git push + CI, never by an alert pipeline |

**Canonical schema load**:

```
ToolSearch(query="select:mcp__plugin_vercel-plugin_vercel__list_deployments,mcp__plugin_vercel-plugin_vercel__get_deployment,mcp__plugin_vercel-plugin_vercel__get_deployment_build_logs,mcp__plugin_vercel-plugin_vercel__get_runtime_logs", max_results=4)
```

**Canonical calls**:

```
# Last N deployments (latest first)
mcp__plugin_vercel-plugin_vercel__list_deployments(
  teamId="team_IDR2wIZhqOMQgtmoPE6RMXtS",
  projectId="prj_z55Z01ASULUWu1oGjW8ezuzrrjwQ"
)

# Production runtime errors in the last 24h
mcp__plugin_vercel-plugin_vercel__get_runtime_logs(
  teamId="team_IDR2wIZhqOMQgtmoPE6RMXtS",
  projectId="prj_z55Z01ASULUWu1oGjW8ezuzrrjwQ",
  environment="production",
  level=["error","fatal"],
  since="24h",
  limit=50
)

# Build logs for a failed deployment (uid or URL)
mcp__plugin_vercel-plugin_vercel__get_deployment_build_logs(
  teamId="team_IDR2wIZhqOMQgtmoPE6RMXtS",
  idOrUrl="<deployment uid from list_deployments>",
  limit=200
)

# Specific deployment details
mcp__plugin_vercel-plugin_vercel__get_deployment(
  teamId="team_IDR2wIZhqOMQgtmoPE6RMXtS",
  idOrUrl="<uid or url>"
)
```

**When GitHub Deployments API (`gh api repos/.../deployments`) IS the right tool**: only as a SANITY CROSS-CHECK when Vercel MCP is down. Otherwise trust Vercel MCP — it's the source of truth for deployment state.

---

## Step 0: Pre-flight MCP Probe (Main Process — Do Not Spawn an Agent)

Before spawning any agents, run exactly these three `ToolSearch` queries in parallel:

```
ToolSearch(query="+sentry", max_results=10)
ToolSearch(query="+vercel deployment logs runtime", max_results=10)
ToolSearch(query="select:mcp__claude_ai_Gmail__gmail_search_messages,mcp__claude_ai_Gmail__gmail_read_message", max_results=2)
```

**Expected result (current ground truth, 2026-04-11):**
- `+sentry` → **No matching deferred tools found** — Sentry MCP is NOT available. MUST use curl.
- `+vercel deployment logs runtime` → returns `mcp__plugin_vercel-plugin_vercel__get_runtime_logs`, `get_deployment_build_logs`, `get_deployment`, `list_deployments`, etc.
- `gmail_search_messages` + `gmail_read_message` → schemas load successfully.

Compose this MCP_STATUS block and pass it to the collector agent verbatim:

```
MCP_STATUS:
- sentry_mcp: unavailable (use curl fallback; commands documented in SKILL.md MCP section)
- gmail_mcp: available (tools: gmail_search_messages, gmail_read_message, gmail_get_profile, gmail_list_labels, gmail_read_thread, gmail_list_drafts, gmail_create_draft)
- vercel_mcp: available (tools: list_deployments, get_deployment, get_deployment_build_logs, get_runtime_logs, list_projects, get_project, list_teams)
- note: Gmail is read-only — no send / modify capability in this project
```

If any of the three queries returns an unexpected result (e.g. Sentry MCP appears, or Vercel MCP disappears), STOP and report to the user. Do not silently adapt.

---

## Execution — Follow These Steps Exactly

The pipeline runs as numbered steps. Each "Spawn Agent" step **MUST** call the `Agent` tool — do not inline the work. Skills with agent patterns must be followed exactly.

### Step 1: Spawn the Collector Agent

Call `Agent` with:

- **name:** `alert-collector`
- **description:** `Collect Sentry and Vercel alerts`
- **subagent_type:** `general-purpose`
- **prompt:** (compose from the template below, filling in Project Context + MCP_STATUS from Step 0)

```
You are collecting alerts for the UniBoard project. Read-only — do not modify any files.

## MCP Availability (verified by parent)
{paste MCP_STATUS from Step 0}

## Project Context
- Sentry org: yuan-qin (EU, host `yuan-qin.sentry.io`)
- Sentry projects: uniboard-api, uniboard-web
- Sentry auth: SENTRY_AUTH_TOKEN inside /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard/.env
- GitHub: r1ckyIn/UniBoard
- Vercel teamId: team_IDR2wIZhqOMQgtmoPE6RMXtS
- Vercel projectId: prj_z55Z01ASULUWu1oGjW8ezuzrrjwQ

## Sentry (curl fallback)

Follow the canonical curl commands in the SKILL.md "Sentry" subsection of the STRICT MCP INVOCATION PROTOCOL. Load the token via `set -a; source .env; set +a`. Run both projects. For any issue with events > 0, fetch `events/latest/` to get the top 2-3 stack frames.

If curl returns non-200, print status + body; do not silently continue.

## Gmail (MCP)

1. Load schemas: `ToolSearch(query="select:mcp__claude_ai_Gmail__gmail_search_messages,mcp__claude_ai_Gmail__gmail_read_message", max_results=2)`
2. `gmail_search_messages(q="from:(sentry.io OR vercel.com) is:unread newer_than:1d", maxResults=20)`
3. For each hit: `gmail_read_message(messageId=...)` → extract subject + snippet
4. Do NOT mark as read (no such capability in this MCP)

## Vercel (MCP — preferred over gh api deployments)

1. Load schemas: `ToolSearch(query="select:mcp__plugin_vercel-plugin_vercel__list_deployments,mcp__plugin_vercel-plugin_vercel__get_runtime_logs,mcp__plugin_vercel-plugin_vercel__get_deployment_build_logs", max_results=3)`
2. `list_deployments(teamId="team_IDR2wIZhqOMQgtmoPE6RMXtS", projectId="prj_z55Z01ASULUWu1oGjW8ezuzrrjwQ")` — last N
3. `get_runtime_logs(teamId="...", projectId="...", environment="production", level=["error","fatal"], since="24h", limit=50)`
4. For any deployment with state ERROR: `get_deployment_build_logs(teamId, idOrUrl=<uid>, limit=200)`

## Output

Print ONLY this block (the main process parses it):

ALERT_REPORT_START

SENTRY:
- issue_id: {shortId}
  sentry_id: {id}
  project: uniboard-api|uniboard-web
  title: {title}
  level: {level}
  events: {count}
  first_seen: {ISO}
  last_seen: {ISO}
  stack_summary: {top 2-3 frames: filename:lineno function}
[repeat; if none: "  (no unresolved issues in 24h)"]

DEPLOYMENTS:
- uid: {vercel deployment uid}
  env: {production|preview}
  state: {ready|error|building}
  sha: {meta.githubCommitSha first 7}
  created_at: {ISO}
[repeat for last 5]

RUNTIME_ERRORS (Vercel production, last 24h):
- ts: {timestamp}
  level: {error|fatal}
  message: {first 120 chars}
[top 10; if none: "  (no errors)"]

GMAIL:
- from: {sender}
  subject: {subject}
  snippet: {first 150 chars}
[if empty: "  (Gmail MCP OK but no matching unread alerts)"]

ALERT_REPORT_END

Keep the report under 400 lines total. End with: `Collected: N sentry, M deploys, K gmail`.
```

Wait for collector to complete before proceeding.

### Step 2: Triage (Main Process — Do Not Spawn)

Classify each Sentry issue using `rules/safety-gates.md`:

| Priority | Criteria | Action |
|----------|----------|--------|
| **P1** | >10 events/5min OR affects auth/sync OR level=fatal OR deploy failed | Notify only; do not auto-fix |
| **P2** | New (<24h) OR regression OR core page OR events>5 (not P1) | → Analyst |
| **P3** | Known transient + events≤5 + single-file fix | → Analyst |
| **Noise** | ResizeObserver / ChunkLoadError / bot traffic | Skip, note in report |

**Clustering rule (added 2026-04-11)**: if multiple Sentry issues share the same stack trace root (e.g. all pointing to `_record_sync_history`), treat them as a SINGLE cluster with merged event count for triage. Pass the cluster — not individual issues — to the analyst.

**Phase 31.1 nuance**: Supavisor prepared-statement cache issues (`InvalidSQLStatementNameError`, `DuplicatePreparedStatementError`) are already addressed by `pool_pre_ping=False` + `prepared_statement_cache_size=0` applied to both `src/database.py` and `src/sync/_shared.py`. If `last_seen` for such issues is earlier than the most recent production deploy that included this change, mark as "observing, resolved by prior deploy" and do NOT re-analyze.

If ALL remaining issues are P1 or Noise → skip to Step 7.
If `--dry-run` → skip to Step 7.

### Step 3: Spawn the Analyst Agent

Call `Agent`:

- **name:** `alert-analyst`
- **description:** `Analyze root causes`
- **subagent_type:** `general-purpose`
- **prompt:** (include triage P2/P3 clusters + template)

```
You are analyzing the root causes of these alerts for UniBoard. Read-only.

## Clusters to Analyze
{paste P2/P3 clusters from triage, including stack_summary AND event counts}

## For Each Cluster

1. Read the source file at the top of the stack trace
2. ALSO check the ORM model file if the stack involves SQLAlchemy/asyncpg — mismatches between ORM column types and DB schema are a common root cause (see 2026-04-11 sync_history incident)
3. Verify DB schema by reading the migration in `supabase/migrations/` — do NOT trust the ORM declaration alone
4. Check ALL callers of the function in the stack — Grep for usages
5. Check git log for recent changes: `git log --oneline -10 <file>` — correlate with Sentry first_seen
6. Identify the root cause and propose a MINIMAL fix (prefer 1-file fixes; explicitly list all files touched)

## Output

ROOT_CAUSE_START
- issue_cluster_id: {meaningful-slug}
  root_cause_file: {abs path}
  root_cause_line: {line}
  root_cause_summary: {paragraph with specific line citations}
  column_type_or_interface: {DB/schema side}
  caller_inconsistency: {none | list}
  recent_git_changes: {relevant commits with hashes}
  fix_plan:
    - file: {path}
      line: {line}
      change: {before → after}
    [list all changes]
  blast_radius: {N} files
  files_affected: [{list}]
  confidence: high|medium|low
  issues_resolved_by_this_fix: [{IDs}]
ROOT_CAUSE_END
```

### Step 4: Spawn the Verifier Agent

Call `Agent`:

- **name:** `alert-verifier`
- **description:** `Verify root cause and blast radius`
- **subagent_type:** `general-purpose`
- **prompt:** (include analyst output + template)

```
Verify the claim. Read-only.

## Claim to Verify
{paste ROOT_CAUSE block}

## Verification Tasks

1. File exists + claimed lines match exactly (paste them in output)
2. DB schema confirms the analyst's type claim (read the migration SQL)
3. All callers really behave as claimed (grep + read)
4. **Blast radius check**: grep for imports of the affected symbol across src/ AND tests/ — test fixtures that "work around" the bug count toward blast radius. If tests use `.replace(tzinfo=None)` or similar masking patterns on the affected type, those lines MUST be included in the fix bundle.
5. Precedent in git history: `git log --all --oneline --grep=<keyword>` for similar fixes
6. If the cluster is db/sync related, also verify whether `prepared_statement_cache_size=0` / `pool_pre_ping` is applied to BOTH engines (`src/database.py` HTTP + `src/sync/_shared.py` sync)

## Output

VERIFICATION_START
- issue_cluster_id: {slug}
  file_exists: true|false
  line_matches: true|false (paste actual content for each claimed line)
  db_column_type: {actual type from migration SQL} (cite file:line)
  all_callers_aware: true|false (list any violators)
  blast_radius: {N} files (list them — INCLUDING any test files with masking workarounds)
  test_files_affected: [{list}]
  safe_to_auto_fix: true|false  (must be true AND blast_radius ≤ 3 to proceed to tester/fixer)
  precedent_in_history: {hashes or none}
  notes: {anything the fixer must know}
  analyst_correct: true|partially|false
VERIFICATION_END
```

### Step 5: Spawn the Tester Agent (Only in `--fix` Mode)

Skip if not `--fix`.

Call `Agent`:

- **name:** `alert-tester`
- **description:** `Write regression test`
- **subagent_type:** `general-purpose`
- **mode:** `acceptEdits`
- **prompt:** (include verified issues + template)

```
Write a new regression test. You MAY touch test files only, NOT src/.

## Context
{paste verification output for clusters with safe_to_auto_fix=true}

## Rules
- Python tests: `tests/unit/` (fast, no DB) or `tests/integration/` (real Postgres via pytest fixtures)
- Frontend: next to source, vitest
- Naming: `test_<cluster_slug>_regression`
- Must fail against current buggy code (TDD red phase)
- Use EXISTING fixtures — read `tests/conftest.py` to find the real fixture names (do NOT invent `db_session` or `async_session` without checking)
- DO NOT modify the `src/` files
- DO NOT modify any existing test file — just report which lines will need fixing by the fixer

## Run the test to confirm it fails
- Python: `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && uv run python -m pytest <test_file> -x -q 2>&1 | tail -40`
- Frontend: `cd frontend && npx vitest run <test_file> 2>&1 | tail -40`

## Environment caveat
If local Postgres lacks pgvector extension, integration tests will fail at fixture setup with `CREATE EXTENSION IF NOT EXISTS vector` error. This is NOT a test bug — it's a local-env gap. Document as `red_phase_result: failed-no-db` and note the new test will validate in CI.

## Lint/type-check the new test file
- `uv run python -m ruff check <test_file>`
- `uv run python -m mypy <test_file> --strict 2>&1 | tail -20`

Fix any warnings on the new test before returning.

## Output

TESTER_REPORT_START
new_test_file: {path}
new_test_name: {name}
fixture_used: {real fixture name + file:line}
red_phase_result: {failed-as-expected | failed-no-db | unexpected-pass}
red_phase_output: | {tail of pytest output}
ruff_clean: true|false
mypy_clean: true|false
existing_test_lines_to_fix:
  - file: {path}
    line: {N}
    current: {exact content}
    should_become: {exact content}
TESTER_REPORT_END
```

### Step 6: Spawn the Fixer Agent (Only in `--fix` Mode)

Skip if not `--fix`.

Call `Agent`:

- **name:** `alert-fixer`
- **description:** `Apply fix and open PR`
- **subagent_type:** `general-purpose`
- **mode:** `acceptEdits`
- **prompt:** (include full verification output + tester output + template)

```
Apply the verified fix and open a PR.

## Safety Gates (from rules/safety-gates.md)
- NEVER commit on main — branch name: `fix/sentry-<cluster-slug>`
- If final diff touches > 3 files, STOP and report back (do NOT proceed)
- Tag pre-fix state on main BEFORE branching: `git tag pre-fix-<cluster-slug>`
- Do NOT modify migrations / auth / security code
- Commit msg: conventional commits, NO `Co-Authored-By` / Claude Code footer (commit-msg hook rejects it)

## BEFORE branching — preflight alignment (added 2026-04-11)

Run these and STOP if any surprise:
```
git rev-list --left-right --count origin/main...main
git log --oneline origin/main..main
git status --porcelain | grep -vE "^\?\?"
```

- If `origin/main..main` shows any local commits, the fix branch will inherit them and the resulting PR scope will be WRONG. Either `git push origin main:main` first (fast-forward), or rebase onto origin/main — but confirm with the orchestrator before acting.
- If tracked files have uncommitted modifications outside the fix scope, stash them (`git stash -u`) before branching and pop afterwards, or commit them to a separate branch first.

## Procedure

1. `git status` — confirm no dirty tracked files in the fix scope
2. `git tag pre-fix-<slug>` on main
3. `git checkout -b fix/sentry-<slug> main` (if uncommitted changes are outside scope, `git stash -u` first then pop after branch)
4. Apply Change 1 (source fix) using Edit — Read the file first to verify lines
5. Apply Change 2 (test file co-updates from tester's existing_test_lines_to_fix)
6. Do NOT touch the new regression test file (tester already created it)
7. Verification loop:
   - `uv run python -m ruff check <changed_files>`
   - `uv run python -m mypy <source_files> --strict 2>&1 | tail -20`
   - `uv run python -m pytest tests/unit/ -x -q 2>&1 | tail -30`
   - Integration tests skipped locally if pgvector absent — CI will run them
8. Commit via HEREDOC format, no Claude signature
9. `git push -u origin fix/sentry-<slug>`
10. `gh pr create --title "fix(<scope>): <desc>" --body "$(cat <<'EOF' ... EOF)"` — describe summary, root cause, files, verification
11. Print the PR URL

## Output

FIXER_REPORT_START
branch: fix/sentry-<slug>
tag_created: pre-fix-<slug>
files_modified: [{list}]
ruff_result: clean|failed
mypy_result: clean|failed
unit_pytest_result: passed|failed
commit_sha: {short}
pr_url: {url}
FIXER_REPORT_END

If ANY step fails, STOP, `git checkout main && git branch -D fix/sentry-<slug>`, and report the exact error.
```

### Step 7: Report (Main Process)

Print:

```
## Alert Processing Report [{date}]

### Root Cause Clusters
| Cluster | Priority | Issues (count) | Root Cause | Fix PR |
|---------|----------|----------------|------------|--------|
| {...} |

### Deployments
| Env | State | SHA | When |
|-----|-------|-----|------|

### Runtime Errors (Vercel production)
{list or "none"}

### Gmail Alerts
{list or "none"}

### Actions
- N clusters analyzed
- M fixes auto-applied (PR URLs)
- K issues escalated (P1 / blast_radius > 3)
- J noise events filtered

### Orthogonal findings (flagged for next pass)
- {anything discovered that isn't this task's fix target}
```

---

## POST-PUSH DISCIPLINE

After any `git push` that opens/updates a PR, **always** verify CI before declaring the pipeline complete:

```bash
# Snapshot status
gh pr view <number> --repo r1ckyIn/UniBoard --json number,state,mergeable,statusCheckRollup

# Or watch
gh pr checks <number> --repo r1ckyIn/UniBoard --watch --interval 15
```

Rules:
1. Do NOT tell the user "PR opened" and stop. Wait for CI to be at least IN_PROGRESS with a snapshot, and report back when it transitions to SUCCESS / FAILURE.
2. If Backend CI fails, do NOT say "probably environment issue" — investigate and fix via the same pipeline (new branch or amend).
3. Vercel preview status `PENDING` is normal for a few minutes; `ERROR` is a blocker.

---

## Lessons Learned (append-only — do not remove)

- **2026-04-11**: The first run of this skill discovered that the ORM-vs-DB TIMESTAMPTZ mismatch in `sync_history` was hiding behind `.replace(tzinfo=None)` in two integration tests. The analyst claimed `blast_radius=1 file`; verifier caught `blast_radius=2 files / 5 edits`. **Takeaway**: the verifier MUST grep test fixtures for any masking patterns (`replace(tzinfo=None)`, `strip()`, `float(` on string IDs, etc.) when the bug is a type mismatch.
- **2026-04-11**: The `/check-alerts` pipeline was originally using `gh api repos/.../deployments` which only surfaces GitHub's deployment records, not Vercel state. **Takeaway**: Vercel MCP is the source of truth for deployment state, runtime logs, and build logs; `gh api` is only a sanity cross-check.
- **2026-04-11**: Skills with agent-spawn patterns were initially run as inline work instead of spawning agents. The agent spawn pattern MUST be followed exactly; the isolation is load-bearing for context management.
- **2026-04-11**: Sentry API host is `yuan-qin.sentry.io` (EU region), NOT `sentry.io`. Hitting the wrong host returns 401 with misleading error messages.
- **2026-04-11**: Gmail MCP is read-only in this project — no `send_message` or `modify_thread` tools registered. Do not promise to "mark as read" in prompt templates.
- **2026-04-11**: The fixer agent once created a branch from LOCAL main while local main was 1 commit ahead of remote main — the fix PR inherited the extra commit and its diff was polluted. **Takeaway**: every fix branch creation MUST run `git rev-list --left-right --count origin/main...main` first; if local main is ahead, push-or-rebase before branching.
