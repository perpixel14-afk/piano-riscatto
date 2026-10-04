import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';

const OPTIONS = [
  {
    id: 'std',
    name: 'Standard Pieno Adesivo',
    size: '57 × 32 mm',
    desc: 'QR grande + dati cliente + PIN',
    preview: (t) => (
      <div className="flex gap-2 items-center bg-white text-black rounded p-2 h-full w-full font-mono-eds">
        <QRCodeSVG value={t.code} size={60} />
        <div className="text-[10px] leading-tight">
          <div className="font-bold text-xs">{t.code}</div>
          <div>{t.customer_name}</div>
          <div className="font-bold">{t.device_brand} {t.device_model}</div>
          <div>PIN {t.pin}</div>
        </div>
      </div>
    ),
  },
  {
    id: 'mini',
    name: 'Mini Nastro Stretto',
    size: '60 × 20 mm',
    desc: 'QR affiancato e testo compatto',
    preview: (t) => (
      <div className="flex gap-1.5 items-center bg-white text-black rounded p-1.5 h-full w-full font-mono-eds">
        <QRCodeSVG value={t.code} size={44} />
        <div className="text-[8.5px] leading-tight">
          <div className="font-bold text-[10px]">{t.code}</div>
          <div className="font-semibold">{t.device_brand} {t.device_model}</div>
          <div>{t.customer_name}</div>
        </div>
      </div>
    ),
  },
  {
    id: 'banco',
    name: 'Banco Laboratorio',
    size: '70 × 50 mm',
    desc: 'Bordo evidenziato e difetto grande',
    preview: (t) => (
      <div className="bg-white text-black rounded p-1.5 h-full w-full font-mono-eds border-2 border-black">
        <div className="flex justify-between items-start border-b border-black pb-0.5">
          <div className="font-bold text-[9px] uppercase">Banco Lab</div>
          <div className="font-bold text-[10px]">{t.code}</div>
        </div>
        <div className="flex gap-1 mt-1">
          <QRCodeSVG value={t.code} size={40} />
          <div className="text-[7px] leading-tight">
            <div className="font-bold">{t.customer_name}</div>
            <div>{t.device_brand} {t.device_model}</div>
            <div>PIN {t.pin}</div>
          </div>
        </div>
        <div className="mt-1 border-t border-dashed border-black pt-0.5">
          <div className="text-[7px] uppercase font-bold">Difetto</div>
          <div className="text-[10px] font-extrabold leading-tight">{t.issue}</div>
        </div>
      </div>
    ),
  },
];

export default function LabelLayoutDialog({ ticket, onClose, onChoose }) {
  if (!ticket) return null;
  return (
    <Dialog open={!!ticket} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-3xl">
        <DialogHeader>
          <DialogTitle>Scegli il layout dell'etichetta termica</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => onChoose(o.id)}
              data-testid={`label-layout-${o.id}`}
              className="group text-left rounded-xl border border-slate-700 bg-slate-950/70 p-3 hover:border-cyan-500/60 transition-all hover:-translate-y-0.5"
            >
              <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400">
                Layout {o.id === 'std' ? '1' : o.id === 'mini' ? '2' : '3'}
              </div>
              <div className="font-semibold mt-0.5">{o.name}</div>
              <div className="text-xs text-slate-400">{o.size}</div>
              <div className="mt-3 h-24 rounded-md overflow-hidden flex items-center justify-center bg-slate-800/50 p-2">
                {o.preview(ticket)}
              </div>
              <div className="text-xs text-slate-500 mt-2">{o.desc}</div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
