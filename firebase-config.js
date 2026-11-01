
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC6r3NIqUlggzJH1__vXiX5TN_7O9nhryE",
  authDomain: "store-jyoti.firebaseapp.com",
  projectId: "store-jyoti",
  storageBucket: "store-jyoti.firebasestorage.app",
  messagingSenderId: "147810618717",
  appId: "1:147810618717:web:f65660d61a3284e8296cb4"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
