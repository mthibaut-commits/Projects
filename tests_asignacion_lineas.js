/* ============================================================================================
   PRUEBAS DEL MOTOR DE ASIGNACIÓN DE LÍNEAS
   Cubre los 15 casos del §9 de spec-asignacion-lineas.md, más cinco que el spec no enumera pero
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

   ...más tres de la CARTERA DEL PAR cliente-deudor (INC-04): que el catálogo implemente las 79
   reglas de la política y que C47-C50 se evalúen y se visen por deudor, no por cliente.

   Última corrida: 55/55 PASA.
   ============================================================================================ */
(() => {
  const out = [];
  const ok = (n, cond, det) => out.push((cond ? "PASA  " : "FALLA ") + n + (det ? "  · " + det : ""));

  // Deudores PRIME reales de la lista blanca, con nota distinta entre sí: es lo único que hace
  // válida la prueba de la línea compartida (ambos tienen que caer en la MISMA categoría).
  const LB = [...LB_RUT].slice(0, 12);
  // Para buscar un deudor que REQUIERA verificación hace falta toda la lista: los atributos del par
  // son sintéticos y están sembrados por la clave de `verifPar`, así que acotar la búsqueda a doce
  // ata la prueba a un sorteo concreto y basta cambiar la semilla para que no encuentre ninguno.
  const TODOS_LB = [...LB_RUT];
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
  ok("28 el protocolo propio es la única causa", cs28.length === 1 && cs28[0].id === "V01" && cs28[0].sinDato === false, cs28[0].nombre);

  // 29 · un criterio SIN DATO se muestra como incumplimiento, no como «no aplica» (§4.3)
  const cs29 = causasVerif({ razon: "criterio_incumplido", fallidas: [{ r: VERIF_RULES.find((r) => r.id === "V10"), v: null, dato: false }] });
  ok("29 el criterio sin dato se marca como tal", cs29.length === 1 && cs29[0].sinDato === true && cs29[0].valor === "sin dato", cs29[0].valor);

  // 30 · filasVerificacion agrupa POR DEUDOR y sólo trae los que requieren llamada
  const deudorTel = TODOS_LB.map((r) => ({ r, v: verifFactura(fac("x", r, 10), { id: "T-30", rutEmisor: "76.111.111-1" }) })).find((x) => x.v.est === "tel");
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
    // La regla declara el ÁREA y el tramo el NIVEL: sin área no hay a quién pedirle la excepción.
    const reglaN1 = { area: "comercial", tiers: [[() => true, "excepcion", 1]] };  // N1 · Jefe de Grupo Comercial
    const reglaN4 = { area: "riesgo", tiers: [[() => true, "excepcion", 4]] };     // N4 · Jefe de Riesgo
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
    const dos = ["GC", "CR"].filter((c) => puedeAprobarExc(c, { area: "comercial", tiers: [[() => true, "excepcion", 2]] }, 2));
    ROL_USUARIO.CR = antes2;
    ok("37 dos personas con el mismo rol aprueban ese nivel",
       dos.length === 2 && puedeAprobarExc("CR", { area: "comercial", tiers: [[() => true, "excepcion", 2]] }, 2) === false,
       "y al devolverle su rol, deja de aprobar");

    // Una regla SIN área no la puede aprobar nadie: es configuración que falta, no un permiso amplio.
    ok("41 una regla sin área declarada no la aprueba nadie",
       ["JG", "GC", "GG", "RG", "SR"].every((c) => puedeAprobarExc(c, { tiers: [[() => true, "excepcion", 1]] }, 1) === false),
       "el área es obligatoria para rutear la excepción");
  }

  // 38-39 · RUTEO DE EXCEPCIONES: la regla declara el ÁREA y el tramo el NIVEL; el sistema busca en la
  // lista de usuarios los de esa área con ese nivel o superior. Antes el área salía del NIVEL y el
  // nivel venía invertido (`6 − N`), así que un pagaré sin firmar —N1 de Operaciones— subía al
  // Subgerente de Riesgo y 180 días de mora —N5 de Riesgo— los firmaba un Jefe de Grupo Comercial.
  {
    const reglaDe = (cod) => (typeof REGLAS_CLIENTE !== "undefined" ? REGLAS_CLIENTE : []).find((r) => (r.cond || "") === cod);
    const primerExc = (r) => ((r && r.tiers) || []).find((t) => t[1] === "excepcion");
    const apruebanDe = (r, niv) => Object.keys(USERS).filter((c) => c !== "ADMIN" && puedeAprobarExc(c, r, niv)).map((c) => nombreDe(c));

    const c01 = reglaDe("C01"), t01 = primerExc(c01);
    ok("38 una excepción de Operaciones la aprueba Operaciones, no Riesgo",
       !!c01 && c01.area === "operaciones" && t01[2] === 1
       && JSON.stringify(apruebanDe(c01, t01[2])) === JSON.stringify(["Andrés Mella"]),
       c01 ? `${c01.nombre.slice(0, 34)} · ${c01.area} N${t01[2]} → ${apruebanDe(c01, t01[2]).join(", ")}` : "sin C01");

    const c21 = reglaDe("C21"), t21 = primerExc(c21);
    ok("39 a mayor gravedad, mayor jerarquía",
       !!c21 && c21.area === "riesgo" && t21[2] === 5
       && JSON.stringify(apruebanDe(c21, t21[2])) === JSON.stringify(["Paula Reyes"]),
       c21 ? `${c21.nombre.slice(0, 34)} · ${c21.area} N${t21[2]} → ${apruebanDe(c21, t21[2]).join(", ")}` : "sin C21");

    // Ningún par (área, nivel) del catálogo puede quedar sin aprobador posible: si queda, es
    // configuración que falta (crear el área y asignarle un usuario con ese nivel), no un bug.
    const huerfanos = []; let nTramos = 0;
    // Se prueba cada tramo CONTRA CADA TRAMO DE MONTO, no sólo con su nivel base: desde INC-05 el monto
    // de la operación sube el nivel exigido, así que un tramo con aprobador a MM$15 puede quedarse sin
    // ninguno a MM$200 si el piso de su área pide más de lo que esa área alcanza.
    const montos = [15, 50, 100, 200];
    (typeof REGLAS_CLIENTE !== "undefined" ? REGLAS_CLIENTE : []).forEach((r) => (r.tiers || []).forEach((t) => {
      if (t[1] !== "excepcion") return;
      nTramos++;
      montos.forEach((mm) => {
        const niv = nivelExigido(r.area, t[2], mm);
        if (!apruebanDe(r, niv).length) huerfanos.push(`${r.cond} ${r.area} N${niv} (MM$${mm})`);
      });
    }));
    // El conteo se calcula, no se escribe: quedó fijo en «130» y al sumar C47-C50 el mensaje pasó a
    // informar un número que ya no era el del catálogo.
    ok("40 ningún criterio queda sin aprobador posible", huerfanos.length === 0,
       huerfanos.length ? huerfanos.slice(0, 4).join(" · ") : `los ${nTramos} tramos tienen a quién ir en los ${montos.length} tramos de monto`);
  }

  // 42 · ÁREAS POR TENANT. El área es lo que la regla declara para rutear su excepción, así que el
  // catálogo tiene que cubrir las que el motor usa. Crear un área no rutea nada por sí sola: hasta que
  // un criterio la declare, no recibe tramos — por eso se puede borrar sin dejar aprobaciones huérfanas.
  {
    const ids = AREAS_CAT.map((a) => a.id);
    const usadasPorReglas = [...new Set((typeof REGLAS_CLIENTE !== "undefined" ? REGLAS_CLIENTE : []).map((r) => r.area).filter(Boolean))];
    ok("42 el catálogo de áreas cubre las que el motor rutea",
       usadasPorReglas.every((a) => ids.includes(a))
       && ["comercial", "riesgo", "operaciones"].every((a) => ids.includes(a))
       && AREA_LBL.riesgo === "Riesgo" && /^pc_areas_/.test(AREAS_KEY)
       && tramosDeArea("operaciones") > 0 && tramosDeArea("__inexistente__") === 0,
       `${ids.length} áreas · las reglas usan ${usadasPorReglas.join(", ")} · clave ${AREAS_KEY}`);
  }

  // 43 · SIN APROBADOR DEFINIDO. Un criterio sin nadie a quien pedirle la excepción tiene que decirlo
  // con todas sus letras: una lista de aprobadores vacía se lee como «todavía no lo miran», cuando en
  // realidad la operación está pegada esperando a alguien que no existe. Dos causas, dos mantenedores.
  {
    const sinArea = rolDeAreaNivel("contraloria_inexistente", 3);
    const sinNadie = rolDeAreaNivel("verificacion", 3); // área real, pero ningún cargo tiene nivel ahí
    const conCargo = rolDeAreaNivel("riesgo", 5);
    ok("43 un criterio sin aprobador lo dice, y dice por qué",
       sinArea.sinAprobador === true && sinArea.rol === SIN_APROBADOR && /no existe en este tenant/.test(sinArea.motivo)
       && sinNadie.sinAprobador === true && /nivel N3 o superior/.test(sinNadie.motivo)
       && conCargo.sinAprobador !== true && conCargo.rol === "Subgerente de Riesgo"
       // y nadie puede aprobar contra un área que no existe, por mucho nivel que cargue
       && Object.keys(USERS).filter((c) => c !== "ADMIN")
            .every((c) => puedeAprobarExc(c, { area: "contraloria_inexistente", tiers: [] }, 1) === false),
       `«${sinArea.rol}» · ${sinNadie.motivo.slice(0, 46)}…`);
  }

  // 44 · EL MOTOR RECIBE EL PADRÓN. Todo lo que necesita saber del tenant —qué áreas hay, quién tiene
  // qué nivel en cuál— entra como parámetro. Se le pasa un padrón INVENTADO, con un área y un usuario
  // que no existen en la app, y decide con ése: si consultara `USERS`, `ROL_USUARIO` o `AREAS_CAT` por
  // su cuenta, este caso fallaría. Es lo que permite extraerlo a un servicio sin arrastrar media app.
  {
    const padron = {
      areas: [{ id: "contraloria", label: "Contraloría" }],
      usuarios: [
        { code: "ZZ1", nombre: "Contralor de prueba", rol: "Contralor", atrib: { contraloria: 3 }, superAdmin: false },
        { code: "ZZ2", nombre: "Analista de prueba", rol: "Analista", atrib: { contraloria: 1 }, superAdmin: false },
      ],
      cargos: [{ id: "contralor", rol: "Contralor", area: "contraloria", nivel: 3 }],
    };
    const regla = { area: "contraloria", tiers: [[() => true, "excepcion", 2]] };
    const real = padronAprobadores();
    ok("44 el motor decide con el padrón que recibe, no con los catálogos de la app",
       // el contralor (N3) cubre un requisito N2; el analista (N1) no llega
       puedeAprobarExc("ZZ1", regla, 2, padron) === true
       && puedeAprobarExc("ZZ2", regla, 2, padron) === false
       // y nadie de la app aparece, porque en ese padrón no existen
       && puedeAprobarExc("SR", regla, 2, padron) === false
       // el nombre del cargo también sale del padrón inyectado
       && rolDeAreaNivel("contraloria", 2, padron).rol === "Contralor"
       && rolDeAreaNivel("contraloria", 9, padron).rol === SIN_APROBADOR
       // el padrón real de la app sigue teniendo sus áreas y sus usuarios
       && real.areas.length >= 3 && real.usuarios.some((u) => u.code === "SR"),
       `padrón inyectado: ${padron.usuarios.length} usuarios · real: ${real.usuarios.length}`);
  }

  // 45 · EL ESTADO TAMBIÉN ENTRA. El visado —quién resolvió cada excepción— y el commit de la
  // verificación —qué llamada se registró, qué factura quedó vetada— son estado del SERVIDOR: son
  // evidencia con actor y hora, no preferencias del navegador. Las dos funciones los reciben, así que
  // se levantan tal cual a un resolver. Acá se les pasa un estado INVENTADO y se comprueba que manda.
  {
    const deudorTel45 = TODOS_LB.map((r) => ({ r, v: verifFactura(fac("x", r, 10), { id: "T-45", rutEmisor: "76.111.111-1" }) })).find((x) => x.v.est === "tel");
    if (!deudorTel45) { ok("45 el visado y el commit de verificación entran por parámetro", false, "ningún deudor de prueba requiere verificación"); }
    else {
      const f1 = fac("f1", deudorTel45.r, 30), f2 = fac("f2", deudorTel45.r, 20);
      const deal45 = { id: "T-45", rutEmisor: "76.111.111-1", cliente: "Cliente de prueba", facturasOp: [f1, f2] };
      const sinCommit = filasVerificacion([deal45]);
      // Con la llamada YA registrada para las dos facturas, la fila deja de estar pendiente.
      const conCommit = filasVerificacion([deal45], { tel: { "T-45": { [f1.id]: 1, [f2.id]: 1 } }, vetadas: {} });
      const fa = sinCommit.find((x) => x.rutDeudor === deudorTel45.r);
      const fb = conCommit.find((x) => x.rutDeudor === deudorTel45.r);

      // Y el visado inyectado decide el estado del otorgamiento sin tocar VISADO_STATE.
      const v0 = visadoDealCalc(deal45, {});
      const todoRechazado = {}; (v0.exc || []).forEach((e) => { todoRechazado[e.stKey] = "rechazado"; });
      const v1 = visadoDealCalc(deal45, todoRechazado);

      // Lo que el VISADO decide es el reparto de las excepciones entre pendientes y rechazadas. El
      // `estado` general no sirve de señal: una operación puede estar rechazada por un bloqueo FIRME,
      // que no depende del visado de nadie.
      const nExc = (v0.exc || []).length;
      ok("45 el visado y el commit de verificación entran por parámetro",
         !!fa && fa.estado === "pendiente" && !!fb && fb.estado !== "pendiente"
         && nExc > 0
         && v0.excPend.length === nExc && v0.excRech.length === 0
         && v1.excRech.length === nExc && v1.excPend.length === 0,
         `sin commit «${fa ? fa.estado : "—"}» → con commit «${fb ? fb.estado : "—"}» · ${nExc} excepciones: ${v0.excPend.length} pendientes sin visado → ${v1.excRech.length} rechazadas con visado`);
    }
  }


  // ============================================================================================
  // 46-48 · INC-04 · CARTERA DEL PAR CLIENTE-DEUDOR (C47-C50). La política declara 79 reglas y el
  // motor corría 75: faltaban justo las cuatro que miden la cartera del PAR. Son las gemelas de
  // C40-C43 —reclamados / notas de crédito / mora / CxC— pero medidas contra ESTE deudor, que es
  // donde el deterioro se ve antes de diluirse en el agregado del cliente. Decisión de negocio
  // (11-09-2026): son de tipo D, o sea se evalúan una vez por deudor y su visado es por deudor.
  // ============================================================================================

  // 46 · El catálogo está completo: 79 reglas y ningún código de la política sin implementar.
  {
    const ids = REGLAS_CLIENTE.map((r) => r.cond);
    const falta = [];
    for (let i = 1; i <= 52; i++) { const c = "C" + String(i).padStart(2, "0"); if (!ids.includes(c)) falta.push(c); }
    for (let i = 1; i <= 23; i++) { const d = "D" + String(i).padStart(2, "0"); if (!ids.includes(d)) falta.push(d); }
    for (let i = 1; i <= 4; i++) { const o = "O" + String(i).padStart(2, "0"); if (!ids.includes(o)) falta.push(o); }
    ok("46 el catálogo implementa las 79 reglas de la política",
       REGLAS_CLIENTE.length === 79 && falta.length === 0
       && ["C47", "C48", "C49", "C50"].every((c) => ids.includes(c)),
       `${REGLAS_CLIENTE.length} reglas · sin implementar: ${falta.length ? falta.join(", ") : "ninguna"}`);
  }

  // 47 · C47-C50 SON DEL PAR: una vez POR DEUDOR, con visado por deudor. La prueba contrasta contra
  // sus gemelas de cliente C40-C43, que producen UN ítem con `deudor: null`. Si el motor dedujera el
  // tipo del prefijo del código —como hacía— estas cuatro caerían del lado del cliente y el
  // deterioro con un deudor concreto se visaría como si fuera del cliente completo.
  {
    const dA = LB[0], dB = LB[1];
    const deal47 = { id: "T-47", rutEmisor: "76.111.111-1", cliente: "Cliente de prueba",
                     facturasOp: [fac("a1", dA, 30), fac("b1", dB, 20)] };
    const items = evaluarOtorgItems(deal47);
    const par = items.filter((i) => ["C47", "C48", "C49", "C50"].includes(i.regla.cond));
    const cli = items.filter((i) => ["C40", "C41", "C42", "C43"].includes(i.regla.cond));
    const ruts = [...new Set(par.map((i) => i.deudor && i.deudor.rut))].sort();
    ok("47 C47-C50 se evalúan por deudor y su visado es por deudor",
       par.length === 8 && ruts.length === 2 && ruts.join("|") === [dA, dB].sort().join("|")
       && par.every((i) => i.deudor && i.stKey === i.regla.n + "@" + i.deudor.rut)
       && cli.length === 4 && cli.every((i) => i.deudor === null && i.stKey === String(i.regla.n))
       && ["C47", "C48", "C49", "C50"].every((c) => esReglaDeudor(REGLAS_CLIENTE.find((r) => r.cond === c))),
       `par: ${par.length} ítems sobre ${ruts.length} deudores · cliente: ${cli.length} ítems sin deudor`);
  }

  // 48 · Carácter EXC-COM N1 y re-evaluables, igual que C40-C43. Y la variable del par se regulariza
  // al re-evaluar: si siguiera con el valor del día 1, «re-evaluable» sería una etiqueta que el
  // código no cumple y la excepción quedaría pegada para siempre.
  {
    const rs = ["C47", "C48", "C49", "C50"].map((c) => REGLAS_CLIENTE.find((r) => r.cond === c));
    const nivelExc = (r) => { const t = (r.tiers || []).find((x) => x[1] === "excepcion"); return t && t[2]; };
    const dn = nomDe(LB[0]);
    const v0 = deudorBlock(dn), v1 = deudorBlock(dn, 1);
    const claves = ["cdCarteraReclamada", "cdCarteraNC", "cdCarteraMorosa", "cdCxcPend"];
    ok("48 C47-C50 excepcionan comercial N1, son re-evaluables y su variable se regulariza",
       rs.every((r) => r.area === "comercial" && nivelExc(r) === 1 && reglaReev(r.n))
       && rolDeAreaNivel("comercial", 1).rol === "Jefe de Grupo Comercial"
       && claves.every((k) => v0[k] !== undefined && v1[k] === 0)
       // y no se tocó el sorteo de las variables que ya existían: `rd()` es secuencial
       && v0.cdCruzada === v1.cdCruzada && v0.cdNC === v1.cdNC && v0.dNota === v1.dNota,
       `niveles ${rs.map(nivelExc).join("/")} · aprueba ${rolDeAreaNivel("comercial", 1).rol}`);
  }


  // 49 · INC-06 · NO HAY NIVELES ESPECIALES. C05 «Línea Cliente Nuevo» era la única regla con el nivel
  // escrito a mano —un `1` heredado de homologar «Comité → 1»— y por eso la corrección de INC-01 no la
  // alcanzaba: dejaba la constitución de una línea nueva en el aprobador de MENOR jerarquía. Decisión de
  // negocio (11-09-2026): el Comité de Crédito no es un nivel aparte ni una cuenta del sistema; C05 se
  // configura como todas, con su par (área, nivel). Se comprueba además que NINGUNA regla declare un
  // nivel fuera de N1..N5, que es lo que volvería a abrir la puerta a un nivel que nadie puede cubrir.
  {
    const c05 = REGLAS_CLIENTE.find((r) => r.cond === "C05");
    const excC05 = (c05.tiers || []).find((t) => t[1] === "excepcion");
    const fuera = [];
    REGLAS_CLIENTE.forEach((r) => (r.tiers || []).forEach((t) => {
      if (t[1] === "excepcion" && !(t[2] >= 1 && t[2] <= 5)) fuera.push(`${r.cond} N${t[2]}`);
    }));
    ok("49 el Comité no es un nivel aparte: C05 se rutea como todas",
       !!c05 && c05.area === "riesgo" && excC05[2] === 5
       && rolDeAreaNivel("riesgo", excC05[2]).rol === "Subgerente de Riesgo"
       && rolDeAreaNivel("riesgo", excC05[2]).sinAprobador !== true
       && fuera.length === 0,
       `C05 · riesgo N${excC05[2]} → ${rolDeAreaNivel("riesgo", excC05[2]).rol} · niveles fuera de N1..N5: ${fuera.length ? fuera.join(", ") : "ninguno"}`);
  }


  // ============================================================================================
  // 50-51 · INC-05 · EL MONTO DE LA OPERACIÓN ESCALA LA ATRIBUCIÓN. Decisión de negocio (11-09-2026):
  // son DOS factores y el requisito es el mayor. El tramo del risk tier mide cuánto se desvía la
  // variable de riesgo; el piso por monto mide cuánto se arriesga si ese desvío resulta cierto. Con eso
  // el modelo paralelo de «causas de desvío» —que decidía por monto con la convención invertida y cuya
  // cadena de acción estaba muerta— se retiró entero.
  // ============================================================================================

  // 50 · El piso sube con el monto y NUNCA baja el nivel del tramo.
  {
    const d1 = { id: "T-50", rutEmisor: "76.111.111-1", cliente: "Cliente de prueba", amountMM: 15, facturasOp: [fac("f1", LB[0], 15)] };
    const d2 = { ...d1, amountMM: 200 };
    // C07 se excluye: es la única regla cuyo TRAMO depende del monto (mide el cupo de línea), así que
    // mezclarla no distinguiría el efecto del piso del efecto de su propio tramo.
    const exc = (d) => evaluarOtorgItems(d).filter((i) => i.disp === "excepcion" && i.regla.cond !== "C07");
    const a = exc(d1), b = exc(d2);
    const porKey = {}; a.forEach((i) => { porKey[i.stKey] = i; });
    const comunes = b.filter((i) => porKey[i.stKey]);
    const subio = comunes.filter((i) => i.nivel > porKey[i.stKey].nivel);
    ok("50 el monto de la operación escala el nivel exigido, y nunca lo baja",
       // el piso por tramo de monto, medido de frente
       pisoPorMonto("riesgo", 15) === 1 && pisoPorMonto("riesgo", 50) === 3
       && pisoPorMonto("riesgo", 100) === 4 && pisoPorMonto("riesgo", 200) === 5
       // Comercial SATURA en N3, que es su tope en la política (Gerente General). Pedirle N4 no
       // exigiría más: dejaría la excepción sin aprobador, que es un bug de configuración disfrazado
       // de control. Un área sin piso configurado simplemente no escala.
       && pisoPorMonto("comercial", 100) === 3 && pisoPorMonto("comercial", 200) === 3
       && rolDeAreaNivel("comercial", pisoPorMonto("comercial", 200)).sinAprobador !== true
       && pisoPorMonto("verificacion", 200) === 1
       // es piso, no reemplazo: un tramo N5 sigue siendo N5 en una operación chica
       && nivelExigido("riesgo", 5, 15) === 5 && nivelExigido("riesgo", 2, 200) === 5
       // y en la evaluación real: mismo cliente, mismas reglas, sólo cambia el monto
       && comunes.length > 0 && subio.length > 0
       && comunes.every((i) => i.nivel >= porKey[i.stKey].nivel)
       && [...a, ...b].every((i) => i.nivel >= i.nivelTramo),
       `MM$15 → MM$200: ${subio.length} de ${comunes.length} excepciones suben de nivel`);
  }

  // 51 · El modelo paralelo se retiró de verdad, no quedó desconectado. Y la etapa Otorgamiento se
  // libera por el VISADO: antes dependía de causas que nadie podía autorizar, así que una operación
  // derivada a otorgamiento manual se quedaba ahí para siempre salvo que alguien la moviera a mano.
  {
    const muertos = ["MATRIZ_OTORG", "TIPOS_DESVIO", "tipoActivo", "causasDeDeal", "nivelReqCausa", "puedeAccionarCausa"];
    const vivos = muertos.filter((n) => { try { return eval("typeof " + n) !== "undefined"; } catch (e) { return false; } });
    // lo que SÍ sigue vivo, porque ahora alimenta el piso por monto y el ruteo de etapa
    const conservados = ["CFG_TRAMOS", "gravedadPorMonto", "requiereOtorgamiento", "PISO_ATRIB_MONTO"];
    const faltan = conservados.filter((n) => { try { return eval("typeof " + n) === "undefined"; } catch (e) { return true; } });
    ok("51 el modelo de causas de desvío se retiró entero",
       vivos.length === 0 && faltan.length === 0
       && gravedadPorMonto(15) === "leve" && gravedadPorMonto(200) === "critico",
       `eliminados ${muertos.length}${vivos.length ? " · sobreviven: " + vivos.join(", ") : ""} · conservados ${conservados.length}${faltan.length ? " · faltan: " + faltan.join(", ") : ""}`);
  }


  // ============================================================================================
  // 52-55 · LOS CUATRO DEFECTOS DEL PREDICTOR DE VERIFICACIÓN, corregidos el 11-09-2026. Los cuatro
  // eran casos en que el código NO hacía lo que su propia spec dice, no desfases de documentación.
  // ============================================================================================

  // 52 · VER-01 se evalúa contra el COMMIT, no contra un sorteo. `verifResumenDeal` contaba
  // pendientes desde un estado que `verifFactura` inventaba con `par.h % 3`, sin mirar nunca el
  // repositorio de llamadas: el control que impide girar sin verificación podía pasar con CERO
  // llamadas registradas, y una operación con todo firmado podía quedar bloqueada.
  {
    const dt = TODOS_LB.map((r) => ({ r, v: verifFactura(fac("x", r, 10), { id: "T-52", rutEmisor: "76.111.111-1" }) })).find((x) => x.v.est === "tel");
    if (!dt) { ok("52 la verificación pendiente se cuenta contra las llamadas registradas", false, "ningún deudor de prueba requiere verificación"); }
    else {
      const f1 = fac("f1", dt.r, 30), f2 = fac("f2", dt.r, 20);
      const deal52 = { id: "T-52", rutEmisor: "76.111.111-1", cliente: "Cliente de prueba", facturasOp: [f1, f2] };
      const sin = verifResumenDeal(deal52);
      const media = verifResumenDeal(deal52, { tel: { "T-52": { [f1.id]: { por: "EV", fecha: "x" } } } });
      const todas = verifResumenDeal(deal52, { tel: { "T-52": { [f1.id]: { por: "EV", fecha: "x" }, [f2.id]: { por: "EV", fecha: "x" } } } });
      ok("52 la verificación pendiente se cuenta contra las llamadas registradas",
         sin.tel === 2 && sin.pend === 2 && media.pend === 1 && todas.pend === 0,
         `sin llamadas ${sin.pend} pendientes → con una ${media.pend} → con las dos ${todas.pend}`);
    }
  }

  // 53 · El segmento del par NO depende de quién pregunte. `verifPar` memoizaba con la clave
  // `cliente|deudor` pero recibía el `tipo` por parámetro, y los dos llamadores pasaban cosas
  // distintas: el primero en llegar fijaba nota, segmento y criterios para toda la sesión.
  {
    const r53 = TODOS_LB[3];
    const plano = fac("p1", r53, 25);
    const conHist = { ...fac("p2", r53, 25), histFactoring: "bice" };   // antes esto cambiaba el segmento
    const a = verifFactura(plano, { id: "T-53", rutEmisor: "76.111.111-1" });
    const b = verifFactura(conHist, { id: "T-53", rutEmisor: "76.111.111-1" });
    const c = verifDeudorDeal({ id: "T-53", rutEmisor: "76.111.111-1", facturasOp: [plano] }, nomDe(r53));
    ok("53 el segmento del par no depende de qué pantalla preguntó primero",
       a.segmento === b.segmento && a.nota === b.nota && a.tipo === b.tipo
       && c.par.segmento === a.segmento && c.par.nota === a.nota,
       `${a.segmento} · nota ${a.nota} por los tres caminos`);
  }

  // 54 · Un criterio SIN DATO incumple (§4.3). La regla 6 rellenaba la fecha ausente con el promedio
  // del par: la desviación daba 0 y el criterio CUMPLÍA, que es justo el estado intermedio que la
  // spec dice que no existe.
  {
    const parBase = {
      aplican: ["V06"], protocolo: { existe: false }, recortado: false, prime: false,
      fchVctoProm: 40, pctPagoDeudor3M: 95, mntCompraOp3M: 100, avgVentaProm3M: 100,
      mesesConVenta6M: 6, pctMora25d: 0, pctReclamadas: 0, mntPagoDeudor3M: 2000,
    };
    const sinPlazo = verifDecision(parBase, [{ id: "a", montoMM: 10 }]);                  // sin `venc`
    const conPlazo = verifDecision(parBase, [{ id: "a", montoMM: 10, venc: 41 }]);        // 2,5% de 40
    const fuera    = verifDecision(parBase, [{ id: "a", montoMM: 10, venc: 60 }]);        // 50% de 40
    const st = (r) => (r.evals.find((e) => e.r.id === "V06") || {}).st;
    ok("54 la regla 6 sin plazo incumple, no se rellena con el promedio",
       st(sinPlazo) === "no" && sinPlazo.requiere === true
       && st(conPlazo) === "ok" && conPlazo.requiere === false
       && st(fuera) === "no",
       `sin dato «${st(sinPlazo)}» · dentro del 5% «${st(conPlazo)}» · fuera «${st(fuera)}»`);
  }

  // 55 · El veredicto se CONGELA con el contacto (§9). Antes se recalculaba en cada render contra la
  // oferta vigente, y como retirar las facturas no confirmadas baja el monto, los criterios 3, 4 y 9
  // podían pasar a cumplir: el deudor volvía a «verificado por modelo» y su fila desaparecía de la
  // mesa, borrando la evidencia que alguien acababa de firmar.
  {
    const r55 = TODOS_LB[1];
    const f1 = fac("g1", r55, 12);
    const deal55 = { id: "T-55", rutEmisor: "76.111.111-1", cliente: "Cliente de prueba", facturasOp: [f1] };
    const sinCongelar = filasVerificacion([deal55]);
    const congelado = { "T-55": { [r55]: { est: "tel", resultado: "no_verificada", motivo: "V04", razon: "contacto",
      causas: [{ id: "V04", nombre: "Monto vs relación comercial", valor: "1,20×", umbral: "< 1,0", sinDato: false }],
      por: "Camila Soto", fecha: "11-09-2026 10:00" } } };
    const conCongelado = filasVerificacion([deal55], { veredicto: congelado });
    const fila = conCongelado.find((x) => x.rutDeudor === r55);
    ok("55 el veredicto congelado mantiene la fila en la mesa y sus causas",
       !!fila && fila.causas.length === 1 && fila.causas[0].id === "V04"
       // y sin congelar, la fila sólo está si el predictor de hoy manda a teléfono
       && (sinCongelar.some((x) => x.rutDeudor === r55) === (verifFactura(f1, deal55).est === "tel")),
       `con veredicto congelado la fila existe con su causa ${fila ? fila.causas[0].id : "—"}`);
  }

  console.log(out.join("\n"));
  console.log("\n" + out.filter((x) => x.startsWith("PASA")).length + " de " + out.length + " pasan.");
  return out;
})();
