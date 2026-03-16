# Phase 1: Foundation & Data Acquisition - Research

**Researched:** 2026-03-16
**Domain:** Python backend foundation -- PostgreSQL schema, JWT auth, AES-256-GCM encryption, platform adapters (Canvas, Ed Discussion, Ed Lessons, Unit Outline parser), Docker Compose dev environment
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire backend foundation for UniBoard: database schema with 10+ tables, authentication layer (PyJWT + bcrypt), token encryption (AES-256-GCM), and all four platform adapters that fetch data from Canvas LMS, Ed Discussion, Ed Lessons, and USYD Unit Outline HTML. This phase sets every convention that subsequent phases inherit.

The technology stack is well-established and heavily documented. SQLAlchemy 2.0 async with asyncpg, FastAPI with Pydantic v2, and the `cryptography` library for AESGCM are all mature, well-documented libraries with clear async patterns. The main risk areas are: (1) Ed API being undocumented and subject to silent breaking changes, (2) Canvas rate limiting requiring a header-driven throttle implementation, and (3) Unit Outline HTML parsing being inherently fragile. All three are mitigated by the defensive patterns documented below.

No source code exists yet -- this is a greenfield implementation. All patterns must be established from scratch, making the architecture decisions in this phase critical for the entire project.

**Primary recommendation:** Build in strict dependency order: config/settings -> ORM models -> Alembic migrations -> encryption utilities -> auth endpoints -> adapter base classes -> concrete adapters -> Unit Outline parser -> Docker Compose + integration tests. Use `expire_on_commit=False` and explicit eager loading everywhere in async SQLAlchemy.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Course cross-platform linking: regex `[A-Z]{4}\d{4}` + semester composite key
- Ed tokens: single token for both Discussion + Lessons
- Token validation on storage: test API call immediately
- Canvas resilience: sliding window rate limiter + exponential backoff + circuit breaker
- Ed parsing: strict Pydantic + extra='ignore', skip failed items
- Unit Outline: 3-level fallback, weight-sum validation (95-105%), store raw HTML
- Testing: pure integration tests, real APIs, real PostgreSQL, no mocks
- Logging: structlog JSON, auto-redaction of sensitive fields
- Docker Compose: PostgreSQL only, backend runs locally with uvicorn
- API conventions: unified response wrapper, RESTful plural nouns, /api/v1/ prefix

### Claude's Discretion
- Database migration strategy (one big vs incremental Alembic migrations)
- Project directory structure within src/
- pydantic-settings configuration layering (dev/test/prod)
- Environment variable naming conventions
- Exact circuit breaker implementation details
- Exact structlog processor chain configuration

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | PostgreSQL database with schema for users, courses, grades, deadlines, Ed threads, course materials, skills, and encrypted tokens | SQLAlchemy 2.0 async Mapped[] models, Alembic async migrations, 11 indexes from TRD SS15.5 |
| INFRA-03 | Canvas adapter with rate limiting, pagination, and circuit breaker | httpx async client, header-driven rate limiter, Link header pagination, circuit breaker state machine |
| INFRA-04 | Ed Discussion adapter with defensive Pydantic parsing, graceful degradation | Pydantic v2 strict mode + extra='ignore', per-item error handling, field name mapping constants |
| INFRA-05 | Ed Lessons adapter for lesson content and assignment extraction | Same Ed API token, verified endpoints from TRD SS9, XML content parsing |
| INFRA-06 | Unit Outline HTML parser with weight-sum validation and Canvas fallback | BeautifulSoup4 + lxml, #assessment-table selector, 3-level fallback chain |
| INFRA-07 | Token encryption (AES-256-GCM) with key from environment variable | cryptography.AESGCM, 12-byte random nonce per operation, startup canary check |
| INFRA-08 | Simple JWT + bcrypt authentication (not Cognito for MVP) | PyJWT 2.10+ (NOT python-jose), passlib[bcrypt], FastAPI OAuth2PasswordBearer |
| INFRA-09 | Docker Compose for local PostgreSQL + backend development environment | postgres:16-alpine, volume persistence, health check, .env loading |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | >=0.135,<1.0 | REST API framework | Async-native, Pydantic v2 integration, auto OpenAPI docs, dependency injection |
| SQLAlchemy | >=2.0,<3.0 (async) | ORM | 2.0-style Mapped[] annotations, async engine with asyncpg, relationship eager loading |
| asyncpg | >=0.30,<1.0 | PostgreSQL async driver | Fastest async PG driver, C-level performance, asyncio-native |
| Alembic | >=1.18,<2.0 | Database migrations | SQLAlchemy-native, async template support via `alembic init -t async` |
| Pydantic | >=2.12,<3.0 | Data validation | Ships with FastAPI, Rust core 5-50x faster than v1, ConfigDict pattern |
| pydantic-settings | >=2.0,<3.0 | Configuration management | .env file loading, environment variable override, nested settings |
| PyJWT | >=2.10,<3.0 (pyjwt[crypto]) | JWT tokens | CRITICAL: replaces abandoned python-jose (8 security warnings). FastAPI official. |
| passlib[bcrypt] | >=1.7,<2.0 | Password hashing | CryptContext with bcrypt, auto-deprecation of old schemes |
| bcrypt | >=4.2,<5.0 | Bcrypt backend | Required by passlib |
| cryptography | >=44,<50 | AES-256-GCM encryption | AESGCM class for token encryption. Already transitive dep via PyJWT. |
| httpx | >=0.28,<1.0 | Async HTTP client | All external API calls. Better DX than aiohttp, fewer deps, HTTP/2, FastAPI test client. |
| beautifulsoup4 | >=4.13,<5.0 | HTML parsing | Unit Outline HTML parsing. Performance irrelevant (once-per-semester). |
| lxml | >=5.3,<6.0 | BS4 parser backend | 10x faster than html.parser |
| structlog | >=25.0,<26.0 | Structured logging | JSON-formatted logs, processor chain, sensitive field redaction |
| uvicorn | >=0.34,<1.0 | ASGI server | FastAPI's standard server, `--reload` for dev |

