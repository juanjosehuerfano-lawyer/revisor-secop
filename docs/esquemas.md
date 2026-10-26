# Esquemas reales de los conjuntos (consultados el 2026-10-25)

Fuente: `https://www.datos.gov.co/api/views/<ID>.json` (metadatos) y `https://www.datos.gov.co/resource/<ID>.json?$limit=1` (muestra). Las muestras crudas están en `docs/muestras/`.
CORS: la API responde `Access-Control-Allow-Origin: *`, así que la app puede consultar directo desde el navegador.

## Hallazgos que cambian el brief

1. **SECOP I `xvdy-vvsk` responde 403** (datos y metadatos). En su lugar se usa **`f789-7hwg` – SECOP I – Procesos de Compra Pública**. Existe también `qddk-cgux` (histórico, mismo esquema).
2. **Adiciones (`cb9c-h8sn`) no trae el valor de la modificación.** Solo trae `identificador, id_contrato, tipo, descripcion, fecharegistro`. Por eso:
   - En SECOP II la app cuenta las modificaciones por tipo, pero **no puede sumar el valor de las adiciones**. El abogado debe digitar el valor de cada adición tomado del documento de modificación. La app nunca lo inventa.
   - En SECOP I sí existen `cuantia_contrato`, `valor_total_de_adiciones` y `valor_contrato_con_adiciones`, así que allí el cálculo es automático.
3. Valores de `tipo` en Adiciones (conteo total en la fecha de consulta): Modificacion General 4.074.626 · Conclusion 2.038.571 · No definido 1.652.693 · Adicion en el valor 257.243 · Reactivación 140.956 · Suspensión 127.602 · Cesion 107.174 · Extension 380 · Reduccion en el valor 143 · Expiracion 1.
4. Ejecución (`mfmm-jqmq`) se une por **`identificadorcontrato`**, no por `id_contrato`.
5. Contrato → proceso: `jbjy-vk9h.proceso_de_compra` (CO1.BDOS.…) = `p6dx-8zbt.id_del_portafolio`. Lo verifiqué con CO1.BDOS.8931183.
6. Contrato → proveedor: `jbjy-vk9h.documento_proveedor` = `qmzu-gj57.nit`.
7. El conjunto `b6m4-qgqv` es el **encabezado** del PAA (no trae líneas de adquisición).
8. **`jbjy-vk9h` (Contratos SECOP II) solo expone 1.000 filas por la API** (`$select=count(*)` → 1000; un contrato de 2024 que sí está en Facturas no aparece). Por eso la búsqueda usa **`rpmr-utcd` – SECOP Integrado** (8,26 M de filas SECOP II y 14,6 M de SECOP I). La ficha intenta primero `jbjy-vk9h` y, si no está el contrato, usa SECOP Integrado y lo avisa en pantalla. Conviene volver a revisarlo: puede ser una restricción temporal.
9. SECOP Integrado **repite filas idénticas** del mismo contrato. La app las quita antes de contar (regla de directa repetida) y antes de mostrar resultados.
10. **En SECOP II cada fase es una fila distinta de `p6dx-8zbt`**, con su propio `id_del_proceso` (CO1.REQ), bajo el mismo `id_del_portafolio`. Por ejemplo, la licitación SG-LP-002-2026 tiene "Presentación de observaciones" (CO1.REQ.9907854, publicada el 24/01/2026) y "Presentación de oferta" (CO1.REQ.10153439, publicada el 10/02/2026). La regla de plazos toma la primera publicación de todas las fases. Además, `referencia_del_proceso` puede traer la fase entre paréntesis.
11. Muchas adiciones en valor se registran con `tipo = "Modificacion General"`, y solo la `descripcion` dice "se adiciona". La app precarga ambas.
12. Rendimiento de las consultas (medido el 2026-10-25): las igualdades y los `like 'prefijo%'` tardan 0,2–0,7 s. Un `like '%…%'` sobre URL tarda ~13 s en `p6dx-8zbt.urlproceso.url` y ~55 s en `rpmr-utcd.url_contrato`. Por eso la app solo usa la búsqueda por aviso (noticeUID) como último recurso.

### rpmr-utcd · SECOP Integrado
nivel_entidad, codigo_entidad_en_secop, nombre_de_la_entidad, nit_de_la_entidad (text), departamento_entidad, municipio_entidad, estado_del_proceso, modalidad_de_contrataci_n, objeto_a_contratar, objeto_del_proceso, tipo_de_contrato, fecha_de_firma_del_contrato, fecha_inicio_ejecuci_n, fecha_fin_ejecuci_n, numero_del_contrato (CO1.PCCNTR… en SECOP II; constancia en SECOP I), numero_de_proceso (referencia), valor_contrato, nom_raz_social_contratista, url_contrato (text), origen (`SECOPI` / `SECOPII`), tipo_documento_proveedor, documento_proveedor

