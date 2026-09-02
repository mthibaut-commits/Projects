/* Alias de globales UMD.
   Cada libreria elige como se llama el global que busca, y no coinciden entre si:
   - lucide-react lee `react` (minuscula), no `React`.
   - recharts lee `React`, `ReactDOM` y `PropTypes`.
   Cuando cada una se cargaba por separado desde un CDN esto lo resolvia el importmap;
   al vendorizar hay que declararlo explicitamente. */
(function (g) {
  g.react = g.React;
  g["react-dom"] = g.ReactDOM;
})(typeof globalThis !== "undefined" ? globalThis : self);
