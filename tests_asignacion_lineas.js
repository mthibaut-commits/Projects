/* ============================================================================================
   PRUEBAS DEL MOTOR DE ASIGNACIÓN DE LÍNEAS
   Cubre los 10 casos del §9 de spec-asignacion-lineas.md, más cinco que el spec no enumera pero
   que el modelo corregido introduce (línea de otros deudores suspendida y como no-colchón, tope
   del cliente, y cliente en estado A con sólo LF1), más cinco del DIFF entre versiones (§4.3): qué
   se movió respecto de la evaluación anterior, sin que esa versión altere jamás la asignación.

   CÓMO SE CORREN: abrir pipeline_comercial.html, iniciar sesión, abrir la consola del navegador y
   pegar el contenido de este archivo. No requiere datos del pipeline: cada caso inyecta su propio
   estado de líneas por el tercer parámetro de `asignarLineas`, así que el resultado no depende de
   qué oportunidades haya generado el motor de entrada.

   Última corrida: 20/20 PASA.
   ============================================================================================ */
(() => {
  const out = [];
  const ok = (n, cond, det) => out.push((cond ? "PASA  " : "FALLA ") + n + (det ? "  · " + det : ""));

  // Deudores PRIME reales de la lista blanca, con nota distinta entre sí: es lo único que hace
  // válida la prueba de la línea compartida (ambos tienen que caer en la MISMA categoría).
  const LB = [...LB_RUT].slice(0, 12);
  const nomDe = (r) => "DEU-" + r;
  const conNota = LB.map((r) => ({ rut: r, nota: notaFromScore(scoreDeudor(nomDe(r), "Lista Blanca").score) })).sort((a, b) => b.nota - a.nota);
  const alto = conNota[0], bajo = conNota[conNota.length - 1];
  const noPrime = "99.999.999-9";

  const fac = (id, rut, monto) => ({ id, folio: id, deudor: nomDe(rut), rutRecep: rut, montoMM: monto, tipoDeudor: "Lista Blanca" });
  const facOtro = (id, rut, monto) => ({ id, folio: id, deudor: "NoPrime-" + rut, rutRecep: rut, montoMM: monto, tipoDeudor: "Otro" });
  const L = (id, tipo, rut, ap, vig) => ({ id, tipo, granularidad: "par", rutDeudor: rut, aprobado: ap, vigente: vig || 0 });
  const comodin = (ap, vig, susp) => ({ id: "LF4-T", tipo: "LF4", granularidad: "comodin", categoria: "Lista Blanca", rutDeudor: null, aprobado: ap, vigente: vig || 0, suspendida: !!susp });
  const estB = (lineas, asignada, uso) => ({ estado: "B", asignadaCliente: asignada, usoCliente: uso || 0, lineas, cola: [] });
  const estA = () => ({ estado: "A", asignadaCliente: 30, usoCliente: 0, cola: [], lineas: [{ id: "LF1-t", tipo: "LF1", granularidad: "comodin", rutDeudor: null, aprobado: 30, vigente: 0, soloPrime: true, unSoloUso: true }] });
  const dl = (rut, ap, vig) => ({ rutDeudor: rut, nombre: nomDe(rut), tipo: "Lista Blanca", aprobado: ap, vigente: vig || 0, nClientes: 3 });
  let r;

  // 1 · LF2 holgada, una factura chica → con línea, origen LF2 completa
  r = asignarLineas([fac("f1", LB[0], 20)], "X", { estado: estB([L("LF2-a", "LF2", LB[0], 200)], 5000), deudores: { [LB[0]]: dl(LB[0], 900) } });
  ok("1 LF2 holgada", r.cursable === 20 && r.facturas[0].origen.length === 1 && r.facturas[0].origen[0].tipo === "LF2", "cursable " + r.cursable);

  // 2 · LF3 de 120 con facturas por 84,1 → todo desde LF3; se consume completa, caducan 35,9
  r = asignarLineas([fac("f1", LB[1], 50), fac("f2", LB[1], 34.1)], "X", { estado: estB([L("LF3-b", "LF3", LB[1], 120), L("LF2-b", "LF2", LB[1], 200)], 5000), deudores: { [LB[1]]: dl(LB[1], 900) } });
  const l3 = r.lineasUsadas.find((x) => x.tipo === "LF3");
  ok("2 la puntual se consume completa", r.cursable === 84.1 && l3 && l3.montoCaducado === 35.9, "usado " + (l3 && l3.usado) + " caduca " + (l3 && l3.montoCaducado));

  // 3 · factura de 130 con LF3 de 60 y LF2 de 172 → repartida 60 + 70, en ese orden
  r = asignarLineas([fac("f1", LB[2], 130)], "X", { estado: estB([L("LF3-c", "LF3", LB[2], 60), L("LF2-c", "LF2", LB[2], 172)], 5000), deudores: { [LB[2]]: dl(LB[2], 900) } });
  const o = r.facturas[0].origen;
  ok("3 una factura repartida entre dos líneas", o.length === 2 && o[0].tipo === "LF3" && o[0].monto === 60 && o[1].monto === 70, JSON.stringify(o.map((x) => x.tipo + ":" + x.monto)));

  // 4 · par holgado pero la línea del deudor sólo tiene 150 → parcial, motivo `deudor`
  r = asignarLineas([fac("f1", LB[3], 130), fac("f2", LB[3], 85), fac("f3", LB[3], 42.3)], "X", { estado: estB([L("LF2-d", "LF2", LB[3], 900)], 5000), deudores: { [LB[3]]: dl(LB[3], 150) } });
  const rech = r.facturas.filter((f) => f.estado === "REQUIERE_COMITE");
  ok("4 manda la línea del deudor", r.deudores[0].estado === "parcial" && rech.length === 2 && rech.every((f) => f.motivo === "deudor"), "cursable " + r.cursable + " comité " + r.requiereComite);

  // 5 · sin LF2 ni LF3, línea de otros deudores con saldo → la financia esa
  r = asignarLineas([fac("f1", LB[4], 18)], "X", { estado: estB([comodin(40, 0)], 5000), deudores: { [LB[4]]: dl(LB[4], 900) } });
  ok("5 la financia la línea de otros deudores", r.cursable === 18 && r.facturas[0].origen[0].tipo === "LF4", "");

  // 6 · línea de otros deudores agotada por un deudor de MEJOR nota → el de peor nota sin línea
  const inj = () => ({ estado: estB([comodin(40, 0)], 5000), deudores: { [alto.rut]: dl(alto.rut, 900), [bajo.rut]: dl(bajo.rut, 900) } });
  r = asignarLineas([fac("fB", bajo.rut, 20), fac("fA", alto.rut, 35)], "X", inj());
  ok("6 la línea de otros deudores se agota por orden de nota", r.deudores[0].rut === alto.rut && r.facturas.find((f) => f.id === "fB").motivo === "lf4", "orden " + r.deudores.map((d) => d.nota).join(">"));

  // 7 · agregar un deudor de mejor nota reordena y cambia el resultado de los que vienen detrás
  const soloB = asignarLineas([fac("fB", bajo.rut, 35)], "X", inj());
  const conA = asignarLineas([fac("fB", bajo.rut, 35), fac("fA", alto.rut, 35)], "X", inj());
  ok("7 el recálculo es completo", soloB.cursable === 35 && conA.facturas.find((f) => f.id === "fB").estado === "REQUIERE_COMITE" && conA.facturas.find((f) => f.id === "fA").estado === "CON_LINEA", "solo fB " + soloB.cursable + " · con fA " + conA.cursable);

  // 8 · quitar las facturas de un deudor libera cupo para el resto
  ok("8 quitar un deudor libera cupo", conA.requiereComite === 35 && soloB.requiereComite === 0, "con fA " + conA.requiereComite + " · sin fA " + soloB.requiereComite);

  // 9 · selección vacía
  r = asignarLineas([], "X", { estado: estB([L("LF2-z", "LF2", LB[0], 200)], 5000), deudores: {} });
  ok("9 selección vacía", r.vacia === true && r.cursable === 0 && r.requiereComite === 0, "");

  // 10 · función pura: dos corridas idénticas dan lo mismo y no mutan el estado inyectado
  const inj10 = { estado: estB([L("LF2-p", "LF2", LB[0], 100)], 5000), deudores: { [LB[0]]: dl(LB[0], 900) } };
  const a1 = asignarLineas([fac("f1", LB[0], 60)], "X", inj10);
  const a2 = asignarLineas([fac("f1", LB[0], 60)], "X", inj10);
  ok("10 el motor es puro e idempotente", a1.cursable === a2.cursable && a1.cursable === 60 && inj10.estado.lineas[0].vigente === 0, "");

  // 11 · una línea de otros deudores suspendida conserva su exposición pero no admite nada nuevo
  r = asignarLineas([fac("f1", bajo.rut, 5)], "X", { estado: estB([comodin(40, 0, true)], 5000), deudores: { [bajo.rut]: dl(bajo.rut, 900) } });
  ok("11 la línea suspendida no financia", r.cursable === 0 && r.facturas[0].motivo === "lf4", "");

  // 12 · la línea de otros deudores NUNCA es colchón de un deudor que ya tiene línea propia
  r = asignarLineas([fac("f1", alto.rut, 50)], "X", { estado: estB([L("LF2-x", "LF2", alto.rut, 30), comodin(400, 0)], 5000), deudores: { [alto.rut]: dl(alto.rut, 900) } });
  ok("12 no es colchón del que tiene línea propia", r.cursable === 0 && r.facturas[0].motivo === "par", "motivo " + r.facturas[0].motivo);

  // 13 · el tope del cliente bloquea cuando su línea asignada está casi consumida
  r = asignarLineas([fac("f1", alto.rut, 50)], "X", { estado: estB([L("LF2-y", "LF2", alto.rut, 900)], 1000, 980), deudores: { [alto.rut]: dl(alto.rut, 900) } });
  ok("13 el tope del cliente bloquea", r.cursable === 0 && r.facturas[0].motivo === "cliente", "disponible " + r.dispCliente);

  // 14 · asignación por factura COMPLETA, la grande primero
  r = asignarLineas([fac("f1", alto.rut, 60), fac("f2", alto.rut, 30)], "X", { estado: estB([L("LF2-w", "LF2", alto.rut, 70)], 5000), deudores: { [alto.rut]: dl(alto.rut, 900) } });
  ok("14 factura completa, la grande primero", r.cursable === 60 && r.facturas.find((f) => f.id === "f1").estado === "CON_LINEA", "cursable " + r.cursable);

  // 15 · cliente en estado A: la LF1 sólo admite deudores prime y sólo hasta $30M
  r = asignarLineas([fac("f1", alto.rut, 18), facOtro("f2", noPrime, 5)], "X", { estado: estA(), deudores: { [alto.rut]: dl(alto.rut, 900), [noPrime]: dl(noPrime, 900) } });
  ok("15 la LF1 sólo cubre deudores prime", r.cursable === 18 && r.facturas.find((f) => f.id === "f2").motivo === "lf1", "cursable " + r.cursable);

  // ══ DIFF CONTRA LA VERSIÓN ANTERIOR (informativo, NUNCA vinculante) ═══════════════════════════
  // Lo que trae la API es la verdad y sobre eso se asigna. La versión anterior sólo sirve para poder
  // DECIRLE al ejecutivo qué se movió: que le ampliaron la línea y ya no necesita comité, o que el
  // cupo se consumió en otro negocio cursado por otro canal y ahora califican menos facturas.
  const previa = (facs) => ({ facturas: facs });
  const snap = (res) => res.facturas.map((f) => ({ id: f.id, estado: f.estado, origen: f.origen }));

  // 16 · nada cambió entre una evaluación y la otra → el diff no reporta movimientos
  const inj16 = () => ({ estado: estB([L("LF2-d1", "LF2", LB[5], 200)], 5000), deudores: { [LB[5]]: dl(LB[5], 900) } });
  const v1_16 = asignarLineas([fac("f1", LB[5], 60)], "X", inj16());
  r = asignarLineas([fac("f1", LB[5], 60)], "X", { ...inj16(), previa: previa(snap(v1_16)) });
  ok("16 sin movimientos el diff no reporta nada",
     r.diff && !r.diff.hayCambios && r.diff.iguales === 1 && r.facturas[0].cambio === "igual",
     "iguales " + r.diff.iguales);

  // 17 · entre las dos evaluaciones el comité AMPLIÓ la línea → lo que iba a comité ahora se cursa
  const antes17 = asignarLineas([fac("f1", LB[6], 80)], "X", { estado: estB([L("LF2-a1", "LF2", LB[6], 50)], 5000), deudores: { [LB[6]]: dl(LB[6], 900) } });
  r = asignarLineas([fac("f1", LB[6], 80)], "X", { estado: estB([L("LF2-a1", "LF2", LB[6], 300)], 5000), deudores: { [LB[6]]: dl(LB[6], 900) }, previa: previa(snap(antes17)) });
  ok("17 la línea se amplió: ya no necesita comité",
     antes17.cursable === 0 && r.cursable === 80 && r.diff.ganaron === 1 && r.diff.montoGanado === 80
     && r.diff.perdieron === 0 && r.facturas[0].cambio === "gano_linea",
     "ganaron " + r.diff.ganaron + " por " + r.diff.montoGanado);

  // 18 · el cupo se consumió en OTRO negocio (cursado por otro canal) → ahora califican menos
  const antes18 = asignarLineas([fac("f1", LB[7], 80)], "X", { estado: estB([L("LF2-c1", "LF2", LB[7], 300)], 5000), deudores: { [LB[7]]: dl(LB[7], 900) } });
  r = asignarLineas([fac("f1", LB[7], 80)], "X", { estado: estB([L("LF2-c1", "LF2", LB[7], 300, 260)], 5000), deudores: { [LB[7]]: dl(LB[7], 900) }, previa: previa(snap(antes18)) });
  ok("18 otro negocio consumió el cupo: ahora va a comité",
     antes18.cursable === 80 && r.cursable === 0 && r.diff.perdieron === 1 && r.diff.montoPerdido === 80
     && r.facturas[0].cambio === "perdio_linea",
     "perdieron " + r.diff.perdieron + " por " + r.diff.montoPerdido);

  // 19 · la puntual se agotó entre versiones → la misma factura se financia ahora con la normal
  const antes19 = asignarLineas([fac("f1", LB[8], 40)], "X", { estado: estB([L("LF3-x1", "LF3", LB[8], 60), L("LF2-x1", "LF2", LB[8], 200)], 5000), deudores: { [LB[8]]: dl(LB[8], 900) } });
  r = asignarLineas([fac("f1", LB[8], 40)], "X", { estado: estB([L("LF3-x1", "LF3", LB[8], 60, 60), L("LF2-x1", "LF2", LB[8], 200)], 5000), deudores: { [LB[8]]: dl(LB[8], 900) }, previa: previa(snap(antes19)) });
  ok("19 cambió la línea que la financia",
     antes19.facturas[0].origen[0].tipo === "LF3" && r.facturas[0].origen[0].tipo === "LF2"
     && r.diff.cambiaron === 1 && r.facturas[0].cambio === "cambio_de_linea",
     "LF3 → " + r.facturas[0].origen[0].tipo);

  // 20 · GUARDARRAÍL: la versión anterior NO es vinculante. Con y sin previa el motor asigna
  //      exactamente lo mismo — lo único que agrega es la explicación de qué se movió.
  const inj20 = () => ({ estado: estB([L("LF2-g1", "LF2", LB[9], 100)], 5000), deudores: { [LB[9]]: dl(LB[9], 900) } });
  const facs20 = [fac("f1", LB[9], 60), fac("f2", LB[9], 80)];
  const sinPrevia20 = asignarLineas(facs20, "X", inj20());
  // Una previa que dice justo lo contrario de lo que corresponde hoy: si mandara, el resultado
  // cambiaría. No manda.
  const mentira = previa([{ id: "f1", estado: "CON_LINEA", origen: [{ lineaId: "LF2-g1", tipo: "LF2", monto: 60 }] }, { id: "f2", estado: "CON_LINEA", origen: [{ lineaId: "LF2-g1", tipo: "LF2", monto: 80 }] }]);
  r = asignarLineas(facs20, "X", { ...inj20(), previa: mentira });
  ok("20 la versión anterior no altera la asignación",
     JSON.stringify(snap(sinPrevia20)) === JSON.stringify(snap(r)) && sinPrevia20.cursable === r.cursable
     && r.diff.perdieron === 1,
     "cursable " + sinPrevia20.cursable + " = " + r.cursable + " · el diff sí reporta la que perdió línea");

  console.log(out.join("\n"));
  console.log("\n" + out.filter((x) => x.startsWith("PASA")).length + " de " + out.length + " pasan.");
  return out;
})();
