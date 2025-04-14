const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Pinecone } = require('@pinecone-database/pinecone');
const { requireLogin } = require('../utils/middleware');
const dotenv = require('dotenv');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

// GET: show ask page
router.get('/ask', requireLogin, (req, res) => {
  res.render('ask', {
    answer: null,
    chatHistory: req.session.chatHistory || []
  });
});

// POST: handle question via AJAX
router.post('/ask', requireLogin, express.json(), async (req, res) => {
  const question = req.body.question;

  try {
      const model = genAI.getModel("models/text-embedding-004");
      const embedResult = await model.embedContent(question);
      const queryVector = embedResult.embedding.values;

    const result = await index.query({
      vector: queryVector,
      topK: 5,
      includeMetadata: true
    });

    const topChunks = result.matches.map(match => match.metadata.text);

    req.session.chatHistory ||= [];

    const historyContext = req.session.chatHistory
      .slice(-5)
      .map((pair, i) => `Q${i + 1}: ${pair.q}\nA${i + 1}: ${pair.a}`)
      .join('\n\n');

    const prompt = `
You are a helpful assistant. Use the following document chunks to answer the latest question.
Always use the provided chunks for accuracy.

Document Chunks:
${topChunks.map((c, i) => `Chunk ${i + 1}: ${c}`).join('\n\n')}

Conversation History:
${historyContext || '[No previous context]'}

Current Question: ${question}

-- just get straight to the point, don't say things like "Based on the document" or "According to the text".
`;
    
    const chatModel = genAI.getModel("models/gemini-2.0-flash");       
    const chat = chatModel.startChat({
        history: req.session.chatHistory.slice(-5).map(h => ({ role: "user", parts: h.q }, { role: "model", parts: h.a })).flat(),  
        generationConfig: {
        maxOutputTokens: 2048,                         
      },
    });    


    const chatResult = await chat.sendMessage(prompt);
    const chatResponse = await chatResult.response;
    const answer = chatResponse.text();

    req.session.chatHistory.push({ q: question, a: answer });

    // ✅ Return JSON for frontend JS to handle
    res.json({ answer });

  } catch (err) {
    console.error(err);
    res.status(500).json({ answer: 'Something went wrong!' });
  }
});

module.exports = router;