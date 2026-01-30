// Paste your Firebase config here as window.FIREBASE_CONFIG, or leave empty to use demo fallback.
// Example:
// window.FIREBASE_CONFIG = {
//   apiKey: "...",
//   authDomain: "...",
//   projectId: "...",
    // };

window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyBQNFSr06Z4bisbOEEN_8adnjGgB-8LopU",
    authDomain: "openverse-870c3.firebaseapp.com",
    projectId: "openverse-870c3",
    storageBucket: "openverse-870c3.appspot.com",
    messagingSenderId: "647739756748",
    appId: "1:647739756748:web:337e24d3d00b7488b4f269",
    // If you have another appId or fields, replace above values accordingly.
};

if (window.FIREBASE_CONFIG && firebase && !firebase.apps.length) {
  try {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    window.db = firebase.firestore();
    console.info('Firebase initialized');
  } catch (err) {
    console.error('Firebase init error', err);
    window.db = null;
  }
} else {
  window.db = null;
}
