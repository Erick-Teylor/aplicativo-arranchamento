import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/FirebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';

export default function LoginScreen({ navigation }) {
  const [id, setId] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!id || !senha) {
      return Alert.alert('Atenção', 'Preencha ID Militar e Senha');
    }

    setLoading(true);

    try {
      console.log('📡 Tentando login no Firebase Auth...');
      const userCredential = await signInWithEmailAndPassword(auth, `${id.trim()}@exemplo.com`, senha);
      const user = userCredential.user;

      console.log('✅ Login realizado com sucesso:', user.uid);

      // Salvar usuário no AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify({ id: user.uid, email: user.email }));

      // Navegar para seleção de dia
      navigation.navigate('SelectDay');
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      Alert.alert('Erro', 'ID Militar ou senha inválidos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Imagem da logo */}
      <Image
        source={require('../components/logo.png')} // Substitua pelo caminho da sua logo
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Acesse sua conta</Text>

      <TextInput
        style={styles.input}
        placeholder="Digite sua ID militar"
        keyboardType="numeric"
        value={id}
        onChangeText={setId}
      />
      <TextInput
        style={styles.input}
        placeholder="Digite sua senha"
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
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 5, marginBottom: 10 },
  button: { backgroundColor: colors.button, padding: 12, borderRadius: 5 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  link: { color: 'blue', textAlign: 'center', marginTop: 10 },
});