### Supporting (Dev)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pytest | >=8.3,<9.0 | Testing framework | All integration tests |
| pytest-asyncio | >=0.25,<1.0 | Async test support | Testing async adapter/service methods |
| pytest-cov | >=6.0,<7.0 | Coverage reporting | Target >80% core, >60% overall |
| mypy | >=1.15,<2.0 | Type checking | `--strict` mode enforced |
| ruff | >=0.15,<1.0 | Linting + formatting | Replaces flake8, isort, black. 10-100x faster. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PyJWT | python-jose | python-jose abandoned 3+ years, 8 security CVEs. No contest. |
| httpx | aiohttp | aiohttp faster at scale but httpx has better typing, fewer deps, is already FastAPI TestClient |
| beautifulsoup4 | selectolax | selectolax faster but BS4 sufficient for once-per-semester parsing |
| structlog | loguru | loguru prettier but structlog outputs structured JSON natively for CloudWatch |
| passlib[bcrypt] | argon2-cffi | argon2 newer but passlib+bcrypt is FastAPI's documented pattern |

**Installation (pyproject.toml):**
```toml
[project]
requires-python = ">=3.12"
dependencies = [
    "fastapi[standard]>=0.135,<1.0",
    "sqlalchemy[asyncio]>=2.0,<3.0",
    "asyncpg>=0.30,<1.0",
    "alembic>=1.18,<2.0",
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

## Architecture Patterns

### Recommended Project Structure

```
src/
├── __init__.py
├── config.py               # pydantic-settings: Settings class, get_settings()
├── database.py             # async engine, sessionmaker, get_session dependency
├── security/
│   ├── __init__.py
│   ├── auth.py             # JWT creation/validation, OAuth2 scheme, get_current_user
│   ├── encryption.py       # AES-256-GCM encrypt/decrypt, startup canary
│   └── password.py         # passlib CryptContext, hash/verify
├── models/
│   ├── __init__.py
│   ├── base.py             # DeclarativeBase, common mixins (TimestampMixin, UUIDMixin)
│   ├── user.py             # User model
│   ├── course.py           # Course model
│   ├── grade.py            # Grade model
│   ├── discussion.py       # DiscussionThread model
│   ├── deadline.py         # UnifiedDeadline model
│   ├── unit_outline.py     # UnitOutline model
│   ├── module.py           # Module + ModuleItem models
│   ├── lesson.py           # Lesson + Slide models
│   └── push_record.py      # PushRecord model
├── adapters/
│   ├── __init__.py
│   ├── base.py             # ABC interfaces: LMSAdapter, DiscussionAdapter, LessonAdapter
│   ├── canvas.py           # CanvasAdapter: rate limiter, pagination, circuit breaker
│   ├── ed_discussion.py    # EdDiscussionAdapter: Pydantic strict parsing
│   ├── ed_lessons.py       # EdLessonsAdapter: verified endpoints from TRD SS9
│   └── resilience.py       # CircuitBreaker, RateLimiter, RetryConfig classes
├── parsers/
│   ├── __init__.py
│   ├── usyd_outline.py     # BeautifulSoup4 HTML parser for Unit Outline
│   └── ed_document.py      # Ed XML document parser (shared by Discussion + Lessons)
├── schemas/
│   ├── __init__.py
│   ├── auth.py             # RegisterRequest, LoginRequest, TokenResponse
│   ├── user.py             # UserResponse, TokenConfigRequest
│   ├── common.py           # SuccessResponse[T], ErrorResponse, PaginationMeta
│   └── course.py           # CourseResponse, etc.
├── web/
│   ├── __init__.py
│   ├── main.py             # FastAPI app factory, exception handlers, middleware
│   ├── deps.py             # Shared dependencies (get_session, get_current_user)
│   └── routes/
│       ├── __init__.py
│       ├── auth.py         # POST /auth/register, /auth/login, /auth/refresh
│       ├── health.py       # GET /health
│       ├── users.py        # GET/PATCH /users/me, PUT/DELETE /users/me/tokens/{platform}
│       └── courses.py      # GET /courses (Phase 1: basic list from sync)
└── logging.py              # structlog configuration, redaction processor
tests/
├── __init__.py
├── conftest.py             # Shared fixtures: async engine, session, test client, API tokens
├── integration/
│   ├── __init__.py
│   ├── test_auth.py        # Register, login, refresh, protected endpoints
│   ├── test_encryption.py  # Encrypt/decrypt cycle, canary check, bad key
│   ├── test_canvas.py      # Real Canvas API calls (courses, grades, modules)
│   ├── test_ed_discussion.py # Real Ed API calls (threads, search)
│   ├── test_ed_lessons.py  # Real Ed API calls (lessons, slides)
│   ├── test_outline_parser.py # Real USYD HTML fetch and parse
│   ├── test_models.py      # ORM CRUD operations against real PostgreSQL
│   └── test_migrations.py  # Alembic upgrade/downgrade cycle
alembic/
├── env.py                  # Async env.py with asyncpg
├── script.py.mako
└── versions/
    └── 001_initial_schema.py  # All tables in single migration (Claude's discretion)
