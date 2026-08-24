import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import { useState, useCallback } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import api from "../services/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import CustomAlert from "../components/CustomAlert";
import CustomDeleteAlert from "../components/CustomDeleteAlert"; // Composant spécifique, voir plus bas

interface Meal {
  id: string;
  type: string;
  foodItems: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  isCompliant: boolean;
  comment: string;
}

interface DailySummary {
  isTrainingDay: boolean;
  waterIntake: number;
  macros: {
    totalCalories: number;
    totalProteins: number;
    totalCarbs: number;
    totalFats: number;
  };
  targets: {
    targetCalories: number;
    targetProteins: number;
    targetCarbs: number;
    targetFats: number;
  };
  mealsCount: number;
  meals: Meal[];
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>("");

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

  // --- NOUVEAUX ÉTATS POUR LA SUPPRESSION ---
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<string | null>(null);
  // ------------------------------------------

  const fetchDailySummary = async () => {
    try {
      const [summaryRes, profileRes] = await Promise.all([
        api.get("/daily/summary"),
        api.get("/profile"),
      ]);

      if (summaryRes.data.status === "success") {
        setSummary(summaryRes.data.data);
      }
      if (profileRes.data.status === "success" && profileRes.data.data?.name) {
        setUserName(profileRes.data.data.name);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données :", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDailySummary();
    }, []),
  );

  const handleToggleTraining = async (value: boolean) => {
    setSummary((prev) => (prev ? { ...prev, isTrainingDay: value } : null));

    try {
      await api.patch("/daily/training", { isTraining: value });
    } catch (error) {
      setSummary((prev) => (prev ? { ...prev, isTrainingDay: !value } : null));
      showAlert("Erreur", "Impossible de changer le mode d'entraînement.");
    }
  };

  const handleAddWater = async () => {
    setSummary((prev) =>
      prev ? { ...prev, waterIntake: (prev.waterIntake || 0) + 250 } : null,
    );

    try {
      await api.patch("/daily/water");
    } catch (error) {
      setSummary((prev) =>
        prev ? { ...prev, waterIntake: (prev.waterIntake || 0) - 250 } : null,
      );
      showAlert("Erreur", "Impossible d'ajouter l'eau.");
    }
  };

  // Nouvelle logique de suppression
  const triggerDeleteAlert = (mealId: string) => {
    setMealToDelete(mealId);
    setDeleteAlertVisible(true);
  };

  const confirmDeleteMeal = async () => {
    if (!mealToDelete) return;
    setDeleteAlertVisible(false);

    try {
      await api.delete(`/meals/${mealToDelete}`);
      fetchDailySummary();
    } catch (error) {
      showAlert("Erreur", "Impossible de supprimer ce repas.");
    } finally {
      setMealToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteAlertVisible(false);
    setMealToDelete(null);
  };

  const formatMealType = (type: string) => {
    const labels: Record<string, string> = {
      PETIT_DEJEUNER: "Petit-Déjeuner",
      DEJEUNER: "Déjeuner",
      COLLATION: "Collation",
      DINER: "Dîner",
    };
    return labels[type] || type;
  };

  const renderMeal = ({ item }: { item: Meal }) => (
    <View
      key={item.id}
      className="bg-white p-4 rounded-xl mb-3 border-l-4 shadow-sm"
      style={{ borderLeftColor: item.isCompliant ? "#2E8B57" : "#B22222" }}
    >
      <View className="flex-row justify-between mb-1">
        <Text className="font-bold text-base text-neutral-800">
          {formatMealType(item.type)}
        </Text>
        <TouchableOpacity onPress={() => triggerDeleteAlert(item.id)}>
          <Text className="text-lg">❌</Text>
        </TouchableOpacity>
      </View>
      <Text className="text-sm text-neutral-500 mb-2">{item.foodItems}</Text>

      <View className="flex-row gap-3 mb-2">
        <Text className="font-bold text-neutral-700">
          🔥 {Number(item.calories || 0)} kcal
        </Text>
        <Text className="font-bold text-neutral-700">
          🥩 {Number(item.protein || 0)}g
        </Text>
        <Text className="font-bold text-neutral-700">
          🍚 {Number(item.carbs || 0)}g
        </Text>
        <Text className="font-bold text-neutral-700">
          🥑 {Number(item.fats || 0)}g
        </Text>
      </View>

      <Text
        className="italic text-sm mt-1"
        style={{ color: item.isCompliant ? "#2E8B57" : "#B22222" }}
      >
        "{item.comment}"
      </Text>
    </View>
  );

  if (loading || !summary) {
    return (
      <View className="flex-1 justify-center items-center bg-neutral-100">
        <ActivityIndicator size="large" color="#FF4500" />
        <Text className="mt-2 text-neutral-600">
          Calcul des macros en cours...
        </Text>
      </View>
    );
  }

  const { macros, targets, waterIntake } = summary;

  return (
    <SafeAreaView className="flex-1 bg-neutral-100" edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1 bg-neutral-100 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row justify-between items-center mx-4 mb-6 mt-2">
          <View>
            <Text className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-1">
              Aujourd'hui
            </Text>
            <Text className="text-3xl font-black text-neutral-800">
              {userName ? `Bonjour, ${userName}` : "Bonjour"}
            </Text>
          </View>
        </View>

        {/* TOGGLE ENTRAÎNEMENT */}
        <View className="flex-row items-center justify-between mx-4 bg-white shadow-sm elevation-md p-4 rounded-2xl mb-4">
          <Text className="text-base font-bold text-neutral-800">
            {summary.isTrainingDay
              ? "🏋️ Jour d'entraînement"
              : "🛋️ Jour de repos"}
          </Text>
          <Switch
            trackColor={{ false: "#767577", true: "#FF4500" }}
            thumbColor={summary.isTrainingDay ? "#fff" : "#f4f3f4"}
            onValueChange={handleToggleTraining}
            value={summary.isTrainingDay}
          />
        </View>

        {/* CARTE MACRONUTRIMENTS (Thème Clair Unifié) */}
        <View className="bg-white rounded-3xl p-5 mb-4 mx-4 shadow-sm elevation-md">
          <Text className="text-neutral-800 font-black text-lg mb-4">
            Macronutriments
          </Text>

          <View className="flex-row justify-between mb-2">
            {/* Colonne Glucides */}
            <View className="items-center flex-1">
              <Text className="text-teal-500 font-bold text-sm mb-1">
                Glucides
              </Text>
              <Text className="text-neutral-800 font-black text-xl">
                {macros.totalCarbs || 0}g
              </Text>
              <Text className="text-neutral-400 text-xs">
                / {targets.targetCarbs}g
              </Text>
              <View className="w-full h-1.5 bg-neutral-100 rounded-full mt-2">
                <View
                  className="h-full bg-teal-500 rounded-full"
                  style={{
                    width: `${Math.min(((macros.totalCarbs || 0) / targets.targetCarbs) * 100, 100)}%`,
                  }}
                />
              </View>
            </View>

            {/* Colonne Lipides */}
            <View className="items-center flex-1 border-x border-neutral-100 px-2 mx-2">
              <Text className="text-purple-500 font-bold text-sm mb-1">
                Lipides
              </Text>
              <Text className="text-neutral-800 font-black text-xl">
                {macros.totalFats || 0}g
              </Text>
              <Text className="text-neutral-400 text-xs">
                / {targets.targetFats}g
              </Text>
              <View className="w-full h-1.5 bg-neutral-100 rounded-full mt-2">
                <View
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: `${Math.min(((macros.totalFats || 0) / targets.targetFats) * 100, 100)}%`,
                  }}
                />
              </View>
            </View>

