// arranchamento-app/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBhgZfxpNWW7gqvYv9sWh-lw7YfRTvqaUE",
  authDomain: "app-arranchamento.firebaseapp.com",
  projectId: "app-arranchamento",
  storageBucket: "app-arranchamento.firebasestorage.app",
  messagingSenderId: "858295615388",
  appId: "1:858295615388:web:5ddf7ff48a7655f4a35259"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);
