---
type: sesion
title: "La asignación de giros se congela en la inyección: GIRO_STATE gana su escritor"
description: "Consecuencia directa de la regla 37. repoGiro sólo se hidrataba y giroDeal no tenía llamador: la regla «el congelado gana» estaba probada con estado inyectado y no ocurría en ninguna pantalla. Ahora aprobarIntegracion la congela y los dos lectores la consultan por una sola fuente"
tags: [sesion, giro, regla-37, tesoreria]
timestamp: 2026-09-19T03:30:00Z
---

# El congelado gana, y ahora existe

## Por qué esto ya no era una decisión

Venía en el tablero como pendiente de producto —*«cablearlo pide decidir cuándo congela: ¿al aceptar? ¿al
firmar?»*—, y la **regla 37** lo contestó sin que hubiera que preguntar nada: NEX termina en la **inyección**
a Tesorería, y el paquete que vale es el que se entrega. Así que el instante es ése y no otro.

## Lo que estaba roto, y de una forma peculiar

`giroDeal` sabía desde siempre que el congelado gana —su comentario lo dice: *«recalcular una operación
aceptada movería una cifra que Tesorería ya tomó»*—, pero **nadie lo llamaba**. Y `repoGiro` sólo se
hidrataba: `GIRO_STATE` **no tenía escritor**. O sea que la regla estaba probada por la suite con un estado
inyectado a mano y **no ocurría en ninguna pantalla**. El que dibuja es `giroResumenDeal`, que recalculaba
siempre.

Es el mismo patrón que apareció tres veces esta semana: una regla escrita, probada, y sin ocurrir.

## El arreglo

- **Escritor**: `aprobarIntegracion` —el botón de Operaciones— guarda en `repoGiro` la asignación tal como
  está en ese instante, con quién la aprobó y cuándo.
- **Una sola fuente**: `giroCongelado(deal, estado)`. La consultan **los dos** lectores, porque dos copias
  de «gana el congelado» se desfasan — que es exactamente lo que este repo lleva una semana corrigiendo.
- **Se consulta PRIMERO**: antes del cálculo, antes del memo y **antes de exigir simulación**. Ése fue el
  único punto donde el primer intento falló, y el caso lo cazó: había puesto la consulta después de
  `if (!deal || !deal.simulado) return null;`. Está mal por una razón de dominio, no de orden: una
  asignación congelada **existe porque la operación se inyectó**, y eso es un hecho del otro sistema —
  sigue siendo lo que se giró aunque el paquete de esta pantalla cambie después.

## El caso 146

Prueba el cortocircuito con un congelado **plantado que contradice al cálculo** (una cifra imposible: si el
lector recalcula, no aparece), en los dos lectores; que sin congelar ninguno se declare congelado; que el
helper sea la única fuente y devuelva `null` para otro id; que consultar no escriba; y que un deal sin nada
que repartir dé `null` en vez de inventarse un giro cero — que es la diferencia entre «no hay» y «cero».

Un tropiezo de método que vale anotar: el caso se escribió contra `DEALS_TEST` y contra `giroListaDeal`, y
**ninguno de los dos existe** — la función se llama `giroResumenDeal`. Los dos errores los dio el rojo en
segundos, que es para lo que el rojo sirve; escribir el caso después de la implementación los habría
escondido detrás de un verde.

## Verificación

0 `prettier --check` limpio · 0-bis `eslint` 0 hallazgos · 1 `tsc` sin TS1 · 2 sin duplicados · 3 build ·
4 **208/208** contrato · 5 **146/146** la suite · 6 e2e. `CASOS_ESPERADOS` sube de 145 a 146.

## Cuatro documentos que el arreglo dejó mintiendo

Cablear la regla convirtió en falsas varias frases escritas cuando NO estaba cableada. Se corrigieron en el
mismo commit (regla núcleo 2: gana la medición), y vale la pena el inventario porque el patrón se repite —
**arreglar algo desactualiza lo que lo describía, y eso no avisa**:

- `tests/contract/auditores.test.mjs`, la justificación de `BASE_MUERTOS`. Decía que `GIRO_STATE` *«tampoco
  tiene escritor»* y que la congelación *«no ocurre en ninguna pantalla»*: las dos dejaron de ser ciertas, y
  la pregunta que la nota dejaba abierta —*«¿congela al aceptar, al firmar?»*— está contestada. `giroDeal`
  **sigue** en la línea base, pero por otro motivo: ya no es un hallazgo de producto sino un candidato a
  poda, porque devuelve la misma forma que `giroResumenDeal` con una rama viva que calcula sin el prorrateo
  por factura. No se podó acá: borrar un símbolo de nivel módulo se verifica con las capturas, y ensanchar
  el cambio por el camino es justo lo que el ciclo prohíbe.
- `Auditoria_Codigo_Muerto.md`, el hallazgo **1.5**, que seguía marcado **Abierto** con la glosa «la
  congelación del giro no ocurre en el producto». Ahora ocurre.
- El comentario de `GIRO_STATE` en el fuente, que prometía una forma más angosta (`{ tipos, montoGirar, ts,
  por }`) que la que efectivamente se guarda — la salida entera de `asignarGiros`. Un comentario que
  describe una forma más chica que la real es el que hace que alguien lea un campo que cree ausente.
- El comentario de `giroDeal`, que decía *«la congelada si el cliente ya aceptó»*. **La aceptación del
  cliente no congela nada**: congela la aprobación de Operaciones. Y estaba mal colocado: al insertar
  `giroCongelado` entre el comentario y su función, quedó describiendo a la función equivocada.

Aparte, `vault/conocimiento/verificacion.md` enumeraba la suite caso por caso hasta el **141** y saltaba a
«Última corrida: 146/146». Los **142–146** llevaban sin describirse desde que se agregaron — la cifra estaba
gateada (`cifras.test.mjs`) y el inventario no. Se completaron los cinco.

## Una comprobación que no hizo falta pero se hizo

El congelado se calcula sobre `d0`, la oportunidad **antes** de moverla a `giro`. Si la asignación dependiera
de la etapa, congelaría un valor calculado bajo la etapa vieja. No depende: ni `girosDeDeal` ni `asignarGiros`
leen `deal.stage`; aparece sólo en la **firma del memo** de `giroResumenDeal`, que es una clave de caché y no
una entrada del cálculo. Queda escrito para que la próxima sesión no lo vuelva a mirar.

Y el escritor está **después** de los dos controles que ya existían —la atribución de Operaciones N3 (OTG-01)
y la evidencia de contrato (GIR-02)— y después del `integracion !== "pendiente"`: una integración rechazada no
congela nada, y una segunda llamada no llega. La idempotencia no se programó, se heredó de la guarda.
