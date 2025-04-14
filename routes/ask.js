const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const { requireLogin } = require('../utils/middleware');
const dotenv = require('dotenv');
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

router.get('/ask', requireLogin, (req, res) => {
    res.render('ask', { answer: null, chatHistory: req.session.chatHistory || []});
});

router.post('/ask', requireLogin, async (req, res) => {
    const question = req.body.question;
  
    try {
      const embedRes = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: question
      });
  
      const queryVector = embedRes.data[0].embedding;
  
      const result = await index.query({
        vector: queryVector,
        topK: 5,
        includeMetadata: true
      });
  
      const topChunks = result.matches.map(match => match.metadata.text);
  
      // Get chat history from session
      req.session.chatHistory ||= [];
  
      // Build full context with memory
      const historyContext = req.session.chatHistory
        .slice(-5) // last 5 exchanges
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

  -- just get straight to the point, don't say things like "Based on the document" or things like "based on provided".
  `;
  
      const chatRes = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }]
      });
  
      const answer = chatRes.choices[0].message.content;
  
      // Save to session memory
      req.session.chatHistory.push({ q: question, a: answer });
  
      res.render('ask', { answer, chatHistory: req.session.chatHistory });
  
    } catch (err) {
      console.error(err);
      res.render('ask', { answer: 'Sorry, something went wrong!' });
    }
});
  

module.exports = router;