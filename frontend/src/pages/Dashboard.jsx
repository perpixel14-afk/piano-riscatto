import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/contexts/StoreContext';
import { fmtEUR, STATUS_LABELS } from '@/lib/api';
import { Wrench, Hammer, PackageCheck, Truck, Banknote, Target, TrendingUp, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const KPI_META = [
  { key: 'in_registro', label: 'Ticket in Registro', icon: Wrench, color: 'from-slate-600 to-slate-800', testid: 'kpi-in-registro' },
  { key: 'in_lavorazione', label: 'In Lavorazione', icon: Hammer, color: 'from-amber-500 to-orange-700', testid: 'kpi-in-lavorazione', pulse: true },
  { key: 'pronto', label: 'Pronti al Ritiro', icon: PackageCheck, color: 'from-cyan-400 to-blue-700', testid: 'kpi-pronto' },
  { key: 'consegnato', label: 'Consegnati', icon: Truck, color: 'from-emerald-500 to-emerald-800', testid: 'kpi-consegnato' },
];

const BUSINESS_TIPS = [
  "Chiama tutti i clienti con dispositivi 'Pronti al Ritiro' più vecchi di 7 giorni: libera denaro fermo e cassa in giornata.",
  'Vendi almeno 2 pellicole protettive per ogni riparazione schermo: ricavo extra 15-25 € senza tempo aggiuntivo.',
  'Pubblica una storia WhatsApp/Instagram con un prima/dopo di una riparazione: 1 nuovo cliente al giorno medio.',
  'Carica un acconto del 30-50% su ogni accettazione: elimina i no-show e protegge il magazzino componenti.',
  'Vendi un check-up gratuito trimestrale: fidelizzi e intercetti riparazioni prima che diventino urgenti.',
];

export default function Dashboard() {
  const { settings } = useStore();
  const [stats, setStats] = useState(null);
  const [tipIndex] = useState(() => Math.floor(Math.random() * BUSINESS_TIPS.length));
  const nav = useNavigate();

  useEffect(() => {
    const load = () => api.get('/dashboard/stats').then((r) => setStats(r.data));
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  if (!stats) {
    return <div className="text-slate-400 font-mono-eds text-sm">Caricamento KPI…</div>;
  }

  const target = (stats.daily_fixed_cost || 0) + (stats.target_min || 0);
  const pct = Math.min(100, Math.round((stats.today_total / Math.max(1, target)) * 100));
  const residuo = Math.max(0, target - stats.today_total);

  return (
    <div className="space-y-6" data-testid="dashboard-root">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono-eds text-xs uppercase tracking-widest text-cyan-400">
            {settings.platform_name || 'Pixel Lab'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mt-1">Centrale Operativa</h1>
          <p className="text-slate-400 text-sm mt-1">
            {settings.business_name} · {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          data-testid="btn-new-ticket-dashboard"
          onClick={() => nav('/tickets/new')}
          className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-5 py-2.5 shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5"
        >
          + Nuova Pratica di Riparazione
        </button>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_META.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.key}
              data-testid={k.testid}
              className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-5 hover:border-cyan-500/40 transition-all eds-cyan-glow"
            >
              <div className={`absolute -top-6 -right-6 w-28 h-28 rounded-full bg-gradient-to-br ${k.color} opacity-20 blur-xl`} />
              <div className="flex items-center gap-2 relative">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${k.color} flex items-center justify-center ${k.pulse ? 'eds-pulse' : ''}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="font-mono-eds text-[10px] uppercase tracking-widest text-slate-400">
                  {STATUS_LABELS[k.key]}
                </div>
              </div>
              <div className="mt-3 text-4xl font-extrabold font-mono-eds text-white">
                {stats.counts[k.key] || 0}
              </div>
            </div>
          );
        })}
      </div>

      {/* Denaro fermo + Piano Riscatto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 p-6 shadow-xl shadow-cyan-900/20 eds-glow" data-testid="kpi-denaro-fermo">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400">
                Denaro Fermo in Laboratorio
              </div>
              <h2 className="text-xl font-bold mt-1">Capitale da Riscattare</h2>
            </div>
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-cyan-300" />
            </div>
          </div>
          <div className="mt-5 text-5xl font-extrabold tracking-tight text-cyan-300">
            {fmtEUR(stats.denaro_fermo)}
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Totale preventivi di dispositivi in lavorazione + pronti al ritiro.
            <span className="text-cyan-400"> Chiama i clienti e trasformalo in cassa.</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6" data-testid="piano-riscatto">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400">
                Piano Riscatto — Target Giornaliero
              </div>
              <h2 className="text-xl font-bold mt-1">Oggi devi incassare</h2>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-emerald-300" />
            </div>
          </div>
          <div className="mt-5 flex items-end gap-3">
            <div className="text-5xl font-extrabold tracking-tight text-emerald-300">
              {fmtEUR(stats.today_total)}
            </div>
            <div className="pb-2 text-sm text-slate-400">
              / <span className="text-slate-200 font-semibold">{fmtEUR(target)}</span>
            </div>
          </div>
          <div className="mt-3 h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
            <div><div className="text-slate-500">Riparazioni</div><div className="font-semibold text-slate-200">{fmtEUR(stats.today_repairs_total)}</div></div>
            <div><div className="text-slate-500">Cassa POS</div><div className="font-semibold text-slate-200">{fmtEUR(stats.today_sales_total)}</div></div>
            <div><div className="text-slate-500">Residuo</div><div className="font-semibold text-cyan-300">{fmtEUR(residuo)}</div></div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Spese fisse giornaliere: {fmtEUR(stats.daily_fixed_cost)} · Target netto: {fmtEUR(stats.target_min)}–{fmtEUR(stats.target_max)}
          </div>
        </div>
      </div>

      {/* Business Tip */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 p-5" data-testid="business-tip">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="font-mono-eds text-[10px] uppercase tracking-widest text-amber-300">
              Consiglio Business del Giorno
            </div>
            <p className="mt-1 text-slate-200">{BUSINESS_TIPS[tipIndex]}</p>
          </div>
          <TrendingUp className="w-5 h-5 text-amber-400 ml-auto hidden sm:block" />
        </div>
      </div>
    </div>
  );
}
