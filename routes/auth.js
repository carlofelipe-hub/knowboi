const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const { hashPassword, comparePassword } = require('../utils/auth');
const { Database } = require('sqlite3');

const db = new sqlite3.Database('./database.sqlite');

// GET: Show login form
router.get('/login', (req, res) => { 
   res.render('login', { error: null });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err) return res.render('login', { error: 'Database error' });
        if (!user) return res.render('login', { error: 'Invalid username or password' });

        const match = await comparePassword(password, user.password);
        if (!match) return res.render('login', { error: 'Invalid username or password'});

        req.session.user = {
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin
        };
        res.redirect('/');
    })
});

// GET: Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login')); // destroys session
});

module.exports = router;