"use client";

import { useEffect, useRef, useState } from "react";

// Mock de las funciones API para el ejemplo
const extractExcel = async (bank: Bank) => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return { blob: new Blob(), filename: `${bank}_extraction.xlsx` };
};

const extractWithCep = async (bank: Bank) => {
  await new Promise(resolve => setTimeout(resolve, 3000));
  return { blob: new Blob(), filename: `${bank}_extraction_cep.zip` };
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

type Bank = "banorte" | "bbva" | "santander" | "inbursa";

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
        className="inline-flex items-center justify-between w-60 md:w-72 h-11 rounded-lg px-4 text-sm font-medium
                   bg-white text-slate-700 shadow-sm border-2 border-slate-200
                   hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all"
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
          className="absolute z-20 mt-2 w-60 md:w-72 max-h-60 overflow-auto rounded-lg bg-white shadow-xl border border-slate-200"
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
                className={`cursor-pointer px-4 py-3 text-sm transition-colors
                            ${active ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
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
        kind === "xlsx" ? await extractExcel(bank) : await extractWithCep(bank);
      downloadBlob(blob, filename);
      setMsg(`✔ Descargado: ${filename}`);
    } catch (e: unknown) {
      setMsg((e as Error)?.message ?? "Error al procesar");
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
    <main className="min-h-[100svh] w-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700">
      {/* Header fuera del cuadro blanco */}
      <div className="mx-auto w-full max-w-4xl px-2 sm:px-8 md:px-12 pt-8 flex flex-col items-center justify-center">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mb-6 shadow-lg">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            Extractor de Estados de Cuenta
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-white text-lg leading-relaxed">
            Convierte estados de cuenta PDF a Excel y descarga comprobantes CEP desde Banxico
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Compatible con Santander, BBVA, Banorte e Inbursa
          </div>
        </header>
      </div>
      {/* Cuadro blanco compacto y centrado */}
      <section className="bg-white rounded-2xl shadow border border-slate-200 max-w-4xl mx-auto my-8 p-4 sm:p-6 md:p-8 flex flex-col gap-8">
        {/* Fila superior: banco y carga */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Banco */}
          <div className="bg-white px-6 py-4 rounded-2xl flex flex-col justify-center h-full w-full border border-slate-100">
            <div className="flex flex-wrap items-center gap-4 justify-center sm:justify-start">
              <label className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Selecciona tu banco:
              </label>
              <BankSelect value={bank} onChange={setBank} />
            </div>
          </div>
          {/* Zona de carga / drag & drop */}
          <div className="p-6 flex flex-col justify-center h-full w-full bg-white rounded-2xl border border-slate-100">
            <div
              className={["rounded-xl border-2 border-dashed p-6 transition-all cursor-pointer",
                dragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50",
              ].join(" ")}
              onDragOver={onDragOver}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900 mb-1">
                    {file ? file.name : dragging ? "Suelta tu archivo aquí" : "Arrastra tu PDF aquí"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {file ? (
                      <span>Tamaño: {(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    ) : (
                      "o haz clic para seleccionar"
                    )}
                  </p>
                </div>
                <label className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      onPickFile(f ?? undefined);
                      (e.target as HTMLInputElement).value = "";
                    }}
                  />
                  <span className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors">
                    Seleccionar archivo
                  </span>
                </label>
              </div>
              {/* Vista previa del PDF */}
              {previewUrl && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between bg-slate-100 px-4 py-2 border-b border-slate-200">
                    <span className="truncate font-medium text-slate-700 text-xs">{file?.name}</span>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Abrir
                    </a>
                  </div>
                  <div className="h-[320px] w-full bg-slate-50">
                    <embed src={previewUrl} type="application/pdf" className="h-full w-full" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Fila inferior: tarjetas de acción */}
        <div className="grid gap-6 md:grid-cols-2 w-full">
          {/* Excel */}
          <article className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-6 transition-all hover:shadow-lg hover:border-emerald-300">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-900">Extraer Excel</h3>
                <p className="mt-2 text-slate-700 text-sm leading-relaxed">
                  Convierte tu estado de cuenta PDF a una hoja de cálculo con todos los movimientos detectados.
                </p>
              </div>
            </div>
            <button
              onClick={() => run("xlsx")}
              disabled={!file || !!busy}
              className="w-full h-11 rounded-lg bg-emerald-600 text-white font-semibold text-sm shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-600 disabled:hover:shadow-sm"
            >
              {busy === "xlsx" ? "Procesando…" : "Generar Excel"}
            </button>
          </article>

          {/* Excel + CEP */}
          <article className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 transition-all hover:shadow-lg hover:border-blue-300">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-900">Excel + CEP</h3>
                <p className="mt-2 text-slate-700 text-sm leading-relaxed">
                  Genera el Excel y descarga los comprobantes CEP desde Banxico con enlaces a cada movimiento.
                </p>
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 inline-flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Puede tardar varios minutos dependiendo del número de movimientos</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => run("zip")}
              disabled={!file || !!busy}
              className="w-full h-11 rounded-lg bg-blue-600 text-white font-semibold text-sm shadow-sm transition-all hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600 disabled:hover:shadow-sm"
            >
              {busy === "zip" ? "Procesando…" : "Generar Excel + CEP"}
            </button>
          </article>
        </div>

        {/* Mensajes */}
        {msg && (
          <div className="px-8 pb-8">
            <div
              className={[
                "rounded-xl px-5 py-4 text-sm font-medium border-2",
                msg.startsWith("✔")
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-blue-200 bg-blue-50 text-blue-800",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                {msg.startsWith("✔") ? (
                  <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
                <pre className="whitespace-pre-wrap flex-1">{msg}</pre>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}