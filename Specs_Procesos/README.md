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

## Dos reglas al escribir uno

1. **Los entregables no llevan historial.** Un spec describe cómo es el proceso **hoy**; qué decía antes y
   con qué número de incidencia es memoria del proyecto y vive en `vault/` y en `Regresiones/`. La
   distinción al limpiar: la **razón** de una regla se queda —sin ella la regla se lee como arbitraria— y
   lo que se va es el relato de que antes estaba mal.
2. **Lo que el documento afirma del código se verifica contra el código**, afirmación por afirmación, antes
   de entregarlo. Qué está medido y qué es decisión abierta se dice con esas palabras.