docker-compose.yml          # PostgreSQL 16 only
pyproject.toml
.env.example
```

**Discretion decision -- migration strategy:** Use a single initial migration (`001_initial_schema`) containing all Phase 1 tables. Rationale: no existing data to migrate, all tables are new, simpler to reason about. Future phases add incremental migrations.

**Discretion decision -- env var naming:** Use `UNIBOARD_` prefix for all application env vars. Database URL uses `DATABASE_URL` (standard convention). Platform tokens use `CANVAS_API_TOKEN` and `ED_API_TOKEN` (no prefix, matches TRD SS18.3).

### Pattern 1: SQLAlchemy 2.0 Async ORM with Mapped[] Annotations

**What:** All ORM models use SQLAlchemy 2.0 `Mapped[]` type annotations with `mapped_column()`. No legacy 1.x `Column()` pattern.

**When to use:** Every model definition.

**Critical rules:**
- NEVER use lazy loading in async mode -- always `selectinload()` or `joinedload()`
- Set `expire_on_commit=False` on sessionmaker to avoid implicit re-queries
- One `AsyncSession` per request via FastAPI `Depends()`
- Single `async_engine` + single `async_sessionmaker` per process

**Example:**
```python
# Source: SQLAlchemy 2.0 async docs + TRD SS4
import uuid
from datetime import datetime
from sqlalchemy import String, Float, ForeignKey, JSON, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.ext.asyncio import (
    create_async_engine, async_sessionmaker, AsyncSession, AsyncAttrs
)

