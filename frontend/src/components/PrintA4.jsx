import { QRCodeSVG } from 'qrcode.react';
import { fmtEUR, fmtDate } from '@/lib/api';

const CHECKLIST = [
  'Accensione',
  'Display / LCD',
  'Touch',
  'Ricarica & USB',
  'Fotocamera Posteriore',
  'Fotocamera Frontale',
  'Audio Ricevitore',
  'Audio Speaker',
  'Microfono',
  'Vibrazione',
  'Face/Touch ID',
  'Wi-Fi / Rete',
];

function Header({ ticket, settings, label, compact }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: 3, marginBottom: 5 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: compact ? '12pt' : '13pt', lineHeight: 1.1 }}>{settings.business_name}</div>
        <div style={{ fontSize: '7.5pt' }}>P.IVA {settings.vat} · {settings.address}</div>
        <div style={{ fontSize: '7.5pt' }}>Tel/WhatsApp {settings.phone} · {settings.email}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="print-bg-black" style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: 1.2, background: '#000', color: '#fff', padding: '1px 5px', display: 'inline-block' }}>
          {label}
        </div>
        <div style={{ fontWeight: 800, fontSize: '12pt', marginTop: 2 }}>{ticket.code}</div>
        <div style={{ fontSize: '7pt' }}>{fmtDate(ticket.created_at)}</div>
      </div>
    </div>
  );
}

function ClientSection({ ticket, settings }) {
  const trackUrl = `${window.location.origin}/?track=${ticket.code}`;
  const saldo = Math.max(0, (ticket.estimate || 0) - (ticket.deposit || 0));
  return (
    <>
      <Header ticket={ticket} settings={settings} label="COPIA CLIENTE" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '8.5pt', lineHeight: 1.25 }}>
        <div>
          <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '7.5pt' }}>Cliente</div>
          <div><b>{ticket.customer_name}</b></div>
          <div>{ticket.customer_phone}</div>
          {ticket.customer_email && <div>{ticket.customer_email}</div>}
        </div>
        <div>
          <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '7.5pt' }}>Dispositivo</div>
          <div><b>{ticket.device_brand} {ticket.device_model}</b></div>
          {ticket.device_color && <div>Colore: {ticket.device_color}</div>}
          {ticket.imei && <div>IMEI: {ticket.imei}</div>}
        </div>
      </div>

      <div style={{ marginTop: 4, fontSize: '8.5pt' }}>
        <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '7.5pt' }}>Difetto segnalato</div>
        <div>{ticket.issue}</div>
      </div>
      {ticket.accessories && (
        <div style={{ fontSize: '8pt', marginTop: 2 }}>
          <b style={{ textTransform: 'uppercase' }}>Accessori:</b> {ticket.accessories}
        </div>
      )}
      {ticket.conditions && (
        <div style={{ fontSize: '8pt' }}>
          <b style={{ textTransform: 'uppercase' }}>Condizioni:</b> {ticket.conditions}
        </div>
      )}

      <div style={{ marginTop: 5, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: '8.5pt' }}>
          <tbody>
            <tr><td style={{ border: '1px solid #000', padding: '2px 4px' }}>Preventivo</td><td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 700 }}>{fmtEUR(ticket.estimate)}</td></tr>
            <tr><td style={{ border: '1px solid #000', padding: '2px 4px' }}>Acconto versato</td><td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 700 }}>{fmtEUR(ticket.deposit)}</td></tr>
            <tr><td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 800 }}>Saldo al ritiro</td><td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 800 }}>{fmtEUR(saldo)}</td></tr>
          </tbody>
        </table>
        <div style={{ textAlign: 'center' }}>
          <QRCodeSVG value={trackUrl} size={60} level="M" />
          <div style={{ fontSize: '6pt', marginTop: 1 }}>Traccia online</div>
        </div>
      </div>

      <div style={{ marginTop: 4, fontSize: '7pt', lineHeight: 1.2 }}>
        <div style={{ fontWeight: 700, fontSize: '7.5pt', textTransform: 'uppercase' }}>Condizioni di Garanzia 90 giorni</div>
        <div>{settings.warranty_terms || 'Garanzia 90 giorni sul lavoro svolto e sui componenti sostituiti dalla data di consegna. Decade in caso di nuovi urti, contatto con liquidi, manomissione del sigillo o rimozione pellicola di garanzia.'}</div>
        {settings.conditions && <div style={{ marginTop: 2 }}>{settings.conditions}</div>}
      </div>

      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7pt', textTransform: 'uppercase', fontWeight: 700 }}>Firma Cliente per accettazione</div>
          <div style={{ borderBottom: '1px solid #000', height: 22 }} />
        </div>
        <div style={{ width: 100, textAlign: 'center' }}>
          <div style={{ fontSize: '7pt' }}>Data</div>
          <div style={{ borderBottom: '1px solid #000', height: 18 }} />
        </div>
      </div>
    </>
  );
}

