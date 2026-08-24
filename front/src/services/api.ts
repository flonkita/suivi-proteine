import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const api = axios.create({
  baseURL: "https://protein-tracker-api-illd.onrender.com/api",
  // Petite astuce : je te conseille de passer le timeout à 15000 (15s) ou plus.
  // Render met parfois 30 à 50 secondes à se réveiller sur les offres gratuites !
  timeout: 15000,
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

  // LA CORRECTION EST LÀ 👇 : on utilise .set() au lieu des crochets
  config.headers.set("x-device-id", deviceId);

  return config;
});

export default api;
