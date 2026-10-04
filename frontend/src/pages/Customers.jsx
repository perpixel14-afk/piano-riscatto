import { useEffect, useMemo, useState } from 'react';
import { api, fmtEUR, fmtDate, fmtDateShort, STATUS_LABELS, STATUS_COLORS } from '@/lib/api';
import { useStore } from '@/contexts/StoreContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Users,
  Phone,
  Mail,
  Smartphone,
  Clock,
  Wallet,
  MessageCircle,
  Hash,
  Calendar,
  CheckCircle2,
  Wrench,
} from 'lucide-react';

export default function Customers() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);
  const { settings } = useStore();

  useEffect(() => {
    api.get('/customers').then((r) => setList(r.data));
  }, []);

  const filtered = useMemo(() => {
    if (!q) return list;
    const s = q.toLowerCase();
    return list.filter(
      (c) =>
        c.name?.toLowerCase().includes(s) ||
        c.phone?.includes(s) ||
        c.email?.toLowerCase().includes(s) ||
        c.last_device?.toLowerCase().includes(s)
    );
  }, [list, q]);

  const openDetail = async (phone) => {
    const { data } = await api.get(`/customers/${encodeURIComponent(phone)}`);
    setDetail(data);
  };

  const whatsapp = (c, e) => {
    e?.stopPropagation();
    const phone = (c.phone || '').replace(/\D/g, '');
    const num = phone.startsWith('39') ? phone : `39${phone}`;
    const msg = encodeURIComponent(
      `Ciao ${c.name}, da ${settings.business_name}. Ti scrivo per un aggiornamento sulla tua riparazione.`
    );
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  const detailStats = useMemo(() => {
    if (!detail) return null;
    const completed = detail.tickets.filter((t) => t.status === 'consegnato');
    const uniqueDevices = Array.from(
      new Set(detail.tickets.map((t) => `${t.device_brand || ''} ${t.device_model || ''}`.trim()))
    ).filter(Boolean);
    return {
      completed,
      completedTotal: completed.reduce((a, t) => a + (Number(t.estimate) || 0), 0),
      uniqueDevices,
    };
  }, [detail]);

  return (
    <div className="space-y-5" data-testid="customers-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono-eds text-xs uppercase tracking-widest text-cyan-400">
            Anagrafica Clienti
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">Schede Clienti</h1>
          <p className="text-slate-400 text-sm">{list.length} clienti · {filtered.length} visualizzati</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Cerca per nome, telefono, modello…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="customers-search"
            className="pl-9 bg-slate-900 border-slate-700"
          />
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
          Nessun cliente. Verrà aggiunto automaticamente alla prima pratica.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.phone}
              data-testid={`customer-card-${c.phone}`}
              className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-cyan-500/50 transition-all"
            >
              <button
                onClick={() => openDetail(c.phone)}
                data-testid={`customer-open-${c.phone}`}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-700/30 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-300 shrink-0">
                    {(c.name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{c.name || 'Senza nome'}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {c.phone}
                    </div>
                  </div>
                  {c.has_pending > 0 && (
                    <span className="shrink-0 text-[10px] font-mono-eds uppercase tracking-widest text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      {c.has_pending} aperte
                    </span>
                  )}
                </div>
                <div className="mt-3 text-xs text-slate-400 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" /> Ultimo: {c.last_device || '—'}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] font-mono-eds text-slate-500 uppercase tracking-widest">Pratiche</div>
                    <div className="text-lg font-bold text-slate-100">{c.tickets_count}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono-eds text-slate-500 uppercase tracking-widest">Fatturato</div>
                    <div className="text-lg font-bold text-cyan-300 font-mono-eds">{fmtEUR(c.total_spent)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono-eds text-slate-500 uppercase tracking-widest">Ultima</div>
                    <div className="text-xs font-semibold text-slate-200">{fmtDateShort(c.last_visit)}</div>
                  </div>
                </div>
              </button>

              <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
                <Button
                  onClick={() => openDetail(c.phone)}
                  variant="outline"
                  data-testid={`customer-history-${c.phone}`}
                  className="border-slate-700 hover:border-cyan-500/60 text-slate-200 h-9"
                >
                  <Wrench className="w-3.5 h-3.5 mr-1" /> Storico
                </Button>
                <Button
                  onClick={(e) => whatsapp(c, e)}
                  data-testid={`customer-whatsapp-${c.phone}`}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold h-9"
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> WhatsApp
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-3xl max-h-[90vh] overflow-y-auto">
          {detail && detailStats && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center justify-between gap-3 flex-wrap">
                  <span>{detail.name}</span>
                  <Button
                    size="sm"
                    onClick={(e) => whatsapp({ name: detail.name, phone: detail.phone }, e)}
                    data-testid="detail-whatsapp"
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
                  </Button>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                <StatBox icon={Hash} label="Pratiche" value={detail.tickets_count} />
                <StatBox icon={CheckCircle2} label="Riparate" value={detailStats.completed.length} color="text-emerald-300" />
                <StatBox icon={Wallet} label="Fatturato" value={fmtEUR(detail.total_spent)} color="text-cyan-300" />
                <StatBox icon={Clock} label="Da riscattare" value={fmtEUR(detail.pending_value)} color="text-amber-300" />
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-slate-300"><Phone className="w-4 h-4 text-cyan-400" />{detail.phone}</span>
                {detail.email && <span className="flex items-center gap-1.5 text-slate-300"><Mail className="w-4 h-4 text-cyan-400" />{detail.email}</span>}
                <span className="flex items-center gap-1.5 text-slate-300"><Calendar className="w-4 h-4 text-cyan-400" />Cliente dal {fmtDateShort(detail.first_visit)}</span>
              </div>

              {detailStats.uniqueDevices.length > 0 && (
                <div className="mt-4">
                  <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400 mb-2">
                    Dispositivi riparati ({detailStats.uniqueDevices.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailStats.uniqueDevices.map((d) => (
                      <span key={d} className="text-xs bg-slate-800 border border-slate-700 rounded-full px-2.5 py-1 flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-cyan-400" /> {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detailStats.completed.length > 0 && (
                <div className="mt-4">
                  <div className="font-mono-eds text-[10px] uppercase tracking-widest text-emerald-400 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Riparazioni completate
                  </div>
                  <div className="space-y-2">
                    {detailStats.completed.map((t) => (
                      <TicketRow key={t.id} t={t} />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400 mb-2">
                  Storico completo
                </div>
                <div className="space-y-2">
                  {detail.tickets.map((t) => (
                    <TicketRow key={t.id} t={t} />
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color = 'text-slate-100' }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="text-[10px] font-mono-eds text-slate-500 uppercase tracking-widest flex items-center gap-1">
        <Icon className="w-3 h-3" />{label}
      </div>
      <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function TicketRow({ t }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 flex items-center gap-3">
      <div className="font-mono-eds text-cyan-300 text-sm w-32 shrink-0">{t.code}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{t.device_brand} {t.device_model}</div>
        <div className="text-xs text-slate-500 truncate">{t.issue}</div>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[t.status]}`}>
        {STATUS_LABELS[t.status]}
      </span>
      <div className="font-mono-eds text-sm text-slate-200 w-20 text-right">{fmtEUR(t.estimate)}</div>
      <div className="text-xs text-slate-500 hidden sm:block w-24 text-right">{fmtDate(t.created_at)}</div>
    </div>
  );
}
