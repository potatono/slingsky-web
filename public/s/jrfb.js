// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-analytics.js";
import { getAuth, signInWithCustomToken, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getFirestore, doc, collection, setDoc, addDoc, getDocs, deleteDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyD351G1A6ifwTryP0u1QMwykgF54ZTHrvs",
  authDomain: "atp-firebase-d6701.firebaseapp.com",
  projectId: "atp-firebase-d6701",
  storageBucket: "atp-firebase-d6701.firebasestorage.app",
  messagingSenderId: "879262632908",
  appId: "1:879262632908:web:b57bf62e401becf357ab69",
  measurementId: "G-VELCQR0YPY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

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
  }
};
