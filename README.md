# DverseAI — Chat with Your Documents 🚀

DverseAI is a high-fidelity, production-ready SaaS landing page and full-stack Retrieval-Augmented Generation (RAG) application. It allows users to upload documents once, query them in natural language, and retrieve accurate answers backed by exact page references and citations.

---

## 🎨 Key Features

- **Split Workspace Layout**: Left-aligned file manager and upload dropzone, coupled with a spacious right-aligned chat canvas.
- **Dynamic File Processing Pipeline**: Watch document indexing stages change in real-time (`Parsing text (1/3)` ➡️ `Vectorizing content (2/3)` ➡️ `Storing in database (3/3)`).
- **Google OAuth SSO Integration**: One-click Google login that automatically syncs and displays your Google profile picture inside the chat bubbles.
- **Sleek landing page**: Marketing layout complete with feature lists, visual steps guides, open-source GitHub references, and interactive auth overlays.
- **Page references**: Bot answers display passive, clickable page references backlinked to source files.
- **Robust caching & session rotation**: Seamless token refresh flow keeps you logged in securely.

---

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI (lifespan configs, CORS)
- **Database**: SQLite with SQLAlchemy ORM & Alembic migrations
- **Embeddings**: Local `BAAI/bge-base-en-v1.5` SentenceTransformers (running on CPU/GPU)
- **Vector DB**: Chroma Cloud Client
- **Orchestration / RAG**: Custom LangChain-like RAG pipeline with Groq API integration (Llama-3.3-70b-versatile)

### Frontend
- **Framework**: Vite React
- **Styling**: Tailwind CSS v4 with custom animations
- **State Management**: TanStack Query (React Query)
- **Transitions**: Framer Motion

---

## 📂 Repository Structure

```
chatWithPdf/
├── fastAPi/              # FastAPI Backend API Server
│   ├── app/              # Source code directory
│   ├── alembic/          # Database migrations
│   ├── tests/            # Pytest testing suite
│   ├── Dockerfile        # Container specifications
│   └── requirements.txt  # Python package list
│
├── frontEnd/             # Vite React Client
│   ├── src/              # Components and assets
│   ├── public/           # Static asset assets
│   ├── Dockerfile        # Container specifications
│   └── package.json      # Node package list
│
├── .github/workflows/    # CI/CD pipelines
├── .gitignore            # Workspace ignore lists
├── .env.example          # Template environment configurations
└── README.md             # Project documentation (this file)
```

---

## ⚡ Local Setup & Execution

### Prerequisites
- Python 3.9+
- Node.js 18+
- Groq Cloud API Key
- Google OAuth Client credentials (ID & secret)

---

### 1. Setup Backend Server

1. Navigate to the backend directory:
   ```bash
   cd fastAPi
   ```

2. Create a virtual environment and activate it:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables. Copy `.env.example` to `app/.env`:
   ```bash
   cp .env.example app/.env
   ```
   *Open `app/.env` and update your `GROQ_API_KEY`, `GOOGLE_CLIENT_ID`, and Chroma credentials.*

5. Run database migrations to apply schemas:
   ```bash
   alembic upgrade head
   ```

6. Start Uvicorn development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   *Server runs at: http://localhost:8000. API docs at: http://localhost:8000/docs*

---

### 2. Setup Frontend Client

1. Navigate to the frontend directory:
   ```bash
   cd ../frontEnd
   ```

2. Install Node modules:
   ```bash
   npm install
   ```

3. Configure environment variables. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *Open `.env` and set `VITE_GOOGLE_CLIENT_ID` matching your credentials.*

4. Launch Vite development server:
   ```bash
   npm run dev
   ```
   *Client runs at: http://localhost:5173*

---

## 🐳 Docker Deployment

You can containerize both applications.

### Run Backend Container
```bash
cd fastAPi
docker build -t dverseai-backend .
docker run -p 8000:8000 --env-file app/.env dverseai-backend
```

### Run Frontend Container
```bash
cd ../frontEnd
docker build -t dverseai-frontend .
docker run -p 80:80 dverseai-frontend
```

---

## 🧪 Running Tests

Verify code correctness using the python mock unit tests suite:
```bash
cd fastAPi
source .venv/bin/activate
pytest tests/ -v --cov=app
```
*(All 32 tests covering auth, files, and chat RAG routes will execute with full coverage statistics output).*

---

## 🚀 CI/CD Pipeline

A GitHub Actions pipeline is set up in `.github/workflows/ci.yml`. On every `push` or `pull_request` to `main`, it will automatically:
1. Run backend unit tests using pytest.
2. Build the frontend client with Vite to check for compilation warnings and static asset errors.
