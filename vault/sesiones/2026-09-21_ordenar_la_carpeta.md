---
type: sesion
title: "Sesión 2026-09-21 — Ordenar la carpeta: Auditoria/, Regresiones/ y Specs_Procesos por tema"
description: "El usuario pidió ordenar los .md y .pdf de la raíz: se crearon Auditoria/ y Regresiones/, los PDF de integración se fueron a Integraciones/ y Specs_Procesos quedó partido en cinco temas (Otorgamiento, Verificacion, Lineas, Excepciones, Evaluacion_Factura). 41 archivos movidos con git mv, 77 referencias rotas medidas con un verificador de enlaces y 63 reparadas; las de los logs y el ADR se dejaron como registro con fecha. De paso aparecieron tres defectos en main: paso 0 en rojo y dos saltos de línea comidos en bloques de comandos"
tags: [sesion, documentacion, estructura]
timestamp: 2026-09-21T23:30:00Z
feature: null
---

# Sesión 2026-09-21: ordenar la carpeta

## Hecho

- **41 archivos movidos con `git mv`** (git los registró como renombres, así que el historial de cada uno
  sigue entero). La raíz pasó de **14 `.md`/`.pdf` a tres**: `CLAUDE.md`, `README.md` y
  `Levantamiento_Activos_Informacion.md`, que son las tres puertas de entrada.
  - `Auditoria/` — los cinco informes que **miden** (bootstrap y su cierre, código fuente, código muerto,
    generadores en la app).
  - `Regresiones/` — los dos que cotejan **definición contra implementación** y dejan hallazgos:
    `Inconsistencias_Motor_Otorgamiento.md` y `Revision_Definiciones_2026-09-11.md`. El segundo estaba en
    `Specs_Procesos/`, donde un hallazgo abierto se lee como si fuera norma.
  - `Integraciones/` — los cuatro PDF de contrato que estaban en `Specs_Procesos/` (APIs y SFTP v1.0/1.1/1.2
    y API Usuarios/Apoderados): el tema manda sobre el formato.
  - `Specs_Procesos/<tema>/` — **cinco temas**: `Otorgamiento`, `Verificacion`, `Lineas`, `Excepciones` y
    `Evaluacion_Factura`, que es el transversal del proceso de evaluación (ciclo, inbound, pricing, giro,
    mensajería). `Analisis_Solicitud_Linea_Comite.md` bajó de la raíz a `Lineas/`.
- **Un `README.md` por carpeta nueva** (`Auditoria/`, `Regresiones/`, `Specs_Procesos/`) que dice qué vive
  ahí, **con qué criterio** y qué NO va: sin eso, la próxima sesión archiva por parecido y en tres
  movimientos la separación se deshace.
- **Las referencias, reparadas contra una medición y no a ojo.** Un verificador (en el scratchpad de la
  sesión) extrae toda referencia con forma de ruta de los archivos versionados, la resuelve contra el árbol
  y **la contrasta con el árbol anterior**: así separa lo que rompió la mudanza de lo que ya estaba roto.
  **77 rotas** por el movimiento → **63 reparadas**, 5 falsos positivos (texto visible de un enlace, no su
  destino) y **9 dejadas a propósito**.
- `vault/conocimiento/mapa_documentos.md` abre ahora con una tabla de **dónde vive cada cosa** y dice que
  los logs y los ADR citan las rutas anteriores: ningún nombre de archivo cambió, sólo la carpeta.

## Decisiones tomadas con el usuario

- **`Integraciones/` queda en la raíz**, no bajo `Specs_Procesos/`. Es el contrato con el servidor, lo
  consumen `armar_integraciones.mjs`, `protect_paths.mjs` y `regla_12.test.mjs`, y moverlo era churn sin
  ganancia. Sus `spec_*.md` se quedan con él por la misma razón.
- **Las carpetas van sin tilde** (`Auditoria`, `Verificacion`, `Lineas`, `Evaluacion_Factura`): ninguna ruta
  del repo llevaba tilde, y el usuario trabaja en Windows con un checkout LF.
