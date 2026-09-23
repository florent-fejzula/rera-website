/*
  Public web config for the Rera Stock Firebase project. This key is not a
  secret — access is governed entirely by Firestore security rules, which
  only expose the `categories` collection and the sanitized `public_products`
  mirror (name, category, image) to unauthenticated readers. Raw `products`
  (price, stock qty, SKU) and `sales` stay staff/admin-only.
*/
window.RERA_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCBfY4IVJEQp9x_KmlmSLzvJcyoDyJXcg0",
  authDomain: "rera-stock.firebaseapp.com",
  projectId: "rera-stock",
  storageBucket: "rera-stock.firebasestorage.app",
  messagingSenderId: "795069011578",
  appId: "1:795069011578:web:303c8d8343a20c86280dc3",
};
