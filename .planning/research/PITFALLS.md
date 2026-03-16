# Domain Pitfalls

**Domain:** University Academic Dashboard with LMS Integration
**Researched:** 2026-03-16

## Critical Pitfalls

Mistakes that cause rewrites, data corruption, or make the product unusable.

### Pitfall 1: Canvas API Rate Limiting Ignored

**What goes wrong:** Sync jobs blast Canvas API without respecting rate limits. Canvas returns 403 with `X-Rate-Limit-Remaining: 0`. All subsequent requests fail for 10 seconds. If the sync job retries immediately, the ban extends. Users see stale/empty data.

**Why it happens:** Canvas allows 700 requests per 10 seconds per token -- sounds generous until you consider that a full sync (courses + grades + modules + items + assignments + tabs) for 5 courses can easily exceed 100 requests. Add N+1 query patterns and you hit limits fast.

**Consequences:** Data sync stops working. Users see stale grades. If the adapter doesn't handle 403 gracefully, exceptions crash the sync engine.

**Prevention:**
- Implement rate limiter in CanvasAdapter with sliding window (track remaining quota from `X-Rate-Limit-Remaining` response header)
- Use `include[]=items` on modules endpoint to avoid N+1 (one request gets module + all items vs. 1 + N requests)
- Stagger sync jobs: don't sync all courses simultaneously, process sequentially with small delays
- Circuit breaker: after 5 consecutive failures, stop hitting Canvas for 60 seconds

**Detection:** Monitor sync job completion rate. If > 10% of sync cycles fail, investigate rate limiting.

### Pitfall 2: Ed API Undocumented Breaking Changes

**What goes wrong:** Ed (edstem.org) has no public API documentation. Endpoints are reverse-engineered from the hschafer/edstem open source library and curl testing. A silent backend update changes field names, response shapes, or authentication behavior. The adapter breaks with no warning.

**Why it happens:** Ed's API is not a public commitment. It's an internal API that happens to be accessible. No versioning, no changelog, no deprecation notices.

**Consequences:** Ed Discussion and Ed Lessons sync silently fails. High-value posts, lesson materials, and Ed-sourced deadlines disappear from the dashboard.

**Prevention:**
- Defensive parsing: never assume field existence. Use Pydantic models with strict validation that fail loudly on unexpected shapes.
- The TRD already documents known field name differences from hschafer/edstem (e.g., `content` not `passage`, `number` not `lesson_number`). Codify these as explicit mapping constants.
- Integration tests that hit real Ed API (with a test course) on a schedule -- not just mock-based unit tests.
- Graceful degradation: if Ed adapter fails, the system still works with Canvas-only data. UI shows "Ed data unavailable" rather than crashing.

**Detection:** Ed sync failure alerts. Response schema validation at adapter boundary.

### Pitfall 3: Unit Outline HTML Structure Changes

**What goes wrong:** The USYD Unit Outline HTML is parsed with BeautifulSoup4 using specific CSS selectors (`#assessment-table`, `.assessment-weight`, etc.). The university redesigns the Unit Outline page template. All selectors break. Assessment weight parsing returns empty results.

**Why it happens:** HTML scraping is inherently fragile. USYD controls the template and can change it without notice. The TRD verified cross-faculty consistency (5 courses, 3 faculties), but this is a point-in-time observation.

**Consequences:** Assessment weights become unavailable. GPA calculations fall back to Canvas assignment_groups (less accurate). What-if predictions use wrong weights.

**Prevention:**
- **Always store raw_html** in UnitOutline table (the TRD already specifies this). If parsing fails, raw HTML enables manual inspection and quick parser updates.
- **Fallback chain**: Unit Outline parse failure -> Canvas assignment_groups -> user-entered weights (manual override).
- **Parser validation**: after parsing, verify that weights sum to approximately 1.0 (100%). If not, flag as parse error.
- **Lazy re-parsing**: store parsed results in JSON. If parser is updated, re-parse from stored raw_html rather than re-fetching.

**Detection:** Weight sum validation (should be 95-105% accounting for rounding). Alert on parsing failures.

### Pitfall 4: Token Encryption Key Management Failure

**What goes wrong:** The AES-256-GCM encryption key used to encrypt Canvas/Ed API tokens in the database is lost, corrupted, or never properly initialized. All stored tokens become undecryptable. Users must re-enter all their API tokens.

