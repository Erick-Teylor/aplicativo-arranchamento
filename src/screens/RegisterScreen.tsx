import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { colors } from '../theme';

// Firebase modular SDK
import { auth, firestore } from '../services/FirebaseConfig';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [id, setId] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function criarConta() {
    if (!id || !nome || !senha) {
      return Alert.alert('Atenção', 'Preencha todos os campos');
    }
    if (senha !== confirm) {
      return Alert.alert('Atenção', 'As senhas não conferem');
    }

    setLoading(true);

    let userCredential = null;

    try {
      // 1️⃣ Criar usuário no Auth
      const emailFicticio = `${id.trim()}@exemplo.com`;
      userCredential = await createUserWithEmailAndPassword(auth, emailFicticio, senha);
      console.log('✅ Usuário criado no Auth:', userCredential.user.uid);

      // 2️⃣ Criar referência de documento correta no Firestore
      const userDocRef = doc(firestore, 'usuarios', userCredential.user.uid);

      // 3️⃣ Salvar dados no Firestore
      await setDoc(userDocRef, {
        id_militar: id,
        nome: nome,
      });
      console.log('✅ Registro salvo no Firestore');

      Alert.alert('Sucesso', 'Conta criada! Faça login.');
      navigation.replace('Login');
    } catch (err: any) {
      console.error('❌ Erro ao criar conta:', err);

      // Se usuário foi criado no Auth mas falhou no Firestore, remove o Auth
      if (userCredential?.user) {
        try {
          await deleteUser(userCredential.user);
          console.log('♻️ Usuário Auth removido devido a erro no Firestore');
        } catch (deleteErr) {
          console.error('❌ Falha ao deletar usuário Auth:', deleteErr);
        }
      }

      Alert.alert('Erro', err.message || 'Falha ao criar conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Primeiro Acesso</Text>
        <Text style={styles.muted}>Configure sua conta</Text>

        <TextInput
          style={styles.input}
          placeholder="ID Militar"
          value={id}
          onChangeText={setId}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Nome Completo"
          value={nome}
          onChangeText={setNome}
        />
        <TextInput
          style={styles.input}
          placeholder="Nova Senha"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirmar Senha"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        <Button
          title={loading ? 'Criando...' : 'Criar Conta'}
          onPress={criarConta}
          disabled={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16, backgroundColor: '#EFEFF3' },
  card: { backgroundColor: colors.bg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  muted: { textAlign: 'center', color: colors.muted, marginBottom: 16, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#F7F7F9',
    marginBottom: 10,
  },
});
