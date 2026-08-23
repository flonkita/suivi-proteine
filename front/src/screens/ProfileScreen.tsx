import { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Keyboard,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet, {
  BottomSheetView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import api from "../services/api";
import { StatusBar } from "expo-status-bar";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);

  const [profileData, setProfileData] = useState({
    name: "",
    startWeight: 125,
    targetWeight: 95,
    currentWeight: 125,
    targetMonths: 4,
    goal: "GENERAL_HEALTH",
  });

  // États locaux pour le formulaire de la Bottom Sheet
  const [inputStart, setInputStart] = useState("");
  const [inputTarget, setInputTarget] = useState("");
  const [inputMonths, setInputMonths] = useState(""); // L'état manquant pour les mois !
  const [newWeight, setNewWeight] = useState("");
  const [isSubmittingWeight, setIsSubmittingWeight] = useState(false);
  const [inputGoal, setInputGoal] = useState(profileData?.goal || "GENERAL_HEALTH");

  const bottomSheetRef = useRef<BottomSheet>(null);
  // On agrandit légèrement le panneau pour faire de la place au 3ème champ
  const snapPoints = useMemo(() => ["75%"], []);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/profile");
      if (response.data.status === "success") {
        const data = response.data.data;
        setProfileData({
          name: data.name || "",
          startWeight: data.startWeight || 125,
          targetWeight: data.targetWeight || 95,
          currentWeight: data.currentWeight || 125,
          targetMonths: data.targetMonths || 4,
          goal: data.goal || "GENERAL_HEALTH",
        });
        setInputStart(String(data.startWeight || 125));
        setInputTarget(String(data.targetWeight || 95));
        setInputMonths(String(data.targetMonths || 4)); // Initialisation du champ
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du profil:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, []),
  );

  const openBottomSheet = () => {
    setInputStart(String(profileData.startWeight));
    setInputTarget(String(profileData.targetWeight));
    setInputMonths(String(profileData.targetMonths));
    setInputGoal(profileData.goal);
    bottomSheetRef.current?.expand();
  };

  const handleSaveName = async () => {
    try {
      await api.patch("/profile", { name: profileData.name });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du nom");
    }
  };

