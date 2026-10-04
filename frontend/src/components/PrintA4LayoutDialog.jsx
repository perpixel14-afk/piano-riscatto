import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, SplitSquareVertical, SplitSquareHorizontal } from 'lucide-react';

export default function PrintA4LayoutDialog({ ticket, onClose, onChoose }) {
  if (!ticket) return null;
  const OPTIONS = [
    {
      id: 'vertical',
      title: 'Layout 1 · Verticale',
      desc: 'Un foglio A4 diviso a metà in altezza. Copia Cliente sopra, Copia Laboratorio sotto, con linea di piega e taglio orizzontale ✂',
      icon: SplitSquareVertical,
    },
    {
      id: 'horizontal',
      title: 'Layout 2 · Orizzontale',
      desc: 'A4 ruotato con due colonne affiancate. Copia Cliente a sinistra, Copia Laboratorio a destra, piega verticale centrale ✂',
      icon: SplitSquareHorizontal,
    },
  ];
  return (
    <Dialog open={!!ticket} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-300" /> Scegli il layout della Scheda A4
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {OPTIONS.map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.id}
                onClick={() => onChoose(o.id)}
                data-testid={`a4-layout-${o.id}`}
                className="text-left rounded-xl border border-slate-700 bg-slate-950/70 p-4 hover:border-cyan-500/60 transition-all hover:-translate-y-0.5"
              >
                <Icon className="w-10 h-10 text-cyan-300 mb-2" strokeWidth={1.5} />
                <div className="font-semibold text-slate-100">{o.title}</div>
                <div className="text-xs text-slate-400 mt-1">{o.desc}</div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
