// Firebase imports
import functions from "firebase-functions/v1";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  getFirestore,
  Timestamp,
  FieldValue,
  Filter,
} from "firebase-admin/firestore";

// Initialize firebase from credential (since we want to support function and standalone)
console.log("Trying to initialize firebase with credentials..");
import credential from "./serviceAccountKey.json" with { type: "json" };
initializeApp({ credential: cert(credential) });
const db = getFirestore();
const auth = getAuth();

const _db = db;
export { _db as db };
const _auth = auth;
export { _auth as auth };
const _functions = functions;
export { _functions as functions };
