const OpenAI = require("openai");
const { Pinecone } = require('@pinecone-database/pinecone');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// embedding from openai

async function getEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("OpenAI Embedding Error:", error);
    return null;
  }
}


// ✂️ Split text into chunks (~500 chars each)
function splitIntoChunks(text, maxLength = 500) {

    const paragraphs = text.split('\n').filter(Boolean);
    const chunks = [];
    let currentChunk = '';
  
    for (const para of paragraphs) {
      if ((currentChunk + para).length > maxLength) {
        chunks.push(currentChunk.trim());
        currentChunk = para;

      } else {
        currentChunk += ' ' + para;
      }

    }
  
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
  
    return chunks;
  }

async function embedAndStore(filename, textContent) {
    
    const chunks = splitIntoChunks(textContent, 500);

    const vectors = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await getEmbedding(chunk);
      if (!embedding) continue; // skip nulls
      vectors.push({
          id: `${filename}_${i}`,
          values: embedding,
          metadata: {
          text: chunk,
          source: filename
    }
  });
}


    await index.upsert(vectors);
    console.log(`✅ Uploaded ${vectors.length} chunks from ${filename} to Pinecone`);

}

module.exports = { embedAndStore };
