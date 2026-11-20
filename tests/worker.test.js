import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { rutaLupa } from '../worker.js';

test('lupa.* sirve radar/ en la raíz y comparte js, css y fonts', () => {
  assert.equal(rutaLupa('/'), '/radar/');
  assert.equal(rutaLupa('/sw.js'), '/radar/sw.js');
  assert.equal(rutaLupa('/icons/icono.svg'), '/radar/icons/icono.svg');
  assert.equal(rutaLupa('/js/radar.js'), '/js/radar.js');
  assert.equal(rutaLupa('/css/app.css'), '/css/app.css');
  assert.equal(rutaLupa('/radar/index.html'), '/radar/index.html');
});

test('publico.* redirige a lupa. con la misma ruta', async () => {
  const r = await worker.fetch(new Request('https://publico.juanjosehuerfanocorredor.com/como?x=1'), {});
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), 'https://lupa.juanjosehuerfanocorredor.com/como?x=1');
});
