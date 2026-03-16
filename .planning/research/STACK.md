# Technology Stack

**Project:** UniBoard - University GPA Maximization Dashboard
**Researched:** 2026-03-16
**Overall confidence:** HIGH

## Recommended Stack

The stack is already decided in PROJECT.md constraints. This document validates those choices, corrects outdated version numbers, identifies critical library substitutions, and fills in supporting libraries with specific versions verified against current releases.

### Core Framework (Backend)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Python | 3.12+ | Backend language | Async support, type hints, match statements, MCP SDK compatibility. 3.13 also viable but 3.12 has broader library compat. | HIGH |
| FastAPI | 0.135+ | REST API framework | Async-native, automatic OpenAPI docs, Pydantic v2 validation, dependency injection. Latest stable as of March 2026. Starlette 1.0+ foundation. | HIGH |
| Pydantic | 2.12+ | Data validation | Ships with FastAPI. v2 Rust core is 5-50x faster than v1. Use for all request/response schemas and settings. | HIGH |
| uvicorn | 0.34+ | ASGI server | Standard FastAPI deployment. `--reload` for dev. | HIGH |
| SQLAlchemy | 2.0+ (async) | ORM | Async engine with asyncpg, 2.0-style Mapped[] annotations (not legacy 1.x patterns). | HIGH |
| asyncpg | 0.30+ | PostgreSQL driver | Fastest async PG driver for Python, C-level performance, asyncio-native. | HIGH |
| Alembic | 1.18+ | Database migrations | SQLAlchemy-native. Use `alembic init -t async alembic` for async setup. | HIGH |
| mcp (Python SDK) | 1.25+ | MCP server | Official Anthropic SDK. Frequent releases (v1.0 to v1.25+ in 6 months). Pin version explicitly. | HIGH |

### Core Framework (Frontend)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | **16.1+** | React framework | **CORRECTION: Next.js 16 shipped Oct 2025.** Turbopack stable (50%+ faster builds), React 19 support, cache components. Use `output: 'export'` for static export. TRD says "14+" which is outdated. | HIGH |
| React | **19+** | UI library | Ships with Next.js 16. React Compiler for automatic memoization. | HIGH |
| TypeScript | 5.7+ | Type safety | Catch bugs at compile time, better DX. Strict mode. | HIGH |
| Tailwind CSS | **4.0+** | Styling | **CORRECTION: v4 released Jan 2025.** CSS-first config via `@theme` (no tailwind.config.js), 5x faster, OKLCH colors. TRD says "3+" which is outdated. | HIGH |
| shadcn/ui | CLI v4+ | Component library | Copy-paste components, Radix UI + Tailwind, fully customizable. Supports React 19 + Tailwind v4. | HIGH |
| TanStack Query | v5.90+ | Server state | ~20% smaller than v4. `useSuspenseQuery` for data loading. `staleTime: 5min` for GPA, `refetchInterval: 15min` for deadlines. | HIGH |
| Zustand | 5.0+ | Client state | v5 uses native `useSyncExternalStore` (React 18+). For UI state (sidebar, active tab, What-if slider values). | HIGH |

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16 | Primary database | Relational data, full-text search (tsvector/tsquery), JSON columns, Docker-friendly. | HIGH |
| Docker Compose | latest | Local DB hosting | Zero-install PostgreSQL, reproducible environment. | HIGH |

### Infrastructure (MVP - Local Only)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Docker Compose | latest | Local services orchestration | PostgreSQL + backend + frontend. Single `docker compose up`. | HIGH |
| uvicorn | 0.34+ | ASGI server | FastAPI's recommended production server, hot reload for dev. | HIGH |

### Authentication (MVP)

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| **PyJWT** | 2.10+ | JWT tokens | **CRITICAL FIX: python-jose is abandoned** (3+ years no release, 8 security warnings, Python 3.12 deprecation warnings). FastAPI docs officially switched to PyJWT. | HIGH |
| passlib[bcrypt] | 1.7+ | Password hashing | Standard FastAPI auth pattern. CryptContext handles bcrypt with auto-deprecation. | HIGH |
| bcrypt | 4.2+ | Bcrypt backend | Required by passlib. Actively maintained. | HIGH |

