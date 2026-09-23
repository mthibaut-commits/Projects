---
name: sincronizar-main
description: >
  Integra origin/main en la rama de trabajo ANTES de empezar cualquier modificación que vaya a terminar en main
  —código, vault, documentos, gates— para partir de la base más actualizada, y lo repite justo antes de mezclar
  la rama a main. Úsala al comenzar toda tarea que cambie archivos de este repo, al retomar una sesión o una rama,
  antes de tomar el siguiente número libre de una regla, un caso de la suite, un ADR o un archivo e2e, y cuando el
  usuario diga «sincroniza», «trae main», «actualiza la base» o «integra main». Also triggers on: sync with main,
  update the branch, rebase on main, pull latest main before starting work.
---

# Sincronizar con main antes de modificar

> Regla del usuario, 23-09-2026: «antes de partir con una modificación de la rama main debes integrar los cambios
> para que tu base sea lo más actualizada». Esta skill es esa rutina, y corre SIEMPRE: no depende del tamaño del
> cambio ni de su nivel de ceremonia (`.claude/rules/workflow.md`).

**Por qué no es un trámite.** El 23-09-2026 un bloque de reglas se renumeró dos veces en una misma integración
(60–71 → 63–74 → 64–75): otra sesión publicó en `main` mientras ésta trabajaba sobre una base vieja, y una
corrección de rótulo hubo que re-aplicarla a mano sobre el árbol renumerado. Cada minuto sobre una base vieja es
un minuto en que el «siguiente entero libre» puede dejar de serlo.

## Cuándo

1. **Al empezar una tarea que cambia archivos del repo**, antes de leer la regla que gobierna y antes del caso en
   rojo. Es el paso 0 del ciclo de una tarea.
2. **Antes de tomar un número**: regla, caso de la suite, ADR o archivo e2e. El script los calcula sobre la unión
   de la rama y `origin/main`.
3. **Justo antes de mezclar la rama a `main`.** Si `main` se movió mientras trabajabas, se integra de nuevo y la
   verificación completa se vuelve a correr sobre el árbol integrado (`vault/conocimiento/flujo_git.md`).

## Cómo

1. **Medir.** `node sincronizar_main.mjs` trae `origin/main`, mide la rama y dice qué hacer. No toca la rama ni el
   árbol. Sale con 0 si está al día, 3 si hay que integrar, 1 si hay que detenerse y 2 si no pudo traer `main`.
2. **Integrar según la acción**, con los comandos que imprime, **uno por uno**:

   | Acción | Cuándo | Qué se corre |
   |---|---|---|
   | al día | la rama ya contiene todo `origin/main` | nada |
   | avanzar | la rama no tiene nada propio | `git merge --ff-only origin/main` |
   | tomar main | todo lo propio ya está en `main` con un commit equivalente | `git merge -s ours --no-ff --no-commit origin/main`, luego `git read-tree -u --reset origin/main` y el commit |
   | mezclar | la rama tiene commits sin equivalente en `main` | `git merge --no-ff --no-commit origin/main`, resolver, `git add -A` y el commit |
   | detener | estás en `main`, HEAD desacoplado o árbol sucio con algo que integrar | lo que diga el motivo |

   El mensaje del commit lo escribe quien integra, en español y con las líneas de atribución de la sesión: dice
   qué trajo `main` y cómo se resolvió lo que chocó.
3. **Verificar lo integrado.** Re-leer el tablero (`vault/sesiones/estado_actual.md`), que otra sesión pudo haber
   cambiado, y correr `node --test "tests/contract/*.test.mjs"`. Antes del próximo commit con cambios, la cadena
   completa (regla núcleo 4): una mezcla produce texto que no está en ninguno de los dos lados.
4. **Volver a medir.** El script tiene que decir «al día». Ahí se leen los siguientes enteros libres.

## Resolver conflictos

- **Lo que ya entró a `main` no se re-aplica.** `git cherry origin/main HEAD` dice qué commits de la rama tienen
  un equivalente arriba (`-`) y cuáles no (`+`). `--merged` responde otra pregunta: si es ancestro.
- **Renumera quien integra después**, en un commit aparte y ANTES de mezclar, para que la renumeración se pueda
  revisar. El procedimiento y sus ocho formas de escribir un número están en
  `vault/sesiones/2026-09-23_mezclar_todo_lo_pendiente.md`.
- **Los logs de `vault/sesiones/` y los ADR no se corrigen**: son historia. Se toma la versión de `main`.
- **Una cifra que choca se mide**, no se elige entre los dos lados: `node --test tests/contract/cifras.test.mjs`
  dice cuál es.
- Si no se puede resolver con criterio —los dos lados cambiaron la misma lógica y elegir uno pierde conducta—, se
  para y se pregunta.

## Trampas medidas en este repo

- **El hook `gitflow_guard` bloquea el comando compuesto entero**: de `A && B` no corre ni `A`. Por eso los
  comandos de integración van uno por uno, y después de un bloqueo se revisa qué quedó hecho.
- **Estando en `main`, el hook bloquea `git merge-base`**: su patrón toma `git merge-base` por un merge. Para medir
  se usa `git rev-list --count` y `git cherry`, que es lo que usa el script.
- **Nunca** rebase, `push --force` ni `reset --hard` sobre una rama ajena; nunca un commit directo en `main`; nunca
  un push con refspec cruzado. Integrar la rama a `main` sigue siendo `git merge --no-ff` desde `main`, con la
  verificación completa sobre el árbol mezclado.
- **El relay de git de las sesiones web rechaza el borrado de ramas y tags** con HTTP 403: eso lo hace el usuario
  desde su máquina.
