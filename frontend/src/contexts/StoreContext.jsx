import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

const StoreCtx = createContext(null);

const DEFAULT_SETTINGS = {
  business_name: 'EDS PIXEL di Emilio De Leo',
  platform_name: 'Pixel Lab',
  theme: 'quantum',
  vat: '08976891211',
  address: 'Cupa Fossa del Lupo 142 - Napoli',
  phone: '3349182409',
  email: 'emilio@edspixel.it',
  warranty_terms:
    'Garanzia 3 mesi sul lavoro svolto e sui componenti sostituiti. La garanzia decade in caso di: nuovi urti, contatto con liquidi, manomissione del sigillo, rimozione pellicola di garanzia.',
  conditions:
    'Il cliente autorizza il laboratorio alla diagnosi e riparazione del dispositivo. Dispositivi non ritirati entro 60 giorni dalla segnalazione di "Pronto" saranno addebitati di diritti di deposito o smaltiti. Il laboratorio non è responsabile dei dati presenti sul dispositivo.',
  daily_target_min: 175,
  daily_target_max: 190,
};

export const THEMES = {
  quantum: { label: 'Quantum Dark', bg: '#0b132b', bg2: '#0f172a', accent: '#06b6d4', accent2: '#38bdf8' },
  emerald: { label: 'Emerald Sand', bg: '#0a1f1a', bg2: '#0f2a24', accent: '#10b981', accent2: '#34d399' },
  cyber: { label: 'Neon Cyber', bg: '#120a24', bg2: '#1a0f36', accent: '#a855f7', accent2: '#22d3ee' },
};

function applyTheme(theme) {
  const t = THEMES[theme] || THEMES.quantum;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.setProperty('--eds-bg', t.bg);
  root.style.setProperty('--eds-bg-2', t.bg2);
  root.style.setProperty('--eds-cyan', t.accent);
  root.style.setProperty('--eds-blue', t.accent2);
}

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/settings');
      const merged = { ...DEFAULT_SETTINGS, ...data };
      setSettings(merged);
      applyTheme(merged.theme);
    } catch {
      applyTheme(DEFAULT_SETTINGS.theme);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    applyTheme(DEFAULT_SETTINGS.theme);
    refresh();
  }, [refresh]);

  const save = async (next) => {
    const { data } = await api.put('/settings', next);
    const merged = { ...DEFAULT_SETTINGS, ...data };
    setSettings(merged);
    applyTheme(merged.theme);
    return data;
  };

  return (
    <StoreCtx.Provider value={{ settings, save, refresh, loaded }}>{children}</StoreCtx.Provider>
  );
}

export const useStore = () => useContext(StoreCtx);
