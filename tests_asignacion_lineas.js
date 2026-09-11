/* ============================================================================================
   PRUEBAS DEL MOTOR DE ASIGNACIÓN DE LÍNEAS
   Cubre los 10 casos del §9 de spec-asignacion-lineas.md, más cinco que el spec no enumera pero
   que el modelo corregido introduce (línea de otros deudores suspendida y como no-colchón, tope
   del cliente, y cliente en estado A con sólo LF1), más cinco del DIFF entre versiones (§4.3): qué
   se movió respecto de la evaluación anterior, sin que esa versión altere jamás la asignación, más
   tres del RECORTE de una operación ya aceptada (§9 del spec de verificación): tras la firma la
   operación sólo encoge, y recortar no vuelve a asignar contra el estado nuevo de las líneas, más
   tres de la REAPERTURA: reabrir revoca la firma del cliente y las facturas que el deudor no
   confirmó quedan vetadas para esa operación, más cuatro de la MESA DE VERIFICACIÓN: que se listen
   todas las causas que gatillaron el contacto y que las filas se agrupen por deudor.

   CÓMO SE CORREN: abrir pipeline_comercial.html, iniciar sesión, abrir la consola del navegador y
   pegar el contenido de este archivo. No requiere datos del pipeline: cada caso inyecta su propio
   estado de líneas por el tercer parámetro de `asignarLineas`, así que el resultado no depende de
   qué oportunidades haya generado el motor de entrada.

   Última corrida: 30/30 PASA.
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

  // ══ RECORTE DE UNA OPERACIÓN ACEPTADA (spec de verificación §9) ═══════════════════════════════
  // Tras la firma la operación sólo encoge: la verificación retira lo que el deudor no confirmó.
  // Recortar NO re-asigna — el cupo ya está reservado y cubre un monto mayor.
  const snapLinea = (r) => ({
    cursable: r.cursable, requiereComite: r.requiereComite, oferta: r.oferta,
    estadoCliente: r.estadoCliente, dispCliente: r.dispCliente, deudores: r.deudores,
    lineasUsadas: r.lineasUsadas, vacia: false,
    facturas: r.facturas.map((f) => ({ id: f.id, folio: f.folio, rutDeudor: f.rutDeudor, deudor: f.deudor, monto: f.monto, estado: f.estado, motivo: f.motivo || null, origen: f.origen })),
    solicitudes: r.solicitudes,
  });

  // 21 · el deudor no confirma una factura → baja el cursable y las demás quedan igual
  const acep21 = snapLinea(asignarLineas([fac("f1", LB[10], 50), fac("f2", LB[10], 30)], "X",
    { estado: estB([L("LF2-r1", "LF2", LB[10], 300)], 5000), deudores: { [LB[10]]: dl(LB[10], 900) } }));
  const rec21 = recortarAsignacion(acep21, ["f1"]);
  const q1 = rec21.facturas.find((f) => f.id === "f1");
  ok("21 retirar la no confirmada baja el cursable",
     acep21.cursable === 80 && rec21.cursable === 50 && rec21.facturas.length === 1
     && JSON.stringify(q1.origen) === JSON.stringify(acep21.facturas.find((f) => f.id === "f1").origen)
     && rec21.recorte.retiradas === 1 && rec21.recorte.montoRetirado === 30,
     "80 → " + rec21.cursable + " · retirado " + rec21.recorte.montoRetirado);

  // 22 · el cupo liberado NO vuelve solo: la reserva sigue puesta hasta que la liberen afuera
  const dispAntes = (acep21.deudores[0].detallePar[0] || {}).disponible;
  const dispDespues = (rec21.deudores[0].detallePar[0] || {}).disponible;
  ok("22 recortar no devuelve el cupo por sí solo",
     dispAntes === dispDespues && rec21.deudores[0].asignado === 50 && rec21.deudores[0].nFacturas === 1,
     "disponible " + dispAntes + " = " + dispDespues + " · asignado " + rec21.deudores[0].asignado);

  // 23 · GUARDARRAÍL: recortar NO re-asigna. Aunque la línea se haya consumido afuera entre medio,
  //      la factura que queda conserva su origen — una operación firmada no pierde línea por una
  //      llamada telefónica. Si se re-evaluara, esta misma factura caería a comité.
  const inj23 = (vig) => ({ estado: estB([L("LF2-r2", "LF2", LB[11], 100, vig)], 5000), deudores: { [LB[11]]: dl(LB[11], 900) } });
  const acep23 = snapLinea(asignarLineas([fac("f1", LB[11], 60), fac("f2", LB[11], 30)], "X", inj23(0)));
  const rec23 = recortarAsignacion(acep23, ["f1"]);
  const reeval23 = asignarLineas([fac("f1", LB[11], 60)], "X", inj23(95)); // la línea se consumió afuera
  ok("23 recortar no re-asigna contra el estado nuevo de la línea",
     rec23.facturas[0].estado === "CON_LINEA" && rec23.facturas[0].origen[0].tipo === "LF2"
     && reeval23.facturas[0].estado === "REQUIERE_COMITE",
     "recortada " + rec23.facturas[0].estado + " · re-evaluada sería " + reeval23.facturas[0].estado);

  // ══ REAPERTURA: firma revocada y facturas vetadas ═════════════════════════════════════════════
  // Reabrir una operación aceptada la devuelve a Oferta para modificarla. Dos reglas que no pueden
  // depender de que alguien se acuerde de limpiar una bandera.

  // 24 · reabrir REVOCA la firma. El cliente firmó un paquete y un monto concretos; si se modifica,
  //      lo firmado ya no describe lo que se va a cursar y tiene que firmar de nuevo en el portal.
  const firmado24 = { id: "T-24", stage: "cesion", clienteAcepto: true, cierreFirmado: true, otorgada: true };
  const reabierto24 = { ...firmado24, stage: "oferta", reabierta: { ts: "hoy", reservaMM: 120 } };
  ok("24 reabrir revoca la firma del cliente",
     aprobacionFormalCliente(firmado24) === true && aprobacionFormalCliente(reabierto24) === false,
     "firmado " + aprobacionFormalCliente(firmado24) + " · reabierto " + aprobacionFormalCliente(reabierto24));

  // 25 · la factura que el deudor NO confirmó queda vetada para esa operación: ni la lista de
  //      candidatas la ofrece como agregable, ni se puede reponer por otro camino.
  const dealV25 = { id: "T-25" };
  const facV25 = { id: "fx25", folio: "9001", montoMM: 40, deudor: "DEU-X" };
  repoNoConfirmadas.set(dealV25.id, { fx25: { folio: "9001", montoMM: 40, deudor: "DEU-X", por: "test", fecha: "hoy" } });
  const est25 = estadoCandidata(facV25, dealV25);
  ok("25 la factura no confirmada queda vetada",
     noConfirmada(dealV25, facV25) === true && est25.agregable === false && est25.bloqueada === true && est25.clave === "noConfirmada",
     est25.label);

  // 26 · al volver a firmar se cierra la reapertura y la aprobación formal vuelve a estar vigente
  ok("26 volver a firmar restituye la aprobación",
     aprobacionFormalCliente({ ...reabierto24, reabierta: undefined, stage: "cesion" }) === true,
     "");

  // ══ MESA DE VERIFICACIÓN ══════════════════════════════════════════════════════════════════════
  // La vista muestra las causas que gatillaron el contacto. Si son varias van TODAS, porque el que
  // llama tiene que confirmarlas en la misma llamada.

  // 27 · con varios criterios fallidos se listan todos, con su valor y su umbral
  const cs27 = causasVerif({ razon: "criterio_incumplido", fallidas: [
    { r: VERIF_RULES.find((r) => r.id === "V04"), v: 1.14, dato: true },
    { r: VERIF_RULES.find((r) => r.id === "V05"), v: 2, dato: true },
  ] });
  ok("27 se listan todas las causas, no sólo la primera",
     cs27.length === 2 && cs27[0].id === "V04" && cs27[1].id === "V05"
     && cs27[0].umbral === "< 1,0" && cs27[1].valor === "2 meses",
     cs27.map((c) => c.id + " " + c.valor).join(" · "));

  // 28 · el protocolo propio del deudor es COMPUERTA: es la única causa, porque no se evaluó nada más
  const cs28 = causasVerif({ razon: "protocolo", fallidas: [] });
  ok("28 el protocolo propio es la única causa", cs28.length === 1 && cs28[0].id === "V01" && cs28[0].dura === true, cs28[0].nombre);

  // 29 · un criterio SIN DATO se muestra como incumplimiento, no como «no aplica» (§4.3)
  const cs29 = causasVerif({ razon: "criterio_incumplido", fallidas: [{ r: VERIF_RULES.find((r) => r.id === "V10"), v: null, dato: false }] });
  ok("29 el criterio sin dato se marca como tal", cs29.length === 1 && cs29[0].sinDato === true && cs29[0].valor === "sin dato", cs29[0].valor);

  // 30 · filasVerificacion agrupa POR DEUDOR y sólo trae los que requieren llamada
  const deudorTel = LB.map((r) => ({ r, v: verifFactura(fac("x", r, 10), { id: "T-30", rutEmisor: "76.111.111-1" }) })).find((x) => x.v.est === "tel");
  if (!deudorTel) { ok("30 filasVerificacion agrupa por deudor", false, "ningún deudor de prueba requiere verificación"); }
  else {
    const deal30 = { id: "T-30", rutEmisor: "76.111.111-1", cliente: "Cliente de prueba",
      facturasOp: [fac("f1", deudorTel.r, 30), fac("f2", deudorTel.r, 20)] };
    const fs30 = filasVerificacion([deal30]);
    const fila = fs30.find((x) => x.rutDeudor === deudorTel.r);
    ok("30 filasVerificacion agrupa por deudor",
       !!fila && fila.facturas.length === 2 && fila.monto === 50 && fila.estado === "pendiente" && fila.causas.length >= 1,
       fila ? `1 fila · ${fila.facturas.length} facturas · ${fila.causas.length} causa(s) · ${fila.estado}` : "sin fila");
  }

  // 31-32 · COMPUERTA DEL TAB DE VERIFICACIÓN. El tab aparece cuando la verificación pasa a ser trabajo
  // real del equipo: al pre-evaluar, o con la oferta cerrada Y publicada. Cerrar sin publicar no basta
  // —es la aprobación interna del ejecutivo, todavía no hay compromiso con el cliente— y publicar sin
  // cerrar no existe. El Agente IA publica por WhatsApp sin tocar la bandera, así que su mensaje cuenta.
  ok("31 cerrar sin publicar NO habilita la verificación",
     ofertaPublicada({ ofertaCerrada: true }) === false
     && ofertaPublicada({ ofertaComunicada: true }) === false
     && ofertaPublicada({ ofertaCerrada: true, ofertaComunicada: true }) === true
     && ofertaPublicada({ negocioNum: 9001, ofertaComunicada: true }) === true,
     "hacen falta las dos mitades");

  ok("32 la oferta publicada por el Agente IA cuenta como comunicada",
     ofertaPublicada({ ofertaCerrada: true, waSesion: [{ from: "agente", text: "Oferta de factoring por $50M" }] }) === true
     && ofertaPublicada({ ofertaCerrada: true, waSesion: [{ from: "agente", text: "Hola, ¿cómo estás?" }] }) === false,
     "el mensaje del agente publica; cualquier otro no");

  // 33-34 · ROLES POR TENANT. Marcar una factura como verificada es firmar el resultado de una
  // llamada, así que lo hace el equipo de verificación y no cualquiera. El rol se configura por
  // tenant (Configuración › Roles) y la capacidad se deriva de él, no de una lista aparte.
  ok("33 sólo el Ejecutivo de verificación firma una verificación",
     puedeVerificarFacturas("EV") === true
     && puedeVerificarFacturas("ADMIN") === true
     && puedeVerificarFacturas("CR") === false
     && puedeVerificarFacturas("GC") === false
     && puedeVerificarFacturas("SR") === false,
     "EV y ADMIN sí; comercial y riesgo no");

  {
    // Cambiar el rol cambia la capacidad, y se restituye: el test no puede dejar el tenant tocado.
    const antes = ROL_USUARIO.CR;
    ROL_USUARIO.CR = "ejec_verif";
    const conRol = puedeVerificarFacturas("CR");
    ROL_USUARIO.CR = antes;
    const catalogo = ROLES_CAT.map((r) => r.id);
    ok("34 el catálogo cubre la estructura y el rol manda sobre la capacidad",
       conRol === true && puedeVerificarFacturas("CR") === false
       && ["ejec_comercial", "jefe_comercial", "gte_comercial", "gte_general", "jefe_riesgo", "sub_riesgo", "operaciones", "ejec_verif"].every((r) => catalogo.includes(r))
       && /^pc_roles_/.test(ROLES_KEY),
       `${catalogo.length} roles · clave ${ROLES_KEY}`);
  }

  // 35-37 · LA ATRIBUCIÓN SIGUE AL ROL. Quien aprueba una excepción es el CARGO, no la persona:
  // antes el nivel estaba cableado por código de usuario y funcionaba sólo porque había un usuario
  // por rol. Decisiones de negocio fijadas acá: dos personas con el mismo rol aprueban las dos; un
  // cargo vacante lo cubre la jefatura de SU área; y la escalada nunca cruza áreas.
  {
    const reglaN1 = { tiers: [[() => true, "excepcion", 1]] };  // tramo que pide N1 · Jefe de Grupo Comercial
    const reglaN4 = { tiers: [[() => true, "excepcion", 4]] };  // tramo que pide N4 · Jefe de Riesgo
    const pueden = (rg, niv) => ["JG", "GC", "GG", "RG", "SR", "CR"].filter((c) => puedeAprobarExc(c, rg, niv));

    ok("35 el nivel de aprobación sale del rol, no del código de usuario",
       atribDe("GG").atrib.comercial === 3 && atribDe("RG").atrib.riesgo === 4
       && Object.keys(atribDe("CR").atrib).length === 0 && atribDe("CR").tipo === "pipeline"
       && atribDe("JG").tipo === "aprobador",
       "el ejecutivo comercial no aprueba; el cargo sí");

    // Vacancia: nadie es Jefe de Grupo Comercial. La jefatura del área lo cubre, Riesgo no.
    const antes = ROL_USUARIO.JG; ROL_USUARIO.JG = "ejec_comercial";
    const conVacante = pueden(reglaN1, 1);
    ROL_USUARIO.JG = antes;
    ok("36 un cargo vacante lo cubre su jefatura, y la escalada no cruza áreas",
       JSON.stringify(pueden(reglaN1, 1)) === JSON.stringify(["JG", "GC", "GG"])
       && JSON.stringify(conVacante) === JSON.stringify(["GC", "GG"])
       && JSON.stringify(pueden(reglaN4, 4)) === JSON.stringify(["RG", "SR"]),
       `sin JG lo toman ${conVacante.join(" y ")}; N4 de Riesgo sigue siendo sólo de Riesgo`);

    // Dos personas con el mismo cargo: las dos aprueban ese nivel.
    const antes2 = ROL_USUARIO.CR; ROL_USUARIO.CR = "gte_comercial";
    const dos = ["GC", "CR"].filter((c) => puedeAprobarExc(c, { tiers: [[() => true, "excepcion", 2]] }, 2));
    ROL_USUARIO.CR = antes2;
    ok("37 dos personas con el mismo rol aprueban ese nivel",
       dos.length === 2 && puedeAprobarExc("CR", { tiers: [[() => true, "excepcion", 2]] }, 2) === false,
       "y al devolverle su rol, deja de aprobar");
  }

  console.log(out.join("\n"));
  console.log("\n" + out.filter((x) => x.startsWith("PASA")).length + " de " + out.length + " pasan.");
  return out;
})();
