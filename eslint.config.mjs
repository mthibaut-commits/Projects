/* Linter del repo. Cierra el cuarteto de gates que quedaba en tres desde el formateo (ADR-0006).
   NO hay reglas de estilo: de la forma se encarga Prettier, y duplicar esa autoridad es cómo se pelean.
   Cada regla de acá habría cazado un incidente REAL de este proyecto, escrito en el vault o en
   `.claude/rules/code_style.md`. Una regla que no pueda citar su incidente no entra.
   Los GLOBALES se declaran uno por uno a propósito, en vez de traer el paquete `globals`: la lista dice
   exactamente qué toca esta app del navegador, igual que el SBOM dice qué trae del vendor. Con la lista
   completa, `no-undef` queda en CERO — y desde ahí lo único que puede reportar es un identificador mal
   escrito o un componente que nadie definió, que es justo lo que `tsc` y el build no ven. */
export default [
  {
    files: ["pipeline_comercial.jsx"],
    // El fuente trae comentarios `eslint-disable` de `react-hooks`, un plugin que no está en el stack
    // (no hay bundler ni package.json). Sin esto, ESLint los reporta como directivas inertes y el gate
    // se llena de ruido que no es del código. Apagarlo NO afecta a ninguna de las reglas de abajo.
    linterOptions: { reportUnusedDisableDirectives: "off" },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: Object.fromEntries(
        [
          // El navegador, medido: son los 23 que el fuente usa, ni uno más. `matchMedia` entró el 20-09-2026
          // con la portada (ADR-0005), que lee `prefers-color-scheme`; `FileReader` y `atob` el 22-09-2026
          // con la captura pegada en la nota de verificación (lee el portapapeles y la escribe al disco):
          // la lista dice exactamente qué toca esta app, así que crece cuando el fuente crece y el linter
          // avisa cuál falta.
          "window", "document", "location", "history", "navigator", "localStorage", "matchMedia",
          "setTimeout", "clearTimeout", "setInterval", "clearInterval",
          "URL", "URLSearchParams", "Blob", "DOMParser", "TextEncoder", "btoa", "atob", "FileReader",
          "ResizeObserver", "HTMLElement", "customElements",
          // Vendorizado en `vendor/` y cargado como UMD antes del bundle (ver el SBOM).
          "React",
        ].map((g) => [g, "readonly"]),
      ),
    },
    rules: {
      // «una clave repetida en un objeto literal es JS VÁLIDO y silencioso: gana la última» —
      // code_style.md, sobre las 9 fusiones de identificadores de la migración a pesos. Encontró una.
      "no-dupe-keys": "error",
      // «agregar un parámetro `estado` a `visadoDealCalc`, que ya tenía un `const estado` local, rompió
      // el bundle — y npx tsc no dijo nada, ni siquiera sin filtrar por TS1» — code_style.md, 12-09.
      "no-redeclare": "error",
      "no-dupe-args": "error",
      "no-dupe-class-members": "error",
      "no-dupe-else-if": "error",
      // «un componente no importado pasa tsc y el build, y sólo aparece al abrir la pantalla» — CLAUDE.md.
      "no-undef": "error",
      // Correctitud pura, sin opinión de estilo. Ninguna de éstas la ve `tsc` con `--allowJs`.
      "no-unsafe-negation": "error",
      "no-unsafe-optional-chaining": "error",
      "no-self-compare": "error",
      "no-self-assign": "error",
      "no-sparse-arrays": "error",
      "no-unreachable": "error",
      "no-constant-binary-expression": "error",
      "no-fallthrough": "error",
      "use-isnan": "error",
      "valid-typeof": "error",
      "no-compare-neg-zero": "error",
      "no-duplicate-case": "error",
    },
  },
];
