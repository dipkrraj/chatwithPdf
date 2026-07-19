import logging
from typing import List, Optional

import chromadb

from app.core.config import settings
from app.exceptions.handlers import ChromaDBError

logger = logging.getLogger("app")

_client: Optional[chromadb.ClientAPI] = None


def get_chroma_client() -> chromadb.ClientAPI:
    """Singleton Chroma CloudClient — initialized once at startup."""
    global _client
    if _client is None:
        try:
            _client = chromadb.CloudClient(
                tenant=settings.chroma_tenant,
                database=settings.chroma_database,
                api_key=settings.chroma_api_key,
            )
            logger.info("Chroma Cloud client initialized successfully")
        except Exception as exc:
            logger.error("Failed to initialize Chroma client: %s", exc)
            raise ChromaDBError(str(exc)) from exc
    return _client


class ChromaService:

    def get_collection(self):
        """Get or create the shared pdf_chunks collection."""
        client = get_chroma_client()
        try:
            return client.get_or_create_collection(
                name=settings.chroma_collection,
                metadata={"hnsw:space": "cosine"},  # use cosine similarity
            )
        except Exception as exc:
            raise ChromaDBError(f"Cannot access collection: {exc}") from exc

    def add_chunks(
        self,
        pdf_id: int,
        chunk_ids: List[str],
        texts: List[str],
        embeddings: List[List[float]],
        metadatas: List[dict],
    ) -> None:
        """Store chunks with their embeddings and metadata in Chroma."""
        collection = self.get_collection()
        try:
            collection.upsert(
                ids=chunk_ids,
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas,
            )
            logger.info("Stored %d chunks for pdf_id=%d in Chroma", len(chunk_ids), pdf_id)
        except Exception as exc:
            raise ChromaDBError(f"Failed to add chunks: {exc}") from exc

    def semantic_search(
        self,
        pdf_id: int,
        query_embedding: List[float],
        n_results: int = 5,
    ) -> dict:
        """
        Query Chroma for the top-N most semantically similar chunks
        filtered to a specific PDF.
        """
        collection = self.get_collection()
        try:
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where={"pdf_id": str(pdf_id)},
                include=["documents", "metadatas", "distances"],
            )
            return results
        except Exception as exc:
            raise ChromaDBError(f"Semantic search failed: {exc}") from exc

    def delete_by_pdf_id(self, pdf_id: int) -> None:
        """Delete all chunks associated with a given PDF from Chroma."""
        collection = self.get_collection()
        try:
            collection.delete(where={"pdf_id": str(pdf_id)})
            logger.info("Deleted all chunks for pdf_id=%d from Chroma", pdf_id)
        except Exception as exc:
            raise ChromaDBError(f"Failed to delete chunks: {exc}") from exc


chroma_service = ChromaService()