**Why it happens:** For MVP (local Docker), the encryption key must be stored somewhere accessible. Common mistakes: hardcoded in source code (security risk), stored in an env file that gets deleted, or regenerated on each restart.

**Consequences:** Complete data loss of API tokens. All users must re-onboard.

**Prevention:**
- Store encryption key in environment variable (`.env` file for local dev, excluded from git)
- Document key backup procedure in developer setup guide
- Never hardcode the key in source code
- For production: AWS Secrets Manager (as specified in TRD)
- On startup, verify the key can decrypt a known test value before accepting requests
- Generate fresh random nonce (12 bytes) per encryption operation -- nonce reuse with same key compromises all encrypted data

**Detection:** Startup health check that attempts to decrypt a canary value.

### Pitfall 5: GPA Calculation Drift from Official USYD Figures

**What goes wrong:** UniBoard's calculated WAM/GPA consistently differs from the official figure shown on the student's academic transcript. Students lose trust in the product.

**Why it happens:** Multiple subtle factors:
- Canvas `current_score` vs `final_score` semantics (current = only graded items; final = unsubmitted = 0)
- Missing or incorrect credit point values (assumed 6cp but some courses are 12cp or 3cp)
- Level weight extraction from course code fails for non-standard codes
- Assessment weight mismatch between Unit Outline and Canvas
- Rounding differences (USYD may round to 3 decimal places)

**Consequences:** Product loses credibility. Students cannot trust it for important decisions.

**Prevention:**
- Use `current_score` (graded items only) as default, clearly label it as "based on X% of course weight assessed"
- Validate credit points against known USYD values (6cp standard, flag exceptions)
- Show "data sources" transparency: "Weights from Unit Outline, Grades from Canvas, synced X minutes ago"
- Include a disclaimer: "This is an estimate. Official WAM is calculated by the university."
- Unit tests with known grade inputs -> expected WAM output, based on manual calculation

**Detection:** User-reported discrepancies. Future: allow users to enter their official WAM for comparison.

### Pitfall 6: python-jose Security Vulnerability (NEW -- Stack Research Finding)

**What goes wrong:** The TRD and many FastAPI tutorials reference `python-jose` for JWT handling. It has been **abandoned for 3+ years** with **8 known security warnings** and generates deprecation warnings on Python 3.12+. FastAPI official docs have now switched to PyJWT.

**Why it happens:** Outdated tutorials and documentation persist in search results and training data.

**Consequences:** Security vulnerabilities in authentication layer. Python 3.12 deprecation warnings in logs. No patches for discovered CVEs.

**Prevention:** Use **PyJWT** (`pyjwt[crypto]`) instead. FastAPI official docs updated to recommend it. Minor API differences -- see [FastAPI JWT tutorial](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/).

**Detection:** CI should flag python-jose as a dependency if it appears in requirements.

---

## Moderate Pitfalls

### Pitfall 7: Deadline Deduplication False Positives/Negatives

**What goes wrong:** The SHA-256 dedup algorithm either merges two different deadlines (false positive -- "Assignment 1" from different courses) or fails to merge the same deadline from different sources (false negative -- "Asgn 1" vs "Assignment 1" vs "Assignment 1 - Due 5pm").

**Prevention:**
- Dedup key must include course_id to prevent cross-course merges
- Fuzzy name matching for within-course dedup (normalize: lowercase, strip whitespace, remove common prefixes like "Due:", "Submit:")
- Date proximity check: same course + similar name + due dates within 24 hours = likely duplicate
- Mark AI-extracted deadlines as `is_confirmed: false` so users can verify

### Pitfall 8: Token Expiration Without User Notification

**What goes wrong:** Canvas or Ed tokens expire or are revoked by the user on the source platform. UniBoard silently stops syncing data. The dashboard shows increasingly stale data. The user doesn't know why.

**Prevention:**
- Detect 401/403 from adapters -> mark token as invalid in DB
- Create web notification with action_url pointing to token settings
- Show banner on dashboard: "Your Canvas connection needs to be refreshed. [Go to Settings]"
- The TRD already specifies this flow in SS14.4 -- implement it faithfully

### Pitfall 9: Background Sync Blocking the Event Loop

