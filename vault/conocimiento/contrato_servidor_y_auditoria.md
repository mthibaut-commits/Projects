---
type: conocimiento
title: "Contrato con el servidor (seguridad) y auditoría"
description: "Los 12 invariantes que el resolver debe implementar 1:1, el rate limit, la idempotencia, la inyección en planillas, la CSP y la regla de auditoría y logs"
tags: [conocimiento, seguridad, contrato, auditoria]
timestamp: 2026-09-17T15:29:14Z
---

# Contrato con el servidor (seguridad)

- **`INVARIANTES`** (12 códigos: TEN-01, RAT-01, IDM-01, LIN-01, OTG-01, OTG-02, VER-01, GIR-01, **GIR-02**, ATR-01, CRY-01, PRI-01) + `CONTRATO_VERSION`. Escriben en UN solo lugar el contrato que el resolver GraphQL debe implementar 1:1 con el MISMO código de error. Cada invariante declara su **autoridad**: `servidor` = la decisión es del backend y lo de acá es sólo anticipación; `cliente` = conveniencia de UX. **Esto no es un control de seguridad** (el atacante ES el cliente): `validarMutacion` anticipa el rechazo, no lo impone, y un evaluador que revienta nunca bloquea la operación.
- `CONTRATO_LIMITES` / `RATE_BUCKETS` — rate limit holgado a propósito (cortar automatización, no la operación ni la simulación en ráfagas). `CONTRATO_FAMILIA` hace que los repositorios que se escriben SIEMPRE juntos compartan bucket, para que la escritura pareada no quede a medias.
- `IDEM_APLICADAS` — hoy sólo CUENTA duplicados; la idempotencia real necesita una clave del cliente que este código aún no emite.
- **A03 · Inyección en planillas** (`CELDA_PELIGROSA` / `celdaSegura` / `filaSegura`): Excel, LibreOffice y Sheets EJECUTAN una celda que empieza con `=`, `+`, `-`, `@`, TAB o CR. Como los exportes llevan razones sociales de fuera, se antepone apóstrofo. No es XSS en la app: es inyección en la herramienta del destinatario, y la app es el vector.
- CSP en `<meta>` (ojo: `frame-ancestors` se ignora ahí; contra clickjacking va como cabecera HTTP).

## Auditoría y logs

> Regla de dominio **17**, verbatim del `CLAUDE.md` anterior al 17-09-2026.

17. Teléfonos ofuscados en logs; timestamps absolutos (nunca relativos); auditoría vía `registrarAuditoria`, persistente y encadenada, con cola (`AUDIT_COLA`).
