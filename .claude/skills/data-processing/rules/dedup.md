# Deduplication Skills

Rules for deadline deduplication and notification dedup in UniBoard.

---

## Rule 1: SHA-256 Deadline Dedup

Every deadline gets a deterministic dedup key computed from `course_code + normalized_title + due_date`.

**Implementation in `src/services/deadline.py`:**
```python
def compute_dedup_key(course_code: str, title: str, due_date: str) -> str:
    normalized = normalize_title(title)
    payload = f"{course_code.upper()}|{normalized}|{due_date}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def normalize_title(title: str) -> str:
    cleaned = re.sub(r"[^\w\s]", "", title.lower().strip())
    return re.sub(r"\s+", " ", cleaned).strip()
```

**Key points:**
- Course code is uppercased to prevent case-sensitive duplicates
- Title normalization: lowercase, strip punctuation, collapse whitespace
- Due date is the ISO date portion only (first 10 chars: `YYYY-MM-DD`)
- `dedup_key` has a UNIQUE constraint in the database — `ON CONFLICT DO UPDATE` for upserts
- Existing keys are loaded into a Python set for O(1) lookup before insert

---

## Rule 2: Fuzzy Matching with rapidfuzz token_set_ratio

After exact SHA-256 dedup, a second pass catches near-duplicate deadlines using fuzzy string matching.

**Implementation:**
```python
from rapidfuzz import fuzz

FUZZY_THRESHOLD = 95  # NOT 80

def find_near_duplicate(new_title: str, existing_deadlines: list) -> UnifiedDeadline | None:
    normalized_new = normalize_title(new_title)
    for deadline in existing_deadlines:
        normalized_existing = normalize_title(deadline.title)
        score = fuzz.token_set_ratio(normalized_new, normalized_existing)
        if score >= FUZZY_THRESHOLD:
            return deadline
    return None
```

**Why `token_set_ratio` at 95 (not `fuzz.ratio` at 80):**
- `token_set_ratio` handles supersets: "Assignment 1 - Due Oct 15" vs "Assignment 1" scores 100 (intersection tokens match perfectly)
- `fuzz.ratio` would score this much lower due to length difference
- Threshold 95 rejects genuinely different items: "Assignment 1" vs "Assignment 2" scores ~91.7
- Threshold 80 with `fuzz.ratio` would create false positives

**Key points:**
- Fuzzy matching only compares within same course + same due date (caller pre-filters)
- Applied AFTER exact SHA-256 dedup (two-layer dedup strategy)
- Returns the first match above threshold (not the best match)

---

## Rule 3: Notification Dedup via PushRecord

Notifications are deduplicated using a `PushRecord` model with a unique constraint.

**Implementation in `src/services/notification.py`:**
```python
content_hash = hashlib.sha256(
    f"{user_id}|{notification_type}|{title}".encode()
).hexdigest()
```

**PushRecord model:**
- `user_id` — target user
- `content_hash` — SHA-256 of `user_id|type|title`
- `pushed_at` — timestamp (naive UTC, `datetime.utcnow()`)
- Unique constraint: `(user_id, content_hash)`

**Key points:**
- Checked before creating notification: if PushRecord exists, skip
- Prevents duplicate deadline reminders (same deadline, same tier)
- Prevents duplicate digest emails on re-run
- `pushed_at` uses naive `datetime.utcnow()` for asyncpg TIMESTAMP WITHOUT TIME ZONE compatibility

---

## Rule 4: Upsert Pattern for Deadline Sync

Deadline sync uses PostgreSQL `ON CONFLICT DO UPDATE` for idempotent inserts.

**Pattern:**
```python
from sqlalchemy.dialects.postgresql import insert as pg_insert

insert_stmt = pg_insert(UnifiedDeadline).values(**values)
insert_stmt = insert_stmt.on_conflict_do_update(
    index_elements=["dedup_key"],
    set_={"title": values["title"], "due_date": values["due_date"]},
)
await session.execute(insert_stmt)
```

**Key points:**
- `index_elements=["dedup_key"]` — conflict detected on SHA-256 key
- On conflict: update title and due_date (source may have updated these)
- Canvas assignments and Ed Lessons use the same upsert pattern
- Ed Discussion deadlines update only `description` on conflict (less reliable source)
- Must import `insert` from `sqlalchemy.dialects.postgresql` (not `sqlalchemy`)
