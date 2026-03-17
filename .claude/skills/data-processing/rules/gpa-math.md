# GPA Math Rules

Rules for WAM/GPA calculation, What-if simulation, and numeric precision.

## Rule 1: Decimal Precision
All GPA/WAM math uses `Decimal(str(float))` conversion with `ROUND_HALF_UP`. Never use raw float arithmetic — IEEE 754 rounding causes drift in cumulative calculations.
```python
from decimal import Decimal, ROUND_HALF_UP
wam = Decimal(str(raw_score)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
```
Source: `src/services/gpa.py`

## Rule 2: Grade Bands
USYD grade bands: HD >= 85, D >= 75, CR >= 65, P >= 50, F < 50. GPA points: HD=7, D=6, CR=5, P=4, F=0. Always use the `grade_band()` helper, never hardcode thresholds.

## Rule 3: WAM Formula
WAM = sum(mark × credit_points) / sum(credit_points). All calculated per-semester and cumulatively. Credit-weighted, not simple average.

## Rule 4: What-If Scenarios
`WhatIfScenario.scores_json` uses JSONB for flexible per-assessment score overrides. Hypothesis property tests validate that What-if WAM is always between 0 and 100, and that empty overrides return current WAM unchanged.
Source: `src/models/whatif.py`, `tests/unit/test_gpa_service.py`

## Rule 5: Grade Unique Constraint
`(course_id, assessment_name)` unique constraint on Grade model for future sync upsert. Added proactively in Phase 2 to avoid migration conflicts.
