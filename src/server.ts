import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as OidcStrategy, Profile, VerifyCallback } from 'passport-openidconnect';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// --- Type Augmentation for Express ---
// This adds the `user` property to the Express Request type.
declare global {
    namespace Express {
        interface User extends Profile {}
    }
}

const app = express();
const port = 3000;

// --- Middleware Setup ---

// Set up view engine
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// Session management setup
// The secret should be a long, random string stored in an environment variable.
app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-secret-key-that-should-be-in-env',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production' // Use secure cookies in production
    }
}));

// Initialize Passport and restore authentication state from the session.
app.use(passport.initialize());
app.use(passport.session());


// --- Passport OIDC Strategy Configuration ---

passport.use('oidc', new OidcStrategy({
    issuer: process.env.ISSUER_URL!,
    authorizationURL: process.env.AUTHORIZATION_URL!, // Can be discovered from issuer
    tokenURL: process.env.TOKEN_URL!,                 // Can be discovered from issuer
    userInfoURL: process.env.USERINFO_URL!,           // Can be discovered from issuer
    clientID: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
    callbackURL: process.env.CALLBACK_URL!,
    scope: 'openid profile email'
}, (issuer: string, profile: Profile, done: VerifyCallback) => {
    // The 'profile' object contains user information from the OIDC provider.
    // In a real app, you would find or create a user in your database here.
    console.log('User profile received:', profile);
    return done(null, profile);
}));


// --- Passport Session Serialization ---

// Stores the user profile in the session.
passport.serializeUser((user, done) => {
    done(null, user);
});

// Retrieves the user profile from the session.
passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
});


// --- Route Definitions ---

// Home page
app.get('/', (req: Request, res: Response) => {
    res.render('index', { user: req.user });
});

// Login route - initiates the OIDC authentication flow.
app.get('/login', passport.authenticate('oidc'));

// Logout route - destroys the session.
app.get('/logout', (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.session.destroy(() => {
            res.redirect('/');
        });
    });
});

// OIDC Provider Callback Route
app.get('/auth/callback',
    passport.authenticate('oidc', {
        failureRedirect: '/error',
        failureMessage: true
    }),
    (req: Request, res: Response) => {
        // Successful authentication, redirect to the profile page.
        res.redirect('/profile');
    }
);

// Middleware to ensure the user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
};

// Protected profile page
app.get('/profile', ensureAuthenticated, (req: Request, res: Response) => {
    res.render('profile', { user: req.user });
});

// Error page
app.get('/error', (req: Request, res: Response) => {
    const messages = (req.session as any).messages || [];
    const errorMessage = messages.length > 0 ? messages.pop() : 'An unknown authentication error occurred.';
    res.render('error', { errorMessage });
});


// --- Start Server ---

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log('Ensure your OIDC provider is configured with the callback URL:');
    console.log(`http://localhost:${port}/auth/callback`);
});
