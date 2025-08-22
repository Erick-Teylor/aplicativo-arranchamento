// navigation/index.tsx
import React from "react";
import { TouchableOpacity, Platform } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import SelectDayScreen from "../screens/SelectDayScreen";
import MenuScreen from "../screens/MenuScreen";
import AdminScreen from "../screens/AdminScreen";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  SelectDay: undefined;
  Menu: { dateISO: string; label?: string };
  Admin: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerBackTitleVisible: false,
        // substitui o botão de voltar padrão por uma flecha custom
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => {
              // se existir histórico, volta; senão, vai para Login (fallback)
              if (navigation.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("Login");
              }
            }}
            style={{ paddingHorizontal: 12 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Ionicons
              name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
              size={24}
              color="#000"
            />
          </TouchableOpacity>
        ),
      })}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: "Arranchamento 3° BE CMB", headerLeft: () => null }} // Login: sem voltar
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: "Primeiro Acesso" }}
      />
      <Stack.Screen
        name="SelectDay"
        component={SelectDayScreen}
        options={{ title: "Selecionar Dia" }}
      />
      <Stack.Screen
        name="Menu"
        component={MenuScreen}
        options={{ title: "Cardápio do Dia" }}
      />
      <Stack.Screen
        name="Admin"
        component={AdminScreen}
        options={{ title: "Área do Administrador" }}
      />
    </Stack.Navigator>
  );
}
