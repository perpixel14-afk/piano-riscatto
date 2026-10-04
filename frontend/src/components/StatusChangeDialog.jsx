import { useState } from 'react';
import { api, STATUS_LABELS, STATUS_FLOW } from '@/lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL_STATUSES = [...STATUS_FLOW, 'non_riparabile'];

export default function StatusChangeDialog({ ticket, onClose, onSaved }) {
  const [status, setStatus] = useState(ticket?._suggested || ticket?.status || 'in_lavorazione');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!ticket) return null;

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/tickets/${ticket.id}/status`, { status, note });
      onSaved?.(data);
      toast.success(`Stato aggiornato: ${STATUS_LABELS[status]}`);
      onClose?.();
    } catch {
      toast.error('Errore aggiornamento stato');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!ticket} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle>Aggiorna Stato — {ticket.code}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {ticket.customer_name} · {ticket.device_brand} {ticket.device_model}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-slate-300 text-xs">Nuovo stato</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="status-select" className="mt-1 bg-slate-950 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} data-testid={`status-option-${s}`}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300 text-xs">Nota (opzionale)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="status-note"
              placeholder="es: Sostituito display originale, test funzionali OK"
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-700" data-testid="status-cancel">
            Annulla
          </Button>
          <Button
            onClick={save}
            disabled={busy}
            data-testid="status-save"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
          >
            {busy ? 'Salvo…' : 'Aggiorna'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
