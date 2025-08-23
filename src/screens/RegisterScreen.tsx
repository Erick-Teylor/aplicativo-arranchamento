import React, { useState } from 'react';
import { View, Text, TextInput, Alert, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { colors } from '../theme';
import { auth, firestore } from '../services/FirebaseConfig';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

type DropdownProps = {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
};

function DropdownInput({ label, options, selected, onSelect }: DropdownProps) {
  const [visible, setVisible] = useState(false);

  const handleSelect = (value: string) => {
    onSelect(value);
    setVisible(false);
  };

  return (
    <View style={{ marginBottom: 10 }}>
      <TouchableOpacity style={styles.input} onPress={() => setVisible(true)}>
        <Text style={{ color: selected ? '#000' : '#3d3d3dff' }}>
          {selected ?? label}
        </Text>
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <View style={styles.modalContent}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.option} onPress={() => handleSelect(item)}>
                  <Text>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Função para formatar nome (primeira letra maiúscula, resto minúsculo)
function formatarNome(nome: string): string {
  return nome
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(' ');
}

export default function RegisterScreen({ navigation }: Props) {
  const [id, setId] = useState('');
  const [numeroGuerra, setNumeroGuerra] = useState('');
  const [nomeGuerra, setNomeGuerra] = useState('');
  const [cia, setCia] = useState<string | null>(null);
  const [senha, setSenha] = useState('');
  const [confirm, setConfirm] = useState('');
  const [senhaErro, setSenhaErro] = useState<string | null>(null);
  const [confirmErro, setConfirmErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function parseNumeroOrd(value: string) {
    const onlyDigits = (value || '').replace(/\D+/g, '');
    const n = parseInt(onlyDigits, 10);
    return Number.isFinite(n) ? n : null;
  }

  async function criarConta() {
    let valido = true;

    if (!id || !numeroGuerra || !nomeGuerra || !cia || !senha || !confirm) {
      Alert.alert('Atenção', 'Preencha todos os campos');
      return;
    }

    if (senha.length < 6) {
      setSenhaErro('A senha deve ter no mínimo 6 dígitos.');
      valido = false;
    } else {
      setSenhaErro(null);
    }

    if (senha !== confirm) {
      setConfirmErro('As senhas não conferem.');
      valido = false;
    } else {
      setConfirmErro(null);
    }

    if (!valido) return;

    const nomeFormatado = formatarNome(nomeGuerra);
    setLoading(true);
    let userCredential: any = null;

    try {
      const emailFicticio = `${id.trim()}@exemplo.com`;
      userCredential = await createUserWithEmailAndPassword(auth, emailFicticio, senha);

      const userDocRef = doc(firestore, 'usuarios', userCredential.user.uid);
      await setDoc(userDocRef, {
        id_militar: id,
        numero_guerra: numeroGuerra,
        numero_ord: parseNumeroOrd(numeroGuerra),
        nome_guerra: nomeFormatado,
        cia: cia,
        role: 'user',
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Sucesso', 'Conta criada! Faça login.');
      navigation.replace('Login');
    } catch (err: any) {
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
          placeholderTextColor="#888"
          value={id}
          onChangeText={setId}
          keyboardType="numeric"
        />

        <TextInput
          style={styles.input}
          placeholder="Número de Guerra"
          placeholderTextColor="#888"
          value={numeroGuerra}
          onChangeText={setNumeroGuerra}
        />

        <TextInput
          style={styles.input}
          placeholder="Nome de Guerra"
          placeholderTextColor="#888"
          value={nomeGuerra}
          onChangeText={setNomeGuerra}
          autoCapitalize="words"
        />

        <DropdownInput
          label="Companhia"
          options={['2° Cia', 'CCAP', '3° Cia', 'CEP']}
          selected={cia}
          onSelect={setCia}
        />

        <TextInput
          style={styles.input}
          placeholder="Nova Senha"
          placeholderTextColor="#888"
          secureTextEntry
          value={senha}
          onChangeText={(text) => {
            setSenha(text);
            setSenhaErro(text.length < 6 ? 'A senha deve ter no mínimo 6 dígitos.' : null);
          }}
        />
        {senhaErro && <Text style={styles.errorText}>{senhaErro}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Confirmar Senha"
          placeholderTextColor="#888"
          secureTextEntry
          value={confirm}
          onChangeText={(text) => {
            setConfirm(text);
            setConfirmErro(text !== senha ? 'As senhas não conferem.' : null);
          }}
        />
        {confirmErro && <Text style={styles.errorText}>{confirmErro}</Text>}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.button }]}
          onPress={criarConta}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Criando...' : 'Criar Conta'}</Text>
        </TouchableOpacity>
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
    paddingVertical: 12,
    backgroundColor: '#F7F7F9',
    marginBottom: 6,
    color: '#000',
    fontSize: 16,
  },
  errorText: { color: 'red', fontSize: 13, marginBottom: 10 },
  button: { padding: 12, borderRadius: 5, marginTop: 10 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 20,
  },
  modalContent: { backgroundColor: '#fff', borderRadius: 8, padding: 10 },
  option: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#ccc' },
});
