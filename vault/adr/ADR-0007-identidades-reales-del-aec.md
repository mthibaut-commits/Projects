---
type: adr
title: "ADR-0007 · Las identidades son pares reales del AEC; las transacciones siguen sintéticas"
description: "Reemplaza «nunca datos reales en fixtures» por un corte preciso: la identidad (RUT ↔ razón social) es real y viene del AEC de BICE Factoring; la transacción no. Las personas naturales quedan fuera"
tags: [adr, datos, padron, privacidad]
estado: aceptado
timestamp: 2026-09-20T03:40:00Z
---

# ADR-0007 · Las identidades son pares reales del AEC; las transacciones siguen sintéticas

## Contexto

El sistema traía **razones sociales reales de deudores con RUT inventados**. El tablero lo arrastraba como
decisión pendiente y `testing.md` lo congelaba en *«nunca datos reales en fixtures … mientras no se decida,
ningún test lo afirma ni lo niega»*. Al medirlo apareció que el estado era **peor** que «RUT sintéticos»:
de los 30.000 RUT de deudor del activo, el **51,5 %** caía fuera del rango de empresa y el **39,3 %** en
rango de **persona natural** — «Clorox Chile S.A.» llevaba `9.710.034-4`, que puede ser el RUT de alguien.

El usuario decidió: *«no inventes los RUT, toma pares de RUT y razón social que sean reales»*, y entregó el
AEC (REQ-15, 411.526 cesiones de BICE Factoring).

## Decisión

**La identidad es real; la transacción no.**

- **Entra al repo**: el par `RUT ↔ razón social`, en `GeneradorDatos/lib/padron.js`. Es registro público —
  aparece en cada factura electrónica— y es el mismo patrón que `lib/cesionarios.js`, que ya traía las 15
  instituciones reales del mercado.
- **No entra**: nada de las 411.526 filas. Ni folios, ni montos, ni fechas, ni quién le cedió a quién. Eso
  es la cartera comercial de BICE Factoring —su lista de clientes y sus volúmenes— y no tiene por qué
  viajar en una demo. Las operaciones se siguen generando sintéticas y deterministas (regla núcleo 9).
- **El AEC no se commitea.** El extractor sí, para que el origen sea auditable y repetible.

## Las personas naturales quedan fuera

Un empresario individual cede sus facturas con toda legitimidad y aparece en el AEC **con su nombre
completo y su RUT**. Eso es dato de una persona identificable, no la identidad pública de una empresa, y no
hay ninguna razón para que termine en una demo. Se excluyen **93**.

El corte es el RUT, y el archivo lo hace inequívoco: de los **93** cedentes bajo 30M, **cero** llevan marca
societaria (son «nombre + dos apellidos»); entre 30M y 50M no hay ninguno; los **9** del tramo 50–60M son
el **100 %** sociedades —varias extranjeras, `D2R INTERNATIONAL LLC`— y los **2.111** sobre 60M lo son en un
95 %. Así que el umbral va en **50.000.000**, y excluir el tramo 50–60M habría perdido empresas reales.

## Alternativas descartadas

1. **Inventar los RUT que faltaban.** Es lo que el usuario prohibió y tiene razón: un RUT equivocado
   atribuido a una empresa real es **peor** que uno sintético, porque parece verificado y nadie lo revisa.
   De los 23 deudores de la demo, el repo sólo podía sostener 3 con fuente (`s3_deudores_listas.csv`).
2. **Escribirlos de memoria.** La misma cosa con mejor cara. No se hizo ni uno.
3. **Copiar también las transacciones.** Habría hecho la demo más «real» y habría puesto la cartera de un
   cliente en un repositorio. El corte identidad/transacción es justo lo que evita esa conversación.
4. **Mantener los nombres grandes (Codelco, Falabella, Cencosud) y darles RUT reales.** No se puede sin
   inventar: el AEC trae `RazonSocialCedente` pero **no** `RazonSocialReceptor`, así que los deudores vienen
   con RUT real y sin nombre. Sólo 335 de 5.000 receptores se pueden nombrar —porque también aparecen como
   cedentes— y ninguno de los 15 receptores más grandes está entre ellos. El usuario eligió los **23 más
   grandes CON nombre**: la demo pasa a mostrar EBCO, Ingevec, Besalco y Santander-Chile en vez de los
   corporativos grandes, que es la cartera que el archivo realmente sostiene.

## Consecuencias

- `testing.md` § Datos deja de decir «nunca datos reales en fixtures»: dice **qué** clase de dato real
  entra y cuál no.
- El padrón es la **única fuente** de identidades, y un gate lo exige: `tests/contract/padron.test.mjs`
  comprueba que ninguna sea persona natural, que todo RUT tenga dígito verificador válido —1.983 de 1.983
  lo tienen, que es lo que distingue un RUT real de uno escrito a mano—, que las cuatro listas sean
  disjuntas y que el activo no use ninguna identidad que el padrón no declare. Cada una con sonda negativa.
- La migración (`migrar_padron.js`) queda commiteada aunque corra una sola vez: es el registro de cómo se
  llegó acá, y documenta las dos trampas que costó descubrir — que la identidad vive también en
  `lib/intencion_sow.js` y en `proveedores_clientes.json`, y que mapear por nombre habría fusionado las 50
  razones sociales que dos RUT distintos compartían.
- Efecto secundario que no se buscaba: esas 50 colisiones de nombre desaparecen, y el 100 % de los RUT del
  activo queda en rango de empresa.

## Gate

`tests/contract/padron.test.mjs` (9 tests, 4 sondas negativas) y la regla **42** de
`reglas/datos_y_activos.md`.