const handleSaveGoals = async () => {
  Keyboard.dismiss();
  const newStart = parseFloat(inputStart);
  const newTarget = parseFloat(inputTarget);
  const newMonths = parseInt(inputMonths, 10);

  if (isNaN(newStart) || isNaN(newTarget) || isNaN(newMonths)) {
    Alert.alert("Erreur", "Merci de saisir des valeurs numériques valides.");
    return;
  }

  const previousData = { ...profileData };

  // Mise à jour de l'UI instantanée (Optimistic) avec les mois ET LE GOAL
  setProfileData({
    ...profileData,
    startWeight: newStart,
    targetWeight: newTarget,
    targetMonths: newMonths,
    goal: inputGoal, // <--- C'EST ICI !
  });

  bottomSheetRef.current?.close();

  try {
    // Envoi au back-end (Avec le nouvel objectif !)
    await api.patch("/profile", {
      startWeight: newStart,
      targetWeight: newTarget,
      targetMonths: newMonths,
      goal: inputGoal, // <--- ET C'EST ICI !
    });
  } catch (error) {
    setProfileData(previousData);
    Alert.alert(
      "Erreur réseau",
      "Impossible de sauvegarder, annulation des modifications.",
    );
  }
};

  const getProfileContent = (goal: string) => {
    switch (goal) {
      case "ATHLETIC":
        return {
          title: "Athlète Focus",
          icon: "flash",
          color: "#FF4500",
          dietTitle: "La Diète Prédateur",
          dietDesc:
            "Haute teneur en protéines pour la récupération musculaire. Exclusion absolue des oignons et respect strict de la charte pour des résultats massifs.",
          activityTitle: "Profil Terrain",
          activityDesc:
            "Entraînement axé sur l'explosivité et la verticalité pour aller chercher les meilleures capacités physiques.",
        };
      case "MUSCLE_GAIN":
        return {
          title: "Go-Muscu",
          icon: "barbell",
          color: "#9333ea",
          dietTitle: "Surplus Propre",
          dietDesc:
            "Maximisation de l'apport protidique et glucidique. L'objectif est de construire du tissu musculaire dense avec des aliments de qualité.",
          activityTitle: "Salle de Fer",
          activityDesc:
            "Focus sur l'hypertrophie, la surcharge progressive et le temps sous tension. Repos fondamental entre les grosses séances.",
        };
      case "GENERAL_HEALTH":
      default:
        return {
          title: "Santé & Équilibre",
          icon: "leaf",
          color: "#0d9488",
          dietTitle: "Nutrition Bien-être",
          dietDesc:
            "Une approche équilibrée sans frustration. On privilégie les aliments bruts, la modération et une hydratation optimale.",
          activityTitle: "Mouvement Quotidien",
          activityDesc:
            "Marche, mobilité et renforcement léger pour maintenir un corps fonctionnel, éviter les douleurs et déborder d'énergie.",
        };
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-neutral-100">
        <ActivityIndicator size="large" color="#FF4500" />
        <Text className="mt-2 text-neutral-600">Chargement du profil...</Text>
      </View>
    );
  }

  const weightToLose = profileData.startWeight - profileData.targetWeight;
  const content = getProfileContent(profileData.goal);

  const handleLogWeight = async () => {
    Keyboard.dismiss();
    const weightValue = parseFloat(newWeight);
    if (isNaN(weightValue)) {
      Alert.alert("Erreur", "Saisis un poids valide.");
      return;
    }

    setIsSubmittingWeight(true);
    try {
      // On envoie le poids vers la route daily existante
      await api.patch("/daily/weight", { weight: weightValue });

      Alert.alert(
        "Succès",
        "Poids enregistré ! Le coach a mis à jour ton suivi.",
      );
      setNewWeight("");
      fetchProfile(); // Rafraîchit les données du profil
    } catch (error) {
      console.error("Erreur poids:", error);
      Alert.alert("Erreur", "Impossible d'enregistrer le poids.");
    } finally {
      setIsSubmittingWeight(false);
    }
  };

  return (
    <GestureHandlerRootView className="flex-1">
      <StatusBar style="dark" />

      <SafeAreaView className="flex-1 bg-neutral-100" edges={["top"]}>
        <ScrollView
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center mb-8 mt-4">
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-3 shadow-md"
              style={{ backgroundColor: content.color }}
            >
              <Ionicons name={content.icon as any} size={40} color="white" />
            </View>

            {/* NOUVEAU CHAMP DE SAISIE DU NOM */}
            <TextInput
              className="text-2xl font-black text-neutral-800 text-center mb-1 bg-neutral-200/50 px-4 py-1.5 rounded-xl"
              placeholder="Ton Prénom"
              placeholderTextColor="#999"
              value={profileData.name}
              onChangeText={(text) =>
                setProfileData({ ...profileData, name: text })
              }
              onEndEditing={handleSaveName} // Sauvegarde auto quand on quitte le champ !
            />

            <Text className="text-sm font-medium text-neutral-500 mt-1">
              Opération{" "}
              {weightToLose > 0
                ? `-${weightToLose}`
                : `+${Math.abs(weightToLose)}`}{" "}
              kg en {profileData.targetMonths} mois
            </Text>
          </View>

          {/* NOUVELLE SECTION : ENREGISTREMENT DU POIDS */}
          <Text className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3 ml-1">
            Pesée du jour
          </Text>
          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm elevation-md flex-row items-center justify-between">
            <TextInput
              className="bg-neutral-100 border border-neutral-200 text-neutral-800 px-4 py-3 rounded-xl flex-1 mr-3 text-base font-bold"
              placeholder="Ex: 92.8"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={newWeight}
              onChangeText={setNewWeight}
            />
            <TouchableOpacity
              className="px-5 py-3.5 rounded-xl items-center justify-center shadow-sm"
              style={{ backgroundColor: content.color }}
              onPress={handleLogWeight}
              disabled={isSubmittingWeight}
            >
              {isSubmittingWeight ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">
                  Enregistrer
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* SECTION MENSURATIONS (La suite de ton code existant...) */}
          <Text className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3 ml-1">
            Mes Objectifs
          </Text>

          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm elevation-md">
            <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons
                  name="scale-outline"
                  size={22}
                  color="#555"
                  className="mr-3"
                />
                <Text className="text-base font-bold text-neutral-700 ml-2">
                  Poids de départ
                </Text>
              </View>
              <Text className="text-lg font-black text-neutral-800">
                {profileData.startWeight} kg
              </Text>
            </View>

            <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons
                  name="fitness-outline"
                  size={22}
                  color="#3B82F6"
                  className="mr-3"
                />
                <Text className="text-base font-bold text-neutral-700 ml-2">
                  Poids Actuel
                </Text>
              </View>
              <Text className="text-lg font-black text-blue-500">
                {profileData.currentWeight} kg
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Ionicons
                  name="flag-outline"
                  size={22}
                  color={content.color}
                  className="mr-3"
                />
                <Text className="text-base font-bold text-neutral-700 ml-2">
                  Objectif Cible
                </Text>
              </View>
              <Text
                className="text-lg font-black"
                style={{ color: content.color }}
              >
                {profileData.targetWeight} kg
              </Text>
            </View>
          </View>

          <Text className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3 ml-1">
            Mon Plan de Bataille
          </Text>
          <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm elevation-md">
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Ionicons name="restaurant" size={20} color={content.color} />
                <Text className="text-base font-bold text-neutral-800 ml-2">
                  {content.dietTitle}
                </Text>
              </View>
              <Text className="text-sm text-neutral-500 leading-5">
                {content.dietDesc}
              </Text>
            </View>

            <View className="pt-4 border-t border-neutral-100">
              <View className="flex-row items-center mb-2">
                <Ionicons name="fitness" size={22} color={content.color} />
                <Text className="text-base font-bold text-neutral-800 ml-2">
                  {content.activityTitle}
                </Text>
              </View>
              <Text className="text-sm text-neutral-500 leading-5">
                {content.activityDesc}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            className="bg-neutral-800 py-4 rounded-xl items-center mb-10 shadow-sm"
            accessibilityRole="button"
            onPress={openBottomSheet}
          >
            <Text className="text-white font-bold text-base">
              Modifier mes objectifs
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose={true}
          backgroundStyle={{ backgroundColor: "#fff", borderRadius: 24 }}
          handleIndicatorStyle={{ backgroundColor: "#ccc", width: 40 }}
        >
          <BottomSheetView className="flex-1 p-6">
            <Text className="text-xl font-black text-neutral-800 mb-6 text-center">
              Ajuster les objectifs
            </Text>

            <Text className="text-sm font-bold text-neutral-500 mb-2 ml-1">
              Poids de départ (kg)
            </Text>
            <BottomSheetTextInput
              className="bg-neutral-100 border border-neutral-200 rounded-xl px-4 py-3 text-base text-neutral-800 mb-4"
              keyboardType="numeric"
              value={inputStart}
              onChangeText={setInputStart}
            />

            <Text className="text-sm font-bold text-neutral-500 mb-2 ml-1">
              Objectif cible (kg)
            </Text>
            <BottomSheetTextInput
              className="bg-neutral-100 border border-neutral-200 rounded-xl px-4 py-3 text-base text-neutral-800 mb-4"
              keyboardType="numeric"
              value={inputTarget}
              onChangeText={setInputTarget}
            />

            {/* LE FAMEUX NOUVEAU CHAMP POUR LES MOIS */}
            <Text className="text-sm font-bold text-neutral-500 mb-2 ml-1">
              Temps estimé (Mois)
            </Text>
            <BottomSheetTextInput
              className="bg-neutral-100 border border-neutral-200 rounded-xl px-4 py-3 text-base text-neutral-800 mb-8"
              keyboardType="numeric"
              value={inputMonths}
              onChangeText={setInputMonths}
            />

            {/* Sélecteur d'objectif */}
            <Text className="text-sm font-bold text-neutral-500 mb-2 ml-1">
              Objectif principal
            </Text>
            <View className="flex-row justify-between gap-2 mb-8">
              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl border ${
                  inputGoal === "GENERAL_HEALTH"
                    ? "bg-neutral-800 border-neutral-800"
                    : "bg-neutral-100 border-neutral-200"
                }`}
                onPress={() => setInputGoal("GENERAL_HEALTH")}
              >
                <Text
                  className={`text-center font-bold text-xs ${
                    inputGoal === "GENERAL_HEALTH"
                      ? "text-white"
                      : "text-neutral-500"
                  }`}
                >
                  Santé
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl border ${
                  inputGoal === "MUSCLE_GAIN"
                    ? "bg-neutral-800 border-neutral-800"
                    : "bg-neutral-100 border-neutral-200"
                }`}
                onPress={() => setInputGoal("MUSCLE_GAIN")}
              >
                <Text
                  className={`text-center font-bold text-xs ${
                    inputGoal === "MUSCLE_GAIN"
                      ? "text-white"
                      : "text-neutral-500"
                  }`}
                >
                  Masse
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl border ${
                  inputGoal === "ATHLETIC"
                    ? "bg-neutral-800 border-neutral-800"
                    : "bg-neutral-100 border-neutral-200"
                }`}
                onPress={() => setInputGoal("ATHLETIC")}
              >
                <Text
                  className={`text-center font-bold text-xs ${
                    inputGoal === "ATHLETIC" ? "text-white" : "text-neutral-500"
                  }`}
                >
                  Athlétique
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="py-4 rounded-xl items-center shadow-sm"
              style={{ backgroundColor: content.color }}
              onPress={handleSaveGoals}
            >
              <Text className="text-white font-bold text-base">
                Sauvegarder
              </Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheet>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
