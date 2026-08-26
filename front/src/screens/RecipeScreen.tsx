import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import api from "../services/api";
import CustomAlert from "../components/CustomAlert"; // 👈 IMPORT AJOUTÉ

const MEAL_OPTIONS = ["Petit-Déjeuner", "Déjeuner", "Collation", "Dîner"];

interface Recipe {
  title: string;
  estimatedPrice: string;
  prepTime: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  instructions: string[];
}

export default function RecipeScreen() {
  const [selectedMeal, setSelectedMeal] = useState("Dîner");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);

  // --- ÉTATS POUR LE CUSTOM ALERT ---
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };
  // -------------------------------------------

  const fetchRecipe = async () => {
    setLoading(true);
    setRecipe(null);
    try {
      const response = await api.post("/recipes/generate", {
        mealType: selectedMeal,
      });

      // Sécurité : on vérifie que les données existent vraiment
      if (response.data.status === "success" && response.data.data?.title) {
        setRecipe(response.data.data);
      } else {
        showAlert("Oups", "Le Chef IA a raté sa cuisson. Réessaie !");
      }
    } catch (error) {
      console.error("Erreur recette", error);
      showAlert(
        "Erreur Réseau",
        "Impossible de joindre le Chef IA. Le serveur chauffe peut-être !",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-100" edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 mt-2">
          <Text className="text-3xl font-black text-neutral-800">
            Le Chef IA 🧑‍🍳
          </Text>
          <Text className="text-neutral-500 text-sm mt-1">
            Des recettes adaptées à ton budget.
          </Text>
        </View>

        {/* SÉLECTEUR DE REPAS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-6"
        >
          {MEAL_OPTIONS.map((meal) => (
            <TouchableOpacity
              key={meal}
              onPress={() => setSelectedMeal(meal)}
              className={`px-5 py-3 rounded-full mr-3 ${selectedMeal === meal ? "bg-orange-500" : "bg-white border border-neutral-200"}`}
            >
              <Text
                className={`font-bold ${selectedMeal === meal ? "text-white" : "text-neutral-600"}`}
              >
                {meal}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          className="bg-neutral-800 w-full py-4 rounded-xl items-center flex-row justify-center shadow-sm mb-6"
          onPress={fetchRecipe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons
                name="restaurant-outline"
                size={20}
                color="white"
                className="mr-2"
              />
              <Text className="text-white font-bold text-base">
                Générer une recette éco
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* AFFICHAGE DE LA RECETTE */}
        {recipe && (
          <View className="bg-white rounded-3xl p-5 mb-10 shadow-sm elevation-md">
            <View className="flex-row justify-between items-start mb-3">
              <Text className="text-xl font-black text-neutral-800 flex-1 mr-2">
                {recipe.title || "Recette Inconnue"}
              </Text>
              <View className="bg-green-100 px-3 py-1.5 rounded-lg border border-green-200">
                <Text className="text-green-700 font-bold text-sm">
                  💶 {recipe.estimatedPrice || "Inconnu"}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mb-4 pb-4 border-b border-neutral-100">
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text className="text-neutral-500 text-sm ml-1 mr-4">
                {recipe.prepTime || "-"}
              </Text>
              <Ionicons name="flame-outline" size={18} color="#FF4500" />
              <Text className="text-neutral-500 text-sm ml-1">
                {recipe.calories || 0} kcal
              </Text>
            </View>

            {/* MACROS */}
            <View className="flex-row justify-between bg-neutral-50 p-3 rounded-xl mb-5">
              <View className="items-center">
                <Text className="text-orange-500 font-bold">Protéines</Text>
                <Text className="font-black text-neutral-800">
                  {recipe.protein || 0}g
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-teal-500 font-bold">Glucides</Text>
                <Text className="font-black text-neutral-800">
                  {recipe.carbs || 0}g
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-purple-500 font-bold">Lipides</Text>
                <Text className="font-black text-neutral-800">
                  {recipe.fats || 0}g
                </Text>
              </View>
            </View>

            {/* INGRÉDIENTS (Sécurisé avec ?.) */}
            <Text className="font-black text-neutral-800 text-lg mb-2">
              Panier (Eco)
            </Text>
            <View className="mb-5">
              {recipe.ingredients?.map((ing, idx) => (
                <View key={idx} className="flex-row items-center mb-1.5">
                  <View className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2" />
                  <Text className="text-neutral-600 flex-1">{ing}</Text>
                </View>
              )) || (
                <Text className="text-neutral-500">
                  Aucun ingrédient détaillé.
                </Text>
              )}
            </View>

            {/* PRÉPARATION (Sécurisé avec ?.) */}
            <Text className="font-black text-neutral-800 text-lg mb-2">
              Préparation
            </Text>
            <View>
              {recipe.instructions?.map((step, idx) => (
                <View key={idx} className="flex-row mb-3">
                  <Text className="font-black text-orange-500 mr-2">
                    {idx + 1}.
                  </Text>
                  <Text className="text-neutral-600 flex-1 leading-5">
                    {step}
                  </Text>
                </View>
              )) || (
                <Text className="text-neutral-500">
                  Pas d'instructions fournies.
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 👈 NE PAS OUBLIER LE COMPOSANT ALERT */}
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}
