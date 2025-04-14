[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://www.linkedin.com/in/carlofelipe/)

# KnowBoi 🧠📚

KnowBoi is a simple knowledge base assistant built with Node.js, Express, EJS, and OpenAI. Upload `.txt` files, ask natural language questions, and get intelligent answers using vector search powered by Pinecone.

---

## 🚀 Features

- User authentication system (login only)
- Upload `.txt` files for embedding
- Text chunking and semantic vector generation (OpenAI)
- Vector storage and retrieval via Pinecone
- Chat interface with memory (session-based Q&A history)
- Clean pastel/minimal UI (no Tailwind 😤)
- SQLite for quick prototyping (non-persistent on Render)

---

## 🧑‍💻 Setup Instructions

### 1. Clone the project

```bash
git clone https://github.com/your-username/knowboi.git
cd knowboi
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a `.env` file

```env
OPENAI_API_KEY=your_openai_key
SESSION_SECRET=random_session_secret
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=your_pinecone_env
PINECONE_INDEX_NAME=your_index_name
```

### 4. Initialize the SQLite DB

```bash
node utils/init_db.js
```

### 5. Run the app

```bash
npm run dev
```

Then visit: [http://localhost:3000](http://localhost:3000)

---

## ☁️ Deploying to Render

- Push your repo to GitHub
- Create a new Web Service on [Render](https://render.com)
- Set the Start Command to `node app.js`
- Add your `.env` variables in the dashboard
- Include a `.render-build.sh` file with:

```sh
npm install --build-from-source sqlite3
```

> SQLite will not persist data on Render’s free tier.

---

## 📁 Folder Structure

```
knowboi/
├── app.js
├── routes/
│   ├── auth.js
│   ├── upload.js
│   └── ask.js
├── utils/
│   ├── embed_and_store.js
│   ├── middleware.js
│   └── init_db.js
├── views/
│   ├── login.ejs
│   ├── upload.ejs
│   ├── ask.ejs
│   └── home.ejs
├── uploads/
└── database.sqlite
```

---

## 🙏 Credits

Built with love by Carlo 😎
