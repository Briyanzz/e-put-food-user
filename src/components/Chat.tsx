"use client";
import { useEffect, useRef, useState } from "react";

export type Tab = { channel: string; label: string; off?: string };

export default function Chat({ orderId, me, tabs, closed }: { orderId: number; me: number; tabs: Tab[]; closed?: boolean }) {
  const [ch, setCh] = useState(tabs[0].channel);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const tab = tabs.find((t) => t.channel === ch)!;

  async function load() {
    if (tab.off) return setMsgs([]);
    const r = await fetch(`/api/orders/${orderId}/messages?channel=${ch}`, { cache: "no-store" });
    if (r.ok) setMsgs((await r.json()).messages);
  }
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t); }, [ch, tab.off]); // eslint-disable-line
  useEffect(() => { box.current?.scrollTo(0, box.current.scrollHeight); }, [msgs.length, ch]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setErr("");
    const r = await fetch(`/api/orders/${orderId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel: ch, body }) });
    if (!r.ok) return setErr((await r.json()).error);
    setText(""); load();
  }

  return (
    <div className="card chat">
      <h2>Percakapan pesanan</h2>
      <div className="chips" style={{ margin: "0 0 8px" }}>
        {tabs.map((t) => (<button key={t.channel} className={"chip" + (t.channel === ch ? " on" : "")} onClick={() => setCh(t.channel)}>{t.label}</button>))}
      </div>
      <div className="msgs" ref={box}>
        {tab.off ? <div className="empty">{tab.off}</div>
          : msgs.length === 0 ? <div className="empty">Belum ada pesan. Sapa {tab.label.toLowerCase()} duluan.</div>
          : msgs.map((m) => (
            <div key={m.id} className={"m" + (m.sender_id === me ? " me" : "")}>
              {m.sender_id !== me && <b>{m.name}</b>}
              <div>{m.body}</div><small>{m.at}</small>
            </div>))}
      </div>
      {err && <small className="err">{err}</small>}
      {closed ? <small className="muted">Pesanan selesai, percakapan ditutup.</small> : (
        <form onSubmit={send}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Tulis pesan…" disabled={!!tab.off} maxLength={500} />
          <button className="btn" disabled={!!tab.off}>Kirim</button>
        </form>)}
    </div>
  );
}
