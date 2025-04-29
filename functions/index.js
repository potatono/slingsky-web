// Core imports
const fs = require('fs');
const path = require('path');

const { db, auth, functions } = require('./firebase');
const { host, getOAuthClient, clientMetadata } = require('./oauth');

const { Agent } = require('@atproto/api');

// Express imports
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const handlebars = require('handlebars');

// Express setup
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

handlebars.registerHelper('default', function(value, defaultValue) {
  return value !== undefined ? value : defaultValue;
});
const loginTemplate = handlebars.compile(fs.readFileSync(path.join(__dirname, 'views', 'login.hbs'), 'utf8'));
const homeHemplate = handlebars.compile(fs.readFileSync(path.join(__dirname, 'views', 'home.hbs'), 'utf8'));

app.get('/', (req, res) => {
  res.send(homeHemplate({ host: host }));
});

app.get('/login', (req, res) => {
  if (req.query.return_url) {
    res.cookie('return_url', req.query.return_url);
  }
  
  res.send(loginTemplate({ host: host, error: req.query.error, handle: req.query.handle }));
});

app.get('/client-metadata.json', async (req, res) => {
  res.json(clientMetadata)
});

app.get('/jwks.json', async (req, res) => {
  var client = await getOAuthClient();
  
  var jwks = structuredClone(client.jwks);
  jwks.keys[0].kid = '1';
  
  res.json(jwks) 
});

// Create an endpoint to initiate the OAuth flow
app.post('/login', async (req, res, next) => {
  try {
    const handle = req.body.handle;
    const state = Math.random().toString(36).substring(7);
    console.log("Getting OAuth client for handle:", handle);
    const client = await getOAuthClient();
    console.log("Authorizing");
    const url = await client.authorize(handle, {
      state
    })

    console.log("Redirecting to:", url);
    res.redirect(url)
  } 
  catch (err) {
    console.error('Error during login:', err);
    res.redirect('/login?handle=' + encodeURIComponent(req.body.handle) + '&error=' + encodeURIComponent(err.message));
  }
});

// Create an endpoint to handle the OAuth callback
app.get('/callback', async (req, res, next) => {
  try {
    // Get all the query parameters
    const params = new URLSearchParams(req.url.split('?')[1])
    
    // Handle the callback
    const client = await getOAuthClient();
    const { session, state } = await client.callback(params)

    // Process successful authentication here
    console.log('authorize() was called with state:', state)
    console.log('User authenticated as:', session.did)

    // Get the Bluesky profile of the authenticated user
    const agent = new Agent(session);
    const profile = await agent.getProfile({ actor: agent.did });

    // Store the profile in firebase for later
    await db.collection('profiles').doc(session.did).set(profile.data);

    const likes = await agent.getActorLikes({ actor: agent.did });

    console.log(JSON.stringify(likes.data));
    await db.collection('likes').doc(session.did).set({ result: JSON.stringify(likes.data)});

    // Create a custom token for firebase
    var claims = { 
      handle: profile.data.handle,
      displayName: profile.data.displayName,
      avatar: profile.data.avatar,
      banner: profile.data.banner,
      description: profile.data.description
    };

    var token = await auth.createCustomToken(session.did, claims)

    // Save the firebase token in a cookie
    res.cookie('token', token);

    // Send the user back to where they came from
    if (req.cookies.return_url) {
      // Delete the cookie now that we don't need it anymore
      res.clearCookie('return_url');
      res.redirect(req.cookies.return_url);
    }
    else {
      res.redirect('/');
    }
  } 
  catch (err) {
    next(err)
  }
});

exports._app = app;
exports._express = express;
exports.app = functions.https.onRequest(app);
