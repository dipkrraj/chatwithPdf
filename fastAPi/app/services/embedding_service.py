import logging
from typing import List, Optional

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger("app")

# BGE models require a special query prefix for best retrieval performance
BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
from app.core.config import settings

MODEL_NAME = settings.embedding_model
_model: Optional[SentenceTransformer] = None


def load_model() -> SentenceTransformer:
    """Load model once and reuse — called during app startup."""
    global _model
    if _model is None:
        logger.info("Loading embedding model: %s (this may take a moment...)", MODEL_NAME)
        _model = SentenceTransformer(MODEL_NAME)
        logger.info("Embedding model loaded successfully")
    return _model


class EmbeddingService:

    def _normalize(self, vectors: np.ndarray) -> List[List[float]]:
        """L2-normalize vectors so cosine similarity works correctly."""
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1, norms)  # avoid division by zero
        return (vectors / norms).tolist()

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Batch embed a list of text chunks.
        Used when indexing PDF chunks — no query prefix needed.
        """
        model = load_model()
        vectors = model.encode(texts, batch_size=32, show_progress_bar=False, convert_to_numpy=True)
        return self._normalize(vectors)

    def embed_query(self, query: str) -> List[float]:
        """
        Embed a single user query with the BGE query prefix.
        This significantly improves retrieval quality for BGE models.
        """
        model = load_model()
        prefixed = BGE_QUERY_PREFIX + query if MODEL_NAME.lower().startswith("baai/bge") else query
        vector = model.encode([prefixed], convert_to_numpy=True)
        return self._normalize(vector)[0]


embedding_service = EmbeddingService()