- **Los logs de `vault/sesiones/` y los ADR no se reescriben.** Un log dijo «escribí
  `Specs_Procesos/spec-gestion-excepciones.md`» y eso es lo que pasó ese día; cambiar la ruta afirmaría que
  el archivo siempre estuvo donde está hoy. Los ADR además son inmutables por la regla 7 y por el hook. Lo
  que resuelve la ruta vieja es la tabla del mapa: el nombre del archivo no cambió.

## Errores encontrados y su solución (regla 11)

- **`main` llegaba con el paso 0 en ROJO.** `npx prettier --check` fallaba en `origin/main` antes de tocar
  nada: dos líneas de `pipeline_comercial.jsx` (11296-11297) estaban partidas a mano después de formatear.
  Se comprobó que era anterior corriendo el check sobre la versión sin modificar (`git stash push -- <archivo>`,
  check, `git stash pop`) — ése es el gesto para no acusarse de un rojo ajeno. Arreglado con
  `npx prettier --write`. **Cuidado al medirlo:** copiar el `.jsx` al scratchpad y correr Prettier ahí da un
  diff enorme y falso, porque `.prettierrc` no viaja: el archivo tiene que quedar DENTRO del repo.
- **Dos saltos de línea comidos en bloques de comandos**, también de antes. En `CLAUDE.md` el paso 6 (los
  e2e) estaba pegado al final del paso 5, así que el bloque canónico de verificación mostraba **ocho**
  líneas y no nueve — copiarlo daba un comando que no corre. Lo mismo en `README.md` y una fila de la tabla
  de `.claude/rules/testing.md`. Los tres restituidos.
- **Un carácter cirílico se coló al escribir** («cotejа» con `а` U+0430) en el mapa de documentos. No lo
  caza ningún gate y en pantalla es idéntico. Se detecta recorriendo el texto y pidiendo el nombre Unicode
  de todo lo que pase de ASCII; quedó en el barrido de cierre.
- `Integraciones/Integraciones_APIs_y_S3.md` es **generado**: se corrigieron sus dos fuentes
  (`spec_s3_verificacion.md`, `spec_swagger_consulta_lineas.md`) y se regeneró con `armar_integraciones.mjs`.
  Editarlo directo lo bloquea el hook, y con razón.

## Pendiente / siguiente paso

- Los PDF de los `.md` que cambiaron se regeneraron con `md_a_pdf.mjs`. Si alguien toca uno de esos `.md`,
  el PDF va en el mismo commit.
- **Dos cifras que se corrigieron de paso** porque contradecían la medición (regla núcleo 2): el mapa decía
  «los 11 specs» de `Integraciones/` y son **12**; el `README.md` decía «7 hallazgos abiertos» del motor de
  otorgamiento cuando **INC-01 a INC-07 están cerrados** desde el 11-09-2026 (lo abierto son los parámetros
  que la política declara sin definir, §5 del documento).
- Queda, del usuario: el tag `v0.1.0` desde Windows y borrar las ramas integradas (el proxy da 403).

## Sorpresas y aprendizajes

- **Mover archivos es barato; las referencias no.** 41 movimientos rompieron 77 referencias en 25 archivos,
  y **ninguna la habría encontrado `grep` de un nombre**: la mitad eran rutas relativas que resolvían por
  ser hermanas (`./spec-otorgamiento.md`) y dejaron de resolver sin que cambiara una letra del texto. El
  verificador diferencial —resolver contra el árbol viejo y contra el nuevo— es lo que hace la diferencia
  entre reparar y creer que se reparó.
- **Un enlace Markdown tiene dos mitades y sólo una es una ruta.** Reemplazar el nombre en el texto visible
  (`` [`spec-x.md`](../Tema/spec-x.md) ``) produce un enlace que funciona y se lee mal. La regla que quedó
  en el reparador: el texto visible no se toca, el destino sí.
- El repo ya tenía el hábito de un `README.md` por carpeta (`Capturas_UI/`, `Legado/`, `GeneradorDatos/`).
  Lo que faltaba no era la carpeta sino **el criterio escrito de qué entra**: sin él, «auditoría» y
  «regresión» se confunden en el primer documento nuevo.