**What goes wrong:** Sync jobs are CPU-intensive (parsing HTML, computing GPA) and run on the same event loop as the web server. During sync, API response latency spikes.

**Prevention:**
- Keep sync jobs truly async (no blocking calls wrapped in asyncio)
- For CPU-intensive parsing (BeautifulSoup4), use `asyncio.to_thread()` to offload to thread pool
- Consider running sync in a separate process (separate uvicorn worker or dedicated sync script)
- For MVP with a single user, this is unlikely to be a problem, but architect for separation

### Pitfall 10: Frontend Stale Data Not Communicated to User

**What goes wrong:** TanStack Query serves cached data. The user sees a grade that was updated 2 hours ago but thinks it's current. They make decisions based on stale data.

**Prevention:**
- Backend returns `last_sync_at` with every response
- Frontend shows relative time: "Last updated: 15 minutes ago"
- When `is_stale` flag is set (upstream API failed), show prominent `<StaleDataBanner>`
- TanStack Query `staleTime: 5min` for GPA, `refetchInterval: 15min` for deadlines

### Pitfall 11: SQLAlchemy Async Session Lifecycle Mismanagement (NEW -- Stack Research Finding)

**What goes wrong:** Module-level sessions shared across requests cause "session is already in use" errors. Lazy loading triggers `greenlet_spawn has not been called` errors in async mode.

**Prevention:**
- Single `async_engine` per process, single `async_sessionmaker`, one `AsyncSession` per request via FastAPI `Depends()`
- NEVER use lazy loading in async mode -- use `selectinload()` or `joinedload()`
- Set `expire_on_commit=False` to avoid implicit re-queries
- Pool settings: `pool_size=5, max_overflow=10, pool_recycle=300, pool_pre_ping=True`

### Pitfall 12: Tailwind v4 Breaking Changes from v3 (NEW -- Stack Research Finding)

**What goes wrong:** TRD specifies Tailwind CSS 3+, but v4 (released Jan 2025) is a major rewrite. Configuration changed from `tailwind.config.js` to CSS-first `@theme` rules. Many tutorials and shadcn/ui examples reference old config.

**Prevention:**
- Use `@import "tailwindcss"` instead of `@tailwind` directives
- Configure design tokens via `@theme { }` in CSS, not JavaScript
- shadcn/ui CLI v4+ generates v4-compatible code
- Anthropic design colors need explicit hex overrides in `@theme` or OKLCH conversion

### Pitfall 13: Next.js 16 vs TRD "14+" Assumptions (NEW -- Stack Research Finding)

**What goes wrong:** TRD specifies Next.js 14+, but 16 shipped Oct 2025 with significant changes: Middleware -> proxy.ts, Turbopack stable by default, caching uncached by default, async request APIs.

