import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const FIELDS = [
  ['customer_name', 'Cliente'],
  ['customer_phone', 'Telefono'],
  ['customer_email', 'Email'],
  ['device_brand', 'Marca'],
  ['device_model', 'Modello'],
  ['device_color', 'Colore'],
  ['imei', 'IMEI'],
  ['pin', 'PIN'],
  ['pattern', 'Pattern / Password'],
];

export default function EditTicketDialog({ ticket, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ticket) setForm({ ...ticket });
  }, [ticket]);

  if (!ticket) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        ...form,
        estimate: Number(form.estimate) || 0,
        deposit: Number(form.deposit) || 0,
        part_cost: Number(form.part_cost) || 0,
      };
      const { data } = await api.put(`/tickets/${ticket.id}`, payload);
      onSaved?.(data);
      toast.success('Pratica aggiornata');
      onClose?.();
    } catch {
      toast.error('Errore salvataggio');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!ticket} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifica Pratica — {ticket.code}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
          {FIELDS.map(([k, label]) => (
            <div key={k}>
              <Label className="text-slate-300 text-xs">{label}</Label>
              <Input
                value={form[k] || ''}
                onChange={(e) => set(k, e.target.value)}
                data-testid={`edit-${k}`}
                className="mt-1 bg-slate-950 border-slate-700"
              />
            </div>
          ))}
          <div>
            <Label className="text-slate-300 text-xs">Preventivo €</Label>
            <Input
              type="number"
              step="0.01"
              value={form.estimate || ''}
              onChange={(e) => set('estimate', e.target.value)}
              data-testid="edit-estimate"
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Acconto €</Label>
            <Input
              type="number"
              step="0.01"
              value={form.deposit || ''}
              onChange={(e) => set('deposit', e.target.value)}
              data-testid="edit-deposit"
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Costo Ricambio €</Label>
            <Input
              type="number"
              step="0.01"
              value={form.part_cost || ''}
              onChange={(e) => set('part_cost', e.target.value)}
              data-testid="edit-part-cost"
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
          <div className="md:col-span-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-center justify-between">
            <div>
              <div className="font-mono-eds text-[10px] uppercase tracking-widest text-emerald-300">Utile Netto</div>
              <div className="text-xs text-slate-400">Preventivo − Costo Ricambio</div>
            </div>
            <div className="text-xl font-extrabold text-emerald-300 font-mono-eds" data-testid="edit-margin">
              € {Math.max(0, (Number(form.estimate) || 0) - (Number(form.part_cost) || 0)).toFixed(2).replace('.', ',')}
            </div>
          </div>
          <div className="md:col-span-2">
            <Label className="text-slate-300 text-xs">Guasto</Label>
            <Textarea
              value={form.issue || ''}
              onChange={(e) => set('issue', e.target.value)}
              data-testid="edit-issue"
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-slate-300 text-xs">Note interne</Label>
            <Textarea
              value={form.notes || ''}
              onChange={(e) => set('notes', e.target.value)}
              data-testid="edit-notes"
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-slate-700">Annulla</Button>
          <Button onClick={save} disabled={busy} data-testid="edit-save" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold">
            {busy ? 'Salvo…' : 'Salva Modifiche'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
