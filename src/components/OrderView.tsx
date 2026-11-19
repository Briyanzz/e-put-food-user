import Act from "./Act";
import AutoRefresh from "./AutoRefresh";
import Chat, { Tab } from "./Chat";
import MapMock from "./MapMock";
import { RatingForm, ComplaintForm, RejectBox } from "./Forms";
import { q, q1 } from "@/lib/db";
import type { Session } from "@/lib/auth";
import { FEES, jam, RANK, rp, STATUS, tgl, TITLE } from "@/lib/util";

const STEPS: [string, string][] = [["Pesanan diterima", "preparing"], ["Makanan disiapkan", "ready"], ["Dalam pengantaran", "delivering"], ["Tiba di tujuan", "arrived"]];
const PROGRESS: Record<string, number> = { pending: 0, preparing: 0, ready: 0, delivering: 0.55, arrived: 1, done: 1, rejected: 0 };

/** Detail pesanan untuk user, pemilik resto, dan kurir. Chat selalu di kolom kiri. */
export default async function OrderView({ o, s }: { o: any; s: Session }) {
  const [items, evs, rating, complaint] = await Promise.all([
    q("SELECT * FROM order_items WHERE order_id=$1 ORDER BY id", [o.id]),
    q("SELECT status, created_at FROM order_events WHERE order_id=$1 ORDER BY id", [o.id]),
    q1("SELECT * FROM ratings WHERE order_id=$1", [o.id]),
    q1("SELECT * FROM complaints WHERE order_id=$1 ORDER BY id DESC LIMIT 1", [o.id]),
  ]);
  const timeOf = (st: string) => { const e = evs.find((x) => x.status === st); return e ? jam(e.created_at) : ""; };
  const rk = RANK[o.status];
  const noKurir = "Kurir belum ditugaskan. Chat terbuka setelah kurir menerima pesanan.";
  const tabs: Tab[] =
    s.role === "user" ? [{ channel: "user-kurir", label: "Kurir", off: o.kurir_id ? undefined : noKurir }, { channel: "user-resto", label: "Pemilik resto" }]
    : s.role === "resto" ? [{ channel: "user-resto", label: "Pelanggan" }, { channel: "resto-kurir", label: "Kurir", off: o.kurir_id ? undefined : noKurir }]
    : [{ channel: "user-kurir", label: "Pelanggan" }, { channel: "resto-kurir", label: "Pemilik resto" }];
  const finished = o.status === "done" || o.status === "rejected";
  const kd = o.kurir_details || {};
  const act = (action: string, label: string) => (<Act url={`/api/orders/${o.id}`} body={{ action }}>{label}</Act>);

  return (
    <div className="ov">
      {!finished && <AutoRefresh ms={6000} />}
      <div className="chatcol">{o.status === "rejected" ? <div className="card empty">Pesanan ditolak, tidak ada percakapan.</div> : <Chat orderId={o.id} me={s.id} tabs={tabs} closed={o.status === "done"} />}</div>

      <div className="stack">
        <div className="row wrap2">
          <div className="grow">
            <div className="eyebrow">Pesanan #{o.code}</div>
            <h1>{TITLE[o.status]}</h1>
            <small>{tgl(o.created_at)} • {jam(o.created_at)} WIB • {o.resto_name} → {o.user_name}</small>
          </div>
          <span className={"badge" + (o.status === "rejected" ? " r" : o.status === "done" ? " g" : "")}>{STATUS[o.status]}</span>
        </div>

        {o.status === "rejected" ? (
          <div className="card or"><b>Pesanan ditolak resto.</b><p className="muted">Alasan: {o.reject_reason || "-"}</p></div>
        ) : (
          <div className="card">
            <h2>Lacak pengantaran</h2>
            <MapMock from={o.resto_name} to={s.role === "user" ? "Rumahmu" : o.user_name} progress={PROGRESS[o.status]} />
            <div className="g2 mt">
              <div><small>Pelanggan</small><br /><b>{o.user_name}</b><br /><small>{o.address}</small></div>
              <div><small>Kurir</small><br />{o.kurir_id ? <><b>{o.kurir_name}</b><br /><small>{kd.vehicle} • {kd.plate}</small></> : <small>Belum ada kurir. Mencari kurir terdekat…</small>}</div>
            </div>
          </div>
        )}

        <div className="g2">
          <div className="card">
            <h2>Perjalanan pesanan</h2>
            <ol className="steps">
              {STEPS.map(([label, st], i) => {
                const now = rk === RANK[st];
                const done = rk > RANK[st];
                return (<li key={st} className={now ? "now" : done ? "done" : ""}><i>{done ? "✓" : ""}</i><div>{label}<br /><small>{timeOf(st) ? timeOf(st) + " WIB" : ""}</small></div></li>);
              })}
            </ol>
            {rk === 0 && <small className="muted">Menunggu konfirmasi resto.</small>}
          </div>
          <div className="card sum">
            <h2>Ringkasan pembayaran</h2>
            {items.map((i) => (<div key={i.id}><span>{i.qty} × {i.name}</span><span>{rp(i.price * i.qty)}</span></div>))}
            <div><span>Ongkos kirim</span><span>{rp(o.shipping)}</span></div>
            <div><span>Biaya layanan</span><span>{rp(o.service_fee)}</span></div>
            {o.discount > 0 && <div><span>Voucher</span><span>−{rp(o.discount)}</span></div>}
            <div className="tot"><span>Total</span><span>{rp(o.total)}</span></div>
            <span className="badge g" style={{ marginTop: 8 }}>Lunas • {o.payment}</span>
          </div>
        </div>

        {o.note && <div className="card or"><b>Catatan pelanggan:</b> {o.note}</div>}

        {s.role === "resto" && o.status === "pending" && (<div className="card"><h2>Konfirmasi pesanan</h2><RejectBox orderId={o.id} /></div>)}
        {s.role === "resto" && o.status === "preparing" && (<div className="card"><h2>Makanan sudah selesai dimasak?</h2>{act("ready", "Tandai siap diambil kurir")}</div>)}

        {s.role === "kurir" && (
          <div className="card">
            <h2>Perbarui pengantaran</h2>
            <p className="muted">Pendapatanmu dari pesanan ini: <b>{rp(o.shipping)}</b></p>
            {o.status === "preparing" && <small>Resto masih menyiapkan makanan. Tombol ambil aktif setelah ditandai siap.</small>}
            {o.status === "ready" && act("pickup", "Ambil pesanan dari resto")}
            {o.status === "delivering" && act("arrive", "Tandai tiba di tujuan")}
            {o.status === "arrived" && act("done", "Selesaikan pengantaran")}
            {o.status === "done" && <span className="badge g">Pengantaran selesai</span>}
          </div>
        )}

        {s.role === "user" && o.status === "done" && (rating
          ? <div className="card"><h2>Terima kasih atas ulasanmu</h2><p>Makanan {"★".repeat(rating.food)} • Kurir {"★".repeat(rating.courier)}</p>{rating.comment && <p className="muted">“{rating.comment}”</p>}</div>
          : <RatingForm orderId={o.id} />)}
        {s.role === "user" && o.status === "done" && (complaint
          ? <div className="card or"><b>Komplain: {complaint.title}</b><p className="muted">Status: {complaint.status === "open" ? "sedang ditinjau admin" : complaint.status === "refunded" ? "refund disetujui" : "klaim ditolak"}</p></div>
          : <ComplaintForm orderId={o.id} />)}
      </div>
    </div>
  );
}
