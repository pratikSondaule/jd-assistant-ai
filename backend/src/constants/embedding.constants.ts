// Must match your embedding model's output size.
// nomic-embed-text = 768 natively. Gemini: request 768 via outputDimensionality.
// Changing this later means re-embedding everything.
export const EMBEDDING_DIMENSIONS = 768;
