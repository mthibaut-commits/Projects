---
type: sesion
title: "Sesión 2026-09-17 — Auditoría de bootstrap agéntico y partición de CLAUDE.md"
description: "Se analizó el repositorio contra el skill agentic-repo-bootstrap-v2, se entregó la auditoría y se partió CLAUDE.md por vida útil abriendo el vault: 398 de 398 líneas reubicadas verbatim"
tags: [sesion, bootstrap, claude-md, vault]
timestamp: 2026-09-17T15:29:14Z
feature: null
---

# Sesión 2026-09-17: auditoría de bootstrap y partición de `CLAUDE.md`

## Hecho

- **Auditoría** (`Auditoria_Bootstrap_Agentico.md` + PDF, commit `b1b6446`): el repositorio —no el producto—
  contra los seis objetivos del skill. Siete hallazgos medidos y reproducibles (§10); antes de opinar se corrió la
  verificación completa: `tsc` limpio, 0 duplicados, build 40,6 MB, 114/114.
- **Partición de `CLAUDE.md`** (este commit), por vida útil, a nivel de regla y verbatim:
  - **Método**: un script determinista por rangos de líneas (`partir_claude_md.mjs`) copia cada línea del original a
    exactamente un destino; una sonda (`sonda_nada_perdido.mjs`) comprueba que cada línea de contenido del original
    aparece **exactamente una vez** en el conjunto {`CLAUDE.md` nuevo, `vault/**`, `.claude/rules/**`}. Los dos viven
    en el scratchpad de la sesión (son de un solo uso); el método queda acá y en el mensaje del commit.
  - **Resultado**: 426 → 98 líneas; 229.306 → 7.941 bytes (3,5 %); **398/398** líneas de contenido reubicadas una
    vez; 8/8 encabezados ubicados; 0 perdidas, 0 duplicadas.
  - **Destinos**: 10 archivos de reglas por tema en `vault/conocimiento/reglas/`; `invariantes.md` (índice: 60 reglas,
    39 con caso en la suite —30 citadas en su texto, 9 inferidas del título del caso—, 21 sólo por revisión; y los 12
    invariantes del contrato, 8 sin gate); `arquitectura.md`, `verificacion.md`, `contrato_servidor_y_auditoria.md`,
    `mapa_documentos.md`; `.claude/rules/code_style.md` (se carga al tocar el fuente, la suite o los `.mjs`).
  - **Vault mínimo**: `index.md`, `conocimiento/index.md`, `adr/` (ADR-0001 + registro de 29 decisiones cerradas con
    punteros), `sesiones/` (tablero + este log). Sin hooks, tests, CI ni plantillas: lo eligió el usuario.
  - `README.md`: dos punteros que apuntaban a contenido que se movió.
- Verificación completa sobre el fuente después de todo (no se tocó, y eso se prueba, no se afirma): 0 duplicados,
  build 40,6 MB, 114/114 PASA; `tsc` relanzado aparte — ver abajo.

## Decisiones tomadas con el usuario

- «Nada todavía, quiero el informe» → la auditoría como `.md` + PDF, convención de la casa (17-09).
- «ahora parte CLAUDE.md» → la opción «partir primero» de la auditoría: sólo hallazgos 1–3, sin gates ni hooks (17-09).
- Registradas en ADR-0001 como decisiones de esta partición: verbatim y por tema, no por género; sin renumerar; todo
  en español aunque el skill pida inglés en código y commits.

## Errores encontrados y su solución (regla 11)

1. **La auditoría contó 59 reglas; son 60.** La regla 17 no lleva negrita y el grep `^[0-9]+… \*\*` no la vio. No
   cambia ninguna conclusión; el índice cuenta 60 y la auditoría queda como está (es un documento fechado).
2. **El script de partición leyó el `CLAUDE.md` NUEVO en su segunda corrida** —el original ya estaba reemplazado— y
   la guarda de anclas («la línea 45 no empieza con `1. `») lo detuvo antes de escribir nada. Solución: la fuente entra
   por parámetro (`CLAUDE.md.orig`). Lección: un script que transforma un archivo en sitio lee una copia congelada.
3. **Una tubería dentro de un code span en una celda de tabla** (`sort | uniq -d`) partía la tabla de la auditoría:
   el conversor la toma como separador salvo escapada, y escaparla deja el comando no copiable. Para `CLAUDE.md` los
   comandos con `|` van en un bloque de código, no en tabla.
4. **La columna «casos» del índice, extraída sólo del texto de cada regla, dejaba 30 sin gate** cuando la suite las
   cubre (la 7, la 6, la 19…). Se enriqueció con los títulos `ok("N …")` de `tests_asignacion_lineas.js`, marcando lo
   inferido con `~` para que nadie lo confunda con una cita.
5. **El log de la verificación en background no conservó la salida de `tsc`** (512 bytes; empieza en `DUPLICADOS=0`).
   No es un fallo de `tsc` —el `grep -c "error TS"` da 0— pero «no está el error» no es «pasó»: se relanzó aparte y
   salió **limpio (exit 0, 0 errores TS)**.

## Pendiente / siguiente paso

- Ver el tablero (`estado_actual.md`). Nada quedó a medias.

## Sorpresas y aprendizajes

- **Las reglas no se pueden partir por género sin reescribirlas**: regla, porqué e historia van oración por oración.
  La partición útil y segura es por tema, verbatim, y la separación fina se aplaza a cuando se toque cada regla.
- **Renumerar habría roto 68 punteros**: 47 `regla N` en el fuente y 21 en otros `.md`. Conservar el número es lo que
  hace grepeable el vault (`grep -rn "^13-ter\." vault/`).
- **El README tiene cuatro cifras desfasadas más** (30 casos, 21.000/118, 24 MB, «7 hallazgos abiertos»): el mismo
  defecto que `CLAUDE.md`, en otro documento. Anotado en el tablero, no corregido (no era el alcance).
- **Con un solo archivo fuente, `.claude/rules/` con globs discrimina poco**: casi toda sesión toca el `.jsx`. El
  ahorro real es el vault por tema, leído a demanda — por eso la regla núcleo 3 dice «leer el tema ANTES de tocar».
- La primera corrida de la suite se guardó con `tail -30` y perdió 86 títulos; los títulos están en el propio archivo
  de la suite (`ok("N …")`), que es de donde hay que sacarlos.
