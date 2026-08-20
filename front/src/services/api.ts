import axios from "axios";

// On utilise l'IP locale de ta machine et le port de ton backend
const api = axios.create({
  baseURL: "https://protein-tracker-api-illd.onrender.com/api", // Utilise l'URL de ton backend sur Render
  timeout: 5000, // L'application arrête de chercher après 5 secondes si le back est éteint
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
