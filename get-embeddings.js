import { pipeline } from '@xenova/transformers';
import dotenv from 'dotenv';
dotenv.config()

// export async function getEmbedding(data) {
//     const embedder = await pipeline(
//         'feature-extraction', 
//         'Xenova/nomic-embed-text-v1');
//     const results = await embedder(data, { pooling: 'mean', normalize: true });
//     return Array.from(results.data);
// }

export async function getEmbedding(text) {
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    const embeddings = await embedder(text, { pooling: 'mean', normalize: true})
    return embeddings.data;
}