"use client";
import { useState } from "react";
// Make sure the path is correct; for example, if the file is in 'src/lib/api.ts':
import { extractExcel, extractWithCep, downloadBlob, type Bank } from "../lib/api";
// If your 'api' file is actually in 'src/api.ts', change to:
// import { extractExcel, extractWithCep, downloadBlob, type Bank } from "../api";

export default function Extractor() {
  const [bank, setBank] = useState<Bank>("bbva");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(kind: "xlsx" | "zip") {
    if (!file) return setMsg("Selecciona un PDF.");
    setBusy(true); setMsg(null);
    try {
      const { blob, filename } =
        kind === "xlsx"
          ? await extractExcel(bank, file)
          : await extractWithCep(bank, file);
      downloadBlob(blob, filename);
      setMsg(`Descargado: ${filename}`);
    } catch (e: unknown) {
      setMsg((e as Error)?.message ?? "Error al procesar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white/10 backdrop-blur shadow-2xl p-6">
      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-center">
        <label className="text-slate-200">Banco:</label>
        <select
          className="h-10 rounded-lg bg-white/90 text-slate-800 px-3"
          value={bank}
          onChange={(e) => setBank(e.target.value as Bank)}
        >
          <option value="bbva">BBVA</option>
          <option value="banorte">Banorte</option>
          <option value="santander">Santander</option>
        </select>

        <label className="text-slate-200">PDF estado de cuenta:</label>
        <input
          className="h-10 rounded-lg bg-white/90 text-slate-800 px-3"
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="mt-6 flex gap-3">
        <button
          disabled={busy || !file}
          onClick={() => run("xlsx")}
          className="h-10 px-4 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-50"
        >
          Extraer a Excel
        </button>
        <button
          disabled={busy || !file}
          onClick={() => run("zip")}
          className="h-10 px-4 rounded-lg bg-slate-700 hover:bg-slate-800 disabled:opacity-50"
        >
          Excel + CEP (ZIP)
        </button>
      </div>

      {msg && (
        <p className="mt-4 text-emerald-300 border border-emerald-400/40 rounded-lg p-3 bg-emerald-500/10">
          {msg}
        </p>
      )}
    </div>
  );
}
