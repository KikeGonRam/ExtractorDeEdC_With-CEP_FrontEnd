'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  History as HistoryIcon,
  Loader2,
  Search,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/* =============== API BASE CORRECTO =============== */
const runtimeApiBase = () => {
  const env = process.env.NEXT_PUBLIC_API_BASE;
  if (env && env.trim()) return env.trim();
  // Usar proxy HTTPS de Nginx para evitar Mixed Content
  return '/extractor-api';
};
const API_BASE = runtimeApiBase();
/* ================================================ */

type Extraccion = {
  id: number;
  solicitado_en: string | null;
  archivo_nombre: string | null;
  archivo_tamano: number | null;
  archivo_sha256: string | null;
  banco: string;
  empresa: string | null;
  resultado: 'xlsx' | 'zip' | string;
  estado: 'ok' | 'fail' | 'processing' | string;
  error: string | null;
};

type ExtraccionesResponse = {
  total: number;
  page: number;
  page_size: number;
  items: Extraccion[];
};

const clsx = (...p: Array<string | false | undefined>) => p.filter(Boolean).join(' ');
const fmtDate = (d?: string | null) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d!;
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(dt);
};
const estadoTexto = (s: string) => (s === 'ok' ? 'Completada' : s === 'processing' ? 'En proceso' : 'Error');
const estadoClase = (s: string) =>
  s === 'ok'
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    : s === 'processing'
    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
const salidaTexto = (r: string) => (r === 'zip' ? 'Excel + CEP' : 'Excel');

