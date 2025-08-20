// screens/AdminScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firestore } from '../services/FirebaseConfig';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { colors } from '../theme';

export default function AdminScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);

  useEffect(() => {
    verificarPermissao();
  }, []);

  async function verificarPermissao() {
    try {
      const userDataRaw = await AsyncStorage.getItem('user');
      console.log('AdminScreen - userDataRaw:', userDataRaw);
      if (!userDataRaw) {
        Alert.alert('Erro', 'Usuário não encontrado');
        navigation.replace('Login');
        return;
      }

      const parsed = JSON.parse(userDataRaw);
      const userUid = parsed.uid ?? parsed.id ?? null;
      const militaryId = parsed.id_militar ?? parsed.idMilitar ?? null;

      console.log('AdminScreen - userUid:', userUid, 'militaryId:', militaryId);

      if (!userUid && !militaryId) {
        Alert.alert('Erro', 'Dados do usuário inválidos');
        navigation.replace('Login');
        return;
      }

      // 1) Tenta localizar por UID (padrão)
      if (userUid) {
        const userDocRef = doc(firestore, 'usuarios', userUid);
        const userDoc = await getDoc(userDocRef);
        console.log('AdminScreen - doc por UID existe?', userDoc.exists(), 'data:', userDoc.data());
        if (userDoc.exists()) {
          const userInfo = userDoc.data() as any;
          if (String(userInfo?.role) === 'admin') {
            setIsAdmin(true);
            await carregarUsuarios();
            setLoading(false);
            return;
          }
        }
      }

      // 2) Fallback: buscar por campo id_militar
      if (militaryId) {
        const q = query(collection(firestore, 'usuarios'), where('id_militar', '==', militaryId));
        const snap = await getDocs(q);
        console.log('AdminScreen - fallback query size:', snap.size);
        let foundAdmin = false;
        snap.forEach((d) => {
          const data = d.data() as any;
          console.log('AdminScreen - fallback doc:', d.id, data);
          if (String(data?.role) === 'admin') {
            foundAdmin = true;
          }
        });

        if (foundAdmin) {
          setIsAdmin(true);
          await carregarUsuarios();
          setLoading(false);
          return;
        }
      }

      // Se chegou aqui, não é admin
      Alert.alert('Acesso negado', 'Você não tem permissão de administrador.');
      navigation.replace('SelectDay');
    } catch (err) {
      console.error('❌ Erro ao verificar admin:', err);
      Alert.alert('Erro', 'Falha na verificação de permissões');
      navigation.replace('Login');
    } finally {
      setLoading(false);
    }
  }

  async function carregarUsuarios() {
    try {
      const querySnap = await getDocs(collection(firestore, 'usuarios'));
      const lista: any[] = [];
      querySnap.forEach((d) => {
        lista.push({ id: d.id, ...d.data() });
      });
      setUsuarios(lista);
    } catch (err) {
      console.error('❌ Erro ao carregar usuários:', err);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.button} />
        <Text>Carregando...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Painel do Administrador</Text>
      <Text style={styles.subtitle}>Lista de usuários cadastrados</Text>

      <FlatList
        data={usuarios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <Text style={styles.userText}>
              <Text style={{ fontWeight: 'bold' }}>{item.nome_guerra ?? '—'}</Text> ({item.numero_guerra ?? '—'})
            </Text>
            <Text style={styles.userText}>ID militar: {item.id_militar ?? '—'}</Text>
            <Text style={styles.userText}>Cia: {item.cia ?? '—'}</Text>
            {item.role === 'admin' && <Text style={[styles.userText, { color: 'red' }]}>[ADMIN]</Text>}
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={async () => {
          await AsyncStorage.removeItem('user');
          navigation.replace('Login');
        }}
      >
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.muted, marginBottom: 20, textAlign: 'center' },
  userCard: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  userText: { fontSize: 14 },
  logoutButton: {
    marginTop: 20,
    backgroundColor: colors.button,
    padding: 12,
    borderRadius: 8,
  },
  logoutText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
});
