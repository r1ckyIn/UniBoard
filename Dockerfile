FROM python:3.12-slim AS base

WORKDIR /app

# Install uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files first for layer caching
COPY pyproject.toml ./

# Install dependencies (including dev for testing in container)
RUN uv pip install --system --no-cache -e ".[dev]"

# Copy source code
COPY src/ src/
COPY tests/ tests/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "src.web.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
