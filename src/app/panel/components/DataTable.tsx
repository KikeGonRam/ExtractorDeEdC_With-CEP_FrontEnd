export type Row = {
id: number;
folio: string;
usuario: string;
departamento: string;
monto: string;
estado: "Aprobada" | "Rechazada";
fecha: string;
tipo: string;
banco: string;
};


export default function DataTable({ rows }: { rows: Row[] }) {
return (
<div className="card">
<div className="card-inner">
<div className="overflow-x-auto">
<table className="table">
<thead>
<tr>
<th className="text-left">ID</th>
<th className="text-left">Folio</th>
<th className="text-left">Usuario</th>
<th className="text-left">Departamento</th>
<th className="text-left">Monto</th>
<th className="text-left">Estado</th>
<th className="text-left">Fecha revisión</th>
<th className="text-left">Tipo</th>
<th className="text-left">Banco destino</th>
<th className="text-left">Detalle</th>
</tr>
</thead>
<tbody>
{rows.map((r) => (
<tr key={r.id}>
<td>{r.id}</td>
<td>{r.folio}</td>
<td>{r.usuario}</td>
<td className="capitalize">{r.departamento}</td>
<td>{r.monto}</td>
<td>
<span className={`badge ${r.estado === "Aprobada" ? "badge-green" : "badge-red"}`}>{r.estado}</span>
</td>
<td>{r.fecha}</td>
<td>{r.tipo}</td>
<td>{r.banco}</td>
<td><a className="text-white underline/50 hover:underline" href="#">Ver</a></td>
</tr>
))}
</tbody>
</table>
</div>
</div>
</div>
);
}