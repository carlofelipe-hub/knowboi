const express = require('express'); // server framework
const session = require('express-session'); // handle login sessions
const dotenv = require('dotenv'); // loads env
const path = require('path'); // handle file paths

// Load env
dotenv.config();

const app = express(); // initialize express
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs'); // tells express to use ejs template to render html
app.set('views', path.join(__dirname, 'views'));

// Parses form data (like from login or upload forms)
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// sessions
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// homepage route
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('home', { username: req.session.user.username });
});

const authRoutes = require('./routes/auth');
app.use(authRoutes);

const uploadRoutes = require('./routes/upload');
app.use(uploadRoutes);

const askRoutes = require('./routes/ask');
app.use(askRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