class Base(AsyncAttrs, DeclarativeBase):
    pass

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    university_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    canvas_api_token_encrypted: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    ed_api_token_encrypted: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    gpa_target: Mapped[float | None] = mapped_column(Float, nullable=True)
    gpa_scale: Mapped[str] = mapped_column(String(10), default="wam")
    last_sync_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    courses: Mapped[list["Course"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

class Course(TimestampMixin, Base):
    __tablename__ = "courses"
    __table_args__ = (
        Index("ix_courses_user_semester", "user_id", "semester"),
        Index("ix_courses_canvas_id", "user_id", "canvas_course_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    canvas_course_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ed_course_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(20))  # e.g., COMP2017
    semester: Mapped[str] = mapped_column(String(20))  # e.g., 2026-S1
    credit_points: Mapped[int] = mapped_column(default=6)
    grading_weights: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    unit_outline_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="courses")
    grades: Mapped[list["Grade"]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )
```

### Pattern 2: Async Engine and Session Setup

**What:** Centralized database configuration with connection pool tuning.

```python
# Source: SQLAlchemy async docs, TRD SS15.3
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.config import get_settings

settings = get_settings()

async_engine = create_async_engine(
    settings.database_url,
    pool_size=5,
    max_overflow=10,
    pool_recycle=300,
    pool_pre_ping=True,
    echo=settings.debug,
)

async_session_factory = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,  # CRITICAL: avoid implicit re-queries in async
)

async def get_session() -> AsyncSession:
    """FastAPI dependency -- yields one session per request."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

### Pattern 3: FastAPI JWT Auth with PyJWT

**What:** Register/login endpoints, JWT creation/validation, password hashing with passlib.

**CRITICAL:** Use `PyJWT` (import as `jwt`), NOT `python-jose` (abandoned, 8 CVEs).

```python
# Source: FastAPI official JWT docs (updated to PyJWT), TRD SS7, SS12.2
import jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(
    data: dict, expires_delta: timedelta | None = None
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=30))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm="HS256")

def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await session.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```

### Pattern 4: AES-256-GCM Token Encryption

**What:** Encrypt/decrypt Canvas/Ed API tokens before storing in PostgreSQL.

```python
# Source: cryptography.io AESGCM docs, TRD SS7.1
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class TokenEncryption:
    """AES-256-GCM encryption for API tokens stored in database."""

    def __init__(self, key: bytes):
        """key must be exactly 32 bytes (256 bits)."""
        if len(key) != 32:
            raise ValueError("Encryption key must be 32 bytes")
        self._aesgcm = AESGCM(key)

    def encrypt(self, plaintext: str) -> str:
        """Encrypt plaintext, return base64(nonce + ciphertext)."""
        nonce = os.urandom(12)  # 96-bit nonce, fresh per operation
        ciphertext = self._aesgcm.encrypt(
            nonce, plaintext.encode("utf-8"), None
        )
        # Prepend nonce to ciphertext for storage
        return base64.b64encode(nonce + ciphertext).decode("ascii")

    def decrypt(self, encrypted: str) -> str:
        """Decrypt base64(nonce + ciphertext), return plaintext."""
        raw = base64.b64decode(encrypted)
        nonce = raw[:12]
        ciphertext = raw[12:]
        plaintext = self._aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode("utf-8")

    def canary_check(self) -> bool:
        """Startup verification that encryption key works."""
        try:
            test_value = "uniboard-canary-check"
            encrypted = self.encrypt(test_value)
            decrypted = self.decrypt(encrypted)
            return decrypted == test_value
        except Exception:
            return False

# Initialization from environment variable
def get_encryption() -> TokenEncryption:
    key_hex = os.environ.get("ENCRYPTION_KEY", "")
    if len(key_hex) < 32:
        raise RuntimeError("ENCRYPTION_KEY must be at least 32 bytes hex-encoded")
    key = bytes.fromhex(key_hex) if len(key_hex) == 64 else key_hex.encode()[:32]
    return TokenEncryption(key)
```

### Pattern 5: httpx Async Client with Resilience

**What:** Base adapter pattern with httpx, rate limiting, circuit breaker, retry.

```python
# Source: httpx docs, tenacity docs, TRD SS7.4, SS14.5, SS14.7
import asyncio
import time
from enum import Enum
from dataclasses import dataclass, field
import httpx
import structlog

logger = structlog.get_logger()

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

@dataclass
class CircuitBreaker:
    """Per-upstream circuit breaker. TRD SS14.7 spec."""
    failure_threshold: int = 5
    recovery_timeout: float = 60.0
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    last_failure_time: float = 0.0

    def record_success(self) -> None:
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def record_failure(self) -> None:
        self.failure_count += 1
        self.last_failure_time = time.monotonic()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning("circuit_breaker.opened", failures=self.failure_count)

    def can_execute(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            elapsed = time.monotonic() - self.last_failure_time
            if elapsed >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                return True
            return False
        # HALF_OPEN: allow one test request
        return True

@dataclass
class CanvasRateLimiter:
    """Header-driven rate limiter reading X-Rate-Limit-Remaining."""
    remaining: float = 700.0  # Canvas default: 700 cost units per 10s window
    min_remaining: float = 50.0  # Safety buffer

    def update_from_headers(self, headers: httpx.Headers) -> None:
        remaining = headers.get("x-rate-limit-remaining")
        if remaining is not None:
            self.remaining = float(remaining)

    async def wait_if_needed(self) -> None:
        if self.remaining <= self.min_remaining:
            wait_time = 2.0  # Wait for bucket to refill
            logger.warning(
                "rate_limiter.throttling",
                remaining=self.remaining,
                wait_seconds=wait_time,
            )
            await asyncio.sleep(wait_time)
```

### Pattern 6: Canvas Adapter with Pagination

**What:** Concrete Canvas adapter following Link header pagination.

```python
# Source: Canvas API docs, TRD SS2, SS10
import re
from typing import AsyncIterator

class CanvasAdapter:
    """Canvas LMS adapter -- canvas.sydney.edu.au"""

    def __init__(
        self,
        api_token: str,
        base_url: str = "https://canvas.sydney.edu.au/api/v1",
    ):
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_token}"},
            timeout=30.0,
        )
        self._rate_limiter = CanvasRateLimiter()
        self._circuit = CircuitBreaker()

    async def _request(
        self, method: str, path: str, **kwargs
    ) -> httpx.Response:
        """Single request with rate limiting and circuit breaker."""
        if not self._circuit.can_execute():
            raise UpstreamUnavailableError("Canvas circuit breaker is open")

        await self._rate_limiter.wait_if_needed()

        try:
            response = await self._client.request(method, path, **kwargs)
            self._rate_limiter.update_from_headers(response.headers)

            if response.status_code == 403:
                # Might be rate limited or token invalid
                if self._rate_limiter.remaining <= 0:
                    self._circuit.record_failure()
                    raise RateLimitedError("Canvas rate limit exceeded")

            response.raise_for_status()
            self._circuit.record_success()
            return response

        except httpx.HTTPStatusError as e:
            self._circuit.record_failure()
            raise

    async def _paginate(self, path: str, **kwargs) -> list[dict]:
        """Follow Link header pagination until exhausted."""
        results: list[dict] = []
        url = path

        while url:
            response = await self._request("GET", url, **kwargs)
            results.extend(response.json())

            # Parse Link header for next page
            link_header = response.headers.get("link", "")
            next_match = re.search(r'<([^>]+)>;\s*rel="next"', link_header)
            url = next_match.group(1) if next_match else None

        return results

    async def get_courses(self) -> list[dict]:
        return await self._paginate(
            "/courses",
            params={"enrollment_state": "active", "per_page": 100},
        )

    async def get_modules(self, course_id: str) -> list[dict]:
        return await self._paginate(
            f"/courses/{course_id}/modules",
            params={"include[]": "items", "per_page": 100},
        )

    async def get_grades(self, course_id: str) -> list[dict]:
        return await self._paginate(
            f"/courses/{course_id}/enrollments",
            params={"user_id": "self", "include[]": "current_points"},
        )

    async def close(self) -> None:
        await self._client.aclose()
```

### Pattern 7: Ed Adapter with Defensive Pydantic Parsing

**What:** Strict Pydantic models with `extra='ignore'` for undocumented Ed API.

```python
# Source: TRD SS9, Pydantic v2 docs
from pydantic import BaseModel, ConfigDict

# Field name mapping constants (TRD SS9.4 corrections)
ED_FIELD_MAP = {
    "content": "content",       # NOT "passage" (hschafer/edstem uses "passage")
    "number": "number",         # NOT "lesson_number"
    "user_id": "user_id",       # NOT "creator_id"
}

class EdThread(BaseModel):
    model_config = ConfigDict(extra="ignore", strict=False)

    id: int
    title: str
    user_id: int | None = None
    category: str = ""
    content: str = ""  # XML document format
    is_endorsed: bool = False
    is_answered: bool = False
    created_at: str = ""

class EdLesson(BaseModel):
    model_config = ConfigDict(extra="ignore", strict=False)

    id: int
    title: str
    number: int | None = None  # Field name correction from TRD SS9.4
    user_id: int | None = None
    state: str = ""
    slide_count: int = 0

class EdSlide(BaseModel):
    model_config = ConfigDict(extra="ignore", strict=False)

    id: int
    lesson_id: int
    content: str = ""  # XML <document version="2.0"> format
    type: str = ""
    order: int = 0

class EdDiscussionAdapter:
    """Ed Discussion adapter with per-item error handling."""

    def __init__(self, api_token: str, base_url: str = "https://edstem.org/api"):
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={"Authorization": f"Bearer {api_token}"},
            timeout=30.0,
        )

    async def get_threads(
        self, course_id: str, limit: int = 50
    ) -> list[EdThread]:
        response = await self._client.get(
            f"/courses/{course_id}/threads",
            params={"limit": limit, "sort": "new"},
        )
        response.raise_for_status()
        threads = []
        for item in response.json().get("threads", []):
            try:
                threads.append(EdThread.model_validate(item))
            except Exception as e:
                logger.error(
                    "ed.thread_parse_failed",
                    thread_id=item.get("id"),
                    error=str(e),
                )
                # Skip failed item, continue processing others
                continue
        return threads
```

### Pattern 8: Unit Outline HTML Parser

**What:** BeautifulSoup4 parser for USYD Unit Outline #assessment-table.

```python
# Source: TRD SS2.2 fetch_unit_outline, verified selectors
from bs4 import BeautifulSoup
from dataclasses import dataclass

@dataclass
class AssessmentItem:
    name: str
    weight: float  # 0.0 to 1.0
    description: str = ""
    due_date: str | None = None
    length: str = ""
    ai_policy: str = ""

class UnitOutlineParser:
    """Parse USYD Unit Outline HTML for assessment structure."""

    def parse(self, html: str) -> list[AssessmentItem]:
        """Parse #assessment-table, return assessment items.

        TRD verified selectors:
        - #assessment-table -- main assessment table
        - Alternating rows: data rows + outcome rows (skip outcome rows)
        """
        soup = BeautifulSoup(html, "lxml")
        table = soup.select_one("#assessment-table")
        if not table:
            raise ParseError("No #assessment-table found in HTML")

        items: list[AssessmentItem] = []
        rows = table.select("tr")

        for row in rows:
            cells = row.select("td")
            if not cells:
                continue  # Skip header or outcome rows

            try:
                name = cells[0].get_text(strip=True) if len(cells) > 0 else ""
                weight_text = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                weight = self._parse_weight(weight_text)

                if name and weight > 0:
                    items.append(AssessmentItem(
                        name=name,
                        weight=weight,
                        due_date=cells[2].get_text(strip=True) if len(cells) > 2 else None,
                        length=cells[3].get_text(strip=True) if len(cells) > 3 else "",
                        ai_policy=cells[4].get_text(strip=True) if len(cells) > 4 else "",
                    ))
            except (IndexError, ValueError) as e:
                logger.warning("outline.row_parse_failed", error=str(e))
                continue

        return items

    def _parse_weight(self, text: str) -> float:
        """Extract weight percentage from text like '30%' -> 0.30."""
        import re
        match = re.search(r"(\d+(?:\.\d+)?)\s*%", text)
        if match:
            return float(match.group(1)) / 100.0
        return 0.0

    def validate_weights(self, items: list[AssessmentItem]) -> bool:
        """Weights must sum to approximately 100% (95-105% tolerance)."""
        total = sum(item.weight for item in items)
        return 0.95 <= total <= 1.05
```

### Pattern 9: pydantic-settings Configuration

**What:** Layered settings with .env file support and environment variable override.

```python
# Source: pydantic-settings docs, TRD SS18.3
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    database_url: str = "postgresql+asyncpg://uniboard:devpassword@localhost:5432/uniboard_dev"

    # Platform API tokens (loaded from .env, never hardcoded)
    canvas_api_token: str = ""
    ed_api_token: str = ""

    # API base URLs
    canvas_base_url: str = "https://canvas.sydney.edu.au/api/v1"
    ed_base_url: str = "https://edstem.org/api"

    # Encryption key (hex-encoded 32 bytes for AES-256)
    encryption_key: str = ""

    # JWT
    secret_key: str = "dev-secret-change-in-production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Application
    debug: bool = False
    log_level: str = "INFO"

_settings: Settings | None = None

def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
```

### Pattern 10: structlog JSON Logging with Auto-Redaction

**What:** Processor chain that redacts sensitive fields and outputs JSON.

```python
# Source: structlog docs v25.5.0
import structlog

SENSITIVE_KEYS = {"token", "password", "secret", "api_key", "authorization"}

def redact_sensitive_fields(
    logger: structlog.types.WrappedLogger,
    method_name: str,
    event_dict: structlog.types.EventDict,
) -> structlog.types.EventDict:
    """Replace values of sensitive keys with [REDACTED]."""
    for key in list(event_dict.keys()):
        if any(sensitive in key.lower() for sensitive in SENSITIVE_KEYS):
            event_dict[key] = "[REDACTED]"
    return event_dict

def configure_logging(json_output: bool = True) -> None:
    processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        redact_sensitive_fields,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]
    if json_output:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(0),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
```

### Pattern 11: Unified API Response Wrapper

**What:** Consistent response envelope per TRD SS12.1 conventions.

```python
# Source: TRD SS12.1, SS14.2
from typing import Generic, TypeVar, Any
from pydantic import BaseModel
from datetime import datetime, timezone

T = TypeVar("T")

class MetaInfo(BaseModel):
    request_id: str
    timestamp: datetime

class SuccessResponse(BaseModel, Generic[T]):
    data: T
    meta: MetaInfo

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Any = None

class ErrorResponse(BaseModel):
    error: ErrorDetail
    meta: MetaInfo

# Custom exception hierarchy (TRD SS14.2)
class UniboardError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 500):
        self.code = code
        self.message = message
        self.status_code = status_code

class TokenInvalidError(UniboardError):
    def __init__(self, platform: str):
        super().__init__("TOKEN_INVALID", f"{platform} token is invalid or expired", 422)

class UpstreamAPIError(UniboardError):
    def __init__(self, platform: str, detail: str = ""):
        super().__init__("UPSTREAM_ERROR", f"{platform} API error: {detail}", 502)

class RateLimitedError(UniboardError):
    def __init__(self, detail: str = ""):
        super().__init__("RATE_LIMITED", f"Rate limited: {detail}", 429)

class UpstreamUnavailableError(UniboardError):
    def __init__(self, detail: str = ""):
        super().__init__("UPSTREAM_ERROR", detail, 502)
```

### Anti-Patterns to Avoid

- **NEVER lazy load in async SQLAlchemy:** Will raise `greenlet_spawn has not been called`. Always use `selectinload()` or `joinedload()`.
- **NEVER use python-jose:** Abandoned 3+ years, 8 CVEs. Use PyJWT.
- **NEVER reuse AES-GCM nonce:** Generates fresh 12-byte random nonce per encryption operation. Nonce reuse compromises all encrypted data with that key.
- **NEVER store encryption key in source code:** Environment variable only, .env excluded from git.
- **NEVER call external APIs from route handlers directly:** Always go through Adapter -> Service -> Route.
- **NEVER use `import Column` from SQLAlchemy:** Use `Mapped[]` + `mapped_column()` (2.0 style).
- **NEVER use Pydantic v1 patterns:** No `class Config:`, use `model_config = ConfigDict(...)`. No `@validator`, use `@field_validator`. No `orm_mode`, use `from_attributes`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom bcrypt wrapper | `passlib.context.CryptContext` | Handles bcrypt rounds, auto-upgrades old hashes |
| JWT creation/validation | Manual token building | `PyJWT` encode/decode | Handles expiry, claims, algorithm negotiation |
| AES-256-GCM encryption | Custom crypto | `cryptography.AESGCM` | NIST-audited, handles auth tag, constant-time comparison |
| HTTP retry logic | Custom retry loop | `tenacity` library | Exponential backoff, jitter, async support, exception filtering |
| Environment variable loading | Custom os.environ parser | `pydantic-settings` | Type coercion, .env files, validation, defaults |
| HTML parsing | Regex on HTML | `BeautifulSoup4 + lxml` | Handles malformed HTML, CSS selectors, encoding |
| JSON logging | Custom formatter | `structlog` | Processor chain, contextvars, JSON rendering |
| Database migrations | Manual SQL scripts | `Alembic` | Autogenerate from models, versioning, async support |
| Link header pagination | Regex on raw headers | httpx returns headers dict, parse with regex `<url>; rel="next"` | Canvas uses standard Link header format |

**Key insight:** Every "deceptively simple" component above has edge cases that take days to get right. Encryption nonce management, bcrypt round upgrades, JWT claim validation, exponential backoff jitter -- these are all solved problems.

## Common Pitfalls

### Pitfall 1: SQLAlchemy Async Session Lifecycle

**What goes wrong:** Module-level sessions shared across requests cause "session is already in use" errors. Lazy loading triggers `greenlet_spawn has not been called`.
**Why it happens:** Async SQLAlchemy requires explicit eager loading and per-request sessions.
**How to avoid:** Single engine per process, `async_sessionmaker` with `expire_on_commit=False`, one `AsyncSession` per request via `Depends()`, always use `selectinload()`/`joinedload()`.
**Warning signs:** Any `MissingGreenlet` or `InvalidRequestError` in logs.

### Pitfall 2: Canvas API Rate Limiting

**What goes wrong:** Sync jobs blast Canvas without reading `X-Rate-Limit-Remaining`. Canvas returns 403. If adapter retries immediately, ban extends.
**Why it happens:** Canvas allows 700 requests per 10 seconds, but a full sync for 5 courses can exceed 100 requests with N+1 patterns.
**How to avoid:** Read `X-Rate-Limit-Remaining` header after every response. Use `include[]=items` on modules endpoint. Sequential course processing with small delays. Circuit breaker after 5 consecutive failures.
**Warning signs:** >10% of sync cycles fail.

### Pitfall 3: Ed API Undocumented Breaking Changes

**What goes wrong:** Ed silently changes field names, response shapes, or auth behavior. Adapter breaks with no warning.
**Why it happens:** Ed's API is not a public commitment. No versioning, no changelog.
**How to avoid:** Pydantic strict validation on known fields + `extra='ignore'` for unknown. Per-item error handling (skip failed items, don't crash entire sync). Integration tests hitting real Ed API.
**Warning signs:** Pydantic validation errors in logs.

### Pitfall 4: Token Encryption Key Management

**What goes wrong:** AES-256-GCM key lost, corrupted, or regenerated on restart. All stored tokens become undecryptable.
**Why it happens:** Key stored in env file that gets deleted, or hardcoded (security risk).
**How to avoid:** Store in `.env` (git-ignored). Document backup procedure. Startup canary check that decrypts a test value before accepting requests. Never hardcode in source.
**Warning signs:** Startup canary check fails.

### Pitfall 5: Unit Outline HTML Structure Changes

**What goes wrong:** USYD redesigns Unit Outline page. All CSS selectors break. Assessment weight parsing returns empty.
**Why it happens:** HTML scraping is inherently fragile. USYD controls the template.
**How to avoid:** Store raw HTML in UnitOutline table for re-parsing. 3-level fallback: Unit Outline -> Canvas assignment_groups -> user manual input. Weight-sum validation (95-105%).
**Warning signs:** Weight sum outside 95-105%, empty assessment list.

### Pitfall 6: python-jose Security Vulnerability

**What goes wrong:** Using python-jose for JWT results in 8 known CVEs and Python 3.12 deprecation warnings.
**Why it happens:** Outdated tutorials still reference python-jose.
**How to avoid:** Use `PyJWT` (`pyjwt[crypto]`). CI should flag python-jose if it appears in deps. FastAPI official docs updated to PyJWT.
**Warning signs:** `python-jose` in `pip list` or `uv tree`.

### Pitfall 7: Pydantic v2 vs v1 Pattern Confusion

**What goes wrong:** Using `class Config:` instead of `model_config = ConfigDict(...)`, `@validator` instead of `@field_validator`, `orm_mode` instead of `from_attributes`.
**Why it happens:** Many tutorials still show v1 patterns.
**How to avoid:** Use v2 syntax from day one. `mypy --strict` catches some v1 patterns. `ruff` can flag deprecated patterns.
**Warning signs:** Pydantic deprecation warnings in logs or test output.

### Pitfall 8: zsh Token Escaping

**What goes wrong:** Canvas/Ed tokens with special characters (`+`, `/`, `=`) get escaped when set via `export` in zsh.
**Why it happens:** zsh interprets special characters in quoted strings differently.
**How to avoid:** Use `.env` file loaded by pydantic-settings. Never rely on shell `export` for tokens.
**Warning signs:** Token validation fails immediately after storage.

## Code Examples

### Docker Compose for PostgreSQL

```yaml
# Source: TRD SS18.2
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: uniboard_dev
      POSTGRES_USER: uniboard
      POSTGRES_PASSWORD: devpassword
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U uniboard -d uniboard_dev"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### Alembic Async env.py

```python
# Source: Alembic async cookbook
# alembic/env.py (generated by `alembic init -t async alembic`)
import asyncio
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

# Import all models so metadata is populated
from src.models.base import Base
from src.models import user, course, grade, discussion, deadline, unit_outline, module, lesson, push_record
from src.config import get_settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations():
    settings = get_settings()
    connectable = create_async_engine(settings.database_url)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_migrations_online():
    asyncio.run(run_async_migrations())

run_migrations_online()
```

### FastAPI App Factory with Exception Handlers

```python
# Source: TRD SS14.2, SS12.1
import uuid as uuid_mod
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from src.logging import configure_logging
from src.schemas.common import ErrorResponse, ErrorDetail, MetaInfo

def create_app() -> FastAPI:
    configure_logging(json_output=True)

    app = FastAPI(title="UniBoard API", version="0.1.0")

    @app.middleware("http")
    async def add_request_id(request: Request, call_next):
        request_id = str(uuid_mod.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.exception_handler(UniboardError)
    async def uniboard_error_handler(request: Request, exc: UniboardError):
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error=ErrorDetail(code=exc.code, message=exc.message),
                meta=MetaInfo(
                    request_id=getattr(request.state, "request_id", "unknown"),
                    timestamp=datetime.now(timezone.utc),
                ),
            ).model_dump(mode="json"),
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception):
        logger.error("unhandled_exception", error=str(exc), exc_info=True)
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error=ErrorDetail(code="INTERNAL_ERROR", message="An unexpected error occurred"),
                meta=MetaInfo(
                    request_id=getattr(request.state, "request_id", "unknown"),
                    timestamp=datetime.now(timezone.utc),
                ),
            ).model_dump(mode="json"),
        )

    # Register routes
    from src.web.routes import auth, health, users
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(users.router, prefix="/api/v1")

    return app

app = create_app()
```

### Integration Test Fixtures

```python
# Source: pytest-asyncio docs, testing strategy from CONTEXT.md
# tests/conftest.py
import asyncio
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.models.base import Base
from src.web.main import create_app
from src.config import Settings

# Use auto mode for pytest-asyncio
pytest_plugins = ["pytest_asyncio"]

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Create async engine for test database (real PostgreSQL via Docker)."""
    database_url = os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql+asyncpg://uniboard:devpassword@localhost:5432/uniboard_test",
    )
    engine = create_async_engine(database_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest_asyncio.fixture
async def session(test_engine):
    """Per-test database session with rollback."""
    session_factory = async_sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session
        await session.rollback()

@pytest_asyncio.fixture
async def client():
    """Async HTTP test client for FastAPI."""
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def canvas_token():
    """Real Canvas API token from environment."""
    token = os.environ.get("CANVAS_API_TOKEN")
    if not token:
        pytest.skip("CANVAS_API_TOKEN not set")
    return token

@pytest.fixture
def ed_token():
    """Real Ed API token from environment."""
    token = os.environ.get("ED_API_TOKEN")
    if not token:
        pytest.skip("ED_API_TOKEN not set")
    return token
```

### Retry Pattern with Tenacity

```python
# Source: tenacity docs, TRD SS14.5
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential_jitter,
    retry_if_exception_type,
)
import httpx

RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

class RetryableHTTPError(Exception):
    pass

def should_retry(response: httpx.Response) -> None:
    """Raise RetryableHTTPError for retryable status codes."""
    if response.status_code in RETRYABLE_STATUS_CODES:
        raise RetryableHTTPError(
            f"HTTP {response.status_code}: {response.text[:200]}"
        )

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential_jitter(initial=1, max=30),
    retry=retry_if_exception_type((RetryableHTTPError, httpx.ConnectError)),
)
async def resilient_request(
    client: httpx.AsyncClient, method: str, url: str, **kwargs
) -> httpx.Response:
    response = await client.request(method, url, **kwargs)
    should_retry(response)
    return response
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| python-jose for JWT | PyJWT 2.10+ | FastAPI docs updated 2025 | Must use PyJWT -- python-jose has 8 CVEs |
| SQLAlchemy 1.x Column() | SQLAlchemy 2.0 Mapped[] | SQLAlchemy 2.0 (2023) | All models use type-annotated Mapped[] pattern |
| Pydantic v1 Config class | Pydantic v2 ConfigDict | Pydantic 2.0 (2023) | model_config, field_validator, from_attributes |
| aiohttp for HTTP | httpx 0.28+ | Community shift 2024-2025 | Better typing, fewer deps, FastAPI TestClient |
| alembic sync only | alembic -t async | Alembic 1.15+ | Native async migration support |

