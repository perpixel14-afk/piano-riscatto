import { fmtEUR, fmtDate } from '@/lib/api';

export default function LowStockPrint({ products, settings, threshold = 3 }) {
  const low = products.filter((p) => Number(p.stock || 0) <= threshold).sort((a, b) => (a.stock || 0) - (b.stock || 0));
  const toReorder = low.reduce((s, p) => s + (Number(p.cost_price) || 0) * Math.max(0, threshold + 2 - (p.stock || 0)), 0);
  return (
    <div className="print-lowstock">
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: 6 }}>
        <div>
          <div style={{ fontSize: '16pt', fontWeight: 800 }}>{settings.business_name}</div>
          <div style={{ fontSize: '9pt' }}>P.IVA {settings.vat} · {settings.address} · Tel {settings.phone}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="print-bg-black" style={{ background: '#000', color: '#fff', display: 'inline-block', padding: '2px 8px', fontSize: '9pt', letterSpacing: 1 }}>
            RIORDINO MAGAZZINO
          </div>
          <div style={{ fontSize: '9pt', marginTop: 4 }}>Data: {fmtDate(new Date().toISOString())}</div>
        </div>
      </div>

      <h2 style={{ marginTop: 10, fontSize: '14pt' }}>Prodotti Sotto Scorta (giacenza ≤ {threshold})</h2>
      <div style={{ fontSize: '9pt', color: '#444', marginBottom: 8 }}>
        {low.length} articoli da riordinare · stima spesa riordino {fmtEUR(toReorder)}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Barcode</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Prodotto</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left' }}>Categoria</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>Giacenza</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>Costo</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>Vendita</th>
          </tr>
        </thead>
        <tbody>
          {low.length === 0 && (
            <tr><td colSpan={6} style={{ border: '1px solid #000', padding: 10, textAlign: 'center' }}>Nessun prodotto sotto scorta. Magazzino OK.</td></tr>
          )}
          {low.map((p) => (
            <tr key={p.id}>
              <td style={{ border: '1px solid #000', padding: '3px 6px', fontFamily: 'JetBrains Mono, monospace' }}>{p.barcode || '—'}</td>
              <td style={{ border: '1px solid #000', padding: '3px 6px' }}>{p.name}</td>
              <td style={{ border: '1px solid #000', padding: '3px 6px', textTransform: 'capitalize' }}>{p.category}</td>
              <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right', fontWeight: 700 }}>{p.stock}</td>
              <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right' }}>{fmtEUR(p.cost_price)}</td>
              <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'right' }}>{fmtEUR(p.sale_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: '8pt' }}>
        <div>Firma Responsabile Riordino</div>
        <div>Data e Firma Fornitore</div>
      </div>
      <div style={{ marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ borderBottom: '1px solid #000', width: '48%', height: 20 }} />
        <div style={{ borderBottom: '1px solid #000', width: '48%', height: 20 }} />
      </div>
    </div>
  );
}
