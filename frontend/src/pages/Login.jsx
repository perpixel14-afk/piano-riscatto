import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Zap, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('perpixel14@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    // BYPASS LOGIN: Entriamo direttamente senza chiamare il backend
    setTimeout(() => {
      localStorage.setItem('token', 'bypass-token-piano-riscatto');
      toast.success('Accesso effettuato (Bypass attivo)');
      nav('/', { replace: true });
      window.location.reload();
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b132b] eds-noise p-6"
      style={{ backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(6,182,212,0.12), transparent 40%), radial-gradient(circle at 80% 90%, rgba(56,189,248,0.08), transparent 50%)' }}
    >
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Zap className="w-6 h-6 text-slate-900" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-mono-eds text-xs uppercase tracking-widest text-cyan-400">
              Pixel Lab · Workshop
            </div>
            <div className="text-2xl font-extrabold tracking-tight">EDS PIXEL</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-7 shadow-2xl shadow-cyan-950/40 eds-glow">
          <h1 className="text-2xl font-bold">Accedi al gestionale</h1>
          <p className="text-sm text-slate-400 mt-1">
            Hub operativo per il laboratorio di riparazione
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
                className="mt-1.5 bg-slate-950/70 border-slate-700 focus-visible:ring-cyan-500/50"
                required
              />
            </div>
            <div>
              <Label htmlFor="pw" className="text-slate-300">
                Password
              </Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="login-password-input"
                className="mt-1.5 bg-slate-950/70 border-slate-700 focus-visible:ring-cyan-500/50"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              data-testid="login-submit-button"
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/30 h-11"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Entra nel Laboratorio (Bypass)
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}