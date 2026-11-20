// Sirve las dos apps desde Cloudflare con subdominio propio:
// contractual.juanjosehuerfanocorredor.com -> la raíz del repo (Radar Contractual)
// lupa.juanjosehuerfanocorredor.com        -> radar/ (Lupa Contractual Ciudadana), que comparte js/, css/ y fonts/
// publico.juanjosehuerfanocorredor.com     -> redirige a lupa. (nombre anterior: Radar Público)
const COMPARTIDO = /^\/(js|css|fonts)\//;
const LUPA = 'https://lupa.juanjosehuerfanocorredor.com';

export function rutaLupa(pathname) {
  return COMPARTIDO.test(pathname) || pathname.startsWith('/radar/') ? pathname : '/radar' + pathname;
}

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.startsWith('publico.')) return Response.redirect(LUPA + url.pathname + url.search, 301);
    if (url.hostname.startsWith('lupa.')) {
      const ruta = rutaLupa(url.pathname);
      if (ruta !== url.pathname) {
        url.pathname = ruta;
        return env.ASSETS.fetch(new Request(url, request));
      }
    }
    return env.ASSETS.fetch(request);
  },
};