**Deprecated/outdated:**
- python-jose: Abandoned, 8 CVEs, Python 3.12 deprecation warnings
- Pydantic v1 patterns: `class Config:`, `@validator`, `orm_mode`
- SQLAlchemy 1.x patterns: `Column()`, `Session()` without Mapped
- aiohttp for this use case: httpx preferred for low-volume API clients

## Open Questions

1. **Ed API stability**
   - What we know: Endpoints verified via curl in March 2026. Field names documented in TRD SS9.4.
   - What's unclear: How often Ed changes their undocumented API. No public changelog exists.
   - Recommendation: Build with strict Pydantic validation, integration tests that run against real Ed API, and per-item error handling. Accept that Ed adapter may need field name fixes over time.

2. **Unit Outline HTML selector stability**
   - What we know: `#assessment-table` verified across 5 courses, 3 faculties as of March 2026.
   - What's unclear: When USYD might redesign the Unit Outline page.
   - Recommendation: Store raw HTML. Implement weight-sum validation as early warning. 3-level fallback chain.

3. **Test database setup for CI**
   - What we know: Docker Compose works locally. GitHub Actions supports service containers.
   - What's unclear: Exact GitHub Actions service container configuration for PostgreSQL 16.
   - Recommendation: Use `services: postgres:` in GitHub Actions workflow. Fall back to `docker compose up -d` if needed.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 8.3+ with pytest-asyncio 0.25+ |
