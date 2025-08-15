export type Usuario = {
  id: string;
  nome: string;
  companhia: string;
  success: boolean;
};

export type ArranchamentoPayload = {
  idMilitar: string;
  dia: string;      // ISO yyyy-MM-dd
  cafe: boolean;
  almoco: boolean;
  janta: boolean;
};
