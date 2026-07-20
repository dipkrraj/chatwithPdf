import logging
import os
import time
from typing import List, Optional
import numpy as np
import httpx
from app.core.config import settings

logger = logging.getLogger("app")

# BGE models require a special query prefix for best retrieval performance
BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
MODEL_NAME = settings.embedding_model

_local_model = None


def load_model():
    """Load local SentenceTransformer model on-demand only (lazy import to save memory)."""
    global _local_model
    if _local_model is None:
        logger.info("Loading embedding model locally: %s (this will consume RAM...)", MODEL_NAME)
        # Import sentence_transformers only here to avoid importing torch in serverless/low-RAM mode
        from sentence_transformers import SentenceTransformer
        _local_model = SentenceTransformer(MODEL_NAME)
        logger.info("Local embedding model loaded successfully")
    return _local_model


class EmbeddingService:

    def __init__(self):
        self.use_hf = settings.use_hf_embeddings
        self.hf_token = settings.hf_token or os.environ.get("HF_TOKEN")
        self.hf_api_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{MODEL_NAME}"

    def _normalize(self, vectors: List[List[float]]) -> List[List[float]]:
        """L2-normalize vectors so cosine similarity works correctly."""
        arr = np.array(vectors)
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1, norms)  # avoid division by zero
        return (arr / norms).tolist()

    def _embed_via_hf(self, texts: List[str]) -> List[List[float]]:
        """Call Hugging Face Serverless Inference API to embed texts."""
        headers = {}
        if self.hf_token:
            headers["Authorization"] = f"Bearer {self.hf_token}"

        logger.info("Requesting embeddings from Hugging Face Inference API for %d texts...", len(texts))
        
        max_retries = 5
        delay = 4.0
        
        for attempt in range(max_retries):
            try:
                response = httpx.post(
                    self.hf_api_url,
                    headers=headers,
                    json={"inputs": texts, "options": {"wait_for_model": True}},
                    timeout=60.0
                )
                if response.status_code == 200:
                    result = response.json()
                    # HF sometimes returns a 1D array if only one text is passed, wrap it if so
                    if isinstance(result, list) and len(result) > 0 and not isinstance(result[0], list):
                        return [result]
                    return result
                elif response.status_code == 503:
                    logger.warning("Hugging Face model loading (503). Retrying in %.1fs...", delay)
                    time.sleep(delay)
                    delay *= 1.5
                else:
                    logger.error("Hugging Face API returned error status %d: %s", response.status_code, response.text)
                    response.raise_for_status()
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error("Hugging Face Inference API failed after %d retries: %s", max_retries, e)
                    raise
                time.sleep(delay)
                delay *= 1.5

        raise Exception("Failed to retrieve embeddings from Hugging Face Inference API.")

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Batch embed a list of text chunks."""
        if self.use_hf:
            try:
                vectors = self._embed_via_hf(texts)
                return self._normalize(vectors)
            except Exception as e:
                logger.warning("Hugging Face embeddings failed, falling back to local: %s", e)
                # Fallback to local
        
        # Local SentenceTransformer embedding
        model = load_model()
        vectors = model.encode(texts, batch_size=32, show_progress_bar=False, convert_to_numpy=True)
        vectors_list = vectors.tolist() if hasattr(vectors, "tolist") else list(vectors)
        return self._normalize(vectors_list)

    def embed_query(self, query: str) -> List[float]:
        """Embed a single query text."""
        prefixed = BGE_QUERY_PREFIX + query if MODEL_NAME.lower().startswith("baai/bge") else query
        
        if self.use_hf:
            try:
                vectors = self._embed_via_hf([prefixed])
                return self._normalize(vectors)[0]
            except Exception as e:
                logger.warning("Hugging Face embedding query failed, falling back to local: %s", e)
                # Fallback to local

        model = load_model()
        vector = model.encode([prefixed], convert_to_numpy=True)
        vector_list = vector.tolist() if hasattr(vector, "tolist") else list(vector)
        return self._normalize(vector_list)[0]


embedding_service = EmbeddingService()
