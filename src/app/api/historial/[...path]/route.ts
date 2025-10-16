// Next.js App Router – proxy de lectura al backend
export const runtime = 'nodejs';        // para poder streamear binarios
export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const paramsObj = await context.params;
  // Use internal API base from env when available; otherwise use the nginx-proxied
  // relative path so browser requests stay on the same origin (HTTPS).
  const base = (process.env.API_BASE_INTERNAL || '/extractor-api').replace(/\/+$/,'');
  const urlIn = new URL(req.url);
  const target = `${base}/${paramsObj.path.join('/')}${urlIn.search}`; // p.ej. /solicitudes?...
  // proxy transparente
  const res = await fetch(target, { headers: { Accept: req.headers.get('accept') || '*/*' } });
  const headers = new Headers(res.headers);
  // deja pasar cabeceras de descarga
  headers.set('Access-Control-Expose-Headers', 'Content-Disposition');
  return new Response(res.body, { status: res.status, headers });
}