## Formatos de identificadores SECOP II
| Prefijo | Significa | Dónde |
|---|---|---|
| `CO1.PCCNTR.` | Contrato | `jbjy-vk9h.id_contrato`, Adiciones, Facturas, Ejecución |
| `CO1.BDOS.` | Portafolio / proceso de compra | `jbjy-vk9h.proceso_de_compra`, `p6dx-8zbt.id_del_portafolio` |
| `CO1.REQ.` | Procedimiento | `p6dx-8zbt.id_del_proceso` |
| `CO1.NTC.` | Aviso público (noticeUID) | dentro de `urlproceso.url` |
| `CO1.CTRMOD.` | Modificación de contrato | `cb9c-h8sn.identificador` |

## Campos por conjunto

### jbjy-vk9h · SECOP II – Contratos Electrónicos
nombre_entidad, nit_entidad (number), departamento, ciudad, localizaci_n, orden, sector, rama, entidad_centralizada, proceso_de_compra, id_contrato, referencia_del_contrato, estado_contrato, codigo_de_categoria_principal, descripcion_del_proceso, tipo_de_contrato, modalidad_de_contratacion, justificacion_modalidad_de, fecha_de_firma, fecha_de_inicio_del_contrato, fecha_de_fin_del_contrato, condiciones_de_entrega, tipodocproveedor, documento_proveedor, proveedor_adjudicado, es_grupo, es_pyme, habilita_pago_adelantado, liquidaci_n, obligaci_n_ambiental, obligaciones_postconsumo, reversion, origen_de_los_recursos, destino_gasto, valor_del_contrato, valor_de_pago_adelantado, valor_facturado, valor_pendiente_de_pago, valor_pagado, valor_amortizado, valor_pendiente_de, valor_pendiente_de_ejecucion, saldo_cdp, saldo_vigencia, espostconflicto, **dias_adicionados**, puntos_del_acuerdo, pilares_del_acuerdo, urlproceso (url → `.url`), nombre_representante_legal, nacionalidad_representante_legal, domicilio_representante_legal, tipo_de_identificaci_n_representante_legal, identificaci_n_representante_legal, g_nero_representante_legal, presupuesto_general_de_la_nacion_pgn, sistema_general_de_participaciones, sistema_general_de_regal_as, recursos_propios_alcald_as_gobernaciones_y_resguardos_ind_genas_, recursos_de_credito, recursos_propios, ultima_actualizacion, codigo_entidad, codigo_proveedor, fecha_inicio_liquidacion, fecha_fin_liquidacion, objeto_del_contrato, duraci_n_del_contrato, nombre_del_banco, tipo_de_cuenta, n_mero_de_cuenta, el_contrato_puede_ser_prorrogado, fecha_de_notificaci_n_de_prorrogaci_n, nombre_ordenador_del_gasto, tipo_de_documento_ordenador_del_gasto, n_mero_de_documento_ordenador_del_gasto, nombre_supervisor, tipo_de_documento_supervisor, n_mero_de_documento_supervisor, nombre_ordenador_de_pago, tipo_de_documento_ordenador_de_pago, n_mero_de_documento_ordenador_de_pago, documentos_tipo, descripcion_documentos_tipo, direcci_n_de_ejecuci_n_del_contrato, criterios_de_sostenibilidad_ambiental, requisitos_ambientales_en_las_especificaciones_t_cnicas, criterios_ambientales_en_la_evaluaci_n_de_las_ofertas, obligaciones_contractuales_o_poscontractuales_a_nivel_ambiental, uso_de_etiquetado_ecol_gico, obligaciones_posconsumo, fecha_inicio_obligaciones_posconsumo, fecha_fin_obligaciones_posconsumo, fecha_inicio_reversi_n, fecha_fin_reversi_n

### p6dx-8zbt · SECOP II – Procesos de Contratación
entidad, nit_entidad (text), departamento_entidad, ciudad_entidad, ordenentidad, codigo_pci, id_del_proceso, referencia_del_proceso, ppi, id_del_portafolio, nombre_del_procedimiento, descripci_n_del_procedimiento, fase, **fecha_de_publicacion_del**, fecha_de_ultima_publicaci, fecha_de_publicacion_fase, fecha_de_publicacion_fase_1, fecha_de_publicacion, fecha_de_publicacion_fase_2, fecha_de_publicacion_fase_3, precio_base, modalidad_de_contratacion, justificaci_n_modalidad_de, duracion, unidad_de_duracion, **fecha_de_recepcion_de**, fecha_de_apertura_de_respuesta, fecha_de_apertura_efectiva, ciudad_de_la_unidad_de, nombre_de_la_unidad_de, proveedores_invitados, proveedores_con_invitacion, visualizaciones_del, proveedores_que_manifestaron, **respuestas_al_procedimiento**, respuestas_externas, conteo_de_respuestas_a_ofertas, **proveedores_unicos_con**, numero_de_lotes, estado_del_procedimiento, id_estado_del_procedimiento, adjudicado, id_adjudicacion, codigoproveedor, departamento_proveedor, ciudad_proveedor, fecha_adjudicacion, valor_total_adjudicacion, nombre_del_adjudicador, nombre_del_proveedor, nit_del_proveedor_adjudicado, codigo_principal_de_categoria, estado_de_apertura_del_proceso, tipo_de_contrato, subtipo_de_contrato, categorias_adicionales, urlproceso (url), codigo_entidad, estado_resumen

