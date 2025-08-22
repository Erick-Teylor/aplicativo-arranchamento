// src/screens/SelectDayScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { colors } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchArranchamentosPeriodo } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'SelectDay'>;

const next7Days = Array.from({ length: 7 }).map((_, i) => {
  const d = addDays(new Date(), i);
  return {
    date: d,
    label: `${format(d, 'EEE', { locale: ptBR })} · ${format(d, 'd LLL', { locale: ptBR })}`,
    iso: format(d, 'yyyy-MM-dd'),
    isToday: i === 0,
  };
});

export default function SelectDayScreen({ navigation }: Props) {
  const [user, setUser] = useState<{ uid: string; role?: string; cia?: string } | null>(null);
  const [daysAnswered, setDaysAnswered] = useState<string[]>([]);

  // Carregar os dias já arranchados do usuário logado
  const loadAnsweredDays = async (userId: string, ciaLabel?: string) => {
    if (!userId) {
      console.warn('⚠ Nenhum userId fornecido, abortando busca de arranchamentos');
      return;
    }

    try {
      const dias = next7Days.map(item => item.iso);
      const { data, error } = await fetchArranchamentosPeriodo(userId, dias, ciaLabel);
      if (error) {
        console.error('Erro ao buscar arranchamentos (periodo):', error);
        setDaysAnswered([]);
        return;
      }
      const answered = (data || []).map((d: any) => d.data).filter(Boolean);
      setDaysAnswered(answered);
    } catch (e) {
      console.error('❌ Erro ao buscar arranchamentos:', e);
      setDaysAnswered([]);
    }
  };

  // Pega o usuário do AsyncStorage ao montar a tela
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('user');
      if (!raw) return;
      const loggedUser = JSON.parse(raw);

      const uid = loggedUser.uid || loggedUser.id;
      const userObj = { uid, role: loggedUser.role, cia: loggedUser.cia };
      setUser(userObj);

      if (uid) {
        await loadAnsweredDays(uid, userObj.cia);
      }
    })();
  }, []);

  // Atualiza os ícones sempre que a tela recebe foco
  useFocusEffect(
    React.useCallback(() => {
      if (!user?.uid) return;
      loadAnsweredDays(user.uid, user.cia);
    }, [user])
  );

  const renderItem = ({ item }: { item: typeof next7Days[0] }) => {
    const isAnswered = daysAnswered.includes(item.iso);

    return (
      <TouchableOpacity
        style={[styles.item, item.isToday && styles.itemActive]}
        onPress={() =>
          navigation.navigate('Menu', {
            dateISO: item.iso,
            label: item.label,
            onConfirm: (confirmedDateISO: string) => {
              setDaysAnswered(prev => [...prev, confirmedDateISO]);
            },
          })
        }
      >
        <Text style={styles.itemText}>{item.label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {item.isToday && <Text style={styles.tag}>Hoje</Text>}
          {isAnswered && (
            <MaterialIcons name="check-circle" size={24} color="#276624" style={{ marginLeft: 8 }} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Próximos 7 dias</Text>
      <FlatList
        data={next7Days}
        keyExtractor={(item) => item.iso}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#EFEFF3' },
  header: { fontWeight: '600', marginBottom: 10, color: colors.muted },
  item: {
    padding: 16,
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemActive: { borderColor: colors.primary },
  itemText: { fontSize: 16 },
  tag: {
    color: colors.bg,
    backgroundColor: '#276624ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
