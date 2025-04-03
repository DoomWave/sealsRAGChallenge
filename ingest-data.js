// import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
// import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
// import { MongoClient } from 'mongodb';
// import { getEmbedding } from './get-embeddings.js' //function in getting embedding;
// import * as fs from 'fs'; //module to interact in the file systems
// import dotenv from 'dotenv';
// dotenv.config()

// //The RAG is to giving AI a Memory

// const client = new MongoClient(process.env.ATLAS_CONNECTION_STRING)

// export async function run(query) {
//     const client = new MongoClient(process.env.ATLAS_CONNECTION_STRING);
//     await client.connect();

//     try {
//         // Save online PDF as a file
//         const rawData = await fetch("https://investors.mongodb.com/node/12236/pdf"); //PDF Example of MongoDB
//         const pdfBuffer = await rawData.arrayBuffer(); //Buffer helps to process the information for the computer
//         const pdfData = Buffer.from(pdfBuffer);
//         fs.writeFileSync("investor-report.pdf", pdfData); //PDF is passed to be save.

//         const loader = new PDFLoader(`investor-report.pdf`);
//         const data = await loader.load(); //PDF Loader

//         // Chunk the text from the PDF
//         const textSplitter = new RecursiveCharacterTextSplitter({
//             chunkSize: 400,
//             chunkOverlap: 20,
//         });
//         const docs = await textSplitter.splitDocuments(data); //Splitting the documents
//         console.log(`Successfully chunked the PDF into ${docs.length} documents.`);

//         // Connect to your Atlas cluster
//         await client.connect();
//         const db = client.db("rag_db");
//         const collection = db.collection("test");

//         console.log("Generating embeddings and inserting documents...");
//         const insertDocuments = [];
//         await Promise.all(docs.map(async doc => {

//             // Generate embeddings using the function that you defined
//             const embedding = await getEmbedding(doc.pageContent);
            
//             console.log("Embedding created successfully")
//             // Add the document with the embedding to array of documents for bulk insert
//             insertDocuments.push({
//                 document: doc,
//                 embedding: embedding //The Object
//             }); //This run the operation and wait until move to the next section
//         }))

//         // Continue processing documents if an error occurs during an operation
//         const options = { ordered: false };

//         // Insert documents with embeddings into Atlas
//         const result = await collection.insertMany(insertDocuments, options);  
//         console.log("Count of documents inserted: " + result.insertedCount); 

//     } catch (err) {
//         console.log(err.stack);
//     }
//     finally {
//         await client.close();
//     }
// }
// run().catch(console.dir);


import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MongoClient } from 'mongodb';
import { getEmbedding } from './get-embeddings.js'; // Function for getting embeddings
import * as fs from 'fs';
import dotenv from 'dotenv';
import { insert } from "@langchain/community/utils/convex";
dotenv.config();

const client = new MongoClient(process.env.ATLAS_CONNECTION_STRING);

async function insertPDF(pdfPath) {
    await client.connect();
    try{
        if (!fs.existsSync(pdfPath)) {
            console.error(`Error: File '${pdfPath}' not found`)
            return
        }

        console.log(`Processing: ${pdfPath}`)
        const loader = new PDFLoader(pdfPath);
        const data = await loader.load();

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 400,
            chunkOverlap: 20
        })
        const docs = await textSplitter.splitDocuments(data);
        console.log(`successfully chunked '${pdfPath}' into ${docs.length} documents.`)

        const db = client.db("rag_db")
        const collection = db.collection("test")

        console.log("Generating embeddings and inserting documents...");
        const insertDocuments = await Promise.all(docs.map(async (doc)=> {
            const embedding = await getEmbedding(doc.pageContent)
            return { document: doc, embedding: embedding }
        }))

        const result = await collection.insertMany(insertDocuments, { ordered: false});
        console.log(`Inserted ${result.insertedCount} documents from '${pdfPath}'`)
    }catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

// **NEW FUNCTION: Query MongoDB for Relevant Data**
async function queryPDF(query) {
    await client.connect();
    try {
        const db = client.db("rag_db");
        const collection = db.collection("test");

        // Convert query into an embedding
        const queryEmbedding = await getEmbedding(query);
        console.log("Query Embedding:", queryEmbedding)

        // Perform vector search
        const results = await collection.aggregate([
            {
                $vectorSearch: {
                    index: "vector_index",
                    path: "embedding",
                    queryVector: queryEmbedding,
                    numCandidates: 10,
                    limit: 3
                }
            }
        ]).toArray();

        return results;
    } finally {
        await client.close();
    }
}

// **Run Insert or Query Depending on Your Need**
(async () => {
    const mode = process.argv[2];

    if (mode === "insert") {
        await insertPDF("./pdfs/raccoon-en.pdf");
    } else if (mode === "query") {
        const userQuery = process.argv.slice(3).join(" ");
        const results = await queryPDF(userQuery);
        console.log("Query Results:", results);
    } else {
        console.log("Usage: node ingest-data.js insert OR node ingest-data.js query 'your question here'");
    }
})();
