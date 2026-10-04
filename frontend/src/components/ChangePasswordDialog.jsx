import { useState } from 'react';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, KeyRound } from 'lucide-react';

export default function ChangePasswordDialog({ open, onClose, forced = false }) {
  const [cur, setCur] = useState('');
  const [npw, setNpw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setCur(''); setNpw(''); setConfirm('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (npw.length < 8) {
      toast.error('Minimo 8 caratteri');
      return;
    }
    if (npw !== confirm) {
      toast.error('Le password non coincidono');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/change-password', { current_password: cur, new_password: npw });
      toast.success('Password aggiornata');
      reset();
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Errore cambio password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !forced && onClose?.()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-300" /> {forced ? 'Imposta una password sicura' : 'Cambia Password'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {forced
              ? 'Primo accesso: cambia la password di default per proteggere il tuo negozio.'
              : 'Scegli una nuova password di almeno 8 caratteri.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className="text-slate-300 text-xs">Password attuale</Label>
            <Input
              type="password"
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              data-testid="cp-current"
              required
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Nuova password (min. 8)</Label>
            <Input
              type="password"
              value={npw}
              onChange={(e) => setNpw(e.target.value)}
              data-testid="cp-new"
              required
              minLength={8}
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Conferma nuova password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              data-testid="cp-confirm"
              required
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
          <DialogFooter>
            {!forced && (
              <Button type="button" variant="outline" onClick={onClose} className="border-slate-700">
                Annulla
              </Button>
            )}
            <Button
              type="submit"
              disabled={busy}
              data-testid="cp-submit"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
            >
              <KeyRound className="w-4 h-4 mr-1.5" />
              {busy ? 'Salvo…' : 'Aggiorna Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
