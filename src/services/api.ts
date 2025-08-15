// api.ts
import { firestore } from './FirebaseConfig';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

export type Arranchamento = {
  id?: string;
  usuario_id: string;
  data: string;
  cafe: boolean;
  almoco: boolean;
  janta: boolean;
};

export type Presenca = {
  id?: string;
  usuario_id: string;
  companhia: string;
  data: string;
  presente: boolean;
};

// BUSCAR ARRANCHAMENTO DE UM DIA
export const fetchArranchamento = async (usuario_id: string, dataDia: string) => {
  try {
    const q = query(
      collection(firestore, 'arranchamento'),
      where('usuario_id', '==', usuario_id),
      where('data', '==', dataDia)
    );
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// BUSCAR ARRANCHAMENTOS DE VÁRIOS DIAS (otimizado)
export const fetchArranchamentosPeriodo = async (usuario_id: string, dias: string[]) => {
  try {
    const q = query(
      collection(firestore, 'arranchamento'),
      where('usuario_id', '==', usuario_id),
      where('data', 'in', dias) // busca todos os dias de uma vez (até 10 dias)
    );
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// MARCAR REFEIÇÕES
export const marcarRefeicao = async (
  usuario_id: string,
  dataDia: string,
  cafe: boolean,
  almoco: boolean,
  janta: boolean
) => {
  try {
    const docRef = doc(firestore, 'arranchamento', `${usuario_id}_${dataDia}`);
    await setDoc(docRef, { usuario_id, data: dataDia, cafe, almoco, janta });
    return { data: 'ok', error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// MARCAR PRESENÇA (SARGENTO)
export const marcarPresenca = async (usuario_id: string, companhia: string, dataDia: string) => {
  try {
    const docRef = doc(firestore, 'presenca', `${usuario_id}_${dataDia}`);
    await setDoc(docRef, { usuario_id, companhia, data: dataDia, presente: true });
    return { data: 'ok', error: null };
  } catch (error) {
    return { data: null, error };
  }
};