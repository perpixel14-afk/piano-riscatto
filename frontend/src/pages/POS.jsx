import { useMemo, useState } from 'react';
import { api, fmtEUR } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Smartphone,
  Headphones,
  Cable,
  Plug,
  Shield,
  Battery,
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Banknote,
  CreditCard,
  ArrowRightLeft,
} from 'lucide-react';

const FAVORITES = [
  { id: 'idrogel', name: 'Pellicola Idrogel', price: 15, icon: Shield, color: 'from-cyan-500 to-blue-700' },
  { id: 'epu-hd', name: 'EPU HD Vetro Temperato', price: 20, icon: Smartphone, color: 'from-indigo-500 to-purple-700' },
  { id: 'cuffie', name: 'Cuffie Wireless', price: 25, icon: Headphones, color: 'from-emerald-500 to-teal-700' },
  { id: 'cavo-c', name: 'Cavo Type-C 1m', price: 10, icon: Cable, color: 'from-amber-500 to-orange-700' },
  { id: 'adapter', name: 'Adapter USB-C', price: 12, icon: Plug, color: 'from-rose-500 to-pink-700' },
  { id: 'batteria', name: 'Service Batteria', price: 45, icon: Battery, color: 'from-lime-500 to-green-700' },
  { id: 'cover', name: 'Cover Silicone', price: 10, icon: Shield, color: 'from-sky-500 to-blue-700' },
  { id: 'cavo-l', name: 'Cavo Lightning 1m', price: 10, icon: Cable, color: 'from-fuchsia-500 to-purple-700' },
];

const PAYMENT = [
  { id: 'contanti', label: 'Contanti', icon: Banknote },
  { id: 'pos', label: 'POS / Carta', icon: CreditCard },
  { id: 'transfer', label: 'Bonifico', icon: ArrowRightLeft },
];

export default function POS() {
  const [cart, setCart] = useState([]);
  const [custom, setCustom] = useState({ name: '', price: '' });
  const [payment, setPayment] = useState('contanti');
  const [discount, setDiscount] = useState('');
  const [busy, setBusy] = useState(false);

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  const addItem = (item) => {
    setCart((c) => {
      const existing = c.find((x) => x.id === item.id);
      if (existing) return c.map((x) => (x.id === item.id ? { ...x, qty: x.qty + 1 } : x));
      return [...c, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setCart((c) =>
      c
        .map((x) => (x.id === id ? { ...x, qty: x.qty + delta } : x))
        .filter((x) => x.qty > 0)
    );
  };

  const remove = (id) => setCart((c) => c.filter((x) => x.id !== id));

  const addCustom = () => {
    const price = Number(custom.price);
    if (!custom.name.trim() || !price) {
      toast.error('Inserisci nome e prezzo');
      return;
    }
    addItem({ id: `custom-${Date.now()}`, name: custom.name.trim(), price });
    setCustom({ name: '', price: '' });
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    setBusy(true);
    try {
      const { data } = await api.post('/sales', {
        items: cart.map((i) => ({ name: i.name, price: i.price, qty: i.qty })),
        payment_method: payment,
        discount: Number(discount) || 0,
      });
      toast.success(`Incasso registrato · ${fmtEUR(data.total)} (${data.code})`);
      setCart([]);
      setDiscount('');
    } catch {
      toast.error('Errore incasso');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5" data-testid="pos-page">
      <header>
        <div className="font-mono-eds text-xs uppercase tracking-widest text-cyan-400">Touch POS</div>
        <h1 className="text-3xl font-extrabold mt-1">Cassa Rapida</h1>
        <p className="text-slate-400 text-sm">Tocca un prodotto per aggiungerlo. Incassa in un click.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Favorites grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {FAVORITES.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => addItem(f)}
                  data-testid={`pos-item-${f.id}`}
                  className="group relative rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left hover:border-cyan-500/60 transition-all hover:-translate-y-0.5 active:translate-y-0 min-h-[120px] flex flex-col justify-between overflow-hidden"
                >
                  <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${f.color} opacity-30 blur-xl group-hover:opacity-60 transition-opacity`} />
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-100">{f.name}</div>
                    <div className="font-mono-eds text-cyan-300 mt-0.5">{fmtEUR(f.price)}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400 mb-2">
              Aggiungi articolo libero
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nome articolo"
                value={custom.name}
                onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                data-testid="pos-custom-name"
                className="bg-slate-950 border-slate-700"
              />
              <Input
                type="number"
                step="0.01"
                placeholder="€"
                value={custom.price}
                onChange={(e) => setCustom({ ...custom, price: e.target.value })}
                data-testid="pos-custom-price"
                className="bg-slate-950 border-slate-700 w-28"
              />
              <Button onClick={addCustom} data-testid="pos-custom-add" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Cart */}
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 p-5 flex flex-col eds-glow" data-testid="pos-cart">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-5 h-5 text-cyan-300" />
            <h2 className="font-bold">Carrello</h2>
            <span className="ml-auto font-mono-eds text-xs text-slate-400">{cart.length} articoli</span>
          </div>

          <div className="flex-1 min-h-[200px] max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {cart.length === 0 && (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">
                Nessun articolo. Tocca un prodotto.
              </div>
            )}
            {cart.map((i) => (
              <div key={i.id} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg p-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{i.name}</div>
                  <div className="font-mono-eds text-xs text-slate-400">{fmtEUR(i.price)} × {i.qty}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => changeQty(i.id, -1)} data-testid={`cart-minus-${i.id}`} className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 flex items-center justify-center">
                    <Minus className="w-3 h-3" />
                  </button>
                  <button onClick={() => changeQty(i.id, 1)} data-testid={`cart-plus-${i.id}`} className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button onClick={() => remove(i.id)} data-testid={`cart-remove-${i.id}`} className="w-7 h-7 rounded-md bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white flex items-center justify-center">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-20">Sconto €</span>
              <Input
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                data-testid="pos-discount"
                className="bg-slate-950 border-slate-700 h-8"
              />
            </div>
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Subtotale</span>
              <span className="font-mono-eds">{fmtEUR(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-2xl font-extrabold">
              <span>Totale</span>
              <span className="text-cyan-300 font-mono-eds" data-testid="pos-total">{fmtEUR(total)}</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-2">
              {PAYMENT.map((p) => {
                const Icon = p.icon;
                const active = payment === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPayment(p.id)}
                    data-testid={`pos-pay-${p.id}`}
                    className={`rounded-lg py-2 text-xs font-medium border flex flex-col items-center gap-1 transition-all ${
                      active
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-500/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {p.label}
                  </button>
                );
              })}
            </div>

            <Button
              onClick={checkout}
              disabled={busy || cart.length === 0}
              data-testid="pos-checkout"
              className="w-full h-12 mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-lg shadow-lg shadow-emerald-500/30"
            >
              {busy ? 'Incasso…' : `INCASSA ${fmtEUR(total)}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
