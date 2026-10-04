import { useEffect, useState } from 'react';
import { api, fmtEUR, fmtDate } from '@/lib/api';
import { Banknote, CreditCard, ArrowRightLeft, Wrench, ShoppingBag, TrendingUp, Lightbulb, Wallet, PiggyBank, Receipt } from 'lucide-react';

const PAY_META = {
  contanti: { icon: Banknote, color: 'text-emerald-300 bg-emerald-500/20', label: 'Contanti' },
  pos: { icon: CreditCard, color: 'text-cyan-300 bg-cyan-500/20', label: 'POS' },
  transfer: { icon: ArrowRightLeft, color: 'text-amber-300 bg-amber-500/20', label: 'Bonifico' },
};

const PERIODS = [
  { id: 'today', label: 'Oggi' },
  { id: 'month', label: 'Questo Mese' },
  { id: 'all', label: 'Tutto lo Storico' },
];

export default function Reports() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('month');
  const [acc, setAcc] = useState(null);

  useEffect(() => {
    api.get(`/reports/daily?date=${date}`).then((r) => setData(r.data));
  }, [date]);

  useEffect(() => {
    api.get(`/reports/accounting?period=${period}`).then((r) => setAcc(r.data));
  }, [period]);

  if (!data || !acc) return <div className="text-slate-400 font-mono-eds text-sm">Caricamento report…</div>;

  const total = data.sales_total + data.delivered_total;

  const advice = [];
  if (data.sales_total < 20) advice.push('Oggi vendite accessori basse: metti in evidenza pellicola/EPU in cassa, obiettivo +20€.');
  if (data.delivered_total === 0) advice.push('Zero riparazioni consegnate oggi: chiama i clienti con pratiche "Pronte" per chiudere e incassare.');
  if (data.new_tickets_count === 0) advice.push("Nessuna nuova pratica oggi: pubblica un reel/storia con un prima/dopo, acquisizione gratuita.");
  if (total > 150) advice.push(`Giornata solida (${fmtEUR(total)}): archivia la scheda e analizza quale servizio ha performato di più.`);
  if (advice.length === 0) advice.push('Mantieni il ritmo: 1 chiamata di cortesia a clienti consegnati per generare passaparola.');

  return (
    <div className="space-y-6" data-testid="reports-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono-eds text-xs uppercase tracking-widest text-cyan-400">
            Contabilità & Report
          </div>
          <h1 className="text-3xl font-extrabold mt-1">Centrale Contabile</h1>
          <p className="text-slate-400 text-sm">Panoramica incassi, uscite e margine netto reale.</p>
        </div>
      </header>

      {/* Accounting period */}
      <section className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400">
              Contabilità Dettagliata
            </div>
            <h2 className="text-xl font-bold mt-1">Incassi · Uscite · Margine Netto</h2>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                data-testid={`period-${p.id}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  period === p.id
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-semibold'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-500/50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AccCard icon={Wallet} label="Incasso Totale" value={fmtEUR(acc.gross_revenue)} sub={`${acc.sales_count} vendite + ${acc.delivered_count} riparazioni`} color="from-cyan-500 to-blue-700" testid="acc-gross" />
          <AccCard icon={Receipt} label="Costi Ricambi / Uscite" value={fmtEUR(acc.part_cost_total)} sub="Totale ricambi utilizzati su pratiche consegnate" color="from-rose-500 to-red-700" testid="acc-cost" />
          <AccCard icon={PiggyBank} label="Margine Netto Reale" value={fmtEUR(acc.net_margin)} sub={`Incassi − Costi · ${acc.gross_revenue > 0 ? Math.round((acc.net_margin / acc.gross_revenue) * 100) : 0}% del fatturato`} color="from-emerald-500 to-emerald-700" testid="acc-margin" accent />
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <KV label="Cassa POS" value={fmtEUR(acc.sales_total)} />
          <KV label="Riparazioni consegnate" value={fmtEUR(acc.repairs_total)} />
          <KV label="Vendite N°" value={acc.sales_count} />
          <KV label="Pratiche chiuse" value={acc.delivered_count} />
        </div>
      </section>

      {/* Daily report */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono-eds text-xs uppercase tracking-widest text-cyan-400">
            Report Giornaliero
          </div>
          <h2 className="text-xl font-bold mt-1">Dettaglio del giorno</h2>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          data-testid="report-date"
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5" data-testid="rep-sales">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-cyan-300" />
            <div className="font-mono-eds text-[10px] uppercase tracking-widest text-slate-400">Cassa POS</div>
          </div>
          <div className="text-4xl font-extrabold mt-2 font-mono-eds text-cyan-300">{fmtEUR(data.sales_total)}</div>
          <div className="text-xs text-slate-500 mt-1">{data.sales.length} transazioni</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5" data-testid="rep-repairs">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-300" />
            <div className="font-mono-eds text-[10px] uppercase tracking-widest text-slate-400">Riparazioni Consegnate</div>
          </div>
          <div className="text-4xl font-extrabold mt-2 font-mono-eds text-emerald-300">{fmtEUR(data.delivered_total)}</div>
          <div className="text-xs text-slate-500 mt-1">{data.delivered_tickets.length} dispositivi</div>
        </div>
        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 to-cyan-950/40 p-5" data-testid="rep-total">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-300" />
            <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400">Incasso Totale</div>
          </div>
          <div className="text-4xl font-extrabold mt-2 font-mono-eds text-white">{fmtEUR(total)}</div>
          <div className="text-xs text-slate-500 mt-1">+{data.new_tickets_count} nuove pratiche</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(PAY_META).map(([k, m]) => {
          const Icon = m.icon;
          const value = data.sales_by_method?.[k] || 0;
          return (
            <div key={k} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${m.color} flex items-center justify-center`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-400">{m.label}</div>
                <div className="font-mono-eds text-lg font-bold">{fmtEUR(value)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 p-5">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-300" />
          <h3 className="font-semibold">Consigli pratici per oggi</h3>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-slate-200">
          {advice.map((a, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-amber-400">▸</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 font-semibold">Transazioni di Cassa</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left font-mono-eds text-[10px] uppercase tracking-widest text-slate-400 bg-slate-950/60">
              <tr>
                <th className="px-4 py-2">Codice</th>
                <th className="px-4 py-2">Ora</th>
                <th className="px-4 py-2">Articoli</th>
                <th className="px-4 py-2">Metodo</th>
                <th className="px-4 py-2 text-right">Totale</th>
              </tr>
            </thead>
            <tbody>
              {data.sales.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Nessuna vendita.</td></tr>
              )}
              {data.sales.map((s) => (
                <tr key={s.id} className="border-t border-slate-800">
                  <td className="px-4 py-2 font-mono-eds text-cyan-300">{s.code}</td>
                  <td className="px-4 py-2 text-xs text-slate-400">{fmtDate(s.created_at)}</td>
                  <td className="px-4 py-2 text-xs text-slate-300">
                    {s.items.map((i) => `${i.name}×${i.qty}`).join(', ')}
                  </td>
                  <td className="px-4 py-2 text-xs capitalize">{s.payment_method}</td>
                  <td className="px-4 py-2 text-right font-mono-eds">{fmtEUR(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AccCard({ icon: Icon, label, value, sub, color, testid, accent }) {
  return (
    <div data-testid={testid} className={`relative overflow-hidden rounded-2xl border p-4 ${accent ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-800 bg-slate-900/70'}`}>
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${color} opacity-20 blur-xl`} />
      <div className="flex items-center gap-2">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="font-mono-eds text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
      </div>
      <div className={`mt-2 text-3xl font-extrabold font-mono-eds ${accent ? 'text-emerald-300' : 'text-slate-100'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
      <div className="text-[10px] font-mono-eds uppercase tracking-widest text-slate-500">{label}</div>
      <div className="font-mono-eds font-semibold">{value}</div>
    </div>
  );
}
