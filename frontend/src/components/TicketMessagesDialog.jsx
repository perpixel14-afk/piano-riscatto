import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Camera, MessageSquare, Send, X } from 'lucide-react';

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function TicketMessagesDialog({ ticket, onClose }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const endRef = useRef(null);

  const load = async () => {
    if (!ticket) return;
    try {
      const { data } = await api.get(`/tickets/${ticket.id}/messages`);
      setMsgs(data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!ticket) return;
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [ticket?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  if (!ticket) return null;

  const send = async (payload) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/tickets/${ticket.id}/messages`, payload);
      setMsgs((p) => [...p, data]);
      setText('');
      toast.success('Messaggio inviato al cliente');
    } catch {
      toast.error('Errore invio');
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      toast.error('Immagine troppo grande (max 4MB)');
      return;
    }
    const dataUrl = await fileToDataURL(f);
    await send({ text: text || '', photo_data: dataUrl });
    if (fileRef.current) fileRef.current.value = '';
  };

  const onSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await send({ text: text.trim() });
  };

  return (
    <Dialog open={!!ticket} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-300" /> Chat Laboratorio ↔ Cliente · {ticket.code}
          </DialogTitle>
          <div className="text-xs text-slate-400">
            {ticket.customer_name} · {ticket.device_brand} {ticket.device_model}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1" data-testid="chat-feed">
          {msgs.length === 0 && (
            <div className="text-center text-sm text-slate-500 py-6">Nessun messaggio ancora. Scrivi al cliente o invia una foto del dispositivo/ricambio.</div>
          )}
          {msgs.map((m) => {
            const isLab = m.role === 'lab';
            return (
              <div key={m.id} className={`flex ${isLab ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${isLab ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-50 rounded-tr-sm' : 'bg-slate-800 border border-slate-700 rounded-tl-sm'}`}>
                  <div className="text-[10px] font-mono-eds opacity-70 mb-0.5">
                    {isLab ? 'Laboratorio' : m.author || 'Cliente'} · {new Date(m.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {m.photo_data && (
                    <img src={m.photo_data} alt="foto" className="rounded-lg max-h-60 mb-1 border border-slate-700" />
                  )}
                  {m.text && <div className="text-sm whitespace-pre-wrap">{m.text}</div>}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <form onSubmit={onSend} className="flex items-center gap-2 border-t border-slate-800 pt-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            data-testid="chat-file-input"
            onChange={onFile}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            data-testid="chat-upload-photo"
            className="border-slate-700 shrink-0"
            disabled={busy}
          >
            <Camera className="w-4 h-4" />
          </Button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Scrivi un messaggio al cliente…"
            data-testid="chat-text-input"
            className="bg-slate-950 border-slate-700"
          />
          <Button
            type="submit"
            disabled={busy || !text.trim()}
            data-testid="chat-send"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
