import { useEffect, useMemo, useState } from 'react';
import { api, fmtEUR, fmtDateShort, STATUS_LABELS, STATUS_COLORS, STATUS_FLOW } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  MessageCircle,
  ChevronRight,
  Printer,
  Tag,
  Pencil,
  Trash2,
  Search,
  Plus,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PrintA4 from '@/components/PrintA4';
import PrintA4LayoutDialog from '@/components/PrintA4LayoutDialog';
import PrintLabel from '@/components/PrintLabel';
import LabelLayoutDialog from '@/components/LabelLayoutDialog';
import TicketMessagesDialog from '@/components/TicketMessagesDialog';
import StatusChangeDialog from '@/components/StatusChangeDialog';
import EditTicketDialog from '@/components/EditTicketDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [printA4, setPrintA4] = useState(null);
  const [a4Choice, setA4Choice] = useState(null);
  const [printLabel, setPrintLabel] = useState(null);
  const [labelChoice, setLabelChoice] = useState(null);
  const [chatDlg, setChatDlg] = useState(null);
  const [statusDlg, setStatusDlg] = useState(null);
  const [editDlg, setEditDlg] = useState(null);
  const [delDlg, setDelDlg] = useState(null);
  const { isAdmin } = useAuth();
  const { settings } = useStore();
  const nav = useNavigate();

  const load = () => api.get('/tickets').then((r) => setTickets(r.data));
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        t.code?.toLowerCase().includes(s) ||
        t.customer_name?.toLowerCase().includes(s) ||
        t.customer_phone?.includes(s) ||
        t.device_brand?.toLowerCase().includes(s) ||
        t.device_model?.toLowerCase().includes(s)
      );
    });
  }, [tickets, filter, q]);

  const triggerPrint = async (ticket, type, option) => {
    const htmlEl = document.documentElement;
    if (type === 'a4') {
      setPrintA4({ ticket, layout: option });
      htmlEl.classList.add('print-mode-a4');
    } else {
      setPrintLabel({ ticket, layout: option });
      htmlEl.classList.add('print-mode-label');
    }
    await new Promise((r) => setTimeout(r, 150));
    window.print();
    setTimeout(() => {
      setPrintA4(null);
      setPrintLabel(null);
      htmlEl.classList.remove('print-mode-a4');
      htmlEl.classList.remove('print-mode-label');
    }, 500);
  };

  const chooseLabelLayout = (layoutId) => {
    const t = labelChoice;
    setLabelChoice(null);
    triggerPrint(t, 'label', layoutId);
  };

  const chooseA4Layout = (layoutId) => {
    const t = a4Choice;
    setA4Choice(null);
    triggerPrint(t, 'a4', layoutId);
  };

  const openWhatsApp = (t) => {
    const phone = (t.customer_phone || '').replace(/\D/g, '');
    const num = phone.startsWith('39') ? phone : `39${phone}`;
    const msg = encodeURIComponent(
      `Ciao ${t.customer_name}, da ${settings.business_name}. Aggiornamento pratica *${t.code}* (${t.device_brand} ${t.device_model}): stato attuale → *${STATUS_LABELS[t.status]}*.`
    );
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  };

  const nextStatus = (s) => {
    const i = STATUS_FLOW.indexOf(s);
    return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
  };

  const quickAdvance = async (t) => {
    const next = nextStatus(t.status);
    if (!next) {
      setStatusDlg(t);
      return;
    }
    setStatusDlg({ ...t, _suggested: next });
  };

  const onStatusSaved = (updated) => {
    setTickets((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  };

  const onDelete = async (t) => {
    try {
      await api.delete(`/tickets/${t.id}`);
      setTickets((prev) => prev.filter((x) => x.id !== t.id));
      toast.success(`Pratica ${t.code} eliminata`);
    } catch (e) {
      toast.error('Errore eliminazione');
    } finally {
      setDelDlg(null);
    }
  };

  return (
    <div className="space-y-5" data-testid="tickets-page">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono-eds text-xs uppercase tracking-widest text-cyan-400">
            Workshop Registry
          </div>
          <h1 className="text-3xl font-extrabold mt-1">Registro Tickets</h1>
          <p className="text-slate-400 text-sm">
            {tickets.length} pratiche totali · {filtered.length} visualizzate
          </p>
        </div>
        <Button
          data-testid="btn-new-ticket"
          onClick={() => nav('/tickets/new')}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/30"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nuova Pratica
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Cerca per codice, cliente, telefono, modello…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="tickets-search"
            className="pl-9 bg-slate-900/70 border-slate-700"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...STATUS_FLOW, 'non_riparabile'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              data-testid={`filter-${s}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                filter === s
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-semibold'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-500/50'
              }`}
            >
              {s === 'all' ? 'Tutti' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-sm">
          <thead className="text-left font-mono-eds text-[10px] uppercase tracking-widest text-slate-400 bg-slate-950/60">
            <tr>
              <th className="px-4 py-3">Codice</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Dispositivo</th>
              <th className="px-4 py-3">Guasto</th>
              <th className="px-4 py-3">Stato</th>
              <th className="px-4 py-3 text-right">Preventivo</th>
              <th className="px-4 py-3">Entrata</th>
              <th className="px-4 py-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  Nessuna pratica. <button onClick={() => nav('/tickets/new')} className="text-cyan-400 hover:underline">Crea la prima.</button>
                </td>
              </tr>
            )}
            {filtered.map((t) => (
              <tr
                key={t.id}
                className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors"
                data-testid={`ticket-row-${t.code}`}
              >
                <td className="px-4 py-3 font-mono-eds text-cyan-300">{t.code}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-100">{t.customer_name}</div>
                  <div className="text-xs text-slate-500">{t.customer_phone}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-100">{t.device_brand} {t.device_model}</div>
                  {t.device_color && <div className="text-xs text-slate-500">{t.device_color}</div>}
                </td>
                <td className="px-4 py-3 text-slate-300 max-w-[220px] truncate" title={t.issue}>
                  {t.issue}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs border ${STATUS_COLORS[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono-eds text-slate-200">
                  {fmtEUR(t.estimate)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">{fmtDateShort(t.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      title="Invia WhatsApp"
                      onClick={() => openWhatsApp(t)}
                      data-testid={`action-whatsapp-${t.code}`}
                      className="w-8 h-8 rounded-lg bg-emerald-600/20 hover:bg-emerald-500 text-emerald-300 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      title="Chat col cliente"
                      onClick={() => setChatDlg(t)}
                      data-testid={`action-chat-${t.code}`}
                      className="w-8 h-8 rounded-lg bg-sky-600/20 hover:bg-sky-500 text-sky-300 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      title="Avanza stato"
                      onClick={() => quickAdvance(t)}
                      data-testid={`action-status-${t.code}`}
                      className="w-8 h-8 rounded-lg bg-cyan-600/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      title="Stampa scheda A4"
                      onClick={() => setA4Choice(t)}
                      data-testid={`action-print-a4-${t.code}`}
                      className="w-8 h-8 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-200 flex items-center justify-center transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      title="Stampa etichetta termica"
                      onClick={() => setLabelChoice(t)}
                      data-testid={`action-print-label-${t.code}`}
                      className="w-8 h-8 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-200 flex items-center justify-center transition-colors"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                    <button
                      title="Modifica"
                      onClick={() => setEditDlg(t)}
                      data-testid={`action-edit-${t.code}`}
                      className="w-8 h-8 rounded-lg bg-slate-700/60 hover:bg-amber-500 text-slate-200 hover:text-slate-900 flex items-center justify-center transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        title="Elimina"
                        onClick={() => setDelDlg(t)}
                        data-testid={`action-delete-${t.code}`}
                        className="w-8 h-8 rounded-lg bg-slate-700/60 hover:bg-red-500 text-slate-200 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      <StatusChangeDialog
        ticket={statusDlg}
        onClose={() => setStatusDlg(null)}
        onSaved={onStatusSaved}
      />
      <EditTicketDialog
        ticket={editDlg}
        onClose={() => setEditDlg(null)}
        onSaved={onStatusSaved}
      />
      <AlertDialog open={!!delDlg} onOpenChange={(v) => !v && setDelDlg(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la pratica?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              La pratica {delDlg?.code} verrà rimossa definitivamente dal registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700" data-testid="btn-delete-cancel">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(delDlg)}
              data-testid="btn-delete-confirm"
              className="bg-red-500 hover:bg-red-400 text-white"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print components (fixed off-screen; printed via @media print) */}
      {printA4 && (
        <div className="print-root-a4 print-only">
          <PrintA4 ticket={printA4.ticket} settings={settings} layout={printA4.layout} />
        </div>
      )}
      {printLabel && (
        <div className="print-root-label print-only">
          <PrintLabel ticket={printLabel.ticket} settings={settings} layout={printLabel.layout} />
        </div>
      )}

      <PrintA4LayoutDialog
        ticket={a4Choice}
        onClose={() => setA4Choice(null)}
        onChoose={chooseA4Layout}
      />
      <LabelLayoutDialog
        ticket={labelChoice}
        onClose={() => setLabelChoice(null)}
        onChoose={chooseLabelLayout}
      />
      <TicketMessagesDialog ticket={chatDlg} onClose={() => setChatDlg(null)} />
    </div>
  );
}