function LabSection({ ticket, settings }) {
  const utile = Math.max(0, (ticket.estimate || 0) - (ticket.part_cost || 0));
  return (
    <>
      <Header ticket={ticket} settings={settings} label="COPIA LABORATORIO" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '8.5pt', lineHeight: 1.25 }}>
        <div>
          <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '7.5pt' }}>Cliente</div>
          <div>{ticket.customer_name} — {ticket.customer_phone}</div>
          <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '7.5pt', marginTop: 2 }}>Dispositivo</div>
          <div>{ticket.device_brand} {ticket.device_model} {ticket.device_color && `(${ticket.device_color})`}</div>
          {ticket.imei && <div>IMEI: {ticket.imei}</div>}
        </div>
        <div className="print-bg-black" style={{ background: '#000', color: '#fff', padding: 4, borderRadius: 3 }}>
          <div style={{ fontSize: '7pt', textTransform: 'uppercase', letterSpacing: 2 }}>Sblocco</div>
          <div style={{ fontSize: '14pt', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>PIN: {ticket.pin || '—'}</div>
          {ticket.pattern && <div style={{ fontSize: '7.5pt' }}>Pattern/Pwd: {ticket.pattern}</div>}
        </div>
      </div>

      <div style={{ marginTop: 3 }}>
        <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '7.5pt' }}>Difetto</div>
        <div style={{ fontWeight: 700, fontSize: '10pt' }}>{ticket.issue}</div>
      </div>

      <div style={{ marginTop: 3 }}>
        <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '7.5pt', marginBottom: 2 }}>Checklist Collaudo Banco</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px 8px', fontSize: '8pt' }}>
          {CHECKLIST.map((x) => (
            <div key={x} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ display: 'inline-block', width: 9, height: 9, border: '1px solid #000' }} />
              {x}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 3, fontSize: '8pt' }}>
        <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '7.5pt' }}>Economia Interna</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
          <tbody>
            <tr><td style={{ border: '1px solid #000', padding: '2px 4px' }}>Preventivo cliente</td><td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>{fmtEUR(ticket.estimate)}</td><td style={{ border: '1px solid #000', padding: '2px 4px' }}>Costo ricambio</td><td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>{fmtEUR(ticket.part_cost)}</td><td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 700 }}>Utile netto</td><td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 800 }}>{fmtEUR(utile)}</td></tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 3, fontSize: '8pt' }}>
        <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '7.5pt' }}>Note tecniche</div>
        <div style={{ borderBottom: '1px dotted #000', minHeight: 12 }}>{ticket.notes || ''}</div>
        <div style={{ borderBottom: '1px dotted #000', minHeight: 12, marginTop: 2 }} />
      </div>

      <div style={{ marginTop: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '7pt', textTransform: 'uppercase', fontWeight: 700 }}>Firma Tecnico</div>
          <div style={{ borderBottom: '1px solid #000', height: 18 }} />
        </div>
        <div style={{ width: 100, textAlign: 'center' }}>
          <div style={{ fontSize: '7pt' }}>Data chiusura</div>
          <div style={{ borderBottom: '1px solid #000', height: 18 }} />
        </div>
      </div>
    </>
  );
}

export default function PrintA4({ ticket, settings, layout = 'vertical' }) {
  if (layout === 'horizontal') {
    return (
      <div className="print-a4-horizontal">
        <div className="print-a4-half-h"><ClientSection ticket={ticket} settings={settings} /></div>
        <div className="print-a4-divider-v">✂ Piega qui ✂</div>
        <div className="print-a4-half-h"><LabSection ticket={ticket} settings={settings} /></div>
      </div>
    );
  }
  return (
    <div className="print-a4">
      <div className="print-a4-half"><ClientSection ticket={ticket} settings={settings} /></div>
      <div className="print-a4-divider">
        ✂ — — — — — — — Piega e Taglia qui — — — — — — — ✂
      </div>
      <div className="print-a4-half"><LabSection ticket={ticket} settings={settings} /></div>
    </div>
  );
}
