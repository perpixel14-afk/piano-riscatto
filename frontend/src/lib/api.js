import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('eds_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fmtEUR = (n) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(n || 0));

export const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const fmtDateShort = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('it-IT');
  } catch {
    return iso;
  }
};

export const STATUS_LABELS = {
  in_registro: 'Ricevuto',
  valutazione: 'In Valutazione',
  in_lavorazione: 'In Lavorazione',
  attesa_ricambi: 'In Attesa Ricambi',
  pronto: 'Pronta al Ritiro',
  consegnato: 'Consegnata',
  non_riparabile: 'Non Riparabile',
};

export const STATUS_COLORS = {
  in_registro: 'bg-slate-700 text-slate-100 border-slate-500',
  valutazione: 'bg-sky-500/20 text-sky-300 border-sky-400/60',
  in_lavorazione: 'bg-amber-600/20 text-amber-300 border-amber-500/60',
  attesa_ricambi: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/60',
  pronto: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60',
  consegnato: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60',
  non_riparabile: 'bg-red-500/20 text-red-300 border-red-400/60',
};

export const STATUS_FLOW = ['in_registro', 'valutazione', 'in_lavorazione', 'attesa_ricambi', 'pronto', 'consegnato'];
