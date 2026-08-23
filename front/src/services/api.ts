import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

// On utilise l'IP locale de ta machine et le port de ton backend
const api = axios.create({
  baseURL: "https://protein-tracker-api-illd.onrender.com/api", // Utilise l'URL de ton backend sur Render
  timeout: 5000, // L'application arrête de chercher après 5 secondes si le back est éteint
  headers: {
    "Content-Type": "application/json",
  },
});

// L'intercepteur glisse le badge dans toutes les requêtes
api.interceptors.request.use(async (config) => {
  let deviceId = await AsyncStorage.getItem('deviceId');
  
  if (!deviceId) {
    deviceId = Crypto.randomUUID();
    await AsyncStorage.setItem('deviceId', deviceId);
  }

  // On place le badge dans les headers (fonctionne pour GET, POST, PUT...)
  config.headers['x-device-id'] = deviceId;
  
  return config;
});

export default api;
