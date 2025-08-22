// src/screens/MenuScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { colors } from '../theme';
import MealCard from '../components/MealCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchArranchamento, marcarRefeicao } from '../services/api';
import { Usuario } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Menu'>;

export default function MenuScreen({ route, navigation }: Props) {
  const { dateISO, label } = route.params;
  const [cafe, setCafe] = useState(false);
  const [almoco, setAlmoco] = useState(false);
  const [janta, setJanta] = useState(false);
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: label ? `Cardápio — ${label}` : 'Cardápio do Dia' });
  }, [label, navigation]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        if (!raw) {
          Alert.alert('Sessão expirada', 'Faça login novamente.');
          return navigation.navigate('Login');
        }
        const userData = JSON.parse(raw);

        // Padroniza user sempre com uid
        const userObj = { ...userData, uid: userData.uid || userData.id };
        setUser(userObj);

        if (!userObj.uid) {
          Alert.alert('Erro', 'ID de usuário inválido.');
          return navigation.navigate('Login');
        }

        const ciaLabel = userObj.cia;
        const { data, error } = await fetchArranchamento(userObj.uid, dateISO, ciaLabel);
        if (error) {
          console.error('Erro ao buscar arranchamento:', error);
          // Se for erro de permissão do Firestore, mostre aviso específico
          Alert.alert('Erro', 'Não foi possível buscar o arranchamento. Verifique suas permissões.');
          setCafe(false); setAlmoco(false); setJanta(false);
        } else if (data) {
          setCafe(!!data.cafe);
          setAlmoco(!!data.almoco);
          setJanta(!!data.janta);
        } else {
          setCafe(false);
          setAlmoco(false);
          setJanta(false);
        }
      } catch (e) {
        console.error('Falha ao carregar usuário:', e);
        Alert.alert('Erro', 'Não foi possível carregar seus dados.');
        navigation.navigate('Login');
      }
    })();
  }, [dateISO, navigation]);

  async function confirmarSelecoes() {
    if (!user?.uid) {
      return Alert.alert('Sessão expirada', 'Faça login novamente.');
    }

    setLoading(true);
    try {
      // sempre envia uid
      const { data, error } = await marcarRefeicao(user.uid, dateISO, cafe, almoco, janta);
      if (error) {
        console.error('Erro ao marcar refeição:', error);
        Alert.alert('Erro', error.message || 'Não foi possível registrar.');
      } else {
        const msg = data === 'removed' ? 'Arranchamento removido.' : 'Arranchamento registrado com sucesso.';
        Alert.alert('Tudo certo!', msg);
        navigation.goBack();
      }
    } catch (e: any) {
      console.error('Falha na conexão:', e);
      Alert.alert('Falha na conexão', e?.message ?? 'Tente novamente');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <MealCard
          title="Café da Manhã"
          subtitle="Pão, café, leite, frutas, queijo, presunto"
          value={cafe}
          onChange={setCafe}
          question="Vai tomar café?"
        />
        <MealCard
          title="Almoço"
          subtitle="Arroz, feijão, carne, salada, sobremesa"
          value={almoco}
          onChange={setAlmoco}
          question="Vai almoçar?"
        />
        <MealCard
          title="Jantar"
          subtitle="Sopa, pão, carne, legumes, fruta"
          value={janta}
          onChange={setJanta}
          question="Vai jantar?"
        />

        <TouchableOpacity
          style={[styles.confirmButton, loading && { opacity: 0.7 }]}
          onPress={confirmarSelecoes}
          disabled={loading}
        >
          <Text style={styles.confirmButtonText}>
            {loading ? 'Confirmando...' : 'Confirmar Seleções'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#EFEFF3', flexGrow: 1 },
  card: { backgroundColor: colors.bg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  confirmButton: {
    backgroundColor: '#174e0c',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});
