"use client";

import { useEffect, useRef, useState } from "react";
import { extractExcel, extractWithCep, downloadBlob, type Bank } from "../lib/api";

/* =========================================================
   Selector estilizado de Banco (legible y fácil de pulsar)
   ========================================================= */
function BankSelect({
  value,
  onChange,
  options = [
    { label: "Banorte", value: "banorte" },
    { label: "BBVA", value: "bbva" },
    { label: "Santander", value: "santander" },
    { label: "Inbursa", value: "inbursa" },
  ],
}: {
  value: Bank;
  onChange: (v: Bank) => void;
  options?: { label: string; value: Bank }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-between w-60 md:w-72 h-12 rounded-xl px-4 text-base font-medium
                   bg-white/95 text-slate-800 shadow-sm ring-1 ring-white/40
                   hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{current?.label ?? "Selecciona banco"}</span>
        <svg
          className={`ml-3 h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <ul
          className="absolute z-20 mt-2 w-60 md:w-72 max-h-60 overflow-auto rounded-xl bg-white shadow-xl ring-1 ring-black/5"
          role="listbox"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`cursor-pointer px-4 py-3 text-sm md:text-base
                            ${active ? "bg-sky-50 text-sky-700" : "text-slate-800 hover:bg-slate-50"}`}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* =================
   Página principal
   ================= */
export default function Page() {
  const [bank, setBank] = useState<Bank>("banorte");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"xlsx" | "zip" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Preview PDF
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, previewUrl]);

  async function run(kind: "xlsx" | "zip") {
    if (!file) {
      setMsg("Selecciona un PDF.");
      return;
    }
    setBusy(kind);
    setMsg(null);
    try {
      const { blob, filename } =
        kind === "xlsx" ? await extractExcel(bank, file) : await extractWithCep(bank, file);
      downloadBlob(blob, filename);
      setMsg(`✔ Descargado: ${filename}`);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setMsg(e.message ?? "Error al procesar");
      } else {
        setMsg("Error al procesar");
      }
    } finally {
      setBusy(null);
    }
  }

  const onPickFile = (f?: File) => {
    if (!f) return;
    // Si el navegador no setea el MIME correctamente, aceptamos por extensión .pdf
    const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    if (!isPdf) {
      setMsg("El archivo debe ser PDF.");
      return;
    }
    setFile(f);
  };

  /* ---- Drag & Drop handlers ---- */
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setDragging(true);
  };
  const onDragEnter: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };
  const onDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Sólo cerrar highlight cuando salimos del contenedor
    if (e.currentTarget === e.target) setDragging(false);
  };
  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    const pdf =
      files.find((f) => f.type === "application/pdf") ||
      files.find((f) => /\.pdf$/i.test(f.name));
    if (pdf) onPickFile(pdf);
  };

  return (
    <main className="min-h-[100svh] w-full bg-gradient-to-b from-[#0a2ad3] via-[#1741d8] to-[#1b4ee0] text-white/90">
      {/* Previsualización PDF y descarga */}
      {previewUrl && (
        <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-white/15">
          <div className="flex items-center justify-between bg-white/10 px-4 py-2 text-sm text-white/90">
            <span className="truncate">{file?.name}</span>
            <div className="flex gap-4">
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-white/50 underline-offset-4 hover:decoration-white"
              >
                Abrir en pestaña nueva
              </a>
              <a
                href={previewUrl}
                download={file?.name}
                className="underline decoration-white/50 underline-offset-4 hover:decoration-white"
              >
                Descargar PDF
              </a>
            </div>
          </div>
          <div className="px-4 py-2 text-xs text-yellow-200 bg-yellow-700/40 rounded-b-xl">
            ⚠ Si el PDF no se muestra, verifica que el archivo tenga contenido y sea válido. Para abrirlo en una pestaña nueva, espera a que el selector de archivos se cierre antes de hacer clic en el enlace. Si el navegador bloquea la visualización, prueba con Chrome, Edge o Firefox.
          </div>
          <div className="h-[360px] w-full bg-white/5 flex items-center justify-center">
            <iframe
              src={previewUrl}
              className="h-full w-full"
              title="PDF Preview"
              frameBorder="0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const msg = document.createElement('div');
                msg.textContent = 'No se puede mostrar la previsualización. Descarga el PDF para verificar.';
                msg.style.color = '#fff';
                msg.style.textAlign = 'center';
                msg.style.padding = '2rem';
                e.currentTarget.parentNode?.appendChild(msg);
              }}
            />
            <noscript>
              <p className="text-center text-white/80">No se puede mostrar la previsualización. Abre el PDF en una pestaña nueva.</p>
            </noscript>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight">Extractor de Estados de Cuenta</h1>
          <p className="mt-3 max-w-3xl text-white/85">
            Convierte estados de cuenta PDF a Excel y, opcionalmente, descarga los <b>CEP</b> desde
            Banxico. Soporta Santander, BBVA y Banorte.
          </p>
        </header>

        {/* Contenedor principal */}
        <section className="rounded-2xl border border-white/12 bg-white/10 p-6 backdrop-blur shadow-2xl">
          {/* Banco (más visible) */}
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <span className="text-sm text-white/85">Banco:</span>
            <BankSelect value={bank} onChange={setBank} />
          </div>

          {/* Zona de carga / drag & drop */}
            <div
              className={["rounded-xl border border-dashed p-4 transition",
                dragging ? "border-white/70 bg-white/20" : "border-white/25 bg-white/5",
              ].join(" ")}
              onDragOver={onDragOver}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-h-[56px] flex-1 items-center gap-3 rounded-lg border border-white/15 bg-white/5 px-4">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/15">📄</div>
                  <div className="min-w-0">
                    <p className="text-sm text-white/75">
                      {file ? (
                        <>
                          <span className="font-medium">{file.name}</span>{" "}
                          <span className="text-white/60">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </>
                      ) : dragging ? (
                        <span>Suelta el PDF aquí…</span>
                      ) : (
                        <span>Selecciona o arrastra tu archivo PDF</span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-white/95 px-4 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-white/40 transition hover:bg-white"
                >
                  Seleccionar archivo
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    onPickFile(f ?? undefined);
                    (e.target as HTMLInputElement).value = "";
                  }}
                />
              </div>
            </div>

          {/* Tarjetas de acciones */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Excel */}
            <article className="rounded-2xl border border-white/12 bg-white/10 p-6 backdrop-blur transition-transform hover:scale-[1.02] hover:bg-white/20">
              <h3 className="text-2xl font-semibold">Extraer Excel</h3>
              <p className="mt-2 text-white/80">
                Convierte tu estado de cuenta PDF a una hoja de cálculo con los movimientos
                detectados.
              </p>
              <button
                onClick={() => run("xlsx")}
                disabled={!file || !!busy}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "xlsx" ? "Procesando…" : "Extraer Excel"}
              </button>
            </article>

            {/* Excel + CEP */}
            <article className="rounded-2xl border border-white/12 bg-white/10 p-6 backdrop-blur transition-transform hover:scale-[1.02] hover:bg-white/20">
              <h3 className="text-2xl font-semibold">Extraer Excel + CEP</h3>
              <p className="mt-2 text-white/80">
                Genera el Excel y descarga los comprobantes CEP desde Banxico. Agrega enlaces a cada
                movimiento que aplique.
              </p>
              <p className="mt-3 text-xs text-white/85">
                ⚠ Puede tardar dependiendo del número de movimientos (y del captcha de Banxico).
              </p>
              <button
                onClick={() => run("zip")}
                disabled={!file || !!busy}
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-slate-700 px-5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy === "zip" ? "Procesando…" : "Extraer Excel + CEP"}
              </button>
            </article>
          </div>

          {/* Mensajes */}
          <div className="mt-6">
            <pre
              className={[
                "whitespace-pre-wrap rounded-xl border px-4 py-3 text-sm",
                !msg && "border-white/10 bg-white/5 text-white/75",
                msg && msg.startsWith("✔")
                  ? "border-emerald-400/40 bg-emerald-900/20 text-emerald-200"
                  : msg
                  ? "border-white/20 bg-white/10 text-white/90"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {msg ?? "Selecciona o suelta un PDF y elige una opción."}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}