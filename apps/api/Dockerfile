FROM python:3.12-slim

# ffmpeg for video stills/duration; Pillow, pypdf and pypdfium2 (pip deps below) need no extra
# system libraries — they ship their own or are pure Python.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.9 /uv /uvx /bin/

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project --no-dev
COPY app ./app
COPY log_config.json ./
RUN uv sync --locked --no-dev

ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8080
# Cloud Run sets $PORT; 8080 is the local/default fallback. --log-config makes every log line one
# JSON object (severity, message; never a card's contents), which Cloud Run parses straight into
# a structured Cloud Logging entry.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --log-config log_config.json"]
