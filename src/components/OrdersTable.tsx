import Link from "next/link";
import { jam, rp, STATUS } from "@/lib/util";

export default function OrdersTable({ rows, base, empty }: { rows: any[]; base: string; empty: string }) {
  if (!rows.length) return <div className="empty">{empty}</div>;
  return (
    <table>
      <thead><tr><th>Pesanan</th><th>{base === "/pesanan" ? "Resto" : "Pelanggan"}</th><th>Total</th><th>Jam</th><th>Status</th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.id}>
          <td><Link href={`${base}/${r.id}`} className="b">#{r.code}</Link></td>
          <td>{base === "/pesanan" ? r.resto_name : r.user_name}</td><td>{rp(r.total)}</td><td>{jam(r.created_at)}</td>
          <td><span className={"badge" + (r.status === "rejected" ? " r" : r.status === "done" ? " g" : "")}>{STATUS[r.status]}</span></td>
        </tr>))}
      </tbody>
    </table>
  );
}
