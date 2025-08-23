// screens/AdminScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { collection, getDocs, updateDoc, doc, writeBatch } from "firebase/firestore";
import { firestore } from "../services/FirebaseConfig";
import { format, addDays } from "date-fns";

/** ---------- Tipos ---------- */
type Arranchamento = {
  id: string;
  nome: string;
  numero_guerra?: string | number;
  numero_ord?: number;
  cafe: boolean;
  almoco: boolean;
  janta: boolean;
  presente?: boolean;
};

type Option = { label: string; value: string };

type DropdownProps = {
  label: string;
  options: Option[];
  selected: string | null;
  onSelect: (value: string) => void;
};

/** ---------- Dropdown genérico ---------- */
function DropdownInput({ label, options, selected, onSelect }: DropdownProps) {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find((o) => o.value === selected)?.label ?? label;

  const handleSelect = (value: string) => {
    onSelect(value);
    setVisible(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={styles.inputButton} onPress={() => setVisible(true)} activeOpacity={0.8}>
        <Text style={styles.inputButtonText} numberOfLines={1}>
          {selectedLabel}
        </Text>
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setVisible(false)} activeOpacity={1}>
          <View style={styles.modalContent}>
            {options.map((item) => (
              <TouchableOpacity key={item.value} style={styles.option} onPress={() => handleSelect(item.value)}>
                <Text>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/** ---------- Checkbox ---------- */
function CheckBox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.checkbox} onPress={onPress}>
      {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
    </TouchableOpacity>
  );
}

/** ---------- Helpers ---------- */
function numeroGuerraToInt(value: unknown): number {
  if (value == null) return 0;
  const s = String(value);
  const match = s.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function todayYMD(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** ---------- Tela ---------- */
export default function AdminScreen() {
  const [companhia, setCompanhia] = useState<string | null>("CEP");
  const [refeicao, setRefeicao] = useState<string | null>("cafe");
  const [dataSelecionada, setDataSelecionada] = useState<string>(todayYMD());

  const [arranchamentos, setArranchamentos] = useState<Arranchamento[]>([]);
  const [loading, setLoading] = useState(false);

  const companhiasOptions: Option[] = useMemo(
    () => [
      { label: "CEP", value: "CEP" },
      { label: "CCAP", value: "CCAP" },
      { label: "2° Cia", value: "2cia_label" },
      { label: "3° Cia", value: "3cia_label" },
    ],
    []
  );

  const refeicoesOptions: Option[] = [
    { label: "Café", value: "cafe" },
    { label: "Almoço", value: "almoco" },
    { label: "Janta", value: "janta" },
  ];

  const diasOptions: Option[] = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(new Date(), i);
        return { value: format(d, "yyyy-MM-dd"), label: format(d, "dd/MM/yy") };
      }),
    []
  );

  const ciaID = useMemo(() => {
    switch (companhia) {
      case "CEP":
        return "cep";
      case "CCAP":
        return "ccap";
      case "2cia_label":
        return "2cia";
      case "3cia_label":
        return "3cia";
      default:
        return "cep";
    }
  }, [companhia]);

  /** ---------- Buscar arranchados ---------- */
  const buscarArranchamentos = async () => {
    if (!companhia || !refeicao || !dataSelecionada) return;
    setLoading(true);
    try {
      const selecoesRef = collection(
        firestore,
        `arranchamentos/${dataSelecionada}/cias/${ciaID}/selecoes`
      );
      const snap = await getDocs(selecoesRef);

      const lista: Arranchamento[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        if (d[refeicao as "cafe" | "almoco" | "janta"]) {
          lista.push({
            id: docSnap.id,
            nome: d.nome,
            numero_guerra: d.numero_guerra ?? d["numero guerra"],
            numero_ord: d.numero_ord,
            cafe: !!d.cafe,
            almoco: !!d.almoco,
            janta: !!d.janta,
            presente: !!d.presente,
          });
        }
      });

      lista.sort((a, b) => {
        const ag = numeroGuerraToInt(a.numero_guerra ?? (a as any)["numero guerra"]);
        const bg = numeroGuerraToInt(b.numero_guerra ?? (b as any)["numero guerra"]);
        return ag - bg;
      });

      setArranchamentos(lista);
    } catch (e) {
      console.error("Erro ao buscar arranchamentos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarArranchamentos();
  }, [companhia, refeicao, dataSelecionada]);

  /** ---------- Toggle presença ---------- */
  const togglePresenca = async (item: Arranchamento) => {
    try {
      const ref = doc(
        firestore,
        `arranchamentos/${dataSelecionada}/cias/${ciaID}/selecoes/${item.id}`
      );
      await updateDoc(ref, { presente: !item.presente });
      setArranchamentos((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, presente: !m.presente } : m))
      );
    } catch (e) {
      console.error("Erro ao atualizar presença:", e);
    }
  };

  /** ---------- Marcar/desmarcar todos ---------- */
  const marcarTodos = async () => {
    try {
      const batch = writeBatch(firestore);
      arranchamentos.forEach((item) => {
        const ref = doc(
          firestore,
          `arranchamentos/${dataSelecionada}/cias/${ciaID}/selecoes/${item.id}`
        );
        batch.update(ref, { presente: true });
      });
      await batch.commit();
      setArranchamentos((prev) => prev.map((i) => ({ ...i, presente: true })));
    } catch (e) {
      console.error("Erro ao marcar todos:", e);
    }
  };

  const desmarcarTodos = async () => {
    try {
      const batch = writeBatch(firestore);
      arranchamentos.forEach((item) => {
        const ref = doc(
          firestore,
          `arranchamentos/${dataSelecionada}/cias/${ciaID}/selecoes/${item.id}`
        );
        batch.update(ref, { presente: false });
      });
      await batch.commit();
      setArranchamentos((prev) => prev.map((i) => ({ ...i, presente: false })));
    } catch (e) {
      console.error("Erro ao desmarcar todos:", e);
    }
  };

  /** ---------- Confirmar ---------- */
  const confirmar = () => {
    console.log("Confirmado!");
  };

  /** ---------- Render ---------- */
  const renderItem = ({ item }: { item: Arranchamento }) => {
    const numero = item.numero_guerra ?? (item as any)["numero guerra"] ?? "";
    return (
      <View style={styles.item}>
        <Text style={styles.nome}>
          {numero} - {item.nome}
        </Text>
        <CheckBox checked={!!item.presente} onPress={() => togglePresenca(item)} />
      </View>
    );
  };

  const totalArranchados = arranchamentos.length;
  const totalPresentes = arranchamentos.filter((a) => a.presente).length;

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Admin - Arranchamento</Text>

      {/* Filtros */}
      <View style={styles.filtros}>
        <DropdownInput label="Companhia" options={companhiasOptions} selected={companhia} onSelect={setCompanhia} />
        <DropdownInput label="Refeição" options={refeicoesOptions} selected={refeicao} onSelect={setRefeicao} />
        <DropdownInput label="Data" options={diasOptions} selected={dataSelecionada} onSelect={setDataSelecionada} />
      </View>

      {/* Ações globais */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={marcarTodos}>
          <Text style={styles.actionButtonText}>Marcar todos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={desmarcarTodos}>
          <Text style={styles.actionButtonText}>Desmarcar todos</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={arranchamentos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>Selecione companhia, refeição e uma data.</Text>}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListFooterComponent={
            <TouchableOpacity style={styles.confirmButton} onPress={confirmar}>
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* Rodapé fixo */}
      <View style={styles.footer}>
        <Text>Total arranchados: {totalArranchados}</Text>
        <Text>Presentes: {totalPresentes}</Text>
      </View>
    </View>
  );
}

/** ---------- Estilos ---------- */
const BUTTON_HEIGHT = 44;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  titulo: { fontSize: 22, fontWeight: "bold", marginBottom: 12, textAlign: "center" },

  filtros: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  inputButton: {
    height: BUTTON_HEIGHT,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    backgroundColor: "#F7F7F9",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  inputButtonText: { fontSize: 15, textAlign: "center" },

  modalOverlay: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)", padding: 20 },
  modalContent: { backgroundColor: "#fff", borderRadius: 8, padding: 10 },
  option: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },

  actionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: { fontSize: 15, fontWeight: "500" },

  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  nome: { fontWeight: "bold", fontSize: 16 },
  empty: { textAlign: "center", marginTop: 16, color: "#666" },

  checkbox: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: "#0c5708ff",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxMark: { fontSize: 18, lineHeight: 18, color: "#0c5708ff", fontWeight: "900" },

  confirmButton: {
    backgroundColor: "#0c5708ff",
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
    marginHorizontal: 4,
  },
  confirmButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold", textAlign: "center" },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    marginTop: 4,
  },
});
