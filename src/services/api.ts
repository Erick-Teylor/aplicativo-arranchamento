// src/services/api.ts
import { firestore } from './FirebaseConfig';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';

// ---------- Tipos ----------
export type ArranchamentoDoc = {
  id?: string;
  usuario_id: string;
  data: string;
  cia: string;
  ciaId: string;
  nome: string;
  numero_guerra: string;
  numero_ord: number | null;
  cafe: boolean;
  almoco: boolean;
  janta: boolean;
  updatedAt?: any;
};

// ---------- Helpers ----------
const CIA_MAP: Record<string, string> = {
  '2° Cia': '2cia',
  '3° Cia': '3cia',
  'CCAP': 'ccap',
  'CEP': 'cep',
};

function toCiaId(ciaLabel?: string | null) {
  if (!ciaLabel) return 'desconhecida';
  return CIA_MAP[ciaLabel] ?? ciaLabel
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function parseNumeroOrd(value?: string | null): number | null {
  const onlyDigits = (value || '').replace(/\D+/g, '');
  const n = parseInt(onlyDigits, 10);
  return Number.isFinite(n) ? n : null;
}

// Busca perfil do usuário em 'usuarios/{uid}'
async function getUserProfile(uid?: string | null) {
  try {
    if (!uid) return null;
    const snap = await getDoc(doc(firestore, 'usuarios', uid));
    if (!snap.exists()) return null;
    return snap.data() as {
      id_militar?: string;
      numero_guerra?: string;
      numero_ord?: number | null;
      nome_guerra?: string;
      cia?: string;
      role?: string;
    };
  } catch (err) {
    console.error('getUserProfile error:', err);
    return null;
  }
}

// ---------- API ----------

// BUSCAR ARRANCHAMENTO DO DIA
export const fetchArranchamento = async (
  usuario_id: string,
  dataDia: string,
  ciaLabel?: string
) => {
  try {
    if (!usuario_id) return { data: null, error: new Error('usuario_id inválido') };

    let label = ciaLabel;
    if (!label) {
      const p = await getUserProfile(usuario_id);
      if (!p?.cia) return { data: null, error: new Error('Companhia não encontrada para o usuário.') };
      label = p.cia;
    }
    const ciaId = toCiaId(label);
    const ref = doc(firestore, 'arranchamentos', dataDia, 'cias', ciaId, 'selecoes', usuario_id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return { data: null, error: null };

    const d = snap.data() as ArranchamentoDoc;
    return { data: { id: snap.id, ...d }, error: null };
  } catch (error) {
    console.error('fetchArranchamento error:', error);
    return { data: null, error };
  }
};

// BUSCAR ARRANCHAMENTOS DE UM PERÍODO (faz leituras pontuais por dia)
export const fetchArranchamentosPeriodo = async (
  usuario_id: string,
  dias: string[],
  ciaLabel?: string
) => {
  try {
    if (!usuario_id) return { data: null, error: new Error('usuario_id inválido') };
    if (!dias || !Array.isArray(dias) || dias.length === 0) return { data: [], error: null };

    let label = ciaLabel;
    if (!label) {
      const p = await getUserProfile(usuario_id);
      if (!p?.cia) return { data: null, error: new Error('Companhia não encontrada para o usuário.') };
      label = p.cia;
    }
    const ciaId = toCiaId(label);

    const tasks = dias.map(async (dataDia) => {
      const ref = doc(firestore, 'arranchamentos', dataDia, 'cias', ciaId, 'selecoes', usuario_id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return { id: snap.id, ...(snap.data() as ArranchamentoDoc) };
    });

    const results = (await Promise.all(tasks)).filter(Boolean);
    return { data: results, error: null };
  } catch (error) {
    console.error('fetchArranchamentosPeriodo error:', error);
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
    if (!usuario_id) return { data: null, error: new Error('usuario_id inválido') };

    const profile = await getUserProfile(usuario_id);
    if (!profile) return { data: null, error: new Error('Perfil de usuário não encontrado.') };

    const ciaLabel = profile.cia ?? 'Desconhecida';
    const ciaId = toCiaId(ciaLabel);

    const ref = doc(firestore, 'arranchamentos', dataDia, 'cias', ciaId, 'selecoes', usuario_id);

    // Se não marcou nada → remove doc
    if (!cafe && !almoco && !janta) {
      await deleteDoc(ref);
      return { data: 'removed', error: null };
    }

    const payload: ArranchamentoDoc = {
      usuario_id,
      data: dataDia,
      cia: ciaLabel,
      ciaId,
      nome: profile.nome_guerra ?? '',
      numero_guerra: profile.numero_guerra ?? '',
      numero_ord: profile.numero_ord ?? parseNumeroOrd(profile.numero_guerra ?? ''),
      cafe,
      almoco,
      janta,
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, payload, { merge: true });
    return { data: 'ok', error: null };
  } catch (error) {
    console.error('marcarRefeicao error:', error);
    return { data: null, error };
  }
};

// MARCAR PRESENÇA (para sargento/admin)
export const marcarPresenca = async (
  usuario_id: string,
  dataDia: string,
  campos: { cafe?: boolean; almoco?: boolean; janta?: boolean },
  byAdminUid: string
) => {
  try {
    const profile = await getUserProfile(usuario_id);
    if (!profile?.cia) return { data: null, error: new Error('Companhia do usuário não encontrada.') };

    const ciaId = toCiaId(profile.cia);
    const ref = doc(firestore, 'arranchamentos', dataDia, 'cias', ciaId, 'presencas', usuario_id);

    await setDoc(ref, { ...campos, byAdminUid, updatedAt: serverTimestamp() }, { merge: true });
    return { data: 'ok', error: null };
  } catch (error) {
    console.error('marcarPresenca error:', error);
    return { data: null, error };
  }
};
