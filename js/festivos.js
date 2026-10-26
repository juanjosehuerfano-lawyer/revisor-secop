// Festivos de Colombia y días hábiles. Ley 51 de 1983 (traslado a lunes) y fiestas religiosas móviles.
// Todas las fechas se manejan en UTC para que la zona horaria del equipo no corra los días.

function dia(a, m, d) { return new Date(Date.UTC(a, m - 1, d)); }
function sumarDias(f, n) { return new Date(f.getTime() + n * 86400000); }
function clave(f) { return f.toISOString().slice(0, 10); }

// Domingo de Pascua, algoritmo gregoriano anónimo (Meeus/Jones/Butcher).
export function pascua(a) {
  const x = a % 19, b = Math.floor(a / 100), c = a % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * x + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((x + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), d2 = ((h + l - 7 * m + 114) % 31) + 1;
  return dia(a, mes, d2);
}

function siguienteLunes(f) {
  const dow = f.getUTCDay(); // 0 domingo, 1 lunes
  return dow === 1 ? f : sumarDias(f, (8 - dow) % 7);
}

const cache = new Map();
export function festivos(a) {
  if (cache.has(a)) return cache.get(a);
  const p = pascua(a);
  const fijos = [dia(a, 1, 1), dia(a, 5, 1), dia(a, 7, 20), dia(a, 8, 7), dia(a, 12, 8), dia(a, 12, 25)];
  const trasladables = [dia(a, 1, 6), dia(a, 3, 19), dia(a, 6, 29), dia(a, 8, 15), dia(a, 10, 12), dia(a, 11, 1), dia(a, 11, 11)]
    .map(siguienteLunes);
  const moviles = [
    sumarDias(p, -3), // Jueves Santo
    sumarDias(p, -2), // Viernes Santo
    sumarDias(p, 43), // Ascensión (lunes)
    sumarDias(p, 64), // Corpus Christi (lunes)
    sumarDias(p, 71), // Sagrado Corazón (lunes)
  ];
  const set = new Set([...fijos, ...trasladables, ...moviles].map(clave));
  cache.set(a, set);
  return set;
}

export function esHabil(f) {
  const dow = f.getUTCDay();
  return dow !== 0 && dow !== 6 && !festivos(f.getUTCFullYear()).has(clave(f));
}

function parseISO(iso) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return dia(a, m, d);
}

// Días hábiles transcurridos después de `desde` y hasta `hasta`, inclusive (los plazos corren desde el día siguiente).
export function diasHabilesEntre(desdeISO, hastaISO) {
  let f = parseISO(desdeISO);
  const fin = parseISO(hastaISO);
  if (fin <= f) return 0;
  let n = 0;
  while (f < fin) {
    f = sumarDias(f, 1);
    if (esHabil(f)) n++;
  }
  return n;
}
