// SHARE_OF_WALLET — activo A5. Serie semanal de cuánto de la cesión del cliente se lleva Security
// frente al total que cede a todos los factoring.
//
// Lo único que este paso hace es llevar los MONTOS a PESOS. Venían como `MontoBICEMM`/`MontoTotalMM`
// con dos decimales de millón, o sea cuantizados de a $10.000: la serie no cuadraba contra AECSync,
// que sí trae el monto exacto de cada cesión. Los porcentajes (SOWPct, Target…) no son plata y
// quedan como están.
function generar({ SHARE_OF_WALLET }) {
  return SHARE_OF_WALLET.map((c) => {
    if (!Array.isArray(c.HistoricoSemanal)) return c;
    return { ...c, HistoricoSemanal: c.HistoricoSemanal.map((w) => {
      const bice = w.MontoBICE != null ? +w.MontoBICE : Math.round((+w.MontoBICEMM || 0) * 1e6);
      const total = w.MontoTotal != null ? +w.MontoTotal : Math.round((+w.MontoTotalMM || 0) * 1e6);
      const o = { ...w, MontoBICE: bice, MontoTotal: total };
      delete o.MontoBICEMM; delete o.MontoTotalMM;
      return o;
    }) };
  });
}
module.exports = { generar };
