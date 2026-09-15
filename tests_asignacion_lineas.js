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

   Última corrida: 59/59 PASA.
   ============================================================================================ */
(() => {
  const out = [];
  const ok = (n, cond, det) => out.push((cond ? "PASA  " : "FALLA ") + n + (det ? "  · " + det : ""));

  // EMISOR REAL DEL ACTIVO. El libro de ventas dejó de sintetizarse y se lee del A1, así que un RUT
  // inventado no tiene libro: los casos que lo miran tienen que sembrar un cedente que el archivo
  // declare. Se elige el que más facturas trae, para que los recortes por ventana dejen muestra.
  const EMISOR_LIBRO = (() => {
    const c = {}; for (const r of (window.DTESYNC || [])) { if (r && r.RUTEmisor) c[r.RUTEmisor] = (c[r.RUTEmisor] || 0) + 1; }
    return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || "";
  })();

  // Deudores PRIME reales de la lista blanca, con nota distinta entre sí: es lo único que hace
  // válida la prueba de la línea compartida (ambos tienen que caer en la MISMA categoría).
  const LB = [...LB_RUT].slice(0, 12);
  // Para buscar un deudor que REQUIERA verificación hace falta toda la lista: los atributos del par
  // son sintéticos y están sembrados por la clave de `verifPar`, así que acotar la búsqueda a doce
  // ata la prueba a un sorteo concreto y basta cambiar la semilla para que no encuentre ninguno.
  const TODOS_LB = [...LB_RUT];
  const nomDe = (r) => "DEU-" + r;
  // La nota es un DATO del activo A11 y se resuelve por RUT: los nombres de prueba son sintéticos,
  // pero los RUT son de la lista blanca real y sí están en el maestro de empresa.
  // Se recorre TODA la lista blanca, no los doce primeros: la nota ya no se sortea por nombre sino
  // que viene del maestro de empresa, así que acotar el pool puede dar doce deudores con la misma
  // nota y dejar sin sentido las pruebas que necesitan un «mejor» y un «peor».
  const conNota = [...LB_RUT].map((r) => ({ rut: r, nota: notaDeudor(nomDe(r), r) || 0 })).sort((a, b) => b.nota - a.nota);
  const alto = conNota[0], bajo = conNota[conNota.length - 1];
  const noPrime = "99.999.999-9";

  // Los escenarios se ESCRIBEN en millones, que es como los enuncia el negocio («una LF3 de 120»),
  // pero los helpers emiten PESOS, que es la unidad real del motor: nada aguas adentro trabaja en
  // millones. `mm()` devuelve la salida a millones para poder afirmar sobre la cifra del enunciado.
  const MMF = 1e6;
  const mm = (x) => Math.round((x || 0) * 10 / MMF) / 10;
  const fac = (id, rut, monto) => ({ id, folio: id, deudor: nomDe(rut), rutRecep: rut, monto: Math.round(monto * MMF), tipoDeudor: "Lista Blanca" });
  const facOtro = (id, rut, monto) => ({ id, folio: id, deudor: "NoPrime-" + rut, rutRecep: rut, monto: Math.round(monto * MMF), tipoDeudor: "Otro" });
  const L = (id, tipo, rut, ap, vig) => ({ id, tipo, granularidad: "par", rutDeudor: rut, aprobado: Math.round(ap * MMF), vigente: Math.round((vig || 0) * MMF) });
  const comodin = (ap, vig, susp) => ({ id: "LF4-T", tipo: "LF4", granularidad: "comodin", categoria: "Lista Blanca", rutDeudor: null, aprobado: Math.round(ap * MMF), vigente: Math.round((vig || 0) * MMF), suspendida: !!susp });
  const estB = (lineas, asignada, uso) => ({ estado: "B", asignadaCliente: Math.round(asignada * MMF), usoCliente: Math.round((uso || 0) * MMF), lineas, cola: [] });
  const estA = () => ({ estado: "A", asignadaCliente: 30 * MMF, usoCliente: 0, cola: [], lineas: [{ id: "LF1-t", tipo: "LF1", granularidad: "comodin", rutDeudor: null, aprobado: 30 * MMF, vigente: 0, soloPrime: true, unSoloUso: true }] });
  const dl = (rut, ap, vig) => ({ rutDeudor: rut, nombre: nomDe(rut), tipo: "Lista Blanca", aprobado: Math.round(ap * MMF), vigente: Math.round((vig || 0) * MMF), nClientes: 3 });
  let r;

  // 1 · LF2 holgada, una factura chica → con línea, origen LF2 completa
  r = asignarLineas([fac("f1", LB[0], 20)], "X", { estado: estB([L("LF2-a", "LF2", LB[0], 200)], 5000), deudores: { [LB[0]]: dl(LB[0], 900) } });
  ok("1 LF2 holgada", mm(r.cursable) === 20 && r.facturas[0].origen.length === 1 && r.facturas[0].origen[0].tipo === "LF2", "cursable " + r.cursable);

  // 2 · LF3 de 120 con facturas por 84,1 → todo desde LF3; se consume completa, caducan 35,9
  r = asignarLineas([fac("f1", LB[1], 50), fac("f2", LB[1], 34.1)], "X", { estado: estB([L("LF3-b", "LF3", LB[1], 120), L("LF2-b", "LF2", LB[1], 200)], 5000), deudores: { [LB[1]]: dl(LB[1], 900) } });
  const l3 = r.lineasUsadas.find((x) => x.tipo === "LF3");
  ok("2 la puntual se consume completa", mm(r.cursable) === 84.1 && l3 && mm(l3.montoCaducado) === 35.9, "usado " + (l3 && l3.usado) + " caduca " + (l3 && l3.montoCaducado));

  // 3 · factura de 130 con LF3 de 60 y LF2 de 172 → repartida 60 + 70, en ese orden
  r = asignarLineas([fac("f1", LB[2], 130)], "X", { estado: estB([L("LF3-c", "LF3", LB[2], 60), L("LF2-c", "LF2", LB[2], 172)], 5000), deudores: { [LB[2]]: dl(LB[2], 900) } });
  const o = r.facturas[0].origen;
  ok("3 una factura repartida entre dos líneas", o.length === 2 && o[0].tipo === "LF3" && mm(o[0].monto) === 60 && mm(o[1].monto) === 70, JSON.stringify(o.map((x) => x.tipo + ":" + mm(x.monto))));

  // 4 · par holgado pero la línea del deudor sólo tiene 150 → parcial, motivo `deudor`
  r = asignarLineas([fac("f1", LB[3], 130), fac("f2", LB[3], 85), fac("f3", LB[3], 42.3)], "X", { estado: estB([L("LF2-d", "LF2", LB[3], 900)], 5000), deudores: { [LB[3]]: dl(LB[3], 150) } });
  const rech = r.facturas.filter((f) => f.estado === "REQUIERE_COMITE");
  ok("4 manda la línea del deudor", r.deudores[0].estado === "parcial" && rech.length === 2 && rech.every((f) => f.motivo === "deudor"), "cursable " + r.cursable + " comité " + r.requiereComite);

  // 5 · sin LF2 ni LF3, línea de otros deudores con saldo → la financia esa
  r = asignarLineas([fac("f1", LB[4], 18)], "X", { estado: estB([comodin(40, 0)], 5000), deudores: { [LB[4]]: dl(LB[4], 900) } });
  ok("5 la financia la línea de otros deudores", mm(r.cursable) === 18 && r.facturas[0].origen[0].tipo === "LF4", "");

  // 6 · línea de otros deudores agotada por un deudor de MEJOR nota → el de peor nota sin línea
  const inj = () => ({ estado: estB([comodin(40, 0)], 5000), deudores: { [alto.rut]: dl(alto.rut, 900), [bajo.rut]: dl(bajo.rut, 900) } });
  r = asignarLineas([fac("fB", bajo.rut, 20), fac("fA", alto.rut, 35)], "X", inj());
  ok("6 la línea de otros deudores se agota por orden de nota", r.deudores[0].rut === alto.rut && r.facturas.find((f) => f.id === "fB").motivo === "lf4", "orden " + r.deudores.map((d) => d.nota).join(">"));

  // 7 · agregar un deudor de mejor nota reordena y cambia el resultado de los que vienen detrás
  const soloB = asignarLineas([fac("fB", bajo.rut, 35)], "X", inj());
  const conA = asignarLineas([fac("fB", bajo.rut, 35), fac("fA", alto.rut, 35)], "X", inj());
  ok("7 el recálculo es completo", mm(soloB.cursable) === 35 && conA.facturas.find((f) => f.id === "fB").estado === "REQUIERE_COMITE" && conA.facturas.find((f) => f.id === "fA").estado === "CON_LINEA", "solo fB " + soloB.cursable + " · con fA " + conA.cursable);

  // 8 · quitar las facturas de un deudor libera cupo para el resto
  ok("8 quitar un deudor libera cupo", mm(conA.requiereComite) === 35 && mm(soloB.requiereComite) === 0, "con fA " + conA.requiereComite + " · sin fA " + soloB.requiereComite);

  // 9 · selección vacía
  r = asignarLineas([], "X", { estado: estB([L("LF2-z", "LF2", LB[0], 200)], 5000), deudores: {} });
  ok("9 selección vacía", r.vacia === true && mm(r.cursable) === 0 && mm(r.requiereComite) === 0, "");

  // 10 · función pura: dos corridas idénticas dan lo mismo y no mutan el estado inyectado
  const inj10 = { estado: estB([L("LF2-p", "LF2", LB[0], 100)], 5000), deudores: { [LB[0]]: dl(LB[0], 900) } };
  const a1 = asignarLineas([fac("f1", LB[0], 60)], "X", inj10);
  const a2 = asignarLineas([fac("f1", LB[0], 60)], "X", inj10);
  ok("10 el motor es puro e idempotente", a1.cursable === a2.cursable && mm(a1.cursable) === 60 && inj10.estado.lineas[0].vigente === 0, "");

  // 11 · una línea de otros deudores suspendida conserva su exposición pero no admite nada nuevo
  r = asignarLineas([fac("f1", bajo.rut, 5)], "X", { estado: estB([comodin(40, 0, true)], 5000), deudores: { [bajo.rut]: dl(bajo.rut, 900) } });
  ok("11 la línea suspendida no financia", mm(r.cursable) === 0 && r.facturas[0].motivo === "lf4", "");

  // 12 · la línea de otros deudores NUNCA es colchón de un deudor que ya tiene línea propia
  r = asignarLineas([fac("f1", alto.rut, 50)], "X", { estado: estB([L("LF2-x", "LF2", alto.rut, 30), comodin(400, 0)], 5000), deudores: { [alto.rut]: dl(alto.rut, 900) } });
  ok("12 no es colchón del que tiene línea propia", mm(r.cursable) === 0 && r.facturas[0].motivo === "par", "motivo " + r.facturas[0].motivo);

  // 13 · el tope del cliente bloquea cuando su línea asignada está casi consumida
  r = asignarLineas([fac("f1", alto.rut, 50)], "X", { estado: estB([L("LF2-y", "LF2", alto.rut, 900)], 1000, 980), deudores: { [alto.rut]: dl(alto.rut, 900) } });
  ok("13 el tope del cliente bloquea", mm(r.cursable) === 0 && r.facturas[0].motivo === "cliente", "disponible " + r.dispCliente);

  // 14 · asignación por factura COMPLETA, la grande primero
  r = asignarLineas([fac("f1", alto.rut, 60), fac("f2", alto.rut, 30)], "X", { estado: estB([L("LF2-w", "LF2", alto.rut, 70)], 5000), deudores: { [alto.rut]: dl(alto.rut, 900) } });
  ok("14 factura completa, la grande primero", mm(r.cursable) === 60 && r.facturas.find((f) => f.id === "f1").estado === "CON_LINEA", "cursable " + r.cursable);

  // 15 · cliente en estado A: la LF1 sólo admite deudores prime y sólo hasta $30M
  r = asignarLineas([fac("f1", alto.rut, 18), facOtro("f2", noPrime, 5)], "X", { estado: estA(), deudores: { [alto.rut]: dl(alto.rut, 900), [noPrime]: dl(noPrime, 900) } });
  ok("15 la LF1 sólo cubre deudores prime", mm(r.cursable) === 18 && r.facturas.find((f) => f.id === "f2").motivo === "lf1", "cursable " + r.cursable);

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
     mm(antes17.cursable) === 0 && mm(r.cursable) === 80 && r.diff.ganaron === 1 && mm(r.diff.montoGanado) === 80
     && r.diff.perdieron === 0 && r.facturas[0].cambio === "gano_linea",
     "ganaron " + r.diff.ganaron + " por " + mm(r.diff.montoGanado));

  // 18 · el cupo se consumió en OTRO negocio (cursado por otro canal) → ahora califican menos
  const antes18 = asignarLineas([fac("f1", LB[7], 80)], "X", { estado: estB([L("LF2-c1", "LF2", LB[7], 300)], 5000), deudores: { [LB[7]]: dl(LB[7], 900) } });
  r = asignarLineas([fac("f1", LB[7], 80)], "X", { estado: estB([L("LF2-c1", "LF2", LB[7], 300, 260)], 5000), deudores: { [LB[7]]: dl(LB[7], 900) }, previa: previa(snap(antes18)) });
  ok("18 otro negocio consumió el cupo: ahora va a comité",
     mm(antes18.cursable) === 80 && mm(r.cursable) === 0 && r.diff.perdieron === 1 && mm(r.diff.montoPerdido) === 80
     && r.facturas[0].cambio === "perdio_linea",
     "perdieron " + r.diff.perdieron + " por " + mm(r.diff.montoPerdido));

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
     mm(acep21.cursable) === 80 && mm(rec21.cursable) === 50 && rec21.facturas.length === 1
     && JSON.stringify(q1.origen) === JSON.stringify(acep21.facturas.find((f) => f.id === "f1").origen)
     && rec21.recorte.retiradas === 1 && mm(rec21.recorte.montoRetirado) === 30,
     "80 → " + mm(rec21.cursable) + " · retirado " + mm(rec21.recorte.montoRetirado));

  // 22 · el cupo liberado NO vuelve solo: la reserva sigue puesta hasta que la liberen afuera
  const dispAntes = (acep21.deudores[0].detallePar[0] || {}).disponible;
  const dispDespues = (rec21.deudores[0].detallePar[0] || {}).disponible;
  ok("22 recortar no devuelve el cupo por sí solo",
     dispAntes === dispDespues && mm(rec21.deudores[0].asignado) === 50 && rec21.deudores[0].nFacturas === 1,
     "disponible " + mm(dispAntes) + " = " + mm(dispDespues) + " · asignado " + mm(rec21.deudores[0].asignado));

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
  const facV25 = { id: "fx25", folio: "9001", monto: 40 * MMF, deudor: "DEU-X" };
  repoNoConfirmadas.set(dealV25.id, { fx25: { folio: "9001", monto: 40 * MMF, deudor: "DEU-X", por: "test", fecha: "hoy" } });
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
       !!fila && fila.facturas.length === 2 && mm(fila.monto) === 50 && fila.estado === "pendiente" && fila.causas.length >= 1,
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
    // Los dos cargos de Operaciones —N3 y N5— cubren un requisito N1 por escalada, y ninguno de otra
    // área entra: eso es lo que este caso mide. La lista crece cuando se da de alta un cargo del área,
    // que es configuración; lo que no puede pasar es que aparezca alguien de Riesgo o de Comercial.
    ok("38 una excepción de Operaciones la aprueba Operaciones, no Riesgo",
       !!c01 && c01.area === "operaciones" && t01[2] === 1
       && JSON.stringify(apruebanDe(c01, t01[2])) === JSON.stringify(["Andrés Mella", "Ignacio Peña"]),
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
    // de la operación sube el nivel exigido, así que un tramo con aprobador a M$15 puede quedarse sin
    // ninguno a M$200 si el piso de su área pide más de lo que esa área alcanza.
    const montos = [15, 50, 100, 200];
    (typeof REGLAS_CLIENTE !== "undefined" ? REGLAS_CLIENTE : []).forEach((r) => (r.tiers || []).forEach((t) => {
      if (t[1] !== "excepcion") return;
      nTramos++;
      montos.forEach((mm) => {
        const niv = nivelExigido(r.area, t[2], mm);
        if (!apruebanDe(r, niv).length) huerfanos.push(`${r.cond} ${r.area} N${niv} (M$${mm})`);
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

  // 46 · El catálogo está completo: las 75 reglas VIGENTES de la política v1.0 —C01-C46 + C51-C52,
  // D01-D23, O01-O04— y ningún código sin implementar. C47-C50 se retiraron por estar dominadas por
  // C40-C43 (ver el caso 48), así que no cuentan como cobertura faltante: cuentan como retiradas.
  // Se cuentan por separado las reglas que NO son de ese documento:
  // O05 (evidencia del contrato de cesión) y O06 (monto cedido igual al monto del documento) salen del
  // proceso, no del modelo de riesgo, y contarlas junto a las otras haría que este caso dejara de medir
  // lo que dice medir —la cobertura de la política— y pasara a medir el largo de un array.
  {
    const ids = REGLAS_CLIENTE.map((r) => r.cond);
    const POLITICA = [];
    for (let i = 1; i <= 52; i++) { if (i >= 47 && i <= 50) continue; POLITICA.push("C" + String(i).padStart(2, "0")); }
    for (let i = 1; i <= 23; i++) POLITICA.push("D" + String(i).padStart(2, "0"));
    for (let i = 1; i <= 4; i++) POLITICA.push("O" + String(i).padStart(2, "0"));
    const falta = POLITICA.filter((c) => !ids.includes(c));
    const dePolitica = REGLAS_CLIENTE.filter((r) => POLITICA.includes(r.cond));
    const fuera = REGLAS_CLIENTE.filter((r) => !POLITICA.includes(r.cond)).map((r) => r.cond);
    ok("46 el catálogo implementa las 75 reglas vigentes de la política",
       dePolitica.length === 75 && falta.length === 0
       && ["C47", "C48", "C49", "C50"].every((c) => !ids.includes(c))
       // Fuera de la política, sólo las PROPIAS del proceso, con su área y su nivel —que es lo que las
       // rutea—: O05 (evidencia del contrato) y O06 (monto cedido vs. monto del documento). Las dos
       // son de Operaciones. Se cuentan aparte para que este caso siga midiendo la cobertura de la
       // política y no el largo de un array.
       && fuera.length === 2 && fuera.join(",") === "O05,O06"
       && REGLAS_CLIENTE.find((r) => r.cond === "O05").area === "operaciones"
       && REGLAS_CLIENTE.find((r) => r.cond === "O05").tiers[0][2] === 3
       && REGLAS_CLIENTE.find((r) => r.cond === "O06").area === "operaciones"
       && REGLAS_CLIENTE.find((r) => r.cond === "O06").tiers.map((t) => t[2]).join(",") === "5,3",
       `${dePolitica.length} de la política + ${fuera.length} propia(s) (${fuera.join(", ") || "—"}) · sin implementar: ${falta.length ? falta.join(", ") : "ninguna"}`);
  }

  // 47 · Una regla de DEUDOR se evalúa una vez POR DEUDOR, con visado por deudor; una de cliente
  // produce UN ítem con `deudor: null`. El testigo eran C47-C50 hasta que se retiraron; la propiedad
  // sigue siendo la misma y ahora la sostienen D01-D04 contra C40-C43. Lo que cuida es que el motor no
  // deduzca el tipo del PREFIJO del código —como hacía—: si lo dedujera, el deterioro con un deudor
  // concreto se visaría como si fuera del cliente completo.
  {
    const dA = LB[0], dB = LB[1];
    const deal47 = { id: "T-47", rutEmisor: "76.111.111-1", cliente: "Cliente de prueba",
                     facturasOp: [fac("a1", dA, 30), fac("b1", dB, 20)] };
    const items = evaluarOtorgItems(deal47);
    const CODS = ["D01", "D02", "D03", "D04"];
    const par = items.filter((i) => CODS.includes(i.regla.cond));
    const cli = items.filter((i) => ["C40", "C41", "C42", "C43"].includes(i.regla.cond));
    const ruts = [...new Set(par.map((i) => i.deudor && i.deudor.rut))].sort();
    ok("47 una regla de deudor se evalúa por deudor y su visado es por deudor",
       par.length === 8 && ruts.length === 2 && ruts.join("|") === [dA, dB].sort().join("|")
       && par.every((i) => i.deudor && i.stKey === i.regla.n + "@" + i.deudor.rut)
       && cli.length === 4 && cli.every((i) => i.deudor === null && i.stKey === String(i.regla.n))
       && CODS.every((c) => esReglaDeudor(REGLAS_CLIENTE.find((r) => r.cond === c))),
       `par: ${par.length} ítems sobre ${ruts.length} deudores · cliente: ${cli.length} ítems sin deudor`);
  }

  // 48 · Carácter EXC-COM N1 y re-evaluables, igual que C40-C43. Y la variable del par se regulariza
  // al re-evaluar: si siguiera con el valor del día 1, «re-evaluable» sería una etiqueta que el
  // código no cumple y la excepción quedaría pegada para siempre.
  // C47–C50 SE RETIRARON del catálogo: eran la cartera del par cliente-deudor y quedaban dominadas por
  // C40–C43, que miden lo mismo a nivel de cliente con umbral `> 0` — si el par tiene un documento
  // reclamado, el cliente también, así que C40 ya había levantado la excepción. El test pasa a fijar la
  // decisión: ni las reglas ni sus variables pueden volver sin que esto se caiga.
  {
    const rs = ["C47", "C48", "C49", "C50"].map((c) => REGLAS_CLIENTE.find((r) => r.cond === c));
    const dn = nomDe(LB[0]);
    const v = deudorBlock({ rutEmisor: "" }, { nombre: dn });
    const claves = ["cdCarteraReclamada", "cdCarteraNC", "cdCarteraMorosa", "cdCxcPend"];
    const dominantes = ["C40", "C41", "C42", "C43"].map((c) => REGLAS_CLIENTE.find((r) => r.cond === c));
    ok("48 C47-C50 están retiradas y las dominantes C40-C43 siguen en pie",
       rs.every((r) => r === undefined)
       && claves.every((k) => v[k] === undefined)
       && dominantes.every((r) => r && (r.tiers || []).some((t) => t[1] === "excepcion"))
       // 77 = las 75 vigentes de la política v1.0 + las dos propias del proceso (O05, O06).
       && REGLAS_CLIENTE.filter((r) => /^[COD]\d\d$/.test(r.cond || "")).length === 77,
       `catálogo ${REGLAS_CLIENTE.filter((r) => /^[COD]\d\d$/.test(r.cond || "")).length} reglas · C40-C43 presentes`);
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
    const d1 = { id: "T-50", rutEmisor: "76.111.111-1", cliente: "Cliente de prueba", monto: 15 * MMF, facturasOp: [fac("f1", LB[0], 15)] };
    const d2 = { ...d1, monto: 200 * MMF };
    // C07 se excluye: es la única regla cuyo TRAMO depende del monto (mide el cupo de línea), así que
    // mezclarla no distinguiría el efecto del piso del efecto de su propio tramo.
    const exc = (d) => evaluarOtorgItems(d).filter((i) => i.disp === "excepcion" && i.regla.cond !== "C07");
    const a = exc(d1), b = exc(d2);
    const porKey = {}; a.forEach((i) => { porKey[i.stKey] = i; });
    const comunes = b.filter((i) => porKey[i.stKey]);
    const subio = comunes.filter((i) => i.nivel > porKey[i.stKey].nivel);
    ok("50 el monto de la operación escala el nivel exigido, y nunca lo baja",
       // el piso por tramo de monto, medido de frente
       pisoPorMonto("riesgo", 15 * MMF) === 1 && pisoPorMonto("riesgo", 50 * MMF) === 3
       && pisoPorMonto("riesgo", 100 * MMF) === 4 && pisoPorMonto("riesgo", 200 * MMF) === 5
       // Comercial SATURA en N3, que es su tope en la política (Gerente General). Pedirle N4 no
       // exigiría más: dejaría la excepción sin aprobador, que es un bug de configuración disfrazado
       // de control. Un área sin piso configurado simplemente no escala.
       && pisoPorMonto("comercial", 100 * MMF) === 3 && pisoPorMonto("comercial", 200 * MMF) === 3
       && rolDeAreaNivel("comercial", pisoPorMonto("comercial", 200 * MMF)).sinAprobador !== true
       && pisoPorMonto("verificacion", 200 * MMF) === 1
       // es piso, no reemplazo: un tramo N5 sigue siendo N5 en una operación chica
       && nivelExigido("riesgo", 5, 15 * MMF) === 5 && nivelExigido("riesgo", 2, 200 * MMF) === 5
       // y en la evaluación real: mismo cliente, mismas reglas, sólo cambia el monto
       && comunes.length > 0 && subio.length > 0
       && comunes.every((i) => i.nivel >= porKey[i.stKey].nivel)
       && [...a, ...b].every((i) => i.nivel >= i.nivelTramo),
       `M$15 → M$200: ${subio.length} de ${comunes.length} excepciones suben de nivel`);
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
       && gravedadPorMonto(15 * MMF) === "leve" && gravedadPorMonto(200 * MMF) === "critico",
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
    const sinPlazo = verifDecision(parBase, [{ id: "a", monto: 10 * MMF }]);                  // sin `venc`
    const conPlazo = verifDecision(parBase, [{ id: "a", monto: 10 * MMF, venc: 41 }]);        // 2,5% de 40
    const fuera    = verifDecision(parBase, [{ id: "a", monto: 10 * MMF, venc: 60 }]);        // 50% de 40
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


  // ============================================================================================
  // 56-59 · LO QUE DECIDE, DECIDE CON LO QUE SE LE INYECTA. La auditoría transitiva del 12-09-2026
  // encontró cuatro cadenas donde una función parecía pura —su cuerpo no menciona ningún global— y
  // sin embargo sus ENTRADAS salían de uno, una llamada más abajo. Un analizador estático no puede
  // distinguir «lee el global» de «cae al global sólo si no le pasan el estado»; esto sí: se le
  // inyecta un estado que contradice al del navegador y se comprueba cuál manda.
  // ============================================================================================

  // 56 · Las VARIABLES del motor de otorgamiento. Antes salían de `SIM_VERSIONS` vía
  // `varsClienteActual`, así que `evaluarOtorgItems` no se podía levantar a un servicio.
  {
    const deal56 = { id: "T-56", rutEmisor: "76.111.111-1", cliente: "Cliente de prueba", monto: 40 * MMF,
                     facturasOp: [fac("s1", LB[0], 40)] };
    const base = apiVarsCliente(deal56, 0);
    const ver = (v) => ({ versiones: { "T-56": [{ vars: { ...base, tgrCobrJud: v } }] } });
    // C30 «TGR cobranza judicial» es KNOCKOUT: > 0 ⇒ rechazo firme no excepcionable.
    const sinTGR = visadoDealCalc(deal56, {}, ver(0));
    const conTGR = visadoDealCalc(deal56, {}, ver(5e6));
    const ko = (v) => v.rechFirme.some((r) => r.n === 130);
    ok("56 el motor de otorgamiento decide con las variables que se le inyectan",
       !ko(sinTGR) && ko(conTGR) && conTGR.estado === "rechazada"
       // y la versión inyectada gana sobre la del navegador, que para esta operación no existe
       && evaluarOtorgItems(deal56, ver(5e6)).some((i) => i.regla.n === 130 && i.disp === "rechazado"),
       `TGR 0 → ${sinTGR.estado} sin knockout · TGR $5M → ${conTGR.estado} con C30`);
  }

  // 57 · El VETO de la verificación. `estadoCandidata` decide si una factura se puede incorporar a la
  // oferta; su veto salía de `NO_CONFIRMADAS` una llamada más abajo, en `noConfirmada`.
  {
    const f57 = fac("v1", LB[2], 18);
    const deal57 = { id: "T-57", rutEmisor: "76.111.111-1", facturasOp: [], facturasDisponibles: [f57] };
    const libre = estadoCandidata(f57, deal57);
    const vetada = estadoCandidata(f57, deal57, { vetadas: { "T-57": { [f57.id]: { por: "EV", fecha: "x" } } } });
    ok("57 el veto de la verificación entra por parámetro",
       libre.agregable === true && libre.clave !== "noConfirmada"
       && vetada.agregable === false && vetada.bloqueada === true && vetada.clave === "noConfirmada",
       `sin veto «${libre.clave}» agregable · con veto «${vetada.clave}» bloqueada`);
  }

  // 58 · El VISADO, que es lo que LIBERA EL GIRO. `otorgamientoCompleto` lo leía de `VISADO_STATE` a
  // través de `visadoDeal`, y encima con cache: dos motivos para que no pudiera decidir en el servidor.
  {
    const deal58 = { id: "T-58", rutEmisor: "76.111.111-1", cliente: "Cliente de prueba", monto: 30 * MMF,
                     stage: "otorgamiento", facturasOp: [fac("w1", LB[3], 30)], aceptada: true, firmada: true };
    const v0 = visadoDeal(deal58, { visado: {} });
    const todoAprobado = {}; v0.exc.forEach((e) => { todoAprobado[e.stKey] = "aprobado"; });
    const todoRechazado = {}; v0.exc.forEach((e) => { todoRechazado[e.stKey] = "rechazado"; });
    const vA = visadoDeal(deal58, { visado: todoAprobado });
    const vR = visadoDeal(deal58, { visado: todoRechazado });
    ok("58 el visado que libera el giro entra por parámetro, sin pasar por el cache",
       v0.exc.length > 0
       && v0.excPend.length === v0.exc.length && v0.excRech.length === 0
       && vA.excPend.length === 0 && vA.excRech.length === 0 && vA.estado !== "rechazada"
       && vR.excRech.length === v0.exc.length && vR.estado === "rechazada"
       // el cache no envenena: pedir dos estados distintos para la MISMA operación da dos respuestas
       && visadoDeal(deal58, { visado: {} }).excPend.length === v0.exc.length,
       `${v0.exc.length} excepciones · sin visar ${v0.excPend.length} pendientes · aprobadas ${vA.excPend.length} · rechazadas ${vR.excRech.length}`);
  }

  // 59 · Los NOMBRES de los aprobadores salen del padrón, no de `USERS`. Era la última lectura de
  // datos del tenant que quedaba dentro del motor.
  {
    const padron59 = {
      areas: [{ id: "contraloria", label: "Contraloría" }],
      usuarios: [{ code: "ZZ9", nombre: "Persona Inventada", rol: "Contralor",
                   etiqueta: "Persona Inventada · Contralor", atrib: { contraloria: 3 }, superAdmin: false }],
      cargos: [{ id: "contralor", rol: "Contralor", area: "contraloria", nivel: 3 }],
    };
    const regla59 = { area: "contraloria", tiers: [[() => true, "excepcion", 2]] };
    const nombres = aprobadoresExc(regla59, 2, padron59);
    const real = aprobadoresExc(REGLAS_CLIENTE.find((r) => r.cond === "C21"), 5);
    ok("59 los nombres de los aprobadores salen del padrón, no del catálogo de usuarios",
       nombres.length === 1 && nombres[0] === "Persona Inventada · Contralor"
       && typeof USERS["ZZ9"] === "undefined"          // no existe en la app: sólo pudo salir del padrón
       && real.length > 0 && real.every((n) => typeof n === "string" && n.length),
       `inyectado → «${nombres[0]}» · real → «${real.join(", ")}»`);
  }


  // ============================================================================================
  // 60-62 · VACACIONES Y REEMPLAZOS. Mientras alguien está fuera, quien lo cubre asume sus
  // atribuciones. Lo que se prueba acá es que eso está ACOTADO al período y que queda ESCRITO:
  // una atribución que se filtra un día antes o que no deja rastro en la bitácora es peor que no
  // tenerla, porque nadie puede explicar después por qué esa persona pudo aprobar eso.
  // ============================================================================================

  // 60 · La atribución se presta sólo DURANTE el período, y por el PADRÓN. Se prueba con fechas
  // inyectadas y no con el reloj: quién puede aprobar el 3 de enero es una pregunta de respuesta fija.
  {
    // EJ1 es un ejecutivo comercial: no aprueba excepciones. SR es Subgerente de Riesgo (riesgo N4).
    const ejec = Object.keys(EXECS)[0];
    const rmp60 = [{ id: "r60", ausente: "SR", reemplazante: ejec, desde: "2026-03-10", hasta: "2026-03-20", motivo: "Vacaciones" }];
    const c21 = REGLAS_CLIENTE.find((r) => r.cond === "C21");   // riesgo, excepción de nivel alto
    const anR = (hoy) => padronAprobadores(hoy, rmp60);
    const puede = (hoy) => puedeAprobarExc(ejec, c21, 4, anR(hoy));
    const antes = puede("2026-03-09"), durante = puede("2026-03-15"), despues = puede("2026-03-21");
    const uDur = anR("2026-03-15").usuarios.find((u) => u.code === ejec);
    const uSR = anR("2026-03-15").usuarios.find((u) => u.code === "SR");
    // el nivel se lee del padrón SIN reemplazos: lo que se prueba es que se preste el que SR tiene,
    // no un número escrito acá que se desactualiza si cambia su cargo en Configuración › Usuarios
    const nSR = (padronAprobadores("2026-03-15", []).usuarios.find((u) => u.code === "SR") || { atrib: {} }).atrib.riesgo;
    // ADITIVO: el ausente NO pierde lo suyo, y el reemplazante conserva su propia área.
    const srSigue = puedeAprobarExc("SR", c21, 4, anR("2026-03-15"));
    ok("60 el reemplazante asume las atribuciones sólo durante el período",
       antes === false && durante === true && despues === false
       && uDur && nSR && uDur.atrib.riesgo === nSR && uDur.cubre && uDur.cubre[0].code === "SR"
       && uSR && uSR.ausente && uSR.ausente.porCode === ejec
       && srSigue === true
       // y el padrón memoizado no envenena: la firma incluye la fecha y los reemplazos
       && puede("2026-03-15") === true && puede("2026-03-09") === false,
       `${ejec} sin reemplazo no aprueba · 10→20 marzo sí (riesgo N${uDur ? uDur.atrib.riesgo : "?"} = el de ${nombreDe("SR")}) · el 21 no · ${nombreDe("SR")} conserva la suya`);
  }

  // 61 · La bitácora identifica al REEMPLAZANTE. `actorEtiqueta` es lo que firma el visado y la
  // verificación, y `registrarAuditoria` estampa además el campo consultable.
  {
    const ejec = Object.keys(EXECS)[0];
    const rmp61 = [{ id: "r61", ausente: "SR", reemplazante: ejec, desde: hoyISO(), hasta: hoyISO(), motivo: "Vacaciones" }];
    // la etiqueta se prueba INYECTANDO la lista; la bitácora, con el estado real, que es su camino
    const etq = actorEtiqueta(ejec, null, rmp61);
    const etqSR = actorEtiqueta("SR", null, rmp61);   // el ausente firma como él mismo si actúa
    const guardados = REEMPLAZOS, guardadaSesion = SESION;
    try {
      REEMPLAZOS = rmp61;
      SESION = { ...(SESION || {}), usuario: ejec };
      const antes = AUDIT_LOG.length;
      registrarAuditoria({ usuario: USERS[ejec], modulo: "Test", accion: "Excepción visada", glosa: "prueba 61", exito: true });
      const reg = AUDIT_LOG[0];
      ok("61 la bitácora identifica que la acción la hizo un reemplazante",
         etq.includes("en reemplazo de " + nombreDe("SR"))
         && etqSR === USERS["SR"]
         && AUDIT_LOG.length === antes + 1
         && Array.isArray(reg.reemplazoDe) && reg.reemplazoDe[0].code === "SR"
         && /REEMPLAZANTE/.test(reg.glosa) && reg.usuario.includes("en reemplazo de"),
         `«${etq}» · campo reemplazoDe=[${reg.reemplazoDe.map((x) => x.code).join(",")}] · glosa con REEMPLAZANTE`);
    } finally { REEMPLAZOS = guardados; SESION = guardadaSesion; }
  }

  // 62 · Higiene del storage y del período. Una fila corrupta daría atribuciones a alguien que no
  // existe: es el mismo riesgo que roles y áreas, y se corta al cargar. Y el reemplazo no invierte la
  // jerarquía: el reemplazante toma el MAYOR de los dos niveles, nunca baja al del ausente.
  {
    const ejec = Object.keys(EXECS)[0];
    localStorage.setItem(REEMPLAZOS_KEY, JSON.stringify({ _v: SCHEMA_VERSION.reemplazos, datos: [
      { id: "b1", ausente: "SR", reemplazante: ejec, desde: "2026-03-01", hasta: "2026-03-10" },  // válida
      { id: "b2", ausente: "NO_EXISTE", reemplazante: ejec, desde: "2026-03-01", hasta: "2026-03-10" },
      { id: "b3", ausente: "SR", reemplazante: "SR", desde: "2026-03-01", hasta: "2026-03-10" },  // a sí mismo
      { id: "b4", ausente: "GG", reemplazante: ejec, desde: "2026-03-10", hasta: "2026-03-01" },  // invertido
      { id: "b5", ausente: "GC", reemplazante: ejec, desde: "10/03/2026", hasta: "2026-03-20" },  // no ISO
    ] }));
    const limpio = cargarReemplazos();
    // GG es Gerente General (comercial N3); GC es Gerente Comercial (comercial N2). Si GC cubre a GG,
    // GC sube a N3; si GG cubre a GC, GG se queda en N3 y no baja a N2.
    const sube = padronAprobadores("2026-04-01", [{ id: "s", ausente: "GG", reemplazante: "GC", desde: "2026-04-01", hasta: "2026-04-05" }]).usuarios.find((u) => u.code === "GC");
    const noBaja = padronAprobadores("2026-04-01", [{ id: "n", ausente: "GC", reemplazante: "GG", desde: "2026-04-01", hasta: "2026-04-05" }]).usuarios.find((u) => u.code === "GG");
    localStorage.removeItem(REEMPLAZOS_KEY);
    ok("62 el storage se sanea al cargar y el reemplazo nunca baja de nivel",
       limpio.length === 1 && limpio[0].id === "b1"
       && sube && sube.atrib.comercial === 3
       && noBaja && noBaja.atrib.comercial === 3,
       `5 filas → ${limpio.length} válida · ${nombreDe("GC")} sube a N${sube ? sube.atrib.comercial : "?"} · ${nombreDe("GG")} se queda en N${noBaja ? noBaja.atrib.comercial : "?"}`);
  }

  // 63 · Lo que el motor deja hacer, la PANTALLA lo tiene que dejar ver. El primer intento tenía el
  // motor correcto y la UI no: el badge de Otorgamientos descartaba al reemplazante por «tipo pipeline»
  // antes de preguntarle al padrón, y la firma de verificación seguía atada al rol. Una atribución que
  // sólo existe en el motor no existe: nadie llega a ejercerla.
  {
    const ejec = Object.keys(EXECS)[0];
    const hoy = hoyISO();
    const rmpJG = [{ id: "r63a", ausente: "JG", reemplazante: ejec, desde: hoy, hasta: hoy, motivo: "Vacaciones" }];
    const rmpEV = [{ id: "r63b", ausente: "EV", reemplazante: ejec, desde: hoy, hasta: hoy, motivo: "Vacaciones" }];
    const maniana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    ok("63 el reemplazante ve y firma lo que el motor le deja aprobar",
       // atribución efectiva: la de su cargo (ninguna) más la que cubre
       Object.keys(atribEfectiva(ejec, hoy, [])).length === 0
       && atribEfectiva(ejec, hoy, rmpJG).comercial === atribDe("JG").atrib.comercial
       && coberturaDe(ejec, hoy, rmpJG)[0].code === "JG"
       // la firma de la verificación también se delega, y sólo durante el período
       && puedeVerificarFacturas(ejec, hoy, []) === false
       && puedeVerificarFacturas(ejec, hoy, rmpEV) === true
       && puedeVerificarFacturas(ejec, maniana, rmpEV) === false
       && puedeVerificarFacturas("EV", hoy, rmpEV) === true,   // la titular no la pierde
       `${ejec}: sin reemplazo sin atribución y sin firma · cubriendo a ${nombreDe("JG")} comercial N${atribEfectiva(ejec, hoy, rmpJG).comercial} · cubriendo a ${nombreDe("EV")} firma verificaciones`);
  }

  // 64 · «Aprobar desde la playa». El reemplazo AGREGA un aprobador; no cambia uno por otro. Por
  // defecto el ausente conserva su atribución —estar de vacaciones no es estar desconectado— y el flag
  // la revoca para la ausencia que sí tiene que ser total (licencia, salida). El orden importa: se le
  // quita DESPUÉS de pasársela a quien cubre, o el reemplazante heredaría un cargo ya vaciado.
  {
    const ejec = Object.keys(EXECS)[0];
    const hoy = "2026-05-10";
    const c21 = REGLAS_CLIENTE.find((r) => r.cond === "C21");
    const base = { id: "r64", ausente: "SR", reemplazante: ejec, desde: "2026-05-01", hasta: "2026-05-20", motivo: "Vacaciones" };
    const playa = [{ ...base, ausenteAprueba: true }];
    const total = [{ ...base, ausenteAprueba: false }];
    const viejo = [{ ...base }];                       // fila sin el campo: migra como «sigue aprobando»
    const nSR = (atribDe("SR").atrib || {}).riesgo;
    const pad = (l) => padronAprobadores(hoy, l);
    const uAus = (l) => pad(l).usuarios.find((u) => u.code === "SR");
    ok("64 el ausente sigue aprobando salvo que el reemplazo se lo revoque",
       // por defecto aprueban los DOS, y el reemplazante toma el nivel del ausente
       puedeAprobarExc("SR", c21, nSR, pad(playa)) === true
       && puedeAprobarExc(ejec, c21, nSR, pad(playa)) === true
       // revocado: sólo quien cubre, y el reemplazante conserva el nivel que heredó
       && puedeAprobarExc("SR", c21, nSR, pad(total)) === false
       && puedeAprobarExc(ejec, c21, nSR, pad(total)) === true
       // el ausente NO desaparece del padrón: la pantalla tiene que poder decir por qué no aprueba
       && uAus(total) && uAus(total).ausente && uAus(total).ausente.aprueba === false
       && Object.keys(uAus(total).atrib).length === 0
       // una fila sin el campo se comporta como antes de que el flag existiera
       && puedeAprobarExc("SR", c21, nSR, pad(viejo)) === true
       // y la firma de verificación sigue la misma regla
       && puedeVerificarFacturas("EV", hoy, [{ ...base, ausente: "EV", ausenteAprueba: true }]) === true
       && puedeVerificarFacturas("EV", hoy, [{ ...base, ausente: "EV", ausenteAprueba: false }]) === false,
       `N${nSR}: por defecto aprueban ${nombreDe("SR")} y ${nombreDe(ejec)} · revocado sólo ${nombreDe(ejec)} · fila sin el campo = sigue aprobando`);
  }


  // ============================================================================================
  // 65-68 · PRICING Y SIMULACIÓN CONFIGURABLES. La aritmética del giro vivía cableada dentro del
  // componente del detalle —el IVA como `* 0.19`, la retención como `* 0.028`, la UF como un `const`
  // local—. Ahora es un catálogo de conceptos con fórmulas, por tenant. Lo primero que hay que probar
  // es que NO cambió ningún número: un mantenedor que mueve las cifras el día que se instala no es un
  // mantenedor, es un incidente.
  // ============================================================================================

  // 65 · El RESUMEN cuadra con el DETALLE por factura. Es la propiedad que justifica la tasa
  // equivalente: el concepto «Diferencia de precio» del catálogo la calcula sobre el total con la
  // tasa y el plazo equivalentes, y tiene que dar exactamente la suma documento a documento. Hasta el
  // 12-09 el catálogo la calculaba lineal y sin plazo (`montoDocs · tasa/100 · antic/100`), que cobra
  // lo mismo por 15 días que por 90: ésa era la cifra que veía el cliente.
  {
    const carteras = [
      [{ id: "A", monto: 100000000, dias: 31, tasa: 1.0 }, { id: "B", monto: 100000000, dias: 62, tasa: 1.2 }],
      [{ id: "A", monto: 12500000, dias: 15, tasa: 0.92 }, { id: "B", monto: 3400000, dias: 45, tasa: 1.35 },
       { id: "C", monto: 87000000, dias: 90, tasa: 1.6 }, { id: "D", monto: 950000, dias: 30, tasa: 1.1 }],
      [{ id: "U", monto: 47000000, dias: 45, tasa: 1.28 }],
    ];
    let malos = 0, det = "";
    for (const docs of carteras) for (const antic of [100, 80]) {
      const pro = prorratearOperacion(docs, [], { antic });
      const montoDocs = docs.reduce((a, d) => a + d.monto, 0);
      const s = simularOperacion({ montoDocs, cantFacturas: docs.length, antic, tasa: pro.tasaEquivalente,
        tasaEq: pro.tasaEquivalente, plazoEq: pro.plazoEquivalente, pctCom: 0, comMin: 2, comMax: 2,
        gastoOp: 26000, gastoDoc: 0 }, { cfg: { conceptos: SIM_CONCEPTOS_BASE, retencion: SIM_RETENCION_BASE } });
      const resumen = (s.filas.find((f) => f.id === "difPrecio") || {}).valor;
      // ±1 peso: los dos redondean a entero por caminos distintos y la moneda no tiene decimales
      if (Math.abs(resumen - pro.difPrecio) > 1) { malos++; if (!det) det = `${resumen} vs ${pro.difPrecio}`; }
    }
    // y el plazo SÍ mueve la cifra, que es lo que la versión lineal no hacía
    const corto = prorratearOperacion([{ id: "A", monto: 100000000, dias: 15, tasa: 1.2 }], [], {});
    const largo = prorratearOperacion([{ id: "A", monto: 100000000, dias: 90, tasa: 1.2 }], [], {});
    ok("65 el resumen calcula la diferencia de precio con la tasa y el plazo equivalentes, y cuadra con el detalle",
       malos === 0 && largo.difPrecio > corto.difPrecio * 5,
       `${carteras.length * 2} combinaciones · ${malos} descuadres${det ? " · " + det : ""} · 15d ${corto.difPrecio} vs 90d ${largo.difPrecio}`);
  }

  // 66 · El intérprete no es `eval`. La fórmula la escribe un administrador y queda guardada en la
  // configuración del TENANT: con `eval`, el mantenedor de pricing sería una consola remota en el
  // navegador de todos sus usuarios.
  {
    let ejecutado = false;
    window.__sim_canario = () => { ejecutado = true; return 1; };
    const intentos = [
      "window.__sim_canario()",
      "constructor.constructor('window.__sim_canario()')()",
      "montoDocs.constructor",
      "[].map(window.__sim_canario)",
    ];
    const rechazadas = intentos.filter((f) => {
      const p = parseFormula(f);
      if (p.error) return true;
      // si parsea, sus identificadores no son variables declaradas → la validación lo rechaza igual
      return validarSimCfg({ conceptos: [{ id: "x", label: "x", rol: "descuento", formula: f }], retencion: "0" }).length > 0;
    });
    // y aunque alguien la forzara al ámbito, evaluar un identificador desconocido da 0, no ejecuta
    const p = parseFormula("montoDocs * 2");
    const valor = evalFormula(p.ast, { montoDocs: 21 });
    delete window.__sim_canario;
    ok("66 las fórmulas se interpretan, no se ejecutan como JavaScript",
       rechazadas.length === intentos.length && ejecutado === false && valor === 42
       && parseFormula("1 +").error && parseFormula("acotar(1,2)").error && !parseFormula("acotar(1,2,3)").error,
       `${rechazadas.length}/${intentos.length} intentos rechazados · ningún canario ejecutado · aritmética ok`);
  }

  // 67 · La validación ataja lo que dejaría la pantalla mostrando 0 sin explicación.
  {
    const caso = (conceptos, retencion) => validarSimCfg({ conceptos, retencion: retencion || "0" });
    const adelante = caso([
      { id: "a", label: "A", rol: "descuento", formula: "b * 2" },   // usa uno POSTERIOR
      { id: "b", label: "B", rol: "base", formula: "montoDocs" },
    ]);
    const repetido = caso([
      { id: "a", label: "A", rol: "base", formula: "montoDocs" },
      { id: "a", label: "A otra vez", rol: "descuento", formula: "1" },
    ]);
    const inexistente = caso([{ id: "a", label: "A", rol: "base", formula: "noExiste + 1" }]);
    const choca = caso([{ id: "montoDocs", label: "Choca", rol: "base", formula: "1" }]);
    const sinBase = caso([{ id: "a", label: "A", rol: "descuento", formula: "1" }]);
    const rota = caso([{ id: "a", label: "A", rol: "base", formula: "montoDocs * )" }]);
    const buena = caso(SIM_CONCEPTOS_BASE, SIM_RETENCION_BASE);
    ok("67 el mantenedor no deja guardar una fórmula que rompería el giro",
       adelante.some((e) => /DESPU/.test(e.msg))
       && repetido.some((e) => /repetido/.test(e.msg))
       && inexistente.some((e) => /no es una variable/.test(e.msg))
       && choca.some((e) => /ya es una variable/.test(e.msg))
       && sinBase.some((e) => /base/.test(e.msg))
       && rota.length > 0
       && buena.length === 0,
       `referencia adelantada, id repetido, variable inexistente, choque con variable, sin base y fórmula rota: los 6 detectados · el catálogo base valida limpio`);
  }

  // 68 · Lo que el tenant cambia, cambia. Es la prueba de que la configuración MANDA y no es adorno:
  // otro IVA y otra retención mueven el giro, y un concepto nuevo entra al subtotal.
  {
    const e = { montoDocs: 100000000, cantFacturas: 5, dias: 30, mora: 0, otrosDesc: 0, cxc: 0,
                tasa: 1.5, antic: 100, pctCom: 0, comMin: 2, comMax: 2, gastoOp: 26000, gastoDoc: 0 };
    const base = { conceptos: SIM_CONCEPTOS_BASE, retencion: SIM_RETENCION_BASE };
    const a = simularOperacion(e, { cfg: base });
    // IVA 0 y retención 5%: dos tenants, dos giros distintos con la misma operación
    const b = simularOperacion(e, { cfg: base, constantes: { ...paramsSimTenant(), ivaPct: 0, retencionPct: 5 } });
    const ivaA = (a.filas.find((f) => f.id === "iva") || {}).valor;
    // un concepto NUEVO, que es lo que el mantenedor permite agregar
    const conSeguro = { conceptos: [...SIM_CONCEPTOS_BASE, { id: "seguro", label: "Seguro de crédito", rol: "descuento", formula: "redondear(montoDocs * 0.3 / 100)" }], retencion: SIM_RETENCION_BASE };
    const c = simularOperacion(e, { cfg: conSeguro });
    ok("68 lo que el tenant configura cambia el giro, y un concepto nuevo entra al subtotal",
       ivaA > 0 && (b.filas.find((f) => f.id === "iva") || {}).valor === 0
       && b.montoGirar === a.montoGirar + ivaA
       && b.retencion === Math.round(e.montoDocs * 5 / 100) && a.retencion === Math.round(e.montoDocs * 2.8 / 100)
       && c.subtotalDescuentos === a.subtotalDescuentos + 300000
       && c.montoGirar === a.montoGirar - 300000
       && c.filas.length === a.filas.length + 1,
       `IVA ${fmtCLP ? "" : ""}${ivaA} → 0 sube el giro en lo mismo · retención 2,8% → 5% · «Seguro de crédito» descuenta 300.000 más`);
  }

  // 69 · LA TASA también sale del tenant. El spread de lista y el descuento por SOW eran constantes de
  // módulo: dos factorings con otra política comercial no se podían representar sin editar el código.
  // El piso de riesgo del deudor sigue mandando sobre el descuento, que es la regla que no se negocia.
  {
    const dealTarget = { superaTarget: true };
    const dealComp = { sowActualPct: 0 };
    const pp = paramsPricing();
    // un tenant más agresivo: spread de lista más alto y el doble de descuento por competencia
    const otro = { ...pp, spreadEstandar: 1.20, sowAjuste: { ...pp.sowAjuste, competencia: { pts: 0.40, l: "x" } } };
    const deudorPiso = Object.keys(SPREAD_MIN_DEUDOR)[0];
    const piso = spreadMinDeudor(deudorPiso);
    const a = spreadSugerido(deudorPiso, dealTarget);
    const b = spreadSugerido(deudorPiso, dealTarget, otro);
    const c = spreadSugerido(deudorPiso, dealComp, otro);
    ok("69 el spread de lista y el descuento por SOW son del tenant, y el piso del deudor manda",
       a.spread === Math.max(piso, pp.spreadEstandar) && a.ajuste === 0
       && b.bruto === 1.20 && b.spread === Math.max(piso, 1.20)
       && c.ajuste === 0.40 && c.bruto === 0.80 && c.spread === Math.max(piso, 0.80)
       // el piso trunca: con el spread de lista bajo el piso, manda el piso y queda marcado
       && spreadSugerido(deudorPiso, dealComp, { ...otro, spreadEstandar: 0.10 }).topado === true
       && spreadSugerido(deudorPiso, dealComp, { ...otro, spreadEstandar: 0.10 }).spread === piso,
       `${deudorPiso} piso ${piso}% · lista ${pp.spreadEstandar}% → ${a.spread}% · tenant agresivo ${otro.spreadEstandar}% con −0,40 pts → ${c.spread}%`);
  }


  // ============================================================================================
  // 70-74 · PRORRATEO A NIVEL DE FACTURA. La simulación da cifras de la OPERACIÓN, pero el giro se
  // materializa en transferencias y para repartir hay que saber qué le toca a cada documento. La
  // REGLA DE ORO es que la suma por documento sea siempre el total: si no cuadra, Tesorería gira un
  // peso de más o de menos, y eso no se descubre hasta que el cliente reclama.
  // ============================================================================================

  // 70 · La planilla del negocio, reproducida. Dos documentos de M$100 a 31 y 62 días con tasas
  // 1,0% y 1,2%: el descuento es RACIONAL —valor presente `monto/(1+i·t)`—, y el plazo equivalente
  // pondera por el peso de la DIFERENCIA DE PRECIO, no por el monto. Con esos mismos datos ponderar
  // por monto daría 46,5 días en vez de 52,79, así que la distinción no es cosmética.
  {
    const docs = [{ id: "A", monto: 100000000, dias: 31, tasa: 1.0 },
                  { id: "B", monto: 100000000, dias: 62, tasa: 1.2 }];
    const r = prorratearOperacion(docs, [], {});
    const cerca = (a, b, tol) => Math.abs(a - b) <= tol;
    // y la tasa equivalente reproduce la misma diferencia de precio sobre el total
    const difConEq = 200000000 - 200000000 / (1 + (r.tasaEquivalente / 100) * (r.plazoEquivalente / 30));
    ok("70 el prorrateo reproduce la planilla del negocio (descuento racional y plazo equivalente)",
       cerca(difPrecioDoc(100000000, 1.0, 31), 1022764.764104, 1e-4)
       && cerca(difPrecioDoc(100000000, 1.2, 62), 2419984.387197, 1e-4)
       && cerca(r.difPrecioExacto, 3442749.151302, 1e-4)
       && cerca(r.plazoEquivalente, 52.790584415584, 1e-9)
       && cerca(r.tasaEquivalente, 0.99536208909501, 1e-9)
       && cerca(difConEq, r.difPrecioExacto, 1e-4)
       // ponderar por monto daría otra cosa: se deja fijado para que nadie lo "simplifique"
       && cerca((100000000 * 31 + 100000000 * 62) / 200000000, 46.5, 1e-9),
       `dif ${Math.round(r.difPrecioExacto)} · plazo eq ${r.plazoEquivalente.toFixed(6)}d (por monto sería 46,5) · tasa eq ${r.tasaEquivalente.toFixed(6)}%`);
  }

  // 71 · LA REGLA DE ORO, con muchas facturas chicas, que es donde el redondeo desalinea. Se prueba
  // contra carteras generadas, no contra un caso elegido: el error de redondeo depende de los montos.
  {
    let malos = 0, peorAjuste = 0, negativos = 0, ejemplo = "";
    const rnd = pcRng(hashStr("prorrateo-71"));
    for (let caso = 0; caso < 60; caso++) {
      const n = 1 + Math.floor(rnd() * 60);
      const docs = [];
      // Montos de FACTURA reales y deliberadamente dispares —una grande y muchas chicas es el caso
      // que desalinea—, en operaciones de M$50 a M$20.000. La primera versión de este caso sorteaba
      // montos de hasta 10^13 y medía un ajuste de 13 millones: el descuadre era del generador.
      const grande = Math.round((5e6 + rnd() * 2e9));
      docs.push({ id: "d0", monto: grande, dias: 15 + Math.floor(rnd() * 75), tasa: +(0.8 + rnd() * 1.2).toFixed(2) });
      for (let i = 1; i < n; i++) {
        const monto = 80000 + Math.round(rnd() * 3000000);
        docs.push({ id: "d" + i, monto, dias: 15 + Math.floor(rnd() * 75), tasa: +(0.8 + rnd() * 1.2).toFixed(2) });
      }
      const total = docs.reduce((a, d) => a + d.monto, 0);
      const conceptos = [
        { id: "montoAnticipo", rol: "base", total: Math.round(total * 0.9) },
        { id: "comision", rol: "descuento", total: 59479 },
        { id: "iva", rol: "descuento", total: 11301 },
        { id: "gastos", rol: "descuento", total: 26000 },
        { id: "descuentos", rol: "descuento", total: 4948862 },
      ];
      const r = prorratearOperacion(docs, conceptos, {});
      const suma = (f) => r.filas.reduce((a, x) => a + f(x), 0);
      const cuadraConceptos = conceptos.every((c) => suma((x) => x.conceptos[c.id]) === c.total);
      const cuadraDif = suma((x) => x.difPrecio) === r.difPrecio;
      const girarEsperado = conceptos[0].total - conceptos.slice(1).reduce((a, c) => a + c.total, 0) - r.difPrecio;
      const cuadraGiro = r.montoGirar === girarEsperado && suma((x) => x.giro) === girarEsperado;
      // El ajuste tiene que ser CHICO —si fueran miles de pesos, el peso o el redondeo están mal— y
      // NINGÚN documento puede quedar con un monto negativo: una comisión negativa no se transfiere.
      // El ajuste se mide contra su COTA TEÓRICA, que es lo único que significa algo acá. Son dos
      // fuentes de error y escalan distinto: redondear cada asignación a entero deja ≤½ peso por
      // documento (domina en un concepto chico: una comisión de $59.479 entre 60 facturas acumula
      // ~30 pesos, que es el 0,05% del concepto), y redondear el peso a 6 decimales deja ≤ T·5·10⁻⁷
      // por documento (domina en el anticipo de una operación grande: miles de pesos, que es el
      // 0,0002%). Una cota absoluta mide el tamaño de la operación y una relativa el del concepto:
      // ninguna de las dos dice si el reparto está bien. Ésta sí — y si algún día se supera, es que
      // el redondeo dejó de ser el declarado.
      conceptos.forEach((c) => { const a = r.ajustes[c.id]; if (!a) return;
        const cota = n / 2 + n * 5e-7 * Math.abs(c.total) + 1;
        peorAjuste = Math.max(peorAjuste, Math.abs(a.pesos) / cota); });
      conceptos.forEach((c) => { if (r.filas.some((x) => x.conceptos[c.id] < 0)) negativos++; });
      if (r.filas.some((x) => x.difPrecio < 0)) negativos++;
      if (!(cuadraConceptos && cuadraDif && cuadraGiro)) {
        malos++;
        if (!ejemplo) ejemplo = `${n} docs: giro ${r.montoGirar} vs ${girarEsperado}`;
      }
    }
    ok("71 la suma por documento SIEMPRE es el total, y ningún documento queda negativo",
       malos === 0 && negativos === 0 && peorAjuste <= 1,
       `60 carteras de 1 a 60 documentos · ${malos} descuadres · ${negativos} montos negativos · mayor ajuste: ${(peorAjuste * 100).toFixed(1)}% de su cota teórica (n/2 + n·T·5·10⁻⁷)${ejemplo ? " · " + ejemplo : ""}`);
  }

  // 72 · El ajuste cae en la factura MÁS GRANDE (decisión de negocio del 12-09). La moneda chilena
  // no tiene decimales, así que redondear cada asignación a entero descuadra por construcción y hay
  // que cuadrar en alguna: la más grande siempre puede absorberlo sin cruzar el cero, mientras que en
  // la más chica el ajuste podía superar lo asignado y dejarla negativa.
  {
    const docs = [{ id: "chica", monto: 1000, dias: 30, tasa: 1 },
                  { id: "grande", monto: 99000000, dias: 30, tasa: 1 },
                  { id: "media", monto: 500000, dias: 30, tasa: 1 }];
    const r = prorratearOperacion(docs, [{ id: "comision", rol: "descuento", total: 59479 }], {});
    const f = (id) => r.filas.find((x) => x.id === id);
    ok("72 el ajuste cae en la factura más grande y el reparto sigue el peso de cada una",
       r.ajustes.comision.documento === "grande"
       && f("grande").conceptos.comision > f("media").conceptos.comision
       && f("media").conceptos.comision >= f("chica").conceptos.comision
       && f("chica").conceptos.comision >= 0
       && r.filas.reduce((a, x) => a + x.conceptos.comision, 0) === 59479,
       `ajuste de ${r.ajustes.comision.pesos} peso(s) en «${r.ajustes.comision.documento}» · ${f("grande").conceptos.comision} / ${f("media").conceptos.comision} / ${f("chica").conceptos.comision} suman 59.479`);
  }

  // 73 · TOP-DOWN: la tasa que fija el ejecutivo se aplica a todos los documentos con SU plazo. No se
  // intenta reconstruir la tasa de cada deudor —es un problema de optimización con infinitas
  // soluciones— y esa restricción se resigna a propósito.
  {
    const docs = [{ id: "A", monto: 100000000, dias: 31, tasa: 1.0 },
                  { id: "B", monto: 100000000, dias: 62, tasa: 1.2 }];
    const abajo = prorratearOperacion(docs, [], {});
    const arriba = prorratearOperacion(docs, [], { modo: "unica", tasa: 1.1 });
    const dA = difPrecioDoc(100000000, 1.1, 31), dB = difPrecioDoc(100000000, 1.1, 62);
    ok("73 con tasa única cada documento usa esa tasa y su propio plazo",
       arriba.modo === "unica" && abajo.modo === "riesgo"
       && Math.abs(arriba.difPrecioExacto - (dA + dB)) < 1e-6
       && arriba.filas[0].difPrecio !== arriba.filas[1].difPrecio      // mismo monto, distinto plazo
       && arriba.filas.reduce((a, x) => a + x.difPrecio, 0) === arriba.difPrecio
       && arriba.difPrecio !== abajo.difPrecio,                        // y da distinto que bottom-up
       `bottom-up ${abajo.difPrecio} (tasas 1,0/1,2) · top-down 1,1% ${arriba.difPrecio} · por documento ${arriba.filas[0].difPrecio}/${arriba.filas[1].difPrecio}`);
  }

  // 74 · Los bordes que revientan una división: un solo documento, plazo 0, tasa 0 y monto 0. Ninguno
  // puede devolver NaN ni descuadrar — una simulación con una factura es el caso más común de todos.
  {
    const uno = prorratearOperacion([{ id: "U", monto: 7000000, dias: 45, tasa: 1.3 }],
      [{ id: "montoAnticipo", rol: "base", total: 7000000 }, { id: "comision", rol: "descuento", total: 59479 }], {});
    const plazoCero = prorratearOperacion([{ id: "A", monto: 1000, dias: 0, tasa: 1 }, { id: "B", monto: 3000, dias: 0, tasa: 1 }], [], {});
    const tasaCero = prorratearOperacion([{ id: "A", monto: 1000, dias: 30, tasa: 0 }], [], {});
    const vacio = prorratearOperacion([], [], {});
    const fin = (x) => typeof x === "number" && isFinite(x);
    ok("74 un documento, plazo cero, tasa cero y cartera vacía no rompen el cuadre",
       uno.filas.length === 1 && uno.filas[0].conceptos.comision === 59479
       && uno.montoGirar === 7000000 - 59479 - uno.difPrecio
       && fin(plazoCero.plazoEquivalente) && plazoCero.difPrecio === 0
       // sin diferencia de precio el plazo se pondera por monto: 0·(1000/4000) + 0·(3000/4000)
       && fin(tasaCero.tasaEquivalente) && tasaCero.difPrecio === 0
       && vacio.filas.length === 0 && fin(vacio.montoGirar) && vacio.montoGirar === 0,
       `1 doc cuadra · plazo 0 → dif ${plazoCero.difPrecio} · tasa 0 → tasa eq ${tasaCero.tasaEquivalente} · vacío ${vacio.montoGirar}`);
  }

  // 75 · Se CALCULA con 6 decimales y se MUESTRA con 2 (tasa) y 1 (plazo). No es cosmética: redondear
  // la tasa equivalente a los 2 decimales que se muestran y calcular con ésa mueve la diferencia de
  // precio, y entonces el resumen dejaría de cuadrar con la suma por documento — que es justo lo que
  // la tasa equivalente existe para garantizar.
  {
    const docs = [{ id: "A", monto: 100000000, dias: 31, tasa: 1.0 }, { id: "B", monto: 100000000, dias: 62, tasa: 1.2 }];
    const pro = prorratearOperacion(docs, [], {});
    const montoDocs = 200000000;
    const conTasa = (t) => {
      const s = simularOperacion({ montoDocs, cantFacturas: 2, antic: 100, tasa: t, tasaEq: t,
        plazoEq: pro.plazoEquivalente, pctCom: 0, comMin: 2, comMax: 2, gastoOp: 26000, gastoDoc: 0 },
        { cfg: { conceptos: SIM_CONCEPTOS_BASE, retencion: SIM_RETENCION_BASE } });
      return (s.filas.find((f) => f.id === "difPrecio") || {}).valor;
    };
    const exacta = conTasa(pro.tasaEquivalente);
    const redondeada = conTasa(+pro.tasaEquivalente.toFixed(2));
    ok("75 se calcula con 6 decimales y se muestra con 2 (tasa) y 1 (plazo)",
       Math.abs(exacta - pro.difPrecio) <= 1            // la exacta cuadra con el detalle
       && Math.abs(redondeada - pro.difPrecio) > 1000   // la redondeada no, y por miles de pesos
       && pro.tasaEquivalente.toFixed(2) === "1.00" && pro.plazoEquivalente.toFixed(1) === "52.8",
       `exacta ${pro.tasaEquivalente.toFixed(6)}% → ${exacta} (detalle ${pro.difPrecio}) · redondeada a ${pro.tasaEquivalente.toFixed(2)}% → ${redondeada}, ${Math.abs(redondeada - pro.difPrecio)} de diferencia · plazo ${pro.plazoEquivalente.toFixed(1)} d`);
  }

  // 76 · REGLA 0 · PRIMERA OPERACIÓN DEL CLIENTE. Compuerta como la del protocolo propio y ANTES que
  // ella: en la primera operación se verifican TODAS las facturas, cualquiera sea el segmento del
  // deudor. Vive en el modelo de verificación y no en el de líneas ni en la pantalla del giro porque
  // «si hay que llamar a este deudor» es una sola pregunta y tiene un solo dueño.
  {
    const base = verifPar("76.111.111-1", LB[0], null);
    const conProto = { ...base, protocolo: { existe: true, id: "PR-99" } };
    // un par que NO requiere verificación por criterios, para que la única causa sea la regla 0
    const limpio = { ...base, protocolo: { existe: false }, prime: true, recortado: true,
      aplican: VERIF_APLICAN_RECORTADO, avgVentaProm3M: 1e9, mesesConVenta6M: 6,
      pctMora25d: 0, pctReclamadas: 0, mntPagoDeudor3M: 5000 };
    const fs = [{ monto: 40 * MMF, venc: 45 }];
    const normal = verifDecision({ ...limpio, primeraOperacion: false }, fs);
    const primera = verifDecision({ ...limpio, primeraOperacion: true }, fs);
    // y manda sobre el protocolo: si son las dos, la causa informada es la 0
    const ambas = verifDecision({ ...conProto, primeraOperacion: true, aplican: VERIF_APLICAN_RECORTADO }, fs);
    const ev = (r, id) => (r.evals.find((e) => e.r.id === id) || {}).st;
    ok("76 la primera operación del cliente verifica TODAS las facturas (regla 0)",
       normal.requiere === false                       // sin la regla 0, este par no se verifica
       && primera.requiere === true && primera.motivo === "primera_operacion"
       && ev(primera, "V00") === "no"
       // cortocircuito: ninguna otra regla se evaluó, igual que con el protocolo propio
       && primera.evals.filter((e) => e.r.id !== "V00").every((e) => e.st === "na")
       && primera.fallidas.length === 0
       && ambas.motivo === "primera_operacion"          // la 0 va antes que la 1
       && ev(ambas, "V01") === "na"
       // la regla 0 aplica en los DOS segmentos: no es un criterio de riesgo del deudor, es del cliente
       && VERIF_APLICAN_RECORTADO.includes("V00") && VERIF_APLICAN_COMPLETO.includes("V00"),
       `sin primera operación «${normal.requiere}» · primera «${primera.motivo}» con las otras ${primera.evals.filter((e) => e.r.id !== "V00" && e.st === "na").length} en «na» · con protocolo también gana la 0`);
  }

  // 77 · El ESTADO DEL CLIENTE es del tenant y entra por parámetro, no se lee adentro del modelo.
  // Lo devuelve una API de Security al iniciar sesión y cambia en cuanto el cliente cursa: memoizarlo
  // con el par —que sí se cachea— dejaría verificándolo todo para siempre.
  {
    const deal = { id: "T-77", rutEmisor: "76.777.777-7", cliente: "Cliente 77" };
    const real = esPrimeraOperacionCliente(deal);
    const nuevo = esPrimeraOperacionCliente(deal, { "76.777.777-7": "nuevo" });
    const activo = esPrimeraOperacionCliente(deal, { "76.777.777-7": "activo" });
    const estados = CLIENTE_ESTADOS.map((e) => esPrimeraOperacionCliente(deal, { "76.777.777-7": e }));
    // determinista: el mismo RUT da siempre lo mismo
    const estable = estadoCliente("76.777.777-7") === estadoCliente("76.777.777-7");
    ok("77 el estado del cliente entra por parámetro y sólo «nuevo» es primera operación",
       nuevo === true && activo === false
       && JSON.stringify(estados) === JSON.stringify([true, false, false, false])
       && typeof real === "boolean" && estable
       && CLIENTE_ESTADOS.length === 4 && CLIENTE_ESTADOS[0] === "nuevo",
       `inyectado nuevo→${nuevo} activo→${activo} · real «${estadoCliente("76.777.777-7")}» · los 4 estados: ${CLIENTE_ESTADOS.join(", ")}`);
  }


  // ============================================================================================
  // 78-82 · ASIGNACIÓN DE GIROS. Qué parte del monto a girar va por cada tipo de giro. La REGLA DE
  // ORO se hereda del prorrateo: la suma por tipo es siempre el monto a girar de la operación.
  // ============================================================================================

  // 78 · Los dos criterios, y la ELEVACIÓN A DEUDOR. Express exige las dos cosas —verificada y sin
  // marcas de excepción— y basta que falle una para caer en Normal. Y como los dos motores deciden
  // por deudor, una factura no puede calificar distinto que sus hermanas.
  {
    const fs = [{ id: "f1", deudor: "D1", giro: 10000000 }, { id: "f2", deudor: "D1", giro: 5000000 },
                { id: "f3", deudor: "D2", giro: 7000000 }, { id: "f4", deudor: "D3", giro: 3000000 }];
    const base = { facturas: fs, excepcionCliente: false, primeraOperacion: false, montoGirar: 25000000 };
    const r = asignarGiros({ ...base,
      verificado: { D1: true, D2: false, D3: true },      // D2 queda por verificar
      excepcionDeudor: { D3: true } });                   // D3 tiene marca de excepción
    const tipoDe = (id) => (r.filas.find((f) => f.id === id) || {}).tipo;
    ok("78 Express exige verificada Y sin excepciones, y el tipo se hereda del deudor",
       tipoDe("f1") === "GE" && tipoDe("f2") === "GE"      // las dos de D1, iguales
       && tipoDe("f3") === "GN"                           // por verificar
       && tipoDe("f4") === "GN"                           // por excepción del deudor
       && r.porTipo.GE.monto === 15000000 && r.porTipo.GN.monto === 10000000
       && r.cuadra === true && r.descuadre === 0,
       `GE ${fmtCLP ? "" : ""}${r.porTipo.GE.monto} (D1: 2 facturas) · GN ${r.porTipo.GN.monto} (D2 por verificar, D3 con excepción) · cuadra`);
  }

  // 79 · PRIMERA OPERACIÓN: todo a Giro Normal. No es una regla aparte del giro — sale de que la
  // regla 0 de verificación manda a llamar TODAS las facturas—, pero el modelo la declara igual como
  // condición de Express para que el motivo se pueda explicar sin reconstruirlo.
  {
    const fs = [{ id: "f1", deudor: "D1", giro: 9000000 }, { id: "f2", deudor: "D2", giro: 1000000 }];
    const todoOk = { facturas: fs, verificado: { D1: true, D2: true }, excepcionDeudor: {},
                     excepcionCliente: false, montoGirar: 10000000 };
    const normal = asignarGiros({ ...todoOk, primeraOperacion: false });
    const primera = asignarGiros({ ...todoOk, primeraOperacion: true });
    // y una marca del CLIENTE descalifica a todos los deudores, no sólo a uno
    const conExcCli = asignarGiros({ ...todoOk, primeraOperacion: false, excepcionCliente: true });
    ok("79 la primera operación va completa a Giro Normal, y una excepción del cliente también",
       normal.porTipo.GE.monto === 10000000 && normal.porTipo.GN.monto === 0
       && primera.porTipo.GN.monto === 10000000 && primera.porTipo.GE.monto === 0
       && /Primera operación/.test(primera.motivo || "")
       && conExcCli.porTipo.GN.monto === 10000000 && /cliente/.test(conExcCli.motivo || "")
       && primera.cuadra && conExcCli.cuadra,
       `normal → GE ${normal.porTipo.GE.monto} · primera → GN ${primera.porTipo.GN.monto} · excepción de cliente → GN ${conExcCli.porTipo.GN.monto}`);
  }

  // 80 · LA REGLA DE ORO contra carteras generadas: ninguna factura queda sin tipo y la suma es
  // siempre el monto a girar. Es la propiedad que impide que Tesorería transfiera de más o de menos.
  {
    const rnd = pcRng(hashStr("giros-80"));
    let malos = 0, sinTipo = 0, det = "";
    for (let caso = 0; caso < 50; caso++) {
      const nD = 1 + Math.floor(rnd() * 6), fs = [], verificado = {}, excepcionDeudor = {};
      for (let d = 0; d < nD; d++) {
        const nom = "D" + d;
        verificado[nom] = rnd() < 0.6; excepcionDeudor[nom] = rnd() < 0.35;
        const nF = 1 + Math.floor(rnd() * 5);
        for (let k = 0; k < nF; k++) fs.push({ id: `d${d}f${k}`, deudor: nom, giro: Math.round(rnd() * 9e6) + 1000 });
      }
      const total = fs.reduce((a, f) => a + f.giro, 0);
      const r = asignarGiros({ facturas: fs, verificado, excepcionDeudor,
        excepcionCliente: rnd() < 0.2, primeraOperacion: rnd() < 0.15, montoGirar: total });
      const suma = r.tipos.reduce((a, g) => a + g.monto, 0);
      if (r.filas.some((f) => !f.tipo)) sinTipo++;
      if (suma !== total || !r.cuadra) { malos++; if (!det) det = `${suma} vs ${total}`; }
    }
    ok("80 ninguna factura queda sin tipo y la suma por tipo es siempre el monto a girar",
       malos === 0 && sinTipo === 0,
       `50 carteras de 1 a 6 deudores · ${malos} descuadres · ${sinTipo} facturas sin tipo${det ? " · " + det : ""}`);
  }

  // 81 · DESACOPLADO: el motor decide con los veredictos que recibe, no con los que el navegador
  // calcularía. Se le inyecta lo contrario de lo real y se comprueba cuál manda — es la única forma
  // de probar que no está llamando a los otros motores por dentro.
  {
    const fs = [{ id: "f1", deudor: "D1", giro: 1000000 }];
    const comoSiVerificado = asignarGiros({ facturas: fs, verificado: { D1: true }, excepcionDeudor: {},
      excepcionCliente: false, primeraOperacion: false, montoGirar: 1000000 });
    const comoSiNo = asignarGiros({ facturas: fs, verificado: { D1: false }, excepcionDeudor: {},
      excepcionCliente: false, primeraOperacion: false, montoGirar: 1000000 });
    // y el CATÁLOGO es extensible: un tercer tipo entra sin tocar el motor
    const tres = [
      { codigo: "GX", label: "Giro anticipado", orden: 1, requiere: { verificado: true, sinExcepcionCliente: true, sinExcepcionDeudor: true, sinPrimeraOperacion: true } },
      { codigo: "GE", label: "Giro Express", orden: 2, requiere: { verificado: true } },
      { codigo: "GN", label: "Giro Normal", orden: 3, resto: true },
    ];
    const conTres = asignarGiros({ facturas: [{ id: "a", deudor: "D1", giro: 100 }, { id: "b", deudor: "D2", giro: 200 }],
      verificado: { D1: true, D2: true }, excepcionDeudor: { D2: true }, excepcionCliente: false,
      primeraOperacion: false, montoGirar: 300 }, { tipos: tres });
    // una condición que el catálogo de hechos NO declara no la cumple nadie: cae al resto
    const inventada = asignarGiros({ facturas: fs, verificado: { D1: true }, excepcionDeudor: {},
      excepcionCliente: false, primeraOperacion: false, montoGirar: 1000000 },
      { tipos: [{ codigo: "XX", orden: 1, requiere: { loQueSea: true } }, { codigo: "GN", orden: 2, resto: true }] });
    ok("81 decide con los veredictos inyectados y el catálogo de tipos es extensible",
       comoSiVerificado.filas[0].tipo === "GE" && comoSiNo.filas[0].tipo === "GN"
       && conTres.porTipo.GX.monto === 100 && conTres.porTipo.GE.monto === 200 && conTres.porTipo.GN.monto === 0
       && conTres.tipos.length === 3 && conTres.cuadra
       && inventada.filas[0].tipo === "GN",
       `inyectado verificado→GE · no verificado→GN · con 3 tipos: GX ${conTres.porTipo.GX.monto} / GE ${conTres.porTipo.GE.monto} · condición inexistente → resto`);
  }

  // 82 · SE CONGELA AL ACEPTAR. Mientras la oferta se arma el giro se recalcula en cada reevaluación;
  // aceptada, los montos son un compromiso y recalcularlos movería una cifra que Tesorería ya tomó.
  {
    const deal = { id: "T-82", rutEmisor: "76.111.111-1", cliente: "Cliente 82",
                   facturasOp: [fac("g1", LB[0], 20)] };
    const vivo = giroDeal(deal, { giro: {}, prorrateo: { filas: [{ id: "g1", giro: 19000000 }], montoGirar: 19000000 } });
    const congelado = giroDeal(deal, { giro: { "T-82": { tipos: [{ codigo: "GE", label: "Giro Express", monto: 12345, facturas: ["g1"], deudores: [LB[0]] }], montoGirar: 12345, ts: "x" } } });
    ok("82 la asignación congelada manda sobre el recálculo del día",
       vivo.congelado === false && typeof vivo.montoGirar === "number"
       && congelado.congelado === true && congelado.montoGirar === 12345
       && congelado.tipos[0].codigo === "GE" && congelado.tipos[0].monto === 12345,
       `vivo: recalculado (${vivo.tipos.map((t) => t.codigo + " " + t.monto).join(" · ")}) · congelado: ${congelado.montoGirar} intacto`);
  }

  // 83 · El camino de las LISTAS. La tarjeta del tubo no tiene las condiciones que el ejecutivo edita
  // en el detalle, así que reparte el `giro` YA SIMULADO del deal por peso en monto y clasifica con
  // el mismo motor. Dos cosas que tienen que cumplirse: que la suma siga siendo el giro del deal —si
  // la tarjeta mostrara otra cifra que el detalle, el ejecutivo vería dos verdades— y que sin
  // simulación no muestre nada, porque antes de simular no hay monto que repartir.
  {
    const fs = [fac("l1", LB[0], 30), fac("l2", LB[1], 12), fac("l3", LB[0], 5)];
    const base = { id: "T-83", rutEmisor: "76.111.111-1", cliente: "Cliente 83", facturasOp: fs };
    const sinSim = giroResumenDeal({ ...base, simulado: false, giro: 45 * MMF });
    const sinFact = giroResumenDeal({ ...base, simulado: true, giro: 45 * MMF, facturasOp: [] });
    const g = giroResumenDeal({ ...base, simulado: true, giro: 45.6 * MMF });
    const total = Math.round(45.6 * 1e6);
    const suma = g ? g.tipos.reduce((a, x) => a + x.monto, 0) : -1;
    // memoizado: la segunda llamada devuelve el MISMO objeto mientras no cambie la firma
    const g2 = giroResumenDeal({ ...base, simulado: true, giro: 45.6 * MMF });
    // y cambiar el giro invalida: la firma incluye el monto
    const g3 = giroResumenDeal({ ...base, simulado: true, giro: 90 * MMF });
    // Y el desajuste que dejaba los chips en blanco sin error: el id de respaldo es POSICIONAL, así
    // que si el prorrateo indexa sobre las facturas válidas y el adaptador sobre todas, ninguna casa
    // y todas quedan en giro 0. Se prueba con una excluida al medio y facturas SIN folio.
    const sinFolio = [{ id: null, deudor: LB[0], monto: 10 * MMF }, { id: null, deudor: LB[1], monto: 20 * MMF }];
    const ent = girosDeDeal({ id: "T-83b", rutEmisor: "76.111.111-1", facturasOp: [{ id: null, deudor: "X", monto: 5 * MMF }, ...sinFolio] },
      { facturas: sinFolio, prorrateo: { filas: [{ id: "f0", giro: 1000 }, { id: "f1", giro: 2000 }], montoGirar: 3000 } });
    const conGiro = ent.facturas.filter((f) => f.giro > 0).length;
    ok("83 la tarjeta del tubo reparte el giro simulado y cuadra con él",
       conGiro === 2 &&
       sinSim === null && sinFact === null
       && g && suma === total && g.cuadra === true
       && g.filas.length === 3
       // las dos facturas del mismo deudor comparten tipo, como en el detalle
       && g.filas[0].tipo === g.filas[2].tipo
       && g2 === g                                   // mismo objeto: no recalculó
       && g3 !== g && g3.tipos.reduce((a, x) => a + x.monto, 0) === 90 * 1e6,
       `sin simular → null · simulada: ${g.tipos.map((x) => x.codigo + " " + x.monto).join(" · ")} suman ${suma} = giro ${total} · memo ok · ids posicionales: ${conGiro}/2 con giro`);
  }

  // 84 · EL CHIP DE GIRO REPARTE EL «MONTO A GIRAR», no el anticipo neto de intereses. El detalle
  // calculaba el prorrateo con la lista de conceptos VACÍA —le servía para la tasa y el plazo
  // equivalentes— y con eso el giro por documento era anticipo − diferencia de precio: le faltaban la
  // comisión, el IVA y los gastos. El chip de la cabecera quedaba ~2 MM por encima del «Monto a
  // Girar» de la fila de abajo, o sea la regla de oro del modelo de giro rota en la misma pantalla
  // que la enuncia. Con los conceptos de la simulación el reparto cuadra al PESO, y ahí es donde
  // aparece la segunda mitad: los dos calculan la diferencia de precio por caminos distintos (la
  // fórmula del catálogo sobre el total, el prorrateo documento a documento) y pueden diferir en un
  // peso, así que el total a repartir lo FIJA la simulación (`difPrecioTotal`).
  {
    const carteras = [
      [{ id: "A", deudor: "D1", monto: 30000000, dias: 31, tasa: 1.08 }, { id: "B", deudor: "D1", monto: 12000000, dias: 45, tasa: 1.08 },
       { id: "C", deudor: "D2", monto: 47700000, dias: 62, tasa: 1.18 }],
      [{ id: "U", deudor: "D1", monto: 4500000, dias: 15, tasa: 0.92 }],
      [{ id: "A", deudor: "D1", monto: 900000, dias: 30, tasa: 1.6 }, { id: "B", deudor: "D2", monto: 88000000, dias: 90, tasa: 1.35 },
       { id: "C", deudor: "D3", monto: 2300000, dias: 60, tasa: 1.2 }, { id: "D", deudor: "D3", monto: 15000000, dias: 20, tasa: 1.1 }],
    ];
    let malos = 0, det = "", sinConceptos = 0;
    for (const docs of carteras) for (const antic of [100, 90]) {
      const pro = prorratearOperacion(docs, [], { antic });
      const montoDocs = docs.reduce((a, d) => a + d.monto, 0);
      const sim = simularOperacion({ montoDocs, cantFacturas: docs.length, antic, tasa: pro.tasaEquivalente,
        tasaEq: pro.tasaEquivalente, plazoEq: pro.plazoEquivalente, pctCom: 0.3, comMin: 2, comMax: 2,
        gastoOp: 26000, gastoDoc: 0 }, { cfg: { conceptos: SIM_CONCEPTOS_BASE, retencion: SIM_RETENCION_BASE } });
      const conceptos = sim.filas.map((f) => ({ id: f.id, rol: f.rol, total: f.valor }));
      const proGiro = prorratearOperacion(docs, conceptos, { antic,
        difPrecioTotal: (sim.filas.find((f) => f.id === "difPrecio") || {}).valor });
      const suma = proGiro.filas.reduce((a, f) => a + f.giro, 0);
      if (suma !== sim.montoGirar || proGiro.montoGirar !== sim.montoGirar) {
        malos++; if (!det) det = `${suma} vs ${sim.montoGirar}`;
      }
      // y la cifra vieja —la del prorrateo sin conceptos— es DISTINTA: si fueran iguales este caso no
      // estaría probando nada.
      if (pro.montoGirar === sim.montoGirar) sinConceptos++;
    }
    // Ningún documento puede quedar con giro negativo: es una transferencia que Tesorería ejecuta.
    const negativos = prorratearOperacion(carteras[2], (() => {
      const montoDocs = carteras[2].reduce((a, d) => a + d.monto, 0);
      const s = simularOperacion({ montoDocs, cantFacturas: 4, antic: 100, tasa: 1.3, tasaEq: 1.3, plazoEq: 60,
        pctCom: 0.3, comMin: 2, comMax: 2, gastoOp: 26000, gastoDoc: 0 },
        { cfg: { conceptos: SIM_CONCEPTOS_BASE, retencion: SIM_RETENCION_BASE } });
      return s.filas.map((f) => ({ id: f.id, rol: f.rol, total: f.valor }));
    })(), { antic: 100 }).filas.filter((f) => f.giro < 0).length;
    ok("84 el giro por factura suma el «Monto a Girar» de la simulación, no el anticipo neto de intereses",
       malos === 0 && sinConceptos === 0 && negativos === 0,
       `${carteras.length * 2} combinaciones · ${malos} descuadres${det ? " · " + det : ""} · ${sinConceptos} casos donde el prorrateo sin conceptos ya cuadraba · ${negativos} documentos negativos`);
  }

  // 85 · O05 · EVIDENCIA DEL CONTRATO DE CESIÓN. El criterio existe SIEMPRE —ninguna operación se
  // cursa sin constancia de que el cliente autorizó la cesión— y la evidencia es una HUELLA del
  // paquete, no una bandera: no dice «el cliente firmó» sino «el cliente firmó ESTO». Por eso el
  // criterio se abre y se cierra solo, sin que nadie tenga que acordarse de revocar nada.
  //
  // La evidencia entra INYECTADA, que es la única forma de probar que el motor decide con ella y no
  // con lo que haya en el navegador.
  {
    const fs = [fac("e1", LB[0], 20), fac("e2", LB[1], 12)];
    const base = { id: "T-85", rutEmisor: "76.111.111-1", cliente: "Cliente 85", facturasOp: fs, monto: 32 * MMF, negocioNum: "OP-85" };
    const o05 = (d, ev) => evaluarOtorgItems(d, ev ? { evidencia: { [d.id]: ev } } : undefined).find((i) => i.regla.cond === "O05");
    const firma = (d, via) => ({ via: via || "electronica", canonico: huellaOperacion(d), hash: "h", por: "Cliente", fecha: "—" });

    const sinEvidencia = o05(base, null);
    const conFirma = o05(base, firma(base));
    // El paquete cambia DESPUÉS de firmar: se agrega una factura. La huella deja de calzar sin que
    // nadie toque ninguna bandera — es el caso que el booleano no podía ver.
    const conFactuaraExtra = { ...base, facturasOp: [...fs, fac("e3", LB[0], 5)], monto: 37 * MMF };
    const traspapelada = o05(conFactuaraExtra, firma(base));
    // Y el caso fino: misma cantidad de facturas y mismo total, pero movidas de deudor. Con sólo los
    // conteos y el monto total la huella sería idéntica; con el monto POR DEUDOR, no.
    const movida = { ...base, facturasOp: [fac("e1", LB[1], 20), fac("e2", LB[0], 12)] };
    const sustituida = o05(movida, firma(base));
    // La vía física no cambia el criterio: lo que la cierra es la evidencia que deja el visado.
    const fisicaSinVisar = o05({ ...base, publicacion: "fisica" }, null);
    const fisicaVisada = o05({ ...base, publicacion: "fisica" }, firma(base, "fisica"));

    const pad = padronAprobadores();
    const cargo = rolDeAreaNivel("operaciones", 3, pad);
    const exacto = pad.cargos.find((c) => c.area === "operaciones" && c.nivel === 3);
    // Y que el cargo lo OCUPE alguien: el catálogo de cargos y el padrón de personas son dos listas
    // distintas —`atribDe` deja fuera a quien no esté en `ATRIB_USUARIO`—, así que un cargo dado de
    // alta sin su titular deja el par (área, nivel) con nombre y sin nadie que lo firme. Se vio: la
    // primera versión creó «Jefe de Operaciones» y la excepción seguía cayendo en el N5 por escalada.
    const titulares = pad.usuarios.filter((u) => !u.superAdmin && u.atrib && u.atrib.operaciones === 3);
    ok("85 O05 existe siempre y su evidencia es la HUELLA del paquete autorizado",
       // existe en todos los escenarios
       !!sinEvidencia && !!conFirma && !!traspapelada && !!fisicaSinVisar
       // sin evidencia es excepción; con la huella del paquete vigente queda aprobado sin visar
       && sinEvidencia.disp === "excepcion" && conFirma.disp === "aprobado"
       // cambió el paquete después de firmar → la huella no calza → vuelve a ser excepción
       && traspapelada.disp === "excepcion"
       // y la sustitución que conserva conteos y total tampoco pasa
       && sustituida.disp === "excepcion"
       // física: la cierra el visado, que es el que deja la evidencia
       && fisicaSinVisar.disp === "excepcion" && fisicaVisada.disp === "aprobado"
       // se rutea a Operaciones N3, con cargo exacto y con titular
       && fisicaSinVisar.regla.area === "operaciones" && fisicaSinVisar.nivel === 3
       && !cargo.sinAprobador && !!exacto && exacto.rol === "Jefe de Operaciones"
       && titulares.length === 1 && puedeAprobarExc(titulares[0].code, fisicaSinVisar.regla, 3, pad),
       `sin evidencia ${sinEvidencia.disp} · firmada ${conFirma.disp} · +1 factura ${traspapelada.disp} · sustituida ${sustituida.disp} · física ${fisicaSinVisar.disp}→${fisicaVisada.disp} · N${fisicaSinVisar.nivel} ${cargo.rol} (${titulares.map((u) => u.nombre).join(", ") || "SIN TITULAR"})`);
  }

  // 86 · EL GATE DE INYECCIÓN AL CORE (GIR-02). Es el mismo cálculo que O05 pero en el punto donde el
  // dinero sale: comparar la huella de lo que se va a inyectar contra la de lo autorizado. Lo que se
  // prueba acá es que el motivo se distinga —«no hay evidencia» y «la evidencia no describe esta
  // operación» se arreglan de formas distintas— y que la huella incluya lo que el negocio definió.
  {
    const fs = [fac("g1", LB[0], 40), fac("g2", LB[1], 10)];
    const d = { id: "T-86", rutEmisor: "76.222.222-2", cliente: "Cliente 86", facturasOp: fs, monto: 50 * MMF, negocioNum: "OP-86" };
    const h = huellaOperacion(d);
    const sin = evidenciaContratoOk(d, { evidencia: {} });
    const ok1 = evidenciaContratoOk(d, { evidencia: { "T-86": { canonico: h, hash: "x" } } });
    const otra = evidenciaContratoOk({ ...d, facturasOp: [fs[0]] }, { evidencia: { "T-86": { canonico: h, hash: "x" } } });
    // La huella lleva lo que el negocio pidió: operación, RUT del cliente, nº de deudores, nº de
    // facturas, monto total — y el monto por deudor, que es lo que cierra la sustitución.
    const campos = ["op=OP-86", "rut=76.222.222-2", "nd=2", "nf=2", "monto=" + Math.round(50 * 1e6)];
    // Y es ESTABLE: dos operaciones con el mismo paquete dan la misma huella, y el orden de las
    // facturas no la mueve (si la moviera, reordenar la lista invalidaría una firma válida).
    const revuelta = huellaOperacion({ ...d, facturasOp: [fs[1], fs[0]] });
    ok("86 el gate de inyección al core compara huellas y distingue el motivo",
       sin.ok === false && sin.motivo === "sin_evidencia"
       && ok1.ok === true && otra.ok === false && otra.motivo === "no_calza"
       && campos.every((c) => h.includes(c)) && revuelta === h
       // y el detalle trae las dos huellas, que es lo que se audita
       && !!otra.firmado && !!otra.actual && otra.firmado !== otra.actual,
       `${h} · sin evidencia «${sin.motivo}» · cambiada «${otra.motivo}» · orden estable ${revuelta === h}`);
  }

  // 87 · ROTACIÓN DE PERSONAS: qué ve cada uno y a quién se le atribuye lo hecho. Tres defectos que
  // sólo aparecen cuando alguien se va y llega su reemplazo.
  {
    // (a) El alcance de un JEFE se deriva del equipo que declara la cartera, no de una constante. El
    //     mapa cableado `JEFE_A_EXECS` no sólo se desfasaba: un jefe NUEVO no estaba en él, la
    //     búsqueda daba `undefined` y eso se leía como «ve todo». El ejecutivo nuevo fallaba cerrado
    //     y el jefe nuevo fallaba ABIERTO, indistinguible de la gerencia.
    const delJefe = execsVisiblesDe("JG");
    const delEjec = execsVisiblesDe("CR");
    const gerencia = execsVisiblesDe("GG");
    const desconocido = execsVisiblesDe("ZZ_NO_EXISTE");
    const equipoJG = delJefe && delJefe.every((c) => EXEC_JEFATURA[c] === EXEC_JEFATURA[delJefe[0]]);

    // (b) Un código de ejecutivo que el padrón ya no conoce NO es el Agente IA. Relabelarlo falsea la
    //     atribución de una operación que sí tuvo dueño, y lo hace en silencio: el dashboard y el
    //     churn empiezan a contarle al agente operaciones que negoció una persona.
    const sinDuenio = nombreEjec("");
    const vigente = nombreEjec("CR");
    const idoSe = nombreEjec("XX");
    const jefSinDuenio = jefaturaOf({ exec: "" });
    const jefIdoSe = jefaturaOf({ exec: "XX" });

    // (c) Una tarea de aprobación es para quien tenga la ATRIBUCIÓN, no para la foto de nombres del
    //     día en que se creó: con el par (área, nivel) guardado, el apoderado que llegue después la ve.
    const tareaPar = destinatariosTarea({ area: "operaciones", nivel: 3, para: ["Alguien Que Se Fue"] });
    const tareaVieja = destinatariosTarea({ para: ["Nombre Congelado"] });
    const tareaHuerfana = destinatariosTarea({ area: "area_inexistente", nivel: 5, para: [] });

    ok("87 el alcance sigue al equipo y la atribución no se inventa cuando alguien se va",
       // (a)
       Array.isArray(delJefe) && delJefe.length > 0 && equipoJG
       && JSON.stringify(delEjec) === JSON.stringify(["CR"])
       && gerencia === null
       && Array.isArray(desconocido) && desconocido.length === 0        // falla CERRADO, no abierto
       // (b)
       && sinDuenio === "Agente IA" && vigente === "Carla Rivas"
       && idoSe !== "Agente IA" && /XX/.test(idoSe)
       && jefSinDuenio === "Inbound / IA" && jefIdoSe !== "Inbound / IA"
       // (c)
       && tareaPar.includes("Ignacio Peña") && !tareaPar.includes("Alguien Que Se Fue")
       && JSON.stringify(tareaVieja) === JSON.stringify(["Nombre Congelado"])
       && tareaHuerfana.length === 1 && tareaHuerfana[0] === SIN_APROBADOR,
       `jefe → [${delJefe.join(", ")}] · gerencia → todo · desconocido → nada · «XX» → «${idoSe}» · tarea (operaciones,N3) → ${tareaPar.join(", ")}`);
  }

  // 88 · FIRMAR NO ES GIRAR, y girar no es integrar. La máquina de estados posterior a la firma:
  //
  //   firma (electrónica del cliente o manual del ejecutivo)
  //     → OTORGAMIENTO / VERIFICACIÓN   mientras falte excepcionar, llamar o falte la evidencia
  //     → PENDIENTE INTEGRACIÓN         resuelto todo: sale del tubo y pasa a Operaciones
  //     → PENDIENTE DE GIRO             Operaciones (N3) aprueba la integración al core
  //
  // Antes la firma saltaba directo a GIRO —con el dinero dado por transferido— cuando
  // `requiereOtorgamiento` decía que no hacía falta aprobación manual. Esa heurística mira dos cosas
  // (¿supera la línea?, ¿hay deudores «Otro»?) y nació antes del motor de reglas, así que el salto se
  // llevaba por delante OTG-02, VER-01 y GIR-02. Se vio en una operación «Girada» con 42 criterios por
  // aprobar y 8 facturas por verificar a la vista, en la misma pantalla.
  {
    const base = { autoOtorg: true, requiereOtorg: false, pendVisado: 0, pendVerif: 0, evidenciaOk: true };
    const limpia = etapaTrasFirma(base);
    const conExc = etapaTrasFirma({ ...base, pendVisado: 42 });
    const conVerif = etapaTrasFirma({ ...base, pendVerif: 8 });
    const sinEvid = etapaTrasFirma({ ...base, evidenciaOk: false });
    const manual = etapaTrasFirma({ ...base, autoOtorg: false, requiereOtorg: true });
    // El caso exacto de la operación que lo destapó: automática, pero con las dos compuertas abiertas.
    const elCaso = etapaTrasFirma({ ...base, pendVisado: 42, pendVerif: 8 });
    // Ninguna combinación con algo pendiente puede saltarse Otorgamiento / Verificación: 2^4.
    let saltos = 0;
    for (const a1 of [true, false]) for (const b1 of [0, 3]) for (const c1 of [0, 5]) for (const d1 of [true, false]) {
      const r = etapaTrasFirma({ autoOtorg: a1, requiereOtorg: !a1, pendVisado: b1, pendVerif: c1, evidenciaOk: d1 });
      if (r.stage !== "otorgamiento" && (b1 || c1 || !d1)) saltos++;
    }
    // Y las etiquetas del tramo posterior, que son lo que el usuario lee.
    const enOtorg = estadoOperacion({ stage: "otorgamiento" });
    const pendInt = estadoOperacion({ stage: "cesion", integracion: "pendiente" });
    const pendGiro = estadoOperacion({ stage: "giro", integracion: "aprobada", giroPendiente: true });
    const girada = estadoOperacion({ stage: "giro", integracion: "aprobada" });
    // Lo que ya es de Operaciones sale del tubo; lo que sigue en manos del ejecutivo, no.
    const fuera = [{ stage: "cesion", integracion: "pendiente" }, { stage: "giro" }].every(fueraDelTubo);
    const dentro = [{ stage: "oferta" }, { stage: "otorgamiento" }, { stage: "aceptadas" }].every((d) => !fueraDelTubo(d));
    ok("88 firmar no es girar: Otorgamiento/Verificación → Pendiente Integración → Pendiente de Giro",
       limpia.stage === "cesion" && limpia.integracion === "pendiente"
       && conExc.stage === "otorgamiento" && conExc.motivo === "excepciones"
       && conVerif.stage === "otorgamiento" && conVerif.motivo === "verificacion"
       && sinEvid.stage === "otorgamiento" && sinEvid.motivo === "evidencia"
       && manual.stage === "otorgamiento" && manual.motivo === "linea_o_deudor"
       && elCaso.stage === "otorgamiento"
       && saltos === 0
       && enOtorg === "Otorgamiento / Verificación" && pendInt === "Pendiente Integración"
       && pendGiro === "Pendiente de Giro" && girada === "Girada"
       && fuera && dentro,
       `limpia → ${limpia.stage}/${limpia.integracion} · 42 excepciones → ${conExc.stage} · 8 por verificar → ${conVerif.stage} · sin evidencia → ${sinEvid.stage} · manual → ${manual.stage} · ${saltos} saltos en 16 combinaciones · etiquetas ${[enOtorg, pendInt, pendGiro, girada].join(" → ")}`);
  }

  // 89 · NINGUNA APROXIMACION: entre DTESync y el motor no se pierde un peso. El monto vivia en
  // MILLONES con dos decimales (`+(MntTotal/1e6).toFixed(2)`), o sea cuantizado de a $10.000: 29.999
  // de 30.000 facturas quedaban mal, $2.503 de error medio y $75.096.940 acumulados. Y el pricing
  // re-inflaba esa cifra a pesos, asi que la «regla de oro» del prorrateo cuadraba contra un total
  // que ya venia equivocado. Este caso fija que el peso es la unidad y que nada la redondea.
  {
    const dte = (window.DTESYNC || []).slice(0, 4000);
    const facturas = dte.map((r) => ({ monto: Math.round(+r.MntTotal || 0) }));
    const perdidos = dte.reduce((a, r, i) => a + Math.abs((+r.MntTotal || 0) - facturas[i].monto), 0);
    const noEnteros = facturas.filter((f) => !Number.isInteger(f.monto)).length;
    // el motor no redondea lo que recibe: lo cursable de una factura que cabe es su monto EXACTO
    const rutP = LB[0];
    const exacta = 12345678, otra = 7654321;
    const rEx = asignarLineas(
      [{ id: "e1", folio: "e1", deudor: nomDe(rutP), rutRecep: rutP, monto: exacta, tipoDeudor: "Lista Blanca" },
       { id: "e2", folio: "e2", deudor: nomDe(rutP), rutRecep: rutP, monto: otra, tipoDeudor: "Lista Blanca" }],
      "X", { estado: estB([L("LF2-ex", "LF2", rutP, 900)], 5000), deudores: { [rutP]: dl(rutP, 900) } });
    const f1 = rEx.facturas.find((f) => f.id === "e1"), f2 = rEx.facturas.find((f) => f.id === "e2");
    // y el reparto entre lineas tampoco pierde: el origen suma exactamente la factura
    const sumaOrigen = (f) => (f.origen || []).reduce((a, o) => a + o.monto, 0);
    // el redondeo del motor es AL PESO, no a la decima de millon
    const alPeso = mmRound(1234567.4) === 1234567 && mmRound(1234567.6) === 1234568;
    ok("89 ninguna aproximación: de DTESync al motor no se pierde un peso",
       perdidos === 0 && noEnteros === 0
       && rEx.cursable === exacta + otra
       && f1.monto === exacta && f2.monto === otra
       && sumaOrigen(f1) === exacta && sumaOrigen(f2) === otra
       && alPeso,
       `${dte.length} facturas · ${perdidos} pesos perdidos · cursable ${rEx.cursable} = ${exacta} + ${otra} · mmRound al peso ${alPeso}`);
  }

  // 90 · LAS PERILLAS DEL MANTENEDOR MANDAN. Configuración › Otorgamiento ofrecía siete campos que
  // NINGÚN motor leía: el administrador movía el número, guardaba, y no pasaba nada. Un mantenedor así
  // es peor que no tenerlo — quien lo usa una vez y no ve efecto deja de creerle al resto de la
  // pantalla. Y uno era peor que muerto: `tasaMinAbsoluta` estaba declarado DOS veces, en el tenant y
  // en `CFG_ATRIB_DESCUENTO`, y la compuerta leía la constante; bajar el mínimo absoluto en el
  // mantenedor no cambiaba nada y el control seguía rechazando con 0,78.
  //
  // Se prueba inyectando un tenant que CONTRADICE al del navegador, que es la única forma de
  // distinguir «lee la configuración» de «coincide con el default».
  {
    const guardado = { ...CFG_ACTIVA };
    const restaurar = () => aplicarCfgActiva(guardado);
    let tasaOk = false, otrosOk = false, ventanaOk = false, notaOk = false, cacheOk = false;
    let detalle = "";
    try {
      // (a) La tasa mínima absoluta la fija el TENANT. Con el piso en 1,50 una tasa de 1,00 cae bajo
      //     el mínimo; con el piso en 0,50 la MISMA tasa pasa. Si leyera la constante (0,78), las dos
      //     darían lo mismo.
      aplicarCfgActiva({ ...guardado, tasaMinAbsoluta: 1.50 });
      const alto = evalAtribucion(2.00, 1.00, 2.00, true);
      aplicarCfgActiva({ ...guardado, tasaMinAbsoluta: 0.50 });
      const bajo = evalAtribucion(2.00, 1.00, 2.00, true);
      tasaOk = alto.estado === "bajoMinimo" && bajo.estado !== "bajoMinimo";

      // (b) El % de «otros deudores» dimensiona el comodín LF4, y el cache se invalida solo: si no,
      //     la segunda lectura devolvería el dimensionamiento hecho con el valor anterior.
      const rutCli = (PC_CLIENTES[0] && PC_CLIENTES[0].rut) || null;
      const comodinCon = (pct) => {
        aplicarCfgActiva({ ...guardado, otrosDeudoresPct: pct });
        const est = lineasDeCliente(rutCli) || {};
        return (est.lineas || []).filter((l) => l.tipo === "LF4").reduce((a, l) => a + (l.aprobado || 0), 0);
      };
      const c10 = comodinCon(10), c40 = comodinCon(40), c10bis = comodinCon(10);
      otrosOk = rutCli != null && c40 > c10 * 1.5;
      cacheOk = c10bis === c10; // vuelve al valor anterior: el cache no se quedó con el de 40

      // (c) La ventana del libro de ventas. Con 7 días ninguna candidata puede tener más de 7 de
      //     emitida; con 180, alguna pasa de 60.
      // La ventana ya no dimensiona un generador: FILTRA el libro del archivo por antigüedad.
      const deal = { id: "OP-CFG-89", cliente: "Cliente 89", rutEmisor: EMISOR_LIBRO, deudores: [{ name: "Deudor 89" }] };
      aplicarCfgActiva({ ...guardado, ventanaLibroDias: 7 });
      const corto = candidatasLibro(deal, []);
      aplicarCfgActiva({ ...guardado, ventanaLibroDias: 180 });
      const largo = candidatasLibro(deal, []);
      const maxDias = (arr) => Math.max(0, ...arr.map((f) => +f.diasEmision || 0));
      ventanaOk = corto.length > 0 && largo.length > corto.length && maxDias(corto) <= 7 && maxDias(largo) > 7;

      // (d) La nota mínima de compra viaja al texto de la propuesta al comité junto con la vigencia.
      //     Las dos estaban escritas a mano en la glosa («nota ≥ 3,7», «vigencia de 12 meses»).
      aplicarCfgActiva({ ...guardado, notaMinCompra: 4.4, vigenciaLineaMeses: 24 });
      const rutDemo = "76.111.111-1";
      const ctx = { cliente: "Cliente 89", tipo: Object.keys(SOLIC_TIPOS)[0], subtipo: "", totalPropuesto: 100, nDeudores: 3, promNota: 4.5,
                    api4: api4Empresa360(rutDemo, "Cliente 89"), api6: api6RiesgoBICE(rutDemo) };
      const glosa = generarNotasIA(ctx).negocio;
      notaOk = /nota ≥ 4,4/.test(glosa) && /vigencia de 24 meses/.test(glosa) && !/3,7/.test(glosa) && !/12 meses/.test(glosa);
      detalle = `piso 1,50→${alto.estado} · piso 0,50→${bajo.estado} · LF4 10%→${c10} 40%→${c40} vuelta→${c10bis} · libro 7d→${maxDias(corto)} 180d→${maxDias(largo)} · glosa «nota ≥ 4,4 / 24 meses» ${notaOk ? "sí" : "no"}`;
    } finally { restaurar(); _cacheCli.clear(); }
    ok("90 lo que el tenant configura en Otorgamiento lo aplica el motor, y el cache no se queda atrás",
       tasaOk && otrosOk && ventanaOk && notaOk && cacheOk, detalle);
  }

  // 91 · LA ESTRUCTURA COMERCIAL Y LA CARTERA SALEN DEL ACTIVO A24, no de constantes del bundle.
  // Quién es ejecutivo, de qué equipo, bajo qué jefatura, en qué zona y de quién es cada cliente lo
  // produce RRHH y la administración comercial, y llega en el archivo de cada mañana. Vivía en cuatro
  // constantes de módulo más un mapa de jefaturas escrito a mano, y la ASIGNACIÓN viajaba dentro del
  // A5 —un activo de participación de mercado— en un campo que además se llavea por NOMBRE: cambiarle
  // el apellido a alguien dejaba a toda su cartera sin dueño, sin error y sin aviso.
  {
    const src = (typeof window !== "undefined" && window.CARTERA) || null;
    const ix = {}; if (src) src.campos.forEach((c, i) => { ix[c] = i; });
    const filas = src ? src.filas : [];
    const ejecFilas = filas.filter((f) => f[ix.TIPO] === "EJECUTIVO");
    const cartFilas = filas.filter((f) => f[ix.TIPO] === "CARTERA");

    // (a) Los cuatro catálogos son un ÍNDICE sobre el activo: mismo conjunto de códigos y, para cada
    //     uno, el equipo, la zona y la sucursal que el archivo declara. Cero contradicciones.
    const codsA24 = ejecFilas.map((f) => f[ix.COD_EJECUTIVO]).sort();
    const codsApp = Object.keys(EXECS).sort();
    const calzan = ejecFilas.every((f) => {
      const c = f[ix.COD_EJECUTIVO];
      return EXECS[c] === f[ix.NOMBRE] && EXEC_JEFATURA[c] === f[ix.EQUIPO]
          && EXEC_ZONA[c] === f[ix.ZONA] && EXEC_SUCURSAL[c] === f[ix.SUCURSAL];
    });

    // (b) El alcance de una jefatura sale de la ARISTA `COD_JEFE`, no de comparar rótulos de equipo.
    //     JG tiene declarado Equipo Andes; las otras dos jefaturas están vacantes y cuelgan de GC.
    const deJG = (execsACargoDe("JG") || []).sort();
    const esperadoJG = ejecFilas.filter((f) => f[ix.COD_JEFE] === "JG").map((f) => f[ix.COD_EJECUTIVO]).sort();
    // Un jefe que el archivo no menciona no ve NADA: en oportunidades ajenas, fallar cerrado es la
    // única respuesta defendible. Y renombrar un equipo no cambia quién ve qué, porque el rótulo no
    // es la clave.
    const jefeDesconocido = (execsACargoDe("ZZ") || []).length === 0;

    // (c) La asignación de cartera sale del A24 y NO del campo pasajero del A5.
    const muestra = cartFilas.slice(0, 40);
    const asignaOk = muestra.every((f) => ejecutivoDeCartera(f[ix.RUT_CLIENTE], null) === f[ix.COD_EJECUTIVO]);
    // Un RUT que el archivo no trae es un PROSPECTO: no tiene dueño. Quién lo trabaja lo decide el
    // pipeline, no el dato — y por eso `ejecutivoDeCartera` devuelve null y no un ejecutivo cualquiera.
    const prospecto = ejecutivoDeCartera("99999999-9", null) === null;

    // (d) INTEGRIDAD: una asignación a un código que el archivo no declara no se carga. Es la razón de
    //     que los dos granos viajen en el mismo archivo — aceptarla dejaría operaciones colgando de
    //     alguien que no existe, que es justo el estado que no se puede auditar después.
    const declarados = new Set(codsA24);
    const huerfanas = cartFilas.filter((f) => !declarados.has(f[ix.COD_EJECUTIVO])).length;
    const sinHuerfanasEnIndice = Object.values(CARTERA_A24.asignacion).every((c) => declarados.has(c));

    ok("91 la estructura comercial y la cartera salen del activo A24, no de constantes del bundle",
       ejecFilas.length > 0 && cartFilas.length > 0
       && JSON.stringify(codsA24) === JSON.stringify(codsApp) && calzan
       && deJG.length > 0 && JSON.stringify(deJG) === JSON.stringify(esperadoJG) && jefeDesconocido
       && asignaOk && prospecto
       && huerfanas === 0 && sinHuerfanasEnIndice,
       `${ejecFilas.length} ejecutivos · ${cartFilas.length} asignaciones · catálogos calzan ${calzan} · JG → [${deJG.join(", ")}] · jefe desconocido → nada · ${muestra.length} asignaciones verificadas · prospecto sin dueño · ${huerfanas} huérfanas`);
  }

  // 92 · EL LIBRO DE VENTAS NO DEPENDE DE LA OFERTA. Es lo que el cliente EMITIÓ: no cambia porque
  // nosotros elijamos qué comprarle. El folio más alto se anclaba sobre las facturas ya incluidas
  // —`Math.max(...enOferta, ...reales)`— y de ese folio cuelga todo: de él sale el folio de cada
  // documento y del folio salen, por hash, su DEUDOR y su MONTO. Incorporar una factura corría el
  // ancla y re-sorteaba el libro entero: el mismo deudor mostraba dos facturas antes de agregar y
  // siete después, con folios y montos que no existían un segundo antes.
  {
    const deudores = [{ name: "Deudor Uno", rut: "77.461.061-0" }, { name: "Deudor Dos", rut: "42.124.113-9" }];
    const mk = (facturasOp) => ({ id: "OP-LIB-92", cliente: "Cliente 92", rutEmisor: EMISOR_LIBRO,
      deudores, facturasOp, facturasDisponibles: [], facturasRetiradas: [], nuevasFacturas: 0 });
    const foto = (deal) => {
      const c = candidatasLibro(deal, deal.facturasOp);
      const porDoc = {};
      c.forEach((f) => { porDoc[f.folio] = `${f.deudor}|${f.monto}`; });
      return { folios: new Set(c.map((f) => f.folio)), porDoc, n: c.length };
    };
    const vacia = foto(mk([]));
    const base = candidatasLibro(mk([]), []);
    const una = foto(mk([{ ...base[0], candidata: false }]));
    const dos = foto(mk([{ ...base[0], candidata: false }, { ...base[1], candidata: false }]));

    // (a) Incorporar no INVENTA documentos: ningún folio nuevo aparece en el pool.
    const nuevosTras1 = [...una.folios].filter((f) => !vacia.folios.has(f));
    const nuevosTras2 = [...dos.folios].filter((f) => !vacia.folios.has(f));
    // (b) Lo único que cambia es que el incorporado sale del pool — y NO se vuelve a ofrecer, que es
    //     el cabo que deja un ancla estable: el libro volvería a generar la misma factura y el
    //     documento aparecería dos veces, una en la oferta y otra en «otras facturas de este deudor».
    const salieron1 = [...vacia.folios].filter((f) => !una.folios.has(f));
    const salieron2 = [...vacia.folios].filter((f) => !dos.folios.has(f));
    // (c) Y el DEUDOR y el MONTO de cada documento que sigue en el pool no se mueven: eran función
    //     del folio, y el folio era función de la oferta.
    const estables = [...dos.folios].every((f) => dos.porDoc[f] === vacia.porDoc[f]);
    // (d) Dos lecturas seguidas sobre la MISMA oferta dan lo mismo (determinismo, que ya se esperaba).
    const repetible = JSON.stringify(foto(mk([])).porDoc) === JSON.stringify(vacia.porDoc);

    ok("92 el libro de ventas no se re-sortea al incorporar una factura a la oferta",
       vacia.n > 10
       && nuevosTras1.length === 0 && nuevosTras2.length === 0
       && salieron1.length === 1 && salieron1[0] === base[0].folio
       && salieron2.length === 2
       && estables && repetible,
       `${vacia.n} docs → ${una.n} → ${dos.n} · 0 folios nuevos · salieron [${salieron2.join(", ")}] · deudor y monto estables ${estables}`);
  }

  // ── 93 · LAS FECHAS DE LA FACTURA SON UN DATO, NO UNA DERIVACIÓN ─────────────────────────────
  // El usuario lo dijo así: «esas no pueden cambiar entre una pantalla y otra, y los montos, folios,
  // rut, razón social… la factura se carga y debe persistir en el build». La fecha de emisión salía de
  // `new Date(Date.now() - (hashStr("em" + folio) % 20 + 3) * 86400000)` en tres sitios del detalle,
  // más una cuarta fórmula por `diasEmision` en la tabla de candidatas y una quinta por id para la
  // antigüedad — así que el MISMO folio mostraba una fecha en la oferta, otra en la tabla de al lado,
  // y todas corridas un día cada día. Mientras tanto el activo A1 trae `FchEmis` y `FchVenc` en cada
  // fila y el inbound las descartaba fijando `venc: 45` a mano.
  {
    // (a) El resolver no mira el reloj. Se adelanta `Date.now` cuarenta días: mismas fechas.
    const muestra = [
      { folio: 400001, venc: 30 },
      { folio: 400002, venc: 61, diasEmision: 12 },
      { folio: 400003, fchEmis: "2026-05-04", fchVenc: "2026-07-03", venc: 60 },
      { folio: 400004, fchEmis: "2026-06-01", venc: 45 },
    ];
    const antes = muestra.map((f) => JSON.stringify(fechasDocumento(f)));
    const real = Date.now;
    let despues;
    try { Date.now = () => real() + 40 * 86400000; despues = muestra.map((f) => JSON.stringify(fechasDocumento(f))); }
    finally { Date.now = real; }
    const sinReloj = antes.every((x, i) => x === despues[i]);

    // (b) LEE lo que el documento trae, no lo recalcula: la fila del activo manda.
    const leida = fechasDocumento(muestra[2]);
    const leeElDato = leida.emision === "2026-05-04" && leida.vencimiento === "2026-07-03";
    // …y con `FchVenc` ausente el vencimiento sale del plazo del propio documento, no de un default.
    const soloEmis = fechasDocumento(muestra[3]);
    const plazoPropio = soloEmis.emision === "2026-06-01" && soloEmis.vencimiento === "2026-07-16";

    // (c) EL DEFECTO QUE REPORTÓ EL USUARIO: la misma factura, mirada como candidata y como incluida
    //     en la oferta, tenía dos fechas — `f.candidata ? diasEmision : hashStr("em" + folio)`.
    const dealLib = { id: "OP-FEC-93", cliente: "Cliente 93", rutEmisor: EMISOR_LIBRO,
      deudores: [{ name: "Deudor Uno", rut: "77.461.061-0" }], facturasOp: [], facturasDisponibles: [],
      facturasRetiradas: [], nuevasFacturas: 0 };
    const pool = candidatasLibro(dealLib, []);
    const todasSelladas = pool.length > 0 && pool.every((f) => !!f.fchEmis && !!f.fchVenc);
    const mismaEnDosPantallas = pool.every((f) => {
      const comoCandidata = JSON.stringify(fechasDocumento(f));
      const enLaOferta = JSON.stringify(fechasDocumento({ ...f, candidata: false }));
      return comoCandidata === enLaOferta;
    });
    // …y el vencimiento del libro es la emisión más el plazo del deudor, no un sorteo aparte.
    const vencCoherente = pool.every((f) => {
      const d = Math.round((Date.parse(f.fchVenc + "T00:00:00") - Date.parse(f.fchEmis + "T00:00:00")) / 86400000);
      return d === +f.venc;
    });

    // (d) El respaldo por folio —para un documento sin ninguna de las dos fechas— es estable y queda
    //     ANCLADO EN EL CORTE DEL ACTIVO: nunca después de la emisión más nueva que trae el batch.
    const corte = corteDTE();
    const resp = fechasDocumento({ folio: 400001, venc: 30 });
    const respEstable = JSON.stringify(resp) === JSON.stringify(fechasDocumento({ folio: 400001, venc: 30 }));
    const noFuturo = resp.emision <= corte;
    const corteEsDelDato = (() => {
      let max = "";
      for (const r of (window.DTESYNC || [])) { if (r && r.FchEmis && r.FchEmis > max) max = r.FchEmis; }
      return !max || max === corte;
    })();

    // (e) El plazo sale de las DOS fechas del activo. Con `venc: 45` a mano había un solo plazo en
    //     todo el sistema y el prorrateo —que descuenta por plazo— cobraba igual a 30 que a 90 días.
    const plazos = new Set();
    for (const r of (window.DTESYNC || []).slice(0, 4000)) plazos.add(plazoDTE(r));
    const plazoReal = plazos.size > 1;
    const plazoEsLaResta = plazoDTE({ FchEmis: "2026-05-04", FchVenc: "2026-07-03" }) === 60
      && plazoDTE({ FchEmis: "2026-05-04" }) === 45;

    ok("93 las fechas de la factura son un dato del documento y no cambian entre pantallas",
       sinReloj && leeElDato && plazoPropio
       && todasSelladas && mismaEnDosPantallas && vencCoherente
       && respEstable && noFuturo && corteEsDelDato
       && plazoReal && plazoEsLaResta,
       `corte ${corte} · ${pool.length} docs sellados ${todasSelladas} · candidata=oferta ${mismaEnDosPantallas} · reloj indiferente ${sinReloj} · ${plazos.size} plazos distintos en el activo`);
  }

  // ── 94 · LAS FACTURAS SALEN DEL ARCHIVO, NO DEL PIPELINE ────────────────────────────────────
  // «La data de facturas debe venir de un archivo, no la puede generar el pipeline… igual que las
  // fechas de vcto, empresas, etc.» — y el README del generador ya lo escribía: «El pipeline no
  // genera datos: los lee y los procesa». `candidatasLibro` SINTETIZABA 40–80 facturas por operación
  // con folio, deudor y monto salidos de `hashStr`, y `estadoCandidata` sorteaba por hash si el
  // documento estaba anulado por nota de crédito o cedido a terceros. Eran documentos que no existen
  // en ningún activo, con razones sociales y montos inventados, al lado de los reales del inbound.
  {
    const dte = window.DTESYNC || [];
    const porFolio = {};
    for (const r of dte) { if (r && r.RUTEmisor) porFolio[r.RUTEmisor + "|" + r.Folio] = r; }

    // (a) TODO documento del libro existe en el activo, con su mismo deudor, RUT y monto.
    const deal = { id: "OP-ARCH-94", cliente: "C94", rutEmisor: EMISOR_LIBRO, deudores: [],
                   facturasOp: [], facturasDisponibles: [], facturasRetiradas: [], nuevasFacturas: 0 };
    const libro = candidatasLibro(deal, []);
    const inventadas = libro.filter((f) => !porFolio[EMISOR_LIBRO + "|" + f.folio]);
    const calzan = libro.every((f) => {
      const r = porFolio[EMISOR_LIBRO + "|" + f.folio];
      return r && f.deudor === r.RznSocRecep && f.rutRecep === r.RUTRecep
        && f.monto === Math.round(+r.MntTotal || 0) && f.fchEmis === r.FchEmis && f.fchVenc === r.FchVenc;
    });

    // (b) Un cliente que el archivo NO declara no tiene libro. Antes se le sintetizaba uno completo,
    //     que es la forma más silenciosa de inventar: una pantalla llena de documentos plausibles.
    const fantasma = candidatasLibro({ ...deal, id: "OP-ARCH-94b", rutEmisor: "99.999.999-9" }, []);

    // (c) El ESTADO del documento también sale del activo. Se comparan las tres poblaciones del
    //     archivo contra lo que dice `estadoCandidata`, documento a documento.
    const delArchivo = dte.filter((r) => r.RUTEmisor === EMISOR_LIBRO).map((r) => facturaDeDTE(r));
    const conNC = delArchivo.filter((f) => f.notaCredito), conRec = delArchivo.filter((f) => f.reclamada && !f.notaCredito);
    const limpias = delArchivo.filter((f) => !f.notaCredito && !f.reclamada);
    const estadoOk = conNC.every((f) => estadoCandidata(f, deal).clave === "notaCredito")
      && conRec.every((f) => estadoCandidata(f, deal).clave === "reclamada")
      && limpias.every((f) => estadoCandidata(f, deal).clave === "ok");
    // …y NINGÚN documento limpio del archivo se bloquea: el hash bloqueaba ~29% de todo lo que mirara.
    const bloqueadasSinMotivo = limpias.filter((f) => estadoCandidata(f, deal).bloqueada).length;

    // (d) Lo único que NO sale del archivo es «en otra operación», porque no es un hecho del SII sino
    //     de este sistema. Entra por parámetro, como el veto de la verificación.
    const unaLimpia = limpias[0];
    const tomada = unaLimpia ? estadoCandidata(unaLimpia, deal, { enOtraOp: { [String(unaLimpia.folio)]: "OP-OTRA" } }) : null;
    const propia = unaLimpia ? estadoCandidata(unaLimpia, deal, { enOtraOp: { [String(unaLimpia.folio)]: deal.id } }) : null;
    const otraOpOk = !!tomada && tomada.clave === "otraOp" && !!propia && propia.clave === "ok";

    // (e) El asistente de alta manual lee el MISMO libro (antes generaba 6–13 facturas por `rndDet`).
    const wiz = genFacturasCliente(EMISOR_LIBRO);
    const wizOk = wiz.length > 0 && wiz.every((f) => !!porFolio[EMISOR_LIBRO + "|" + f.folio])
      && wiz.every((f) => f.montoCLP === Math.round(+porFolio[EMISOR_LIBRO + "|" + f.folio].MntTotal || 0));

    ok("94 las facturas y su estado salen del activo, no las genera el pipeline",
       libro.length > 10 && inventadas.length === 0 && calzan
       && fantasma.length === 0
       && conNC.length > 0 && conRec.length > 0 && estadoOk && bloqueadasSinMotivo === 0
       && otraOpOk && wizOk,
       `${libro.length} docs del libro · 0 inventados ${inventadas.length === 0} · cliente fuera del archivo → ${fantasma.length} · NC ${conNC.length} · reclamadas ${conRec.length} · limpias bloqueadas ${bloqueadasSinMotivo} · alta manual ${wiz.length} docs`);
  }

  // ── 95 · UNA FACTURA CEDIDA ES UNA FACTURA QUE EXISTE ───────────────────────────────────────
  // «Las facturas cedidas no se pueden inventar, deben ser facturas del pool de facturas generadas.»
  // AECSync (A2) era un dataset BASE con folios propios: de sus 1.300 cesiones sólo 3 referenciaban un
  // folio que DTESync declara para ese mismo cedente, y 1.267 tenían fecha ANTERIOR a la emisión del
  // documento que decían ceder. Una cesión sin documento no se puede atribuir a nada, así que todo lo
  // que cuelga de ella se inventaba aguas abajo: «cedida a terceros» salía de un hash del folio,
  // `perdidaCesion` de un `rndDetBool(id, 0.12)` y `cedidasOtro` quedaba siempre en 0.
  {
    const dte = window.DTESYNC || [], aec = window.AECSYNC || [];
    const porFolio = {};
    for (const r of dte) { if (r && r.RUTEmisor) porFolio[r.RUTEmisor + "|" + r.Folio] = r; }

    // (a) TODA cesión apunta a un documento real de SU cedente, con los campos copiados del A1.
    const huerfanas = aec.filter((c) => !porFolio[c.RUTCedente + "|" + c.Folio]);
    const calzan = aec.every((c) => {
      const r = porFolio[c.RUTCedente + "|" + c.Folio];
      // El monto DEL DOCUMENTO es el del A1 y no se discute; el CEDIDO es igual o menor (ver (b)).
      return r && c.MontoDocumento === Math.round(+r.MntTotal || 0) && c.MontoCesion <= c.MontoDocumento
        && c.FechaEmisionDTE === r.FchEmis && c.RUTReceptor === r.RUTRecep && c.RazonSocialReceptor === r.RznSocRecep;
    });
    // (b) LOS DOS INVARIANTES DEL ACTIVO, que el generador comprueba antes de escribir:
    //     · no se cede antes de emitir — no se puede ceder una factura que no se emitió;
    //     · el monto cedido es IGUAL O MENOR que el del documento — ceder más sería transferir un
    //       crédito que no existe.
    //     Y la cota «o menor» tiene que estar EJERCITADA: la entrega anterior tenía las 1.300 cesiones
    //     por el total exacto, así que el invariante se cumplía sin que nada lo probara.
    const antesDeEmitir = aec.filter((c) => String(c.FechaCesion).slice(0, 10) < c.FechaEmisionDTE).length;
    const cedeDeMas = aec.filter((c) => {
      const r = porFolio[c.RUTCedente + "|" + c.Folio];
      return +c.MontoCesion > +c.MontoDocumento || (r && +c.MontoCesion > Math.round(+r.MntTotal || 0));
    }).length;
    const parciales = aec.filter((c) => +c.MontoCesion < +c.MontoDocumento).length;
    const docOk = aec.every((c) => { const r = porFolio[c.RUTCedente + "|" + c.Folio]; return r && +c.MontoDocumento === Math.round(+r.MntTotal || 0); });
    const dobles = aec.length - new Set(aec.map((c) => c.RUTCedente + "|" + c.Folio)).size;
    const noCedibles = aec.filter((c) => {
      const r = porFolio[c.RUTCedente + "|" + c.Folio], e = (r && r.EstadoDTE) || {};
      return r && (r.FormaPago !== "2" || e.NotaCredito === "1" || e.Reclamado === "1");
    }).length;

    // …y el pipeline LEE la cesión parcial: el bloqueo dice por cuánto se cedió y de cuánto era la
    // factura, y lo que se llevó el otro factoring es el monto CEDIDO, no el del documento.
    const cesParcial = aec.find((c) => +c.MontoCesion < +c.MontoDocumento && c.RUTFactoring !== BICE_RUT && porFolio[c.RUTCedente + "|" + c.Folio]);
    let parcialOk = false, montoOk = false;
    if (cesParcial) {
      const d = { id: "OP-CES-95p", cliente: "C95p", rutEmisor: cesParcial.RUTCedente, deudores: [],
                  facturasOp: [], facturasDisponibles: [], facturasRetiradas: [], nuevasFacturas: 0 };
      const f = facturaDeDTE(porFolio[cesParcial.RUTCedente + "|" + cesParcial.Folio]);
      const est = estadoCandidata(f, d);
      parcialOk = est.bloqueada && est.clave === "cedida" && /parcial/i.test(est.detalle || "");
      // El monto perdido es el cedido, que es MENOR que la factura.
      const ag = cesionesAjenasDeDeal({ ...d, facturasOp: [f] });
      montoOk = ag.n === 1 && ag.parciales === 1 && ag.monto === +cesParcial.MontoCesion && ag.monto < f.monto;
    }

    // (c) El pipeline lo LEE: una factura cedida a otro factoring se bloquea con su nombre y su fecha,
    //     y una cedida a nosotros se distingue —no es competencia, es cartera propia—.
    const ajena = aec.find((c) => c.RUTFactoring !== BICE_RUT && porFolio[c.RUTCedente + "|" + c.Folio]);
    const propia = aec.find((c) => c.RUTFactoring === BICE_RUT && porFolio[c.RUTCedente + "|" + c.Folio]);
    const dealDe = (c) => ({ id: "OP-CES-95", cliente: "C95", rutEmisor: c.RUTCedente, deudores: [],
                             facturasOp: [], facturasDisponibles: [], facturasRetiradas: [], nuevasFacturas: 0 });
    const facDe = (c) => facturaDeDTE(porFolio[c.RUTCedente + "|" + c.Folio]);
    const estA = ajena ? estadoCandidata(facDe(ajena), dealDe(ajena)) : null;
    const estP = propia ? estadoCandidata(facDe(propia), dealDe(propia)) : null;
    const bloqueoOk = !!estA && estA.clave === "cedida" && estA.bloqueada
      && (estA.detalle || "").includes(ajena.RazonSocialFactoring)
      && !!estP && estP.clave === "cedidaNuestra" && estP.bloqueada;

    // (d) Y un documento del MISMO cedente que nadie cedió sigue disponible: el bloqueo no se contagia
    //     al cliente entero, que es lo que haría un hash por cedente.
    const cedidos = new Set(aec.map((c) => c.RUTCedente + "|" + c.Folio));
    const libre = dte.find((r) => r.RUTEmisor === ajena.RUTCedente && !cedidos.has(r.RUTEmisor + "|" + r.Folio)
      && r.FormaPago === "2" && !(r.EstadoDTE || {}).NotaCredito && !(r.EstadoDTE || {}).Reclamado);
    const libreOk = !!libre && estadoCandidata(facturaDeDTE(libre), dealDe(ajena)).clave === "ok";

    // (e) La PÉRDIDA por cesión sale de las facturas de la oferta, no de un sorteo. Se arma una oferta
    //     con el documento cedido y se comprueba que el adaptador lo cuente y nombre a quien se lo llevó.
    const dealCedido = { ...dealDe(ajena), facturasOp: [facDe(ajena)] };
    const ced = cesionesAjenasDeDeal(dealCedido);
    const dealLimpio = { ...dealDe(ajena), facturasOp: [facturaDeDTE(libre)] };
    const limpio = cesionesAjenasDeDeal(dealLimpio);
    const perdidaOk = ced.n === 1 && ced.factoring === ajena.RazonSocialFactoring && limpio.n === 0 && limpio.factoring === null;
    // …y el competidor de la operación es el que tocó SUS facturas, no uno elegido por hash del id.
    const compOk = aecCompetidorDe(dealCedido) === ajena.RazonSocialFactoring;

    // (f) Y lo que el A11 DERIVA de las cesiones queda bien derivado. `FECHA_PRIMERA_OPERACION` se
    //     llenaba con el MÁXIMO de las fechas de cesión, o sea con la ÚLTIMA: una empresa que nos cede
    //     hace dos años figuraba como cliente estrenado el mes pasado. Y `FECHA_INGRESO` se generaba
    //     por hash sin mirarla, así que podía quedar después de la primera operación — un cliente que
    //     operó antes de existir. Con las cesiones reconciliadas contra el A1 esto ya se puede medir.
    const primeraReal = {};
    for (const c of aec) {
      if (c.RUTFactoring !== BICE_RUT) continue;
      const f = String(c.FechaCesion).slice(0, 10);
      if (!primeraReal[c.RUTEmisor] || f < primeraReal[c.RUTEmisor]) primeraReal[c.RUTEmisor] = f;
    }
    const p360 = (window.PLATAFORMA360 && window.PLATAFORMA360.filas) || [];
    const ixp = {}; ((window.PLATAFORMA360 && window.PLATAFORMA360.campos) || []).forEach((c, i) => { ixp[c] = i; });
    let conColoc = 0, primeraOk = 0, ingresoMal = 0;
    for (const fila of p360) {
      const rut = fila[ixp.RUT], prim = fila[ixp.FECHA_PRIMERA_OPERACION], ing = fila[ixp.FECHA_INGRESO];
      if (!prim) continue;
      conColoc++;
      if (prim === primeraReal[rut]) primeraOk++;
      if (ing > prim) ingresoMal++;
    }
    const p360Ok = conColoc > 100 && primeraOk === conColoc && ingresoMal === 0;

    ok("95 una factura cedida es una factura que existe, y la pérdida por cesión sale del registro",
       aec.length > 1000 && huerfanas.length === 0 && calzan
       && antesDeEmitir === 0 && cedeDeMas === 0 && docOk && parciales > 0 && dobles === 0 && noCedibles === 0
       && parcialOk && montoOk
       && bloqueoOk && libreOk && perdidaOk && compOk && p360Ok,
       `${aec.length} cesiones · 0 huérfanas ${huerfanas.length === 0} · antes de emitir ${antesDeEmitir} · ceden de más ${cedeDeMas} · parciales ${parciales} (cota ejercitada) · dobles ${dobles} · no cedibles ${noCedibles} · bloqueo «${estA && estA.label}» / «${estP && estP.label}» · libre del mismo cedente ok ${libreOk} · pérdida ante ${ced.factoring} · A11: ${primeraOk}/${conColoc} con primera operación correcta, ${ingresoMal} ingresos posteriores `);
  }

  // ── 96 · O06 · EL MONTO CEDIDO TIENE QUE SER EL MONTO DEL DOCUMENTO ─────────────────────────
  // «Me parece que hay una regla en el motor de otorgamiento que revisa que el monto de cesión sea =
  // monto de la factura, en el área de operaciones. Esa regla busca detectar estos casos.»
  // NO EXISTÍA. La política v1.0 trae dos reglas sobre cesiones y las dos son de CONCENTRACIÓN —C37,
  // cuánto de su venta cede el cliente, y C39, cuánto le cede a factorings pequeños—, las dos del área
  // comercial. Ninguna mira el monto de UN documento, y el área de Operaciones sólo tenía O05. El
  // control faltaba justo donde el dato podía romperse, que es lo que destapó tener cesiones parciales.
  {
    const dte = window.DTESYNC || [], aec = window.AECSYNC || [];
    const porFolio = {};
    for (const r of dte) { if (r && r.RUTEmisor) porFolio[r.RUTEmisor + "|" + r.Folio] = r; }
    const regla = REGLAS_CLIENTE.find((r) => r.cond === "O06");

    // (a) La regla existe, es de OPERACIONES y sus dos tramos van a niveles distintos: ceder de más no
    //     es una diferencia, es un crédito que no existe.
    const declOk = !!regla && regla.area === "operaciones" && regla.tiers.length === 2
      && regla.tiers[0][2] === 5 && regla.tiers[1][2] === 3;

    // (b) Se EVALÚA sobre las facturas de la operación. Una oferta con un documento cedido en parte
    //     levanta la excepción; la misma oferta sin él, no.
    const parcial = aec.find((c) => +c.MontoCesion < +c.MontoDocumento && porFolio[c.RUTCedente + "|" + c.Folio]);
    const cedidos = new Set(aec.map((c) => c.RUTCedente + "|" + c.Folio));
    const limpio = parcial && dte.find((r) => r.RUTEmisor === parcial.RUTCedente && !cedidos.has(r.RUTEmisor + "|" + r.Folio)
      && r.FormaPago === "2" && !(r.EstadoDTE || {}).NotaCredito && !(r.EstadoDTE || {}).Reclamado);
    const base = { id: "OP-O06", cliente: "C96", rutEmisor: parcial && parcial.RUTCedente, deudores: [],
                   facturasDisponibles: [], facturasRetiradas: [], nuevasFacturas: 0 };
    const vParcial = varsOperacionCli({ ...base, facturasOp: [facturaDeDTE(porFolio[parcial.RUTCedente + "|" + parcial.Folio])] });
    const vLimpia = varsOperacionCli({ ...base, facturasOp: [facturaDeDTE(limpio)] });
    const medirOk = vParcial.cesionParcial === 1 && vParcial.cesionExcedida === 0
      && vLimpia.cesionParcial === 0 && vLimpia.cesionExcedida === 0;

    // (c) El veredicto de la regla con cada juego de variables. Se evalúa el catálogo directamente,
    //     que es lo que hace el motor: el tramo que gana define el nivel exigido.
    const evaluar = (vars) => {
      for (const [test, disp, nivel] of regla.tiers) if (test(vars)) return { disp, nivel };
      return { disp: "aprobado", nivel: null };
    };
    const rParcial = evaluar(vParcial), rLimpia = evaluar(vLimpia);
    const rExcedida = evaluar({ cesionParcial: 0, cesionExcedida: 1 });
    const veredictoOk = rParcial.disp === "excepcion" && rParcial.nivel === 3
      && rLimpia.disp === "aprobado"
      && rExcedida.disp === "excepcion" && rExcedida.nivel === 5;

    // (d) Y tiene quién la apruebe: Operaciones alcanza los dos niveles, o la excepción quedaría en
    //     «Sin aprobador definido», que sería un bug de configuración disfrazado de control.
    const conAprob = (n) => aprobadoresExc({ area: "operaciones" }, n).length > 0;
    const aprobOk = conAprob(3) && conAprob(5);

    // (e) La política NO la trae: sus dos reglas de cesión son de concentración y del área comercial.
    const c37 = REGLAS_CLIENTE.find((r) => r.cond === "C37"), c39 = REGLAS_CLIENTE.find((r) => r.cond === "C39");
    const politicaOk = !!c37 && c37.area === "comercial" && !!c39 && c39.area === "comercial";

    ok("96 O06 · el monto cedido tiene que ser el monto del documento, y lo controla Operaciones",
       declOk && medirOk && veredictoOk && aprobOk && politicaOk,
       `O06 operaciones N5/N3 · parcial → ${rParcial.disp} N${rParcial.nivel} · limpia → ${rLimpia.disp} · excedida → ${rExcedida.disp} N${rExcedida.nivel} · aprobadores N3 y N5 ${aprobOk} · la política sólo trae C37/C39 (concentración, comercial)`);
  }

  // ── 97 · «DEUDORES DISPONIBLES» SE PARTE POR LÍNEA, NO POR CALIDAD NI POR TRÁMITES ───────────
  // «Agrega 2 tabs sobre esta lista de deudores; en uno muestra los deudores que tienen facturas con
  // línea, sin importar si son Prime o no, sin importar si no tienen otorgamiento y/o verificación
  // pendiente. En el otro deja el resto.» La pregunta que el ejecutivo trae a esa pantalla es «a quién
  // le puedo comprar hoy», y eso lo decide la LÍNEA: los otros dos chips de la fila describen la
  // calidad del deudor y trámites que se resuelven, no si el documento cabe en el cupo.
  {
    const rutP = LB[0];
    const tres = [fac("g1", rutP, 100), fac("g2", rutP, 30), fac("g3", rutP, 7)];
    const inyP = (ap) => ({ estado: estB([L("LF2-97", "LF2", rutP, ap)], 5000), deudores: { [rutP]: dl(rutP, 900) } });

    // (a) EL CRITERIO ES POR FACTURA, NO POR EL TOTAL DEL DEUDOR. Con 40 de línea y facturas por 137
    //     el total no cabe, pero dos documentos sí — que es exactamente el caso que la pantalla tiene
    //     que mostrar como cursable (M$137,5 disponibles con M$35,4 de línea, y facturas que entran).
    const cl = facturasConLinea(tres, "X", null, inyP(40));
    const porFacturaOk = cl.n === 2 && mm(cl.monto) === 37;

    // (b) Los dos extremos: sin línea no cabe ninguna, con línea de sobra caben todas.
    const sin = facturasConLinea(tres, "X", null, inyP(0));
    const toda = facturasConLinea(tres, "X", null, inyP(500));
    const bordesOk = sin.n === 0 && sin.monto === 0 && toda.n === 3 && mm(toda.monto) === 137;

    // (c) LO QUE NO MIRA · la CALIDAD del deudor. Un deudor «Otro» —que no es Prime y se financia por
    //     la línea de otros deudores— con cupo suficiente entra igual. Si el criterio filtrara por
    //     Prime, este deudor no aparecería nunca en la pestaña aunque se le pueda comprar hoy.
    const noP = noPrime;
    // El comodín LF4 se elige por CATEGORÍA (`tipoLineaDeDeudor`), así que un deudor fuera de lista se
    // financia con el de «Deudores Autorizados» y no con el de Lista Blanca que usa el helper del archivo.
    const lf4Otros = { id: "LF4-97", tipo: "LF4", granularidad: "comodin", categoria: "Deudores Autorizados", rutDeudor: null, aprobado: 40 * MMF, vigente: 0 };
    const clOtro = facturasConLinea([facOtro("h1", noP, 18)], "X", null,
      { estado: estB([lf4Otros], 5000), deudores: { [noP]: dl(noP, 900) } });
    const ignoraPrimeOk = clOtro.n === 1 && tipoDeudor(noP, "NoPrime-" + noP) === "Otro";

    // (d) LO QUE NO MIRA · las COMPUERTAS. No son parámetros de la función: `facturasConLinea` recibe
    //     facturas, cliente, incorporables y el estado de líneas, y nada más. Un criterio que mirara
    //     el otorgamiento o la verificación tendría que recibirlos, y no puede porque no están.
    const ignoraCompuertasOk = facturasConLinea.length === 4;

    // (e) Sólo cuentan las INCORPORABLES: una factura que cabe en la línea pero está bloqueada
    //     —cedida, con nota de crédito, en otra operación— no habilita a nadie.
    const soloUna = facturasConLinea(tres, "X", new Set(["g3"]), inyP(500));
    const incorpOk = soloUna.n === 1 && mm(soloUna.monto) === 7;

    // (f) LA PARTICIÓN ES EXHAUSTIVA Y DISJUNTA sobre el libro real de un cliente: cada deudor cae en
    //     exactamente una pestaña. Si pudiera faltar en las dos, desaparecería de la pantalla sin que
    //     nada lo dijera — y las dos juntas tienen que sumar lo que anuncia la cabecera.
    const dealReal = { id: "OP-TABS-97", cliente: "C97", rutEmisor: EMISOR_LIBRO, deudores: [],
                       facturasOp: [], facturasDisponibles: [], facturasRetiradas: [], nuevasFacturas: 0 };
    const porDeudor = {};
    candidatasLibro(dealReal, []).forEach((f) => { (porDeudor[f.deudor] = porDeudor[f.deudor] || []).push(f); });
    const nombres = Object.keys(porDeudor);
    const conL = [], resto = [];
    for (const dn of nombres) {
      const incorp = new Set(porDeudor[dn].filter((f) => estadoCandidata(f, dealReal).agregable).map((f) => f.id));
      (facturasConLinea(porDeudor[dn], EMISOR_LIBRO, incorp).n > 0 ? conL : resto).push(dn);
    }
    const particionOk = nombres.length > 5 && conL.length + resto.length === nombres.length
      && new Set([...conL, ...resto]).size === nombres.length && conL.length > 0 && resto.length > 0;

    ok("97 «Deudores disponibles» se parte por LÍNEA, y el criterio no mira Prime ni las compuertas",
       porFacturaOk && bordesOk && ignoraPrimeOk && ignoraCompuertasOk && incorpOk && particionOk,
       `línea 40 con facturas por 137 → caben 2 (37) · sin línea 0 · con línea de sobra 3 (137) · deudor «Otro» con LF4 entra igual · bloqueadas fuera · partición ${conL.length} con línea + ${resto.length} el resto = ${nombres.length} deudores`);
  }

  // ── 98 · LA VISTA «POR FACTURA»: MISMO CONTENIDO, DEL FOLIO MÁS NUEVO AL MÁS ANTIGUO ────────
  // «Deja una opción de verlo como lista de deudores o como lista de facturas. En la de facturas
  // ordénalas por folio del más nuevo (último) al más antiguo (más chico).» Es una vista, no un filtro:
  // la agrupada responde «a quién le compro» y la plana «qué documentos hay» — la pregunta que uno trae
  // cuando busca un folio o quiere ver lo último que emitió el cliente sin abrir once acordeones.
  {
    const dealReal = { id: "OP-VISTA-98", cliente: "C98", rutEmisor: EMISOR_LIBRO, deudores: [],
                       facturasOp: [], facturasDisponibles: [], facturasRetiradas: [], nuevasFacturas: 0 };
    const libro = candidatasLibro(dealReal, []);
    const porDeudor = {};
    libro.forEach((f) => { (porDeudor[f.deudor] = porDeudor[f.deudor] || []).push(f); });
    const nombres = Object.keys(porDeudor);

    // (a) ORDEN: folio DESCENDENTE, estricto. El folio del SII es correlativo dentro del emisor, así que
    //     el más alto es el documento más nuevo.
    const todas = facturasDeDeudores(nombres, porDeudor);
    const descendente = todas.every((f, i) => i === 0 || (+todas[i - 1].folio || 0) >= (+f.folio || 0));

    // (b) MISMO CONTENIDO que la vista agrupada: ni una factura de más ni una de menos. Cambiar de vista
    //     no puede hacer desaparecer un documento —es lo único que separa una vista de un filtro—.
    const idsAgrupada = new Set(nombres.flatMap((dn) => porDeudor[dn].map((f) => f.id)));
    const idsPlana = new Set(todas.map((f) => f.id));
    const mismoSet = todas.length === idsAgrupada.size && idsPlana.size === todas.length
      && [...idsAgrupada].every((id) => idsPlana.has(id));

    // (c) Es una vista de LO QUE SE LE PASE: con los deudores de una pestaña trae sólo los de esa
    //     pestaña. Así el selector de vista y las pestañas se componen sin conocerse.
    const mitad = nombres.slice(0, Math.max(1, Math.floor(nombres.length / 2)));
    const parcial = facturasDeDeudores(mitad, porDeudor);
    const soloEsos = parcial.length > 0 && parcial.every((f) => mitad.includes(f.deudor))
      && parcial.length === mitad.reduce((n, dn) => n + porDeudor[dn].length, 0);

    // (d) Bordes: sin deudores no hay facturas, y un deudor que no está en el índice no rompe nada.
    const bordesOk = facturasDeDeudores([], porDeudor).length === 0
      && facturasDeDeudores(null, porDeudor).length === 0
      && facturasDeDeudores(["Empresa Que No Existe"], porDeudor).length === 0;

    // (e) No MUTA el índice del que lee: `sort` ordena en sitio, así que ordenar la lista plana no puede
    //     reordenar las facturas dentro del acordeón de cada deudor.
    const antes = nombres.map((dn) => porDeudor[dn].map((f) => f.id).join(","));
    facturasDeDeudores(nombres, porDeudor);
    const noMuta = nombres.every((dn, i) => porDeudor[dn].map((f) => f.id).join(",") === antes[i]);

    ok("98 la vista «Por factura» trae lo mismo, ordenado del folio más nuevo al más antiguo",
       todas.length > 10 && descendente && mismoSet && soloEsos && bordesOk && noMuta,
       `${todas.length} facturas de ${nombres.length} deudores · folio ${todas[0] && todas[0].folio} → ${todas[todas.length - 1] && todas[todas.length - 1].folio} · descendente ${descendente} · mismo contenido ${mismoSet} · no muta el índice ${noMuta}`);
  }

  // ── 99 · EL MIX DE FINANCIAMIENTO SE MIDE SOBRE AECSYNC Y SE INYECTA EN EL A11 ──────────────
  // La columna SOW del tubo responde «con quién se financia este cliente y cuánto de eso es nuestro».
  // **Toda cesión es factoring** —un banco que compra una factura está haciendo factoring—, así que el
  // universo que AECSync (A2) registra ES el financiamiento por cesión del cliente, y las cuatro
  // porciones lo parten por QUIÉN se lo lleva. A2 es el único activo que puede contestarlo: identifica
  // al cesionario de cada cesión. El dato se MIDE ahí y se INYECTA en Plataforma 360 (A11), que es de
  // donde la pantalla lo lee — el mismo camino que la colocación promedio y la primera operación.
  {
    const p360 = (window.PLATAFORMA360 && window.PLATAFORMA360.filas) || [];
    const ixp = {}; ((window.PLATAFORMA360 && window.PLATAFORMA360.campos) || []).forEach((c, i) => { ixp[c] = i; });
    const campos = ["SOW_SECURITY_PCT", "SOW_FACTORING_TARGET_PCT", "SOW_OTROS_FACTORING_PCT", "SOW_OTROS_BANCARIOS_PCT"];
    const aec = window.AECSYNC || [];

    // (a) LAS CUATRO PORCIONES SUMAN 100 en todas las filas que traen mix. Un mix que no suma 100 no
    //     es un mix: son cuatro cifras sueltas, y la columna deja de significar «cuánto de su
    //     financiamiento». Se mide sobre el archivo entero, no sobre una muestra.
    let conMix = 0, sinMix = 0, noSuman = 0, fueraRango = 0;
    const filasMix = [];
    for (const fila of p360) {
      const v = campos.map((c) => fila[ixp[c]]);
      if (v.some((x) => x === "" || x == null)) { sinMix++; continue; }
      conMix++; filasMix.push(fila);
      if (Math.abs(v.reduce((a, b) => a + (+b || 0), 0) - 100) > 0.11) noSuman++;   // redondeo a 1 decimal
      if (v.some((x) => +x < 0 || +x > 100)) fueraRango++;
    }
    const sumanOk = conMix > 100 && noSuman === 0 && fueraRango === 0;

    // (b) EL PADRÓN DE CESIONARIOS CLASIFICA POR RUT, y es lo que vuelve medible la partición. Antes
    //     se adivinaba por trozo de razón social: se buscaba «ita» para encontrar «Itaú» y eso ponía a
    //     **Eurocapital** entre los factoring de banco —«eurocap·ita·l»—, o sea una porción entera mal
    //     atribuida. Se comprueba contra los cesionarios que el archivo declara, no contra una lista
    //     escrita acá: uno nuevo en el activo tiene que estar en el padrón o el mix lo reparte mal.
    const delArchivo = [...new Set(aec.map((a) => a.RUTFactoring).filter(Boolean))];
    const declarados = delArchivo.filter((r) => cesionarioDe(r));
    const bancos = delArchivo.filter((r) => { const c = cesionarioDe(r); return c && c.banco && !c.nuestro; });
    const target = delArchivo.filter((r) => esFactoringTarget(r));
    const euro = (aec.find((a) => a.RazonSocialFactoring === "Eurocapital") || {}).RUTFactoring;
    const padronOk = delArchivo.length >= 8 && declarados.length === delArchivo.length
      && esFactoringTarget("Eurocapital") === false && (!euro || esFactoringTarget(euro) === false)
      // El target NO tiene por qué ser bancario —es política comercial del tenant— pero nunca puede
      // ser el NUESTRO: eso movería nuestra propia cartera al balde de la competencia.
      && target.length >= 1 && !target.some((r) => cesionarioDe(r).nuestro)
      // …y hay cesiones BANCARIAS fuera del target. Sin eso «Otros bancarios» sería una porción que
      // nunca se llena, y una porción estructuralmente vacía no prueba nada.
      && bancos.length > target.length;

    // (c) LO QUE ES NUESTRO LO DICE EL A5, sin renormalizar. Las dos entregas miden la MISMA cifra
    //     —cuánto del financiamiento por cesión del cliente se lleva Security— y ponerlas a discrepar
    //     dejaría dos valores del mismo número en dos pantallas. El A5 es el que ya alimenta el
    //     descuento por SOW del pricing y el churn, así que manda él y el mix se ancla.
    const sowA5 = {};
    for (const s of (window.SHARE_OF_WALLET || [])) if (s && s.RUTCliente) sowA5[s.RUTCliente] = +s.SOWActualPct || 0;
    let anclados = 0, desanclados = 0;
    for (const fila of filasMix) {
      const rut = fila[ixp.RUT];
      if (!(rut in sowA5)) continue;
      anclados++;
      if (Math.abs(+fila[ixp.SOW_SECURITY_PCT] - sowA5[rut]) > 0.11) desanclados++;
    }
    const ancladoOk = anclados > 100 && desanclados === 0;

    // (d) EL RESTO SE REPARTE CON LA PROPORCIÓN QUE MIDE EL A2 — que es la mitad de la respuesta que
    //     ningún otro activo tiene. Se recalcula acá desde las cesiones, cesionario por cesionario, y
    //     tiene que dar lo mismo que el archivo: si no, el mix se está generando en vez de medirse.
    const porCedente = {};
    for (const a of aec) {
      if (!a || !a.RUTEmisor) continue;
      const c = cesionarioDe(a.RUTFactoring);
      if (c && c.nuestro) continue;                       // el resto es lo AJENO
      const g = porCedente[a.RUTEmisor] || (porCedente[a.RUTEmisor] = { tgt: 0, banc: 0, otro: 0, tot: 0 });
      const m = +a.MontoCesion || 0;
      if (c && c.banco && c.target) g.tgt += m; else if (c && c.banco) g.banc += m; else g.otro += m;
      g.tot += m;
    }
    let repartidos = 0, repartoMal = 0, conBancaria = 0;
    for (const fila of filasMix) {
      const g = porCedente[fila[ixp.RUT]];
      const resto = 100 - +fila[ixp.SOW_SECURITY_PCT];
      if (+fila[ixp.SOW_OTROS_BANCARIOS_PCT] > 0) conBancaria++;
      if (!g || !(g.tot > 0) || resto <= 0.2) continue;
      repartidos++;
      const esperado = [g.tgt, g.otro, g.banc].map((x) => x / g.tot * resto);
      const real = [+fila[ixp.SOW_FACTORING_TARGET_PCT], +fila[ixp.SOW_OTROS_FACTORING_PCT], +fila[ixp.SOW_OTROS_BANCARIOS_PCT]];
      if (real.some((x, i) => Math.abs(x - esperado[i]) > 0.25)) repartoMal++;
    }
    const repartoOk = repartidos > 100 && repartoMal === 0 && conBancaria > 20;

    // (e-bis) EL DETALLE POR CESIONARIO — lo que el tooltip del chip muestra. «Otros bancarios · 22%»
    //     no sirve para llamar a nadie; «Banco Santander 14% · Scotiabank 8%» sí. Lo que se fija es
    //     que sea el DETALLE de esa cifra: cada porción tiene que ser exactamente la suma de los
    //     suyos, o el tooltip diría 21,9 donde el chip dice 22. Por eso el generador reparte el 100
    //     una sola vez, cesionario por cesionario, y agrega las porciones desde ahí.
    let conDetalle = 0, detNoSuma = 0, detNoCuadra = 0, detSinNombre = 0;
    for (const fila of filasMix) {
      const m = mixSowDe(fila[ixp.RUT]);
      if (!m) continue;
      conDetalle++;
      const todos = m.flatMap((x) => x.detalle || []);
      if (Math.abs(todos.reduce((a, b) => a + b.pct, 0) - 100) > 0.11) detNoSuma++;
      // cada porción = suma de su detalle (las que están en 0 no traen detalle, y eso es correcto)
      if (m.some((x) => Math.abs((x.detalle || []).reduce((a, b) => a + b.pct, 0) - x.pct) > 0.051)) detNoCuadra++;
      // …y cada fila del tooltip nombra a alguien, que es para lo que existe
      if (todos.some((d) => !d.nombre || !(d.pct > 0))) detSinNombre++;
    }
    const detalleOk = conDetalle > 100 && detNoSuma === 0 && detNoCuadra === 0 && detSinNombre === 0;

    // (e) UN DEUDOR NO TIENE MIX, y eso se devuelve como `null`, no como cuatro ceros. La pregunta no
    //     le aplica: un deudor no cede facturas. Cuatro ceros se leerían como «no opera con nadie»,
    //     que es una afirmación, y el archivo no la hace.
    const unDeudor = p360.find((f) => f[ixp.ROL] !== "CLIENTE" && campos.every((c) => f[ixp[c]] === "" || f[ixp[c]] == null));
    const mixCliente = mixSowDe(filasMix[0][ixp.RUT]);
    const nullOk = (!unDeudor || mixSowDe(unDeudor[ixp.RUT]) === null)
      && mixSowDe("99999999-9") === null && mixSowDe("") === null && mixSowDe(null) === null
      && Array.isArray(mixCliente) && mixCliente.length === 4;

    // (f) ORDEN DESCENDENTE y la NUESTRA marcada. La columna contesta «quién se lleva más»; con el
    //     orden fijo por nombre había que comparar cuatro cifras para contestarla.
    const ordenOk = filasMix.slice(0, 60).every((fila) => {
      const m = mixSowDe(fila[ixp.RUT]);
      if (!m || m.length !== 4) return false;
      const nuestras = m.filter((x) => x.nuestro);
      return m.every((x, i) => i === 0 || m[i - 1].pct >= x.pct)
        && nuestras.length === 1 && nuestras[0].label === "Security"
        && Math.abs(m.reduce((a, b) => a + b.pct, 0) - 100) <= 0.11;
    });

    // (g) QUÉ SE DIBUJA. Una porción en CERO no se dibuja —no es parte del mix y empuja hacia abajo a
    //     las que sí—, pero la NUESTRA se muestra siempre: «no nos cede nada» es justamente lo que el
    //     ejecutivo vino a leer acá. La regla vive en `mixSowVisible` y no dentro del JSX de la celda,
    //     porque una regla escrita dentro de un `map` no se puede probar.
    const caso = [
      { label: "Otros factoring", pct: 60, nuestro: false },
      { label: "Security", pct: 0, nuestro: true },
      { label: "Factoring target", pct: 40, nuestro: false },
      { label: "Otros bancarios", pct: 0, nuestro: false },
    ];
    const vis = mixSowVisible(caso);
    const visibleOk = vis.length === 3 && vis.some((x) => x.nuestro && x.pct === 0)
      && !vis.some((x) => x.pct === 0 && !x.nuestro) && mixSowVisible(null).length === 0;

    // (h) LA MEMOIZACIÓN NO ENVENENA: dos operaciones de clientes distintos no comparten mix, y una
    //     cuyo cliente no está en el archivo devuelve `null` las dos veces —la clave se consulta con
    //     `has`, así que un `null` legítimo queda cacheado y no se recalcula—.
    const rutA = filasMix[0][ixp.RUT], rutB = filasMix[1][ixp.RUT];
    const mA = mixSowDeal({ rutEmisor: rutA }), mB = mixSowDeal({ rutEmisor: rutB });
    const memoOk = mA && mB && mixSowDeal({ rutEmisor: rutA }) === mA
      && JSON.stringify(mA) !== JSON.stringify(mB)
      && mixSowDeal({ rutEmisor: "99999999-9" }) === null
      && mixSowDeal({ rutEmisor: "99999999-9" }) === null;

    ok("99 el mix de financiamiento se mide sobre AECSync, se ancla al A5 y se inyecta en el A11",
       sumanOk && padronOk && ancladoOk && repartoOk && detalleOk && nullOk && ordenOk && visibleOk && memoOk,
       `${conMix} empresas con mix / ${sinMix} sin mix · no suman 100: ${noSuman} · padrón: ${declarados.length}/${delArchivo.length} cesionarios declarados, ${bancos.length} bancarios (${target.length} target), Eurocapital NO es banco ${!esFactoringTarget("Eurocapital")} · anclados al A5 ${anclados - desanclados}/${anclados} · reparto medido en A2 ${repartidos - repartoMal}/${repartidos}, ${conBancaria} con porción bancaria · detalle por cesionario ${conDetalle - detNoCuadra}/${conDetalle} cuadra con su chip · deudor sin mix ${nullOk} · orden y marca ${ordenOk} · 0% salvo la nuestra ${visibleOk} · memo ${memoOk}`);
  }

  // ── 100 · «CON LÍNEA» EN EL TUBO ES UNA COTA, NO UNA ASIGNACIÓN ──────────────────────────────
  // La columna «Oportunidad» parte los deudores en Prime con línea / Otros con línea / sin línea. El
  // tubo dibuja ~100 filas y correr el motor por fila costaría 100 asignaciones completas, así que se
  // resuelve con un LOOKUP sobre el listado de líneas (A23). Lo que este caso fija es el precio de esa
  // decisión, que es lo único que la hace defendible: **el atajo nunca puede decir que NO a un deudor
  // al que el motor sí le asigna**. Al revés sí —dice que sí de más— y por eso es una cota.
  {
    const rutCli = "76.500.100-1";
    const LD = { "11.111.111-1": { disponible: 999e6 }, "22.222.222-2": { disponible: 999e6 },
                 "33.333.333-3": { disponible: 999e6 }, "44.444.444-4": { disponible: 1e6 } };
    const inyecta = { lineaDeudor: (r) => LD[r] || null };
    const est = (lineas) => ({ estado: "B", asignadaCliente: 0, usoCliente: 0, cola: [], lineas });
    const D = (rut, prime, montos) => ({ nombre: "D" + rut.slice(0, 2), rut, prime,
      n: montos.length, monto: montos.reduce((a, b) => a + b, 0), montos });

    // (a) EL CRITERIO ES POR FACTURA, no «¿le queda algo de cupo?». Medido sobre la cartera real, el
    //     segundo no descarta a NADIE —0 de 7.100 deudores— porque a un pozo comodín siempre le sobra
    //     algún peso, y un chip que siempre marca cero no contesta nada. Con 30 de cupo y facturas de
    //     50 y 20, el deudor tiene línea (le cabe una) y su monto es 20, no 70.
    const unaLinea = [{ id: "L1", tipo: "LF2", granularidad: "par", rutDeudor: "11.111.111-1", aprobado: 30e6, vigente: 0 }];
    const c1 = capacidadDeudores([D("11.111.111-1", true, [50e6, 20e6])], rutCli, { estadoCliente: est(unaLinea), ...inyecta });
    const porFacturaOk = c1.primeConLinea.n === 1 && c1.primeConLinea.monto === 20e6 && c1.sinLinea.n === 0;
    // …y si NINGUNA cabe, el deudor queda sin línea con TODO su monto: es la plata trabada, que es la
    // acción que ese chip tiene que provocar (pedir línea al comité).
    const c2 = capacidadDeudores([D("11.111.111-1", true, [50e6, 40e6])], rutCli, { estadoCliente: est(unaLinea), ...inyecta });
    const trabadoOk = c2.sinLinea.n === 1 && c2.sinLinea.monto === 90e6 && c2.primeConLinea.n === 0;

    // (b) EL POZO COMODÍN ES UNO SOLO y LF1 es sólo para Prime. Un deudor sin línea de par se financia
    //     con el comodín del cliente; si el único comodín es una LF1, el no-Prime no la alcanza.
    const soloLF1 = [{ id: "LF1", tipo: "LF1", granularidad: "comodin", rutDeudor: null, aprobado: 60e6, vigente: 0, soloPrime: true }];
    const c3 = capacidadDeudores([D("11.111.111-1", true, [50e6]), D("22.222.222-2", false, [50e6])], rutCli,
                                 { estadoCliente: est(soloLF1), ...inyecta });
    const lf1Ok = c3.primeConLinea.n === 1 && c3.otrosConLinea.n === 0 && c3.sinLinea.n === 1;

    // (c) EL NIVEL DEL DEUDOR TAMBIÉN MANDA, y es global: con cupo de sobra en el cliente pero 1 de
    //     línea propia del deudor, no cabe nada. Y un deudor que el índice no conoce falla CERRADO.
    const ancho = [{ id: "LF4", tipo: "LF4", granularidad: "comodin", rutDeudor: null, aprobado: 900e6, vigente: 0 }];
    const c4 = capacidadDeudores([D("44.444.444-4", true, [50e6]), D("99.999.999-9", true, [50e6])], rutCli,
                                 { estadoCliente: est(ancho), ...inyecta });
    const nivel3Ok = c4.sinLinea.n === 2 && c4.primeConLinea.n === 0;

    // (d) «SIN LÍNEA» NO DISTINGUE PRIME, a pedido: sin cupo, la clasificación del deudor no cambia
    //     nada de lo que se puede comprar hoy. Los dos caen en la misma fila.
    const nada = [{ id: "LF4", tipo: "LF4", granularidad: "comodin", rutDeudor: null, aprobado: 1e6, vigente: 0 }];
    const c5 = capacidadDeudores([D("11.111.111-1", true, [50e6]), D("22.222.222-2", false, [50e6])], rutCli,
                                 { estadoCliente: est(nada), ...inyecta });
    const sinDistinguirOk = c5.sinLinea.n === 2 && c5.primeConLinea.n === 0 && c5.otrosConLinea.n === 0;

    // (e) LA COTA. Contra carteras reales del libro de ventas: todo deudor al que el MOTOR le asigna
    //     al menos una factura tiene que estar entre los que el atajo declara «con línea». Esta es la
    //     propiedad que justifica el atajo; si se rompe, la columna contradice al detalle.
    //     La holgura se informa porque es el costo de la decisión: el atajo no puede prometer que el
    //     monto se gire —la asignación es factura a factura contra tres niveles a la vez, el pozo es
    //     compartido y la línea del deudor la comparten todos los clientes—.
    const libro = (typeof libroPorEmisor === "function") ? libroPorEmisor() : new Map();
    let clientes = 0, violaciones = 0, dMotor = 0, dAtajo = 0;
    for (const rutC of [...libro.keys()].slice(0, 60)) {
      const facturas = (libro.get(rutC) || []).slice(0, 40);
      if (facturas.length < 3) continue;
      const an = analisisDeudores(facturas);
      if (!an || !an.lista) continue;
      const conLinea = new Set();
      for (const d of an.lista) if (capacidadDeudores([d], rutC).sinLinea.n === 0) conLinea.add(d.nombre);
      const delMotor = new Set();
      for (const f of (asignarLineas(facturas, rutC).facturas || [])) if (f.estado === "CON_LINEA") delMotor.add(f.deudor);
      clientes++; dMotor += delMotor.size; dAtajo += conLinea.size;
      if ([...delMotor].some((n) => !conLinea.has(n))) violaciones++;
    }
    const cotaOk = clientes > 20 && violaciones === 0 && dAtajo >= dMotor;

    // (f) NO CORRE EL MOTOR. La prueba es estructural: con el estado inyectado decide sin consultar
    //     nada del navegador, que es lo que permite pintarlo en 100 filas. Un deudor sin facturas
    //     itemizadas usa el promedio, porque es lo único que hay.
    const c6 = capacidadDeudores([{ nombre: "X", rut: "11.111.111-1", prime: true, n: 2, monto: 40e6 }], rutCli,
                                 { estadoCliente: est(unaLinea), ...inyecta });
    const promedioOk = c6.primeConLinea.n === 1 && c6.primeConLinea.monto === 20e6;
    const bordesOk = capacidadDeudores([], rutCli, inyecta).sinLinea.n === 0
      && capacidadDeudores(null, rutCli, inyecta).sinLinea.n === 0
      && capacidadDeudores([D("11.111.111-1", true, [1e6])], "", inyecta).sinLinea.n === 0;

    ok("100 «con línea» en el tubo es un lookup sobre el listado y una COTA de lo que el motor asigna",
       porFacturaOk && trabadoOk && lf1Ok && nivel3Ok && sinDistinguirOk && cotaOk && promedioOk && bordesOk,
       `por factura ${porFacturaOk} (30 de cupo, facturas 50 y 20 → cabe 1 por 20) · trabado ${trabadoOk} · LF1 sólo Prime ${lf1Ok} · nivel deudor y desconocido cerrado ${nivel3Ok} · «sin línea» no distingue Prime ${sinDistinguirOk} · COTA: ${clientes} clientes, ${violaciones} violaciones, ${dAtajo} deudores declarados vs ${dMotor} que el motor asigna (sobreestima ${dMotor ? (dAtajo / dMotor).toFixed(1) : "-"}×) · promedio ${promedioOk} · bordes ${bordesOk}`);
  }

  // ── 101 · A5 SE DERIVA DE A2: LA MISMA CIFRA CONTADA UNA SOLA VEZ ────────────────────────────
  // «Tienes que hacer que A5 y A2 sean iguales; primero genera A2 y luego genera A5 con los
  // resultados de A2.» Los dos activos respondían la MISMA pregunta —cuánto de lo que cede el cliente
  // se lo lleva Security— por caminos independientes, y discrepaban **13,8 pto en la mediana y 61,8
  // en el p90**: A5 decía 97,7% donde A2 medía 5,1%. Sobre una cifra que decide el descuento por SOW
  // del pricing, el segmento de churn y los KPI del dashboard. Ahora A2 es el registro y A5 se MIDE
  // sobre él. Lo que este caso impide es que vuelvan a separarse.
  {
    const BICE = "97.080.000-0";
    const aec = window.AECSYNC || [];
    const sow = window.SHARE_OF_WALLET || [];
    const DIA = 86400000;
    const lunesDe = (f) => { const d = new Date(String(f).slice(0, 10) + "T00:00:00Z");
      return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DIA).toISOString().slice(0, 10); };

    // (a) LA PARTICIPACIÓN DE A5 ES LA QUE MIDE A2, cliente por cliente. Se recalcula acá desde las
    //     cesiones —sin mirar el A5— y tiene que dar lo mismo. La tolerancia es 0,06: los porcentajes
    //     se publican con un decimal, así que 0,05 es redondeo y cualquier cosa mayor es desacuerdo.
    const g = {};
    for (const c of aec) {
      const k = c && c.RUTEmisor; if (!k) continue;
      const x = g[k] || (g[k] = { mio: 0, tot: 0, sem: {} });
      const m = Math.round(+c.MontoCesion || 0);
      x.tot += m; if (c.RUTFactoring === BICE) x.mio += m;
      const w = lunesDe(c.FechaCesion);
      const ws = x.sem[w] || (x.sem[w] = { mio: 0, tot: 0, n: 0 });
      ws.tot += m; ws.n++; if (c.RUTFactoring === BICE) ws.mio += m;
    }
    let cotejados = 0, discrepan = 0, peor = 0;
    for (const s of sow) {
      const x = g[s.RUTCliente]; if (!x || !(x.tot > 0)) continue;
      cotejados++;
      const d = Math.abs(x.mio / x.tot * 100 - (+s.SOWActualPct || 0));
      if (d > peor) peor = d;
      if (d > 0.06) discrepan++;
    }
    const igualOk = cotejados > 200 && discrepan === 0;

    // (b) Y LA SERIE SEMANAL TAMBIÉN, monto a monto: `MontoBICE`, `MontoTotal` y `NumCesiones` de cada
    //     semana son la suma de las cesiones de esa semana. Si sólo cuadrara el total, A5 podría estar
    //     repartiendo mal en el tiempo y la tendencia —que es lo que decide el descuento— saldría de
    //     una trayectoria inventada.
    let semanas = 0, semanasMal = 0;
    for (const s of sow) {
      const x = g[s.RUTCliente]; if (!x) continue;
      for (const w of (s.HistoricoSemanal || [])) {
        semanas++;
        const real = x.sem[w.Semana] || { mio: 0, tot: 0, n: 0 };
        if (w.MontoBICE !== real.mio || w.MontoTotal !== real.tot || w.NumCesiones !== real.n) semanasMal++;
      }
    }
    const serieOk = semanas > 1000 && semanasMal === 0;

    // (c) EL EJE DE SEMANAS ES COMÚN. Una semana sin cesiones de ESTE cliente igual existe y vale 0:
    //     «no cedió nada» es un dato. Con series de distinto largo, dos clientes en el mismo gráfico
    //     no se pueden comparar, y `slice(-8)` tomaría tramos distintos de cada uno.
    const ejes = new Set(sow.map((s) => (s.HistoricoSemanal || []).map((w) => w.Semana).join(",")));
    const ejeOk = ejes.size === 1 && sow[0].HistoricoSemanal.length >= 6;

    // (d) LA SERIE NO SE INVENTA HACIA ATRÁS: ninguna semana es anterior a la primera cesión que el
    //     registro contiene. Era el defecto de fondo —A5 declaraba 9.104 cesiones y A2 tenía 1.300—,
    //     así que la mitad de la serie describía operaciones que no existían.
    const primera = aec.map((c) => lunesDe(c.FechaCesion)).sort()[0];
    const sinFuturo = sow.every((s) => (s.HistoricoSemanal || []).every((w) => w.Semana >= primera));

    // (e) EL TARGET SIGUE SIENDO DE A5 y no se mide: es una META COMERCIAL, no una observación. Si se
    //     derivara de las cesiones, el objetivo sería siempre igual al resultado y el gap nunca
    //     existiría — que es lo único que esa cifra sirve para decir.
    const conTarget = sow.filter((s) => +s.SOWTargetPct > 0).length;
    const gapVivo = sow.filter((s) => Math.abs((+s.SOWTargetPct || 0) - (+s.SOWActualPct || 0)) > 1).length;
    const targetOk = conTarget > 200 && gapVivo > 50;

    // (f) LOS INVARIANTES DEL REGISTRO SOBREVIVEN a haberlo hecho seis veces más grande: ninguna
    //     cesión antes de su emisión, ninguna por más que el documento, ningún folio cedido dos veces.
    let antes = 0, deMas = 0, dobles = 0; const vistos = new Set();
    for (const c of aec) {
      if (String(c.FechaCesion).slice(0, 10) < c.FechaEmisionDTE) antes++;
      if ((+c.MontoCesion || 0) > (+c.MontoDocumento || 0)) deMas++;
      const k = c.RUTCedente + "|" + c.Folio;
      if (vistos.has(k)) dobles++; vistos.add(k);
    }
    const invOk = aec.length > 5000 && antes === 0 && deMas === 0 && dobles === 0;

    ok("101 A5 se deriva de A2: la participación, la serie semanal y sus montos son los del registro",
       igualOk && serieOk && ejeOk && sinFuturo && targetOk && invOk,
       `${aec.length} cesiones · participación: ${cotejados - discrepan}/${cotejados} calzan (peor desvío ${peor.toFixed(3)} pto, antes 92,6) · serie: ${semanas - semanasMal}/${semanas} semanas cuadran monto a monto · eje común de ${sow[0].HistoricoSemanal.length} semanas ${ejeOk} · sin semanas previas al registro ${sinFuturo} · target sigue siendo meta (${gapVivo} con gap vivo) · invariantes ${invOk}`);
  }

  // ── 102 · LA LÍNEA APROBADA MÍNIMA, Y LA PUNTUAL EXENTA ──────────────────────────────────────
  // «Deja un monto de línea aprobada mínima de 10 millones excepto para la línea puntual que podría
  // ser menos.» Una línea bajo el mínimo no financia ninguna factura del cliente: existe en la ficha
  // y sólo produce rechazos. Medido antes de aplicarlo: 372 de 3.521 líneas quedaban por debajo, y la
  // peor era una LF4 de **$21.459**. La PUNTUAL queda exenta porque es un cupo a medida de UNA
  // operación — su tamaño lo fija esa operación, no la política.
  {
    const MIN = pol("lineaMinima", 10e6);
    const ruts = [...new Set((typeof LINEAS_DATA !== "undefined" ? LINEAS_DATA : []).map((l) => l.rut))].slice(0, 220);

    // (a) NINGUNA LF1/LF2/LF4 BAJO EL MÍNIMO, y la LF3 sí puede estarlo. Se mide sobre la cartera
    //     entera, no sobre una muestra: el defecto era de cola —el 10% más chico—.
    let bajo = 0, lf3Bajo = 0, nLineas = 0, nLF3 = 0, acotadas = 0;
    let excede = 0, clientes = 0, sinComodin = 0, usoNoCabe = 0;
    const aprobadaDe = {};
    for (const l of (typeof LINEAS_DATA !== "undefined" ? LINEAS_DATA : [])) aprobadaDe[l.rut] = l.aprobada;
    for (const rut of ruts) {
      const st = lineasDeCliente(rut);
      if (!st || st.estado !== "B") continue;
      clientes++;
      let suma = 0, usado = 0, hayComodin = false;
      for (const ln of st.lineas) {
        nLineas++; suma += ln.aprobado || 0; usado += ln.vigente || 0;
        if (ln.granularidad === "comodin") hayComodin = true;
        if (ln.tipo === "LF3") { nLF3++; if ((ln.aprobado || 0) < MIN) lf3Bajo++; continue; }
        // El piso rige para todo cliente que PUEDA pagarlo. Uno cuyo aprobado total ya está bajo el
        // mínimo —porque casi todas sus líneas están suspendidas— no puede tener una línea de 10MM
        // sin que le inventemos cupo, así que su única línea vale lo que le queda y se cuenta aparte.
        if ((aprobadaDe[rut] || 0) >= MIN) { if ((ln.aprobado || 0) < MIN) bajo++; }
        else acotadas++;
      }
      if (!hayComodin) sinComodin++;
      if (suma > (aprobadaDe[rut] || 0) + 1) excede++;
      if (usado > suma + 1) usoNoCabe++;
    }
    const pisoOk = clientes > 150 && nLineas > 2000 && bajo === 0;
    // …y la exención tiene que estar EJERCITADA: si ninguna LF3 estuviera bajo el mínimo, la excepción
    // se cumpliría sin que nada la probara — el mismo error que la cota «o menor» de las cesiones.
    const exentaOk = nLF3 > 50 && lf3Bajo > 0;

    // (b) EL TOPE DEL CLIENTE MANDA SOBRE EL PISO. Es la invariante que el piso podía romper: con un
    //     mínimo por línea, un cliente con poco presupuesto recibiría más cupo del que el comité le
    //     aprobó — inventar capacidad por una regla de tamaño. Y nadie puede quedarse sin comodín:
    //     es lo que financia a los deudores que el piso dejó sin línea propia.
    const topeOk = excede === 0 && sinComodin === 0 && usoNoCabe === 0;

    // (c) EL PISO NO CREA CAPACIDAD: acotado por el presupuesto. Se prueba en la función de reparto,
    //     que es donde vive la decisión. Con 25 de total y piso 10 caben DOS partes, no cuatro: el
    //     piso limita CUÁNTAS líneas hay, no cuánto recibe cada una — es la consecuencia que hace que
    //     algunos deudores pasen al comodín.
    const r1 = repartirConPiso(100e6, [1, 1, 1, 1], 10e6, 5e6);
    const r2 = repartirConPiso(25e6, [4, 3, 2, 1], 10e6, 5e6);
    const r3 = repartirConPiso(8e6, [1, 1, 1], 10e6, 5e6);
    const r4 = repartirConPiso(37e6, [2, 1], 0, 5e6);            // piso 0 = el caso de la LF3
    const suma = (a) => a.reduce((x, y) => x + y, 0);
    const repartoOk =
      suma(r1) === 100e6 && r1.every((x) => x >= 10e6)
      && suma(r2) === 25e6 && r2.filter((x) => x > 0).length === 2 && r2.every((x) => x === 0 || x >= 10e6)
      && suma(r3) === 0                                          // no cabe ninguna: nada se asigna
      && suma(r4) === 37e6 && r4.every((x) => x > 0)             // sin piso entran todas
      // …y se queda con las de MAYOR peso: si alguien pierde su línea propia, que sea el que menos aporta
      && r2[0] > 0 && r2[1] > 0 && r2[2] === 0 && r2[3] === 0;

    // (d) LA LÍNEA DEL DEUDOR también respeta el piso: es una línea aprobada como cualquier otra, y
    //     una bajo el mínimo bloquea al deudor entero en el nivel 3 de la regla de validación.
    const deu = [...lineasDeudor().values()];
    const deudorOk = deu.length > 400 && deu.every((d) => (d.aprobado || 0) >= MIN);

    // (e) EL CACHE NO SE QUEDA CON EL DIMENSIONAMIENTO ANTERIOR. Es la trampa de la regla 9-bis:
    //     `lineasDeCliente` memoiza por RUT y `lineasDeudor` no tenía invalidación ninguna, así que
    //     mover el umbral en el mantenedor dejaba servidas las líneas viejas. Se valida por FIRMA.
    const rutP = ruts.find((r) => lineasDeCliente(r).estado === "B");
    const antes = lineasDeCliente(rutP).lineas.length;
    const antesDeu = lineaDeDeudor([...lineasDeudor().keys()][0]).aprobado;
    const cfgPrev = CFG_ACTIVA.lineaMinima;
    CFG_ACTIVA.lineaMinima = 60e6;                               // sube el piso: tienen que caber MENOS líneas
    const despues = lineasDeCliente(rutP).lineas.length;
    const despuesDeu = lineaDeDeudor([...lineasDeudor().keys()][0]).aprobado;
    CFG_ACTIVA.lineaMinima = cfgPrev;
    const vuelta = lineasDeCliente(rutP).lineas.length;
    const cacheOk = despues < antes && despuesDeu >= 60e6 && despuesDeu !== antesDeu && vuelta === antes;

    ok("102 ninguna línea aprobada bajo el mínimo, salvo la PUNTUAL, y el tope del cliente manda",
       pisoOk && exentaOk && topeOk && repartoOk && deudorOk && cacheOk,
       `${clientes} clientes · ${nLineas} líneas · bajo el mínimo: ${bajo} (antes 372 de 3.521) · acotadas por su propio aprobado: ${acotadas} · LF3 exentas bajo el mínimo: ${lf3Bajo} de ${nLF3} (ejercitada ${exentaOk}) · exceden su aprobada: ${excede} · sin comodín: ${sinComodin} · uso que no cabe: ${usoNoCabe} · línea de deudor ≥ mínimo ${deudorOk} · reparto con piso ${repartoOk} · cache por firma ${cacheOk} (${antes}→${despues}→${vuelta} líneas al mover el umbral)`);
  }

  // ── 103 · «FACTORING TARGET» ES POLÍTICA DEL TENANT, NO UN ATRIBUTO DEL CESIONARIO ──────────
  // BCI es BCI para todos; a quién se mira de frente lo decide cada factoring. Así que la partición
  // en cuatro porciones no puede venir resuelta del archivo: el A2 MIDE cesionario por cesionario, el
  // A11 publica ese detalle, y quién cae en el balde «target» se resuelve al leer, con lo que el
  // tenant configuró. Se prueba INYECTANDO una configuración que contradice al default —igual que el
  // caso 90 con el mantenedor de otorgamiento—, que es la única forma de distinguir «lee la
  // configuración» de «coincide con el default».
  {
    const guardar = FACTORING_TARGET.slice();
    const ixp = {}; ((window.PLATAFORMA360 && window.PLATAFORMA360.campos) || []).forEach((c, i) => { ixp[c] = i; });
    const filas = ((window.PLATAFORMA360 && window.PLATAFORMA360.filas) || [])
      .filter((f) => f[ixp.SOW_SECURITY_PCT] !== "" && f[ixp.SOW_SECURITY_PCT] != null);
    const RUT_BCI = "96.510.870-6", RUT_SAN = "97.036.000-K", RUT_ITAU = "76.645.030-K", RUT_TANNER = "96.684.990-8";
    const pct = (m, q) => { const x = (m || []).find((y) => y.porcion === q); return x ? x.pct : null; };
    const lbl = (m) => { const x = (m || []).find((y) => y.porcion === "factoringTarget"); return x ? x.label : null; };
    const suma100 = (m) => Math.abs((m || []).reduce((a, b) => a + b.pct, 0) - 100) <= 0.11;

    // (a) EL DEFAULT es BCI + Santander, y el RÓTULO se arma con ellos. Un rótulo escrito a mano
    //     nombra a quien quiera: la glosa del churn decía «BCI · Banco de Chile · Itaú» mientras la
    //     clasificación decía otra cosa, o sea acusaba a tres que no habían participado.
    guardarFactoringTarget(TARGET_DEFAULT.slice());
    const etiquetaOk = targetEtiqueta() === "BCI - Santander"
      && esFactoringTarget(RUT_BCI) && esFactoringTarget(RUT_SAN) && !esFactoringTarget(RUT_ITAU)
      && porcionCesionario(RUT_ITAU) === "otrosBancarios" && porcionCesionario(RUT_TANNER) === "otrosFactoring"
      && porcionCesionario(BICE_RUT) === "security";

    // Un cliente con cesiones a BCI o Santander Y a Itaú: es el único que puede mostrar que la
    // porción se MUEVE de un balde al otro. Sin ese cliente el caso pasaría sin probar nada.
    const cand = filas.find((f) => {
      let d = []; try { d = JSON.parse(f[ixp.SOW_DETALLE_JSON] || "[]"); } catch (e) {}
      return d.some((x) => x.rut === RUT_BCI || x.rut === RUT_SAN) && d.some((x) => x.rut === RUT_ITAU);
    });
    const rut = cand ? cand[ixp.RUT] : null;
    const antes = rut ? mixSowDe(rut) : null;

    // (b) MOVER LA PERILLA MUEVE LA PORCIÓN. Con Itaú como único target, lo suyo pasa a «target» y
    //     BCI/Santander caen en «otros bancarios». Y el rótulo lo dice: «Itaú».
    guardarFactoringTarget([RUT_ITAU]);
    const conItau = rut ? mixSowDe(rut) : null;
    const moverOk = !!antes && !!conItau && lbl(antes) === "BCI - Santander" && lbl(conItau) === "Itaú"
      && pct(conItau, "factoringTarget") !== pct(antes, "factoringTarget")
      && pct(conItau, "otrosBancarios") !== pct(antes, "otrosBancarios")
      && suma100(antes) && suma100(conItau)
      // …y la MEDICIÓN no se movió: lo nuestro y el total ajeno son los mismos. Configurar la
      // partición no puede cambiar cuánto cede el cliente ni a quién — sólo cómo se agrupa.
      && pct(conItau, "security") === pct(antes, "security")
      && Math.abs((100 - pct(conItau, "security")) - (100 - pct(antes, "security"))) < 1e-9;

    // (c) EL CACHE SE INVALIDA SOLO. `mixSowDeal` memoiza por cliente —el tubo dibuja ~100 filas— así
    //     que sin tirarlo la pantalla seguiría mostrando la partición anterior y el mantenedor se
    //     vería decorativo: la misma trampa de `lineasDeCliente` con `otrosDeudoresPct`.
    const cacheA = rut ? mixSowDeal({ rutEmisor: rut }) : null;
    guardarFactoringTarget([RUT_TANNER]);
    const cacheB = rut ? mixSowDeal({ rutEmisor: rut }) : null;
    // (d) UN TARGET NO BANCARIO sigue partiendo bien: `target` se evalúa ANTES que `banco`, así que
    //     ninguna porción queda con dos dueños y la partición sigue siendo exhaustiva y disjunta.
    const cacheOk = !!cacheA && !!cacheB && lbl(cacheA) === "Itaú" && lbl(cacheB) === "Tanner"
      && porcionCesionario(RUT_TANNER) === "factoringTarget" && porcionCesionario(RUT_ITAU) === "otrosBancarios"
      && suma100(cacheB);

    // (e) HIGIENE: sólo entran RUT que el padrón declara, nunca el NUESTRO —eso movería nuestra
    //     propia cartera al balde de la competencia— y sin repetidos. Y un desconocido falla CERRADO.
    const higiene = guardarFactoringTarget([RUT_BCI, BICE_RUT, "99.999.999-9", RUT_BCI, "bci factoring"]);
    const higieneOk = higiene.length === 1 && higiene[0] === RUT_BCI
      && !esFactoringTarget(BICE_RUT) && !esFactoringTarget("99.999.999-9") && !esFactoringTarget("Factoring Inexistente")
      && targetEtiqueta() === "BCI";

    // (f) SIN NADIE en el target la porción queda en 0 y NO se dibuja (la nuestra sí, siempre), y las
    //     otras tres siguen sumando 100: el volumen no se pierde, se reparte entre los demás baldes.
    guardarFactoringTarget([]);
    const vacio = rut ? mixSowDe(rut) : null;
    const vacioOk = !!vacio && pct(vacio, "factoringTarget") === 0 && suma100(vacio)
      && !mixSowVisible(vacio).some((x) => x.porcion === "factoringTarget")
      && mixSowVisible(vacio).some((x) => x.nuestro) && targetEtiqueta() === "Factoring target";

    // (g) CON MÁS DE DOS el rótulo no puede crecer sin fin: nombra a los dos primeros y cuenta el
    //     resto. El detalle completo vive en el tooltip, que lista a cada cesionario con su %.
    guardarFactoringTarget([RUT_BCI, RUT_SAN, RUT_ITAU, RUT_TANNER]);
    const largoOk = targetEtiqueta() === "BCI - Santander +2" && targetNombres().split(" · ").length === 4;

    guardarFactoringTarget(guardar);                        // se restituye la configuración del tenant
    const restituidoOk = targetEtiqueta() === "BCI - Santander" && (!rut || lbl(mixSowDeal({ rutEmisor: rut })) === "BCI - Santander");

    ok("103 el factoring target es configuración del tenant: mueve la partición, no la medición",
       etiquetaOk && moverOk && cacheOk && higieneOk && vacioOk && largoOk && restituidoOk && !!rut,
       `default «${targetEtiqueta()}» · cliente de prueba ${rut || "NO ENCONTRADO"} · target ${antes ? pct(antes, "factoringTarget") : "—"}% → ${conItau ? pct(conItau, "factoringTarget") : "—"}% al cambiar la perilla, bancarios ${antes ? pct(antes, "otrosBancarios") : "—"}% → ${conItau ? pct(conItau, "otrosBancarios") : "—"}%, lo nuestro intacto ${antes ? pct(antes, "security") : "—"}% · cache invalidado ${cacheOk} · higiene ${higieneOk} · sin target ${vacioOk} · rótulo largo ${largoOk} · restituido ${restituidoOk}`);
  }

  // ── 104 · LA CAT ES DEL PAQUETE QUE SE COMPRA, Y CON LA OFERTA VACÍA NO HAY CAT ────────────────
  // Lo planteó el usuario mirando una oportunidad recién detectada: «si aún no se ha simulado, ¿no se
  // debería poder determinar si es CAT-1, CAT-2 u otra?». La CAT **no depende de simular** —es
  // aritmética sobre notas y montos, sin motor— pero sí de que haya facturas elegidas. Con la oferta
  // vacía lo único clasificable son los deudores que el inbound DETECTÓ, y eso es otra cosa: hay que
  // poder distinguirlas, porque no son el mismo número (en pantalla, CAT-1 lo disponible contra CAT-3
  // lo que finalmente entró a la oferta).
  {
    const f = (monto, deudor, rut) => ({ monto, deudor, rut_recep: rut, rutRecep: rut });
    const dA = { id: "OP-CAT", cliente: "X", facturasOp: [], deudores: [{ name: "Deudor A", monto: 100e6 }] };
    const dB = { ...dA, facturasOp: [f(100e6, "Deudor A")] };

    // (a) NADA QUE CLASIFICAR NO ES «CAT-1». Devolvía la MEJOR categoría desde un conjunto vacío y
    //     `catDisp` la rotulaba «100% muy buenos»: una afirmación sacada de cero datos.
    const vacio = catShares([]);
    const sinNadaOk = vacio.cat === null && catDeal({ facturasOp: [] }).cat === null
      && catDeal({}).cat === null && catDeal(null).cat === null
      && catDisp({ id: "z", facturasOp: [] }) === null;

    // (b) UN ARRAY VACÍO ES UNA RESPUESTA, no ausencia de dato — la misma distinción que hace
    //     `itemizarFacturas`. Con la oferta vacía la CAT de la OFERTA es `null`, y lo que se muestra
    //     es la POTENCIAL, marcada como tal.
    const cdA = catDisp(dA), cdB = catDisp(dB);
    const baseOk = !!cdA && cdA.base === "disponible" && catDeal(dA).cat === null
      && !!cdB && cdB.base === "oferta" && catDeal(dB).cat !== null;

    // (c) NO DEPENDE DE SIMULAR: la misma oferta, con y sin `simulado`, da la misma CAT. Si dependiera,
    //     la regla 3 («se recalcula en vivo al cambiar folios») no se podría cumplir.
    const simOk = JSON.stringify(catDisp({ ...dB, simulado: true })) === JSON.stringify(catDisp({ ...dB, simulado: false }));

    // (d) Y SIGUE CLASIFICANDO como siempre lo que sí tiene facturas: los cortes de catShares no se
    //     tocaron, sólo el caso vacío.
    const A = { m: 80, n: 4.8 }, B = { m: 20, n: 4.0 }, D = { m: 20, n: null };
    const cortesOk = catShares([A, B]).cat === "CAT-1" && catShares([{ m: 50, n: 4.8 }, { m: 50, n: 4.0 }]).cat === "CAT-2"
      && catShares([{ m: 20, n: 4.8 }, { m: 80, n: 4.0 }]).cat === "CAT-3" && catShares([A, B, D]).cat === "CAT-5";

    // (e) UN CAT DESCONOCIDO NO SE PINTA DEL COLOR DEL MEJOR. `catMeta` caía a CAT_META["CAT-1"], o
    //     sea verde: lo que no se pudo clasificar se veía como la mejor cartera posible.
    const metaOk = catMeta(null).fg === CAT_NEUTRA.fg && catMeta("CAT-9").fg === CAT_NEUTRA.fg
      && catMeta("CAT-1").fg !== CAT_NEUTRA.fg && catMeta("CAT-5B").fg === catMeta("CAT-5").fg;

    ok("104 la CAT es de la oferta: vacía no clasifica, y lo disponible se muestra como tal",
       sinNadaOk && baseOk && simOk && cortesOk && metaOk,
       `vacío → ${vacio.cat} (antes «CAT-1») · oferta vacía → base «${cdA && cdA.base}» ${cdA && cdA.label} · con facturas → base «${cdB && cdB.base}» ${cdB && cdB.label} · independiente de simular ${simOk} · cortes 1/2/3/5 ${cortesOk} · color neutro para lo no clasificado ${metaOk}`);
  }

  // ── 105 · LOS CHIPS DE LA COLUMNA SOW NOMBRAN CESIONARIOS, Y NOSOTROS SALIMOS SIEMPRE ─────────
  // La columna contesta «con quién se compite», y para eso «Otros bancarios · 22%» no sirve: un
  // nombre propio sí. Son cuatro chips y siguen siendo una PARTICIÓN —suman 100— y no un ranking
  // recortado: lo que no se nombra se agrupa en «Otros», con el detalle en su tooltip. La regla
  // tiene dos ramas y el caso las prueba por separado, porque la segunda es la que garantiza que la
  // columna siempre diga cuánto nos cede el cliente: con los 4 mayores a secas, un cliente que no
  // nos cede nada simplemente no nos mostraría, y esa ausencia se lee como un cero que nadie escribió.
  {
    const mk = (nombre, pct, porcion, nuestro) => ({ rut: nombre, nombre, pct, porcion, nuestro });
    const arma = (...ds) => {
      // La forma que devuelve `mixSowDe`: porciones, cada una con su detalle.
      const porc = {};
      ds.forEach((d) => { (porc[d.porcion] = porc[d.porcion] || []).push(d); });
      return Object.keys(porc).map((q) => ({ label: q, porcion: q, nuestro: q === "security",
        pct: Math.round(porc[q].reduce((a, b) => a + b.pct, 0) * 10) / 10, detalle: porc[q] }));
    };
    const suma = (cs) => Math.round(cs.reduce((a, b) => a + b.pct, 0) * 10) / 10;
    const nuestros = (cs) => cs.filter((c) => c.nuestro);

    // (a) NUESTRA PORCIÓN ENTRE LAS 3 PRIMERAS → los 3 primeros por nombre y «Otros» en el 4º.
    const A = mixSowChips(arma(mk("Security", 40, "security", 1), mk("BCI", 30, "factoringTarget"),
      mk("Santander", 15, "factoringTarget"), mk("Tanner", 10, "otrosFactoring"), mk("Incofin", 5, "otrosFactoring")));
    const ramaAOk = A.length === 4 && !A[0].otros && !A[1].otros && !A[2].otros && A[3].otros
      && A[0].nuestro && A[3].pct === 15 && A[3].detalle.length === 2 && suma(A) === 100;

    // (b) FUERA DE LOS PRIMEROS → 2 nombrados, «Otros» y NOSOTROS al final con nuestro %. «Otros»
    //     agrupa sólo lo ajeno: contarnos ahí nos contaría dos veces y el total pasaría de 100.
    const B = mixSowChips(arma(mk("BCI", 40, "factoringTarget"), mk("Santander", 30, "factoringTarget"),
      mk("Tanner", 20, "otrosFactoring"), mk("Security", 7, "security", 1), mk("Incofin", 3, "otrosFactoring")));
    const ramaBOk = B.length === 4 && !B[0].otros && !B[1].otros && B[2].otros && B[3].nuestro
      && B[3].pct === 7 && B[2].pct === 23 && !B[2].detalle.some((d) => d.nuestro) && suma(B) === 100;

    // (c) SIN CESIONES NUESTRAS igual salimos, últimos y en 0: es justamente lo que el ejecutivo
    //     vino a leer en esta columna.
    const C = mixSowChips(arma(mk("BCI", 50, "factoringTarget"), mk("Santander", 30, "factoringTarget"), mk("Tanner", 20, "otrosFactoring")));
    const ceroOk = C.length === 4 && C[3].nuestro && C[3].pct === 0 && suma(C) === 100;

    // (d) BORDES: sin mix, sin detalle (cae a las porciones), y un único cesionario.
    const D1 = mixSowChips(null), D2 = mixSowChips([]);
    const D3 = mixSowChips([{ label: "★ Security", porcion: "security", nuestro: true, pct: 100, detalle: [] },
                            { label: "Otros factoring", porcion: "otrosFactoring", pct: 0, detalle: [] }]);
    const D4 = mixSowChips(arma(mk("Security", 100, "security", 1)));
    const bordesOk = D1.length === 0 && D2.length === 0 && D3.length === 1 && D3[0].nuestro
      && D4.length === 1 && D4[0].nuestro && D4[0].pct === 100;

    // (e) Y SOBRE EL ARCHIVO REAL: en las 250+ empresas con mix, los chips son a lo más 4, suman
    //     100, nos incluyen EXACTAMENTE una vez y «Otros» cuadra con la suma de su tooltip.
    const ixp = {}; ((window.PLATAFORMA360 && window.PLATAFORMA360.campos) || []).forEach((c, i) => { ixp[c] = i; });
    let filas = 0, malSuma = 0, malN = 0, malNuestro = 0, malOtros = 0, conBolsa = 0, ramaB = 0;
    for (const f of ((window.PLATAFORMA360 && window.PLATAFORMA360.filas) || [])) {
      const m = mixSowDe(f[ixp.RUT]); if (!m) continue;
      const cs = mixSowChips(m); if (!cs.length) continue;
      filas++;
      if (Math.abs(suma(cs) - 100) > 0.11) malSuma++;
      if (cs.length > 4) malN++;
      if (nuestros(cs).length !== 1) malNuestro++;
      const b = cs.find((c) => c.otros);
      if (b) { conBolsa++; if (Math.abs(b.pct - b.detalle.reduce((a, d) => a + d.pct, 0)) > 0.051) malOtros++; }
      if (cs[cs.length - 1].nuestro && cs.length === 4) ramaB++;
    }
    const realOk = filas > 100 && malSuma === 0 && malN === 0 && malNuestro === 0 && malOtros === 0 && conBolsa > 50 && ramaB > 0;

    ok("105 la columna SOW nombra a los 4 mayores y nosotros salimos siempre, con % o con cero",
       ramaAOk && ramaBOk && ceroOk && bordesOk && realOk,
       `rama A (estamos arriba) ${A.map((c) => c.label + " " + c.pct).join(" · ")} · rama B (estamos fuera) ${B.map((c) => c.label + " " + c.pct).join(" · ")} · sin cesiones nuestras → ${C[3].label} ${C[3].pct}% · archivo: ${filas} empresas, suman 100 ${filas - malSuma}/${filas}, ≤4 chips ${filas - malN}/${filas}, nosotros 1 vez ${filas - malNuestro}/${filas}, «Otros» cuadra ${conBolsa - malOtros}/${conBolsa}, rama B en ${ramaB}`);
  }

  // ── 106 · CERRAR LA OFERTA GENERA LA SOLICITUD AL COMITÉ, SIN QUE EL EJECUTIVO LA REPITA ──────
  // El modal de curse ya prometía que «la solicitud queda en la bandeja del comité de riesgo como una
  // sola solicitud con N línea(s) de detalle» y **nadie la creaba**: el ejecutivo tenía que ir a Líneas
  // y recorrer el wizard a mano, capturando de nuevo la lista que el modal acababa de mostrarle. Lo que
  // el motor devuelve en `solicitudes` es exactamente lo que el comité necesita, así que la solicitud
  // se arma con eso.
  {
    const deal = { id: "OP-SOL", cliente: "Cliente Prueba", rutEmisor: "76.111.111-1", negocioNum: "N-1" };
    const ev = { requiereComite: 90e6, solicitudes: [
      { deudor: "Codelco", rutDeudor: "61.704.000-K", monto: 60e6, motivo: "par", pide: RESOLUCION_COMITE.par.pide, alcance: RESOLUCION_COMITE.par.alcance },
      { deudor: "Escondida (BHP)", rutDeudor: "84.908.508-8", monto: 30e6, motivo: "deudor", pide: RESOLUCION_COMITE.deudor.pide, alcance: RESOLUCION_COMITE.deudor.alcance }] };

    // (a) SIN NADA QUE PEDIR NO SE INYECTA NADA. Una solicitud vacía en la bandeja del comité es peor
    //     que ninguna: alguien tiene que abrirla para descubrir que no pide nada.
    const vacioOk = solicitudComiteDeOferta(deal, { requiereComite: 0, solicitudes: [] }) === null
      && solicitudComiteDeOferta(deal, { requiereComite: 90e6, solicitudes: [] }) === null
      && solicitudComiteDeOferta(null, ev) === null;

    // (b) UNA solicitud con N LÍNEAS DE DETALLE, todas en PUNTUAL —se piden por ESTA operación— y con
    //     el deudor, el monto y el «qué se pide» que produjo el motor, sin recapturar nada.
    const sol = solicitudComiteDeOferta(deal, ev, "Carla Rivas", 650e6);
    const detOk = !!sol && sol.detalle.length === 2 && sol.deudores === 2
      && sol.detalle.every((d) => d.tipoLinea === "puntual" && d.monto > 0 && d.deudor && d.pide)
      && sol.detalle[0].deudor === "Codelco" && sol.detalle[0].monto === 60e6
      && sol.detalle.reduce((a, d) => a + d.monto, 0) === 90e6
      && sol.origen.dealId === "OP-SOL" && sol.automatica === true && sol.ejecutivo === "Carla Rivas";

    // (c) LA LÍNEA PEDIDA SE SUMA A LA VIGENTE. `constituirLinea` escribe `propFactoring` como la
    //     aprobada del cliente, así que mandar sólo lo pedido dejaría al cliente con MENOS línea de la
    //     que ya tenía el día que el comité lo aprueba — una solicitud que castiga por pedir.
    const sumaOk = sol.pedido === 90e6 && sol.propFactoring === 740e6 && sol.totalPropuesto === 740e6
      && constituirLinea({ rut: "76.000.999-9", cliente: "X", propFactoring: sol.propFactoring }).aprobada === 740e6;

    // (d) INYECTADA, queda en la bandeja del comité y el WIZARD la encuentra: el paso 4 precarga esos
    //     deudores en vez de hacer que el ejecutivo los vuelva a escribir.
    const antes = api2ListarProcesos().length;
    const idProc = api1Inyeccion(sol);
    const enBandeja = api2ListarProcesos().find((x) => x.idProceso === idProc);
    const pre = deudoresSolicitadosLinea("76.111.111-1");
    const bandejaOk = api2ListarProcesos().length === antes + 1 && !!enBandeja && enBandeja.estado === "En gestión"
      && enBandeja.detalle.length === 2 && pre.length === 2 && pre.every((x) => x.tipoLinea === "puntual" && x.idProceso === idProc)
      && deudoresSolicitadosLinea("99.999.999-9").length === 0;
    // …y se limpia lo inyectado: este caso no puede dejarle una solicitud de prueba a la demo.
    const iX = api2ListarProcesos().findIndex((x) => x.idProceso === idProc); if (iX >= 0) api2ListarProcesos().splice(iX, 1);

    ok("106 cerrar la oferta inyecta la solicitud al comité con sus líneas de detalle, en puntual",
       vacioOk && detOk && sumaOk && bandejaOk,
       `sin nada que pedir → null ${vacioOk} · ${sol.detalle.length} línea(s) de detalle por ${fmtMM(sol.pedido)} (${sol.detalle.map((d) => d.deudor + " " + fmtMM(d.monto) + " " + d.tipoLinea).join(" · ")}) · aprobada vigente 650MM + 90MM pedidos = ${fmtMM(sol.propFactoring)} · bandeja ${bandejaOk} · el wizard precarga ${pre.length} deudor(es)`);
  }

  // ── 107 · EL WIZARD DE LÍNEA CAPTURA PESOS, Y EL BORDE QUE LOS ESCRIBE NO LOS REDONDEA.
  //    El wizard mezclaba dos unidades en el mismo campo: `linea.aprobada` (pesos) cuando la empresa ya
  //    tenía línea, y un default de `300` (millones) cuando no. Aguas abajo `constituirLinea` escribe
  //    ese número TAL CUAL en la línea aprobada, así que pedir 240 dejaba al cliente con una línea de
  //    240 PESOS —y ninguna de las dos formas del error se ve distinta dentro del campo—. Desde el
  //    refactor todo el wizard es pesos; lo que este caso fija es el borde: lo que entra es lo que
  //    queda, al peso, sin décimas y sin conversión.
  {
    const RUT = "76.107.107-1";
    const limpiar = () => { const i = LINEAS_DATA.findIndex((x) => x.rut === RUT); if (i >= 0) LINEAS_DATA.splice(i, 1); _lineaIdx = null; };
    limpiar();
    // (a) UN MONTO EN PESOS SE ESCRIBE EN PESOS. Y no cualquiera: el cupo que aprueba el comité puede
    //     ser CUALQUIER monto, así que se prueba con uno NO redondo — un redondo sobrevive a una
    //     división por un millón y a un `toFixed`, y no distinguiría nada.
    const l1 = constituirLinea({ rut: RUT, cliente: "Prueba 107", propFactoring: 287431509 });
    const pesoOk = !!l1 && l1.aprobada === 287431509 && Number.isInteger(l1.aprobada)
      && l1.disponible === 287431509 && l1.uso === 0;

    // (b) `propFactoring` MANDA sobre `totalPropuesto`: lo que se constituye es la línea de factoring,
    //     no el total que además incluye confirming.
    limpiar();
    const l2 = constituirLinea({ rut: RUT, cliente: "Prueba 107", propFactoring: 200e6, totalPropuesto: 350e6 });
    const cualOk = !!l2 && l2.aprobada === 200e6;

    // (c) RENOVAR conserva el uso y recalcula al peso. `toFixed(1)` dejaba décimas de peso en el
    //     disponible, que es la cifra contra la que el motor decide si una factura cabe.
    l2.uso = 137331951; l2.montoOp = 12000000;
    const l3 = constituirLinea({ rut: RUT, cliente: "Prueba 107", propFactoring: 440e6 });
    const renOk = l3 === l2 && l3.aprobada === 440e6 && l3.uso === 137331951
      && l3.disponible === 440e6 - 137331951 && Number.isInteger(l3.disponible)
      && l3.proyeccion === 137331951 + 12000000
      && LINEAS_DATA.filter((x) => x.rut === RUT).length === 1;

    // (d) SIN MONTO NO HAY LÍNEA. Una solicitud en cero —o sin RUT— no constituye nada: una línea de
    //     $0 se vería en la cartera como una línea vigente que no financia ninguna factura.
    limpiar();
    const nadaOk = constituirLinea({ rut: RUT, propFactoring: 0 }) === null
      && constituirLinea({ rut: "", propFactoring: 100e6 }) === null
      && constituirLinea(null) === null
      && LINEAS_DATA.filter((x) => x.rut === RUT).length === 0;
    limpiar();

    ok("107 la solicitud de línea viaja en PESOS y el borde que la constituye no la redondea",
       pesoOk && cualOk && renOk && nadaOk,
       `no redondo 287.431.509 → ${fmtMM(287431509)} intacto ${pesoOk} · propFactoring manda sobre totalPropuesto ${cualOk} · renovar conserva uso y recalcula al peso ${renOk} (disponible ${440e6 - 137331951}) · sin monto no hay línea ${nadaOk}`);
  }

  // ── 108 · UN «MONTO A GIRAR» NO POSITIVO SE SIMULA PERO NO SE CURSA.
  //    Con una factura chica la comisión mínima más los gastos y su IVA superan al anticipo, y la
  //    simulación devuelve un monto a girar NEGATIVO. La decisión del negocio: el ejecutivo puede
  //    agregarla y simularla —es cómo ve por qué no da— pero ahí se detiene. El gate va al final del
  //    camino y no a la entrada: prohibir agregar la factura escondería la causa.
  {
    // (a) EL VEREDICTO. Cero no es «casi uno»: un giro se materializa en una transferencia y no se
    //     transfiere $0, así que el corte está en $1 y no en «mayor o igual que cero».
    const positivo = giroCursable(86200000).ok === true && giroCursable(1).ok === true;
    const cero = giroCursable(0).ok === false && /\$0/.test(giroCursable(0).motivo || "");
    const neg = giroCursable(-673476).ok === false && giroCursable(-673476).monto === -673476
      && /superan al anticipo/.test(giroCursable(-673476).motivo || "");
    // Redondea al peso antes de juzgar, como todo el sistema: 0,4 no es un giro.
    const redondeo = giroCursable(0.4).ok === false && giroCursable(0.6).ok === true;

    // (b) SIN SIMULAR NO SE PRONUNCIA. Una oferta que nadie evaluó no se bloquea por una cifra que
    //     nadie calculó (regla 14); el gate existe cuando existe el número.
    const sinDato = giroCursable(null).ok === true && giroCursable(undefined).ok === true
      && giroCursable(NaN).ok === true && giroCursable(null).motivo === null;

    // (c) EL MOTIVO ES PARTE DEL RESULTADO, no un booleano. Un CTA apagado sin explicación deja al
    //     ejecutivo con una oferta armada y ninguna forma de enterarse de por qué no avanza — la
    //     misma razón por la que «Girar» se muestra deshabilitado con el motivo y no desaparece.
    const conMotivo = [0, -1, -673476].every((m) => { const g = giroCursable(m); return g.ok === false && typeof g.motivo === "string" && g.motivo.length > 20; })
      && [1, 5e6].every((m) => giroCursable(m).motivo === null);

    ok("108 una oferta con «Monto a Girar» no positivo se simula pero no se cursa",
       positivo && cero && neg && redondeo && sinDato && conMotivo,
       `positivo cursa ${positivo} · $0 bloquea ${cero} · negativo bloquea ${neg} (${fmtCLP(giroCursable(-673476).monto)}) · redondea al peso ${redondeo} · sin simular no se pronuncia ${sinDato} · siempre con motivo ${conMotivo}`);
  }

  console.log(out.join("\n"));
  console.log("\n" + out.filter((x) => x.startsWith("PASA")).length + " de " + out.length + " pasan.");
  return out;
})();