### Supporting Libraries (Backend)

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| httpx | 0.28+ | Async HTTP client | All external API calls (Canvas, Ed, USYD HTML). **RECOMMENDATION: Use httpx instead of aiohttp** -- see rationale below. Also needed for FastAPI TestClient. | MEDIUM |
| beautifulsoup4 | 4.13+ | HTML parsing | Unit Outline HTML parsing only. Performance irrelevant (once-per-semester). | HIGH |
| lxml | 5.3+ | BS4 backend parser | Use `BeautifulSoup(html, 'lxml')` for 10x faster parsing vs html.parser. | HIGH |
| pydantic-settings | 2.0+ | Configuration | Environment variable loading, .env file support. | HIGH |
| cryptography | 44+ | AES-256-GCM encryption | API token encryption in database. Already a transitive dep via PyJWT. | HIGH |
| structlog | 25.5+ | Structured logging | JSON-formatted logs for CloudWatch compat. Production-proven since 2013. | HIGH |
| anthropic | latest | Claude API client | AIEngine implementation (thread evaluation, digest generation). Phase 3+. | HIGH |
| ruff | 0.15+ | Linting + formatting | Replaces flake8, isort, black. 10-100x faster. Written in Rust (same team as uv). | HIGH |
| mypy | 1.15+ | Type checking | `--strict` mode enforced. | HIGH |
| pytest | 8.3+ | Testing framework | Unit and integration tests. | HIGH |
| pytest-asyncio | 0.25+ | Async test support | Testing async service/adapter methods. | HIGH |
| pytest-cov | 6.0+ | Coverage reporting | Target >80% core modules, >60% overall. | HIGH |

### Supporting Libraries (Frontend)

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| ky | 1.14+ | HTTP client | API calls from frontend (fetch-based, auto-retry, hooks for JWT injection). | HIGH |
| Recharts | **3.8+** | Data visualization | GPA charts, assessment weight pie charts. **CORRECTION: v3 is current** (March 2026). TRD says "2+". | HIGH |
| date-fns | **4.1+** | Date manipulation | Deadline countdowns, "X days remaining". **CORRECTION: v4 adds native timezone support.** TRD says "3+". | HIGH |
| @date-fns/tz | 1.0+ | Timezone support | Display deadlines in correct timezone. | HIGH |
| lucide-react | latest | Icons | Consistent icon set across the UI. | HIGH |
| clsx / tailwind-merge | latest | Class utilities | Conditional Tailwind classes in components. | HIGH |

### Package Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| uv | 0.10+ | Python package/project manager | 10-100x faster than pip. From Astral (same team as ruff). Universal lockfile. | HIGH |
| pnpm | 9+ | Frontend package manager | Strict dependency hoisting, fast installs, disk space savings. | HIGH |

---

## Critical Library Corrections

These are changes from what the TRD v2.5 specifies, based on verified 2026 research:

| TRD v2.5 Spec | Corrected Version | Reason |
|---------------|-------------------|--------|
| python-jose 3.3+ | **PyJWT 2.10+** | python-jose abandoned 3+ years. 8 security warnings. FastAPI officially deprecated it in favor of PyJWT. |
| Next.js 14+ | **Next.js 16.1+** | 16 shipped Oct 2025. Turbopack stable, React 19, cache components, proxy.ts. |
| Tailwind CSS 3+ | **Tailwind CSS 4.0+** | v4 released Jan 2025. CSS-first config, 5x faster builds, OKLCH colors. |
| React 18+ | **React 19+** | Ships with Next.js 16. React Compiler for automatic memoization. |
| Recharts 2+ | **Recharts 3.8+** | v3 is current (March 2026). Major improvements. |
| date-fns 3+ | **date-fns 4.1+** | v4 adds native timezone support via @date-fns/tz. |
| Alembic 1.14+ | **Alembic 1.18+** | 1.18 is current, has async improvements. |
| ruff 0.8+ | **ruff 0.15+** | 0.15 is current, includes 2026 style guide. |

## httpx vs aiohttp Decision

The TRD specifies aiohttp. This recommendation suggests **httpx** instead, for these reasons:

1. **UniBoard's API volume is low**: Canvas rate limit is 70 req/10s per token, Ed has even wider limits. aiohttp's raw throughput advantage is irrelevant.
2. **httpx has HTTP/2 support**: Useful if Canvas/Ed ever upgrade.
3. **httpx has both sync and async APIs**: Easier testing with sync mode, cleaner test fixtures.
4. **Fewer dependencies**: aiohttp pulls in multidict, yarl, frozenlist, aiosignal. httpx is lighter.
5. **httpx is the FastAPI TestClient**: Already needed as a dev dependency. Using it for production calls avoids having two HTTP libraries.
6. **Better type hints**: httpx has more complete type annotations for mypy --strict.

