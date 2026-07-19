import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from groq import Groq
from sqlalchemy.orm import Session

from app.core.config import settings
from app.exceptions.handlers import LLMError
from app.repositories.chat_repository import chat_repository
from app.services.chroma_service import chroma_service
from app.services.embedding_service import embedding_service

logger = logging.getLogger("app")

_groq_client: Optional[Groq] = None


def get_groq_client() -> Groq:
    """Singleton Groq client."""
    global _groq_client
    if _groq_client is None:
        if not settings.groq_api_key:
            raise LLMError("GROQ_API_KEY is not configured in environment")
        _groq_client = Groq(api_key=settings.groq_api_key)
    return _groq_client


class RAGService:

    def _build_system_prompt(self) -> str:
        return (
            "You are a helpful assistant that answers questions about PDF documents. "
            "You will be given relevant context extracted from the document. "
            "Answer clearly and concisely based ONLY on the provided context. "
            "If the context does not contain enough information to answer, say so honestly. "
            "Always mention which page numbers you found the information on."
        )

    def _build_context_block(self, search_results: dict) -> Tuple[str, List[Dict]]:
        """
        Format Chroma search results into a readable context block for the LLM,
        and extract source info for the response.
        """
        documents = search_results.get("documents", [[]])[0]
        metadatas = search_results.get("metadatas", [[]])[0]

        if not documents:
            return "No relevant context found in the document.", []

        context_parts = []
        sources = []

        for i, (doc, meta) in enumerate(zip(documents, metadatas), 1):
            page_num = meta.get("page_number", "?")
            chunk_id = meta.get("chunk_index", i)
            context_parts.append(f"[Excerpt {i} — Page {page_num}]\n{doc}")
            sources.append({
                "chunk_id": f"pdf_{meta.get('pdf_id')}_chunk_{chunk_id}",
                "page_number": page_num,
                "text_preview": doc[:100] + "..." if len(doc) > 100 else doc,
            })

        return "\n\n".join(context_parts), sources

    def _build_messages(
        self,
        question: str,
        context: str,
        history: List[Any],
    ) -> List[dict]:
        """
        Build the message list for Groq:
        [system] → [last N conversation messages] → [new user message with context]
        """
        messages = [{"role": "system", "content": self._build_system_prompt()}]

        # Add recent conversation history for memory
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})

        # New user message with retrieved context
        user_content = (
            f"Context from the document:\n\n{context}\n\n"
            f"Question: {question}"
        )
        messages.append({"role": "user", "content": user_content})
        return messages

    def answer(self, db: Session, pdf_id: int, user_id: int, question: str) -> dict:
        """
        Full RAG pipeline:
        1. Embed the user question
        2. Semantic search in Chroma (filtered by pdf_id)
        3. Get last 5 chat messages as conversation memory
        4. Build prompt and call Groq LLM
        5. Save user + assistant messages to SQLite
        6. Return answer + source pages
        """
        # Step 1: Embed question
        query_embedding = embedding_service.embed_query(question)

        # Step 2: Semantic search in Chroma
        search_results = chroma_service.semantic_search(
            pdf_id=pdf_id,
            query_embedding=query_embedding,
            n_results=5,
        )

        # Step 3: Format context and extract sources
        context, sources = self._build_context_block(search_results)

        # Step 4: Get recent chat history (conversation memory)
        history = chat_repository.get_recent(db, pdf_id=pdf_id, n=5)

        # Step 5: Build messages for LLM
        messages = self._build_messages(question, context, history)

        # Step 6: Call Groq
        try:
            # Check if API key is not configured or is a placeholder
            if not settings.groq_api_key or "your-groq-api-key" in settings.groq_api_key:
                raise ValueError("Groq API key is not configured or is a placeholder")

            client = get_groq_client()
            completion = client.chat.completions.create(
                model=settings.groq_model,
                messages=messages,
                temperature=0.2,
                max_tokens=1024,
            )
            answer_text = completion.choices[0].message.content
            logger.info("Groq answered for pdf_id=%d, tokens_used=%d", pdf_id, completion.usage.total_tokens)
        except Exception as exc:
            logger.warning("Groq API call failed or not configured, falling back to local template response: %s", exc)
            if context and context != "No relevant context found in the document.":
                answer_text = (
                    "⚠️ **[Local Fallback Mode — Groq API Key is Missing/Invalid]**\n\n"
                    "Here are the relevant excerpts matching your query found in the document:\n\n"
                    f"{context}\n\n"
                    "*(To receive synthesized answers from Llama-3, please configure a valid `GROQ_API_KEY` in your `.env` file.)*"
                )
            else:
                answer_text = (
                    "⚠️ **[Local Fallback Mode — Groq API Key is Missing/Invalid]**\n\n"
                    "I could not find any matching text chunks in this document for your query.\n\n"
                    "*(Please configure a valid `GROQ_API_KEY` in your `.env` file to enable Groq LLM reasoning.)*"
                )

        # Step 7: Save messages to SQLite
        chat_repository.save_message(
            db, pdf_id=pdf_id, user_id=user_id, role="user", content=question
        )
        assistant_msg = chat_repository.save_message(
            db,
            pdf_id=pdf_id,
            user_id=user_id,
            role="assistant",
            content=answer_text,
            source_chunks=sources,
        )

        return {
            "id": assistant_msg.id,
            "role": "assistant",
            "content": answer_text,
            "source_chunks": sources,
            "created_at": assistant_msg.created_at,
        }


rag_service = RAGService()