**Prevention:**
- Start fresh with Next.js 16, don't follow 14-era tutorials
- `output: 'export'` still works for static export
- Read the [upgrading guide](https://nextjs.org/docs/app/guides/upgrading/version-16) before starting

### Pitfall 14: Pydantic v2 vs v1 Pattern Confusion (NEW -- Stack Research Finding)

**What goes wrong:** Many FastAPI tutorials show Pydantic v1 patterns. v2 changes: `parse_raw` deprecated, `Config` -> `model_config = ConfigDict(...)`, `orm_mode` -> `from_attributes`, `@validator` -> `@field_validator`.

**Prevention:** Use v2 syntax from day one. `mypy --strict` catches v1 patterns early.

---

## Minor Pitfalls

### Pitfall 15: zsh Token Escaping

**What goes wrong:** When setting Canvas/Ed API tokens as environment variables in zsh, special characters (like `+`, `/`, `=` in base64-encoded tokens) get escaped or truncated.

**Prevention:** Use `.env` file with pydantic-settings, don't rely on shell `export`. Documented in TRD as a learned pattern.

### Pitfall 16: Canvas Pagination Not Handled

**What goes wrong:** Canvas API returns paginated results (default 10 items per page) with `Link` header for next page. Adapter only reads the first page. Courses with > 10 modules or assignments show incomplete data.

**Prevention:** Implement pagination follower in CanvasAdapter that reads `Link` header `rel="next"` and follows until exhausted. Ed API uses offset-based pagination -- different implementation needed.

### Pitfall 17: Ed Course ID / Canvas Course ID Mismatch

**What goes wrong:** A university course has one ID in Canvas and a different ID in Ed. Linking them incorrectly means grades from one course appear with materials from another.

**Prevention:** Store both `canvas_course_id` and `ed_course_id` on the Course model. Require explicit linking during onboarding or first sync (match by course code pattern, e.g., "COMP2017").

### Pitfall 18: Frontend Bundle Size Bloat

**What goes wrong:** Recharts, date-fns, and shadcn/ui components all imported eagerly. First-load JS exceeds 500KB. Slow on student laptops.

**Prevention:** Dynamic imports for Recharts (`next/dynamic`). Tree-shake date-fns (import individual functions). Lazy-load course detail tabs.

### Pitfall 19: MCP SDK Version Churn (NEW -- Stack Research Finding)

**What goes wrong:** MCP Python SDK went from v1.0 to v1.25+ in 6 months. Tool definition patterns change between versions.

**Prevention:** Pin version explicitly. Keep MCP layer thin -- just tool definitions delegating to service layer. Follow official tutorial for pinned version.

### Pitfall 20: Ed XML Content Format

**What goes wrong:** Ed Discussion thread content and Ed Lessons slide content are XML `<document version="2.0">` format, not HTML or plain text. Treating it as HTML breaks parsing.

**Prevention:** Build dedicated `parse_ed_document()` utility for the Ed XML dialect. Share between Ed Discussion and Ed Lessons adapters.

### Pitfall 21: PostgreSQL Full-Text Search Language Mismatch

**What goes wrong:** `to_tsvector('english', ...)` stems words, breaking course codes ("COMP2017") and technical terms.

**Prevention:** Use `'simple'` dictionary for titles/codes, `'english'` for content body.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Database schema + migrations | Schema changes break existing data after users start using the app | Design schema carefully upfront; plan migrations as non-destructive (additive columns, not renames) |
| Canvas/Ed adapter implementation | Rate limiting (Canvas), undocumented changes (Ed), pagination | Implement rate limiter first, defensive parsing, pagination follower |
| Unit Outline parsing | HTML selector changes, weight sum validation | Store raw HTML, validate parsed weights sum to ~100% |
| GPA calculation | Calculation drift from USYD official, credit point assumptions | Unit test with known inputs, show data source transparency |
| Deadline aggregation | Dedup false positives/negatives, three different data shapes | Dedup key includes course_id, fuzzy name matching, date proximity check |
| Background sync engine | Event loop blocking, failure cascading, no error reporting | Separate sync from web server, circuit breaker per API, structured error logging |
| Frontend dashboard | Stale data confusion, bundle bloat, responsive breakpoints | Show last_sync_at everywhere, dynamic imports, test on 768px tablet breakpoint |
| AI integration | High latency, unreliable quality, expensive API calls | Quality gate (F1 < 75% fallback to rules), cache AI results, batch processing |
| Auth + token security | python-jose abandoned, key management, token exposure | Use PyJWT, .env for encryption key, never log tokens |
| Frontend stack versions | TRD references outdated versions (Next 14, Tailwind 3, Recharts 2) | Use current versions: Next 16, Tailwind 4, Recharts 3, date-fns 4 |

## Sources

- UniBoard TRD v2.5 (error handling SS14, sync strategy SS5, rate limits SS7.4)
- UniBoard BRD v2.6 (user personas, competitive analysis)
- [Canvas API Rate Limiting](https://canvas.instructure.com/doc/api/file.throttling.html)
- [FastAPI python-jose deprecation discussion](https://github.com/fastapi/fastapi/discussions/9587)
- [FastAPI JWT docs (PyJWT)](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
- [SQLAlchemy Async Pitfalls](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Tailwind CSS v4 Migration](https://tailwindcss.com/blog/tailwindcss-v4)
- [Next.js 16 Upgrading Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Pydantic v2 Migration Guide](https://docs.pydantic.dev/latest/migration/)
- [MCP Python SDK Releases](https://github.com/modelcontextprotocol/python-sdk/releases)
- [cryptography AESGCM Docs](https://cryptography.io/en/latest/hazmat/primitives/aead/)
- Developer tips in CLAUDE.md (zsh export escaping, Ed API field name differences)
