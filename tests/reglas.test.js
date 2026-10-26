// Ejecuta las pruebas con Node: node --test tests/
import { test } from 'node:test';
import { CASOS } from './casos.js';

for (const [nombre, prueba] of CASOS) test(nombre, prueba);
