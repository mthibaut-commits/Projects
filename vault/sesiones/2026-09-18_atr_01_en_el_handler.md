---
type: sesion
title: "ATR-01 en el handler, y el campo que decía dónde vivía el control mentía en cuatro de doce"
description: "La autorización de un descuento se comprobaba sólo para dibujar el botón: autorizarJefe escribía condAutJefe sin volver a preguntar, y lo preguntaba contra un prop. Se extrae un predicado puro, se cablea en el handler, y el campo `aplicado` de INVARIANTES —que decía quién hace cumplir cada invariante— pasa a estar gateado tras encontrarse desfasado en cuatro"
tags: [sesion, contrato, atr-01, regla-24, invariantes]
timestamp: 2026-09-18T21:10:00Z
---

# ATR-01 en el handler

## Cómo se llegó acá, y el error de método que conviene no repetir

La sesión empezó por otro lado: el tablero decía que `validarMutacion` tiene **un solo call site**, y de ahí
salió la hipótesis de que los invariantes del contrato estaban declarados y sin invocar. Medirlo dio algo más
preciso: cada invariante declara en `aplicado` **dónde se hace cumplir hoy**, y cinco decían `ui`.

Entonces se propuso partir por **VER-01 y ATR-01**, «las dos donde equivocarse mueve plata». **VER-01 ya estaba
hecho**: se cablea en `etapaTrasFirma` desde el arreglo de las tres compuertas (caso 88). El campo decía `ui` y
el código se había movido sin él. O sea: *se tomó por cierto un campo de documentación en vez de medirlo*, que
es exactamente el modo de falla que el repo lleva tres auditorías persiguiendo. La lección no es «revisar mejor»:
es que **un campo que nadie gatea no es evidencia**, y usarlo para priorizar es construir sobre él.

## El defecto real

`autorizarJefe` —el handler del botón «Autorizar condiciones»— hacía:

```js
const autorizarJefe = () => {
  setAutorizSig(condSig);
  registrarAuditoria({ … });
  if (deal) { deal.condReqAutJefe = false; deal.condAutJefe = true; }
};
```

Sin volver a comprobar nada. El único control era `puedeAutorizar`, que decide si el botón **se dibuja**, y que
además se calculaba así:

```js
const puedeAutorizar = requiereGerente ? esGerente : esJefe;
```

`esJefe` es un **prop**. Dice «esta pantalla cree que eres jefe», que no es lo mismo que tener hoy la atribución:
una sesión vieja, un rol revocado o un reemplazo vencido autorizaban el descuento igual. Y lo que se escribe
—`condAutJefe`— es lo que después deja publicar la oferta. Es la **regla 24** al pie de la letra: *la pantalla
que apaga el botón no es el control*.

## El arreglo

`puedeAutorizarCondiciones(code, estado)` de nivel módulo y **puro**: el rol exigido sale del ESTADO de la
atribución y la atribución sale del **padrón** por código. Lo consultan el render **y** el handler, que ahora
corta y **audita el rechazo** —una autorización que no ocurre y no deja rastro no la ve nadie—. El prop `esJefe`
quedó sin lector en `SimResumen` y se podó, con su cómputo en el call site.

Dos capas, porque ninguna ve lo de la otra:

- **Caso 143** (la suite): el predicado en **las dos direcciones** —la jefatura no alcanza el tramo de gerencia,
  nadie autoriza `bajoMinimo` ni `ok`, un código que el padrón no conoce falla **cerrado**, y el permiso
  **sigue al rol** (se le quita la atribución a JG y se le devuelve).
- **`regla_atr_01.test.mjs`** (contrato): que alguien lo **pregunte antes de escribir**. La suite no puede verlo
  —vive en un closure de un componente—, así que se fija sobre el texto: índice de la guarda < índice de
  `setAutorizSig` y de `condAutJefe`, que la guarda **corte** (`return`), que el rechazo se audite nombrando
  ATR-01, y que el render use el mismo predicado. Seis sondas.

