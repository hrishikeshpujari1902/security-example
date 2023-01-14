const fs = require('fs');
const https = require('https');
const path = require('path');
const helmet = require('helmet')
const express = require('express');
const passport = require('passport');
const cookieSession = require('cookie-session');

const { Strategy } = require('passport-google-oauth20');

require('dotenv').config();
const config = {
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    COOKIE_KEY_1: process.env.COOKIE_KEY_1,
    COOKIE_KEY_2: process.env.COOKIE_KEY_2
}
const PORT = 3000;
const AUTH_OPTIONS = {
    callbackURL: '/auth/google/callback',
    clientID: config.CLIENT_ID,
    clientSecret: config.CLIENT_SECRET,

};
function verifyCallback(accessToken, refreshToken, profile, done) {
    console.log('Google Profile', profile);
    done(null, profile);

}
passport.use(new Strategy(AUTH_OPTIONS, verifyCallback));

//Save the session to the cookie
// called after verifyCallback
passport.serializeUser((user, done) => {
    done(null, user.id);
});
// Read the session from cookie
passport.deserializeUser((id, done) => {
    //can do db lookups and access persmissions
    done(null, id);
});
const app = express();

app.use(helmet());
app.use(cookieSession({
    name: 'session',
    maxAge: 24 * 60 * 60 * 1000,
    keys: [config.COOKIE_KEY_1, config.COOKIE_KEY_2]
}))
app.use(passport.initialize());
app.use(passport.session());// it puts in req.user






function checkLoggedIn(req, res, next) {
    console.log(req.user);
    const isLoggedIn = req.isAuthenticated() && req.user;
    if (!isLoggedIn) {
        return res.status(401).json({
            error: 'You must Log in!',
        })
    }
    next();
}
app.get('/auth/google', passport.authenticate('google', {
    scope: ['email', 'profile']
}),);

app.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/failure',
    successRedirect: '/',
    session: true,


}),
    (req, res) => {
        console.log('Google called us back');
    });

app.get('/auth/logout', (req, res) => {
    // removes req.user and clears any logged in session
    req.logOut();
    return res.redirect('/');

});
app.get('failure', (req, res) => {
    return res.send('Failed to log in!');

});



app.get('/secret', checkLoggedIn, (req, res) => {
    return res.send(`Your personal secret is ${req.user}`);

});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));

});

https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, app).listen(PORT, () => {
    console.log(`Listening to ${PORT}...`);
});