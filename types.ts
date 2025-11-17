
export interface ProcuracaoData {
  [key: string]: string | number;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  fileName: string;
  data: ProcuracaoData;
}