## El hallazgo que salió de rebote, y su gate

Corregir `aplicado` para ATR-01 obligó a mirar los doce. **Cuatro mentían**: OTG-01, OTG-02, VER-01 y ATR-01
decían `ui` teniendo guarda en el handler. Es el hallazgo 2.3 de la auditoría del bootstrap otra vez, en un
**campo** en vez de en una cifra, y con el mismo remedio que `cifras.test.mjs`: no un commit que copie el valor
correcto, sino un gate que lo mida.

La regla es de **una sola dirección** y por eso es barata: *si el código del invariante aparece en el fuente
FUERA de la tabla `INVARIANTES`, su `aplicado` no puede ser `ui`* —esa aparición ES la guarda o su auditoría—.
Al revés no se exige nada: un invariante que sólo vive en la tabla puede apoyarse legítimamente en la pantalla.
**El gate encontró el cuarto solo**: OTG-02 estaba clasificado a mano como «parcial» y se habría quedado en `ui`.

## Lo que queda abierto, medido y sin tocar

Dos invariantes siguen en `aplicado: "ui"`, y ahora es una afirmación gateada y no un descuido:

- **OTG-02** — el camino de la FIRMA re-comprueba el visado pendiente (caso 88), pero el **«Avanzar a» manual**
  de `moverEtapa` no.
- **GIR-01** — `moverEtapa` comprueba GIR-02 (la huella) pero **no la etapa de origen**: nada en el handler
  impide `moverEtapa(id, "giro")` desde una etapa que no sea Cesión. El menú lo esconde; eso es todo.

Los dos son el mismo arreglo que éste y no se hicieron acá para no ensanchar el cambio (ciclo de tarea, paso 4).

## La mezcla con la sesión paralela, y el fallo que dejó (regla núcleo 11)

Las dos sesiones tomaron el **mismo «siguiente entero libre»**: la otra agregó el caso 142 (la Bandeja Inbound
con tope, regla 36) y ésta también. Es la deuda 5 del tablero, tal cual. Quien mezcla después renumera: el 142
ya empujado se queda, y ATR-01 pasó a **143** —con sus citas en `invariantes.md`, en el comentario del predicado
en el `.jsx`, en `regla_atr_01.test.mjs` y en este log—.

**Causa y solución de lo que se rompió al resolver:** al concatenar los dos lados del conflicto en
`tests_asignacion_lineas.js` se perdió **la llave que cerraba el bloque del caso de ellos** —git cortó el
`<<<<<<<` justo después de ese `}`, así que no estaba en ninguno de los dos lados— y el archivo quedó
desbalanceado. `tsc`, el build y los 206 gates de contrato pasaron igual: la suite no se parsea en ninguno de
esos pasos, se evalúa en la página, y el síntoma fue un `SyntaxError: Unexpected token ')'` a 60 líneas de
distancia, en el `})();` del final. **`node --check tests_asignacion_lineas.js` lo localiza en un segundo** y es
lo que conviene correr al resolver un conflicto en ese archivo, antes de gastar dos minutos en la suite.

Y el **paso 0 se ganó el sueldo en su primera mezcla**: el fuente mezclado venía sin formatear —el otro lado
escribió antes del formateo— y `prettier --check` lo cazó antes de que nadie tocara un gate de texto.

## Verificación

0 `prettier --check` limpio · 1 `tsc` sin TS1 · 2 sin duplicados · 3 build 41,1 MB · 4 **206/206** contrato ·
5 **143/143** la suite · 6 **29/29** e2e · 7 las 11 capturas renderizan. `CASOS_ESPERADOS` sube de 142 a 143 y
es la decisión de haber agregado el caso, no un trámite. Las diez cifras que el gate `cifras.test.mjs` cazó
desfasadas (→143, 29→31 archivos de contrato, 21→22 gates por regla) se corrigieron en este mismo commit.
