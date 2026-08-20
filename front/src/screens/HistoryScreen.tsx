import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

// 1. MISE À JOUR DES INTERFACES AVEC LES NOUVELLES DONNÉES
interface Meal {
  id: string;
  type: string;
  foodItems: string;
  calories: number;
  protein: number;
  carbs: number; // NOUVEAU
  fats: number; // NOUVEAU
  isCompliant: boolean;
  comment: string;
}

interface HistoryDay {
  id: string;
  date: string;
  isTrainingDay: boolean;
  waterIntake: number; // NOUVEAU
  weight: number | null;
  meals: Meal[];
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [graphWidth, setGraphWidth] = useState(0);
  const GRAPH_HEIGHT = 180;

  const fetchHistory = async () => {
    try {
      const response = await api.get("/daily/history");
      if (response.data.status === "success") {
        setHistory(response.data.data);
      }
    } catch (error) {
      console.error(
        "❌ Erreur lors de la récupération de l'historique :",
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, []),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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

  // LE GRAPHIQUE RESTE INTACT (Il était déjà très bien optimisé)
  const renderGraph = () => {
    const graphData = history.filter((d) => d.weight !== null).reverse();

    if (graphData.length < 2) return null;

    const weights = graphData.map((d) => d.weight as number);
    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const range = maxW - minW || 1;

    return (
      <View className="bg-white p-5 rounded-2xl shadow-sm mt-4 mb-10">
        <Text className="text-xl font-black text-neutral-800 mb-6">
          Courbe de Poids
        </Text>

        <View
          className="w-full relative"
          style={{ height: GRAPH_HEIGHT }}
          onLayout={(e) => setGraphWidth(e.nativeEvent.layout.width)}
        >
          <View className="absolute w-full h-[1px] bg-neutral-200 bottom-8" />

          {graphWidth > 0 && (
            <>
              {graphData.map((d, i) => {
                if (i === graphData.length - 1) return null;
                const nextD = graphData[i + 1];

                const x1 = (i / (graphData.length - 1)) * graphWidth;
                const y1 =
                  (1 - ((d.weight as number) - minW) / range) *
                  (GRAPH_HEIGHT - 60);

                const x2 = ((i + 1) / (graphData.length - 1)) * graphWidth;
                const y2 =
                  (1 - ((nextD.weight as number) - minW) / range) *
                  (GRAPH_HEIGHT - 60);

                const dx = x2 - x1;
                const dy = y2 - y1;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                const cx = (x1 + x2) / 2;
                const cy = (y1 + y2) / 2;

                return (
                  <View
                    key={`line-${d.id}`}
                    className="absolute bg-orange-500 z-0"
                    style={{
                      left: cx - length / 2,
                      top: cy - 1.5,
                      width: length,
                      height: 3,
                      transform: [{ rotate: `${angle}deg` }],
                    }}
                  />
                );
              })}

              {graphData.map((d, i) => {
                const xPos = (i / (graphData.length - 1)) * graphWidth;
                const yPos =
                  (1 - ((d.weight as number) - minW) / range) *
                  (GRAPH_HEIGHT - 60);

                return (
                  <View
                    key={`dot-${d.id}`}
                    className="absolute items-center justify-between z-10"
                    style={{
                      left: xPos,
                      top: yPos,
                      width: 60,
                      height: 60,
                      transform: [{ translateX: -30 }, { translateY: -30 }],
                    }}
                  >
                    <View className="flex-1 justify-end pb-1 items-center w-full">
                      <Text className="text-[13px] font-black text-orange-600 bg-white px-1 overflow-hidden">
                        {d.weight}
                      </Text>
                    </View>
                    <View className="w-4 h-4 bg-white border-[3px] border-orange-500 rounded-full" />
                    <View className="flex-1 justify-start pt-1 items-center w-full">
                      <Text className="text-[10px] font-medium text-neutral-400 bg-white px-1 overflow-hidden">
                        {new Date(d.date).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </View>
    );
  };

  // 2. MISE À JOUR DE LA CARTE JOURNALIÈRE ET DES REPAS
  const renderDay = ({ item }: { item: HistoryDay }) => {
    // Calcul de TOUTES les macros de la journée
    const totalCals = item.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const totalProts = item.meals.reduce((sum, m) => sum + (m.protein || 0), 0);
    const totalCarbs = item.meals.reduce((sum, m) => sum + (m.carbs || 0), 0);
    const totalFats = item.meals.reduce((sum, m) => sum + (m.fats || 0), 0);
    const isExpanded = expandedId === item.id;

    return (
      <TouchableOpacity
        className="bg-white p-4 rounded-2xl mb-4 shadow-sm elevation-md"
        activeOpacity={0.9}
        onPress={() => toggleExpand(item.id)}
      >
        <View className="flex-row justify-between items-center mb-3 pb-2 border-b border-neutral-100">
          <Text className="text-base font-bold capitalize text-neutral-800">
            {formatDate(item.date)}
          </Text>
          <View
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: item.isTrainingDay ? "#FF4500" : "#555" }}
          >
            <Text className="text-white text-xs font-bold">
              {item.isTrainingDay ? "🏀 Entraînement" : "🛋️ Repos"}
            </Text>
          </View>
        </View>

        {/* AFFICHAGE DES 4 MACROS + L'EAU */}
        <View className="flex-row flex-wrap gap-x-4 gap-y-2 mb-2">
          <Text className="text-sm font-bold text-neutral-700">
            🔥 {totalCals} kcal
          </Text>
          <Text className="text-sm font-bold text-neutral-700">
            🥩 {totalProts} g
          </Text>
          <Text className="text-sm font-bold text-neutral-700">
            🍚 {totalCarbs} g
          </Text>
          <Text className="text-sm font-bold text-neutral-700">
            🥑 {totalFats} g
          </Text>
          {item.waterIntake > 0 && (
            <Text className="text-sm font-bold text-blue-500">
              💧 {item.waterIntake} ml
            </Text>
          )}
          {item.weight && (
            <Text className="text-sm font-bold text-orange-500">
              ⚖️ {item.weight} kg
            </Text>
          )}
        </View>

        <View className="flex-row justify-between items-center mt-2">
          <Text className="text-neutral-400 text-sm italic">
            {item.meals.length} repas enregistré
            {item.meals.length > 1 ? "s" : ""}
          </Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#888"
          />
        </View>

        {/* DÉTAIL DES ASSIETTES */}
        {isExpanded && item.meals.length > 0 && (
          <View className="mt-4 pt-4 border-t border-neutral-100">
            {item.meals.map((meal) => (
              <View
                key={meal.id}
                className="bg-neutral-50 p-3 rounded-xl mb-3 border-l-4"
                style={{
                  borderLeftColor: meal.isCompliant ? "#2E8B57" : "#B22222",
                }}
              >
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="font-bold text-base text-neutral-800">
                    {formatMealType(meal.type)}
                  </Text>
                </View>

                {/* MACROS DÉTAILLÉES DU REPAS */}
                <View className="flex-row flex-wrap gap-x-3 mt-1 mb-2">
                  <Text className="text-xs font-bold text-neutral-600">
                    🔥 {meal.calories || 0} kcal
                  </Text>
                  <Text className="text-xs font-bold text-neutral-600">
                    🥩 {meal.protein || 0}g
                  </Text>
                  <Text className="text-xs font-bold text-neutral-600">
                    🍚 {meal.carbs || 0}g
                  </Text>
                  <Text className="text-xs font-bold text-neutral-600">
                    🥑 {meal.fats || 0}g
                  </Text>
                </View>

                <Text className="text-sm text-neutral-500 mb-1">
                  {meal.foodItems}
                </Text>
                <Text
                  className="text-xs italic mt-1 leading-5"
                  style={{ color: meal.isCompliant ? "#2E8B57" : "#B22222" }}
                >
                  "{meal.comment}"
                </Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-neutral-100">
        <ActivityIndicator size="large" color="#FF4500" />
        <Text className="mt-2 text-neutral-600">
          Chargement des archives...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-100" edges={["top"]}>
      <StatusBar style="dark" />

      {/* 3. CORRECTION DE L'EN-TÊTE : Aligné, aéré, sans superposition */}
      <View className="flex-1 bg-neutral-100 pt-2">
        <View className="flex-row justify-center items-center mx-4 mb-6 mt-2">
          <Text className="text-3xl font-black text-neutral-800 text-center">
            Archives
          </Text>
        </View>

        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderDay}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderGraph}
          ListEmptyComponent={
            <Text className="text-center text-neutral-400 mt-8 italic text-base">
              Ton historique est vide. Le chemin commence aujourd'hui !
            </Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}
