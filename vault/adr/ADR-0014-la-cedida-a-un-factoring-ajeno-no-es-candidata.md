---
type: adr
title: "ADR-0014 · La factura cedida a un factoring ajeno no es candidata del inbound; la cedida a Security sí"
description: "Cierra el desfase con el PDF de política que los specs dejaban abierto: el inbound excluye la factura ya cedida a otro factoring y NO excluye la cedida a Factoring Security; la cesión ajena deja de detectarse recién al incorporar"
tags: [adr, inbound, cesion, candidatura, curse]
estado: aceptado
timestamp: 2026-09-22T22:30:00Z
---

# ADR-0014 · La factura cedida a un factoring ajeno no es candidata del inbound; la cedida a Security sí

## Contexto

`spec-inbound-facturas.md` §12.1 y `spec-ciclo-factura.md` §23c dejaban anotado un desfase con el PDF de
política: el inbound **no excluye** la factura ya cedida a otro factoring —sólo mira reclamo y nota de
crédito— y la cesión se detecta después, al incorporarla a la oferta, donde sí se distingue la cesión
propia de la ajena (caso 95). El modelo del usuario (M-09) dice «candidata siempre y cuando no esté
cedida a otro factoring». Al revisar la diferencia, el usuario decidió (22-09-2026):

> «Sólo si está cedida a una empresa diferente a Factoring Security; si está cedida a Security sí se
> puede agregar.»

## Decisión

- El filtro de candidatura del inbound suma una cuarta condición: **la factura no está cedida a un
  factoring distinto de Factoring Security** (según el AEC, activo A2).
- Una factura cedida **a Security** no se excluye: es candidata como cualquier otra.
- La distinción propia/ajena que hoy vive en la incorporación a la oferta pasa a aplicarse también en
  el inbound, con la misma fuente.

## Alternativas descartadas

- **Excluir toda factura cedida**, propia o ajena. Descartada por el usuario: la cedida a Security entra.
- **Dejar la cesión sólo como bloqueo al incorporar** (estado actual). Descartada: infla el
  dimensionamiento de la oportunidad con facturas que nunca se van a poder comprar.

## Consecuencias

- Cambian `facturaCalifica` / el criterio «Buena factura» de `CRITERIO_PRED` y el spec del inbound (§3,
  §11 fila 1, §12.1: el desfase se cierra). Cierra la decisión D6 del spec del curse.
- Gate: un caso de la suite con una factura cedida a un competidor (no candidata) y una cedida a
  Security (candidata), sobre el A2 real.
