FROM python:3.12-slim

# Keep Python output predictable
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system build deps (minimal) required by some Python packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      gcc \
      libffi-dev \
      libssl-dev \
      build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install Python deps (use --no-cache-dir to keep image small)
RUN pip install --no-cache-dir -r requirements.txt

# Copy app sources
COPY . .

# Create a non-root user for running the app
RUN useradd -m appuser && chown -R appuser /app

USER appuser

EXPOSE 8000

# Keep single worker for SQLite; in prod use a proper DB and increase workers
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]