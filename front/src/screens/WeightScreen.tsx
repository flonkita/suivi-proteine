import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../services/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import CustomAlert from "../components/CustomAlert";

export default function WeightScreen() {
  const [weightInput, setWeightInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [startWeight, setStartWeight] = useState(125.0);
  const [targetWeight, setTargetWeight] = useState(95.0);
  const [weightHistory, setWeightHistory] = useState<
    { weight: number; label: string }[]
  >([]);

  // --- NOUVEAUX ÉTATS POUR LE CUSTOM ALERT ---
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };
  // -------------------------------------------

  const fetchWeightData = async () => {
    try {
      const [profileRes, historyRes] = await Promise.all([
        api.get("/profile"),
        api.get("/daily/history"),
      ]);

      let currentStartWeight = 125.0;

      if (profileRes.data.status === "success") {
        currentStartWeight = profileRes.data.data.startWeight;
        setStartWeight(currentStartWeight);
        setTargetWeight(profileRes.data.data.targetWeight);
      }

      if (
        historyRes.data.status === "success" &&
        historyRes.data.data.length > 0
      ) {
        const weightsOnly = historyRes.data.data.filter(
          (d: any) => d.weight !== null,
        );
        if (weightsOnly.length > 0) {
          const formatted = weightsOnly
            .map((d: any) => {
              const date = new Date(d.date);
              const isToday = new Date().toDateString() === date.toDateString();
              return {
                weight: d.weight,
                label: isToday
                  ? "Auj"
                  : date.toLocaleDateString("fr-FR", { weekday: "short" }),
              };
            })
            .reverse();
          setWeightHistory(formatted);
        } else {
          setWeightHistory([{ weight: currentStartWeight, label: "Début" }]);
        }
      } else {
        setWeightHistory([{ weight: currentStartWeight, label: "Début" }]);
      }
    } catch (error) {
      console.error("Erreur de récupération des données de poids:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWeightData();
    }, []),
  );

  const currentWeight =
    weightHistory.length > 0
      ? weightHistory[weightHistory.length - 1].weight
      : startWeight;
  const totalWeightToLose = startWeight - targetWeight;
  const weightLostSoFar = startWeight - currentWeight;
  const progressPercent = Math.min(
    Math.max((weightLostSoFar / totalWeightToLose) * 100, 0),
    100,
  );

  const handleSaveWeight = async () => {
    const val = parseFloat(weightInput);
    if (isNaN(val)) {
      showAlert("Erreur", "Entre un poids valide (ex: 92.8)");
      return;
    }

    try {
      const response = await api.patch("/daily/weight", { weight: val });
      if (response.data.message) {
        setAiMessage(response.data.message);
      }
      setWeightInput("");
      fetchWeightData();
    } catch (error) {
      showAlert("Erreur", "Impossible de sauvegarder ce poids.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-neutral-100">
        <ActivityIndicator size="large" color="#FF4500" />
        <Text className="mt-2 text-neutral-600">
          Chargement des statistiques...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-100" edges={["top"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        className="flex-1 bg-neutral-100"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* LA BULLE DU COACH IA */}
          {aiMessage && (
            <View className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-4 border-l-4 border-l-orange-500 shadow-sm elevation-sm">
              <Text className="font-black text-orange-500 mb-1.5 text-base">
                🤖 Coach IA :
              </Text>
              <Text className="text-neutral-700 italic text-sm leading-5 font-medium">
                {aiMessage}
              </Text>
            </View>
          )}

          {/* HEADER OBJECTIF */}
          <View className="bg-white p-5 rounded-2xl mb-4 shadow-sm elevation-md">
            <Text className="text-2xl font-black text-neutral-800 mb-1">
              🎯 Objectif {startWeight - targetWeight} kg
            </Text>
            <Text className="text-sm text-neutral-500 mb-4 italic">
              En route vers le dunk et l'explosivité sur les parquets !
            </Text>
            <View className="h-3.5 bg-neutral-100 rounded-full overflow-hidden mb-2">
              <View
                className="h-full bg-orange-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs font-bold text-neutral-700">
                Départ : {startWeight} kg
              </Text>
              <Text className="text-xs font-bold text-neutral-700">
                Actuel : {currentWeight} kg
              </Text>
              <Text className="text-xs font-bold text-neutral-700">
                Cible : {targetWeight} kg
              </Text>
            </View>
          </View>

          {/* HISTORIQUE VISUEL DES RELEVÉS */}
          <View className="bg-white p-5 rounded-2xl mb-4 shadow-sm elevation-md">
            <Text className="text-base font-bold text-neutral-800 mb-4">
              📈 Évolution
            </Text>
            <View className="pl-1 py-1">
              {weightHistory.map((item, index) => (
                <View key={index} className="flex-row items-center mb-4">
                  <View className="items-center w-5 mr-4">
                    <View className="w-3 h-3 rounded-full bg-orange-500" />
                    {index < weightHistory.length - 1 && (
                      <View className="w-0.5 h-8 bg-orange-200 mt-1" />
                    )}
                  </View>

                  <View className="flex-row justify-between flex-1 bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                    <Text className="font-bold text-base text-neutral-800">
                      {item.weight} kg
                    </Text>
                    <Text className="text-sm text-neutral-500 capitalize">
                      {item.label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* SAISIE DU POIDS */}
          <View className="bg-white p-5 rounded-2xl mb-4 shadow-sm elevation-md">
            <Text className="text-base font-bold text-neutral-800 mb-4">
              Nouveau Relevé
            </Text>
            <View className="flex-row gap-3">
              <TextInput
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-base text-neutral-800"
                placeholder="Ex: 92.8"
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={weightInput}
                onChangeText={setWeightInput}
              />
              <TouchableOpacity
                className="bg-orange-500 justify-center px-6 rounded-xl"
                onPress={handleSaveWeight}
              >
                <Text className="text-white font-bold text-base">
                  Enregistrer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}
