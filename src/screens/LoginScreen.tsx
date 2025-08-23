import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore } from '../services/FirebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginScreen({ navigation }: any) {
  const [id, setId] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!id || !senha) {
      return Alert.alert('Atenção', 'Preencha ID Militar e Senha');
    }

    setLoading(true);

    try {
      const emailFicticio = `${id.trim()}@exemplo.com`;
      const userCredential = await signInWithEmailAndPassword(auth, emailFicticio, senha);
      const user = userCredential.user;

      // Buscar dados do Firestore
      const userDocRef = doc(firestore, 'usuarios', user.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        throw new Error('Usuário não encontrado no banco de dados');
      }

      const userData = userSnap.data();

      // salvar no AsyncStorage (uid + dados básicos)
      const userToStore: any = {
        uid: user.uid,
        email: user.email,
        id_militar: userData.id_militar,
        nome_guerra: userData.nome_guerra,
        numero_guerra: userData.numero_guerra,
        cia: userData.cia,
        role: userData.role || 'user',
      };

      await AsyncStorage.setItem('user', JSON.stringify(userToStore));

      // Navegação baseada no role
      if (userData.role === 'admin') {
        navigation.reset({ index: 0, routes: [{ name: 'Admin' as any }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'SelectDay' as any }] });
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      Alert.alert('Erro', error.message || 'ID Militar ou senha inválidos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={require('../components/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Acesse sua conta</Text>

      <TextInput
        style={styles.input}
        placeholder="Digite sua ID militar"
        placeholderTextColor="#888"
        keyboardType="numeric"
        value={id}
        onChangeText={setId}
      />
      <TextInput
        style={styles.input}
        placeholder="Digite sua senha"
        placeholderTextColor="#888"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Primeiro acesso?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  logo: { width: 250, height: 250, alignSelf: 'center', marginBottom: 5, marginTop: -40 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    color: '#000', // texto e *** da senha ficam visíveis
    fontSize: 16,
  },
  button: { backgroundColor: colors.button, padding: 12, borderRadius: 5 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  link: { color: 'blue', textAlign: 'center', marginTop: 10 },
});
