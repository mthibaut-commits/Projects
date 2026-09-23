# Specs de proceso

Cómo funciona el negocio, por tema. En cada carpeta el `.md` es la **fuente normativa** y el `.pdf` su
copia entregable: se genera con `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node md_a_pdf.mjs <archivo.md>`
y **no se edita a mano** (lo bloquea el hook `protect_paths`). Los PDF con nombre `Spec_Proceso_*` son los
originales de política del cliente: ésos no se regeneran, son la entrada.

| Carpeta | Qué decide | Documentos |
|---|---|---|
| `Otorgamiento/` | si el negocio se aprueba, con qué atribución y qué excepciones levanta | `spec-otorgamiento.md` (el modelo, el catálogo y el contrato del motor como servicio) · `Spec_Proceso_Calificacion_Otorgamiento_Verificacion*.pdf` (política, vigente: v1.1) |
| `Verificacion/` | si el deudor confirma que va a pagar | `spec-verificacion-facturas.md` |
| `Lineas/` | cuánto cupo hay y cómo se pide uno nuevo al comité | `spec-asignacion-lineas.md` · `Analisis_Solicitud_Linea_Comite.md` · `Spec_Proceso_Solicitud_Linea_Comite.pdf` |
| `Excepciones/` | qué pasa entre que el motor levanta una excepción y un apoderado la resuelve | `spec-gestion-excepciones.md` |
| `Evaluacion_Factura/` | **lo transversal del proceso de evaluación**: en qué orden corre todo y qué pasa antes y después | `spec-proceso-curse.md` (el curse de la OPERACIÓN: su máquina de estados, y el modelo del negocio conciliado cláusula por cláusula contra lo implementado) · `spec-ciclo-factura.md` (la costura entre los motores) · `spec-inbound-facturas.md` · `spec-pricing-simulacion.md` · `spec-modelo-giro.md` · `spec-mensajeria-interna.md` · `Spec_Proceso_Inbound_Facturas.pdf` · `Spec_Proceso_Gestion_Oportunidad_Kanban*.pdf` (vigente: v1.2) |

## Lo que no vive acá

- El **contrato con el servidor** (swaggers, layouts, specs de campos y los PDF de APIs/SFTP) → `Integraciones/`.
- Lo que **mide** el repo o el fuente → `Auditoria/`.
- Lo que cotejó definición contra implementación y dejó hallazgos → `Regresiones/`.
- El **inventario de activos** A1–A24 → `Levantamiento_Activos_Informacion.md`, en la raíz.

## Versionado (21-09-2026)

Todo entregable —los de acá **y los de `Integraciones/`**— declara su versión bajo el título y cierra con
su anexo. Lo exige `tests/contract/versiones.test.mjs`.

```markdown
# Título del documento

**Versión 1.2.1 · 21-09-2026 · NEX Factoring**
```

| Se sube… | Cuando |
|---|---|
| **mayor** | cambia lo que el sistema decide, o el contrato con el servidor. Alguien que implementó contra la versión anterior queda equivocado |
| **menor** | entra una sección, un campo o un criterio. Lo anterior sigue siendo cierto |
| **parche** | redacción, una cifra, una referencia |

El anexo va **al final**, con la versión vigente en la primera fila:

```markdown
## Anexo · Control de versiones

| Versión | Fecha | Qué cambió |
|---|---|---|
| **1.2.1** | 21-09-2026 | … |
```

Tres cosas que conviene saber:

- **El PDF lo estampa solo.** `md_a_pdf.mjs` saca la línea de versión del cuerpo y la pone como píldora en
  la banda y como tag en el **encabezado de cada hoja**: un PDF circula suelto y una carilla impresa tiene
  que poder decir de qué versión es. El anexo abre en **hoja nueva**.
- **La cabecera y la primera fila del anexo tienen que calzar**, y el gate lo comprueba. Sin eso se
  desfasan en la primera corrección y el documento afirma dos versiones distintas de sí mismo.
- **Esto no reabre el «sin historial».** El anexo dice qué cambió entre versiones; lo que sigue prohibido
  dentro del texto es narrar que antes estaba mal («Nuevo en esta versión», «Antes/Ahora»). La razón de una
  regla se queda; el relato del error, no.
- `Integraciones_APIs_y_S3.md` es **generado**: su versión y su historial viven en `armar_integraciones.mjs`,
  no en el `.md`. Editarlo a mano lo pisa la próxima corrida.

## Dos reglas al escribir uno

1. **Los entregables no llevan historial.** Un spec describe cómo es el proceso **hoy**; qué decía antes y
   con qué número de incidencia es memoria del proyecto y vive en `vault/` y en `Regresiones/`. La
   distinción al limpiar: la **razón** de una regla se queda —sin ella la regla se lee como arbitraria— y
   lo que se va es el relato de que antes estaba mal.
2. **Lo que el documento afirma del código se verifica contra el código**, afirmación por afirmación, antes
   de entregarlo. Qué está medido y qué es decisión abierta se dice con esas palabras.
3. **La evidencia es la DEFINICIÓN, nunca la línea de código** (22-09-2026, decisión del usuario). Un spec
   cita la regla del vault por su número, la sección del spec que la desarrolla, o la **condición** del
   fuente por su nombre —el predicado o la función que la encarna, `ofertaPublicada` = «cerrada **y**
   comunicada»—. Una cita `l.NNNNN` vale para el fuente de un día: el primer commit que agregue una línea
   más arriba la corre, sin que la condición haya cambiado. El fuente es un solo archivo de ~51.000
   líneas, así que eso pasa en cada commit.
