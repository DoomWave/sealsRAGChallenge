import { MongoClient } from 'mongodb';
import { getEmbedding } from './get-embeddings.js';
import dotenv from 'dotenv';
dotenv.config()

// Function to get the results of a vector query
export async function getQueryResults(query) {
    // Connect to your Atlas cluster
    const client = new MongoClient(process.env.ATLAS_CONNECTION_STRING);
    
    try {
        // Get embedding for a query
        const queryEmbedding = await getEmbedding(query); //to get results, getting a question into a embedding to compare in the DataBase
        await client.connect();
        const db = client.db("rag_db");
        const collection = db.collection("test");

        const pipeline = [
            {
                $vectorSearch: {
                    index: "vector_index",
                    queryVector: queryEmbedding, //using the vector
                    path: "embedding", //compared with the query
                    exact: true,
                    limit: 5
                }
            },
            {
                $project: { //this showing the documents with the properties.
                    _id: 0, //true or false = I don't want to see ID
                    document: 1, //this set it ups/I want to see document
                }
            }
        ]; //it retrieve the documents using the query

        // Retrieve documents from Atlas using this Vector Search query
        const result = collection.aggregate(pipeline); //It makes a search

        const arrayOfQueryDocs = []; //empty array
        for await (const doc of result) {
            arrayOfQueryDocs.push(doc); //the results are pass to this array
        }
        return arrayOfQueryDocs;
    } catch (err) {
        console.log(err.stack);
    }
    finally {
        await client.close();
    }
}
