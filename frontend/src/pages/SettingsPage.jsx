import { useEffect, useState } from 'react';
import { api, fmtEUR } from '@/lib/api';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Trash2, Plus, UserPlus, Palette } from 'lucide-react';
import { THEMES } from '@/contexts/StoreContext';

export default function SettingsPage() {
  const { settings, save } = useStore();
  const { user } = useAuth();
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [newExp, setNewExp] = useState({ label: '', amount: '', period: 'mensile' });
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'tecnico' });

  useEffect(() => setForm(settings), [settings]);

  const loadExpenses = () => api.get('/expenses').then((r) => setExpenses(r.data));
  const loadUsers = () => api.get('/auth/users').then((r) => setUsers(r.data));
  useEffect(() => {
    loadExpenses();
    loadUsers();
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    setBusy(true);
    try {
      await save({
        ...form,
        daily_target_min: Number(form.daily_target_min) || 0,
        daily_target_max: Number(form.daily_target_max) || 0,
      });
      toast.success('Impostazioni salvate');
    } catch {
      toast.error('Errore salvataggio');
    } finally {
      setBusy(false);
    }
  };

  const addExpense = async () => {
    const amount = Number(newExp.amount);
    if (!newExp.label.trim() || !amount) {
      toast.error('Inserisci etichetta e importo');
      return;
    }
    try {
      await api.post('/expenses', { ...newExp, amount });
      setNewExp({ label: '', amount: '', period: 'mensile' });
      loadExpenses();
      toast.success('Spesa aggiunta');
    } catch {
      toast.error('Errore aggiunta');
    }
  };

  const delExpense = async (id) => {
    await api.delete(`/expenses/${id}`);
    loadExpenses();
  };

  const addUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Compila tutti i campi');
      return;
    }
    try {
      await api.post('/auth/users', newUser);
      setNewUser({ name: '', email: '', password: '', role: 'tecnico' });
      loadUsers();
      toast.success('Operatore creato');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Errore');
    }
  };

  const delUser = async (id) => {
    await api.delete(`/auth/users/${id}`);
    loadUsers();
  };

  return (
    <div className="space-y-6 max-w-5xl" data-testid="settings-page">
      <header>
        <div className="font-mono-eds text-xs uppercase tracking-widest text-cyan-400">
          Configurazione
        </div>
        <h1 className="text-3xl font-extrabold mt-1">Impostazioni Negozio</h1>
        <p className="text-slate-400 text-sm">Dati fiscali, condizioni di garanzia, spese fisse e operatori.</p>
      </header>

      {/* Platform & Theme */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-cyan-300" />
          <h3 className="font-semibold text-cyan-300">Branding & Tema</h3>
        </div>
        <div>
          <Label className="text-slate-300 text-xs">Nome del gestionale / software</Label>
          <Input
            value={form.platform_name || ''}
            onChange={(e) => set('platform_name', e.target.value)}
            data-testid="settings-platform-name"
            placeholder="Pixel Lab"
            className="mt-1 bg-slate-950 border-slate-700 max-w-md"
          />
          <div className="text-xs text-slate-500 mt-1">
            Visualizzato in sidebar, dashboard e portalino tracking.
          </div>
        </div>
        <div>
          <Label className="text-slate-300 text-xs">Tema / Layout Grafico</Label>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(THEMES).map(([key, t]) => {
              const active = form.theme === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => set('theme', key)}
                  data-testid={`theme-${key}`}
                  className={`relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 ${
                    active ? 'border-cyan-400 ring-2 ring-cyan-500/40' : 'border-slate-700 hover:border-slate-500'
                  }`}
                  style={{ background: `linear-gradient(135deg, ${t.bg} 0%, ${t.bg2} 100%)` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full" style={{ background: t.accent, boxShadow: `0 0 12px ${t.accent}` }} />
                    <span className="w-5 h-5 rounded-full" style={{ background: t.accent2 }} />
                  </div>
                  <div className="mt-3 font-semibold text-white">{t.label}</div>
                  <div className="font-mono-eds text-[10px] uppercase tracking-widest mt-1" style={{ color: t.accent }}>
                    {active ? '✓ Attivo' : 'Seleziona'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Shop info */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <h3 className="font-semibold text-cyan-300">Anagrafica Negozio</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            ['business_name', 'Ragione Sociale'],
            ['vat', 'Partita IVA'],
            ['address', 'Indirizzo'],
            ['phone', 'Telefono / WhatsApp'],
            ['email', 'Email'],
          ].map(([k, l]) => (
            <div key={k}>
              <Label className="text-slate-300 text-xs">{l}</Label>
              <Input
                value={form[k] || ''}
                onChange={(e) => set(k, e.target.value)}
                data-testid={`settings-${k}`}
                className="mt-1 bg-slate-950 border-slate-700"
              />
            </div>
          ))}
        </div>
        <div>
          <Label className="text-slate-300 text-xs">Condizioni di Garanzia (stampa su scheda cliente)</Label>
          <Textarea
            value={form.warranty_terms || ''}
            onChange={(e) => set('warranty_terms', e.target.value)}
            data-testid="settings-warranty"
            rows={3}
            className="mt-1 bg-slate-950 border-slate-700"
          />
        </div>
        <div>
          <Label className="text-slate-300 text-xs">Note & Condizioni Generali</Label>
          <Textarea
            value={form.conditions || ''}
            onChange={(e) => set('conditions', e.target.value)}
            data-testid="settings-conditions"
            rows={3}
            className="mt-1 bg-slate-950 border-slate-700"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div>
            <Label className="text-slate-300 text-xs">Target Giornaliero Min €</Label>
            <Input
              type="number"
              value={form.daily_target_min ?? ''}
              onChange={(e) => set('daily_target_min', e.target.value)}
              data-testid="settings-target-min"
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Target Giornaliero Max €</Label>
            <Input
              type="number"
              value={form.daily_target_max ?? ''}
              onChange={(e) => set('daily_target_max', e.target.value)}
              data-testid="settings-target-max"
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
        </div>
        <Button
          onClick={onSave}
          disabled={busy}
          data-testid="settings-save"
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
        >
          <Save className="w-4 h-4 mr-1.5" /> {busy ? 'Salvo…' : 'Salva Impostazioni'}
        </Button>
      </section>

      {/* Fixed expenses */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <h3 className="font-semibold text-cyan-300">Spese Fisse (Piano Riscatto)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Input
            placeholder="Etichetta (es. Affitto)"
            value={newExp.label}
            onChange={(e) => setNewExp({ ...newExp, label: e.target.value })}
            data-testid="exp-label"
            className="bg-slate-950 border-slate-700"
          />
          <Input
            type="number"
            placeholder="Importo €"
            value={newExp.amount}
            onChange={(e) => setNewExp({ ...newExp, amount: e.target.value })}
            data-testid="exp-amount"
            className="bg-slate-950 border-slate-700"
          />
          <Select value={newExp.period} onValueChange={(v) => setNewExp({ ...newExp, period: v })}>
            <SelectTrigger data-testid="exp-period" className="bg-slate-950 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="giornaliero">Giornaliero</SelectItem>
              <SelectItem value="settimanale">Settimanale</SelectItem>
              <SelectItem value="mensile">Mensile</SelectItem>
              <SelectItem value="annuale">Annuale</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addExpense} data-testid="exp-add" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold">
            <Plus className="w-4 h-4 mr-1" /> Aggiungi
          </Button>
        </div>
        <div className="space-y-1.5">
          {expenses.length === 0 && <div className="text-sm text-slate-500">Nessuna spesa fissa.</div>}
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
              <div className="flex-1">
                <div className="font-medium">{e.label}</div>
                <div className="text-xs text-slate-500 capitalize">{e.period}</div>
              </div>
              <div className="font-mono-eds text-cyan-300">{fmtEUR(e.amount)}</div>
              <button
                onClick={() => delExpense(e.id)}
                data-testid={`exp-del-${e.id}`}
                className="w-7 h-7 rounded-md bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white flex items-center justify-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Operators */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <h3 className="font-semibold text-cyan-300">Operatori</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <Input placeholder="Nome" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} data-testid="user-name" className="bg-slate-950 border-slate-700" />
          <Input placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} data-testid="user-email" className="bg-slate-950 border-slate-700" />
          <Input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} data-testid="user-password" className="bg-slate-950 border-slate-700" />
          <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
            <SelectTrigger data-testid="user-role" className="bg-slate-950 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="admin">Amministratore</SelectItem>
              <SelectItem value="tecnico">Tecnico</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addUser} data-testid="user-add" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold">
            <UserPlus className="w-4 h-4 mr-1" /> Crea
          </Button>
        </div>
        <div className="space-y-1.5">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
              <div className="flex-1">
                <div className="font-medium">{u.name} {u.id === user.id && <span className="text-xs text-cyan-400">(tu)</span>}</div>
                <div className="text-xs text-slate-500">{u.email}</div>
              </div>
              <span className="text-xs font-mono-eds uppercase tracking-widest text-cyan-400">
                {u.role}
              </span>
              {u.id !== user.id && (
                <button
                  onClick={() => delUser(u.id)}
                  data-testid={`user-del-${u.id}`}
                  className="w-7 h-7 rounded-md bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
