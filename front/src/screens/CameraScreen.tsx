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

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [scanMode, setScanMode] = useState<"MEAL" | "GROCERY">("MEAL");

  const [selectedType, setSelectedType] = useState("DEJEUNER");
  const [description, setDescription] = useState("");

  const [groceryResult, setGroceryResult] = useState<GroceryResult | null>(
    null,
  );

  const cameraRef = useRef<any>(null);

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
          // Utilisation du CustomAlert !
          showAlert("Coach IA :", response.data.data.comment);
          resetScanner();
        }
      } else {
        // --- LOGIQUE MODE COURSES ---
        const response = await api.post("/grocery/scan", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.data.status === "success") {
          setGroceryResult(response.data.data);
        }
      }
    } catch (error) {
      console.error("Erreur d'analyse :", error);
      // Utilisation du CustomAlert !
      showAlert("Erreur", "Le coach n'a pas pu analyser cette image.");
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setPhotoUri(null);
    setDescription("");
    setGroceryResult(null);
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

            {/* Rendu post-photo pour le mode COURSES (Résultat IA) */}
            {groceryResult ? (
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
            ) : (
              /* Rendu post-photo AVANT analyse (Formulaire Repas ou Bouton d'envoi) */
              <KeyboardAvoidingView
                className="flex-1 justify-end"
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
              >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                  <View className="flex-1 justify-end">
                    {loading ? (
                      <View className="bg-neutral-900 pt-6 pb-12 rounded-t-3xl items-center shadow-lg">
                        <ActivityIndicator
                          size="large"
                          color={scanMode === "MEAL" ? "#FF4500" : "#3B82F6"}
                        />
                        <Text className="text-white text-center mt-4 text-base font-medium px-4 leading-6">
                          {scanMode === "MEAL"
                            ? "L'IA juge ton assiette...\n(Le 1er scan peut prendre 50s, le serveur s'échauffe !)"
                            : "Analyse du produit en cours...\n(Le 1er scan peut prendre 50s, le serveur s'échauffe !)"}
                        </Text>
                      </View>
                    ) : (
                      <View className="bg-neutral-900 pt-5 pb-8 rounded-t-3xl shadow-lg">
                        {scanMode === "MEAL" ? (
                          <>
                            <Text className="text-neutral-400 text-center text-sm mb-4">
                              Quel est ce repas ?
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
                                      ? "bg-orange-500"
                                      : "bg-neutral-800"
                                  }`}
                                  onPress={() => setSelectedType(type)}
                                >
                                  <Text
                                    className={`font-bold text-sm tracking-wide ${selectedType === type ? "text-white" : "text-neutral-400"}`}
                                  >
                                    {type}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>

                            <TextInput
                              className="bg-neutral-800 text-white px-4 py-3.5 rounded-xl mx-4 mb-5 text-sm border border-neutral-700"
                              placeholder="Ingrédients (ex: Fromage blanc 0%)..."
                              placeholderTextColor="#888"
                              value={description}
                              onChangeText={setDescription}
                              maxLength={120}
                            />
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
                            className={`py-3.5 px-4 rounded-xl flex-[0.47] items-center justify-center ${scanMode === "MEAL" ? "bg-orange-500" : "bg-blue-500"}`}
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

            {/* SÉLECTEUR DE MODE (En haut de l'écran) */}
            <View className="absolute top-4 self-center flex-row bg-black/50 rounded-full p-1">
              <TouchableOpacity
                className={`px-5 py-2.5 rounded-full flex-row items-center ${scanMode === "MEAL" ? "bg-orange-500" : ""}`}
                onPress={() => setScanMode("MEAL")}
              >
                <Ionicons
                  name="restaurant-outline"
                  size={18}
                  color={scanMode === "MEAL" ? "white" : "#aaa"}
                  className="mr-2"
                />
                <Text
                  className={`font-bold ${scanMode === "MEAL" ? "text-white" : "text-neutral-400"}`}
                >
                  Repas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-5 py-2.5 rounded-full flex-row items-center ${scanMode === "GROCERY" ? "bg-blue-500" : ""}`}
                onPress={() => setScanMode("GROCERY")}
              >
                <Ionicons
                  name="cart-outline"
                  size={18}
                  color={scanMode === "GROCERY" ? "white" : "#aaa"}
                  className="mr-2"
                />
                <Text
                  className={`font-bold ${scanMode === "GROCERY" ? "text-white" : "text-neutral-400"}`}
                >
                  Courses
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
