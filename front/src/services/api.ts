import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const api = axios.create({
  baseURL: "https://protein-tracker-api-illd.onrender.com/api",
  timeout: 60000, // 👈 On passe à 60 secondes pour supporter le cold-start de Render et l'analyse Gemini
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  let deviceId = await AsyncStorage.getItem("deviceId");

  if (!deviceId) {
    deviceId = Crypto.randomUUID();
    await AsyncStorage.setItem("deviceId", deviceId);
  }

  config.headers.set("x-device-id", deviceId);

  return config;
});

export default api;
