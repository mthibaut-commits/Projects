/* El archivo que le falta a Quegenx/vercel-mcp-server.
 *
 * Su README manda a editar `src/config/constants.ts` y pegar ahí el token de
 * Vercel, pero el archivo NUNCA se commiteó: los 21 componentes lo importan y
 * el build cae con 18 × TS2307. El binario resultante muere al arrancar con
 * ERR_MODULE_NOT_FOUND en cada grupo de herramientas.
 *
 * Acá el token sale del ENTORNO, no del fuente: el original lo dejaba en texto
 * plano en `src/` y en `dist/`, o sea commiteable por accidente.
 *
 * Lo copia `.mcp-servers/vercel/instalar.mjs` a `upstream/src/config/constants.ts`.
 */

/** Raíz de la API de Vercel. Los componentes le cuelgan `/v1/...`, `/v9/...`. */
export const BASE_URL = process.env.VERCEL_API_BASE_URL ?? "https://api.vercel.com";

/** Token de https://vercel.com/account/tokens. Viaja como `Bearer` en cada request. */
export const DEFAULT_ACCESS_TOKEN = process.env.VERCEL_ACCESS_TOKEN ?? "";

/* Sin token el servidor levanta igual y las herramientas responden 403: el aviso
   va por stderr, que es el único canal libre —stdout lleva el protocolo MCP y
   escribir ahí rompe la sesión—. */
if (!DEFAULT_ACCESS_TOKEN) {
  console.error(
    "[vercel-mcp] Falta VERCEL_ACCESS_TOKEN en el entorno: las herramientas van a responder 403. " +
      "Genera un token en https://vercel.com/account/tokens y expórtalo antes de abrir Claude Code."
  );
}