**If the user prefers aiohttp**: It's a valid choice too -- it's faster for high-concurrency scenarios and more battle-tested for WebSocket use cases. The difference is marginal for UniBoard's needs. Either works.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Backend framework | FastAPI | Django REST | Django is sync-first; FastAPI's async is critical for concurrent API calls to Canvas/Ed |
| ORM | SQLAlchemy 2.0 async | Tortoise ORM | SQLAlchemy has far larger ecosystem, better migration tooling (Alembic) |
| HTTP client (backend) | httpx | aiohttp | aiohttp is faster at scale but httpx has better DX, fewer deps, HTTP/2. See section above. |
| JWT | PyJWT | python-jose | python-jose abandoned, 8 security warnings, deprecated by FastAPI. |
| HTML Parser | beautifulsoup4 + lxml | selectolax | selectolax is fastest but BS4 is sufficient (once-per-semester parsing). |
| Frontend framework | Next.js 16 | Vite + React | Next.js provides file-system routing, static export, built-in optimizations. |
| Component library | shadcn/ui | Ant Design, MUI | shadcn/ui gives full source code control, fits Anthropic aesthetic. MUI/Ant impose their own design. |
| State management | Zustand + TanStack Query | Redux Toolkit | Redux is overkill; Zustand for UI + TQ for server state is the modern standard. |
| Charts | Recharts 3 | Nivo | Nivo is heavier. Recharts covers needed chart types (bar, pie, line) with simpler API. |
| Task queue | asyncio tasks (MVP) | Celery + Redis | Celery adds operational complexity; asyncio tasks sufficient for single-user local MVP. |
| Search | PostgreSQL tsvector | Elasticsearch | tsvector is zero-cost, sufficient for text search at MVP scale. |
| Package mgmt | uv | poetry | uv is 10-100x faster, from same team as ruff. Poetry is slower. |
| Logging | structlog | loguru | structlog outputs structured JSON natively (CloudWatch compatible). loguru is prettier but less structured. |
| Encryption | cryptography | PyCryptodome | cryptography is already a transitive dep via PyJWT. Avoids duplicate crypto libraries. |

## Version Pinning Strategy

Pin major.minor in `pyproject.toml` and `package.json`, allow patch updates:

```toml
# pyproject.toml (backend)
[project]
requires-python = ">=3.12"
dependencies = [
    "fastapi[standard]>=0.135,<1.0",
    "sqlalchemy[asyncio]>=2.0,<3.0",
    "asyncpg>=0.30,<1.0",
    "alembic>=1.18,<2.0",
    "mcp>=1.25,<2.0",
    "pyjwt[crypto]>=2.10,<3.0",
    "passlib[bcrypt]>=1.7,<2.0",
    "bcrypt>=4.2,<5.0",
    "httpx>=0.28,<1.0",
    "beautifulsoup4>=4.13,<5.0",
    "lxml>=5.3,<6.0",
    "structlog>=25.0,<26.0",
    "pydantic>=2.12,<3.0",
    "pydantic-settings>=2.0,<3.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3,<9.0",
    "pytest-asyncio>=0.25,<1.0",
    "pytest-cov>=6.0,<7.0",
    "mypy>=1.15,<2.0",
    "ruff>=0.15,<1.0",
]
```

```json
{
  "dependencies": {
    "next": "^16.1",
    "react": "^19.0",
    "react-dom": "^19.0",
    "@tanstack/react-query": "^5.90",
    "zustand": "^5.0",
    "recharts": "^3.8",
    "ky": "^1.14",
    "date-fns": "^4.1",
    "@date-fns/tz": "^1.0"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "@types/react": "^19.0",
    "tailwindcss": "^4.0",
    "eslint": "^9.0",
    "eslint-config-next": "^16.1"
  }
}
```

## Installation

```bash
# Backend setup (with uv)
uv sync
uv sync --group dev

# Frontend setup
cd frontend && pnpm install

# Database
docker compose up -d  # starts PostgreSQL 16

# Initialize database
alembic upgrade head

# Verify environment
mypy src/ && pytest && ruff check .
```

## Sources

- [FastAPI Releases](https://github.com/fastapi/fastapi/releases) -- latest 0.135+
- [FastAPI JWT docs -- PyJWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/) -- python-jose deprecated
- [python-jose abandonment discussion](https://github.com/fastapi/fastapi/discussions/9587)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) -- v1.25+
- [MCP Python SDK PyPI](https://pypi.org/project/mcp/)
- [SQLAlchemy Async Docs](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Alembic Docs](https://alembic.sqlalchemy.org/en/latest/) -- v1.18
- [Next.js 16 Blog](https://nextjs.org/blog/next-16) -- Oct 2025 release
- [Next.js 16.1 Blog](https://nextjs.org/blog/next-16-1) -- Dec 2025, Turbopack FS cache
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4) -- Jan 2025 release
- [shadcn/ui CLI v4](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4)
- [Recharts npm](https://www.npmjs.com/package/recharts) -- v3.8.0
- [Zustand v5 Announcement](https://pmnd.rs/blog/announcing-zustand-v5)
- [TanStack Query v5](https://tanstack.com/query/latest) -- v5.90+
- [Ruff Releases](https://github.com/astral-sh/ruff/releases) -- v0.15+
- [uv Releases](https://github.com/astral-sh/uv/releases) -- v0.10+
- [structlog Docs](https://www.structlog.org/) -- v25.5.0
- [cryptography AESGCM Docs](https://cryptography.io/en/latest/hazmat/primitives/aead/)
- [Pydantic Docs](https://docs.pydantic.dev/latest/) -- v2.12+
- [ky npm](https://www.npmjs.com/package/ky) -- v1.14+
- [date-fns v4 Blog](https://blog.date-fns.org/v40-with-time-zone-support/)
- UniBoard TRD v2.5 SS1.2 (technology stack decisions)
- UniBoard PROJECT.md (constraints)
