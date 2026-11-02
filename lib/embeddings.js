const globalForEmbeddings = globalThis;

async function getExtractor() {
  if (!globalForEmbeddings.featureExtractor) {
    const { pipeline } = await import('@xenova/transformers');
    globalForEmbeddings.featureExtractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return globalForEmbeddings.featureExtractor;
}

export async function getEmbedding(text) {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  const arr = Array.from(output.data);
  if (arr.length !== 384) {
    throw new Error(`Expected embedding length 384, received ${arr.length}`);
  }
  return arr;
}

export function toVectorLiteral(arr) {
  return '[' + arr.join(',') + ']';
}

