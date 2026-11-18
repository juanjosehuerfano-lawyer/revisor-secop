// Sirve las dos apps desde Cloudflare con subdominio propio:
// contractual.juanjosehuerfanocorredor.com -> la raíz del repo (Radar Contractual)
// publico.juanjosehuerfanocorredor.com     -> radar/ (Radar Público), que comparte js/, css/ y fonts/
const COMPARTIDO = /^\/(js|css|fonts)\//;

export function rutaPublico(pathname) {
  return COMPARTIDO.test(pathname) || pathname.startsWith('/radar/') ? pathname : '/radar' + pathname;
}

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.startsWith('publico.')) {
      const ruta = rutaPublico(url.pathname);
      if (ruta !== url.pathname) {
        url.pathname = ruta;
        return env.ASSETS.fetch(new Request(url, request));
      }
    }
    return env.ASSETS.fetch(request);
  },
};