### mfmm-jqmq · SECOP II – Ejecución Contratos
**identificadorcontrato**, tipoejecucion, nombreplan, fechadeentregaesperada, porcentajedeavanceesperado, fechadeentregareal, porcentaje_de_avance_real, estado_del_contrato, referencia_de_articulos, descripci_n, unidad, cantidad_adjudicada, cantidad_planeada, cantidadrecibida (text), cantidadporrecibir, fechacreacion

### cb9c-h8sn · SECOP II – Adiciones
identificador, id_contrato, tipo, descripcion, fecharegistro — **sin campo de valor**.

### ibyt-yi2f · SECOP II – Facturas
id_contrato, id_pago, numero_de_factura, fecha_factura (text), valor_neto, valor_total, notas, fecha_de_entrega (text), radicado, fecha_estiamda_de_pago (text, así viene escrito), valor_a_pagar, estado, pago_confirmado (checkbox), usuario_pago, codigo_entidad

### qmzu-gj57 · SECOP II – Proveedores Registrados
codigo, nombre, nit, es_entidad, es_grupo, esta_activa, fecha_creacion, codigo_categoria_principal, descripcion_categoria_principal, telefono, fax, correo, direccion, pais, departamento, municipio, sitio_web, tipo_empresa, nombre_representante_legal, tipo_doc_representante_legal, n_mero_doc_representante_legal, telefono_representante_legal, correo_representante_legal, espyme, ubicacion, tama_o_entidad

### b6m4-qgqv · SECOP II – PAA – Encabezado
identificador_unico, id_plan_anual_de_adquisiciones, anno, codigo_entidad, nombre_entidad, mision_vision, perspectiva_estrategica, nombre_contacto, telefono_contacto, correo_contacto, valor_presupuesto_general, presupuesto_menor_cuantia, presupuesto_minima_cuantia, fecha_de_publicacion, fecha_de_creacion, fecha_de_ultima_modificacion, version, identificador_requerimiento_compra, estado, departamento_paa, municipio_paa

### f789-7hwg · SECOP I – Procesos de Compra Pública (reemplaza a xvdy-vvsk)
uid, anno_cargue_secop, anno_firma_contrato, nivel_entidad, orden_entidad, nombre_entidad, nit_de_la_entidad, c_digo_de_la_entidad, id_modalidad, modalidad_de_contratacion, estado_del_proceso, causal_de_otras_formas_de, id_regimen_de_contratacion, nombre_regimen_de_contratacion, id_objeto_a_contratar, objeto_a_contratar, detalle_del_objeto_a_contratar, tipo_de_contrato, municipio_de_obtencion, municipio_de_entrega, municipios_ejecucion, fecha_de_cargue_en_el_secop, numero_de_constancia, numero_de_proceso, numero_de_contrato, cuantia_proceso, id_grupo, nombre_grupo, id_familia, nombre_familia, id_clase, nombre_clase, id_adjudicacion, tipo_identifi_del_contratista, identificacion_del_contratista, nom_razon_social_contratista, dpto_y_muni_contratista, tipo_doc_representante_legal, identific_representante_legal, nombre_del_represen_legal, fecha_de_firma_del_contrato, fecha_ini_ejec_contrato, plazo_de_ejec_del_contrato, rango_de_ejec_del_contrato, tiempo_adiciones_en_dias, tiempo_adiciones_en_meses, fecha_fin_ejec_contrato, compromiso_presupuestal, **cuantia_contrato**, **valor_total_de_adiciones**, **valor_contrato_con_adiciones**, objeto_del_contrato_a_la, proponentes_seleccionados, calificacion_definitiva, id_sub_unidad_ejecutora, nombre_sub_unidad_ejecutora, ruta_proceso_en_secop_i (url), moneda, es_postconflicto, marcacion_adiciones, posicion_rubro, nombre_rubro, valor_rubro, sexo_replegal, pilar_acuerdo_paz, punto_acuerdo_paz, municipio_entidad, departamento_entidad, ultima_actualizacion, fecha_liquidacion, cumpledecreto248, incluyebienesdecreto248, cumple_sentencia_t302, es_mipyme, tama_o_mipyme, codigo_bpin, destino_gasto, pliegos_tipo, sector_pliegos_tipo

### Otros conjuntos útiles (no usados en v1)
- `rpmr-utcd` – SECOP Integrado (SECOP I + II, campos reducidos).
- `qddk-cgux` – SECOP I histórico.