            {/* Colonne Protéines */}
            <View className="items-center flex-1">
              <Text className="text-orange-500 font-bold text-sm mb-1">
                Protéines
              </Text>
              <Text className="text-neutral-800 font-black text-xl">
                {macros.totalProteins || 0}g
              </Text>
              <Text className="text-neutral-400 text-xs">
                / {targets.targetProteins}g
              </Text>
              <View className="w-full h-1.5 bg-neutral-100 rounded-full mt-2">
                <View
                  className="h-full bg-orange-500 rounded-full"
                  style={{
                    width: `${Math.min(((macros.totalProteins || 0) / targets.targetProteins) * 100, 100)}%`,
                  }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* GRILLE 2 COLONNES (Calories & Hydratation) */}
        <View className="flex-row justify-between mb-6 mx-4">
          <View className="bg-white rounded-3xl p-5 flex-1 mr-2 shadow-sm elevation-md items-center justify-center">
            <View className="w-12 h-12 bg-orange-100 rounded-full items-center justify-center mb-2">
              <Ionicons name="flame" size={24} color="#FF4500" />
            </View>
            <Text className="text-neutral-500 font-bold text-sm">Énergie</Text>
            <Text className="text-neutral-800 font-black text-xl">
              {macros.totalCalories || 0}
            </Text>
            <Text className="text-neutral-400 text-xs">kcal</Text>
          </View>

          <View className="bg-white rounded-3xl p-5 flex-1 ml-2 shadow-sm elevation-md items-center justify-between">
            <View className="items-center mb-2">
              <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mb-2">
                <Ionicons name="water" size={24} color="#3B82F6" />
              </View>
              <Text className="text-neutral-500 font-bold text-sm">Eau</Text>
              <Text className="text-neutral-800 font-black text-xl">
                {waterIntake || 0}
              </Text>
            </View>
            <TouchableOpacity
              className="bg-blue-500 px-4 py-2 rounded-full flex-row items-center w-full justify-center"
              onPress={handleAddWater}
            >
              <Ionicons name="add" size={16} color="white" />
              <Text className="text-white font-bold ml-1">250ml</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BOUTON LE CHEF IA (Nouveau point d'entrée pour les recettes) */}
        <TouchableOpacity
          className="bg-neutral-900 mx-4 mb-6 rounded-2xl p-4 flex-row items-center justify-between shadow-lg"
          onPress={() => navigation.navigate("Recipes")}
        >
          <View className="flex-row items-center flex-1">
            <View className="w-12 h-12 bg-orange-500/20 rounded-full items-center justify-center mr-4">
              <Ionicons name="restaurant" size={24} color="#FF4500" />
            </View>
            <View>
              <Text className="text-white font-black text-lg">Le Chef IA</Text>
              <Text className="text-neutral-400 text-xs mt-0.5">
                Idées de repas
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {/* LISTE DES REPAS */}
        <Text className="text-lg font-bold mx-4 mb-3 text-neutral-600">
          Historique des assiettes ({summary.mealsCount})
        </Text>
        <View className="px-4 pb-8">
          {summary.meals && summary.meals.length > 0 ? (
            summary.meals.map((item) => renderMeal({ item }))
          ) : (
            <Text className="text-center text-neutral-500 mt-2 mb-5 italic">
              Aucun repas enregistré aujourd'hui. Va vite scanner ta gamelle !
            </Text>
          )}
        </View>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      <CustomDeleteAlert
        visible={deleteAlertVisible}
        onCancel={cancelDelete}
        onConfirm={confirmDeleteMeal}
      />
    </SafeAreaView>
  );
}
