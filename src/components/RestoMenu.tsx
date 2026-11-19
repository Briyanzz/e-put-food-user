"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FEES, rp } from "@/lib/util";

type P = { id: number; name: string; category: string; price: number; description: string | null; emoji: string };

export default function RestoMenu({ restoId, restoName, products, address }: { restoId: number; restoName: string; products: P[]; address: string }) {
  const r = useRouter();
  const [qty, setQty] = useState<Record<number, number>>({});
  const [cat, setCat] = useState("Semua"), [query, setQuery] = useState("");
  const [voucher, setVoucher] = useState(""), [applied, setApplied] = useState(false);
  const [note, setNote] = useState(""), [addr, setAddr] = useState(address), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const cats = ["Semua", ...Array.from(new Set(products.map((p) => p.category)))];
  const shown = products.filter((p) => (cat === "Semua" || p.category === cat) && p.name.toLowerCase().includes(query.toLowerCase()));
  const lines = products.filter((p) => qty[p.id] > 0);
  const subtotal = lines.reduce((a, p) => a + p.price * qty[p.id], 0);
  const disc = applied ? Math.min(FEES.voucher[voucher.toUpperCase()] || 0, subtotal) : 0;
  const total = subtotal + (lines.length ? FEES.shipping + FEES.service : 0) - disc;
  const add = (id: number, d: number) => setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) + d) }));

  async function order() {
    setBusy(true); setErr("");
    const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ restoId, items: lines.map((p) => ({ id: p.id, qty: qty[p.id] })), note, address: addr, voucher: applied ? voucher : "" }) });
    const d = await res.json(); setBusy(false);
    res.ok ? r.push(d.redirect) : setErr(d.error);
  }

  return (
    <div className="split">
      <div>
        <input placeholder={`Cari menu ${restoName}…`} value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="chips">{cats.map((c) => (<button key={c} className={"chip" + (c === cat ? " on" : "")} onClick={() => setCat(c)}>{c}</button>))}</div>
        <h2>Menu {restoName}</h2>
        <div className="g2">
          {shown.map((p) => (
            <div key={p.id} className="card" style={qty[p.id] > 0 ? { borderColor: "var(--or)" } : undefined}>
              <div className="tile">{p.emoji}</div>
              <h3>{p.name}</h3><small>{p.description}</small>
              <div className="row mt"><b className="grow">{rp(p.price)}</b>
                {qty[p.id] > 0 ? (<span className="row"><button className="btn sm ghost" onClick={() => add(p.id, -1)} aria-label="Kurangi">−</button><b>{qty[p.id]}</b><button className="btn sm ghost" onClick={() => add(p.id, 1)} aria-label="Tambah">+</button></span>)
                  : (<button className="btn sm ghost" onClick={() => add(p.id, 1)}>+ Tambah</button>)}
              </div>
            </div>))}
          {!shown.length && <div className="empty">Tidak ada menu yang cocok.</div>}
        </div>
      </div>
      <aside className="card" style={{ position: "sticky", top: 80 }}>
        <div className="row"><h2 className="grow">Keranjangmu</h2><span className="or">{lines.reduce((a, p) => a + qty[p.id], 0)} item</span></div>
        {!lines.length ? <div className="empty">Belum ada item. Pilih menu di sebelah kiri.</div> : (<>
          <div className="sum">{lines.map((p) => (<div key={p.id}><span>{qty[p.id]} × {p.name}</span><span>{rp(p.price * qty[p.id])}</span></div>))}</div>
          <label>Catatan untuk resto</label><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sambal dipisah, ya." />
          <label>Alamat pengantaran</label><textarea rows={2} value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Jl. Cihapit No. 18, Bandung" />
          <label>Voucher</label>
          <div className="row"><input value={voucher} onChange={(e) => { setVoucher(e.target.value); setApplied(false); }} placeholder="HANGAT10" /><button className="btn ghost sm" onClick={() => setApplied(!!FEES.voucher[voucher.toUpperCase()])}>Pakai</button></div>
          {applied && <small className="ok">Voucher berhasil dipakai.</small>}
          {voucher && !applied && <small className="muted">Coba kode HANGAT10.</small>}
          <div className="sum mt">
            <div><span>Subtotal menu</span><span>{rp(subtotal)}</span></div><div><span>Ongkos kirim</span><span>{rp(FEES.shipping)}</span></div>
            <div><span>Biaya layanan</span><span>{rp(FEES.service)}</span></div>{disc > 0 && <div><span>Potongan voucher</span><span>−{rp(disc)}</span></div>}
            <div className="tot"><span>Total</span><span>{rp(total)}</span></div>
          </div>
          <button className="btn full mt" disabled={busy} onClick={order}>Pesan & bayar {rp(total)}</button>
          <small className="muted">Pembayaran QRIS (simulasi). Pesanan diproses setelah resto menerima.</small>
          {err && <small className="err">{err}</small>}
        </>)}
      </aside>
    </div>
  );
}
