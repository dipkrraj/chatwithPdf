FROM python:3.9-slim

WORKDIR /app

# Install system dependencies needed for compiling python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies list first
COPY requirements.txt .

# Install dependencies (without virtual environment for docker container simplicity)
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY . .

# Expose API port
EXPOSE 8000

# Run Alembic migrations and start FastAPI app
CMD sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"
