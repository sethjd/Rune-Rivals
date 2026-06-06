// Firebase web configuration for Rune Rivals. These identifiers are safe to
// expose in a web client; access control belongs in the database rules.
export const firebaseConfig = {
  apiKey: "AIzaSyA99kOfnIEXvXeert_dNUF3B_RQnPzitLg",
  authDomain: "rune-rivals-b4eb2.firebaseapp.com",
  databaseURL: "https://rune-rivals-b4eb2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rune-rivals-b4eb2",
  storageBucket: "rune-rivals-b4eb2.firebasestorage.app",
  messagingSenderId: "559563556975",
  appId: "1:559563556975:web:75995677afa6734721659a",
  measurementId: "G-TH5E81BJ8D"
};

export function hasFirebaseConfig() {
  return !Object.values(firebaseConfig).some((value) => value.includes("PASTE_YOUR"));
}
