const express = require('express');
const router = express.Router();
const { Configuration, OpenAIApi } = require("openai");
const { Pinecone } = require('@pinecone-database/pinecone');
const { requireLogin } = require('../utils/middleware');
const dotenv = require('dotenv');
dotenv.config();

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

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
    // 🧠 Generate embedding using OpenAI
    const embedResponse = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: question,
    });
    const queryVector = embedResponse.data.data[0].embedding;

    // 🔍 Query Pinecone
    const result = await index.query({
      vector: queryVector,
      topK: 5,
      includeMetadata: true,
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
    
       const chatResponse = await openai.createChatCompletion({
      model: "gpt-3.5-turbo", // or "gpt-4" if you're using GPT-4
      messages: [
        ...chatHistory,
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const answer = chatResponse.data.choices[0].message.content;

    req.session.chatHistory.push({ q: question, a: answer });

    // ✅ Return JSON for frontend JS to handle
    res.json({ answer });

  } catch (err) {
    console.error(err);
    res.status(500).json({ answer: 'Something went wrong!' });
  }
});

module.exports = router;