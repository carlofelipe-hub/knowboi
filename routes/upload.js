const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { requireLogin } = require('../utils/middleware');
const { embedAndStore } = require('../utils/embed_and_store');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

const db = new sqlite3.Database('./database.sqlite');

router.get('/upload', requireLogin, (req, res) => {
    res.render('upload', { error: null, success: null });
});

router.post('/upload', requireLogin, upload.single('file'), (req, res) => {
    const file = req.file;

    if (!file || path.extname(file.originalname) !== '.txt') {
        return res.render('upload', { error: 'Only .txt files allowed', success: null});
    }

    const content = fs.readFileSync(file.path, 'utf-8');
    const uploader = req.session.user.username;
    const timestamp = new Date().toISOString();

    db.run(
        'INSERT INTO documents (filename, content, uploader, uploaded_at) VALUES (?, ?, ?, ?)',
        [file.filename, content, uploader, timestamp], 
        async (err) => {
            if (err) {
                console.error(err);
                return res.render('upload', { error: 'DB error', success: null });
            }

            try {
                await embedAndStore(file.filename, content);
                res.render('upload', { error: null, success: 'File uploaded and embedded successfully!' });
            } catch (embedErr) {
                console.error('Embedding error', embedErr);
                res.render('upload', { error: 'File saved but embedding failed!', sucess: null });
            }
        }
    )
});

module.exports = router;