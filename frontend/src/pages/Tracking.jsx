import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_BASE, fmtEUR, fmtDate, STATUS_LABELS, STATUS_FLOW } from '@/lib/api';
import { CheckCircle2, Circle, Loader2, Zap, Phone, MapPin, AlertTriangle, Send, Camera, MessageSquare } from 'lucide-react';

export default function Tracking({ code }) {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState({ business_name: 'EDS PIXEL', phone: '', address: '', platform_name: 'Pixel Lab' });
  const [error, setError] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const loadTicket = () => axios.get(`${API_BASE}/public/track/${encodeURIComponent(code)}`).then((r) => setData(r.data)).catch((e) => setError(e?.response?.data?.detail || 'Codice non trovato'));
  const loadMsgs = () => axios.get(`${API_BASE}/public/track/${encodeURIComponent(code)}/messages`).then((r) => setMsgs(r.data)).catch(() => {});

  useEffect(() => {
    loadTicket();
    axios.get(`${API_BASE}/public/settings`).then((r) => setSettings(r.data)).catch(() => {});
    loadMsgs();
    const t = setInterval(() => { loadTicket(); loadMsgs(); }, 7000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [code]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const { data: m } = await axios.post(`${API_BASE}/public/track/${encodeURIComponent(code)}/messages`, {
        text: text.trim(),
        author: data?.customer_name || 'Cliente',
      });
      setMsgs((p) => [...p, m]);
      setText('');
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  const currentIdx = data ? STATUS_FLOW.indexOf(data.status) : -1;

  return (
    <div className="min-h-screen bg-[#0b132b] eds-noise text-slate-100 p-4 sm:p-6"
      style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(6,182,212,0.15), transparent 50%)' }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Zap className="w-6 h-6 text-slate-900" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400">
              Live Tracking · Style Spedizione
            </div>
            <div className="font-extrabold text-lg">{settings.business_name}</div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-6 flex items-center gap-3" data-testid="track-not-found">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <div className="font-semibold">Pratica non trovata</div>
              <div className="text-sm text-slate-400">Verifica il codice ricevuto in scheda: <span className="font-mono-eds text-cyan-300">{code}</span></div>
            </div>
          </div>
        )}

        {data && (
          <>
            <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 p-6 eds-glow" data-testid="track-card">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400">Codice Pratica</div>
                  <div className="font-extrabold text-2xl font-mono-eds mt-1">{data.code}</div>
                </div>
                <span className="rounded-full border border-cyan-400/60 bg-cyan-500/20 text-cyan-300 text-xs px-3 py-1">
                  {STATUS_LABELS[data.status]}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Cliente</div>
                  <div className="font-medium">{data.customer_name}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Dispositivo</div>
                  <div className="font-medium">{data.device_brand} {data.device_model}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-500">Difetto</div>
                  <div className="text-slate-200">{data.issue}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Preventivo</div>
                  <div className="font-mono-eds text-cyan-300 font-bold">{fmtEUR(data.estimate)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Acconto</div>
                  <div className="font-mono-eds text-slate-200">{fmtEUR(data.deposit)}</div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400 mb-4">
                Stato Avanzamento · Live
              </div>
              <ol className="space-y-4">
                {STATUS_FLOW.map((s, idx) => {
                  const done = idx <= currentIdx;
                  const active = idx === currentIdx;
                  return (
                    <li key={s} className="flex gap-3 items-start" data-testid={`timeline-${s}`}>
                      <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center border ${
                        done ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-slate-700 text-slate-500'
                      } ${active ? 'eds-pulse' : ''}`}>
                        {done ? <CheckCircle2 className="w-4 h-4" /> : active ? <Loader2 className="w-4 h-4 animate-spin" /> : <Circle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold ${done ? 'text-slate-100' : 'text-slate-500'}`}>{STATUS_LABELS[s]}</div>
                        {data.history?.filter((h) => h.status === s).slice(-1).map((h, i) => (
                          <div key={i} className="text-xs text-slate-500 mt-0.5">
                            {fmtDate(h.at)}{h.note ? ` · ${h.note}` : ''}
                          </div>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Lab photos (only lab-sent) */}
            {msgs.some((m) => m.photo_data) && (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400 mb-3 flex items-center gap-1">
                  <Camera className="w-3 h-3" /> Foto dal Laboratorio
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {msgs.filter((m) => m.photo_data).map((m) => (
                    <a key={m.id} href={m.photo_data} target="_blank" rel="noreferrer" className="block">
                      <img src={m.photo_data} alt="foto laboratorio" className="rounded-lg border border-slate-700 w-full h-32 object-cover hover:border-cyan-500/60 transition-colors" />
                      <div className="text-[10px] text-slate-500 mt-1">{fmtDate(m.created_at)}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Chat */}
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col max-h-[70vh]">
              <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400 mb-3 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Chat Live col Laboratorio
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 max-h-80 pr-1" data-testid="public-chat">
                {msgs.length === 0 && (
                  <div className="text-center text-xs text-slate-500 py-4">Scrivi al laboratorio per richiedere info sulla tua riparazione.</div>
                )}
                {msgs.map((m) => {
                  const isLab = m.role === 'lab';
                  return (
                    <div key={m.id} className={`flex ${isLab ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        isLab ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-50 rounded-tl-sm' : 'bg-slate-800 border border-slate-700 rounded-tr-sm'
                      }`}>
                        <div className="text-[10px] font-mono-eds opacity-70 mb-0.5">
                          {isLab ? 'Laboratorio' : (m.author || 'Tu')} · {new Date(m.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {m.photo_data && <img src={m.photo_data} alt="foto" className="rounded-lg max-h-60 mb-1" />}
                        {m.text && <div className="whitespace-pre-wrap">{m.text}</div>}
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              <form onSubmit={send} className="mt-3 flex items-center gap-2 border-t border-slate-800 pt-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Scrivi al laboratorio…"
                  data-testid="public-chat-input"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  data-testid="public-chat-send"
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg px-3 py-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Contact */}
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300 space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-cyan-400" />
                <a href={`tel:${settings.phone}`} className="hover:text-cyan-300" data-testid="track-call">{settings.phone}</a>
              </div>
              {settings.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span>{settings.address}</span>
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-8 text-center text-xs text-slate-600 font-mono-eds">
          {settings.platform_name || 'Pixel Lab'} · EDS PIXEL Workshop
        </div>
      </div>
    </div>
  );
}
