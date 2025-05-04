// Core imports
import { readFileSync } from "fs";
import { join } from "path";

import { db, auth, functions } from "./jr/firebase.js";
import { host, getOAuthClient, clientMetadata } from "./jr/oauth.js";
import { PostCollector, LikeCollector } from "./jr/collector.js";
import { Dashboard } from "./jr/dashboard.js";

import { Agent } from "@atproto/api";

// Express imports
import express from "express";
import bodyParser from "body-parser";
const { urlencoded, json } = bodyParser;
import cookieParser from "cookie-parser";

// Handlebars imports
import Handlebars from "handlebars";

// Express setup
const app = express();
app.use(urlencoded({ extended: true }));
app.use(json());
app.use(cookieParser());

// __dirname is not available in ES modules, so we need to use a workaround
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

Handlebars.registerHelper("default", function (value, defaultValue) {
  return value !== undefined ? value : defaultValue;
});
const loginTemplate = Handlebars.compile(
  readFileSync(join(__dirname, "views", "login.hbs"), "utf8")
);
const homeTemplate = Handlebars.compile(
  readFileSync(join(__dirname, "views", "home.hbs"), "utf8")
);
const dashboardTemplate = Handlebars.compile(
  readFileSync(join(__dirname, "views", "dashboard.hbs"), "utf8")
);

app.get("/", (req, res) => {
  res.send(homeTemplate({ host: host }));
});

app.get("/login", (req, res) => {
  if (req.query.return_url) {
    res.cookie("return_url", req.query.return_url);
  }

  res.send(
    loginTemplate({
      host: host,
      error: req.query.error,
      handle: req.query.handle,
    })
  );
});

app.get("/dashboard", async (req, res) => {
  res.send(dashboardTemplate({ host: host, token: req.cookies.token }));
});

app.get("/client-metadata.json", async (req, res) => {
  res.json(clientMetadata);
});

app.get("/jwks.json", async (req, res) => {
  var client = await getOAuthClient();

  var jwks = structuredClone(client.jwks);
  jwks.keys[0].kid = "1";

  res.json(jwks);
});

// Create an endpoint to initiate the OAuth flow
app.post("/login", async (req, res, next) => {
  try {
    const handle = req.body.handle;
    const state = Math.random().toString(36).substring(7);
    console.log("Getting OAuth client for handle:", handle);
    const client = await getOAuthClient();
    console.log("Authorizing");
    const url = await client.authorize(handle, {
      state,
    });

    console.log("Redirecting to:", url);
    res.redirect(url);
  } catch (err) {
    console.error("Error during login:", err);
    res.redirect(
      "/login?handle=" +
        encodeURIComponent(req.body.handle) +
        "&error=" +
        encodeURIComponent(err.message)
    );
  }
});

// Create an endpoint to handle the OAuth callback
app.get("/callback", async (req, res, next) => {
  try {
    // Get all the query parameters
    const params = new URLSearchParams(req.url.split("?")[1]);

    // Handle the callback
    const client = await getOAuthClient();
    const { session, state } = await client.callback(params);

    // Process successful authentication here
    console.log("authorize() was called with state:", state);
    console.log("User authenticated as:", session.did);

    // Get the Bluesky profile of the authenticated user
    const agent = new Agent(session);
    const profile = await agent.getProfile({ actor: agent.did });

    // Store the profile in firebase for later
    await db.collection("profiles").doc(session.did).set(profile.data);

    // const likes = await agent.getActorLikes({ actor: agent.did });

    // console.log(JSON.stringify(likes.data));
    // await db.collection('likes').doc(session.did).set({ result: JSON.stringify(likes.data)});

    // Create a custom token for firebase
    var claims = {
      handle: profile.data.handle,
      displayName: profile.data.displayName,
      avatar: profile.data.avatar,
      banner: profile.data.banner,
      description: profile.data.description,
    };

    var token = await auth.createCustomToken(session.did, claims);

    // Save the firebase token in a cookie
    res.cookie("token", token);

    // Send the user back to where they came from
    if (req.cookies.return_url) {
      // Delete the cookie now that we don't need it anymore
      res.clearCookie("return_url");
      res.redirect(req.cookies.return_url);
    } else {
      res.redirect("/");
    }
  } catch (err) {
    next(err);
  }
});

async function getCurrentUser(req) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);

  if (!match) {
    return null;
  }

  const idToken = match[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

app.post("/api/syncActivity", async (req, res) => {
  var user = await getCurrentUser(req);

  if (!user) {
    res.status(401).send("Unauthorized");
    return;
  }
  console.log("Syncing activity for user:", user.uid);

  const client = await getOAuthClient();
  const session = await client.restore(user.uid);
  if (!session) {
    console.log("Session not found");
    res.status(401).send("Unauthorized");
    return;
  }

  const agent = new Agent(session);
  const postCollector = new PostCollector(agent);
  const likeCollector = new LikeCollector(agent);
  await postCollector.collect();
  await likeCollector.collect();
  console.log("Activity synced for user:", user.uid);

  res.send({ status: "ok" });
});

app.post("/api/updateDashboard", async (req, res) => {
  var user = await getCurrentUser(req);

  if (!user) {
    res.status(401).send("Unauthorized");
    return;
  }

  console.log("Updating dashboard for user:", user.uid);
  const since = new Date("2020-01-01T00:00:00Z");
  const dashboard = new Dashboard(user.uid);
  await dashboard.clear();
  await dashboard.update(since);
  console.log("Dashboard updated for user:", user.uid);
  res.send({ status: "ok" });
});

export const _app = app;
export const _express = express;
const _app_request = functions.https.onRequest(app);
export { _app_request as app };
