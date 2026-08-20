import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import DashboardScreen from "../screens/DashboardScreen";
import CameraScreen from "../screens/CameraScreen";
import HistoryScreen from "../screens/HistoryScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RecipeScreen from "../screens/RecipeScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 1. On isole ta barre du bas dans une fonction dédiée (Tes 4 onglets)
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>["name"] =
            "help-outline";
          let iconSize = focused ? 26 : 24;

          if (route.name === "Bilan") {
            iconName = focused ? "stats-chart" : "stats-chart-outline";
          } else if (route.name === "Scanner") {
            iconName = focused ? "scan-circle" : "scan-outline";
            iconSize = focused ? 32 : 28;
          } else if (route.name === "Historique") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Profil") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={iconSize} color={color} />;
        },

        tabBarActiveTintColor: "#FF4500",
        tabBarInactiveTintColor: "#A3A3A3",

        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F5F5F5",
          elevation: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "bold",
        },

        tabBarActiveBackgroundColor: "transparent",
      })}
    >
      <Tab.Screen name="Bilan" component={DashboardScreen} />
      <Tab.Screen name="Scanner" component={CameraScreen} />
      <Tab.Screen name="Historique" component={HistoryScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// 2. Le VRAI navigateur principal exporté, qui superpose les onglets et les autres écrans
export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* L'écran d'accueil est en fait toute ta barre d'onglets */}
      <Stack.Screen name="MainTabs" component={TabNavigator} />

      {/* L'écran des recettes s'ouvrira PAR-DESSUS les onglets */}
      <Stack.Screen name="Recipes" component={RecipeScreen} />
    </Stack.Navigator>
  );
}
