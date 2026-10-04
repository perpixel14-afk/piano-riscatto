import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewTicket() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    device_brand: '',
    device_model: '',
    device_color: '',
    imei: '',
    issue: '',
    accessories: '',
    conditions: '',
    estimate: '',
    deposit: '',
    part_cost: '',
    pin: '',
    pattern: '',
    notes: '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const utile = Math.max(0, (Number(form.estimate) || 0) - (Number(form.part_cost) || 0));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        estimate: Number(form.estimate) || 0,
        deposit: Number(form.deposit) || 0,
        part_cost: Number(form.part_cost) || 0,
      };
      const { data } = await api.post('/tickets', payload);
      toast.success(`Pratica ${data.code} creata`);
      nav('/tickets');
    } catch (err) {
      toast.error('Errore creazione pratica');
    } finally {
      setBusy(false);
    }
  };

  const field = (name, label, props = {}) => (
    <div>
      <Label htmlFor={name} className="text-slate-300 text-xs">{label}</Label>
      <Input
        id={name}
        value={form[name]}
        onChange={(e) => set(name, e.target.value)}
        data-testid={`new-ticket-${name}`}
        className="mt-1 bg-slate-950/70 border-slate-700"
        {...props}
      />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => nav('/tickets')}
        className="flex items-center gap-2 text-slate-400 hover:text-cyan-300 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Torna al registro
      </button>
      <header>
        <div className="font-mono-eds text-xs uppercase tracking-widest text-cyan-400">
          Nuova Accettazione
        </div>
        <h1 className="text-3xl font-extrabold mt-1">Pratica di Riparazione</h1>
        <p className="text-slate-400 text-sm">Compila i dati del cliente e del dispositivo in ingresso.</p>
      </header>

      <form onSubmit={submit} className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <h3 className="font-semibold text-cyan-300">Cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {field('customer_name', 'Nome e Cognome *', { required: true })}
            {field('customer_phone', 'Telefono / WhatsApp *', { required: true })}
            {field('customer_email', 'Email', { type: 'email' })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <h3 className="font-semibold text-cyan-300">Dispositivo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {field('device_brand', 'Marca *', { required: true, placeholder: 'Apple, Samsung…' })}
            {field('device_model', 'Modello *', { required: true, placeholder: 'iPhone 14 Pro' })}
            {field('device_color', 'Colore')}
            {field('imei', 'IMEI / Seriale')}
            {field('pin', 'PIN sblocco')}
            {field('pattern', 'Segno / Password')}
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Guasto segnalato *</Label>
            <Textarea
              value={form.issue}
              onChange={(e) => set('issue', e.target.value)}
              data-testid="new-ticket-issue"
              required
              rows={2}
              className="mt-1 bg-slate-950/70 border-slate-700"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-xs">Accessori consegnati</Label>
              <Input
                value={form.accessories}
                onChange={(e) => set('accessories', e.target.value)}
                data-testid="new-ticket-accessories"
                placeholder="Caricatore, cover, SIM…"
                className="mt-1 bg-slate-950/70 border-slate-700"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-xs">Condizioni estetiche</Label>
              <Input
                value={form.conditions}
                onChange={(e) => set('conditions', e.target.value)}
                data-testid="new-ticket-conditions"
                placeholder="Graffi scocca, vetro crepato…"
                className="mt-1 bg-slate-950/70 border-slate-700"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <h3 className="font-semibold text-cyan-300">Economia</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {field('estimate', 'Preventivo € *', { type: 'number', step: '0.01', required: true })}
            {field('deposit', 'Acconto €', { type: 'number', step: '0.01' })}
            {field('part_cost', 'Costo Ricambio €', { type: 'number', step: '0.01' })}
          </div>
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-center justify-between">
            <div>
              <div className="font-mono-eds text-[10px] uppercase tracking-widest text-emerald-300">
                Utile Netto Stimato
              </div>
              <div className="text-xs text-slate-400">Preventivo − Costo Ricambio</div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-300 font-mono-eds" data-testid="new-ticket-margin">
              € {utile.toFixed(2).replace('.', ',')}
            </div>
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Note interne</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              data-testid="new-ticket-notes"
              rows={2}
              className="mt-1 bg-slate-950/70 border-slate-700"
            />
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => nav('/tickets')} className="border-slate-700">
            Annulla
          </Button>
          <Button
            type="submit"
            disabled={busy}
            data-testid="btn-save-ticket"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/30"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {busy ? 'Salvataggio…' : 'Crea Pratica'}
          </Button>
        </div>
      </form>
    </div>
  );
}
