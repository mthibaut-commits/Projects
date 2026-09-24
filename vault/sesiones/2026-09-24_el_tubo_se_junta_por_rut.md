---
type: sesion
title: "El tubo se junta por RUT: tres síntomas en una fila y una sola causa"
description: "Las filas «Sin clasificar» decían «4 deudores» con el desglose en 0/0/0, todas «Sin línea» y con el nombre del cliente donde va el código de la oportunidad. La agrupación juntaba por nombre y tiraba el RUT que el evento sí traía. Y sólo debe verlas el gestor del pipeline"
tags: [sesion, tubo, inbound, rut, regla-81]
timestamp: 2026-09-24T05:30:00Z
---

# El tubo se junta por RUT · regla 81

## Qué vio el usuario

Tres cosas en la misma fila del tubo, el 24-09:

> «¿Por qué se ven estas oportunidades en el pipeline?» — filas con **4 deudores · 5 facturas** y el desglose
> **0 Prime con línea · 0 Otros con línea · 0 deudores sin línea**, todas «Sin línea».
>
> «Es que ahí debiera ir el código de la oportunidad» — el subtítulo decía `OF-CONSTRUCTORA Y SERVICIOS
> NU?EZ SPA` donde la fila sana dice `OP-D95265-R2`.
>
> «Se están mostrando las sin clasificar al ejecutivo Carla y eso no debiera ser así: deberían mostrarse al
> ejecutivo gestor del pipeline, y sólo él ve todo lo que no tiene clasificación.»

Y una cuarta que no es de esta regla: el `NU?EZ`. Es el mojibake del padrón —38 de 1.983 identidades con `?`
donde va `Ñ`/`Ó`/`Í`, y `"CONSTRUCTORA Y SERVICIOS NU?EZ SPA"` está ahí literal— y se arregla re-extrayendo
del AEC, que no está commiteado. Queda en el tablero.

## Una causa

`agruparInboundPorCliente` —la función pura que junta el inbound en una fila por cedente— agrupaba por
**nombre** (`ev.cedente`) y juntaba a los deudores por **nombre** (`ev.pagador`), y **tiraba el RUT que el
evento del inbound sí trae** (`rutEmisor`) y el `opId` que ya venía calculado del RUT. De ahí los tres
síntomas:

- la fila salía sin `rutEmisor`, así que `capacidadDeudores` salía por su guarda —`if (!rutCliente) return
  vacio`— y el desglose quedaba en cero bajo un encabezado que la agrupación sí había contado;
- `lineaDeCliente(deal)` lee `deal.rutEmisor`: sin él, «Sin línea», para todas;
- el `id` era `"OF-" + nombre`, y el subtítulo dibuja `{tag} {id}`.

**No es que no tuvieran línea: nadie podía preguntar por ella.** Es la regla 46 —el RUT se resuelve, nunca se
arma— aplicada al cedente, y uno de los 8 sitios del T1 «join de empresas siempre por RUT».

Y el evento tampoco traía el RUT del **deudor**: la fila del A1 tiene `RUTRecep` y el constructor del stream
copiaba la razón social y no el RUT. Se agrega `rutRecep`.

## Lo que quedó

- La clave de agrupación es `rutEmisor`, con el nombre sólo de respaldo cuando el evento no trae RUT. La fila
  lleva `rutEmisor` y su `id` es el `opId` del evento. Los deudores se juntan por `rutRecep` y cada uno lleva
  su `rut`; `analisisDeudoresDeDeal` prefiere ese `rut` antes que resolverlo por nombre.
- **Las dos direcciones, en el caso 178:** el mismo RUT escrito de dos formas («NUÑEZ» y «Nunez») es UN
  cedente —antes eran dos filas—, y el mismo nombre con dos RUT son DOS cedentes —lo que un join por nombre
  nunca podía distinguir—. Y con la fila armada así, `capacidadDeudores` clasifica a los deudores en algún
  tramo en vez de devolver el vacío.
- **Quién las ve:** sólo el **gestor del pipeline**, que es el ROL `inbound` —Tomás Alcaíno · Ejecutivo de
  Inbound— más el admin, y ve TODO lo sin clasificar. `esGestorPipeline(code)` sigue al rol y no al código
  `IB`, por lo mismo que el super-admin es un rol (21-09-2026). Para los demás el filtro «Otras facturas» queda
  vacío y su tooltip dice por qué; ya no hay «Otras Empresas» para la ejecutiva con las de su cartera.
- **Y el desglose cuadra, siempre.** Con el join a medio verificar el usuario mandó otra fila igual —`SOC ALTAMIRANO
  Y SOTO LTDA · 7 deudores · 7 facturas` y 0/0/0— con la pregunta correcta: «¿cómo puede ser? eso siempre debiera de
  cuadrar». Pasarle el RUT arregla ESA fila; la invariante es del motor. `capacidadDeudores` devolvía el vacío en
  dos guardas —sin RUT del cliente y sin su estado de líneas— y el lector no distingue «no hay» de «no se pudo
  preguntar». Ahora, cuando nadie puede tener línea, los N deudores van a «sin línea» con todo su monto; el vacío
  queda sólo para cero deudores. El caso 100 fijaba el comportamiento viejo en su borde (`sinLinea.n === 0` sin RUT)
  y se cambió a `=== 1`: es una decisión, no un ajuste.
- `regla_81.test.mjs`: la clave por RUT, el `opId` como id, `rutRecep` en el evento, los deudores por RUT y la
  visibilidad por rol, cada uno con su sonda. Se escribió **en rojo** antes de tocar el fuente, y una de sus
  sondas —la de `rutRecep`— pasaba ANTES de implementar: el literal `rutRecep: r.RUTRecep,` ya existía en otro
  constructor (`facturaDeDTE`) y la sonda quitaba ése. Ahora quita la ocurrencia más cercana al `opId`, que es
  la de este constructor. Una sonda que pasa en rojo no vigila nada.

## Lo que asumí

«El ejecutivo gestor del pipeline» no está definido en el vault. Lo tomé como el rol `inbound`, que es el único
que existe con ese sentido. Si es otro cargo, `esGestorPipeline` es el único sitio que cambia.

## Verificación

Prettier y ESLint limpios · `tsc` sin TS1 · 0 duplicados · build OK · **608/608** gates de contrato (con los 7 de
`regla_81`, cada uno con su sonda) · suite **178/178** · e2e **39/39** · `Capturas_UI/` regeneradas (las once vistas:
cubren también los cinco de UI del commit anterior, que las había dejado sin regenerar).