/* ==================== COMPONENTE ==================== */
export default function HistorialPage() {
  // Filtros (controlan el filtrado local)
  const [q, setQ] = useState('');
  const [banco, setBanco] = useState('');
  const [resultado, setResultado] = useState<'xlsx' | 'zip' | ''>('');
  const [estado, setEstado] = useState<'ok' | 'processing' | 'fail' | ''>('');
  const [desde, setDesde] = useState(''); // yyyy-mm-dd
  const [hasta, setHasta] = useState(''); // yyyy-mm-dd

  // Datos
  const [allItems, setAllItems] = useState<Extraccion[]>([]);  // TODO: se llena 1 sola vez desde el backend
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Paginación (sobre los resultados filtrados)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 1) Cargar UNA sola vez (trae mucho y luego filtramos en cliente)
  useEffect(() => {
    const loadOnce = async () => {
      setLoading(true);
      try {
        const page_size = 1000;
        const url = `${API_BASE}/solicitudes?page=1&page_size=${page_size}`;
        // Obtener token de localStorage
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(url, { cache: 'no-store', headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j: ExtraccionesResponse = await res.json();
        setAllItems(j.items || []);
      } catch (err) {
        console.error('[Historial] inicial ->', err);
      } finally {
        setLoading(false);
      }
    };
    loadOnce();
  }, []);

  // 2) Filtrado local (sin pedir nada al backend)
  const filtered = useMemo(() => {
    const qnorm = q.trim().toLowerCase();
    const d1 = desde ? new Date(`${desde}T00:00:00`) : null;
    const d2 = hasta ? new Date(`${hasta}T23:59:59.999`) : null;

    return allItems.filter((r) => {
      // banco
      if (banco && (r.banco || '').toLowerCase() !== banco.toLowerCase()) return false;
      // resultado
      if (resultado && String(r.resultado).toLowerCase() !== resultado) return false;
      // estado
      if (estado && String(r.estado).toLowerCase() !== estado) return false;
      // rango de fechas (usa solicitado_en)
      if (d1 || d2) {
        const t = r.solicitado_en ? new Date(r.solicitado_en).getTime() : NaN;
        if (!Number.isFinite(t)) return false;
        if (d1 && t < d1.getTime()) return false;
        if (d2 && t > d2.getTime()) return false;
      }
      // búsqueda libre (archivo / empresa)
      if (qnorm) {
        const hay =
          (r.archivo_nombre || '').toLowerCase().includes(qnorm) ||
          (r.empresa || '').toLowerCase().includes(qnorm);
        if (!hay) return false;
      }
      return true;
    });
  }, [allItems, banco, resultado, estado, desde, hasta, q]);

  // 3) Contadores a partir del filtrado
  const totalAll = filtered.length;
  const totalOk = useMemo(() => filtered.filter((r) => r.estado === 'ok').length, [filtered]);
  const totalProc = useMemo(() => filtered.filter((r) => r.estado === 'processing').length, [filtered]);
  const totalFail = useMemo(() => filtered.filter((r) => r.estado === 'fail').length, [filtered]);

  // 4) Paginación sobre "filtered"
  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered, pageSize]);
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // 5) Aplicar filtros -> solo resetea página (todo es local)
  const onApplyFilters = () => setPage(1);
  const clearFilters = () => {
  setQ('');
  setBanco('');
  setResultado('');
  setEstado('');
  setDesde('');
  setHasta('');
  setPage(1);
};


  // 6) Descarga directa desde el backend
  const onDownload = async (row: Extraccion) => {
    try {
      setDownloadingId(row.id);
      const res = await fetch(`${API_BASE}/download/${row.id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo descargar el archivo');
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = cd && /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd);
      const stem = (row.archivo_nombre || `${row.banco}_${row.id}.pdf`).replace(/\.pdf$/i, '');
      const fname = decodeURIComponent(m?.[1] || m?.[2] || (row.resultado === 'zip' ? `${stem}_ceps.zip` : `${stem}.xlsx`));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      alert((e as Error)?.message || 'No se pudo descargar');
    } finally {
      setDownloadingId(null);
    }
  };

  const maybeEnter = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') onApplyFilters(); };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-white text-2xl md:text-3xl font-semibold tracking-tight drop-shadow-sm">
          Historial de Extracciones
        </h1>
        <p className="text-white/90">Bechapra · Automatizaciones</p>
      </div>

      {/* Cards de resumen */}
      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4 text-white">
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-md">
          <HistoryIcon className="w-6 h-6" />
          <div>
            <p className="text-xs uppercase opacity-90">Total</p>
            <p className="text-2xl font-semibold">{totalAll}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md">
          <CheckCircle2 className="w-6 h-6" />
          <div>
            <p className="text-xs uppercase opacity-90">Completadas</p>
            <p className="text-2xl font-semibold">{totalOk}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-md">
          <Loader2 className="w-6 h-6" />
          <div>
            <p className="text-xs uppercase opacity-90">En proceso</p>
            <p className="text-2xl font-semibold">{totalProc}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-md">
          <XCircle className="w-6 h-6" />
          <div>
            <p className="text-xs uppercase opacity-90">Error</p>
            <p className="text-2xl font-semibold">{totalFail}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
        <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow border border-white/40">
        <div className="space-y-3">
            {/* Buscar (renglón completo) */}
            <div>
            <label className="text-xs font-medium text-slate-700">Buscar</label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 bg-white h-12">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={maybeEnter}
                placeholder="Buscar por archivo o empresa…"
                className="w-full outline-none text-base text-slate-700 placeholder:text-slate-400"
                />
            </div>
            </div>

            {/* Renglón de selects/fechas + botón limpiar */}
            <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 flex-1">
                <div>
                <label className="text-xs font-medium text-slate-700">Banco</label>
                <select
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-700 cursor-pointer"
                >
                    <option value="">Todos</option>
                    <option value="inbursa">Inbursa</option>
                    <option value="banorte">Banorte</option>
                    <option value="bbva">BBVA</option>
                    <option value="santander">Santander</option>
                </select>
                </div>

                <div>
                <label className="text-xs font-medium text-slate-700">Salida</label>
                <select
                    value={resultado}
                    onChange={(e) => setResultado(e.target.value as typeof resultado)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-700 cursor-pointer"
                >
                    <option value="">Todas</option>
                    <option value="xlsx">Excel</option>
                    <option value="zip">Excel + CEP</option>
                </select>
                </div>

                <div>
                <label className="text-xs font-medium text-slate-700">Estado</label>
                <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as typeof estado)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-700 cursor-pointer"
                >
                    <option value="">Todos</option>
                    <option value="ok">Completada</option>
                    <option value="processing">En proceso</option>
                    <option value="fail">Error</option>
                </select>
                </div>

                <div>
                <label className="text-xs font-medium text-slate-700">Desde</label>
                <input
                    type="date"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                    onKeyDown={maybeEnter}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-700"
                />
                </div>

                <div>
                <label className="text-xs font-medium text-slate-700">Hasta</label>
                <input
                    type="date"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    onKeyDown={maybeEnter}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-700"
                />
                </div>
            </div>

            {/* Botón limpiar filtros */}
            <div className="flex gap-2 shrink-0">
                <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                title="Restablecer todos los filtros"
                >
                <XCircle className="w-4 h-4" />
                Limpiar filtros
                </button>
            </div>
        </div>
    </div>
</div>


      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13.5px]">
            <thead className="bg-slate-50 text-slate-700">
              <tr className="*:[text-align:left]">
                <th className="py-3 px-4 w-44">Fecha</th>
                <th className="py-3 px-4">Archivo</th>
                <th className="py-3 px-4 w-28">Banco</th>
                <th className="py-3 px-4 w-44">Empresa</th>
                <th className="py-3 px-4 w-32">Estado</th>
                <th className="py-3 px-4 w-32">Salida</th>
                <th className="py-3 px-4 w-36">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <Loader2 className="inline w-4 h-4 animate-spin mr-2" /> Cargando…
                  </td>
                </tr>
              )}

              {!loading && pageItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Sin resultados
                  </td>
                </tr>
              )}

              {!loading &&
                pageItems.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">{fmtDate(r.solicitado_en)}</td>

                    <td className="py-3 px-4">
                      {r.archivo_sha256 ? (
                        <a
                          href={`${API_BASE}/file/${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate max-w-[420px] inline-block text-indigo-600 hover:underline"
                          title={r.archivo_nombre || ''}
                        >
                          {r.archivo_nombre}
                        </a>
                      ) : (
                        <span className="truncate max-w-[420px] inline-block text-slate-400" title={r.archivo_nombre || ''}>
                          {r.archivo_nombre}
                        </span>
                      )}
                      {r.estado === 'fail' && r.error && (
                        <div className="text-[12px] text-rose-600 mt-1 line-clamp-1" title={r.error}>
                          {r.error}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 capitalize text-slate-700">{r.banco}</td>
                    <td className="py-3 px-4 text-slate-700">{r.empresa}</td>

                    <td className="py-3 px-4">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                          estadoClase(r.estado),
                        )}
                      >
                        {r.estado === 'ok' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : r.estado === 'processing' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        {estadoTexto(r.estado)}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700">{salidaTexto(r.resultado)}</td>

                    <td className="py-3 px-4">
                      <button
                        disabled={r.estado !== 'ok' || downloadingId === r.id}
                        onClick={() => onDownload(r)}
                        className={clsx(
                          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white shadow',
                          r.estado !== 'ok' ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700',
                        )}
                        title={r.estado !== 'ok' ? 'No disponible: en proceso o con error' : 'Descargar'}
                      >
                        {downloadingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Descargar
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <span>Mostrando</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-2 py-1 bg-white cursor-pointer"
            >
              {[5, 10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>
              por página — Total: {filtered.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={clsx(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border',
                page <= 1 ? 'text-slate-400 border-slate-200 cursor-not-allowed' : 'text-slate-700 border-slate-300 hover:bg-white',
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            <span className="text-sm text-slate-700">
              {page} / {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={clsx(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border',
                page >= totalPages ? 'text-slate-400 border-slate-200 cursor-not-allowed' : 'text-slate-700 border-slate-300 hover:bg-white',
              )}
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
