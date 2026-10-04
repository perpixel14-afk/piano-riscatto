import { QRCodeSVG } from 'qrcode.react';

export function LabelStandard({ ticket, settings }) {
  const trackUrl = `${window.location.origin}/?track=${ticket.code}`;
  return (
    <div className="print-label-std">
      <QRCodeSVG value={trackUrl} size={100} level="M" />
      <div style={{ fontSize: '7pt', lineHeight: 1.25, flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: '10pt', letterSpacing: 0.5 }}>{ticket.code}</div>
        <div style={{ fontWeight: 700, fontSize: '7.5pt' }}>{ticket.customer_name}</div>
        <div>{ticket.customer_phone}</div>
        <div style={{ fontWeight: 700 }}>{ticket.device_brand} {ticket.device_model}</div>
        {ticket.device_color && <div>{ticket.device_color}</div>}
        {ticket.pin && <div>PIN: <b>{ticket.pin}</b></div>}
      </div>
    </div>
  );
}

export function LabelMini({ ticket }) {
  const trackUrl = `${window.location.origin}/?track=${ticket.code}`;
  return (
    <div className="print-label-mini">
      <QRCodeSVG value={trackUrl} size={64} level="M" />
      <div style={{ fontSize: '6.5pt', lineHeight: 1.2, flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: '9pt' }}>{ticket.code}</div>
        <div style={{ fontWeight: 700 }}>{ticket.device_brand} {ticket.device_model}</div>
        <div>{ticket.customer_name}</div>
        {ticket.pin && <div>PIN {ticket.pin}</div>}
      </div>
    </div>
  );
}

export function LabelBanco({ ticket, settings }) {
  const trackUrl = `${window.location.origin}/?track=${ticket.code}`;
  return (
    <div className="print-label-banco">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #000', paddingBottom: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '9pt', textTransform: 'uppercase' }}>Banco Lab</div>
        <div style={{ fontWeight: 800, fontSize: '10pt' }}>{ticket.code}</div>
      </div>
      <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
        <QRCodeSVG value={trackUrl} size={80} level="M" />
        <div style={{ fontSize: '7pt', lineHeight: 1.25, flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{ticket.customer_name}</div>
          <div>{ticket.customer_phone}</div>
          <div style={{ fontWeight: 700, marginTop: 1 }}>{ticket.device_brand} {ticket.device_model}</div>
          {ticket.pin && <div>PIN: <b>{ticket.pin}</b></div>}
          {ticket.pattern && <div>Pattern: {ticket.pattern}</div>}
        </div>
      </div>
      <div style={{ marginTop: 2, borderTop: '1px dashed #000', paddingTop: 2 }}>
        <div style={{ fontSize: '6.5pt', textTransform: 'uppercase', fontWeight: 700 }}>Difetto</div>
        <div style={{ fontSize: '10pt', fontWeight: 800, lineHeight: 1.1 }}>{ticket.issue}</div>
      </div>
    </div>
  );
}

export default function PrintLabel({ ticket, settings, layout = 'std' }) {
  if (layout === 'mini') return <LabelMini ticket={ticket} settings={settings} />;
  if (layout === 'banco') return <LabelBanco ticket={ticket} settings={settings} />;
  return <LabelStandard ticket={ticket} settings={settings} />;
}
