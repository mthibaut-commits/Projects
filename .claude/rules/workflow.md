# Flujo de trabajo

> La **escalera de ceremonia** y el ciclo de una tarea. Existe porque «T3» se usaba en el tablero, en
> `vault/conocimiento/flujo_git.md`, en el comentario de `gitflow_guard.mjs` y en cinco mensajes de commit,
> y **T1 y T2 no aparecían en ninguna parte**: una sesión nueva leía «commit T3», no encontraba qué era, y
> elegía entre inventarlo o cobrar el paquete completo. Las dos salidas son malas.
>
> Las **mecánicas** de git (ramas, `merge --no-ff`, qué bloquea el hook) están en
> `vault/conocimiento/flujo_git.md` y no se repiten acá. Acá va **cuánta ceremonia lleva un cambio**.

## La escalera

| Nivel | Qué es acá | Qué lleva |
|---|---|---|
| **T1** | Un **motor** (`asignarLineas`, `verifDecision`, `asignarGiros`, `prorratearOperacion`), un **invariante del contrato** con el servidor, o un cambio que altera qué decide el sistema | Regla nueva en `vault/conocimiento/reglas/<tema>.md` con su fila en `invariantes.md` · **gate** (caso de la suite, `e2e-<regla>` o `regla_<slug>.test.mjs`) · **ADR** si hubo alternativas descartadas · rama propia · verificación completa · log de sesión |
| **T2** | Una **regla del catálogo** de otorgamiento, una fila de configuración del tenant, un rótulo, una pantalla, un gate nuevo | Rama corta · **un commit verde** · su fila en el tablero · gate si la regla lo pide (regla núcleo 8) |
| **T3** | Un typo, una anotación, el **tablero**, corregir una cifra | Commit directo sobre `main` con `GITFLOW_ALLOW=1`, **acordado con el usuario** |

**Cómo se elige el nivel, y no es por tamaño:** la pregunta es *¿qué pasa si esto está mal?* Si el sistema
decide distinto sobre la plata de alguien, es **T1** aunque sean tres líneas. Si se ve distinto pero decide
igual, es **T2** aunque sean trescientas. Si nadie puede actuar sobre lo que dice, es **T3**.

**El flujo `feature → spec → plan → tareas` del skill no está cableado, y es deliberado**: sirve para trabajo
que nace de un backlog, y el de NEX nace de una petición del usuario mirando su pantalla. El contrato que hay
que cumplir no es una spec nueva: son las reglas ya escritas, todas con gate. **Cuando llegue un T1 de
verdad** —un motor nuevo, un invariante nuevo— ahí se crea `vault/specs/<slug>/`, y no antes. Crear esos
directorios vacíos hoy es fabricar ceremonia.

## El ciclo de una tarea

0. **Integrar `main` antes de modificar** (skill `sincronizar-main`, `node sincronizar_main.mjs`; pedido del usuario,
   23-09-2026). Se trabaja sobre la base más actualizada: el script trae `origin/main`, mide la rama y dice qué
   comandos correr. Se repite justo antes de mezclar a `main`, y los números libres se toman después de integrar.
1. **Leer el tablero** (`vault/sesiones/estado_actual.md`). Es lo primero que lee toda sesión.
2. **Leer la regla que gobierna lo que vas a tocar**, ANTES de tocarlo: `invariantes.md` es el índice y
   `reglas/<tema>.md` el texto (regla núcleo 3). Casi todo lo que parece un defecto ya está explicado ahí,
   a veces como decisión tomada.
3. **El caso en rojo primero.** Un gate que se escribe después del arreglo fija la salida de hoy, no la
   regla — es el primero de los cuatro modos de falla medidos en `conocimiento/despacho_agentes.md`.
4. **El mínimo para verde**, y refactor en verde. No se ensancha el cambio por el camino.
5. **La verificación completa**, los seis pasos en orden y el séptimo si toca la UI. Ninguno subsume a otro.
6. **El commit dice qué y por qué**, en español, con el estilo del `git log` de la casa. Un snapshot que
   sube (`CASOS_ESPERADOS`, `BASE_MUERTOS`) es una **decisión** y se dice en el mensaje.
7. **Tablero y log.** El tablero se sobrescribe (≤80 líneas, no crece); la historia va al log de sesión; lo
   que en tres meses siga importando sube a `vault/conocimiento/`.

## El cierre de sesión

Antes de terminar —o antes de una compactación—: sobrescribir el tablero, dejar el log en `vault/sesiones/`,
y subir a `conocimiento/` lo que vaya a importar en tres meses. Un fallo inesperado se registra con **causa y
solución** antes de seguir: la próxima sesión no debe redescubrirlo (regla núcleo 11).

## Lo que ningún nivel compra

- **Ninguno exime de la verificación completa.** Un T3 sobre el tablero corre igual los gates de contrato:
  el tablero está gateado (≤80 líneas) y las cifras que cita también (`cifras.test.mjs`).
- **Un T2 no sube a T1 por ser largo**, ni baja a T3 por ser corto. Sube por lo que pasa si está mal.
- **`GITFLOW_ALLOW=1` no es un atajo**: es un escape consciente para un T3 **acordado**, y queda escrito en
  el comando. Rodear el hook de otra forma es lo que el hook existe para impedir.
- **Despachar agentes no cambia el nivel.** Un T1 orquestado sigue necesitando su regla, su gate y su ADR;
  lo que cambia es quién escribe cada parte (`vault/conocimiento/despacho_agentes.md`).
