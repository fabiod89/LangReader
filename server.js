require('dotenv').config();
const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const path = require('path');

const app = express();

// Debug logs for environment variables
console.log('Environment Variables:');
console.log('CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Exists' : 'Missing');
console.log('CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Exists' : 'Missing');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'Exists' : 'Missing');

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Must be false for HTTP (localhost)
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true, // Prevent client-side JS from accessing the cookie
    sameSite: 'lax' // Prevent CSRF attacks
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    proxy: true,
    prompt: 'select_account' // Force account selection
  },
  (accessToken, refreshToken, profile, done) => {
    console.log('Google profile:', profile);
    return done(null, profile);
  }
));

// Serialize/Deserialize User
passport.serializeUser((user, done) => {
  console.log('Serializing user:', user.id);
  done(null, user);
});

passport.deserializeUser((user, done) => {
  console.log('Deserializing user:', user.id);
  done(null, user);
});

// Serve static files (CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.render('layout', {
    title: 'Home',
    user: req.user,
    body: 'home' // Render the home.ejs file
  });
});

app.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) return res.redirect('/');
  res.render('layout', {
    title: 'Profile',
    user: req.user,
    body: 'profile' // Render the profile.ejs file
  });
});

app.get('/about', (req, res) => {
  res.render('layout', {
    title: 'About',
    user: req.user,
    body: 'about' // Render the about.ejs file
  });
});

app.get('/auth/google', (req, res, next) => {
  const prompt = req.query.prompt === 'select_account' ? 'select_account' : 'none';
  passport.authenticate('google', { scope: ['profile', 'email'], prompt })(req, res, next);
});

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    console.log('User logged in:', req.user);
    res.redirect('/');
  }
);

app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) console.error(err);
    req.session.destroy(() => res.redirect('/'));
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));