| Config file | none -- Wave 0 |
| Quick run command | `pytest tests/ -x --timeout=60` |
| Full suite command | `pytest tests/ --timeout=120 -v` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | All ORM models CRUD + Alembic migration | integration | `pytest tests/integration/test_models.py tests/integration/test_migrations.py -x` | Wave 0 |
| INFRA-03 | Canvas adapter: courses, grades, modules with rate limiting | integration | `pytest tests/integration/test_canvas.py -x` | Wave 0 |
| INFRA-04 | Ed Discussion adapter: threads, search with defensive parsing | integration | `pytest tests/integration/test_ed_discussion.py -x` | Wave 0 |
| INFRA-05 | Ed Lessons adapter: lessons, slides with field name corrections | integration | `pytest tests/integration/test_ed_lessons.py -x` | Wave 0 |
| INFRA-06 | Unit Outline parser: weight extraction, validation, fallback | integration | `pytest tests/integration/test_outline_parser.py -x` | Wave 0 |
| INFRA-07 | AES-256-GCM encrypt/decrypt cycle, canary check | integration | `pytest tests/integration/test_encryption.py -x` | Wave 0 |
| INFRA-08 | JWT auth: register, login, refresh, protected endpoints | integration | `pytest tests/integration/test_auth.py -x` | Wave 0 |
| INFRA-09 | Docker PostgreSQL health, Alembic migrate, uvicorn startup | integration | `pytest tests/integration/test_migrations.py -x` | Wave 0 |

