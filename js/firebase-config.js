// Replace with your Firebase config
  const firebaseConfig = {
    apiKey: "AIzaSyBTBS1JpLm-4rlPuW6wZ38bnSG-oQPZPys",
    authDomain: "health-education-system.firebaseapp.com",
    databaseURL: "https://health-education-system-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "health-education-system",
    storageBucket: "health-education-system.firebasestorage.app",
    messagingSenderId: "535806176556",
    appId: "1:535806176556:web:4b0ef588432eccc5a99089",
    measurementId: "G-F2MEFR30M6"
  };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
firebase.auth().signInAnonymously();
