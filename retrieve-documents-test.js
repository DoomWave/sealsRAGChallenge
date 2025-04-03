import { getQueryResults } from './retrieve-documents.js';
import dotenv from 'dotenv';
dotenv.config()

async function run() {
    try {
        const query = "AI Technology";
        const documents = await getQueryResults(query);

        documents.forEach( doc => { //it shows the relevant documents after get the results
            console.log(doc);
        }); 
    } catch (err) {
        console.log(err.stack);
    }
}
run().catch(console.dir);
