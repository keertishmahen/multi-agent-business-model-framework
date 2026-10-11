# Business Model Studio RAG + MIA backend — FastAPI + persistent Chroma
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencies first so code edits do not invalidate the wheel layer.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY scripts ./scripts

# Chroma's persistent directory. Mount an Azure Files volume here in Container
# Apps — without it the knowledge base is lost on every restart.
ENV CHROMA_PATH=/data/chroma
RUN mkdir -p /data/chroma

# Container Apps sets PORT; default matches local dev.
ENV PORT=3002
EXPOSE 3002

# Run as non-root, and make sure it owns the volume mount point.
RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /data /app
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os,urllib.request;urllib.request.urlopen(f'http://127.0.0.1:{os.getenv(\"PORT\",\"3002\")}/api/health').read()" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-3002}"]
