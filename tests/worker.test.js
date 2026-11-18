import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rutaPublico } from '../worker.js';

test('publico.* sirve radar/ en la raíz y comparte js, css y fonts', () => {
  assert.equal(rutaPublico('/'), '/radar/');
  assert.equal(rutaPublico('/sw.js'), '/radar/sw.js');
  assert.equal(rutaPublico('/icons/icono.svg'), '/radar/icons/icono.svg');
  assert.equal(rutaPublico('/js/radar.js'), '/js/radar.js');
  assert.equal(rutaPublico('/css/app.css'), '/css/app.css');
  assert.equal(rutaPublico('/radar/index.html'), '/radar/index.html');
});
