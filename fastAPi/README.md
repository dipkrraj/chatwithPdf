# AI PDF Chat — Backend API

> **Upload PDFs. Ask questions. Get AI-powered answers with source references.**

A production-grade **RAG (Retrieval Augmented Generation)** backend built with FastAPI, Chroma Cloud, Groq LLM, and SentenceTransformers.

---

## Architecture

```
User Request
     │
     ▼
FastAPI Router  (/api/v1/)
     │
     ├── Auth Router     → JWT auth, refresh tokens, logout
     ├── PDF Router      → Upload, list, status, delete
     └── Chat Router     → RAG query, history, clear
          │
          ├── PDFService
          │     ├── PyMuPDF         (page-wise text extraction)
          │     ├── RecursiveCharacterTextSplitter  (chunking)
          │     └── EmbeddingService (BAAI/bge-base-en-v1.5)
          │                          └── ChromaService (upsert)
          │
          └── RAGService
                ├── EmbeddingService (embed query)
                ├── ChromaService    (semantic search by pdf_id)
                ├── ChatRepository   (conversation memory)
                └── Groq LLM         (llama-3.3-70b-versatile)

SQLite ←→ Repositories ←→ Models (User, PDF, Chat, RefreshToken)
Chroma Cloud ←→ ChromaService (768-dim embeddings, cosine similarity)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI |
| Relational DB | SQLite (→ Neon Postgres later) |
| Migrations | Alembic |
| Vector DB | Chroma Cloud |
| Embedding Model | BAAI/bge-base-en-v1.5 (SentenceTransformers) |
| LLM | Groq (llama-3.3-70b-versatile) |
| PDF Parsing | PyMuPDF (fitz) |
| Chunking | langchain-text-splitters |
| Auth | JWT (access + refresh tokens) + bcrypt |
| Tests | pytest + httpx + pytest-cov |

---

## Setup

### 1. Clone & create virtual environment
```bash
cd fastAPi
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp .env.example app/.env
# Edit app/.env with your actual keys
```

Required keys in `app/.env`:
- `SECRET_KEY` — run `openssl rand -hex 32` to generate
- `GROQ_API_KEY` — from [console.groq.com](https://console.groq.com)
- `CHROMA_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE` — from [trychroma.com](https://trychroma.com)

### 3. Run database migrations
```bash
alembic upgrade head
```

### 4. Start the server
```bash
uvicorn app.main:app --reload
```

API is now running at **http://localhost:8000**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login → access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Rotate refresh token |
| POST | `/api/v1/auth/logout` | Revoke refresh token |
| GET | `/api/v1/auth/me` | Get current user |

### PDFs
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/pdfs/upload` | Upload PDF (202 Accepted, processed in background) |
| GET | `/api/v1/pdfs/` | List user's PDFs (paginated) |
| GET | `/api/v1/pdfs/{id}` | Get PDF details + status |
| DELETE | `/api/v1/pdfs/{id}` | Delete PDF + Chroma chunks |

### Chat
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/chat/` | Ask a question (RAG) |
| GET | `/api/v1/chat/history/{pdf_id}` | Get chat history (paginated) |
| DELETE | `/api/v1/chat/history/{pdf_id}` | Clear chat history |

---

## Postman Collection

Import `pdf_chat_api_collection.json` into Postman:
- Tokens are **auto-saved** after login
- `pdf_id` is **auto-saved** after upload
- All endpoints have pre-written test assertions
- Bearer auth is **auto-injected** at collection level

---

## Running Tests

```bash
# Run all tests with coverage
pytest tests/ -v --cov=app --cov-report=term-missing

# Run specific test file
pytest tests/test_auth.py -v

# Generate HTML coverage report
pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html
```

---

## Database Migrations (Alembic)

```bash
# Apply all migrations
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "description of change"

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

---

## Project Structure

```
fastAPi/
├── alembic/                  ← DB migrations
│   └── versions/
├── app/
│   ├── core/
│   │   ├── config.py         ← All settings (pydantic-settings)
│   │   └── security.py       ← JWT + bcrypt
│   ├── database/             ← SQLAlchemy engine + session
│   ├── dependencies/
│   │   └── auth.py           ← get_current_user() dependency
│   ├── exceptions/
│   │   └── handlers.py       ← Custom exception handlers
│   ├── middleware/
│   │   └── logging_middleware.py
│   ├── models/               ← SQLAlchemy ORM models
│   ├── repositories/         ← DB CRUD operations
│   ├── routers/              ← API endpoints (/api/v1/)
│   ├── schemas/              ← Pydantic request/response models
│   ├── services/             ← RAG pipeline business logic
│   └── main.py               ← App entry point
├── tests/
│   ├── conftest.py           ← Fixtures + mocks
│   ├── test_auth.py
│   ├── test_pdf.py
│   └── test_chat.py
├── .env.example
├── requirements.txt
├── pdf_chat_api_collection.json  ← Postman collection
└── README.md
```

---

## Roadmap

- [ ] Neon Postgres + pgvector (replace SQLite + Chroma)
- [ ] SSE streaming responses (token-by-token)
- [ ] PDF thumbnail generation
- [ ] Rate limiting per user
- [ ] Docker + docker-compose setup
- [ ] GitHub Actions CI/CD
- [ ] Frontend (React/Next.js)
