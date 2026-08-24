import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function CustomAlert({
  visible,
  title,
  message,
  onClose,
}: CustomAlertProps) {
  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      {/* Fond semi-transparent */}
      <View className="flex-1 justify-center items-center bg-black/80 px-4">
        {/* Boîte de l'alerte */}
        <View className="bg-neutral-900 w-full rounded-3xl p-6 border border-orange-500/30 shadow-2xl">
          <Text className="text-orange-500 font-black text-2xl mb-2">
            {title}
          </Text>
          <Text className="text-neutral-300 text-base mb-8 leading-6">
            {message}
          </Text>

          <TouchableOpacity
            onPress={onClose}
            className="bg-orange-500 py-3.5 rounded-xl items-center shadow-lg shadow-orange-500/30"
          >
            <Text className="text-white font-bold text-lg">
              OK, j'ai compris
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
