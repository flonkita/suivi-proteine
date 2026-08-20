import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import api from "./src/services/api";
import "./global.css";

export default function App() {
  // null = en chargement, false = nouveau joueur, true = profil existant
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const response = await api.get("/profile");
        // Si data existe et n'est pas null, le profil est déjà créé
        if (response.data.data) {
          setHasProfile(true);
        } else {
          setHasProfile(false);
        }
      } catch (error) {
        setHasProfile(false);
      }
    };
    checkProfile();
  }, []);

  if (hasProfile === null) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#FF4500" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {hasProfile ? (
        <AppNavigator />
      ) : (
        <OnboardingScreen onComplete={() => setHasProfile(true)} />
      )}
    </NavigationContainer>
  );
}
