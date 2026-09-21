---
type: conocimiento
title: "Contrato con el servidor (seguridad) y auditoría"
description: "Los 12 invariantes que el resolver debe implementar 1:1, el rate limit, la idempotencia, la inyección en planillas, la CSP y la regla de auditoría y logs"
tags: [conocimiento, seguridad, contrato, auditoria]
timestamp: 2026-09-17T15:29:14Z
---

# Contrato con el servidor (seguridad)

- **`INVARIANTES`** (12 códigos: TEN-01, RAT-01, IDM-01, LIN-01, OTG-01, OTG-02, VER-01, GIR-01, **GIR-02**, ATR-01, CRY-01, PRI-01) + `CONTRATO_VERSION`. Escriben en UN solo lugar el contrato que el resolver GraphQL debe implementar 1:1 con el MISMO código de error. Cada invariante declara su **autoridad**: `servidor` = la decisión es del backend y lo de acá es sólo anticipación; `cliente` = conveniencia de UX. **Esto no es un control de seguridad** (el atacante ES el cliente): `validarMutacion` anticipa el rechazo, no lo impone, y un evaluador que revienta nunca bloquea la operación.
- **El campo `aplicado` dice dónde se hace cumplir HOY** —`repositorio`, `motor`, `funcion`, `observado` o `ui`— y **está gateado desde el 18-09-2026** (`invariantes.test.mjs`). `ui` significa que el único control es que la pantalla esconda o apague la acción, y eso choca de frente con la regla 24: *la pantalla que apaga el botón no es el control*. El campo se había quedado atrás en CUATRO de doce —OTG-01, OTG-02, VER-01 y ATR-01 decían `ui` teniendo guarda en el handler, dos de ellas desde hacía semanas—, que es el hallazgo 2.3 otra vez, en un campo en vez de en una cifra. La regla del gate es de una sola dirección y barata: **si el código aparece en el fuente FUERA de la tabla, `aplicado` no puede ser `ui`**, porque esa aparición ES la guarda o su auditoría. Quedan dos en `ui` a propósito y son deuda conocida, no diseño: **OTG-02** en el «Avanzar a» MANUAL (`moverEtapa` no re-comprueba el visado pendiente; el camino de la firma sí, caso 88) y **GIR-01**, donde `moverEtapa` comprueba GIR-02 pero **no la etapa de origen**.
- `CONTRATO_LIMITES` / `RATE_BUCKETS` — rate limit holgado a propósito (cortar automatización, no la operación ni la simulación en ráfagas). `CONTRATO_FAMILIA` hace que los repositorios que se escriben SIEMPRE juntos compartan bucket, para que la escritura pareada no quede a medias.
- `IDEM_APLICADAS` — hoy sólo CUENTA duplicados; la idempotencia real necesita una clave del cliente que este código aún no emite.
- **A03 · Inyección en planillas** (`CELDA_PELIGROSA` / `celdaSegura` / `filaSegura`): Excel, LibreOffice y Sheets EJECUTAN una celda que empieza con `=`, `+`, `-`, `@`, TAB o CR. Como los exportes llevan razones sociales de fuera, se antepone apóstrofo. No es XSS en la app: es inyección en la herramienta del destinatario, y la app es el vector.
- CSP en `<meta>` (ojo: `frame-ancestors` se ignora ahí; contra clickjacking va como cabecera HTTP).

## Auditoría y logs

> Regla de dominio **17**, verbatim del `CLAUDE.md` anterior al 17-09-2026.

17. Teléfonos ofuscados en logs; timestamps absolutos (nunca relativos); auditoría vía `registrarAuditoria`, persistente y encadenada, con cola (`AUDIT_COLA`).
