import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import api from "../services/api";

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [startWeight, setStartWeight] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  // NOUVEAU : État pour stocker l'objectif sélectionné
  const [goal, setGoal] = useState("GENERAL_HEALTH");
  const [targetMonths, setTargetMonths] = useState("4");

  const handleStartMission = async () => {
    const start = parseFloat(startWeight);
    const target = parseFloat(targetWeight);
    const months = parseInt(targetMonths, 10);

    if (isNaN(start) || isNaN(target)) {
      Alert.alert("Erreur", "Merci d'entrer des poids valides pour commencer.");
      return;
    }

    try {
      const response = await api.patch("/profile", {
        startWeight: start,
        targetWeight: target,
        targetMonths: months,
        goal: goal, // On envoie l'objectif au back-end
      });

      if (response.data.status === "success") {
        onComplete();
      }
    } catch (error: any) {
      // On loggue l'erreur complète dans ton terminal front pour la lire
      console.log(
        "❌ Détails de l'erreur API :",
        error.response?.data || error.message,
      );

      // On affiche le message du back-end directement sur le téléphone !
      Alert.alert(
        "Erreur API",
        error.response?.data?.message || "Impossible d'initialiser le profil.",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Le ScrollView permet à l'écran de défiler quand le clavier est ouvert */}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-8">
            <View className="w-24 h-24 bg-orange-500 rounded-full items-center justify-center mb-6">
              {/* L'icône globale */}
              <Ionicons name="barbell" size={50} color="white" />
            </View>
            <Text className="text-3xl font-black text-white text-center mb-2">
              Protein Tracker
            </Text>
            <Text className="text-base text-neutral-400 text-center font-medium">
              Initialisation de ton profil. {"\n"}Fixe tes objectifs de poids
              pour démarrer ton suivi.
            </Text>
          </View>

          {/* Section des poids */}
          <View className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800 shadow-xl mb-6">
            <Text className="text-sm font-bold text-neutral-400 mb-2 ml-1">
              Poids de départ (kg)
            </Text>
            <TextInput
              className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-4 text-lg font-bold text-white mb-6"
              placeholder="Ex: 125"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={startWeight}
              onChangeText={setStartWeight}
            />

            <Text className="text-sm font-bold text-neutral-400 mb-2 ml-1">
              Objectif Cible (kg)
            </Text>
            <TextInput
              className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-4 text-lg font-bold text-orange-500 mb-2"
              placeholder="Ex: 95"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={targetWeight}
              onChangeText={setTargetWeight}
            />
          </View>

          {/* SECTION CHOIX DE L'OBJECTIF */}
          <Text className="text-sm font-bold text-neutral-400 mb-3 ml-2 uppercase tracking-wider">
            Ton Objectif Principal
          </Text>
          <View className="mb-8">
            <TouchableOpacity
              onPress={() => setGoal("GENERAL_HEALTH")}
              className={`p-4 rounded-xl mb-3 border ${
                goal === "GENERAL_HEALTH"
                  ? "bg-teal-500/20 border-teal-500"
                  : "bg-neutral-900 border-neutral-800"
              }`}
            >
              <Text
                className={`font-bold text-base ${
                  goal === "GENERAL_HEALTH"
                    ? "text-teal-400"
                    : "text-neutral-400"
                }`}
              >
                🌱 Santé & Équilibre
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setGoal("MUSCLE_GAIN")}
              className={`p-4 rounded-xl mb-3 border ${
                goal === "MUSCLE_GAIN"
                  ? "bg-purple-500/20 border-purple-500"
                  : "bg-neutral-900 border-neutral-800"
              }`}
            >
              <Text
                className={`font-bold text-base ${
                  goal === "MUSCLE_GAIN"
                    ? "text-purple-400"
                    : "text-neutral-400"
                }`}
              >
                💪 Prise de Masse
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setGoal("ATHLETIC")}
              className={`p-4 rounded-xl border ${
                goal === "ATHLETIC"
                  ? "bg-orange-500/20 border-orange-500"
                  : "bg-neutral-900 border-neutral-800"
              }`}
            >
              <Text
                className={`font-bold text-base ${
                  goal === "ATHLETIC" ? "text-orange-500" : "text-neutral-400"
                }`}
              >
                ⚡ Performance Athlétique
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="text-sm font-bold text-neutral-400 mb-2 ml-1">
            Temps estimé (Mois)
          </Text>
          <TextInput
            className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-4 text-lg font-bold text-blue-400 mb-8"
            placeholder="Ex: 4"
            placeholderTextColor="#666"
            keyboardType="numeric"
            value={targetMonths}
            onChangeText={setTargetMonths}
          />

          <TouchableOpacity
            className="bg-orange-500 py-4 rounded-xl items-center shadow-lg shadow-orange-500/30"
            onPress={handleStartMission}
          >
            <Text className="text-white font-black text-lg">
              Démarrer le Suivi
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
