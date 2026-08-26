import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import { StatusBar } from "expo-status-bar";
import CustomAlert from "../components/CustomAlert";

const MEAL_TYPES = ["PETIT-DEJ", "DEJEUNER", "COLLATION", "DINER"];

// Interface pour le résultat des courses
interface GroceryResult {
  productName: string;
  isProcessed: boolean;
  verdict: "VALIDE" | "MODERATION" | "INTERDIT";
  explanation: string;
}

// Interface pour la recette générée depuis le frigo
interface FridgeRecipe {
  title: string;
  estimatedPrice: string;
  prepTime: string;
  volumeScore: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  instructions: string[];
  cookingTechniqueTip?: string;
}

interface FridgeResult {
  detectedIngredients: string[];
  recipe: FridgeRecipe;
}

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [scanMode, setScanMode] = useState<"MEAL" | "GROCERY" | "FRIDGE">(
    "MEAL",
  );

  const [selectedType, setSelectedType] = useState("DEJEUNER");
  const [description, setDescription] = useState("");

  const [groceryResult, setGroceryResult] = useState<GroceryResult | null>(
    null,
  );
  const [fridgeResult, setFridgeResult] = useState<FridgeResult | null>(null);

  const cameraRef = useRef<any>(null);

  // --- ÉTATS POUR LE CUSTOM ALERT ---
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black justify-center">
        <Text className="text-white text-center mt-2.5 text-base mb-6 px-4">
          Le coach a besoin de tes yeux (et de ta caméra) !
        </Text>
        <View className="flex-1 relative">
          <CameraView style={{ flex: 1, width: "100%" }} />
          <View className="absolute bottom-10 self-center">
            <TouchableOpacity
              className="bg-orange-500 py-3 px-6 rounded-xl items-center justify-center"
              onPress={requestPermission}
            >
              <Text className="text-white font-bold text-base">
                Autoriser la cam
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
      });
      setPhotoUri(photo.uri);
    }
  };

  const uploadPhoto = async () => {
    if (!photoUri) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", {
        uri: photoUri,
        name: "photo.jpg",
        type: "image/jpeg",
      } as any);

      if (scanMode === "MEAL") {
        // --- LOGIQUE MODE REPAS ---
        formData.append("type", selectedType);
        if (description.trim() !== "") {
          formData.append("description", description);
        }

        const response = await api.post("/meals", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.data.status === "success") {
          showAlert("Coach IA :", response.data.data.comment);
          resetScanner();
        }
      } else if (scanMode === "GROCERY") {
        // --- LOGIQUE MODE COURSES ---
        const response = await api.post("/grocery/scan", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.data.status === "success") {
          setGroceryResult(response.data.data);
        }
      } else if (scanMode === "FRIDGE") {
        // --- LOGIQUE MODE FRIGO ---
        formData.append("mealType", selectedType);

        const response = await api.post("/fridge/scan", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.data.status === "success") {
          setFridgeResult(response.data.data);
        }
      }
    } catch (error) {
      console.error("Erreur d'analyse :", error);
      showAlert("Erreur", "Le coach n'a pas pu analyser cette image.");
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setPhotoUri(null);
    setDescription("");
    setGroceryResult(null);
    setFridgeResult(null);
  };

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case "VALIDE":
        return { color: "#2E8B57", icon: "checkmark-circle", text: "Validé" };
      case "MODERATION":
        return { color: "#F59E0B", icon: "warning", text: "À Modérer" };
      case "INTERDIT":
        return { color: "#DC2626", icon: "close-circle", text: "Interdit !" };
      default:
        return { color: "#888", icon: "help-circle", text: "Inconnu" };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <StatusBar style="light" />

      <View className="flex-1 bg-black">
        {photoUri ? (
          <>
            <Image
              source={{ uri: photoUri }}
              className="absolute w-full h-full"
              resizeMode="cover"
            />

            {/* RÉSULTAT COURSES */}
            {groceryResult && (
              <View className="flex-1 justify-end p-4">
                <View className="bg-white rounded-3xl p-6 shadow-xl items-center">
                  <Ionicons
                    name={getVerdictStyle(groceryResult.verdict).icon as any}
                    size={70}
                    color={getVerdictStyle(groceryResult.verdict).color}
                    className="mb-2"
                  />
                  <Text className="text-2xl font-black text-neutral-800 text-center mb-1">
                    {groceryResult.productName}
                  </Text>
                  <View
                    className="px-4 py-1 rounded-full mb-4 mt-1"
                    style={{
                      backgroundColor:
                        getVerdictStyle(groceryResult.verdict).color + "20",
                    }}
                  >
                    <Text
                      className="font-bold text-sm uppercase tracking-wider"
                      style={{
                        color: getVerdictStyle(groceryResult.verdict).color,
                      }}
                    >
                      {getVerdictStyle(groceryResult.verdict).text}
                    </Text>
                  </View>
                  <Text className="text-neutral-600 text-base text-center leading-6 mb-6">
                    {groceryResult.explanation}
                  </Text>

                  <TouchableOpacity
                    className="bg-neutral-800 w-full py-4 rounded-xl items-center flex-row justify-center shadow-sm"
                    onPress={resetScanner}
                  >
                    <Ionicons
                      name="scan-outline"
                      size={20}
                      color="white"
                      className="mr-2"
                    />
                    <Text className="text-white font-bold text-base">
                      Nouveau Scan
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* RÉSULTAT FRIGO / RECETTE */}
            {fridgeResult && (
              <View className="flex-1 justify-end p-4">
                <View className="bg-white rounded-3xl p-5 shadow-xl max-h-[85%]">
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-xl font-black text-neutral-800 flex-1 mr-2">
                        {fridgeResult.recipe.title}
                      </Text>
                      <View className="bg-emerald-100 px-3 py-1 rounded-full">
                        <Text className="text-emerald-700 font-bold text-xs">
                          {fridgeResult.recipe.prepTime}
                        </Text>
                      </View>
                    </View>
                    {/* Ingrédients détectés */}
                    <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                      Aliments repérés dans ton frigo
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5 mb-4">
                      {fridgeResult.detectedIngredients?.map((item, idx) => (
                        <View
                          key={idx}
                          className="bg-neutral-100 px-2.5 py-1 rounded-lg"
                        >
                          <Text className="text-xs font-semibold text-neutral-700">
                            {item}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {/* Macros */}
                    <View className="flex-row justify-between bg-neutral-900 rounded-2xl p-3 mb-4">
                      <View className="items-center flex-1">
                        <Text className="text-xs text-neutral-400">
                          Calories
                        </Text>
                        <Text className="text-base font-black text-white">
                          {fridgeResult.recipe.calories} kcal
                        </Text>
                      </View>
                      <View className="items-center flex-1 border-x border-neutral-800">
                        <Text className="text-xs text-emerald-400">
                          Protéines
                        </Text>
                        <Text className="text-base font-black text-emerald-400">
                          {fridgeResult.recipe.protein}g
                        </Text>
                      </View>
                      <View className="items-center flex-1 border-r border-neutral-800">
                        <Text className="text-xs text-neutral-400">
                          Glucides
                        </Text>
                        <Text className="text-base font-black text-white">
                          {fridgeResult.recipe.carbs}g
                        </Text>
                      </View>
                      <View className="items-center flex-1">
                        <Text className="text-xs text-neutral-400">
                          Lipides
                        </Text>
                        <Text className="text-base font-black text-white">
                          {fridgeResult.recipe.fats}g
                        </Text>
                      </View>
                    </View>
                    {/* Ingrédients & proportions */}
                    <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                      Ingrédients nécessaires
                    </Text>
                    {fridgeResult.recipe?.ingredients?.map((ing, idx) => (
                      <Text key={idx} className="text-sm text-neutral-700 mb-1">
                        • {ing}
                      </Text>
                    ))}
                    {/* Instructions */}
                    <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider mt-3 mb-2">
                      Préparation & Cuisson
                    </Text>
                    {fridgeResult.recipe?.instructions?.map((step, idx) => (
                      <Text
                        key={idx}
                        className="text-sm text-neutral-600 mb-2 leading-5"
                      >
                        {step}
                      </Text>
                    ))}
                    {/* Astuce Technique */}
                    {fridgeResult.recipe.cookingTechniqueTip && (
                      <View className="bg-orange-50 border border-orange-200 rounded-xl p-3 my-3">
                        <Text className="text-xs font-bold text-orange-700 mb-1">
                          💡 Technique de cuisson du chef :
                        </Text>
                        <Text className="text-xs text-orange-950 leading-4">
                          {fridgeResult.recipe.cookingTechniqueTip}
                        </Text>
                      </View>
                    )}

                    {/* BOUTON AJOUTER AU JOURNAL */}
                    <TouchableOpacity
                      className="bg-emerald-500 w-full py-4 rounded-xl items-center flex-row justify-center mt-4 shadow-sm"
                      onPress={async () => {
                        try {
                          const response = await api.post("/meals/manual", {
                            name: fridgeResult.recipe.title,
                            calories: fridgeResult.recipe.calories,
                            protein: fridgeResult.recipe.protein,
                            carbs: fridgeResult.recipe.carbs,
                            fats: fridgeResult.recipe.fats,
                            type: selectedType,
                          });

                          if (response.data.status === "success") {
                            showAlert(
                              "Opération réussie 🎯",
                              `Boom ! ${fridgeResult.recipe.protein}g de protéines ajoutées à ton journal.`,
                            );
                            resetScanner();
                          }
                        } catch (error) {
                          console.error("Erreur ajout manuel", error);
                          showAlert(
                            "Erreur",
                            "Impossible d'enregistrer le repas dans ton journal.",
                          );
                        }
                      }}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={22}
                        color="white"
                        className="mr-2"
                      />
                      <Text className="text-white font-bold text-base">
                        Manger ce repas (+{fridgeResult.recipe?.protein}g Prot)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="bg-neutral-800 w-full py-3.5 rounded-xl items-center flex-row justify-center mt-3 shadow-sm"
                      onPress={resetScanner}
                    >
                      <Ionicons
                        name="scan-outline"
                        size={18}
                        color="white"
                        className="mr-2"
                      />
                      <Text className="text-white font-bold text-sm">
                        Nouveau Scan
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>
            )}

            {/* AVANT ANALYSE */}
            {!groceryResult && !fridgeResult && (
              <KeyboardAvoidingView
                className="flex-1 justify-end"
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
              >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                  <View className="flex-1 justify-end">
                    {loading ? (
                      <View className="bg-neutral-900 pt-6 pb-12 rounded-t-3xl items-center shadow-lg">
                        <ActivityIndicator
                          size="large"
                          color={
                            scanMode === "MEAL"
                              ? "#FF4500"
                              : scanMode === "GROCERY"
                                ? "#3B82F6"
                                : "#10B981"
                          }
                        />
                        <Text className="text-white text-center mt-4 text-base font-medium px-4 leading-6">
                          {scanMode === "MEAL" &&
                            "L'IA juge ton assiette...\n(Le 1er scan peut prendre 50s, le serveur s'échauffe !)"}
                          {scanMode === "GROCERY" &&
                            "Analyse du produit en cours...\n(Le 1er scan peut prendre 50s, le serveur s'échauffe !)"}
                          {scanMode === "FRIDGE" &&
                            "Le Chef IA examine ton frigo et cuisine ta recette...\n(Le 1er scan peut prendre 50s, le serveur s'échauffe !)"}
                        </Text>
                      </View>
                    ) : (
                      <View className="bg-neutral-900 pt-5 pb-8 rounded-t-3xl shadow-lg">
                        {scanMode !== "GROCERY" ? (
                          <>
                            <Text className="text-neutral-400 text-center text-sm mb-4">
                              {scanMode === "MEAL"
                                ? "Quel est ce repas ?"
                                : "Pour quel repas cuisinons-nous ?"}
                            </Text>

                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={{
                                paddingHorizontal: 16,
                                alignItems: "center",
                              }}
                              className="mb-5"
                            >
                              {MEAL_TYPES.map((type) => (
                                <TouchableOpacity
                                  key={type}
                                  className={`py-3 px-5 rounded-full mx-1.5 ${
                                    selectedType === type
                                      ? scanMode === "FRIDGE"
                                        ? "bg-emerald-500"
                                        : "bg-orange-500"
                                      : "bg-neutral-800"
                                  }`}
                                  onPress={() => setSelectedType(type)}
                                >
                                  <Text
                                    className={`font-bold text-sm tracking-wide ${
                                      selectedType === type
                                        ? "text-white"
                                        : "text-neutral-400"
                                    }`}
                                  >
                                    {type}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>

                            {scanMode === "MEAL" && (
                              <TextInput
                                className="bg-neutral-800 text-white px-4 py-3.5 rounded-xl mx-4 mb-5 text-sm border border-neutral-700"
                                placeholder="Ingrédients (ex: Fromage blanc 0%)..."
                                placeholderTextColor="#888"
                                value={description}
                                onChangeText={setDescription}
                                maxLength={120}
                              />
                            )}
                          </>
                        ) : (
                          <Text className="text-white text-center text-base font-bold mb-6 mt-2">
                            Prêt à analyser ce produit ?
                          </Text>
                        )}

                        <View className="flex-row justify-around px-4">
                          <TouchableOpacity
                            className="bg-neutral-700 py-3.5 px-4 rounded-xl flex-[0.47] items-center justify-center"
                            onPress={resetScanner}
                          >
                            <Text className="text-white font-bold text-base">
                              Reprendre
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            className={`py-3.5 px-4 rounded-xl flex-[0.47] items-center justify-center ${
                              scanMode === "MEAL"
                                ? "bg-orange-500"
                                : scanMode === "GROCERY"
                                  ? "bg-blue-500"
                                  : "bg-emerald-500"
                            }`}
                            onPress={uploadPhoto}
                          >
                            <Text className="text-white font-bold text-base">
                              Envoyer à l'IA
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableWithoutFeedback>
              </KeyboardAvoidingView>
            )}
          </>
        ) : (
          <View className="flex-1 relative">
            <CameraView
              style={{ flex: 1, width: "100%" }}
              facing="back"
              ref={cameraRef}
            />

            {/* SÉLECTEUR DE MODE À 3 ONGLETS */}
            <View className="absolute top-4 self-center flex-row bg-black/60 rounded-full p-1 border border-white/10">
              <TouchableOpacity
                className={`px-4 py-2 rounded-full flex-row items-center ${scanMode === "MEAL" ? "bg-orange-500" : ""}`}
                onPress={() => setScanMode("MEAL")}
              >
                <Ionicons
                  name="restaurant-outline"
                  size={16}
                  color={scanMode === "MEAL" ? "white" : "#aaa"}
                  className="mr-1.5"
                />
                <Text
                  className={`font-bold text-xs ${scanMode === "MEAL" ? "text-white" : "text-neutral-400"}`}
                >
                  Repas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`px-4 py-2 rounded-full flex-row items-center ${scanMode === "GROCERY" ? "bg-blue-500" : ""}`}
                onPress={() => setScanMode("GROCERY")}
              >
                <Ionicons
                  name="cart-outline"
                  size={16}
                  color={scanMode === "GROCERY" ? "white" : "#aaa"}
                  className="mr-1.5"
                />
                <Text
                  className={`font-bold text-xs ${scanMode === "GROCERY" ? "text-white" : "text-neutral-400"}`}
                >
                  Courses
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`px-4 py-2 rounded-full flex-row items-center ${scanMode === "FRIDGE" ? "bg-emerald-500" : ""}`}
                onPress={() => setScanMode("FRIDGE")}
              >
                <Ionicons
                  name="cube-outline"
                  size={16}
                  color={scanMode === "FRIDGE" ? "white" : "#aaa"}
                  className="mr-1.5"
                />
                <Text
                  className={`font-bold text-xs ${scanMode === "FRIDGE" ? "text-white" : "text-neutral-400"}`}
                >
                  Frigo
                </Text>
              </TouchableOpacity>
            </View>

            <View className="absolute bottom-10 left-0 right-0 items-center bg-transparent">
              <TouchableOpacity
                className="w-[70px] h-[70px] rounded-full bg-white/30 justify-center items-center"
                onPress={takePicture}
              >
                <View className="w-[54px] h-[54px] rounded-full bg-white shadow-lg" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}
