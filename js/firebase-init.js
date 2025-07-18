// firebase-init.js
const firebaseConfig = {
  apiKey: "AIzaSyDkddzOzJyOK4JfvGq7S6SD3usXaAGqBog",
  authDomain: "mymessenger-c1bde.firebaseapp.com",
  projectId: "mymessenger-c1bde",
  storageBucket: "mymessenger-c1bde.firebasestorage.app",
  messagingSenderId: "331583803279",
  appId: "1:331583803279:web:10a7a2186d583abdab05fa",
  measurementId: "G-WBT9D86V0W",
  databaseURL: "https://mymessenger-c1bde-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

export { auth, db, storage };