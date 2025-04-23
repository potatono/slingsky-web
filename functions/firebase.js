// Firebase imports
const functions = require('firebase-functions/v1');
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

// Initialize firebase from credential (since we want to support function and standalone)
console.log("Trying to initialize firebase with credentials..");
var credential = require('./serviceAccountKey.json');
initializeApp({ credential: cert(credential) });
const db = getFirestore();
const auth = getAuth();

exports.db = db;
exports.auth = auth;
exports.functions = functions;

