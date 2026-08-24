import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";

interface CustomDeleteAlertProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function CustomDeleteAlert({
  visible,
  onCancel,
  onConfirm,
}: CustomDeleteAlertProps) {
  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      {/* Fond semi-transparent */}
      <View className="flex-1 justify-center items-center bg-black/80 px-4">
        {/* Boîte de l'alerte */}
        <View className="bg-neutral-900 w-full rounded-3xl p-6 border border-red-500/30 shadow-2xl">
          <Text className="text-red-500 font-black text-2xl mb-2">
            Supprimer le repas
          </Text>
          <Text className="text-neutral-300 text-base mb-8 leading-6">
            Es-tu sûr de vouloir jeter cette assiette à la poubelle ?
          </Text>

          <View className="flex-row justify-between gap-4">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 bg-neutral-700 py-3.5 rounded-xl items-center"
            >
              <Text className="text-white font-bold text-lg">Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              className="flex-1 bg-red-600 py-3.5 rounded-xl items-center shadow-lg shadow-red-600/30"
            >
              <Text className="text-white font-bold text-lg">Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
