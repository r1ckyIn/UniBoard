"""Shared test fixtures for the MCP server test suite."""

import pytest

from uniboard_mcp.adapters.resilience import CanvasRateLimiter, CircuitBreaker, RetryConfig
from uniboard_mcp.parsers.unit_outline import UnitOutlineParser


@pytest.fixture
def circuit_breaker() -> CircuitBreaker:
    return CircuitBreaker(failure_threshold=3, recovery_timeout=1.0)


@pytest.fixture
def rate_limiter() -> CanvasRateLimiter:
    return CanvasRateLimiter()


@pytest.fixture
def retry_config() -> RetryConfig:
    return RetryConfig(max_attempts=3, base_delay=0.1, max_delay=1.0)


@pytest.fixture
def parser() -> UnitOutlineParser:
    return UnitOutlineParser()


SAMPLE_OUTLINE_HTML = """
<html>
<body>
<div id="unit-description">
  <p>An introduction to distributed computing and parallel algorithms.</p>
</div>
<h2>Learning Outcomes</h2>
<div id="learning-outcomes">
  <ul>
    <li>Understand distributed systems fundamentals</li>
    <li>Apply parallel programming patterns</li>
  </ul>
</div>
<table id="assessment-table" class="table-striped table-bordered">
  <tr><th>Assessment</th><th>Weight</th><th>Due</th><th>Description</th></tr>
  <tr>
    <td class="assessment-type">Quiz 1</td>
    <td class="assessment-weight">20%</td>
    <td class="assessment-due">Week 5</td>
    <td class="assessment-description">Multiple choice quiz on fundamentals</td>
  </tr>
  <tr>
    <td class="assessment-type">Assignment 1</td>
    <td class="assessment-weight">30%</td>
    <td class="assessment-due">Week 8</td>
    <td class="assessment-description">Parallel algorithm implementation</td>
  </tr>
  <tr>
    <td class="assessment-type">Final Exam</td>
    <td class="assessment-weight">50%</td>
    <td class="assessment-due">Exam Period</td>
    <td class="assessment-description">Comprehensive written exam</td>
  </tr>
</table>
</body>
</html>
"""
