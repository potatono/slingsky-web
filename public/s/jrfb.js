// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-analytics.js";
import { getAuth, signInWithCustomToken, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getFirestore, doc, collection, setDoc, addDoc, getDocs, deleteDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-functions.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyBP4bz0TCOm6sXJ07_uh_oMrdqWtFG2Csc",
  authDomain: "slingski.firebaseapp.com",
  projectId: "slingski",
  storageBucket: "slingski.firebasestorage.app",
  messagingSenderId: "416297498731",
  appId: "1:416297498731:web:66ac95e9d2883f6d89992e",
  measurementId: "G-48QJM9KTTH"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export const firebase = {
  app: app,
  analytics: analytics,
  auth: {
    instance: auth,
    signInWithCustomToken: signInWithCustomToken,
    signOut: signOut
  },
  db: {
    instance: db,
    doc: doc,
    collection: collection,
    setDoc: setDoc,
    addDoc: addDoc,
    getDocs: getDocs,
    deleteDoc: deleteDoc,
    query: query,
    where: where,
    onSnapshot: onSnapshot  
  },
  storage: {
    instance: storage,
    ref: ref,
    uploadBytesResumable: uploadBytesResumable,
    getDownloadURL: getDownloadURL
  },
  functions: {
    instance: functions,
    httpsCallable: httpsCallable
  }
};