### Sampling Rate

- **Per task commit:** `mypy src/ && pytest tests/ -x --timeout=60 && ruff check .`
- **Per wave merge:** `mypy src/ && pytest tests/ --timeout=120 -v && ruff check .`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `pyproject.toml` -- project configuration with all dependencies
- [ ] `pytest.ini` or `pyproject.toml [tool.pytest]` -- pytest-asyncio mode=auto, timeout
- [ ] `tests/conftest.py` -- shared async fixtures (engine, session, client, API tokens)
- [ ] `tests/__init__.py` and `tests/integration/__init__.py` -- package markers
- [ ] `.env.example` -- template with all required environment variables
- [ ] `docker-compose.yml` -- PostgreSQL 16 service
- [ ] `src/models/base.py` -- DeclarativeBase + TimestampMixin
- [ ] `alembic/` directory -- async env.py, script.py.mako
- [ ] `src/config.py` -- pydantic-settings Settings class
- [ ] `src/logging.py` -- structlog configuration

## Sources

### Primary (HIGH confidence)

- [SQLAlchemy 2.0 Async Docs](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html) -- session lifecycle, Mapped[], eager loading, pool settings
- [FastAPI JWT Tutorial (PyJWT)](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/) -- official auth pattern, python-jose deprecation
- [cryptography AESGCM Docs](https://cryptography.io/en/latest/hazmat/primitives/aead/) -- AESGCM class API, nonce requirements, key generation
- [Alembic Cookbook -- Async](https://alembic.sqlalchemy.org/en/latest/cookbook.html) -- async env.py configuration
- [Pydantic Settings Docs](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) -- BaseSettings, .env loading, nested settings
- [structlog Processors Docs](https://www.structlog.org/en/stable/processors.html) -- processor chain, JSONRenderer, custom processors
- [Canvas API Throttling](https://canvas.instructure.com/doc/api/file.throttling.html) -- rate limit headers, leaky bucket algorithm
- [Tenacity Docs](https://tenacity.readthedocs.io/) -- retry decorator, exponential backoff, async support
- UniBoard TRD v2.5 -- SS2 (MCP tools), SS3 (architecture), SS4 (data model), SS7 (security), SS9 (Ed Lessons API), SS10 (Canvas Modules), SS12 (REST API), SS14 (error handling), SS15 (database), SS18 (local dev)

### Secondary (MEDIUM confidence)

- [FastAPI + SQLAlchemy 2.0 + Alembic + Docker](https://berkkaraal.com/blog/2024/09/19/setup-fastapi-project-with-async-sqlalchemy-2-alembic-postgresql-and-docker/) -- verified project setup pattern
- [httpx Transports Docs](https://www.python-httpx.org/advanced/transports/) -- retry and transport configuration
- [pytest-asyncio auto-mode](https://pytest-asyncio.readthedocs.io/en/latest/concepts.html) -- fixture mode configuration

### Tertiary (LOW confidence)

- Ed API endpoints -- verified by curl March 2026 but undocumented, subject to change without notice
- Unit Outline HTML selectors -- verified across 5 courses March 2026 but USYD controls the template

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries well-established, versions verified against current releases
- Architecture: HIGH -- TRD v2.5 provides detailed architecture, validated by ARCHITECTURE.md research
- Pitfalls: HIGH -- 21 pitfalls documented with prevention strategies, drawn from TRD and stack research
- Ed API stability: LOW -- undocumented API, no public changelog, verified only at a point in time
- Unit Outline parser: MEDIUM -- HTML selectors verified cross-faculty but inherently fragile

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (30 days for stable backend stack; Ed API patterns should be re-verified each semester)
