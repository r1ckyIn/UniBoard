# Digest Scoring Rules

Rules for AI-enhanced urgency scoring and daily digest generation.

## Rule 1: Urgency Scale
5-point scale: 5=immediate-action (exam tomorrow), 4=act-today (assignment due soon), 3=this-week (upcoming deadline), 2=informational (new grade posted), 1=low-priority (general announcement). Stored in `DigestItem.urgency_score`.

## Rule 2: Batch Processing
All digest items sent in one API call for efficiency. Format as JSON array with index. AI returns `[{index, urgency_score, reason}]`. This avoids N API calls for N items.

## Rule 3: AI Summary Generation
2-3 sentence summary focusing on actionable items and GPA impact. Stored in `Digest.ai_summary`. Example: "You have 2 assignments due this week. Your COMP2123 grade dropped below target — check the risk alert."

## Rule 4: Scheduler Timing
Daily digest fires at 07:00 AEST via `CronTrigger(hour=7, minute=0, timezone="Australia/Sydney")`. The `timezone` parameter handles DST automatically — do NOT use static UTC offset.
Source: `src/sync/engine.py`, `src/services/digest.py`
