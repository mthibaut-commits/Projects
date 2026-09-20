---
type: sesion
title: "La mezcla con main: tres colisiones de numeración a la vez, y 26 citas que apuntaban al ADR equivocado"
description: "35 commits de main contra 10 de esta rama sobre el mismo territorio. Lo caro no fueron los doce conflictos sino que reglas, casos de la suite y ADR colisionaron los tres; y que main había renumerado un ADR sin mover sus citas"
tags: [sesion, git, numeracion, adr, merge]
timestamp: 2026-09-20T06:30:00Z
---

# La mezcla, y lo que enseña sobre numerar en paralelo

## Tres colisiones, no una

La deuda del tablero decía «dos sesiones paralelas toman el mismo siguiente entero libre; quien mezcla
después renumera». Lo que no decía es que eso ocurre en **tres espacios de numeración independientes**, y
esta mezcla los golpeó los tres:

| espacio | `main` tomó | esta rama tenía | quedó |
|---|---|---|---|
| **reglas** | 36–39 (portada), 40 (Bandeja), 41 (controles) | 36 (Bandeja), 37 (giro), 42 (padrón) | su 36 **era** la 40 de main · 37 → **43** · 42 intacta |
| **casos de la suite** | 143, 144 | 143–147 | los de main se quedan · los míos → **145–149** |
| **ADR** | 0005 (portada), 0007 (controles), y movió formateo 0005 → 0006 | 0005 (formateo), 0006, 0007 | 0006 → **0008** · 0007 → **0009** |

La regla núcleo 3 dice «siguiente entero libre» pensando en las reglas. Vale igual para los casos y para los
ADR, y conviene decirlo: **son tres numeraciones y las tres se renumeran por separado.**

## El hallazgo que no buscaba: 26 citas huérfanas en `main`

`main` renumeró el ADR de formateo de 0005 a 0006 **y no movió ninguna de sus citas**. Veintiséis
referencias —`_comun.mjs`, nueve `regla_*.test.mjs`, `CLAUDE.md`, `testing.md`, `auditar_muerto.mjs`,
`eslint.config.mjs` y dos logs— seguían diciendo ADR-0005, que desde ese renombre es **la portada**. Cada
una mandaba a leer el documento equivocado, y ningún gate lo vio: **no hay gate que verifique que un
`ADR-000N` citado corresponde al documento que se quiere citar.**

Se corrigieron **por contexto**, no por búsqueda ciega: sólo las líneas que hablan de formateo, Prettier,
`canonico` o re-anclaje. Las que hablan de colores de marca se quedan en ADR-0005, que es lo correcto. Un
`sed` global habría roto las segundas — y de hecho mi primer intento lo hizo: convirtió citas legítimas de
`main` («regla 37» de «BIENVENIDO», «ADR-0007» de los controles) en las mías. Se detectó diffeando contra
`origin/main` los archivos que no debían cambiar, y se restauraron seis.

## El tropiezo caro: reconstruir un archivo pierde lo que no estabas mirando

`tests_asignacion_lineas.js` traía el conflicto justo en el borde de un caso y git dejó **una llave fuera de
los dos lados** — el `SyntaxError` sale en el `})();` del final, a 400 líneas del daño. Es exactamente lo que
`testing.md` documenta desde el 18-09.

Coser los hunks a mano no sirvió. Se reconstruyó desde los **tres estados completos** del índice (`:1:`
ancestro, `:2:` mío, `:3:` de main), que parsean solos: se tomó el de `main` y se le agregaron mis cinco
casos renumerados. **Y eso perdió mis ediciones a los casos 118, 119, 123 y 126**, que venían de commits
anteriores de esta misma rama. No lo vio ningún chequeo de sintaxis: lo vio **la suite**, con 147/149.

La recuperación fue mecánica una vez entendida: `diff ancestro→rama`, quitar el hunk de los casos nuevos
(ya aplicado), comprobar que `main` no tocó esas zonas —sus hunks estaban en otras líneas— y aplicar los
cinco restantes. Aplicaron limpio con un offset de una línea.

**La lección:** reconstruir un archivo desde un lado del merge es seguro para la SINTAXIS y traicionero para
el CONTENIDO. Lo que valida no es `node --check` sino correr la suite entera.

## Dos decisiones de contenido

- **`aprobarIntegracion` la tocaron las dos ramas.** `main` le puso la compuerta `controlesIntegracion`
  (regla 41); ésta, el congelado de la asignación de giros (regla 43). Se conservan las dos y el **orden**
  importa: la compuerta va primero, porque una integración rechazada no entrega nada y congelar antes
  dejaría una asignación «entregada» de una operación que no salió.
- **`regla_transiciones.test.mjs` se RE-ANCLA, no se afloja.** Exigía el rótulo «Integración bloqueada
  (GIR-02)», que desapareció cuando `main` metió las cuatro faltas en una compuerta. La regla no cambió
  —la huella se compara en el último punto útil— así que el gate pasa a exigir que `controlesIntegracion`
  nombre GIR-02 y que el handler la llame. Es el mismo criterio del ADR-0006 aplicado a un cambio de
  mecanismo en vez de a un cambio de formato.

## Verificación

0 prettier · 0-bis eslint 0 (entró `matchMedia`, que usa la portada de `main`) · 1 tsc sin TS1 · 2 sin
duplicados · 3 build · 4 **260/260** contrato · 5 **149/149** la suite · 6 e2e.
