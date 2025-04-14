const express = require('express');
const router = express.Router();
const OpenAI = require("openai");
const { Pinecone } = require('@pinecone-database/pinecone');
const { requireLogin } = require('../utils/middleware');
const dotenv = require('dotenv');
dotenv.config();

// 🔑 Initialize OpenAI v4
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🌲 Initialize Pinecone
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

// GET: Show Ask page
router.get('/ask', requireLogin, (req, res) => {
  res.render('ask', {
    answer: null,
    chatHistory: req.session.chatHistory || []
  });
});

// POST: Handle question
router.post('/ask', requireLogin, express.json(), async (req, res) => {
  const question = req.body.question;
  console.log("🟢 Question received:", question);

  try {
    // ➕ Generate embedding
    const embedResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: question
    });

    const queryVector = embedResponse.data[0].embedding;
    console.log("📎 Embedding length:", queryVector.length);

    // 🔍 Search Pinecone
    const result = await index.query({
      vector: queryVector,
      topK: 5,
      includeMetadata: true,
    });

    const topChunks = result.matches.map(match => match.metadata.text);
    console.log("📚 Chunks retrieved:", topChunks.length);

    // ✨ Build conversation prompt
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

    // 💬 Chat completion
    const messages = [
      ...req.session.chatHistory.slice(-5).flatMap(pair => [
        { role: "user", content: pair.q },
        { role: "assistant", content: pair.a }
      ]),
      { role: "user", content: prompt }
    ];

    const chatResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // or "gpt-4" if you're using GPT-4
      messages,
      temperature: 0.7,
      max_tokens: 1024
    });

    const answer = chatResponse.choices[0].message.content;
    console.log("✅ Answer generated:", answer);

    // 💾 Save to session
    req.session.chatHistory.push({ q: question, a: answer });

    res.json({ answer });

  } catch (err) {
    console.error("❌ Error in /ask route:", err.response?.data || err.message || err);
    res.status(500).json({ answer: '⚠️ Something went wrong on the server.' });
  }
});

module.exports = router;
