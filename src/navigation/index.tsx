// navigation/index.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SelectDayScreen from '../screens/SelectDayScreen';
import MenuScreen from '../screens/MenuScreen';
import AdminScreen from '../screens/AdminScreen';

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
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Arranchamento 3° BE CMB'}}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Primeiro Acesso' }}
      />
      <Stack.Screen
        name="SelectDay"
        component={SelectDayScreen}
        options={{ title: 'Selecionar Dia' }}
      />
      <Stack.Screen
        name="Menu"
        component={MenuScreen}
        options={{ title: 'Cardápio do Dia' }}
      />
      <Stack.Screen
        name="Admin"
        component={AdminScreen}
        options={{ title: 'Área do Administrador' }}
      />
    </Stack.Navigator>
  );
}
