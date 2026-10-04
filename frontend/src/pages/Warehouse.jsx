import { useEffect, useMemo, useRef, useState } from 'react';
import { api, fmtEUR, fmtDateShort } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ScanLine,
  Package,
  Search,
  Plus,
  Minus,
  Pencil,
  Trash2,
  AlertTriangle,
  Save,
  X,
  Smartphone,
  Battery,
  Shield,
  Headphones,
  Wrench,
  Boxes,
  FileText,
} from 'lucide-react';
import LowStockPrint from '@/components/LowStockPrint';
import { useStore } from '@/contexts/StoreContext';

const CATEGORIES = [
  { id: 'display', label: 'Display', icon: Smartphone, color: 'from-cyan-500 to-blue-700' },
  { id: 'batterie', label: 'Batterie', icon: Battery, color: 'from-lime-500 to-green-700' },
  { id: 'pellicole', label: 'Pellicole', icon: Shield, color: 'from-indigo-500 to-purple-700' },
  { id: 'accessori', label: 'Accessori', icon: Headphones, color: 'from-amber-500 to-orange-700' },
  { id: 'ricambi', label: 'Ricambi', icon: Wrench, color: 'from-slate-500 to-slate-700' },
  { id: 'altro', label: 'Altro', icon: Boxes, color: 'from-rose-500 to-pink-700' },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const EMPTY = { barcode: '', name: '', category: 'accessori', stock: 0, cost_price: 0, sale_price: 0, note: '' };

export default function Warehouse() {
  const { isAdmin } = useAuth();
  const { settings } = useStore();
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [editDlg, setEditDlg] = useState(null);
  const [delDlg, setDelDlg] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [printLow, setPrintLow] = useState(false);
  const scanRef = useRef(null);

  const load = () => api.get('/products').then((r) => setProducts(r.data));
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return p.name?.toLowerCase().includes(s) || p.barcode?.toLowerCase().includes(s);
    });
  }, [products, q, cat]);

  const totals = useMemo(() => {
    const stockQty = products.reduce((a, p) => a + (Number(p.stock) || 0), 0);
    const stockValueCost = products.reduce((a, p) => a + (Number(p.stock) || 0) * (Number(p.cost_price) || 0), 0);
    const stockValueSale = products.reduce((a, p) => a + (Number(p.stock) || 0) * (Number(p.sale_price) || 0), 0);
    const outOfStock = products.filter((p) => Number(p.stock) === 0).length;
    return { stockQty, stockValueCost, stockValueSale, outOfStock, count: products.length };
  }, [products]);

  const onScan = async (barcode) => {
    const code = barcode.trim();
    if (!code) return;
    try {
      const { data } = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      // highlight + optionally decrement
      setQ(code);
      toast.success(`Trovato: ${data.name} · giacenza ${data.stock}`);
    } catch {
      // not found -> open create dialog with barcode prefilled
      setEditDlg({ ...EMPTY, barcode: code });
      toast.message('Barcode nuovo: compila i dati del prodotto');
    }
  };

  const onScanKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onScan(e.currentTarget.value);
      e.currentTarget.value = '';
    }
  };

  const adjustStock = async (p, delta) => {
    try {
      const { data } = await api.post(`/products/${p.id}/stock`, { delta });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? data : x)));
    } catch {
      toast.error('Errore aggiornamento giacenza');
    }
  };

  const saveProduct = async (payload) => {
    try {
      if (payload.id) {
        const { data } = await api.put(`/products/${payload.id}`, {
          barcode: payload.barcode,
          name: payload.name,
          category: payload.category,
          stock: Number(payload.stock) || 0,
          cost_price: Number(payload.cost_price) || 0,
          sale_price: Number(payload.sale_price) || 0,
          note: payload.note,
        });
        setProducts((prev) => prev.map((x) => (x.id === data.id ? data : x)));
        toast.success('Prodotto aggiornato');
      } else {
        const { data } = await api.post('/products', {
          barcode: payload.barcode,
          name: payload.name,
          category: payload.category,
          stock: Number(payload.stock) || 0,
          cost_price: Number(payload.cost_price) || 0,
          sale_price: Number(payload.sale_price) || 0,
          note: payload.note,
        });
        setProducts((prev) => [...prev, data]);
        toast.success('Prodotto creato');
      }
      setEditDlg(null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Errore salvataggio');
    }
  };

  const delProduct = async () => {
    try {
      await api.delete(`/products/${delDlg.id}`);
      setProducts((prev) => prev.filter((x) => x.id !== delDlg.id));
      toast.success('Prodotto eliminato');
    } catch {
      toast.error('Errore eliminazione');
    } finally {
      setDelDlg(null);
    }
  };

  return (
    <div className="space-y-5" data-testid="warehouse-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono-eds text-xs uppercase tracking-widest text-cyan-400">
            Inventory
          </div>
          <h1 className="text-3xl font-extrabold mt-1">Magazzino Prodotti</h1>
          <p className="text-slate-400 text-sm">{totals.count} articoli · {totals.stockQty} pezzi in giacenza</p>
        </div>
        <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => setEditDlg({ ...EMPTY })}
          data-testid="btn-new-product"
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/30"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Nuovo Prodotto
        </Button>
        <Button
          onClick={async () => {
            setPrintLow(true);
            document.documentElement.classList.add('print-mode-lowstock');
            await new Promise((r) => setTimeout(r, 150));
            window.print();
            setTimeout(() => {
              document.documentElement.classList.remove('print-mode-lowstock');
              setPrintLow(false);
            }, 500);
          }}
          data-testid="btn-print-lowstock"
          variant="outline"
          className="border-amber-500/50 text-amber-300 hover:bg-amber-500 hover:text-slate-950"
        >
          <FileText className="w-4 h-4 mr-1.5" /> PDF Sotto Scorta
        </Button>
        </div>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Package} label="Articoli" value={totals.count} color="from-cyan-500 to-blue-700" testid="stat-count" />
        <StatCard icon={Boxes} label="Pezzi" value={totals.stockQty} color="from-emerald-500 to-teal-700" testid="stat-qty" />
        <StatCard icon={Wrench} label="Valore Acquisto" value={fmtEUR(totals.stockValueCost)} color="from-amber-500 to-orange-700" testid="stat-cost" />
        <StatCard icon={ScanLine} label="Valore Vendita" value={fmtEUR(totals.stockValueSale)} color="from-fuchsia-500 to-purple-700" testid="stat-sale" />
      </div>

      {/* Scanner bar */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 p-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 ${scanning ? 'eds-pulse' : ''}`}>
            <ScanLine className="w-5 h-5 text-cyan-300" />
          </div>
          <div className="flex-1">
            <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400">
              Scansione / Ricerca Rapida Barcode
            </div>
            <input
              ref={scanRef}
              autoFocus
              onKeyDown={onScanKey}
              onFocus={() => setScanning(true)}
              onBlur={() => setScanning(false)}
              placeholder="Spara il codice con il lettore o digita EAN/nome e premi Invio…"
              data-testid="scanner-input"
              className="w-full bg-transparent outline-none text-lg font-mono-eds text-white placeholder:text-slate-500 py-1"
            />
          </div>
          <button
            onClick={() => scanRef.current?.focus()}
            className="text-xs text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 rounded-lg px-3 py-2"
            data-testid="scanner-focus"
          >
            Focus
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Cerca per nome o barcode…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="warehouse-search"
            className="pl-9 bg-slate-900 border-slate-700"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setCat('all')}
            data-testid="cat-all"
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              cat === 'all' ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-semibold' : 'bg-slate-900 text-slate-300 border-slate-700'
            }`}
          >
            Tutti
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              data-testid={`cat-${c.id}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                cat === c.id ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-semibold' : 'bg-slate-900 text-slate-300 border-slate-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center text-slate-500">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
          Nessun prodotto. Clicca "Nuovo Prodotto" o scansiona un barcode.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((p) => {
            const CatMeta = CAT_MAP[p.category] || CAT_MAP.altro;
            const Icon = CatMeta.icon;
            const low = p.stock > 0 && p.stock <= 3;
            const out = p.stock === 0;
            return (
              <div
                key={p.id}
                data-testid={`product-${p.id}`}
                className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-cyan-500/40 transition-all"
              >
                <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${CatMeta.color} opacity-15 blur-xl`} />
                <div className="flex items-start gap-3 relative">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${CatMeta.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="font-mono-eds text-xs text-cyan-300/80 flex items-center gap-1">
                      <ScanLine className="w-3 h-3" /> {p.barcode || '— nessun EAN —'}
                    </div>
                  </div>
                  {out && (
                    <span className="shrink-0 text-[10px] font-mono-eds uppercase tracking-widest text-red-300 bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Esaurito
                    </span>
                  )}
                  {!out && low && (
                    <span className="shrink-0 text-[10px] font-mono-eds uppercase tracking-widest text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      Scorta bassa
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] font-mono-eds uppercase tracking-widest text-slate-500">Acquisto</div>
                    <div className="font-mono-eds text-slate-200">{fmtEUR(p.cost_price)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono-eds uppercase tracking-widest text-slate-500">Vendita</div>
                    <div className="font-mono-eds text-emerald-300 font-bold">{fmtEUR(p.sale_price)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono-eds uppercase tracking-widest text-slate-500">Margine</div>
                    <div className="font-mono-eds text-cyan-300">
                      {p.cost_price > 0 ? Math.round(((p.sale_price - p.cost_price) / p.cost_price) * 100) + '%' : '—'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => adjustStock(p, -1)}
                    data-testid={`stock-minus-${p.id}`}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className={`flex-1 text-center rounded-lg py-1 border ${
                    out ? 'bg-red-500/10 border-red-500/40 text-red-300' : low ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-slate-950 border-slate-700'
                  }`}>
                    <span className="text-[10px] font-mono-eds uppercase tracking-widest text-slate-500">Giacenza</span>
                    <div className="text-xl font-extrabold font-mono-eds leading-tight">{p.stock}</div>
                  </div>
                  <button
                    onClick={() => adjustStock(p, 1)}
                    data-testid={`stock-plus-${p.id}`}
                    className="w-8 h-8 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 flex gap-2">
                  <button
                    onClick={() => setEditDlg(p)}
                    data-testid={`edit-product-${p.id}`}
                    className="flex-1 flex items-center justify-center gap-1 text-xs text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50 rounded-lg py-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Modifica
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setDelDlg(p)}
                      data-testid={`del-product-${p.id}`}
                      className="w-10 flex items-center justify-center text-xs text-red-300 hover:text-white hover:bg-red-500 border border-red-500/30 hover:border-red-500 rounded-lg py-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-2 text-[10px] text-slate-500 font-mono-eds">
                  Aggiornato: {fmtDateShort(p.updated_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProductDialog product={editDlg} onClose={() => setEditDlg(null)} onSave={saveProduct} />

      {printLow && (
        <div className="print-root-lowstock print-only">
          <LowStockPrint products={products} settings={settings} threshold={3} />
        </div>
      )}

      <Dialog open={!!delDlg} onOpenChange={(v) => !v && setDelDlg(null)}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle>Eliminare "{delDlg?.name}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">Operazione non reversibile.</p>
          <DialogFooter>
            <Button variant="outline" className="border-slate-700" onClick={() => setDelDlg(null)}>Annulla</Button>
            <Button className="bg-red-500 hover:bg-red-400 text-white" onClick={delProduct} data-testid="confirm-del-product">
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, testid }) {
  return (
    <div data-testid={testid} className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${color} opacity-20 blur-xl`} />
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="font-mono-eds text-[10px] uppercase tracking-widest text-slate-400">{label}</div>
      </div>
      <div className="mt-2 text-2xl font-extrabold font-mono-eds">{value}</div>
    </div>
  );
}

function ProductDialog({ product, onClose, onSave }) {
  const [form, setForm] = useState(product || EMPTY);
  useEffect(() => setForm(product || EMPTY), [product]);
  if (!product) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-xl">
        <DialogHeader>
          <DialogTitle>{form.id ? 'Modifica Prodotto' : 'Nuovo Prodotto'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label className="text-slate-300 text-xs">Barcode / EAN</Label>
            <Input
              value={form.barcode || ''}
              onChange={(e) => set('barcode', e.target.value)}
              data-testid="pd-barcode"
              placeholder="8001234567890"
              className="mt-1 bg-slate-950 border-slate-700 font-mono-eds"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-slate-300 text-xs">Nome Prodotto</Label>
            <Input
              value={form.name || ''}
              onChange={(e) => set('name', e.target.value)}
              data-testid="pd-name"
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Categoria</Label>
            <Select value={form.category} onValueChange={(v) => set('category', v)}>
              <SelectTrigger data-testid="pd-category" className="mt-1 bg-slate-950 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Giacenza iniziale</Label>
            <Input
              type="number"
              value={form.stock ?? 0}
              onChange={(e) => set('stock', e.target.value)}
              data-testid="pd-stock"
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Costo acquisto €</Label>
            <Input
              type="number"
              step="0.01"
              value={form.cost_price ?? 0}
              onChange={(e) => set('cost_price', e.target.value)}
              data-testid="pd-cost"
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Prezzo vendita €</Label>
            <Input
              type="number"
              step="0.01"
              value={form.sale_price ?? 0}
              onChange={(e) => set('sale_price', e.target.value)}
              data-testid="pd-sale"
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-slate-300 text-xs">Note (fornitore, posizione scaffale…)</Label>
            <Input
              value={form.note || ''}
              onChange={(e) => set('note', e.target.value)}
              data-testid="pd-note"
              className="mt-1 bg-slate-950 border-slate-700"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-slate-700" onClick={onClose}>
            <X className="w-4 h-4 mr-1" /> Annulla
          </Button>
          <Button
            onClick={() => onSave(form)}
            disabled={!form.name?.trim()}
            data-testid="pd-save"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
          >
            <Save className="w-4 h-4 mr-1" /> Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
