/* Gate de humo de la capa e2e: la app monta, la sesión abre con el OTP de la pantalla, el Modo Directorio
   puebla el tubo sin stream y el detalle abre en su propia pestaña. Si esto falla, ningún otro caso e2e
   significa nada — y una capa e2e que sólo tiene casos «bonitos» no dice si el harness sigue vivo. */
export const casos = [
  { id: "e2e-00", titulo: "la sesión abre, el Directorio puebla el tubo y el detalle monta en pestaña propia",
    correr: async (h) => {
      await h.encenderDirectorio();
      const t = await h.texto(h.pagina);
      const m = t.match(/(\d+)\s+de\s+(\d+)/);
      if (!m) throw new Error("el contador del tubo no aparece tras encender el Directorio");
      const detalle = await h.abrirDetalle(0);
      const td = await h.texto(detalle);
      if (!/DETALLE DE OPORTUNIDAD/i.test(td)) throw new Error("el detalle no dice DETALLE DE OPORTUNIDAD");
      return `tubo ${m[1]} de ${m[2]} · detalle ${td.length} caracteres`;
    } },
];
