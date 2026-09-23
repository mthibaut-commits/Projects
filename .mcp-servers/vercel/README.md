# Servidor MCP de Vercel (Quegenx), parchado

`Quegenx/vercel-mcp-server` **no compila ni corre** tal como está publicado. Este directorio guarda el
parche mínimo que lo deja usable, sin vendorizar el upstream: `instalar.mjs` lo clona en `upstream/`
(ignorado por git), le aplica el parche y lo construye. Es idempotente.

```bash
node .mcp-servers/vercel/instalar.mjs
```

## Qué estaba roto, medido sobre el HEAD del 24-02-2025 (`ef8c6f2`)

| Síntoma | Causa | Arreglo |
|---|---|---|
| 18 × `TS2307` y `ERR_MODULE_NOT_FOUND` al arrancar, en cada grupo de herramientas | El repo **no incluye `src/config/`**. El `constants.ts` que su propio README manda a editar no existe, y los 21 componentes lo importan | `constants.ts` de este directorio, copiado al clon |
| 7 × `TS2554: Expected 2-3 arguments, but got 1` | `z.record(x)` de un argumento es la firma de **Zod 3**; el `package.json` pide `"zod": "latest"` y npm baja Zod 4, donde `z.record` exige clave **y** valor | Fijar `zod@^3.24.1` |
| 5 × `TS2591: Cannot find name 'process'` | `"typescript": "latest"` baja TS 7, que con este `tsconfig.json` ya no toma `@types/node` por resolución implícita | Fijar `typescript@^5.7.3` y `@types/node@^22.13.0` |
| Líneas sueltas en el canal del protocolo | `tool-manager.ts` logueaba con `console.log`, y en stdio-MCP **stdout transporta sólo JSON-RPC**: cada `Loaded tool group: …` es una línea que el cliente intenta parsear | Los 2 `console.log` pasan a `console.error` |

Las cuatro dependencias del upstream están en `"latest"`, así que el build se rompe solo con el paso del
tiempo aunque nadie toque el código. Por eso el instalador **fija** versiones en vez de parchear el fuente.

## El token NO va en el fuente

El README del upstream manda a pegar el token de Vercel en `src/config/constants.ts` y en `src/index.ts`.
Eso lo deja en texto plano en `src/` y en `dist/`, o sea commiteable por accidente. Acá sale del entorno:

```bash
# Linux / macOS
export VERCEL_ACCESS_TOKEN="…"          # https://vercel.com/account/tokens
# Windows (PowerShell, persistente)
setx VERCEL_ACCESS_TOKEN "…"
```

Sin token el servidor levanta igual, avisa por stderr y las herramientas responden 403.
`instalar.mjs` también reemplaza las constantes duplicadas de `src/index.ts` por un reexport, para que
haya **una sola** fuente de verdad.

## Verificado

Build limpio, `initialize` respondido como `vercel-tools`, **69 herramientas** expuestas y **0 líneas
no-JSON** en stdout. La prueba de humo va dentro de `instalar.mjs`: falla con código ≠ 0 si el servidor
no contesta.

## Alternativa oficial

Vercel tiene un MCP hospedado que no hay que clonar, construir ni alimentar con un token (usa OAuth).
Si este parche molesta, la entrada de `.mcp.json` se reemplaza por:

```json
"vercel": { "type": "http", "url": "https://mcp.vercel.com" }
```
