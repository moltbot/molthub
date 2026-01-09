export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

function emptyEmbedding() {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0)
}

export async function generateEmbedding(text: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('OPENAI_API_KEY is not configured; using zero embeddings')
    return emptyEmbedding()
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Embedding failed: ${message}`)
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding: number[] }>
  }
  const embedding = payload.data?.[0]?.embedding
  if (!embedding) throw new Error('Embedding missing from response')
  return embedding
}
