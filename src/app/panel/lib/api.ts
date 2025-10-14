// src/lib/api.ts
export type Bank = "bbva" | "banorte" | "santander" | "inbursa";

/** URL base del backend. Si no hay .env.local toma 127.0.0.1:8000 */
function apiBase() {
  return process.env.NEXT_PUBLIC_API_BASE ?? "http://46.202.177.106:8000";
}

/** Arma el endpoint para cada banco */
function endpoint(bank: Bank, withCep: boolean) {
  // Usamos los genéricos que tienes en /docs:
  // POST /extract/{bank}            -> Excel
  // POST /extract-with-cep/{bank}   -> Excel + CEP (ZIP)
  return withCep
    ? `${apiBase()}/extract-with-cep/${bank}`
    : `${apiBase()}/extract/${bank}`;
}

/** Hace POST con FormData y regresa el blob + filename */
async function postForm(url: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) {
    // Intenta leer error de FastAPI
    try {
      const data = await res.json();
      throw new Error(data?.detail ?? `Error ${res.status}`);
    } catch {
      const text = await res.text();
      throw new Error(text || `Error ${res.status}`);
    }
  }

  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";

  // filename*=UTF-8''NOMBRE.ext  |  filename="NOMBRE.ext"
  let filename = "archivo";
  const m =
    /filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i.exec(cd) ||
    undefined;
  if (m) filename = decodeURIComponent(m[1] || m[2]);

  return { blob, filename };
}

export async function extractExcel(bank: Bank, file: File) {
  const { blob, filename } = await postForm(endpoint(bank, false), file);
  // Si el backend no devuelve nombre, ponemos uno
  const name = filename.includes(".") ? filename : `${bank}.xlsx`;
  return { blob, filename: name };
}

export async function extractWithCep(bank: Bank, file: File) {
  const { blob, filename } = await postForm(endpoint(bank, true), file);
  const name = filename.includes(".") ? filename : `${bank}_con_ceps.zip`;
  return { blob, filename: name };
}

/** Descarga un blob en el navegador */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
