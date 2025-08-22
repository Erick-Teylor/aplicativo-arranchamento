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
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { firestore } from "../services/FirebaseConfig";
import { format, addDays, parse } from "date-fns";

/** ---------- Tipos ---------- */
type Arranchamento = {
  id: string;
  nome: string;
  numero_guerra?: string | number; // pode vir string ou number
  numero_ord?: number;
  cafe: boolean;
  almoco: boolean;
  janta: boolean;
  presente?: boolean;
  // alguns docs podem ter "numero guerra" (com espaço); acessamos via (item as any)["numero guerra"]
};

type Option = { label: string; value: string };

type DropdownProps = {
  label: string;
  options: Option[];
  selected: string | null;
  onSelect: (value: string) => void;
};

/** ---------- Dropdown genérico (estilo botão) ---------- */
function DropdownInput({ label, options, selected, onSelect }: DropdownProps) {
  const [visible, setVisible] = useState(false);

  const selectedLabel =
    options.find((o) => o.value === selected)?.label ?? label;

  const handleSelect = (value: string) => {
    onSelect(value);
    setVisible(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity
        style={styles.inputButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.inputButtonText} numberOfLines={1}>
          {selectedLabel}
        </Text>
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setVisible(false)}
          activeOpacity={1}
        >
          <View style={styles.modalContent}>
            {options.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={styles.option}
                onPress={() => handleSelect(item.value)}
              >
                <Text>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

/** ---------- Checkbox custom (sem libs) ---------- */
function CheckBox({
  checked,
  onPress,
}: {
  checked: boolean;
  onPress: () => void;
}) {
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
  // Filtros
  const [companhia, setCompanhia] = useState<string | null>("CEP");
  const [refeicao, setRefeicao] = useState<string | null>("cafe");
  const [dataSelecionada, setDataSelecionada] = useState<string>(todayYMD());

  // Lista
  const [arranchamentos, setArranchamentos] = useState<Arranchamento[]>([]);
  const [loading, setLoading] = useState(false);

  // Opções
  const companhiasOptions: Option[] = useMemo(
    () => [
      { label: "CEP", value: "CEP" },
      { label: "CCAP", value: "CCAP" },
      { label: "2° Cia", value: "2cia_label" }, // value interno; mapeamos para id
      { label: "3° Cia", value: "3cia_label" },
    ],
    []
  );

  const refeicoesOptions: Option[] = [
    { label: "Café", value: "cafe" },
    { label: "Almoço", value: "almoco" },
    { label: "Janta", value: "janta" },
  ];

  // Próximos 7 dias: label curto "dd/MM/yy", value "yyyy-MM-dd"
  const diasOptions: Option[] = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(new Date(), i);
        return {
          value: format(d, "yyyy-MM-dd"),
          label: format(d, "dd/MM/yy"),
        };
      }),
    []
  );

  // Mapa cia -> id usado no Firestore
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

  /** ---------- Buscar arranchados (apenas da refeição selecionada) ---------- */
  const buscarArranchamentos = async () => {
    if (!companhia || !refeicao || !dataSelecionada) return;

    setLoading(true);
    try {
      // Caminho: arranchamentos/{data}/cias/{ciaID}/selecoes
      const selecoesRef = collection(
        firestore,
        `arranchamentos/${dataSelecionada}/cias/${ciaID}/selecoes`
      );
      const snap = await getDocs(selecoesRef);

      const lista: Arranchamento[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        // Apenas quem marcou a refeição atual
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

      // Ordenar por número de guerra (robusto para string/number e chaves diferentes)
      lista.sort((a, b) => {
        const ag =
          numeroGuerraToInt(a.numero_guerra ?? (a as any)["numero guerra"]);
        const bg =
          numeroGuerraToInt(b.numero_guerra ?? (b as any)["numero guerra"]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companhia, refeicao, dataSelecionada]);

  /** ---------- Toggle presença (salva no Firestore) ---------- */
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

  /** ---------- Render ---------- */
  const renderItem = ({ item }: { item: Arranchamento }) => {
    const numero =
      item.numero_guerra ?? (item as any)["numero guerra"] ?? "";
    return (
      <View style={styles.item}>
        <Text style={styles.nome}>
          {numero} - {item.nome}
        </Text>
        <CheckBox checked={!!item.presente} onPress={() => togglePresenca(item)} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Admin - Arranchamento</Text>

      {/* Linha de filtros: todos os "botões" com o MESMO tamanho e texto centralizado */}
      <View style={styles.filtros}>
        <DropdownInput
          label="Companhia"
          options={companhiasOptions}
          selected={companhia}
          onSelect={setCompanhia}
        />
        <DropdownInput
          label="Refeição"
          options={refeicoesOptions}
          selected={refeicao}
          onSelect={setRefeicao}
        />
        <DropdownInput
          label="Data"
          options={diasOptions}
          selected={dataSelecionada}
          onSelect={setDataSelecionada}
        />
      </View>

      {/* Lista */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          data={arranchamentos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Selecione companhia, refeição e uma data.
            </Text>
          }
        />
      )}
    </View>
  );
}

/** ---------- Estilos ---------- */
const BUTTON_HEIGHT = 44;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  titulo: { fontSize: 22, fontWeight: "bold", marginBottom: 12, textAlign: "center" },

  // Linha dos filtros: 3 colunas de mesmo tamanho
  filtros: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  // Botão do dropdown com tamanho uniforme e texto centralizado
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
  inputButtonText: {
    fontSize: 15,
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", borderRadius: 8, padding: 10 },
  option: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },

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

  // checkbox
  checkbox: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: "#0c5708ff",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxMark: {
    fontSize: 18,
    lineHeight: 18,
    color: "#0c5708ff",
    fontWeight: "900",
  },
});
