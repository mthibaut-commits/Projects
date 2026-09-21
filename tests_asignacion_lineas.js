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

   Última corrida: 116/116 PASA.
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
      fchVctoProm: 40, pctPagoDeudor3M: 95, mntCompraOp3M: 100 * MMF, avgVentaProm3M: 100 * MMF,
      mesesConVenta6M: 6, pctMora25d: 0, pctReclamadas: 0, mntPagoDeudor3M: 2000 * MMF,
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
      // EN PESOS, como el resto del modelo: `mntPagoDeudor3M` estaba en millones (5000) y V10 exige
      // > M$1.000, así que al migrar el umbral al peso este par dejaba de superarla y el caso medía
      // otra cosa. La prueba llevaba escrita la unidad equivocada.
      aplican: VERIF_APLICAN_RECORTADO, avgVentaProm3M: 1e9, mesesConVenta6M: 6,
      pctMora25d: 0, pctReclamadas: 0, mntPagoDeudor3M: 5000 * MMF };
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

  // ── 109 · EL DETALLE DE LA SOLICITUD AL COMITÉ: qué línea se pide, sobre qué estado y por qué.
  //    Una solicitud automática es UNA solicitud con N líneas de detalle (caso 106) y la bandeja
  //    mostraba sólo el total. El comité aprueba o recorta línea por línea, así que necesita el estado
  //    del par —aprobada, utilizada, disponible— y de qué operación salió lo que se pide.
  {
    const LIN = [
      { granularidad: "par", rutDeudor: "99.111.111-1", tipo: "LF2", aprobado: 40e6, vigente: 15e6 },
      { granularidad: "par", rutDeudor: "99.111.111-1", tipo: "LF3", aprobado: 10e6, vigente: 4e6 },
      { granularidad: "par", rutDeudor: "99.222.222-2", tipo: "LF2", aprobado: 30e6, vigente: 30e6 },
      { granularidad: "par", rutDeudor: "99.333.333-3", tipo: "LF2", aprobado: 99e6, vigente: 0, descartada: true },
      { granularidad: "comodin", rutDeudor: null, tipo: "LF4", aprobado: 25e6, vigente: 5e6 },
    ];
    // (a) LAS LÍNEAS DEL PAR SE SUMAN —LF2 y LF3 son dos cupos del mismo par— y el disponible es la
    //     resta. Una descartada no cuenta: el motor la fusionó en su hermana y sumarla contaría dos veces.
    const a = lineaParDeSolicitud("99.111.111-1", LIN);
    const sumaOk = a.propia === true && a.aprobada === 50e6 && a.utilizada === 19e6 && a.disponible === 31e6
      && a.tipos.length === 2;
    const descartadaOk = lineaParDeSolicitud("99.333.333-3", LIN).propia === false;

    // (b) «SIN LÍNEA PROPIA» NO ES UNA LÍNEA EN CERO. El par sin cupo propio se financia por el
    //     comodín del cliente, así que decir «M$0 aprobada» afirmaría que al comité se le pide ampliar
    //     algo que existe — y es justamente el caso que una PUNTUAL viene a resolver. El comodín del
    //     cliente no es del par y no puede colarse en su fila.
    const sin = lineaParDeSolicitud("99.999.999-9", LIN);
    const sinOk = sin.propia === false && sin.aprobada === 0 && sin.utilizada === 0 && sin.disponible === 0;
    const comodinOk = !LIN.filter((l) => l.granularidad === "par").some((l) => l.tipo === "LF4");

    // (c) EL DISPONIBLE NO SE VA BAJO CERO. Un par con la línea copada da 0, no un negativo: el
    //     disponible es lo que queda por usar y «−M$5» no es una cantidad de cupo.
    const copado = lineaParDeSolicitud("99.222.222-2", LIN);
    const copadoOk = copado.disponible === 0 && copado.aprobada === 30e6 && copado.utilizada === 30e6;

    // (d) LA PROYECCIÓN ES SOBRE LO PEDIDO, en los dos lados: si el comité aprueba, la línea del par
    //     sube en lo solicitado y su uso también al cursar la operación. Aprobar sin proyectar el uso
    //     mostraría una línea que se amplía y nunca se ocupa.
    const pedido = 20e6;
    const apProy = a.aprobada + pedido, usoProy = a.utilizada + pedido;
    const proyOk = apProy === 70e6 && usoProy === 39e6 && apProy - usoProy === a.disponible;

    // (e) NO MUTA lo que lee: las líneas son las del índice memoizado del cliente.
    const antes = JSON.stringify(LIN);
    lineaParDeSolicitud("99.111.111-1", LIN); lineaParDeSolicitud("99.999.999-9", LIN);
    const puroOk = JSON.stringify(LIN) === antes && lineaParDeSolicitud("x", null).propia === false;

    ok("109 el detalle de la solicitud muestra el estado del par y lo que se le pide al comité",
       sumaOk && descartadaOk && sinOk && comodinOk && copadoOk && proyOk && puroOk,
       `LF2+LF3 ${fmtMM(a.aprobada)} aprobada · ${fmtMM(a.utilizada)} utilizada · ${fmtMM(a.disponible)} disponible ${sumaOk} · descartada fuera ${descartadaOk} · «sin línea propia» ≠ cero ${sinOk} · comodín no entra ${comodinOk} · copado no da negativo ${copadoOk} · proyectada ${fmtMM(usoProy)} / ${fmtMM(apProy)} ${proyOk} · no muta ${puroOk}`);
  }

  // ── 110 · LA ETAPA DE UNA OPERACIÓN SE ROTULA EN UN SOLO SITIO.
  //    `ChipEtapa` unificó el chip y `stageName` el rótulo por TENANT, pero el ID que los alimenta se
  //    resolvía de dos maneras: el tubo con `etapaVisualId` —que colapsa «giro» a Aceptada y saca la
  //    oferta publicada— y las otras cinco pantallas con el `stage` CRUDO. Medido en el navegador
  //    antes de corregirlo: la misma operación decía «Aceptada» en el tubo y «Giro» en el conteo por
  //    etapa, las tareas, la bitácora, el Command-K y los dos exportes.
  {
    const girada = { id: "T110a", stage: "giro" };
    const publicada = { id: "T110b", stage: "oferta", ofertaCerrada: true, negocioNum: "D110", ofertaComunicada: true };
    const enOferta = { id: "T110c", stage: "oferta" };
    const prospecto = { id: "T110d", stage: "prospeccion" };

    // (a) LOS DOS COLAPSOS. «Giro» no es una etapa que se muestre —se ve como Aceptada— y una oferta
    //     publicada es otra cosa para el ejecutivo aunque el motor no haya movido el stage.
    //     Una GIRADA ya no es una etapa del tubo: su estado lo nombra `estadoOperacion` (regla 26) y
    //     por eso dice «Girada» y no «Giro» ni «Aceptada». La oferta publicada sí es del tubo, así que
    //     la nombra el catálogo del tenant.
    const colapsoOk = etapaDeDeal(girada) === "Girada"
      && etapaDeDeal(girada) !== stageName("giro")
      && etapaVisualId(girada) === "aceptadas"
      && etapaDeDeal(publicada) === stageName(ETAPA_PUBLICADA)
      && etapaDeDeal(publicada) !== stageName("oferta");

    // (b) LO QUE NO COLAPSA PASA TAL CUAL: el resolver no puede inventarle una etapa a una operación
    //     que está justo donde dice estar.
    const directoOk = etapaDeDeal(enOferta) === stageName("oferta")
      && etapaDeDeal(prospecto) === stageName("prospeccion");

    // (c) ES EL MISMO RÓTULO QUE DIBUJA EL CHIP. El chip del tubo recibe la OPERACIÓN y saca su texto
    //     de `etapaDeDeal`; el COLOR sigue saliendo del catálogo del tenant por la etapa visual. Si el
    //     chip leyera el id crudo, diría «Cesión» donde el conteo de al lado dice «Aceptada».
    const chipOk = [girada, publicada, enOferta, prospecto, { id: "T110e", stage: "cesion" }]
      .every((d) => typeof etapaVista(etapaVisualId(d)).color === "string" && etapaVista(etapaVisualId(d)).color.startsWith("#"));

    // (d) SIGUE SIENDO DEL TENANT (regla 28): el rótulo sale del catálogo configurado, no del modelo.
    //     Un tenant que renombra una etapa la renombra en las seis pantallas y en los dos exportes.
    const base = etapaBase("prospeccion");
    const tenantOk = etapaDeDeal(prospecto) === etapaVista("prospeccion").label
      && (!base || typeof etapaDeDeal(prospecto) === "string");

    // (e) BORDES. Sin operación no hay etapa que rotular, y eso no puede reventar la pantalla que la
    //     pide: el conteo por etapa y el Command-K recorren listas que pueden traer cualquier cosa.
    let bordeOk = true;
    try { etapaDeDeal(null); etapaDeDeal(undefined); etapaDeDeal({}); } catch (_) { bordeOk = false; }

    ok("110 la etapa de una operación se rotula en un solo sitio, con los dos colapsos",
       colapsoOk && directoOk && chipOk && tenantOk && bordeOk,
       `giro → «${etapaDeDeal(girada)}» (crudo «${stageName("giro")}») ${colapsoOk} · publicada → «${etapaDeDeal(publicada)}» (crudo «${stageName("oferta")}») · sin colapso pasa igual ${directoOk} · calza con el chip ${chipOk} · sigue siendo del tenant ${tenantOk} · bordes ${bordeOk}`);
  }

  // ── 111 · EL TUBO Y OPERACIONES NOMBRAN EL MISMO ESTADO IGUAL.
  //    `estadoOperacion` se declaraba «el mismo que usan el tubo y el detalle» (regla 26) y tenía UN
  //    solo call site. Medido antes de corregirlo: 5 de 6 estados se nombraban distinto en las dos
  //    pantallas — «Otorgamiento» contra «Otorgamiento / Verificación», «Cesión» contra «Aceptada»,
  //    «Cesión» contra «Pendiente Integración», y el giro pendiente decía «Aceptada» en el tubo.
  {
    const casos = [
      { n: "otorgamiento", d: { id: "T111a", stage: "otorgamiento" } },
      { n: "cesión", d: { id: "T111b", stage: "cesion" } },
      { n: "pend. integración", d: { id: "T111c", stage: "cesion", integracion: "pendiente", giroPendiente: true } },
      { n: "pend. de giro", d: { id: "T111d", stage: "giro", integracion: "aprobada", giroPendiente: true } },
      { n: "girada", d: { id: "T111e", stage: "giro" } },
      { n: "aceptadas", d: { id: "T111f", stage: "aceptadas" } },
    ];
    // (a) UN SOLO VOCABULARIO: lo que el tubo rotula es lo que Operaciones muestra.
    const mismoOk = casos.every(({ d }) => etapaDeDeal(d) === estadoOperacion(d));

    // (b) LOS CUATRO ESTADOS DE LA MÁQUINA POSTERIOR A LA FIRMA se nombran como la regla 26 los nombra,
    //     y son DISTINTOS entre sí: si dos colapsaran, el ejecutivo no podría saber qué falta.
    const m = Object.fromEntries(casos.map(({ n, d }) => [n, etapaDeDeal(d)]));
    const maquinaOk = m["otorgamiento"] === "Otorgamiento / Verificación"
      && m["pend. integración"] === "Pendiente Integración"
      && m["pend. de giro"] === "Pendiente de Giro"
      && m["girada"] === "Girada"
      && new Set([m["otorgamiento"], m["pend. integración"], m["pend. de giro"], m["girada"]]).size === 4;

    // (c) ANTES DE LA FIRMA manda la etapa del TUBO, que el tenant nombra (regla 28): «Pendiente
    //     Integración» no es una etapa que un factoring pueda renombrar, es dónde está la operación.
    const antes = [{ id: "T111g", stage: "prospeccion" }, { id: "T111h", stage: "oferta" }];
    const tenantOk = antes.every((d) => estadoOperacion(d) === null && etapaDeDeal(d) === stageName(etapaVisualId(d)))
      && etapaDeDeal({ id: "T111i", stage: "aceptadas" }) === stageName("aceptadas");

    // (d) LO QUE SALIÓ DEL TUBO ES LO QUE OPERACIONES RESUELVE. `fueraDelTubo` es el predicado, y el
    //     Kanban no puede volver a meter por la ventana lo que él saca: el re-ingreso de las de giro
    //     pendiente venía de la definición anterior y `filtered` —que deriva de `dealsTubo`— ya las
    //     excluía, así que devolvía siempre vacío.
    const fueraOk = casos.filter(({ n }) => ["pend. integración", "pend. de giro", "girada"].includes(n))
        .every(({ d }) => fueraDelTubo(d) === true)
      && casos.filter(({ n }) => ["otorgamiento", "cesión", "aceptadas"].includes(n))
        .every(({ d }) => fueraDelTubo(d) === false);

    ok("111 el tubo y Operaciones nombran el mismo estado igual, con un solo traductor",
       mismoOk && maquinaOk && tenantOk && fueraOk,
       `6/6 coinciden ${mismoOk} · máquina ${m["otorgamiento"]} → ${m["pend. integración"]} → ${m["pend. de giro"]} → ${m["girada"]} (4 distintos) ${maquinaOk} · antes de firmar manda la etapa del tenant ${tenantOk} · fuera del tubo ${fueraOk}`);
  }

  // ── 112 · LA LISTA DE OPORTUNIDADES: POR PRIORIDAD DE GESTIÓN, Y DENTRO DE CADA ETAPA POR PLATA.
  //    El orden es `oferta → publicada → prospección → otorgamiento → aceptada → cesión` (18-09-2026,
  //    pedido del usuario), y NO «de la más avanzada a la menos», que es lo que hacía antes. Responde
  //    «¿qué tengo que hacer hoy?» y no «¿cuál va más adelante?»: la oferta espera una acción del
  //    ejecutivo, la publicada espera al cliente, y lo que ya se está cursando no depende de él.
  //    Con la oferta cuando la hay y con el tamaño de la oportunidad cuando todavía no: en prospección
  //    nadie tiene oferta, así que mirar sólo `monto` dejaba toda esa etapa empatada en cero.
  {
    // `simulado` es lo que hace que una oferta EXISTA para la pantalla: sin él la columna «Oferta»
    // dice «Sin simular» y el potencial se lee en «Oportunidad».
    const D = (id, stage, monto, extra) => ({ id, stage, monto: monto || 0, simulado: true, cliente: id, ...(extra || {}) });
    const publicada = (id, monto) => D(id, "oferta", monto, { ofertaCerrada: true, negocioNum: "N" + id, ofertaComunicada: true });

    // (a) MANDA LA PRIORIDAD DE GESTIÓN. Una prospección con MUCHA plata va debajo de una oferta con
    //     poca: primero se ordena por lo que hay que hacer, no por cuánto trae. Y el orden completo,
    //     con las seis etapas a la vez, es el que pidió el usuario.
    const avance = ordenarOportunidades([
      D("p", "prospeccion", 900e6), D("o", "oferta", 1e6), D("c", "cesion", 1e6), D("t", "otorgamiento", 1e6),
    ]).map((d) => d.id);
    const avanceOk = avance.join(",") === "o,p,t,c";
    const seis = ordenarOportunidades([
      D("f_cesion", "cesion", 1e6), D("d_prosp", "prospeccion", 1e6), D("e_acept", "aceptadas", 1e6),
      publicada("b_publi", 1e6), D("c_otorg", "otorgamiento", 1e6), D("a_ofert", "oferta", 1e6),
    ]).map((d) => d.id);
    const seisOk = seis.join(",") === "a_ofert,b_publi,d_prosp,c_otorg,e_acept,f_cesion";

    // (b) UNA OFERTA SIN PUBLICAR VA POR DELANTE de una publicada, aunque las dos estén en `oferta`:
    //     se rankea sobre la etapa VISUAL, y la sin publicar es la que espera una acción del ejecutivo.
    //     Estaba al revés hasta el 18-09-2026, cuando el orden pasó a ser prioridad de gestión.
    const pubOk = ordenarOportunidades([publicada("pub", 50e6), D("sin", "oferta", 1e6)]).map((d) => d.id).join(",") === "sin,pub";

    // (c) UNA PÉRDIDA ES TERMINAL, NO ADELANTADA. `STAGE_ORDER` la deja al final del array y usarlo
    //     como progresión la habría puesto primera, arriba de todo lo vivo.
    const perdidaOk = ordenarOportunidades([D("x", "perdida", 900e6), D("y", "prospeccion", 1e6)])
      .map((d) => d.id).join(",") === "y,x" && prioridadDeDeal(D("x", "perdida", 0)) === -1;

    // (d-bis) DENTRO DE LA ETAPA, PRIMERO LAS QUE TIENEN LÍNEA GLOBAL DISPONIBLE (18-09-2026, pedido
    //     del usuario). Son dos grupos y cada uno se ordena por plata: sin este corte, una oportunidad
    //     enorme SIN cupo se sentaba arriba de una mediana que sí se podía cursar hoy.
    //     Se planta la línea del cliente con `LINEAS_DATA`, que es de donde `lineaCreditoDe` la lee.
    const conLinea = (id, monto, disp) => D(id, "oferta", monto, { rutEmisor: "R" + id, cliente: "C" + id, _dispPlantado: disp });
    const guardarLD = typeof LINEAS_DATA !== "undefined" ? LINEAS_DATA.slice() : null;
    let lineaOk = false, ordenLinea = "(no se pudo plantar)";
    if (guardarLD) {
      // Dos con cupo (una grande, una chica) y dos sin cupo (una ENORME y una chica).
      const plant = [["Rg1", 1000e6, 400e6], ["Rg2", 1000e6, 50e6], ["Rs1", 1000e6, 1000e6], ["Rs2", 500e6, 500e6]];
      plant.forEach(([rut, apr, uso]) => LINEAS_DATA.push({ rut, aprobada: apr, uso }));
      // `_lineaIdx` está MEMOIZADO: sin invalidarlo la línea plantada no se ve y `lineaCreditoDe` se cae
      // al uso sintético por hash, que da cualquier cosa. Es la misma invalidación que hace el fuente al
      // constituir una línea nueva.
      _lineaIdx = null;
      const lst = [
        D("g_chica", "oferta", 10e6, { rutEmisor: "Rg2" }),      // con cupo, chica
        D("s_enorme", "oferta", 900e6, { rutEmisor: "Rs1" }),    // SIN cupo, enorme
        D("g_grande", "oferta", 80e6, { rutEmisor: "Rg1" }),     // con cupo, grande
        D("s_chica", "oferta", 5e6, { rutEmisor: "Rs2" }),       // SIN cupo, chica
      ];
      ordenLinea = ordenarOportunidades(lst).map((d) => d.id).join(",");
      lineaOk = ordenLinea === "g_grande,g_chica,s_enorme,s_chica"
        && conLineaGlobalDeal(lst[2]) === 1 && conLineaGlobalDeal(lst[1]) === 0;
      LINEAS_DATA.length = 0; guardarLD.forEach((x) => LINEAS_DATA.push(x)); _lineaIdx = null;
    }

    // (d) DENTRO DEL MISMO GRUPO, LA PLATA, de mayor a menor.
    const plataOk = ordenarOportunidades([D("a", "oferta", 10e6), D("b", "oferta", 80e6), D("c2", "oferta", 40e6)])
      .map((d) => d.id).join(",") === "b,c2,a";

    // (e) SIN OFERTA DESEMPATA EL TAMAÑO DE LA OPORTUNIDAD. Dos prospecciones sin monto de oferta se
    //     ordenan por lo que el motor le encontró al cliente; con `monto` a secas quedaban empatadas.
    const conDisp = (id, mm) => D(id, "prospeccion", 0, { simulado: false, deudores: [{ name: "Codelco", facturas: 1, monto: mm }] });
    const dispOk = montoOrdenDeal(conDisp("z", 70e6)) === 70e6
      && montoOrdenDeal(D("w", "prospeccion", 0)) === 0
      // SIN SIMULAR manda la oportunidad aunque `monto` traiga cifra: es lo que la columna muestra.
      && montoOrdenDeal({ id: "v", stage: "prospeccion", monto: 5e6, simulado: false,
                          deudores: [{ name: "Codelco", facturas: 3, monto: 88e6 }] }) === 88e6
      && ordenarOportunidades([conDisp("chica", 20e6), conDisp("grande", 90e6)]).map((d) => d.id).join(",") === "grande,chica";

    // (f) LA OFERTA MANDA SOBRE LA OPORTUNIDAD cuando existe: es lo que el ejecutivo eligió comprar.
    const ofertaMandaOk = montoOrdenDeal(D("q", "oferta", 5e6, { deudores: [{ name: "Codelco", facturas: 9, monto: 900e6 }] })) === 5e6;

    // (g) NO MUTA la lista que recibe —entra un array memoizado— y es ESTABLE: dos operaciones
    //     idénticas no se intercambian entre renders, o la tabla parpadea sola.
    const orig = [D("m1", "oferta", 10e6), D("m2", "oferta", 10e6), D("m3", "oferta", 10e6)];
    const copia = orig.map((d) => d.id).join(",");
    const r1 = ordenarOportunidades(orig).map((d) => d.id).join(",");
    const r2 = ordenarOportunidades(orig).map((d) => d.id).join(",");
    const puroOk = orig.map((d) => d.id).join(",") === copia && r1 === r2
      && ordenarOportunidades([]).length === 0 && ordenarOportunidades(null).length === 0;

    // (h) EL ORDEN NO SE APLICA EN CADA LOTE. `ordenEstable` conserva el orden que el ejecutivo está
    //     mirando mientras la ventana no vence, y mete las filas NUEVAS al final —retenerlas sería
    //     esconder trabajo, que es peor que un salto—; las que ya no están se caen. Pura y sin mutar.
    const nuevoOrden = [D("n1", "oferta", 90e6), D("n2", "oferta", 80e6), D("n3", "oferta", 70e6)];
    const estableOk = ordenEstable(nuevoOrden, ["n3", "n1", "n2"]).map((d) => d.id).join(",") === "n3,n1,n2"
      && ordenEstable(nuevoOrden, []).map((d) => d.id).join(",") === "n1,n2,n3"          // sin previo, el fresco
      && ordenEstable(nuevoOrden, ["n2", "n1"]).map((d) => d.id).join(",") === "n2,n1,n3" // la nueva (n3) al final
      && ordenEstable(nuevoOrden, ["se_fue", "n2"]).map((d) => d.id).join(",") === "n2,n1,n3" // la que ya no está se cae
      && ordenEstable([], ["n1"]).length === 0
      && (() => { const a = [...nuevoOrden]; ordenEstable(a, ["n3"]); return a.map((d) => d.id).join(",") === "n1,n2,n3"; })();

    ok("112 la lista va por prioridad de gestión (oferta → publicada → prospección → otorgamiento → aceptada → cesión), dentro de cada etapa primero las que tienen línea global disponible y luego por plata, y el orden no se re-aplica en cada lote",
       avanceOk && seisOk && pubOk && perdidaOk && lineaOk && plataOk && dispOk && ofertaMandaOk && puroOk && estableOk,
       `prioridad ${avance.join(" > ")} ${avanceOk} · las seis etapas ${seis.join(" > ")} ${seisOk} · sin publicar antes que publicada ${pubOk} · pérdida al fondo ${perdidaOk} · con línea global disponible primero ${lineaOk} (${ordenLinea}) · plata desc ${plataOk} · sin oferta manda la oportunidad ${dispOk} · con oferta manda la oferta ${ofertaMandaOk} · pura y estable ${puroOk} · orden estable dentro de la ventana ${estableOk}`);
  }

  // ── 113 · LO QUE EL DETALLE ESCRIBE EN UN REPOSITORIO LO VE LA SIGUIENTE PESTAÑA.
  //    El detalle es pestaña propia, o sea otro documento con su propio módulo, y `crearRepo` guardaba
  //    en memoria: el ejecutivo justificaba las excepciones ahí, cerraba, volvía a abrir la misma
  //    operación desde el tubo y aparecían SIN justificar — como si no hubiera marcado nada. Es la
  //    familia de `nex-solicitud` (15-bis-bis), pero aquél cruzaba a una pestaña ABIERTA y esto tiene
  //    que sobrevivir a que se cierre, así que es storage y no un postMessage.
  {
    const NOM = "prueba_113_" + Date.now();
    const KEY = "pc_repo_" + NOM;
    const limpiar = () => { try { localStorage.removeItem(KEY); } catch (_) {} };
    limpiar();

    // (a) ESCRIBIR PERSISTE. Lo que queda en el storage es lo que la otra pestaña va a leer: si la
    //     escritura se quedara en memoria, el repo se vería igual de vacío que antes del arreglo.
    const r = crearRepo(NOM);
    r.set("OP-1", { estado: "aprobada", nota: "justificada" });
    r.patch("OP-1", { por: "CR" });
    r.push("OP-2", { evento: "visado" });
    let guardado = {};
    try { guardado = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) {}
    const tablaG = guardado[TENANT_ACTUAL] || {};
    const persisteOk = !!tablaG["OP-1"] && tablaG["OP-1"].estado === "aprobada" && tablaG["OP-1"].nota === "justificada"
      && tablaG["OP-1"].por === "CR" && Array.isArray(tablaG["OP-2"]) && tablaG["OP-2"].length === 1;

    // (b) BORRAR TAMBIÉN PERSISTE: si el `del` no se guardara, la otra pestaña seguiría viendo una
    //     justificación que el ejecutivo ya retiró, que es peor que no verla.
    r.del("OP-2");
    let g2 = {}; try { g2 = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) {}
    const borradoOk = !((g2[TENANT_ACTUAL] || {})["OP-2"]);

    // (c) EL SCOPE POR TENANT VIAJA con el dato: la tabla persistida está indexada por tenant, que es
    //     la futura columna `tenant_id`. Sin eso, dos tenants compartirían visados en el storage.
    const tenantOk = Object.prototype.hasOwnProperty.call(guardado, TENANT_ACTUAL);

    // (d) UN STORAGE CORRUPTO NO REVIENTA LA APP ni se lee como un repo con datos: se parte de cero.
    //     El usuario está mirando una oferta, no un test.
    try { localStorage.setItem(KEY + "_x", "{esto no es json"); } catch (_) {}
    let robustoOk = true;
    try { const r2 = crearRepo(NOM + "_x"); robustoOk = Object.keys(r2.all() || {}).length === 0; } catch (_) { robustoOk = false; }

    // (e) LA PESTAÑA PRINCIPAL ES LA DUEÑA DE LA VIDA ÚTIL. La suite corre sin ticket en la URL —es el
    //     tubo—, así que acá `REPOS_FRESCOS` tiene que ser true: recargar la demo parte de cero y una
    //     pestaña de detalle, que siempre trae ticket, hereda en vez de limpiar.
    const duenoOk = REPOS_FRESCOS === true;

    limpiar(); try { localStorage.removeItem(KEY + "_x"); } catch (_) {}
    delete REPOS[NOM]; delete REPOS[NOM + "_x"];

    ok("113 lo que el detalle escribe en un repositorio lo ve la siguiente pestaña",
       persisteOk && borradoOk && tenantOk && robustoOk && duenoOk,
       `set/patch/push persisten ${persisteOk} · del persiste ${borradoOk} · scope por tenant ${tenantOk} · storage corrupto parte de cero ${robustoOk} · el tubo es el dueño de la vida útil ${duenoOk}`);
  }


  // ─────────────────────────────────────────────────────────────────────────
  // 114 · SOLICITAR NO CIERRA LA PUERTA: el ejecutivo puede seguir aportando información.
  // El panel quedaba en sólo lectura apenas se enviaba la solicitud, y lo que llega después —el
  // contrato de cesión firmado en papel, la aclaración que el apoderado pidió por teléfono— no tenía
  // por dónde entrar. Aportar respaldo no decide nada; lo que está gateado por atribución es VISAR.
  // Se APILA y no se reemplaza: la justificación original es evidencia con actor y hora, el apoderado
  // pudo haberla leído ya, y pisarla borraría sobre qué se estaba decidiendo.
  {
    const ID = "OP-T114-" + Date.now();
    const deal = { id: ID, cliente: "Cliente de prueba 114" };
    const x = { stKey: "305", nivel: 3, deudor: null,
                regla: { n: 305, cond: "O05", nombre: "Evidencia del Contrato de Cesi\u00f3n", area: "operaciones" } };
    const leer = () => (repoSolicitudExc.get(ID) || {})[x.stKey] || null;

    // (a) SIN SOLICITUD PREVIA no escribe nada. Una ampliación es información PARA alguien: sin
    //     solicitud no hay destinatario, y fabricar una aquí saltaría el aviso y la tarea que
    //     `solicitarAprobacionExc` genera —el apoderado tendría el respaldo y ningún motivo para mirarlo—.
    ampliarSolicitudExc(deal, x, "CR", "no deber\u00eda entrar", ["fantasma.pdf"]);
    const sinSolOk = leer() === null;

    // La solicitud se siembra directo en el repositorio: lo que este caso mide es el contrato de
    // `ampliarSolicitudExc`, no la cadena de avisos, hilos y tareas que cuelga del envío.
    repoSolicitudExc.set(ID, { [x.stKey]: { comentario: "Justificaci\u00f3n original", archivos: ["respaldo_1.pdf"],
      por: "Carla Rivas", porCode: "CR", fecha: "16-09-2026, 5:00:00 p. m.", nivel: 3, rol: "Jefe de Operaciones" } });

    // (b) SE APILA, NO SE REEMPLAZA.
    ampliarSolicitudExc(deal, x, "CR", "Contrato de cesi\u00f3n firmado, recibido en sucursal", ["Contrato_Cesion_Firmado.pdf"]);
    const s1 = leer() || {};
    const a1 = (s1.ampliaciones || [])[0] || {};
    const apilaOk = s1.comentario === "Justificaci\u00f3n original"
      && (s1.archivos || []).join() === "respaldo_1.pdf"
      && (s1.ampliaciones || []).length === 1
      && a1.comentario === "Contrato de cesi\u00f3n firmado, recibido en sucursal"
      && (a1.archivos || []).join() === "Contrato_Cesion_Firmado.pdf";

    // (c) CADA AMPLIACIÓN LLEVA SU ACTOR Y SU HORA: la bitácora tiene que poder decir qué se sabía en
    //     cada momento, y con una sola fecha para todo el bloque eso no se puede reconstruir.
    const firmaOk = !!a1.por && !!a1.fecha && a1.fecha !== s1.fecha;

    // (d) APPEND-ONLY Y EN ORDEN: la segunda no pisa a la primera.
    ampliarSolicitudExc(deal, x, "CR", "Aclaraci\u00f3n que pidi\u00f3 Operaciones por tel\u00e9fono", []);
    const s2 = leer() || {};
    const ordenOk = (s2.ampliaciones || []).length === 2
      && s2.ampliaciones[0].comentario === "Contrato de cesi\u00f3n firmado, recibido en sucursal"
      && s2.ampliaciones[1].comentario === "Aclaraci\u00f3n que pidi\u00f3 Operaciones por tel\u00e9fono";

    // (e) UNA AMPLIACIÓN VACÍA NO ESCRIBE. Un bloque con actor y hora y nada adentro le dice al
    //     apoderado que hay algo nuevo que leer cuando no lo hay.
    ampliarSolicitudExc(deal, x, "CR", "   ", []);
    const s3 = leer() || {};
    const vaciaOk = (s3.ampliaciones || []).length === 2;

    repoSolicitudExc.del(ID);

    ok("114 solicitar no cierra la puerta: el ejecutivo sigue pudiendo agregar informaci\u00f3n",
       sinSolOk && apilaOk && firmaOk && ordenOk && vaciaOk,
       `sin solicitud no escribe ${sinSolOk} \u00b7 apila sin pisar la original ${apilaOk} \u00b7 con actor y hora propias ${firmaOk} (${a1.por} \u00b7 ${a1.fecha}) \u00b7 append-only en orden ${ordenOk} \u00b7 vac\u00eda no escribe ${vaciaOk}`);
  }


  // ─────────────────────────────────────────────────────────────────────────
  // 115 · EL PREDICTOR COMPARA PESOS CONTRA PESOS. V03, V04 y V09 miden el monto de la operación
  // —que se suma en pesos— contra variables del par y contra umbrales que estaban escritos en
  // MILLONES: un factor 1.000.000 entre los dos lados de cada comparación. El efecto no era un
  // sesgo sino la inversión del criterio: V03 y V09 no los cumplía NADIE, y como basta que uno
  // falle para mandar al teléfono (unanimidad, §4.2), el techo por monto verificaba a todos.
  // V04 aplica además al segmento PRIME, así que se llevaba también a los deudores de lista.
  {
    const par = (extra) => ({
      nombre: "Deudor 115", protocolo: { existe: false }, primeraOperacion: false,
      recortado: false, prime: false, aplican: VERIF_APLICAN_COMPLETO,
      fchVctoProm: 40, pctPagoDeudor3M: 95, mesesConVenta6M: 6, pctMora25d: 0, pctReclamadas: 0,
      mntCompraOp3M: 500 * MMF,     // M$500 comprados al par en 3M
      avgVentaProm3M: 800 * MMF,    // M$800 de venta mensual del par
      mntPagoDeudor3M: 5000 * MMF,  // M$5.000 pagados al factoring
      ...extra });
    const st = (r, id) => (r.evals.find((e) => e.r.id === id) || {}).st;
    const val = (r, id) => (r.evals.find((e) => e.r.id === id) || {}).v;

    // (a) UNA OPERACIÓN NORMAL PASA LOS TRES. M$100 contra M$500 comprados = 0,20× (≤ 1,3),
    //     contra M$800 de venta = 0,13 (< 1,0), y M$100 ≤ M$300. Con la unidad rota, los tres
    //     daban 1.000.000× más y NINGUNO se cumplía.
    const normal = verifDecision(par(), [{ monto: 100 * MMF, venc: 40 }]);
    const pasaOk = st(normal, "V03") === "ok" && st(normal, "V04") === "ok" && st(normal, "V09") === "ok"
      && normal.requiere === false;

    // (b) Y SIGUEN DISCRIMINANDO: el criterio existe para poner un techo, así que por encima
    //     del umbral tiene que fallar. M$400 > M$300 → V09 no; y 400/500 = 0,80× sigue bajo 1,3.
    const alto = verifDecision(par(), [{ monto: 400 * MMF, venc: 40 }]);
    const techoOk = st(alto, "V09") === "no" && st(alto, "V03") === "ok" && alto.requiere === true;

    // (c) EL BORDE ESTÁ DONDE LA POLÍTICA LO PONE, no un millón más acá: V09 es ≤ M$300.
    const justo = verifDecision(par(), [{ monto: 300 * MMF, venc: 40 }]);
    const pasado = verifDecision(par(), [{ monto: 300 * MMF + 1, venc: 40 }]);
    const bordeOk = st(justo, "V09") === "ok" && st(pasado, "V09") === "no";

    // (d) V10 TAMBIÉN: > M$1.000 pagados. Un par con M$900 no la supera; con M$1.100 sí.
    const pocoPago = verifDecision(par({ mntPagoDeudor3M: 900 * MMF }), [{ monto: 100 * MMF, venc: 40 }]);
    const hartoPago = verifDecision(par({ mntPagoDeudor3M: 1100 * MMF }), [{ monto: 100 * MMF, venc: 40 }]);
    const v10Ok = st(pocoPago, "V10") === "no" && st(hartoPago, "V10") === "ok";

    // (e) LOS VALORES QUE SE MUESTRAN SON LOS DEL DATO: V09 y V10 son montos y se abrevian con el
    //     único formateador (`fmtMM`). Con la unidad rota, «M$100» se mostraba como «$100M».
    const eV09 = normal.evals.find((e) => e.r.id === "V09");
    const fmtOk = val(normal, "V09") === 100 * MMF && eV09.r.fmt(eV09.v) === fmtMM(100 * MMF)
      && /M\$300/.test(eV09.r.thr);

    // (f) EL PAR SALE DEL ACTIVO EN PESOS, medido sobre las filas REALES del A10. El layout trae
    //     MILES (sufijo `_M`), así que el valor leído tiene que ser 1.000x la celda —y no 1/1.000x,
    //     que es lo que hacía—. Se compara contra el activo y no contra un orden de magnitud: un
    //     umbral suelto («>= 1e6») lo pasaría también una conversión equivocada por 10.
    let activoOk = false, muestra = "(sin A10)";
    {
      const V = typeof VERIFICACION !== "undefined" ? VERIFICACION
        : (typeof window !== "undefined" ? window.VERIFICACION : null);
      if (V && V.filas && V.filas.length) {
        const ixv = {}; V.campos.forEach((c, i) => (ixv[c] = i));
        let n = 0, cal = 0;
        for (const fl of V.filas.slice(0, 200)) {
          const pr = verifPar(fl[ixv.RUT_CLIENTE], fl[ixv.RUT_DEUDOR], fl[ixv.RUT_DEUDOR]);
          if (!pr || pr.mntCompraOp3M == null) continue;
          n++;
          if (pr.mntCompraOp3M === Math.round(+fl[ixv.V03_MNT_COMPRA_3M_M] * 1000)
            && pr.avgVentaProm3M === Math.round(+fl[ixv.V04_VENTA_PROM_3M_M] * 1000)
            && pr.mntPagoDeudor3M === Math.round(+fl[ixv.V10_MNT_PAGADO_3M_M] * 1000)) cal++;
        }
        activoOk = n > 0 && cal === n;
        muestra = cal + "/" + n + " filas del A10 calzan MILES x1000";
      }
    }

    ok("115 el predictor de verificaci\u00f3n compara PESOS contra PESOS, no pesos contra millones",
       pasaOk && techoOk && bordeOk && v10Ok && fmtOk && activoOk,
       `operaci\u00f3n normal pasa V03/V04/V09 ${pasaOk} (V03 ${val(normal, "V03")}\u00d7 \u00b7 V04 ${val(normal, "V04")}) \u00b7 techo por monto sigue discriminando ${techoOk} \u00b7 borde en M$300 exacto ${bordeOk} \u00b7 V10 sobre M$1.000 ${v10Ok} \u00b7 se muestra con fmtMM ${fmtOk} (${eV09.r.fmt(eV09.v)}) \u00b7 el par del activo viene en pesos ${activoOk} (${muestra})`);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 116 · regla 2 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // NNN · NOTA DEUDOR 1–5 (regla de dominio 2). La nota es un DATO del A11 (`notaDeudor` lee
  // `NOTA_COMPORTAMIENTO` de Plataforma 360), va de 1 a 5 con 5 = mejor pagador, y es lo que decide
  // en tres sitios: el color de la UI (`NOTA_COLOR`), la política de compra (nota ≥ `notaMinCompra`
  // del tenant, reglas D01/C09) y el segmento de verificación (`NOTA_PRIORITARIA = 4,2` abre el
  // protocolo recortado). El score 0–99 que la regla dice que se reemplazó NO decide nada: lo que
  // queda de él es `sc`, una derivada de la nota que ningún criterio consume (sonda abajo).
  {
    const ix = P360.ix, ixN = ix.NOTA_COMPORTAMIENTO;
    const rank = (c) => ({ "#0a7d3f": 2, "#C2410C": 1, "#EF4444": 0 })[c];

    // (a) RANGO Y SENTIDO. Todo el maestro trae la nota en [1, 5]; sin dato es `null` —nunca 0 ni
    //     NaN, que `tramoNota` rotularía distinto—; y «5 = mejor» se ve en que color y tramo son
    //     monótonos en la nota, verde/A arriba y rojo/D abajo.
    const notas = Object.values(P360.porRut).map((f) => +f[ixN]).filter((n) => n > 0);
    const fuera = notas.filter((n) => n < 1 || n > 5).length;
    const rangoOk = notas.length > 100 && fuera === 0;
    let mono = true;
    for (let d = 11; d <= 50; d++) if (rank(NOTA_COLOR(d / 10)) < rank(NOTA_COLOR((d - 1) / 10))) mono = false;
    const colorOk = mono && rank(NOTA_COLOR(5)) === 2 && rank(NOTA_COLOR(1)) === 0;   // la regla fija monotonía y extremos (verde arriba, rojo abajo), no los cortes: alinear NOTA_COLOR con notaMinCompra no debe romper el gate
    const tramoOk = tramoNota(5) === "A" && tramoNota(4.6) === "B" && tramoNota(3.7) === "B" && tramoNota(3.69) === "C"
      && tramoNota(3.2) === "C" && tramoNota(1) === "D" && tramoNota(null) === "D";

    // Sembrar una fila del maestro para un RUT que NO está en ninguna lista (tipo «Otro»): es la
    // única forma de fijar la nota de un deudor no prime sin depender de qué trae el archivo.
    const CLI = "76.222.222-2";
    const sembrados = [], swaps = [], claves = [];
    const sembrar = (rut, nota) => { const f = []; f[ix.RUT] = rut; f[ix.RAZON_SOCIAL] = "SONDA-" + rut; f[ixN] = nota; if (P360.porRut[rut]) swaps.push([rut, P360.porRut[rut]]); else sembrados.push(rut); P360.porRut[rut] = f; };
    const par = (rut) => { const nombre = "SONDA-" + rut; claves.push(CLI + "|" + rut + "|" + nombre); return verifPar(CLI, nombre, rut); };
    // Lo que hace falta para que un par PASE los criterios del recortado (V04, V05, V07, V08, V10) y
    // deje sin dato los del completo (V02, V03): así el segmento es lo único que cambia el veredicto.
    const llenar = (p) => ({ ...p, protocolo: { existe: false, id: null }, avgVentaProm3M: 1e9, mesesConVenta6M: 6, pctMora25d: 0, pctReclamadas: 0, mntPagoDeudor3M: 5000 * MMF });
    const fs = [{ monto: 40 * MMF, venc: 45 }];
    const veredicto = (r) => JSON.stringify({ requiere: r.requiere, motivo: r.motivo, fallidas: r.fallidas.map((x) => x.r ? x.r.id : x) });

    let nulOk = false, corteOk = false, dosPobOk = false, inboundOk = false, scoreOk = false, tipoEn = "", tipoPrime = "";
    let dEn = null, dSobre = null, notaPrimeSembrada = null;
    const guardado = { ...CFG_ACTIVA };
    const filaBajoOrig = P360.porRut[bajo.rut];   // referencia original, para comprobar la restauración
    let d37 = null, d369 = null, c37 = null, c369 = null, d37b = null, d45 = null, nivelExc = null;
    try {
      // (a-bis) sin dato → null (el 0 y el texto no son una nota)
      sembrar("99.999.999-0", 0); sembrar("99.999.999-9", "s/n");
      nulOk = notaDeudor("", "99.999.999-0") === null && notaDeudor("", "99.999.999-9") === null && notaDeudor("", "00.000.000-0") === null;

      // (d) NOTA_PRIORITARIA ES UN CORTE ESTRICTO (`>`): 4,20 NO abre el recortado, 4,21 sí.
      sembrar("99.999.999-1", 4.2); sembrar("99.999.999-2", 4.21); sembrar("99.999.999-3", 1.5);
      const pEn = par("99.999.999-1"), pSobre = par("99.999.999-2"), pBajo = par("99.999.999-3");
      tipoEn = pEn.tipo;
      corteOk = NOTA_PRIORITARIA === 4.2
        && pEn.tipo === "Otro" && pSobre.tipo === "Otro" && pBajo.tipo === "Otro"      // ninguno es prime: lo único que los separa es la nota
        && pEn.nota === 4.2 && pSobre.nota === 4.21 && pBajo.nota === 1.5                 // verifPar lee la nota del maestro
        && pEn.recortado === false && pEn.segmento === "OTROS" && pEn.grupo === "otros"
        && pSobre.recortado === true && pSobre.segmento === "PRIME" && pSobre.grupo === "nota_alta"
        && pBajo.recortado === false
        && pSobre.aplican === VERIF_APLICAN_RECORTADO && pEn.aplican === VERIF_APLICAN_COMPLETO
        && VERIF_APLICAN_RECORTADO.filter((id) => id !== "V00").length === 6 && VERIF_APLICAN_COMPLETO.length === VERIF_RULES.length;
      // …y el corte cambia el VEREDICTO, no sólo una etiqueta: el mismo par «limpio» pasa por el
      // recortado y cae por el completo (V02 sin dato = incumplimiento, §4.3).
      dSobre = verifDecision(llenar(pSobre), fs); dEn = verifDecision(llenar(pEn), fs);
      corteOk = corteOk && dSobre.requiere === false && dEn.requiere === true && dEn.fallidas.some((x) => x.r.id === "V02");

      // (d-bis) DOS POBLACIONES, basta pertenecer a una: un PRIME con nota 1,5 también va al recortado.
      //     Se pisa temporalmente la fila real del deudor de lista blanca de MENOR nota.
      sembrar(bajo.rut, 1.5);
      const pPrime = par(bajo.rut); tipoPrime = pPrime.tipo; notaPrimeSembrada = pPrime.nota;
      dosPobOk = pPrime.prime === true && pPrime.nota === 1.5 && pPrime.recortado === true && pPrime.grupo === "prime" && pPrime.aplican === VERIF_APLICAN_RECORTADO;

      // (d-ter) El MISMO corte abre oportunidad en el inbound: un «Otro» sin bucket abre sólo con nota > 4,2.
      inboundOk = deudorAbreOportunidad({ inboundBucket: "OTRO", pagador: "SONDA-99.999.999-2", rutRecep: "99.999.999-2" }) === true
        && deudorAbreOportunidad({ inboundBucket: "OTRO", pagador: "SONDA-99.999.999-1", rutRecep: "99.999.999-1" }) === false;

      // (b) SONDA: DECIDE LA NOTA, NO EL SCORE. `sc` (20–99, derivada de la nota) se altera a los dos
      //     extremos y el veredicto no se mueve; alterar la NOTA por debajo del corte sí lo mueve.
      const base = llenar(pSobre);
      const conSc0 = verifDecision({ ...base, sc: 0 }, fs), conSc99 = verifDecision({ ...base, sc: 99 }, fs);
      scoreOk = veredicto(conSc0) === veredicto(conSc99) && veredicto(conSc0) === veredicto(dSobre)
        && pSobre.sc === Math.round(20 + (pSobre.nota - 1) / 4 * 79) && pSobre.sc >= 20 && pSobre.sc <= 99;   // notaFromScore no existe en el fuente: se corrige el texto de la regla (hallazgo); el gate no fija su ausencia

      // (c) POLÍTICA DE COMPRA: nota ≥ notaMinCompra, y el umbral es del TENANT. D01 (deudor) y C09
      //     (cliente) aprueban EN el borde y levantan excepción un centésimo por debajo; movida la
      //     perilla a 4,5, el 3,7 que aprobaba pasa a excepción — la regla lee `pol`, no un literal.
      const D01 = REGLAS_CLIENTE.find((r) => r.cond === "D01"), C09 = REGLAS_CLIENTE.find((r) => r.cond === "C09");
      aplicarCfgActiva({ ...guardado, notaMinCompra: 3.7 });
      const padNota = padronAprobadores();
      d37 = evalReglaCli(D01, { dNota: 3.7 }, padNota); d369 = evalReglaCli(D01, { dNota: 3.69 }, padNota);
      c37 = evalReglaCli(C09, { notaCliente: 3.7 }, padNota); c369 = evalReglaCli(C09, { notaCliente: 3.69 }, padNota);
      aplicarCfgActiva({ ...guardado, notaMinCompra: 4.5 });
      d37b = evalReglaCli(D01, { dNota: 3.7 }, padNota); d45 = evalReglaCli(D01, { dNota: 4.5 }, padNota);
      nivelExc = d369.nivel;
    } finally {
      aplicarCfgActiva(guardado);
      for (const r of sembrados) delete P360.porRut[r];
      for (const [r, fila] of swaps) P360.porRut[r] = fila;
      for (const k of claves) _VERIF_PAR.delete(k);
    }
    const politicaOk = pol("notaMinCompra", 3.7) === guardado.notaMinCompra && CFG_OPER_BASE.notaMinCompra === 3.7
      && d37 && d37.disp === "aprobado" && d369 && d369.disp === "excepcion"
      && c37 && c37.disp === "aprobado" && c369 && c369.disp === "excepcion"
      && d37b && d37b.disp === "excepcion" && d45 && d45.disp === "aprobado"
      && ["D01", "C09"].every((c) => REGLAS_CLIENTE.find((r) => r.cond === c).area === "riesgo");
    const restauradoOk = P360.porRut["99.999.999-2"] === undefined && P360.porRut[bajo.rut] === filaBajoOrig
      && CFG_ACTIVA.notaMinCompra === guardado.notaMinCompra
      && !_VERIF_PAR.has(claves[0]);

    ok("116 la Nota Deudor es 1–5 con 5 = mejor: decide la nota y no el score, la compra exige notaMinCompra del tenant y > 4,2 abre el protocolo recortado",
       rangoOk && nulOk && colorOk && tramoOk && corteOk && dosPobOk && inboundOk && scoreOk && politicaOk && restauradoOk,
       `maestro ${notas.length} notas en [1,5], ${fuera} fuera · sin dato → null ${nulOk} · color monótono verde≥4/ámbar≥3/rojo ${colorOk} · tramos A>4,6 B≥3,7 C≥3,2 D ${tramoOk}`
       + ` · corte ${NOTA_PRIORITARIA} estricto: 4,20 (${tipoEn}) → completo requiere ${dEn && dEn.requiere}, 4,21 → recortado requiere ${dSobre && dSobre.requiere}`
       + ` · prime (${tipoPrime}) con nota ${notaPrimeSembrada} → recortado ${dosPobOk} · inbound abre sólo > 4,2 ${inboundOk}`
       + ` · sc 0 y 99 → mismo veredicto ${scoreOk} (notaFromScore ${typeof notaFromScore})`
       + ` · D01/C09 con 3,7: 3,70→${d37 && d37.disp} 3,69→${d369 && d369.disp} N${nivelExc}; con 4,5: 3,70→${d37b && d37b.disp} 4,50→${d45 && d45.disp}`
       + ` · restaurado ${restauradoOk}`);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 117 · regla 5 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · PÉRDIDA ES ESTADO TERMINAL (regla de dominio 5, spec Perdida v1.0).
  //    Causa ESPECÍFICA siempre (`causaPerdidaDeal`, nunca el genérico «no superó reglas de
  //    otorgamiento»), etapa de ORIGEN (`etapaPerdida`), desenlace cerrado (`dealResult`), tareas
  //    cerradas en cascada (`generarTareasConsolidadas`) y prioridad atendida sola
  //    (`estadoAtencionPrioridad`). La pérdida va al FONDO del orden y ninguna etapa la sucede.
  //    El escritor del rechazo manual (`reject`) vive dentro de `PipelineComercial`, así que sus líneas
  //    de derivación de la causa se LEEN del fuente embebido en la página y se evalúan con las funciones
  //    reales: el caso sigue a `reject` si cambia, en vez de copiarlo a mano.
  //    Lo que la regla dice y el código NO hace va en un segundo `ok`, aparte, que queda en FALLA y
  //    nombra el defecto (rechazo sin motivo, genérico que el lector deja pasar, actor de la bitácora).
  {
    const GENERICO = /no super[oó] (las )?reglas de otorgamiento/i;
    const RUT5 = "76.111.111-1";
    const base5 = (id, extra) => ({ id, rutEmisor: RUT5, cliente: "Cliente " + id, monto: 40 * MMF, facturas: 1, exec: "CR",
      facturasOp: [fac("p5", LB[0], 40)], deudores: [{ name: nomDe(LB[0]), facturas: 1, monto: 40 * MMF }], ...(extra || {}) });

    // El fuente, tal como lo transpila la página, y las líneas de `reject` que derivan la causa
    // (`const bi = …` hasta `const causa = …`), compiladas contra las globales reales.
    const fuente5 = (() => { const s = document.querySelector('script[type="text/babel"]'); return s ? s.textContent : ""; })();
    const rejectDe = (() => {
      const i = fuente5.indexOf("const reject = (id, closeReason, extra) => {"); if (i < 0) return null;
      const cuerpo = fuente5.slice(i, fuente5.indexOf("\n  };", i));
      const a = cuerpo.indexOf("const bi = bloqueoFirmeInfo(d);"), b = cuerpo.indexOf("const causa = ");
      if (a < 0 || b < 0) return null;
      try { return new Function("d", "closeReason", "extra", cuerpo.slice(a, cuerpo.indexOf("\n", b)) + "\nreturn { bi, cr, motivo, causa };"); } catch (_) { return null; }
    })();
    // Lo que el escritor escribe con lo que derivó (los campos de la L23434 que la regla nombra).
    const perderPor = (d, closeReason, extra) => { const r = rejectDe(d, closeReason, extra); return { ...d, stage: "perdida", etapaPerdida: d.stage, perdidaOtorg: !!r.bi, closeReason: r.cr, motivoPerdida: r.motivo, causaPerdida: r.causa, status: r.causa, perdidaPor: "Carla Rojas", fechaPerdida: "x" }; };
    const viva5 = base5("T5v", { stage: "oferta", status: STATUS_ETAPA.oferta });

    if (!rejectDe) {
      ok("117 pérdida es estado terminal: causa específica, etapa de origen, desenlace cerrado y tareas en cascada", false, "no encuentro `const reject = (id, closeReason, extra) => {` con `const bi = bloqueoFirmeInfo(d);` … `const causa = ` en el fuente embebido: el caso no puede derivar el rechazo manual");
    } else {
    // (a) CAUSA ESPECÍFICA por cada camino que escribe una pérdida. El rechazo manual se DERIVA de
    //     `reject` con el motivo que pasa el modal de rechazo (L9949: cedida a la competencia, con
    //     competidor y tasa) y con el motivo de inactividad; las otras tres formas reproducen los campos
    //     que graban los escritores automáticos (cesión AECSync · oferta no aceptada · contactabilidad
    //     agotada — el gate de contrato vigila su texto); la quinta —bloqueo firme— se deriva del motor.
    const rechazo = perderPor({ ...viva5, id: "T5a" }, "competitor", { competidor: "Tanner Servicios Financieros", tasaCierre: "1,2" });
    const perdidas = {
      rechazo,
      cesion: base5("T5b", { stage: "perdida", etapaPerdida: "prospeccion", perdidaCesion: true, cedidaCompetidor: "Tanner Servicios Financieros", status: "Perdido · facturas financiadas por Tanner Servicios Financieros" }),
      noAcepto: base5("T5c", { stage: "perdida", etapaPerdida: "oferta", status: "Perdido · el cliente no aceptó la oferta" }),
      sinContacto: base5("T5d", { stage: "perdida", etapaPerdida: "prospeccion", contactable: false, status: "" }),
    };
    const causas = Object.fromEntries(Object.entries(perdidas).map(([k, d]) => [k, causaPerdidaDeal(d)]));
    // Sin bloqueo firme, la causa del rechazo es la etiqueta del motivo + competidor + tasa, y no es el
    // status de la operación viva; cada motivo del catálogo tiene etiqueta y desenlace (lost | expired).
    const rechazoOk = !rechazo.perdidaOtorg && rechazo.closeReason === "competitor" && rechazo.motivoPerdida === "cliente_declino"
      && rechazo.causaPerdida === `${closeReasonLabel("competitor")} · Tanner Servicios Financieros · tasa de cierre 1,2%`
      && !Object.values(STATUS_ETAPA).includes(rechazo.causaPerdida)
      && perderPor({ ...viva5, id: "T5a2" }, "price_rate").causaPerdida === closeReasonLabel("price_rate")
      && CLOSE_REASONS.every((r) => r.label && !GENERICO.test(r.label) && ["lost", "expired"].includes(r.result));
    const especificaOk = rechazoOk && causas.rechazo === rechazo.causaPerdida
      && /Tanner Servicios Financieros/.test(causas.cesion) && /Cesión externa/i.test(causas.cesion)
      && causas.noAcepto === "El cliente no aceptó la oferta"
      && /Sin contacto/i.test(causas.sinContacto)
      && Object.values(causas).every((c) => c && !GENERICO.test(c) && c !== "Oportunidad perdida" && !Object.values(STATUS_ETAPA).includes(c));

    // SONDA · el bloqueo firme MANDA sobre un status genérico plantado. C30 «TGR cobranza judicial»
    //     (#130) es knockout no re-evaluable; se inyecta por `estado.versiones` como en el caso 56.
    const ko5 = base5("T5e", { stage: "perdida", etapaPerdida: "oferta", status: "No superó reglas de otorgamiento" });
    const vars5 = apiVarsCliente(ko5, 0);
    const conKO = { versiones: { T5e: [{ vars: { ...vars5, tgrCobrJud: 5e6 } }] }, visado: {} };
    const sinKO = { versiones: { T5e: [{ vars: { ...vars5, tgrCobrJud: 0 } }] }, visado: {} };
    const causaKO = causaPerdidaDeal(ko5, conKO);
    const causaSin = causaPerdidaDeal(ko5, sinKO);
    const bi5 = bloqueoFirmeInfo(ko5, conKO);
    const sondaOk = !!bi5 && bi5.ids.includes(130) && /^Bloqueo firme: /.test(causaKO) && /#130/.test(causaKO)
      && !GENERICO.test(causaKO)
      // sin bloqueo, el motor no inventa uno: la causa deja de nombrar la regla (qué devuelve entonces
      // con un genérico plantado lo mide el segundo `ok`: hoy lo deja pasar, y es un defecto)
      && !bloqueoFirmeInfo(ko5, sinKO) && !/^Bloqueo firme: /.test(causaSin)
      // y un bloqueo firme sobre una operación VIVA es lo que la manda a pérdida (otorgBloqueado),
      // mientras que una ya perdida no se re-evalúa (su etapa no está en la lista del predicado)
      && otorgBloqueado({ ...ko5, stage: "oferta" }, conKO) === true && otorgBloqueado(ko5, conKO) === false;

    // (b) ETAPA DE ORIGEN: `etapaPerdida` es un id GUARDADO y se rotula con `stageName`, no con la
    //     operación; el embudo (`skEtapa`) la lee y la colapsa a las dos etapas comerciales. Sin origen
    //     grabado lo deriva de la causa en vez de reventar. El rechazo derivado graba la etapa viva.
    const origenOk = rechazo.etapaPerdida === "oferta" && skEtapa(perdidas.cesion) === "prospeccion" && skEtapa(perdidas.rechazo) === "oferta"
      && skEtapa(base5("T5f", { stage: "perdida", etapaPerdida: "aceptadas" })) === "oferta"
      && stageName(perdidas.cesion.etapaPerdida) === stageName("prospeccion")
      && skEtapa(base5("T5g", { stage: "perdida", status: "Perdido · el cliente no aceptó la oferta" })) === "oferta"
      && skEtapa(base5("T5h", { stage: "perdida" })) === "prospeccion"
      && skEtapa(base5("T5i", { stage: "oferta" })) === "oferta";

    // (c) TERMINAL. Desenlace cerrado (lost/expired, nunca won ni abierta), al FONDO del orden, sin
    //     estado posterior a la firma, rotulada con el catálogo del tenant, y NINGUNA etapa la sucede:
    //     `perdida` es la última de `STAGE_ORDER`, así que el selector «Avanzar a» —que sólo ofrece
    //     etapas posteriores— no le deja destino. (La otra puerta —el arrastre del Kanban y
    //     `moverEtapa`— no tiene función pura: la vigila el gate de contrato, y hoy está abierta.)
    const abierta = base5("T5j", { stage: "oferta" });
    // El desenlace distingue lo PERDIDO de lo EXPIRADO (sin contacto, caducada), y los dos cierran.
    const caducada = perderPor({ ...viva5, id: "T5k" }, "inactivity");
    const desenlaceOk = [perdidas.rechazo, perdidas.cesion, perdidas.noAcepto].every((d) => dealResult(d) === "lost")
      && dealResult(perdidas.sinContacto) === "expired"
      && caducada.causaPerdida === closeReasonLabel("inactivity") && dealResult(caducada) === "expired"
      && [...Object.values(perdidas), caducada].every((d) => dealStatus(d) === "closed" && dealDisbursement(d) === null)
      && dealResult(abierta) === null && dealStatus(abierta) === "open";
    const fondoOk = Object.values(perdidas).every((d) => prioridadDeDeal(d) === -1 && estadoOperacion(d) === null && etapaDeDeal(d) === stageName("perdida") && !fueraDelTubo(d))
      && ordenarOportunidades([perdidas.rechazo, base5("T5l", { stage: "prospeccion", simulado: false })]).map((d) => d.id).join(",") === "T5l,T5a";
    const ultimaOk = STAGE_ORDER[STAGE_ORDER.length - 1] === "perdida"
      && STAGES.filter((st) => STAGE_ORDER.indexOf(st.id) > STAGE_ORDER.indexOf("perdida")).length === 0
      && stageById("perdida").dot === C.red;
    const terminalOk = desenlaceOk && fondoOk && ultimaOk;

    // (d) CIERRE EN CASCADA: la misma operación con una conversación PENDIENTE —lo más accionable que
    //     hay: tarea crítica «responder»— produce su tarea mientras está viva y NINGUNA una vez
    //     perdida; y la prioridad de curse se da por atendida sola, nombrando la causa.
    const viva = base5("T5m", { stage: "oferta", waPendiente: true });
    const muerta = { ...viva, id: "T5n", stage: "perdida", etapaPerdida: "oferta", causaPerdida: "El cliente rechazó la oferta" };
    const tareasDe = (d) => generarTareasConsolidadas([d]).filter((t) => t.fuente === "pipeline" && t.dealId === d.id);
    const tViva = tareasDe(viva), tMuerta = tareasDe(muerta);
    const vivaSinBloqueo = !bloqueoFirmeInfo(viva);
    const cascadaOk = vivaSinBloqueo && tViva.length === 1 && tViva[0].cat === "responder" && tViva[0].prio === "critica"
      && tMuerta.length === 0
      && estadoAtencionPrioridad(viva).atendida === false
      && estadoAtencionPrioridad(muerta).atendida === true && estadoAtencionPrioridad(muerta).detalle === muerta.causaPerdida
      && estadoAtencionPrioridad(perdidas.cesion).k === "cedida" && /Tanner/.test(estadoAtencionPrioridad(perdidas.cesion).detalle);

    // (e) BORDES: sin operación no hay causa que reventar.
    let bordeOk = true;
    try { bordeOk = causaPerdidaDeal(null) === "Oportunidad perdida" && dealResult(null) === null && dealResult({}) === null; } catch (_) { bordeOk = false; }

    ok("117 pérdida es estado terminal: causa específica, etapa de origen, desenlace cerrado y tareas en cascada",
       especificaOk && sondaOk && origenOk && terminalOk && cascadaOk && bordeOk,
       `causas ${especificaOk} (rechazo derivado de reject «${rechazo.causaPerdida}» ${rechazoOk} · «${causas.cesion.slice(0, 40)}…» · «${causas.noAcepto}» · «${causas.sinContacto.slice(0, 12)}…») · sonda: genérico plantado + C30 → «${causaKO.slice(0, 44)}…» ${sondaOk} · origen ${origenOk} · terminal ${terminalOk} (desenlace ${desenlaceOk} · al fondo ${fondoOk} · última de STAGE_ORDER ${ultimaOk} · «${etapaDeDeal(perdidas.rechazo)}») · cascada viva ${tViva.length} tarea(s) → perdida ${tMuerta.length} ${cascadaOk} · bordes ${bordeOk}`);

    // ── Lo que la regla 5 nombra y el código NO cumplía hasta el 17-09-2026 (lo destapó la refutación del gate y
    //    se corrigió en el mismo commit). Cada parte se mide y se nombra por separado.
    // (1) «Cerrar oportunidad» por tarifa bajo el piso (L9401) llama `onReject(deal.id)` SIN motivo y
    //     sin bloqueo firme; `reject` cae a `causaPerdidaDeal(d)` sobre la operación VIVA, que devuelve
    //     su status: la causa grabada queda «En oferta y negociación» (o «En prospección»), que es la
    //     etapa en que estaba y no por qué se perdió. La regla pide causa específica SIEMPRE.
    const sinMotivo = perderPor({ ...viva5, id: "T5p" });
    const sinMotivoProsp = perderPor({ ...viva5, id: "T5q", stage: "prospeccion", status: STATUS_ETAPA.prospeccion });
    const esEspecifica = (c) => !!c && !GENERICO.test(c) && c !== "Oportunidad perdida" && !Object.values(STATUS_ETAPA).includes(c);
    const rechazoSinMotivoOk = !sinMotivo.perdidaOtorg && esEspecifica(sinMotivo.causaPerdida) && esEspecifica(sinMotivoProsp.causaPerdida);
    // Todo call site de `onReject(` del detalle lleva motivo, salvo que esté detrás de `otorgBloqueado(deal) ?`
    // —en la misma línea (botón Rechazar) o en la rama que abre unas líneas antes (`panelAcciones`)—: ahí
    // el motivo lo deriva `reject` del bloqueo firme. Se nombra cada uno por el rótulo de su botón.
    // La ventana es de 12 líneas y no de 6 desde el formateo del fuente (ADR-0005): el `onClick` de ese
    // botón pasó a ocupar cuatro líneas propias, así que la apertura de la rama quedó 9 líneas más arriba.
    const lineasF = fuente5.split("\n");
    const callSites = lineasF.map((l, i) => [i, l]).filter(([, l]) => /\bonReject\(deal\.id/.test(l));
    const rotulo = (l) => { const m = l.match(/>\s*([^<>{}]+?)\s*<\/button>/); return m ? m[1] : l.trim().slice(0, 40); };
    const sinMotivoEnFuente = callSites.filter(([i, l]) => !/\bonReject\(deal\.id, /.test(l) && !lineasF.slice(Math.max(0, i - 12), i + 1).some((x) => /otorgBloqueado\(deal\) \? /.test(x))).map(([, l]) => `«${rotulo(l)}»`);
    const callSitesOk = callSites.length >= 4 && sinMotivoEnFuente.length === 0;
    // (2) El LECTOR deja pasar el genérico: con un status «No superó reglas de otorgamiento» y sin
    //     bloqueo firme, `causaPerdidaDeal` lo devuelve verbatim (su propio comentario dice «nunca el genérico»).
    const lectorOk = !GENERICO.test(causaSin) && !GENERICO.test(causaPerdidaDeal(base5("T5r", { stage: "perdida", status: "No superó reglas de otorgamiento" })));
    // (3) ACTOR: `reject` graba `perdidaPor` (quien rechazó), pero la bitácora estampa «Sistema» en toda
    //     pérdida, incluida la manual. El evento terminal de `bitacoraDe` tiene que nombrar al actor grabado.
    const evPerdida = (bitacoraDe(rechazo) || []).filter((x) => x.seq === 9999 || x.accion === rechazo.status);
    const actorOk = evPerdida.length >= 1 && evPerdida.every((x) => x.actor === rechazo.perdidaPor);
    ok("118 la pérdida terminal, segunda mitad: el rechazo sin motivo graba una causa específica, el lector no deja pasar el genérico y la bitácora nombra al actor",
       rechazoSinMotivoOk && callSitesOk && lectorOk && actorOk,
       `(1) reject sin motivo ni bloqueo → causa «${sinMotivo.causaPerdida}» / «${sinMotivoProsp.causaPerdida}» específica ${rechazoSinMotivoOk} · call sites de onReject(deal.id: ${callSites.length}, sin motivo ${sinMotivoEnFuente.join(", ") || "ninguno"} ${callSitesOk} · (2) lector con el genérico plantado → «${causaSin.slice(0, 40)}» ${lectorOk} · (3) bitácora: actor «${evPerdida.map((x) => x.actor).join("/") || "—"}» vs perdidaPor «${rechazo.perdidaPor}» ${actorOk}`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 119 · regla 8 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · REGLA 8 · OFERTA — PROXY. Las dos primeras cláusulas («cerrar» es prerequisito de publicar;
  //    el Agente IA es opcional) ya las fijan los casos 31 y 32 sobre `ofertaPublicada`. La tercera
  //    («fuera de atribución si el cliente pide tasa bajo el mínimo del deudor») NO tiene predicado en el
  //    fuente —lo documenta `sonda_clausula_cliente.js`, que queda en FALLA a propósito—. Este caso fija
  //    lo que SÍ existe y de lo que esa cláusula depende:
  //    (b) el MÍNIMO del deudor es `tasaMinIA` = `spreadMinDeudor` (piso de riesgo) + costo de fondo del
  //        TENANT; un deudor que la tabla no conoce tiene piso ≥ que todos los listados; y la contactabilidad
  //        viaja con ese piso (`spreadMinNeg`), que es la entrada que un predicado futuro tendría que leer;
  //    (c) la ESCALERA de atribución (`evalAtribucion` → `atribResumen`) decide con los umbrales del tenant
  //        —descEjec / descMax / tasaMinAbsoluta inyectados y que CONTRADICEN el default 10 / 16 / 0,78—;
  //    (d) el MOTOR la aplica: O01 «Spread dentro de Banda» (regla 301, área comercial) mide la tasa aplicada
  //        contra la tasa de referencia del deudor (spread sugerido + costo de fondo) con la misma escalera.
  //        Se afirma sólo lo que las dos lecturas de la regla comparten: dentro de la banda Y sobre el mínimo
  //        → aprobado; bajo la banda (esté o no bajo el mínimo) → excepción; bajo el mínimo absoluto →
  //        excepción; sin simular → no se pronuncia (regla 14). La zona «dentro de la banda pero bajo el
  //        mínimo del deudor» —que aparece cuando el sugerido queda topado— se MIDE y se informa, no se
  //        fija (hallazgo 2: el piso del deudor hoy es techo del Agente, no del ejecutivo).
  {
    const guardado = { ...CFG_ACTIVA };
    const restaurar = () => aplicarCfgActiva(guardado);
    let pisoOk = false, escaleraOk = false, motorOk = false, det = "";
    try {
      // (b) mínimo del deudor = piso del deudor + costo de fondo del TENANT (dos costos que contradicen el default)
      const deudorK = Object.keys(SPREAD_MIN_DEUDOR).sort((a, b) => SPREAD_MIN_DEUDOR[a] - SPREAD_MIN_DEUDOR[b] || a.localeCompare(b))[0];
      const pisoK = spreadMinDeudor(deudorK);
      const desconocido = "Deudor Que La Tabla No Conoce SpA";
      aplicarCfgActiva({ ...guardado, costoFondo: 1.23 }); const minAlto = tasaMinIA(deudorK);
      aplicarCfgActiva({ ...guardado, costoFondo: 0.31 }); const minBajo = tasaMinIA(deudorK);
      restaurar();
      const contacto = generarContactabilidad("Cliente T8", "WhatsApp", deudorK);
      pisoOk = Object.values(SPREAD_MIN_DEUDOR).every((p) => p <= spreadMinDeudor(desconocido)) && pisoK < spreadMinDeudor(desconocido)
        && minAlto === +(pisoK + 1.23).toFixed(2) && minBajo === +(pisoK + 0.31).toFixed(2) && minAlto !== minBajo
        && tasaMinIA(desconocido) > tasaMinIA(deudorK)
        && contacto.spreadMinNeg === pisoK; // el contacto viaja con el piso del deudor, no con uno propio

      // (c) escalera con umbrales del tenant que contradicen el default (10 / 16 / 0,78)
      aplicarCfgActiva({ ...guardado, descEjec: 7, descMax: 12, tasaMinAbsoluta: 0.50 });
      const ref = 2.00;
      const t = (pct) => +(ref * (1 - pct / 100)).toFixed(4);
      const e = (n) => evalAtribucion(ref, n, ref, true).estado;
      const escalera = [ // [tasa nueva, estado esperado, rótulo]
        [ref, "ok", "0%"], [2.50, "ok", "sube"],                                 // subir la tasa no es descuento
        [t(7), "ok", "7%"], [t(7.5), "requiereJefe", "7,5%"],                    // con el default (10) el 7,5 sería «ok»
        [t(12), "requiereJefe", "12%"], [t(12.5), "requiereGerente", "12,5%"],   // con el default (16) el 12,5 sería «jefe»
        [0.49, "bajoMinimo", "0,49"], [0.50, "requiereGerente", "0,50"],         // el mínimo absoluto es estricto (<)
      ].map(([n, esp, rot]) => ({ rot, esp, obt: e(n) }));
      const comision = evalAtribucion(ref, 0.49, ref, false).estado;            // la comisión no tiene mínimo absoluto
      const resumen1 = atribResumen([{ estado: "ok" }, { estado: "requiereJefe" }]).estado;
      const resumen2 = atribResumen([{ estado: "requiereGerente" }, { estado: "bajoMinimo" }]).estado;
      escaleraOk = escalera.every((x) => x.obt === x.esp) && comision === "requiereGerente"
        && resumen1 === "requiereJefe" && resumen2 === "bajoMinimo";
      restaurar();

      // (d) el motor. Se inyecta la POLÍTICA del tenant entera para que la referencia no dependa de ella:
      //     spread de lista tal que el sugerido quede 0,30 puntos SOBRE el piso (no topado), y umbrales
      //     8 / 14 / 0,50 que contradicen el default. Así la banda del ejecutivo queda entera por encima
      //     del mínimo del deudor y cada punto de prueba es inequívoco en las dos lecturas de la regla.
      const fO = facOtro("o8", LB[0], 40); // deudor «NoPrime-…»: no está en la tabla → piso por defecto
      const base8 = (tasa) => ({ id: "T8-" + tasa, rutEmisor: "76.222.222-2", cliente: "Cliente T8", monto: 40 * MMF, facturas: 1, exec: "CR", stage: "oferta",
        facturasOp: [fO], deudores: [{ name: fO.deudor, facturas: 1, monto: 40 * MMF }], simulado: tasa > 0, tasaDescuento: tasa });
      const pisoD = spreadMinDeudor(fO.deudor);
      const ajuste = guardado.sowAjuste[sowEstado(base8(0))].pts;
      const MARGEN = 0.30;
      aplicarCfgActiva({ ...guardado, spreadEstandar: +(pisoD + ajuste + MARGEN).toFixed(2), descEjec: 8, descMax: 14, tasaMinAbsoluta: 0.50 });
      const pp = paramsPricing();
      const sug = spreadSugerido(fO.deudor, base8(0), pp);
      const tasaRef = +(sug.spread + pp.costoFondo).toFixed(2);
      const minD = tasaMinIA(fO.deudor);
      const pisoBanda = +(tasaRef * (1 - pol("descEjec", 10) / 100)).toFixed(2); // borde de la banda del ejecutivo (umbral del tenant, vía pol)
      const est8 = { versiones: {}, visado: {} };
      const vo = (tasa) => varsOperacion(base8(tasa), () => 0);
      const o01 = (tasa) => evaluarOtorgItems(base8(tasa), est8).filter((it) => it.regla && it.regla.n === 301);
      const puntos = [ // [tasa, disp esperada, rótulo]  — todos inequívocos: la banda entera está sobre el mínimo
        [tasaRef, "aprobado", "ref"],
        [+(tasaRef * (1 - 4 / 100)).toFixed(2), "aprobado", "en banda y ≥ mín."],
        [+(tasaRef * (1 - 12 / 100)).toFixed(2), "excepcion", "bajo banda, ≥ mín."],
        [+(tasaRef * (1 - 26 / 100)).toFixed(2), "excepcion", "bajo banda y < mín."],
        [0.49, "excepcion", "< mín. absoluto"],
        [0, "aprobado", "sin simular"],
      ].map(([tasa, esp, rot]) => { const it = o01(tasa)[0]; return { tasa, rot, esp, it, obt: it ? it.disp : "?", bajoBanda: vo(tasa).spreadBajoBanda }; });
      const p = Object.fromEntries(puntos.map((x) => [x.rot, x]));
      const geometria = sug.topado === false && sug.spread === +(pisoD + MARGEN).toFixed(2) && tasaRef > minD && pisoBanda > minD
        && p["en banda y ≥ mín."].tasa >= minD && p["bajo banda, ≥ mín."].tasa >= minD && p["bajo banda, ≥ mín."].tasa < pisoBanda
        && p["bajo banda y < mín."].tasa < minD && vo(tasaRef).tasaRefOp === tasaRef;
      motorOk = geometria && puntos.every((x) => x.it && x.obt === x.esp && x.bajoBanda === (x.esp === "excepcion"))
        && puntos.filter((x) => x.esp === "excepcion").every((x) => x.it.regla.area === "comercial" && x.it.nivel >= 1);
      // Medición (NO se fija): con el sugerido topado la referencia ES el mínimo del deudor y una tasa
      // dentro de la banda queda bajo ese mínimo. Hoy el motor la aprueba (hallazgo 2).
      aplicarCfgActiva({ ...guardado, spreadEstandar: +(pisoD + ajuste - 0.10).toFixed(2), descEjec: 8, descMax: 14, tasaMinAbsoluta: 0.50 });
      const sugT = spreadSugerido(fO.deudor, base8(0), paramsPricing());
      const refT = +(sugT.spread + paramsPricing().costoFondo).toFixed(2);
      const bajoMinEnBanda = +(refT * (1 - 4 / 100)).toFixed(2);
      const itT = o01(bajoMinEnBanda)[0];
      const zonaGris = `topado ${sugT.topado} · ref ${refT}% = mín. ${tasaMinIA(fO.deudor)}% → ${bajoMinEnBanda}% (4% bajo la ref, BAJO el mínimo) hoy ${itT ? itT.disp : "?"}`;
      restaurar();

      det = `${deudorK} piso ${pisoK}% → mín. ${tasaMinIA(deudorK)}% (costo 1,23 → ${minAlto} · 0,31 → ${minBajo}) · desconocido piso ${spreadMinDeudor(desconocido)}% · contacto spreadMinNeg ${contacto.spreadMinNeg}`
        + ` · escalera 7/12/0,50: ${escalera.map((x) => `${x.rot}→${x.obt}${x.obt === x.esp ? "" : "≠" + x.esp}`).join(" ")} · comisión 0,49→${comision} · resumen ${resumen1}/${resumen2}`
        + ` · O01 (8/14/0,50) piso ${pisoD} spread ${sug.spread} topado ${sug.topado} ref ${tasaRef}% mín. ${minD}% banda ≥ ${pisoBanda}%: `
        + puntos.map((x) => `${x.rot} ${x.tasa}%→${x.obt}${x.it && x.obt === "excepcion" ? " N" + x.it.nivel : ""}${x.obt === x.esp ? "" : "≠" + x.esp}`).join(" · ")
        + ` · [medición, no gate] ${zonaGris}`;
    } catch (err) { det = "ERROR " + String(err).slice(0, 300); }
    finally { restaurar(); if (typeof _cacheCli !== "undefined") _cacheCli.clear(); }
    ok("119 oferta (proxy de la regla 8): el mínimo del deudor es su piso más el costo de fondo del tenant, y la escalera de atribución —en el panel y en O01 del motor— mide el descuento contra la referencia del deudor con los umbrales del tenant",
       pisoOk && escaleraOk && motorOk,
       `piso ${pisoOk} · escalera ${escaleraOk} · motor ${motorOk} · ${det}`);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 120 · regla 10 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · CONTACTABILIDAD (regla de dominio 10). Mensaje NO entregado ⇒ UN solo intento y «Error de
  //    contactabilidad»; sólo se reintenta —hasta 3— cuando el mensaje SÍ se entrega y el cliente no
  //    responde. Tres lectores de nivel módulo la sostienen: `construirWaSesion` (la conversación que
  //    el Agente IA deja al primer contacto), `generarContactabilidad` (el historial de intentos de una
  //    cartera enrolada, donde el reintento sí ocurre) y los rotuladores del estado errado
  //    (`subEstadoDe` → «Error contactabilidad», `generarTareasConsolidadas` → tarea de
  //    contactabilidad). El contador «N/3» de `iniciarContacto` vive dentro del componente y no se
  //    puede llamar desde acá: su TEXTO lo fija el gate de contrato de la regla 10 (snapshot).
  {
    // El CHECKER escribe la regla en dos cláusulas y se prueba primero contra formas PLANTADAS —válidas
    // e inválidas— para saber que la codifica antes de aplicarlo a lo que el fuente produce. Acepta la
    // forma (i) aunque hoy ningún generador la emita (`generarContactabilidad` fija `contactable = true`):
    // un checker que sólo aceptara «entregado» fijaría la salida de hoy y se pondría rojo justo cuando
    // alguien implemente esa mitad de la regla.
    //  (i)  no entregado ⇒ 1 intento: un intento «no entregado» es el ÚNICO del canal (sin éxito y sin
    //       nada después); en la conversación, tras un mensaje «fallido» no sale NINGÚN otro mensaje.
    //  (ii) entregado sin respuesta ⇒ se reintenta, a lo más 3: los intentos sin éxito dicen «sin
    //       respuesta» (el mensaje llegó) y una respuesta sólo puede ser el ÚLTIMO intento. Tres «sin
    //       respuesta» sin respuesta final también cumplen: es el «no respondió en 3 intentos» que
    //       registra `iniciarContacto`; la regla no obliga al cliente a contestar.
    const salientes = (wa) => (wa || []).filter((m) => m.from !== "sistema" && m.from !== "cliente");
    const cumpleWa = (wa) => { const s = salientes(wa); const i = s.findIndex((m) => m.estado === "fallido"); return i < 0 || i === s.length - 1; };
    const noEntregado = (e) => /no entregad/i.test(e.resultado || "");
    const sinRespuesta = (e) => /sin respuesta/i.test(e.resultado || "");
    const cumpleHist = (hist, canal) => {
      const its = (hist || []).filter((e) => e.canal === canal && !e.esEvento);
      if (its.length < 1 || its.length > 3) return false;
      if (its.some(noEntregado)) return its.length === 1 && its[0].exito === false;           // (i)
      return its.every((e, i) => e.exito === true ? i === its.length - 1 : sinRespuesta(e));  // (ii)
    };
    // SONDA · formas plantadas: las violaciones que el checker tiene que rechazar y las válidas que tiene
    // que aceptar, una por cláusula (la (i) con su evento de sistema, que no cuenta como intento).
    const intento = (resultado, exito, canal) => ({ canal: canal || "WhatsApp", resultado, exito });
    const sondaFallidoYReintento = cumpleWa([{ from: "agente", estado: "fallido" }, { from: "agente", estado: "fallido" }]) === false
      && cumpleWa([{ from: "agente", estado: "fallido" }, { from: "agente", estado: "read" }]) === false;
    const sondaNoEntregadoYReintento = cumpleHist([intento("No entregado, reintento", false), intento("Contacto exitoso", true)], "WhatsApp") === false
      && cumpleHist([intento("No entregado", false), intento("No entregado", false)], "WhatsApp") === false;
    const sondaCuatroIntentos = cumpleHist(Array.from({ length: 4 }, (_, i) => intento(i < 3 ? "Sin respuesta, reintento" : "Contacto exitoso", i === 3)), "WhatsApp") === false;
    const sondaReintentoTrasExito = cumpleHist([intento("Contacto exitoso", true), intento("Sin respuesta, reintento", false)], "WhatsApp") === false;
    const sondaValidaI = cumpleHist([intento("No entregado: el mensaje no llegó", false), { canal: "Sistema", actor: "Sistema", esEvento: true, resultado: "Error de contactabilidad: no se reintenta, requiere gestión", exito: false }], "WhatsApp") === true;
    const sondaValidaII = cumpleWa([{ from: "agente", estado: "read" }, { from: "agente", estado: "read" }])
      && cumpleHist([intento("Sin respuesta, reintento", false, "Email"), intento("Contacto exitoso", true, "Email")], "Email") === true
      && cumpleHist(Array.from({ length: 3 }, () => intento("Sin respuesta, reintento", false)), "WhatsApp") === true;
    const sondaOk = sondaFallidoYReintento && sondaNoEntregadoYReintento && sondaCuatroIntentos && sondaReintentoTrasExito && sondaValidaI && sondaValidaII;

    // (a) NO ENTREGADO ⇒ UN SOLO INTENTO. `construirWaSesion` con `contactable = false` deja UN mensaje
    //     del agente en «fallido» (no entregado), una nota del sistema que lo dice con esas palabras y
    //     NINGÚN segundo intento. La dirección contraria: entregado ⇒ todo en «read», sin fallidos y sin
    //     nota de error.
    const d10 = { id: "T10", contacto: { nombre: "Sonda Diez" } };
    const waNo = construirWaSesion(d10, false, false, 1.5);
    const waSi = construirWaSesion(d10, true, false, 1.5);
    const salNo = salientes(waNo), salSi = salientes(waSi);
    const notaNo = waNo.filter((m) => m.from === "sistema");
    const noEntregadoOk = salNo.length === 1 && salNo[0].estado === "fallido" && salNo[0].from === "agente"
      && notaNo.length === 1 && /no entregado/i.test(notaNo[0].text) && /no se reintenta/i.test(notaNo[0].text) && /gesti[oó]n/i.test(notaNo[0].text)
      && cumpleWa(waNo)
      && salSi.length >= 1 && salSi.every((m) => m.estado === "read") && waSi.every((m) => m.from !== "sistema") && cumpleWa(waSi);

    // (b) «ERROR DE CONTACTABILIDAD» es el rótulo del estado, y se apaga en cuanto el dato queda
    //     validado. `subEstadoDe` lo clasifica, `SUBSTAGES` lo nombra, la bandeja de tareas lo pide.
    //     Sin `tProsp`: `subEstadoDe` sólo mira el reloj para «demorado», y esta regla no es temporal.
    const errado = { id: "T10e", stage: "prospeccion", cliente: "Sonda", exec: "CR", monto: 40 * MMF, contactable: false };
    const subErr = subEstadoDe(errado), subOk = subEstadoDe({ ...errado, contactable: true }), subVal = subEstadoDe({ ...errado, telValidado: true });
    const nombreSub = (SUBSTAGES.prospeccion.find((s) => s.id === subErr) || {}).name;
    const tareas = (d) => generarTareasConsolidadas([d]).filter((t) => t.fuente === "pipeline" && t.dealId === d.id);
    const tErr = tareas(errado), tVal = tareas({ ...errado, emailValidado: true });
    const rotuloOk = subErr === "errorcontacto" && /error contactabilidad/i.test(nombreSub || "")
      && subOk === "contactado" && subVal === "contactado"
      && tErr.length === 1 && tErr[0].cat === "contactabilidad" && tErr[0].prio === "alta"
      && tVal.every((t) => t.cat !== "contactabilidad")
      && /sin contacto/i.test(causaPerdidaDeal({ ...errado, stage: "perdida" }));

    // (c) ENTREGADO SIN RESPUESTA ⇒ SE REINTENTA, HASTA 3. `generarContactabilidad` arma el historial
    //     de una cartera enrolada: cada historial cumple el checker (hoy todos por la cláusula ii: el
    //     mensaje se entrega, los previos al último dicen «Sin respuesta, reintento» y el último responde),
    //     `intentos` cuenta lo mismo que el historial (es lo que dice la tarjeta) y el reintento OCURRE en
    //     alguno. Los «no entregados» (cláusula i) se REPORTAN, no se exigen en cero: también cumplen la
    //     regla. Se recorre la cartera real (`PC_CLIENTES`, el A1) por los tres canales, sin reserva: un
    //     catálogo vacío deja n = 0 y el caso FALLA, en vez de probar sobre nombres inventados.
    const nombresCli = PC_CLIENTES.slice(0, 60).map((c) => c.nombre);
    let n = 0, malos = 0, conReintento = 0, maxInt = 0, noEntregados = 0, desfaseIntentos = 0;
    for (const cli of nombresCli) for (const canal of ["WhatsApp", "Email", "Llamada"]) {
      const g = generarContactabilidad(cli, canal, nomDe(LB[0]));
      n++;
      const its = g.historialContacto.filter((e) => e.canal === canal && !e.esEvento);
      if (g.contactable !== true) noEntregados++;
      if (!cumpleHist(g.historialContacto, canal)) malos++;
      if (its.length !== g.intentos) desfaseIntentos++;
      if (g.intentos >= 2) conReintento++;
      if (g.intentos > maxInt) maxInt = g.intentos;
    }
    const reintentoOk = n >= 90 && malos === 0 && desfaseIntentos === 0 && conReintento > 0 && maxInt >= 2 && maxInt <= 3;
    // Determinista: el mismo cliente y canal dan el mismo historial (la semilla es el par, no el reloj).
    const g1 = generarContactabilidad(nombresCli[0], "WhatsApp", nomDe(LB[0])), g2 = generarContactabilidad(nombresCli[0], "WhatsApp", nomDe(LB[0]));
    const deterOk = JSON.stringify(g1.historialContacto) === JSON.stringify(g2.historialContacto) && g1.intentos === g2.intentos;

    ok("120 contactabilidad: no entregado ⇒ un solo intento y «Error de contactabilidad»; entregado sin respuesta ⇒ se reintenta, a lo más 3",
       sondaOk && noEntregadoOk && rotuloOk && reintentoOk && deterOk,
       `sonda: fallido+reintento ${sondaFallidoYReintento} · no entregado+reintento ${sondaNoEntregadoYReintento} · 4 intentos ${sondaCuatroIntentos} · reintento tras éxito ${sondaReintentoTrasExito} · válida (i) ${sondaValidaI} · válida (ii) ${sondaValidaII}`
       + ` · no entregado → ${salNo.length} saliente(s) en «${salNo[0] && salNo[0].estado}», nota «${(notaNo[0] && notaNo[0].text || "").slice(0, 38)}…» ${noEntregadoOk} (entregado → ${salSi.length} en read)`
       + ` · rótulo «${nombreSub}» ${rotuloOk} (validado → ${subVal}, tareas ${tErr.length}→${tVal.filter((t) => t.cat === "contactabilidad").length})`
       + ` · ${n} historiales: ${malos} fuera de regla, ${conReintento} con reintento, máx ${maxInt} intento(s), desfase intentos ${desfaseIntentos} ${reintentoOk} (no entregados: ${noEntregados}, informativo) · determinista ${deterOk}`);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 121 · regla 11 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · PROSPECCIÓN (regla de dominio 11). Tres cláusulas, tres lectores de nivel módulo:
  //    (a) el ejecutivo se asigna por CEDENTE y nunca por deudor (`asignarEjecutivo`, con el A24 por
  //        delante del mapa de la semilla y del reparto por hash);
  //    (b) un deudor «Otro» —sin lista, sin historia del último año y sin nota de corte— NUNCA abre
  //        oportunidad (`deudorAbreOportunidad` → «Buena factura» → `clasificarFactura`), queda en el
  //        pool manual (`OTRO_FOP_POR_CEDENTE`) y agregarlo a mano manda la operación a Otorgamiento
  //        (`requiereOtorgamiento`);
  //    (c) las empresas candidatas salen del feed de proveedores bajo un cliente de la cartera y fuera del
  //        universo conocido —un candidato no nos cede— y lo que ceden va a los cesionarios REALES del
  //        mercado, sin nosotros (`candidatasDeCartera`, `CESIONARIOS_MERCADO`, `facturasDeCandidata`).
  {
    const ks = Object.keys(EXECS);
    const sinComentarios = (fn) => String(fn).replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const nombrePorRut = (() => { const m = {}; for (const r of (window.DTESYNC || [])) if (r && r.RUTEmisor && !m[r.RUTEmisor]) m[r.RUTEmisor] = r.RznSoc; return m; })();

    // Una fila REAL del A1 cuyo deudor cae en el bucket OTRO y no alcanza la nota de corte, y su evento
    // con la forma real del stream (`streamDesdeDTE`); la MISMA fila con el receptor cambiado a Lista
    // Blanca da el evento «elegible». Las usan (a) —campos DERIVADOS del deudor— y (b).
    const filaOtro = (window.DTESYNC || []).find((r) => r && r.RUTEmisor && r.FormaPago === "2"
      && clasifInbound(r.RUTEmisor, r.RUTRecep, r.RznSocRecep).bucket === "OTRO"
      && (notaDeudor(r.RznSocRecep, r.RUTRecep) || 0) <= NOTA_PRIORITARIA
      && (r.EstadoDTE || {}).Reclamado !== "1" && !((r.EstadoDTE || {}).NotaCredito === "1" || (r.EstadoDTE || {}).NotaCredito === 1));
    const evOtro = filaOtro ? streamDesdeDTE([filaOtro])[0] : null;
    const lbNombre = ((window.LISTA_BLANCA || []).find((x) => x && x.RUT === LB[0]) || {}).RazonSocial || nomDe(LB[0]);
    const evLB = filaOtro ? streamDesdeDTE([{ ...filaOtro, RUTRecep: LB[0], RznSocRecep: lbNombre }])[0] : null;

    // ───────────── (a) EJECUTIVO POR CEDENTE ─────────────
    // CHECKER: una función de asignación es «por cedente» si, para cada cedente, devuelve lo mismo
    // cualquiera sea el deudor: no sólo su RUT y razón social sino TODO lo que el evento del stream
    // DERIVA del deudor (`tipoDeudor`, `inboundBucket`, `histFactoring`, `sector`, `buenPagador`,
    // `facturasOp`). Se prueba primero contra dos impostores —uno que reparte por RUT del deudor y uno
    // SUTIL que sólo desvía cuando el deudor cae en bucket OTRO—, que tienen que fallar, y contra uno
    // que reparte por cedente, que tiene que pasar.
    const camposDeudor = (ev) => ev ? { rutRecep: ev.facturasOp && ev.facturasOp[0] && ev.facturasOp[0].rutRecep, deudor: ev.deudor, pagador: ev.pagador, tipoDeudor: ev.tipoDeudor, inboundBucket: ev.inboundBucket, histFactoring: ev.histFactoring, sector: ev.sector, buenPagador: ev.buenPagador, facturasOp: ev.facturasOp } : null;
    const deudorSintetico = (rut, tipo, hist, bucket) => ({ rutRecep: rut, deudor: nomDe(rut), pagador: nomDe(rut), tipoDeudor: tipo, inboundBucket: bucket, histFactoring: hist, sector: sectorDeDeudor(tipo, hist), buenPagador: tipo === "Lista Blanca", facturasOp: [{ ...fac("f" + rut, rut, 1), tipoDeudor: tipo, inboundBucket: bucket, histFactoring: hist }] });
    const deudoresPrueba = [
      ...LB.slice(0, 3).map((r) => deudorSintetico(r, "Lista Blanca", null, "CAT1")),
      deudorSintetico(LB[3], "Deudor Autorizado", null, "CAT1"),
      deudorSintetico(noPrime, "Otro", "bice", "CAT1"),
      deudorSintetico(noPrime, "Otro", "otro", "CAT4"),
      deudorSintetico(noPrime, "Otro", null, "OTRO"),
      { rutRecep: "", deudor: "", pagador: "", tipoDeudor: undefined, inboundBucket: undefined, histFactoring: undefined, sector: undefined, buenPagador: undefined, facturasOp: [] },
      ...(evOtro ? [camposDeudor(evOtro), camposDeudor(evLB)] : []),
    ];
    const porCedente = (fn, cedentes) => cedentes.every((c) => {
      const vistos = new Set(deudoresPrueba.map((d) => fn({ ...c, ...d })));
      return vistos.size === 1 && ks.includes([...vistos][0]);
    });
    const cedentesSonda = [{ cedente: "Sonda Uno SpA", rutEmisor: "11.111.111-1" }, { cedente: "Sonda Dos Ltda", rutEmisor: "22.222.222-2" }];
    const impostorDeudor = (ev) => ks[hashStr(ev.rutRecep || ev.deudor || "") % ks.length];
    const impostorSutil = (ev) => ks[(hashStr(ev.cedente) + (ev.inboundBucket === "OTRO" ? 1 : 0)) % ks.length];
    const impostorSector = (ev) => ks[(hashStr(ev.cedente) + (ev.histFactoring === "otro" ? 1 : 0)) % ks.length];
    const honestoCedente = (ev) => ks[hashStr(ev.cedente) % ks.length];
    const sondaA = porCedente(impostorDeudor, cedentesSonda) === false && porCedente(impostorSutil, cedentesSonda) === false
      && porCedente(impostorSector, cedentesSonda) === false && porCedente(honestoCedente, cedentesSonda) === true;

    // A24 · clientes reales con dueño: el ejecutivo del deal ES el del archivo de cartera, con
    // cualquier deudor. Se recorren TODAS las asignaciones, no una muestra.
    const asig = CARTERA_A24.asignacion;
    const rutsA24 = Object.keys(asig);
    const clientesA24 = rutsA24.map((rut) => ({ cedente: nombrePorRut[rut] || ("Cliente " + rut), rutEmisor: rut }));
    const a24Ok = rutsA24.length > 0 && porCedente(asignarEjecutivo, clientesA24)
      && clientesA24.every((c) => asignarEjecutivo(c) === asig[c.rutEmisor]);
    const execsDistintos = new Set(rutsA24.map((r) => asig[r])).size;

    // A24 MANDA sobre el mapa de la semilla: un cedente con NOMBRE de `EMPRESA_EJECUTIVO` (→ «CR») y
    // RUT que el archivo asigna a OTRO código se va al del archivo. Si no hubiera ningún RUT con otro
    // código la sonda no probaría nada, así que se exige encontrarlo.
    const nombreSemilla = "Constructora Andes SpA";
    const rutOtroCod = rutsA24.find((r) => asig[r] !== EMPRESA_EJECUTIVO[nombreSemilla]);
    const a24MandaOk = !!rutOtroCod && asignarEjecutivo({ cedente: nombreSemilla, rutEmisor: rutOtroCod, deudor: "Codelco" }) === asig[rutOtroCod]
      && asignarEjecutivo({ cedente: nombreSemilla, rutEmisor: "" }) === EMPRESA_EJECUTIVO[nombreSemilla];

    // PROSPECTO (ni en A24, ni en el maestro SOW, ni en la semilla): reparto ESTABLE por cedente —dos
    // llamadas dan lo mismo, el deudor no cambia nada— y en el padrón de ejecutivos. No se fija la
    // fórmula del hash: la regla pide «por cedente», no un algoritmo. Sobre el EVENTO REAL del stream,
    // el mismo cedente con deudor «Otro» y con deudor de Lista Blanca cae en el mismo ejecutivo.
    const prospecto = { cedente: "Sonda Prospecto Once SpA", rutEmisor: "99.999.999-9" };
    const prospEj = asignarEjecutivo(prospecto);
    const prospOk = !asig[prospecto.rutEmisor] && !SOW_POR_NOMBRE[prospecto.cedente] && !EMPRESA_EJECUTIVO[prospecto.cedente]
      && ks.includes(prospEj) && asignarEjecutivo({ ...prospecto }) === prospEj && porCedente(asignarEjecutivo, [prospecto])
      && !!evOtro && asignarEjecutivo({ ...evOtro, ...prospecto }) === prospEj && asignarEjecutivo({ ...evLB, ...prospecto }) === prospEj;

    // ESTRUCTURAL: el cuerpo de `asignarEjecutivo` no menciona al deudor por ningún nombre, ni crudo
    // ni derivado.
    const cuerpoA = sinComentarios(asignarEjecutivo);
    const cuerpoOk = !/deudor|pagador|rutRecep|RUTRecep|inboundBucket|histFactoring|tipoDeudor|sector|buenPagador|facturasOp/i.test(cuerpoA) && /cedente/.test(cuerpoA);
    const aOk = sondaA && a24Ok && a24MandaOk && prospOk && cuerpoOk;

    // ───────────── (b) «OTRO» NUNCA ABRE OPORTUNIDAD ─────────────
    // Se le da TODO lo que una regla podría querer, salvo el deudor: cliente, SOW a la baja, descuento.
    const tentar = (ev, extra) => ({ ...ev, sowTendencia: "Decreciente", conDescuento: true, superaTarget: true, ...extra });
    const otroNoAbre = !!evOtro && evOtro.inboundBucket === "OTRO" && evOtro.tipoDeudor === "Otro" && evOtro.credito && !evOtro.reclamada && !evOtro.notaCredito
      && deudorAbreOportunidad(evOtro) === false
      && clasificarFactura(tentar(evOtro, { esCliente: true }), INBOUND_RULES) === null
      && clasificarFactura(tentar(evOtro, { esCliente: false }), INBOUND_RULES) === null
      && CRITERIO_PRED["Buena factura"](evOtro) === false && CRITERIO_PRED["Deudor elegible"](evOtro) === false;
    // DIRECCIÓN CONTRARIA · la MISMA fila con el receptor cambiado a un deudor de Lista Blanca abre por
    // la regla Prime (02 cliente / 03 prospecto); y un histórico con otro factor (CAT4) abre por la 07.
    const rLBcli = evLB && clasificarFactura({ ...evLB, esCliente: true, sowTendencia: "Manteniendo", conDescuento: false }, INBOUND_RULES);
    const rLBpro = evLB && clasificarFactura({ ...evLB, esCliente: false, sowTendencia: "Manteniendo", conDescuento: false }, INBOUND_RULES);
    const evCat4 = evOtro && { ...evOtro, inboundBucket: "CAT4", histFactoring: "otro", sowTendencia: "Manteniendo", conDescuento: false, esCliente: true };
    const rCat4 = evCat4 && clasificarFactura(evCat4, INBOUND_RULES);
    const elegibleAbre = !!evLB && evLB.tipoDeudor === "Lista Blanca" && evLB.inboundBucket === "CAT1" && deudorAbreOportunidad(evLB) === true
      && rLBcli && rLBcli.id === "Rule-02" && rLBpro && rLBpro.id === "Rule-03"
      && deudorAbreOportunidad(evCat4) === true && rCat4 && rCat4.id === "Rule-07";
    // El catálogo por defecto SÓLO abre por facturas de deudor elegible: cada regla lleva el criterio
    // que pasa por `deudorAbreOportunidad` (es lo único que sostiene la cláusula, ver hallazgos).
    const catalogoOk = INBOUND_RULES.length >= 7 && INBOUND_RULES.every((r) => r.criterio.includes("Buena factura") || r.criterio.includes("Deudor elegible"));
    // LA COSTURA, medida y restaurada (no se afirma en ninguna dirección: es un hallazgo, ver reporte).
    // `facturaCalifica` trata un criterio desconocido como cumplido, y las reglas persistidas en
    // localStorage —lo que lee el cron vía `cargarReglas`— son editables: una regla guardada sin
    // «Buena factura» captura al mismo evento «Otro». Se mide con la clave guardada y devuelta.
    const costuraDesconocido = !!evOtro && facturaCalifica(evOtro, { criterio: ["Criterio que no existe"] });
    let costuraPersistida = null, rulesRestaurado = false;
    if (evOtro) {
      let previo = null; try { previo = window.localStorage.getItem(RULES_KEY); } catch (_) {}
      try {
        guardarReglas([...INBOUND_RULES, { id: "Rule-S11", title: "Sonda sin Buena factura", criterio: ["Cliente"], activa: true }]);
        const cap = clasificarFactura({ ...evOtro, esCliente: true }, cargarReglas());
        costuraPersistida = cap ? cap.id : null;
      } finally {
        try { if (previo == null) window.localStorage.removeItem(RULES_KEY); else window.localStorage.setItem(RULES_KEY, previo); } catch (_) {}
        let ahora = null; try { ahora = window.localStorage.getItem(RULES_KEY); } catch (_) {}
        rulesRestaurado = ahora === previo;
      }
    }
    // SOBRE EL ARCHIVO: el stream de las primeras 4.000 filas del A1 contra las reglas. Ninguna
    // captura de bucket OTRO con nota ≤ corte; hay capturas Y excluidos, o la medición no mide; y
    // el diseño de DOS poblaciones queda fijado: un deudor de bucket OTRO con nota > corte SÍ abre
    // (lista ND>4,2, Rule-04/05), que es la parte que el texto de la regla 11 no nombra.
    const muestra = streamDesdeDTE((window.DTESYNC || []).slice(0, 4000));
    let capturadas = 0, excluidasOtro = 0, otroCapturada = 0, otroNotaAbre = 0, otroNotaNoAbre = 0;
    for (const ev of muestra) {
      const esOtro = ev.inboundBucket === "OTRO", sobreCorte = notaDeudorEvento(ev) > NOTA_PRIORITARIA;
      const r = clasificarFactura(ev, INBOUND_RULES);
      if (r) { capturadas++; if (esOtro && !sobreCorte) otroCapturada++; if (esOtro && sobreCorte) otroNotaAbre++; }
      else if (esOtro && !sobreCorte) excluidasOtro++;
      else if (esOtro && sobreCorte && ev.credito && !ev.reclamada && !ev.notaCredito) otroNotaNoAbre++;
    }
    const archivoOk = capturadas > 0 && excluidasOtro > 0 && otroCapturada === 0 && otroNotaAbre > 0 && otroNotaNoAbre === 0;
    // POOL MANUAL: lo que el inbound deja «disponible para agregar a mano» es TODO bucket OTRO y tipo
    // «Otro», ninguna Prime ni histórico. Se cuenta cuántas alcanzarían el corte de nota (hallazgo).
    const pool = Object.values(OTRO_FOP_POR_CEDENTE).flat();
    let poolNota = 0; for (const f of pool) if (notaDeudorEvento(f) > NOTA_PRIORITARIA) poolNota++;
    const poolOk = pool.length > 0 && pool.every((f) => f.inboundBucket === "OTRO" && f.tipoDeudor === "Otro" && !f.histFactoring && f.credito && !f.reclamada && !f.notaCredito);
    // AGREGADO MANUAL ⇒ OTORGAMIENTO: con una factura de deudor «Otro» en la oferta, `requiereOtorgamiento`
    // lo dice por «otros»; con las mismas facturas pero de Lista Blanca, no lo dice por «otros».
    const baseDeal = { id: "D-11", rutEmisor: EMISOR_LIBRO, cliente: nombrePorRut[EMISOR_LIBRO] || "Cliente", esCliente: true, monto: 1 * MMF };
    const rOtro = requiereOtorgamiento({ ...baseDeal, facturasOp: [facOtro("o1", noPrime, 1)] });
    const rLB = requiereOtorgamiento({ ...baseDeal, facturasOp: [fac("l1", LB[0], 1)] });
    const manualOk = !!rOtro && rOtro.tieneOtros === true && (rOtro.motivo === "otros" || rOtro.motivo === "ambos")
      && (rLB === null || rLB.tieneOtros === false);
    const bOk = otroNoAbre && elegibleAbre && catalogoOk && archivoOk && poolOk && manualOk;

    // ───────────── (c) CANDIDATAS = PROVEEDORES × CESIONARIOS DEL MERCADO, SIN NOSOTROS ─────────────
    // CESIONARIOS_MERCADO es EXACTAMENTE el conjunto de RUT de factoring del A2 menos el nuestro,
    // calculado acá de nuevo; y el A2 sí registra cesiones a nosotros, o la exclusión no se ejercita.
    const aec = window.AECSYNC || [];
    const espMercado = new Map();
    let cesionesNuestras = 0;
    for (const a of aec) { if (!a || !a.RUTFactoring) continue; if (a.RUTFactoring === BICE_RUT) { cesionesNuestras++; continue; } espMercado.set(a.RUTFactoring, a.RazonSocialFactoring); }
    const mercadoRuts = new Set(CESIONARIOS_MERCADO.map((c) => c.rut));
    const sinNosotros = (lista) => Array.isArray(lista) && lista.length > 0 && lista.every((c) => c && c.rut && c.rut !== BICE_RUT);
    const sondaC = sinNosotros([{ rut: "76.118.580-2", nombre: "Eurocapital" }, { rut: BICE_RUT, nombre: "Nosotros" }]) === false
      && sinNosotros([{ rut: "76.118.580-2", nombre: "Eurocapital" }]) === true;
    const mercadoOk = sondaC && cesionesNuestras > 0 && sinNosotros(CESIONARIOS_MERCADO)
      && mercadoRuts.size === CESIONARIOS_MERCADO.length && mercadoRuts.size === espMercado.size
      && CESIONARIOS_MERCADO.every((c) => espMercado.get(c.rut) === c.nombre);
    // Candidatas: del feed de proveedores, bajo un cliente de la cartera, fuera del universo conocido,
    // deduplicadas por RUT, y que NO nos ceden: ni figuran en el maestro SOW ni el A2 registra una
    // cesión suya a nosotros.
    const feed = window.PROVEEDORES_CLIENTES;
    const cands = candidatasDeCartera(null);
    const rutsCartera = new Set(PC_CLIENTES.map((c) => c.rut));
    const provPorRut = new Map();
    for (const cli of ((feed && feed.clientes) || [])) { if (!rutsCartera.has(cli.rut)) continue; for (const p of (cli.proveedores || [])) provPorRut.set(p.rut, (provPorRut.get(p.rut) || 0) + (p.monto || 0)); }
    const cedenNos = new Set(aec.filter((a) => a && a.RUTFactoring === BICE_RUT).map((a) => a.RUTCedente));
    const candRuts = cands.map((c) => c.rut);
    const candOk = cands.length > 0 && new Set(candRuts).size === cands.length
      && cands.every((c) => provPorRut.has(c.rut) && !rutsCartera.has(c.rut) && !SOW_POR_RUT[c.rut] && !cedenNos.has(c.rut) && c.monto === provPorRut.get(c.rut))
      && [...provPorRut.keys()].filter((r) => !rutsCartera.has(r)).length === cands.length;
    // SONDA sobre el FEED: hoy ningún proveedor del feed real es empresa conocida ni nos cede, así que
    // las comprobaciones de arriba no distinguen «el filtro existe» de «el dato no lo ejercita». Se
    // planta un feed —y se restaura en `finally`— con: (i) un proveedor que ES cliente del maestro y
    // además nos cede en el A2 (queda FUERA), (ii) un proveedor nuevo bajo un cliente de la cartera
    // (ENTRA), (iii) el mismo proveedor nuevo bajo un SEGUNDO cliente de otro ejecutivo (UN candidato,
    // monto sumado, dos clientes) y (iv) un proveedor nuevo bajo un cliente que NO es de la cartera
    // (queda FUERA). Y el alcance por ejecutivo: el de (ii) ve UN cliente y el monto de ese cliente.
    const conocidoQueNosCede = PC_CLIENTES.find((c) => cedenNos.has(c.rut)) || null;
    const cliA = PC_CLIENTES[0] || null;
    const cliB = cliA ? (PC_CLIENTES.find((c) => c.ej !== cliA.ej) || null) : null;
    const feedPlantado = { clientes: [
      { rut: cliA && cliA.rut, razonSocial: cliA && cliA.nombre, proveedores: [
        { rut: conocidoQueNosCede && conocidoQueNosCede.rut, razonSocial: conocidoQueNosCede && conocidoQueNosCede.nombre, monto: 5e6, facturas: 3, ultimaFactura: "2026-08-01" },
        { rut: "11.111.111-1", razonSocial: "Proveedor Nuevo Sonda SpA", monto: 4e6, facturas: 2, ultimaFactura: "2026-07-01" },
      ] },
      { rut: cliB && cliB.rut, razonSocial: cliB && cliB.nombre, proveedores: [
        { rut: "11.111.111-1", razonSocial: "Proveedor Nuevo Sonda SpA", monto: 3e6, facturas: 1, ultimaFactura: "2026-08-15" },
      ] },
      { rut: "33.333.333-3", razonSocial: "Cliente Ajeno Sonda Ltda", proveedores: [
        { rut: "44.444.444-4", razonSocial: "Proveedor Ajeno Sonda SpA", monto: 9e6, facturas: 9, ultimaFactura: "2026-08-20" },
      ] },
    ] };
    let plantTodos = [], plantEjA = [], feedRestaurado = false;
    try { window.PROVEEDORES_CLIENTES = feedPlantado; plantTodos = candidatasDeCartera(null); plantEjA = cliA ? candidatasDeCartera(cliA.ej) : []; }
    finally { window.PROVEEDORES_CLIENTES = feed; feedRestaurado = window.PROVEEDORES_CLIENTES === feed; }
    const nuevo = plantTodos.find((c) => c.rut === "11.111.111-1");
    const nuevoEjA = plantEjA.find((c) => c.rut === "11.111.111-1");
    const sondaFeed = !!conocidoQueNosCede && !!cliA && !!cliB && !rutsCartera.has("33.333.333-3") && !rutsCartera.has("11.111.111-1") && !rutsCartera.has("44.444.444-4")
      && plantTodos.length === 1 && !!nuevo && nuevo.monto === 7e6 && nuevo.facturas === 3 && nuevo.ultimaFactura === "2026-08-15"
      && nuevo.clientes.length === 2 && nuevo.clientes.includes(cliA.nombre) && nuevo.clientes.includes(cliB.nombre)
      && plantEjA.length === 1 && !!nuevoEjA && nuevoEjA.monto === 4e6 && nuevoEjA.clientes.length === 1 && nuevoEjA.clientes[0] === cliA.nombre
      && feedRestaurado && candidatasDeCartera(null).length === cands.length;
    // Por ejecutivo (dato real): subconjunto de las de la cartera, y sólo de sus clientes.
    const ej0 = PC_CLIENTES.length ? PC_CLIENTES[0].ej : null;
    const candsEj = ej0 ? candidatasDeCartera(ej0) : [];
    const misRuts = new Set(PC_CLIENTES.filter((c) => c.ej === ej0).map((c) => c.rut));
    const feedNombreARut = new Map(((feed && feed.clientes) || []).map((c) => [c.razonSocial, c.rut]));
    const candEjOk = !!ej0 && candsEj.every((c) => candRuts.includes(c.rut) && c.clientes.every((n) => misRuts.has(feedNombreARut.get(n))));
    // El detalle de la candidata: lo cedido va SIEMPRE a un cesionario del mercado, nunca a nosotros,
    // hay cesiones (la cota se ejercita) y es determinista.
    const detA = cands.length ? facturasDeCandidata(cands[0], "2026-09-01") : [];
    const detB = cands.length ? facturasDeCandidata(cands[0], "2026-09-01") : [];
    const cedidas = detA.filter((f) => f.cedido === "Sí");
    const detOk = detA.length > 0 && cedidas.length > 0 && cedidas.every((f) => f.cesRut !== BICE_RUT && mercadoRuts.has(f.cesRut) && f.cesNombre === espMercado.get(f.cesRut))
      && detA.filter((f) => f.cedido !== "Sí").every((f) => !f.cesRut && !f.cesNombre)
      && JSON.stringify(detA) === JSON.stringify(detB);
    const cOk = mercadoOk && candOk && sondaFeed && candEjOk && detOk;

    ok("121 la prospección: ejecutivo por cedente, «Otro» nunca abre y las candidatas son proveedores × cesionarios del mercado sin nosotros",
       aOk && bOk && cOk && rulesRestaurado,
       `sondaA ${sondaA} · A24 ${rutsA24.length} clientes/${execsDistintos} ejecutivos por cedente ${a24Ok} · A24 manda sobre semilla ${a24MandaOk} · prospecto estable por cedente (${prospEj}) ${prospOk} · cuerpo sin deudor ${cuerpoOk}`
       + ` · Otro no abre ${otroNoAbre} · LB/CAT4 abren ${elegibleAbre} · catálogo ${catalogoOk} · archivo ${capturadas} capturadas/${excluidasOtro} Otro excluidas/${otroCapturada} Otro capturadas/${otroNotaAbre} OTRO con nota>corte abren (${otroNotaNoAbre} no) ${archivoOk} · pool ${pool.length} (${poolNota} con nota>corte) ${poolOk} · manual⇒otorg ${manualOk}`
       + ` · costura (hallazgo, no gateada): criterio desconocido califica ${costuraDesconocido}, regla persistida sin «Buena factura» captura ${costuraPersistida}, RULES_KEY restaurada ${rulesRestaurado}`
       + ` · mercado ${CESIONARIOS_MERCADO.length} cesionarios, ${cesionesNuestras} cesiones nuestras excluidas ${mercadoOk} · candidatas ${cands.length} ${candOk} · feed plantado (conocido ${conocidoQueNosCede && conocidoQueNosCede.rut} fuera, nuevo 2 clientes/M$7 dentro, ajeno fuera, por ejecutivo 1) ${sondaFeed} · por ejecutivo ${candsEj.length} ${candEjOk} · detalle ${detA.length} fact/${cedidas.length} cedidas ${detOk}`);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 122 · regla 12 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · LA RESERVA NO ES DE NEX (regla de dominio 12). El motor EVALÚA, no reserva: `asignarLineas`
  //    es una consulta pura —no persiste nada, no escribe en ningún repositorio y su código no conoce
  //    la palabra «reserva»—; el disponible que ve es `aprobada − utilizada`, la fila del listado de
  //    líneas (A23) que también leen la mesa y el detalle, sin ningún reservado que NEX lleve aparte
  //    —hoy NO existe adaptador que reste un `reservada` de A23: una reserva externa sólo pesa si viene
  //    descontada en lo utilizado (hallazgo 4 del reporte; se mide, no se exige)—; y una operación
  //    ACEPTADA no se re-asigna en la reevaluación siguiente —su cupo vive en el sistema de gestión de
  //    líneas—: `snapVersionCli` RECORTA la versión anterior en vez de volver a pedirle cupo al día
  //    (los casos 20, 22 y 23 fijan las tres propiedades del recorte; éste fija quién decide cuándo
  //    recortar y cuándo asignar).
  {
    // ── (a) EL TEXTO DEL MOTOR: sin «reserv» y sin persistencia, medido sobre el CÓDIGO y no sobre
    //    los comentarios (que sí dicen «no reserva nada», y con razón). El checker se prueba primero
    //    contra violaciones PLANTADAS: un motor que guardara una reserva o la leyera de un campo propio.
    const sinComentarios = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const RESERVA = /reserv/i;
    const PERSISTE = /localStorage|sessionStorage|setItem|SIM_VERSIONS|\bREPOS\b|crearRepo|repoSim|registrarAuditoria|fetch\(/;
    const motorNoReserva = (src) => { const c = sinComentarios(src); return !RESERVA.test(c) && !PERSISTE.test(c); };
    const plantadoGuarda = "function m(st){ const r = { ...st, reservado: (st.reservado || 0) }; localStorage.setItem('pc_reserva', JSON.stringify(r)); return r; }";
    const plantadoLee = "function m(st){ return st.aprobado - st.vigente - st.reservada; }";
    const plantadoPersiste = "function m(st){ SIM_VERSIONS[st.id] = st; return st; }";
    const soloComentario = "function m(st){ /* no reserva nada: la reserva vive afuera */ // ver regla 12\n return st; }";
    const sondaOk = motorNoReserva(plantadoGuarda) === false && motorNoReserva(plantadoLee) === false
      && motorNoReserva(plantadoPersiste) === false && motorNoReserva(soloComentario) === true;
    const motor = { asignarLineas, recortarAsignacion, seleccionConLinea, facturasConLinea, capacidadDeudores };
    const textoMal = Object.keys(motor).filter((k) => !motorNoReserva(motor[k].toString()));
    const textoOk = sondaOk && textoMal.length === 0;

    // ── (b) PUREZA CONTRA EL ESTADO REAL y SIN PERSISTENCIA. El caso 10 lo fija con un estado
    //    inyectado; acá se corre por el camino de producción —`lineasDeCliente` memoizado, deudores del
    //    índice— con facturas REALES del A1, y se fotografían antes y después: el estado del cliente
    //    (misma referencia, mismo contenido, sin `usado` filtrado), las líneas de sus deudores, los
    //    repositorios, las versiones y el storage.
    //    El libro es un Map memoizado y barato; `lineasDeCliente` dimensiona TODAS las líneas del cliente
    //    y las memoiza, así que se filtra primero por el libro y sólo a los candidatos se les pide el
    //    estado (al revés, elegir una fila calentaba `_cacheCli` con las 224 de la mesa).
    const libro = libroPorEmisor();
    const facsValidas = (rut) => (libro.get(rut) || []).filter((f) => f.credito && !f.reclamada && !f.notaCredito && f.monto > 0);
    const filaB = LINEAS_DATA.find((l) => {
      if (facsValidas(l.rut).length < 3) return false;
      const st = lineasDeCliente(l.rut);
      return st.estado === "B" && st.lineas.some((x) => x.granularidad === "par" && !x.suspendida && (x.aprobado - x.vigente) > 0);
    }) || null;
    if (!filaB) {
      ok("122 la reserva no es de NEX: el motor evalúa sin persistir, el disponible que ve es aprobada − utilizada y una aceptada se recorta, no se re-asigna", false, "sin cliente en estado B con libro en el activo");
    } else {
      const rutB = filaB.rut;
      const st0 = lineasDeCliente(rutB);
      const fotoCli = JSON.stringify(st0);
      const facsReales = facsValidas(rutB).slice(0, 6);
      const suma = mmRound(facsReales.reduce((a, f) => a + f.monto, 0));
      const rutsDeu = [...new Set(facsReales.map((f) => f.rutRecep))];
      const fotoDeu = () => JSON.stringify(rutsDeu.map((r) => lineaDeDeudor(r)));
      const deuAntes = fotoDeu();
      const fotoRepos = () => JSON.stringify(Object.keys(REPOS).sort().map((k) => [k, Object.keys((REPOS[k] && REPOS[k].all && REPOS[k].all()) || {}).length]));
      const fotoLS = () => { try { return JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, (localStorage.getItem(k) || "").length])); } catch (_) { return "n/a"; } };
      const fotoVer = () => JSON.stringify(Object.keys(SIM_VERSIONS).sort().map((k) => [k, (SIM_VERSIONS[k] || []).length]));
      const fotoAsig = (r) => ({ c: r.cursable, q: r.requiereComite, f: r.facturas.map((f) => [f.id, f.estado, (f.origen || []).map((o) => o.lineaId + ":" + o.monto).join("|")]) });
      const antes = fotoRepos() + fotoLS() + fotoVer();
      const r1 = asignarLineas(facsReales, rutB);
      const r2 = asignarLineas(facsReales, rutB);
      const despues = fotoRepos() + fotoLS() + fotoVer();
      const st1 = lineasDeCliente(rutB);
      const puroOk = st1 === st0 && JSON.stringify(st1) === fotoCli && fotoDeu() === deuAntes
        && st1.lineas.every((l) => !("usado" in l))
        && JSON.stringify(fotoAsig(r1)) === JSON.stringify(fotoAsig(r2))
        && mmRound(r1.cursable + r1.requiereComite) === suma;
      const noPersisteOk = antes === despues;

      // ── (c) EL DISPONIBLE QUE VE EL MOTOR ES `aprobada − utilizada`: la fila del listado (A23) que
      //    también muestran la mesa y el detalle, sin ningún reservado que NEX lleve aparte. Se mide la
      //    CONSISTENCIA entre los tres lectores de esa fila —mesa (`LINEAS_DATA`), detalle
      //    (`lineaCreditoDe`) y motor (`dispClienteInicial` de `asignarLineas`, vía `lineasDeCliente`)—,
      //    que ya se separaron una vez: el uso del detalle se fabricaba con un hash y difería en las
      //    233 filas. Que la mesa cumpla `disponible = aprobada − uso` NO se afirma: es como construye
      //    el campo. Tampoco que un `reservada` de A23 se reste: ese adaptador no existe (hallazgo 4).
      //    En el motor una reserva sólo pesa si viene descontada en lo utilizado (`vigente`): con la
      //    LF2 de 200 libre entran 60 y 80; con 100 utilizados afuera sólo entra la de 80, la de 60 va
      //    a comité con motivo «par», y el disponible que reporta es 200−100−80. Dirección negativa:
      //    la versión que el cliente aceptó NO devuelve cupo al motor —con `previa` diciendo que las
      //    dos tenían línea, el resultado es el mismo— (misma familia que el 20).
      const Lc = lineaCreditoDe({ rutEmisor: rutB });
      const dispA23 = mmRound(filaB.aprobada - filaB.uso);
      const detalleOk = Lc.aprobada === filaB.aprobada && Lc.usoActual === filaB.uso && Lc.disponible === dispA23;
      const motorOk = st0.asignadaCliente === filaB.aprobada && st0.usoCliente === filaB.uso && r1.dispClienteInicial === dispA23;
      const consistenciaOk = dispA23 > 0 && detalleOk && motorOk;
      const inj = (vig, extra) => ({ estado: estB([{ ...L("LF2-r12", "LF2", LB[3], 200, vig), ...(extra || {}) }], 5000), deudores: { [LB[3]]: dl(LB[3], 900) } });
      const facs12 = [fac("f1", LB[3], 60), fac("f2", LB[3], 80)];
      const libre = asignarLineas(facs12, "X", inj(0));
      const conReserva = asignarLineas(facs12, "X", inj(100));
      const conPrevia = asignarLineas(facs12, "X", { ...inj(100), previa: { facturas: libre.facturas } });
      const det = (r) => (r.deudores[0].detallePar[0] || {});
      const estados = (r) => r.facturas.map((f) => [f.id, f.estado, f.motivo || null]);
      const f1r = conReserva.facturas.find((f) => f.id === "f1") || {};
      const netoOk = mm(libre.cursable) === 140 && mm(libre.requiereComite) === 0
        && mm(conReserva.cursable) === 80 && mm(conReserva.requiereComite) === 60
        && f1r.estado === "REQUIERE_COMITE" && f1r.motivo === "par"
        && det(conReserva).disponible === mmRound(200 * MMF - 100 * MMF - 80 * MMF)
        && det(libre).disponible === mmRound(200 * MMF - 140 * MMF)
        && mm(conPrevia.cursable) === 80 && JSON.stringify(estados(conPrevia)) === JSON.stringify(estados(conReserva));
      // HALLAZGO 4, medido y NO exigido: el adaptador A23→motor no existe. A23 declara `reservada` y
      // `disponible` como campos, pero el estado del motor sólo tiene `aprobado`/`vigente`, y un
      // `reservado`/`disponible` que llegue como campo aparte se ignora (cursa 140, no 40). Exigirlo
      // fijaría el defecto como comportamiento esperado; se deja en el detalle para que nadie lea el
      // PASA como si la reserva externa ya pesara.
      const campoAparte = asignarLineas(facs12, "X", inj(0, { reservado: 100 * MMF, disponible: 100 * MMF }));
      const campoAparteIgnorado = mm(campoAparte.cursable) === 140;

      // ── (d) UNA OPERACIÓN ACEPTADA NO SE RE-ASIGNA. `snapVersionCli` es quien emite la versión en
      //    cada reevaluación: antes de aceptar asigna desde cero contra A23; aceptada, RECORTA la
      //    versión anterior. Se siembra una versión previa cuyas facturas cuelgan de una línea que el
      //    estado de hoy NO tiene («LF3-RESERVADA-AFUERA»): si la aceptada se re-asignara, ese origen
      //    desaparecería y el cursable sería el que A23 permite hoy, no el que el cliente firmó.
      const ID12 = "T-12-RESERVA";
      const nombreDe = (r) => (facsReales.find((f) => f.rutRecep === r) || {}).deudor || r;
      const dealBase = { id: ID12, cliente: filaB.cliente, company: filaB.cliente, rutEmisor: rutB, exec: "CR", monto: suma, facturas: facsReales.length,
        facturasOp: facsReales, deudores: rutsDeu.map((r) => ({ rut: r, name: nombreDe(r) })), subSeed: 1 };
      const LINEA_AFUERA = "LF3-RESERVADA-AFUERA";
      const porDeu = (r) => facsReales.filter((f) => f.rutRecep === r);
      const prevLinea = {
        cursable: suma, requiereComite: 0, oferta: suma, estadoCliente: "B", dispCliente: 0, vacia: false,
        facturas: facsReales.map((f) => ({ id: f.id, folio: f.folio, rutDeudor: f.rutRecep, deudor: f.deudor, monto: f.monto, estado: "CON_LINEA", motivo: null, origen: [{ lineaId: LINEA_AFUERA, tipo: "LF3", monto: f.monto }] })),
        deudores: rutsDeu.map((r) => { const fs = porDeu(r); const m = mmRound(fs.reduce((a, f) => a + f.monto, 0)); return {
          key: r, rut: r, nombre: nombreDe(r), asignado: m, seleccionado: m, nFacturas: fs.length, nConLinea: fs.length, estado: "con_linea",
          detallePar: [{ id: LINEA_AFUERA, rut: r, tipo: "LF3", label: "Línea Puntual Cliente - Deudor", disponible: 0, usado: m, usadoDeudor: m }],
          lineasUsadas: [{ lineaId: LINEA_AFUERA, tipo: "LF3", monto: m }] }; }),
        lineasUsadas: [{ lineaId: LINEA_AFUERA, tipo: "LF3", rutDeudor: null, usado: suma, montoCaducado: 0 }], solicitudes: [],
      };
      const guardadas = SIM_VERSIONS[ID12];
      let vOferta = null, vAceptada = null, vRecortada = null, errSnap = "";
      try {
        SIM_VERSIONS[ID12] = [{ v: 1, rev: 0, linea: prevLinea }];
        vOferta = snapVersionCli({ ...dealBase, stage: "oferta" }, 1);
        vAceptada = snapVersionCli({ ...dealBase, stage: "aceptadas" }, 1);
        vRecortada = snapVersionCli({ ...dealBase, stage: "cesion", facturasOp: facsReales.slice(1) }, 2);
      } catch (e) { errSnap = String(e).slice(0, 160); }
      finally { if (guardadas === undefined) delete SIM_VERSIONS[ID12]; else SIM_VERSIONS[ID12] = guardadas; }
      const origenes = (v) => [...new Set((((v && v.linea) || {}).facturas || []).flatMap((f) => (f.origen || []).map((o) => o.lineaId)))];
      const lo = vOferta && vOferta.linea, la = vAceptada && vAceptada.linea, lr = vRecortada && vRecortada.linea;
      const ofertaOk = !!lo && lo !== prevLinea && !origenes(vOferta).includes(LINEA_AFUERA)
        && lo.cursable === r1.cursable && lo.requiereComite === r1.requiereComite;
      // Igualdad de CONTENIDO, no de referencia: que `recortarAsignacion` devuelva la misma instancia
      // cuando no hay nada que quitar es un atajo suyo, no la regla; una copia fiel también cumple.
      const aceptadaOk = !!la && JSON.stringify(la) === JSON.stringify(prevLinea) && la.cursable === suma
        && origenes(vAceptada).length === 1 && origenes(vAceptada)[0] === LINEA_AFUERA;
      const recorteOk = !!lr && lr !== prevLinea && lr.facturas.length === facsReales.length - 1
        && lr.cursable === mmRound(suma - facsReales[0].monto) && lr.recorte && lr.recorte.retiradas === 1
        && origenes(vRecortada).length === 1 && origenes(vRecortada)[0] === LINEA_AFUERA
        && JSON.stringify(lr) === JSON.stringify(recortarAsignacion(prevLinea, facsReales.slice(1).map((f) => f.id)));
      const versionOk = !errSnap && ofertaOk && aceptadaOk && recorteOk && SIM_VERSIONS[ID12] === guardadas;

      ok("122 la reserva no es de NEX: el motor evalúa sin persistir, el disponible que ve es aprobada − utilizada y una aceptada se recorta, no se re-asigna",
         textoOk && puroOk && noPersisteOk && consistenciaOk && netoOk && versionOk,
         `sonda del checker ${sondaOk} · motor sin «reserv» ni persistencia en su código ${textoMal.length === 0}${textoMal.length ? " (" + textoMal.join(",") + ")" : ""}`
         + ` · puro contra el estado real de ${rutB} (${facsReales.length} fact. del A1, ${fmtMM(suma)}) ${puroOk} · repos/versiones/storage intactos ${noPersisteOk}`
         + ` · disponible aprobada − utilizada de la fila A23 (${fmtMM(dispA23)}): lo ve igual el detalle ${detalleOk} y el motor ${motorOk} ${consistenciaOk}`
         + ` · LF2 200 libre → ${mm(libre.cursable)} · con 100 utilizados afuera (vigente) → ${mm(conReserva.cursable)} + comité ${mm(conReserva.requiereComite)} (disp. ${mm(det(conReserva).disponible)}) · con previa aceptada → ${mm(conPrevia.cursable)} ${netoOk}`
         + ` · versión: oferta re-asigna (${ofertaOk}) · aceptada lee la anterior tal cual (${aceptadaOk}) · cesión sólo recorta ${lr ? fmtMM(lr.cursable) : "?"} (${recorteOk})${errSnap ? " · ERROR " + errSnap : ""}`
         + ` · hallazgo 4, medido y no exigido: adaptador A23→motor inexistente, un campo «reservado»/«disponible» aparte se ignora y cursa ${mm(campoAparte.cursable)} (${campoAparteIgnorado})`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 123 · regla 13-terdecies — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · LA LÍNEA GENERAL DEL CLIENTE: UN indicador, UNA definición de «Disponible», y el tramo de la
  //    operación sólo con la oferta SIMULADA (regla 13-terdecies). `IndicadorLinea` es el componente de
  //    nivel módulo que dibujan el tubo (columna «Línea», sin `conOperacion`) y la cabecera del detalle
  //    (con `conOperacion`); `lineaCreditoDe` es la función pura de la que sale la cifra. Se renderiza el
  //    MISMO componente con los dos juegos de props y se compara lo que dice, cifra por cifra.
  {
    const RD = (typeof ReactDOM !== "undefined") ? ReactDOM : window.ReactDOM;
    // Un cliente REAL con línea y con uso: el indicador lee LINEAS_DATA (lo que muestra A23/Líneas).
    const fila = (LINEAS_DATA || []).find((l) => l && l.uso > 0 && l.disponible > 10e6 && l.aprobada > l.disponible) || null;
    const render = (props) => {
      const host = document.createElement("div"); document.body.appendChild(host);
      const root = RD.createRoot(host);
      try {
        RD.flushSync(() => root.render(React.createElement(IndicadorLinea, props)));
        const el = host.firstElementChild;
        return { texto: (host.innerText || host.textContent || "").replace(/\s+/g, " ").trim(),
                 title: el ? (el.getAttribute("title") || "") : "", ancho: el ? el.style.width : "" };
      } finally { root.unmount(); host.remove(); }
    };
    const disponibleDe = (t) => (t.match(/Disponible (M\$[\d.,]+|\$[\d.]+)/) || [])[1] || null;
    const quedaDe = (t) => (t.match(/queda (M\$[\d.,]+|\$[\d.]+)/) || [])[1] || null;

    if (!fila) {
      ok("123 la línea general del cliente: un indicador, «Disponible» = aprobada − utilizada, y «queda» sólo con la oferta simulada", false, "no hay ninguna fila en LINEAS_DATA con uso > 0 y disponible > M$10");
    } else {
      const base = { id: "T13T", cliente: fila.cliente, rutEmisor: fila.rut, stage: "oferta" };
      const disp = fila.disponible;
      const m1 = Math.round(disp * 0.4), m2 = Math.round(disp * 0.7), mX = Math.round(disp * 1.3);

      // (a) LA DEFINICIÓN DE A23: disponible = aprobada − utilizada, y NO depende de la oferta ni de si
      //     se simuló. Sonda: un monto mayor que el disponible y `simulado` no mueven la cifra.
      const L0 = lineaCreditoDe({ ...base, monto: 0 });
      const L1 = lineaCreditoDe({ ...base, monto: mX, simulado: true });
      const a23Ok = L0.aprobada === fila.aprobada && Math.round(L0.usoActual) === fila.uso
        && L0.disponible === Math.round(fila.aprobada - fila.uso) && L0.disponible === fila.disponible
        && L1.disponible === L0.disponible && L1.aprobada === L0.aprobada && L1.montoOp === mX;

      // (b) EL TUBO (sin `conOperacion`) muestra el ESTADO de la línea aunque la operación esté simulada:
      //     nunca «queda», nunca «quedarían» en el tooltip. Es la dirección que ya se probó y se revirtió.
      const tubo = render({ deal: { ...base, monto: m1, simulado: true } });
      const tuboOk = tubo.texto.includes(`${fmtMM(fila.aprobada)} aprobada`)
        && disponibleDe(tubo.texto) === fmtMM(disp)
        && !/queda|excede/.test(tubo.texto) && !/quedarían|esta operación/.test(tubo.title)
        && tubo.ancho === "122px";

      // (c) EL DETALLE SIN SIMULAR no dibuja el tramo de la operación, aunque tenga monto (regla 14):
      //     una cifra sin evaluar se lee como cifra igual. Ni con `simulado` y monto 0.
      const detSin = render({ deal: { ...base, monto: m1, simulado: false }, conOperacion: true, ancho: 260 });
      const detCero = render({ deal: { ...base, monto: 0, simulado: true }, conOperacion: true, ancho: 260 });
      const sinSimOk = !/queda|excede/.test(detSin.texto) && !/quedarían/.test(detSin.title)
        && !/queda|excede/.test(detCero.texto) && detSin.texto === tubo.texto && detSin.ancho === "260px";

      // (d) EL DETALLE SIMULADO dibuja «queda» = disponible − monto y lo dice entero en el tooltip;
      //     y «Disponible» sigue diciendo LO MISMO que en el tubo (una definición). Sonda del mutante
      //     «disponible neto de la operación»: con ese error el detalle diría Disponible fmtMM(disp − m1),
      //     que acá tiene que ser una cadena DISTINTA de la real.
      const det1 = render({ deal: { ...base, monto: m1, simulado: true }, conOperacion: true, ancho: 260 });
      const mutante = `Disponible ${fmtMM(disp - m1)}`;
      const sondaDistingue = fmtMM(disp - m1) !== fmtMM(disp);
      const conSimOk = disponibleDe(det1.texto) === fmtMM(disp) && disponibleDe(det1.texto) === disponibleDe(tubo.texto)
        && quedaDe(det1.texto) === fmtMM(disp - m1)
        && det1.title.includes(`esta operación ${fmtMM(m1)} → quedarían ${fmtMM(disp - m1)}`)
        && det1.title.startsWith(`Línea aprobada ${fmtMM(fila.aprobada)} · utilizada ${fmtMM(fila.uso)} · disponible ${fmtMM(disp)}`)
        && sondaDistingue && !det1.texto.includes(mutante);

      // (e) SE MUEVE CON CADA SIMULACIÓN: otro monto, otro «queda»; por encima del disponible, «excede por».
      const det2 = render({ deal: { ...base, monto: m2, simulado: true }, conOperacion: true, ancho: 260 });
      const detX = render({ deal: { ...base, monto: mX, simulado: true }, conOperacion: true, ancho: 260 });
      const mueveOk = quedaDe(det2.texto) === fmtMM(disp - m2) && quedaDe(det2.texto) !== quedaDe(det1.texto)
        && disponibleDe(det2.texto) === fmtMM(disp)
        && detX.texto.includes(`excede por ${fmtMM(mX - disp)}`) && !/queda /.test(detX.texto)
        && detX.title.includes(`quedarían ${fmtMM(disp - mX)}`);

      // (f) BORDES: sin línea en el índice → «Sin línea»; sin cupo (uso = aprobada) → «Sin cupo disponible»
      //     y sin «queda» aunque esté simulada. La fila se muta y se RESTAURA (el índice apunta al mismo objeto).
      const sinLinea = render({ deal: { ...base, rutEmisor: "1-9", cliente: "Nadie" }, conOperacion: true });
      const usoOriginal = fila.uso; let sinCupo;
      try { fila.uso = fila.aprobada; sinCupo = render({ deal: { ...base, monto: m1, simulado: true }, conOperacion: true, ancho: 260 }); }
      finally { fila.uso = usoOriginal; }
      const bordesOk = sinLinea.texto === "Sin línea" && /Sin cupo disponible/.test(sinCupo.texto) && !/queda|Disponible/.test(sinCupo.texto)
        && lineaCreditoDe({ ...base, monto: 0 }).usoActual === usoOriginal;

      ok("123 la línea general del cliente: un indicador, «Disponible» = aprobada − utilizada, y «queda» sólo con la oferta simulada",
         a23Ok && tuboOk && sinSimOk && conSimOk && mueveOk && bordesOk,
         `${fila.rut} aprobada ${fmtMM(fila.aprobada)} · uso ${fmtMM(fila.uso)} · disponible ${fmtMM(disp)} (A23, no mira la oferta) ${a23Ok} · tubo «${tubo.texto}» sin queda ${tuboOk} · detalle sin simular = tubo ${sinSimOk} · simulado m1 ${fmtMM(m1)} → «${det1.texto}» (Disponible igual, mutante «${mutante}» no aparece) ${conSimOk} · m2 ${fmtMM(m2)} → queda ${quedaDe(det2.texto)} · ${fmtMM(mX)} → excede ${mueveOk} · bordes «${sinLinea.texto}» / «${sinCupo.texto}» ${bordesOk}`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 124 · regla 14 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // NNN · REEVALUACIÓN EXPLÍCITA (regla 14): la mitad que vive en funciones de nivel módulo. La regla
  // dice que agregar/quitar no dispara cálculo y que «verificación y líneas se recalculan en la MISMA
  // reevaluación, nunca en flujos aparte». Lo que la suite PUEDE fijar de eso es el contrato de la
  // reevaluación (el resto —que agregar/quitar no calcule— vive en React y lo gatean el e2e y el test
  // de contrato del mismo caso):
  //   (a) `reevaluarCliente` emite EXACTAMENTE una versión (`snapVersionCli`) y esa versión trae `linea`
  //       Y `verificacion` sobre las MISMAS facturas y del mismo instante — una sola reevaluación;
  //   (b) la línea congelada es la del motor sobre esa selección (`asignarLineas`), no una foto vieja;
  //   (c) `lineaDeVersion` LEE la versión vigente por id y no recalcula sobre la selección que trae el
  //       deal: con la selección cambiada sigue devolviendo la versión anterior (2 facturas aunque el
  //       deal traiga 3) — que es exactamente por qué la pantalla no puede mostrarla como actual y
  //       tiene que decir «Sin evaluar» hasta el próximo Re-evaluar, que la reemplaza con las dos
  //       decisiones ya sobre la selección nueva (agregar r3, luego quitar r2 y r3);
  //   (d) sin facturas no hay cifra: `linea` y `verificacion` valen null, no cero.
  // OJO: entre una reevaluación y la siguiente el caso NO invoca incorporar/retirar (son callbacks de
  // React): «no mueve el registro» acá sólo afirma que lineaDeVersion no lo lee de otra parte.
  // Restaura el repo de versiones y lo que `reevaluarCliente` contamina: AUDIT_LOG (registrarAuditoria),
  // RATE_BUCKETS e IDEM_APLICADAS (el gate del contrato de `repoSimVersions`).
  {
    const ID = "T-NNN-reeval";
    const habia = repoSimVersions.get(ID); // por si otro caso dejó algo: se restaura al final
    const auditSnap = AUDIT_LOG.slice(); const auditDesc = AUDIT_DESCARTADOS;
    const rateSnap = Object.fromEntries(Object.keys(RATE_BUCKETS).map((k) => [k, RATE_BUCKETS[k].slice()]));
    const idemSnap = new Map(IDEM_APLICADAS);
    if (habia !== undefined) repoSimVersions.del(ID);
    const f1 = fac("r1", LB[0], 20), f2 = fac("r2", LB[1], 12), f3 = fac("r3", LB[2], 7);
    const base = { id: ID, rutEmisor: EMISOR_LIBRO, cliente: "Cliente reeval", stage: "oferta", simulado: true,
                   monto: 32 * MMF, facturas: 2, facturasOp: [f1, f2] };
    const ids = (xs) => (xs || []).map((f) => f.id).sort().join(",");
    const nVer = () => ((SIM_VERSIONS[ID]) || []).length;
    // (a) primera reevaluación: UNA versión (más la v1 inicial que persiste la evaluación de partida)
    // con las dos decisiones sobre las mismas facturas.
    const nv1 = reevaluarCliente(base, "CR");
    const n1 = nVer();
    const ult1 = n1 ? SIM_VERSIONS[ID][n1 - 1] : null;
    const juntas1 = !!(nv1 && nv1.linea && nv1.verificacion) && ult1 === nv1 && n1 === 2
      && ids(nv1.linea.facturas) === ids(base.facturasOp) && ids(nv1.verificacion.facturas) === ids(base.facturasOp)
      && nv1.verificacion.total === 2 && nv1.linea.vacia === false && typeof nv1.linea.cursable === "number";
    // (b) la línea congelada es la del motor sobre ESA selección, no un literal ni una foto anterior.
    const motor1 = asignarLineas(base.facturasOp, base.rutEmisor);
    const fiel1 = !!motor1 && nv1.linea.cursable === motor1.cursable && nv1.linea.requiereComite === motor1.requiereComite;
    // (c) el deal trae la selección CAMBIADA (+r3): lineaDeVersion sigue devolviendo la vigente, con
    // 2 facturas — lee por id, no recalcula sobre facturasOp.
    const conTres = { ...base, monto: 39 * MMF, facturas: 3, facturasOp: [f1, f2, f3] };
    const leeNoCalcula = lineaDeVersion(conTres) === nv1.linea && ids(lineaDeVersion(conTres).facturas) === ids(base.facturasOp);
    // Re-evaluar emite EXACTAMENTE una versión más, ya con la tercera factura en las DOS decisiones.
    const nv2 = reevaluarCliente(conTres, "CR");
    const n2 = nVer();
    const unaMas = n2 === n1 + 1 && SIM_VERSIONS[ID][n2 - 1] === nv2 && nv2.rev === nv1.rev + 1
      && ids(nv2.linea.facturas) === ids(conTres.facturasOp) && ids(nv2.verificacion.facturas) === ids(conTres.facturasOp)
      && nv2.verificacion.total === 3 && nv2.linea.facturas.some((f) => f.id === "r3") && nv2.verificacion.facturas.some((f) => f.id === "r3");
    // Lo mismo QUITANDO (−r2, −r3): la vigente sigue con 3 hasta que Re-evaluar la recorta a 1 en las dos.
    const conUna = { ...base, monto: 20 * MMF, facturas: 1, facturasOp: [f1] };
    const leeNoCalculaQuitar = lineaDeVersion(conUna) === nv2.linea && lineaDeVersion(conUna).facturas.length === 3;
    const nv3 = reevaluarCliente(conUna, "CR");
    const recorte = nVer() === n2 + 1 && ids(nv3.linea.facturas) === "r1" && ids(nv3.verificacion.facturas) === "r1" && nv3.verificacion.total === 1;
    // (d) sin facturas no hay cifra: null, no cero — y lineaDeVersion salta la versión vacía.
    const nv4 = reevaluarCliente({ ...base, monto: 0, facturas: 0, facturasOp: [] }, "CR");
    const sinCifra = nv4.linea === null && nv4.verificacion === null && lineaDeVersion({ ...base, facturasOp: [] }) === nv3.linea;
    ok("124 una reevaluación es UNA versión que congela línea y verificación sobre las mismas facturas; lineaDeVersion la lee por id sin recalcular sobre la selección cambiada",
       juntas1 && fiel1 && leeNoCalcula && unaMas && leeNoCalculaQuitar && recorte && sinCifra,
       `v${nv1.v} (${n1} versiones): línea ${ids(nv1.linea.facturas)} · verif ${ids(nv1.verificacion.facturas)} · cursable ${mm(nv1.linea.cursable)} = motor ${mm(motor1 ? motor1.cursable : -1)}`
       + ` · deal con +r3: lineaDeVersion sigue con 2 fact. (${leeNoCalcula}) · Re-evaluar: ${n1}→${n2} (${unaMas}), 3 fact. en las dos`
       + ` · deal con sólo r1: sigue con 3 (${leeNoCalculaQuitar}) · Re-evaluar: 1 fact. en las dos (${recorte}) · sin facturas: linea ${nv4.linea} verif ${nv4.verificacion}`);
    repoSimVersions.del(ID);
    if (habia !== undefined) repoSimVersions.set(ID, habia);
    // Restauración de lo contaminado (registrarAuditoria hace unshift y puede truncar por AUDIT_MAX; el
    // flush a localStorage que queda programado persiste entonces el log ya restaurado).
    AUDIT_LOG.length = 0; AUDIT_LOG.push(...auditSnap); AUDIT_DESCARTADOS = auditDesc;
    Object.keys(RATE_BUCKETS).forEach((k) => { delete RATE_BUCKETS[k]; }); Object.keys(rateSnap).forEach((k) => { RATE_BUCKETS[k] = rateSnap[k]; });
    IDEM_APLICADAS.clear(); idemSnap.forEach((v, k) => IDEM_APLICADAS.set(k, v));
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 125 · regla 15 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · SOLICITUD DE LÍNEA: NEX INYECTA (API 1) Y CONSULTA (API 2/3); RESUELVE EL SISTEMA EXTERNO
  //    (regla de dominio 15). Lo que fija: inyectar escribe el REGISTRO y no un veredicto —queda «En
  //    gestión», sin constituir y sin tocar la cartera—; listar (API 2) es sólo lectura; el estado lo
  //    devuelve el sistema externo al consultarlo (API 3) y avanza UNA etapa por consulta, y mientras no
  //    resuelva «Aprobada» la cartera del cliente no se mueve; cuando resuelve, `constituirLinea` escribe
  //    `propFactoring` al peso y una consulta posterior no la constituye dos veces —lo que se mide es la
  //    AUDITORÍA («Línea constituida» queda UNA vez), porque `constituirLinea` es idempotente por su rama
  //    `previa` y la fila sola no distingue una constitución de dos—. Dirección negativa: una solicitud
  //    que el externo devuelve «Observada» no constituye nunca, y un estado que NEX escribiera a mano no
  //    vale: la siguiente consulta lo pisa con lo que dice el externo, sin constituir nada por el camino.
  //    Los casos 106 (la automática al cerrar la oferta) y 107 (los pesos en `constituirLinea`) cubren
  //    las dos puntas; éste fija QUIÉN decide entre medio. «Una por línea» y el rótulo «Solicitudes» son
  //    de PANTALLA: van en el gate de contrato y en el e2e de esta misma regla.
  {
    const lista = api2ListarProcesos();
    const seq0 = SOLIC_SEQ;
    const nAntes = lista.length;
    const RUT_A = "76.015.015-1", RUT_O = "76.015.015-2";
    const MONTO = 313471287;   // no redondo: un redondo no distingue si el borde redondeó
    const filaDe = (rut) => LINEAS_DATA.filter((x) => x.rut === rut);
    const limpiarLinea = (rut) => { const i = LINEAS_DATA.findIndex((x) => x.rut === rut); if (i >= 0) LINEAS_DATA.splice(i, 1); _lineaIdx = null; };
    const quitarSol = (id) => { const i = lista.findIndex((x) => x && x.idProceso === id); if (i >= 0) lista.splice(i, 1); };
    // Constituciones AUDITADAS de un proceso: es lo único que cuenta cuántas veces se constituyó.
    const constituidasDe = (id) => AUDIT_LOG.filter((r) => r && r.accion === "Línea constituida" && String(r.glosa || "").startsWith(id + " ·")).length;
    const solDe = (rut) => ({ rut, cliente: "Prueba 15 " + rut, tipo: "modificar", subtipo: "agregar_deudores",
      totalPropuesto: MONTO, propFactoring: MONTO, propGlobal: 0, propConfirming: 0, pedido: 37e6,
      detalle: [{ deudor: "D-15", rutDeudor: null, monto: 37e6, tipoLinea: "puntual" }], deudores: 1, ejecutivo: "Prueba 15", automatica: true });
    // El veredicto final del mock externo sale de `hashStr(idProceso) % 5`: se ELIGE el id (vía la
    // secuencia) para tener uno que resuelve Aprobada y otro Observada, lejos del rango de la demo.
    const finDe = (n) => (Math.abs(hashStr("PRC-" + (2600 + n))) % 5 === 0) ? "Observada" : "Aprobada";
    let nApr = null, nObs = null;
    for (let n = 90000; n < 90400 && (nApr === null || nObs === null); n++) { if (finDe(n) === "Observada") { if (nObs === null) nObs = n; } else if (nApr === null) nApr = n; }
    limpiarLinea(RUT_A); limpiarLinea(RUT_O);

    // (a) INYECTAR escribe el registro, no el veredicto: «En gestión», sin constituir, cartera intacta
    //     y NINGUNA constitución auditada.
    SOLIC_SEQ = nApr - 1;
    const idA = api1Inyeccion(solDe(RUT_A));
    const regA = lista.find((x) => x && x.idProceso === idA);
    const inyOk = idA === "PRC-" + (2600 + nApr) && !!regA && regA.estado === "En gestión" && !regA.constituida
      && regA.refrescos === 0 && lista.length === nAntes + 1 && filaDe(RUT_A).length === 0 && constituidasDe(idA) === 0;
    // (b) LISTAR (API 2) es sólo lectura: N consultas no mueven ni el estado ni la cartera.
    const foto = JSON.stringify(regA);
    for (let i = 0; i < 5; i++) api2ListarProcesos();
    const api2Ok = api2ListarProcesos() === lista && JSON.stringify(regA) === foto && filaDe(RUT_A).length === 0;
    // (c) CONSULTAR (API 3): sin refresco el estado es el inicial; cada refresco avanza UNA etapa del
    //     externo y, mientras no resuelva, NEX no toca la cartera ni marca constituida.
    const e0 = api3EstadoProceso(idA);
    regA.refrescos = 1; const e1 = api3EstadoProceso(idA);
    regA.refrescos = 2; const e2 = api3EstadoProceso(idA);
    const intermOk = e0 === "En gestión" && e1 === "En análisis de Riesgo" && e2 === "En comité"
      && filaDe(RUT_A).length === 0 && !regA.constituida && regA.estado === "En comité" && constituidasDe(idA) === 0;
    // (d) EL EXTERNO RESUELVE «Aprobada» → la línea se constituye con `propFactoring`, al peso, y la
    //     fila recuerda de qué proceso salió. Una consulta posterior NO la constituye dos veces: la
    //     auditoría sigue con UNA «Línea constituida» para este proceso (sin el guard `!s.constituida`
    //     de api3 quedarían dos, con la misma fila y el mismo monto).
    regA.refrescos = 3; const e3 = api3EstadoProceso(idA);
    const fA = filaDe(RUT_A);
    const nConst3 = constituidasDe(idA);
    const aprOk = e3 === "Aprobada" && regA.constituida === true && fA.length === 1
      && fA[0].aprobada === MONTO && fA[0].disponible === MONTO && fA[0].uso === 0 && fA[0].origenComite === idA
      && lineaDeCliente({ rutEmisor: RUT_A }) === fA[0] && nConst3 === 1;
    regA.refrescos = 9; const e4 = api3EstadoProceso(idA);
    regA.refrescos = 10; const e5 = api3EstadoProceso(idA);
    const nConst5 = constituidasDe(idA);
    const idemOk = e4 === "Aprobada" && e5 === "Aprobada" && filaDe(RUT_A).length === 1 && filaDe(RUT_A)[0].aprobada === MONTO && nConst5 === 1;

    // (e) DIRECCIÓN NEGATIVA · «Observada» NUNCA constituye, por muchas consultas que se hagan.
    SOLIC_SEQ = nObs - 1;
    const idO = api1Inyeccion(solDe(RUT_O));
    const regO = lista.find((x) => x && x.idProceso === idO);
    const estadosO = [];
    for (let k = 0; k <= 6; k++) { regO.refrescos = k; estadosO.push(api3EstadoProceso(idO)); }
    const obsOk = idO === "PRC-" + (2600 + nObs) && estadosO[0] === "En gestión" && estadosO[3] === "Observada" && estadosO[6] === "Observada"
      && !estadosO.includes("Aprobada") && !regO.constituida && filaDe(RUT_O).length === 0 && constituidasDe(idO) === 0;
    // (f) SONDA · un estado escrito POR NEX no vale. Se planta «Aprobada» en el registro, como si NEX
    //     decidiera, y se consulta al externo: API 3 no se fía del estado guardado —lo recalcula desde el
    //     externo y lo PISA con «Observada»— y por el camino no constituye nada (ni fila ni auditoría).
    //     Lo que afirma es la consulta, no el plantado: si api3 respetara un «Aprobada» ya escrito, acá
    //     constituiría la línea de RUT_O.
    regO.estado = "Aprobada";
    regO.refrescos = 3; const ePisa = api3EstadoProceso(idO);
    const sondaOk = ePisa === "Observada" && regO.estado === "Observada" && !regO.constituida && filaDe(RUT_O).length === 0 && constituidasDe(idO) === 0;
    // (g) MEDIDO, no gateado (hallazgo): la función que inyecta ADMITE una segunda solicitud para el
    //     mismo cliente/línea — «una por línea» sólo lo hace valer la pantalla de Vigentes (`conSolicitud`),
    //     y eso lo fijan el gate de contrato y el e2e de la regla, que pasan por el wizard real.
    const idA2 = api1Inyeccion({ ...solDe(RUT_A), lineaId: "L-15" });
    const idA3 = api1Inyeccion({ ...solDe(RUT_A), lineaId: "L-15" });
    const dobleAdmitida = lista.filter((x) => x && x.lineaId === "L-15").length;

    // …y se restaura TODO: solicitudes de prueba, líneas constituidas, secuencia e índices.
    [idA, idO, idA2, idA3].forEach(quitarSol);
    limpiarLinea(RUT_A); limpiarLinea(RUT_O);
    SOLIC_SEQ = seq0;
    if (typeof invalidarVisado === "function") invalidarVisado();
    const restauradoOk = lista.length === nAntes && SOLIC_SEQ === seq0 && filaDe(RUT_A).length === 0 && filaDe(RUT_O).length === 0;

    ok("125 la solicitud de línea: NEX inyecta y consulta, el estado lo resuelve el sistema externo y sólo «Aprobada» constituye la línea",
       inyOk && api2Ok && intermOk && aprOk && idemOk && obsOk && sondaOk && restauradoOk,
       `inyectar → «En gestión» sin constituir ${inyOk} · API 2 sólo lee ${api2Ok} · API 3 avanza ${e0} → ${e1} → ${e2} sin tocar la cartera ${intermOk} · «Aprobada» constituye ${fmtMM(MONTO)} = ${MONTO} al peso, origen ${idA} ${aprOk} · «Línea constituida» auditada ${nConst3} vez tras aprobar y ${nConst5} tras dos consultas más ${idemOk} · «Observada» (${idO}) nunca constituye ${obsOk} · «Aprobada» plantado por NEX: el externo lo pisa con ${ePisa} sin constituir ${sondaOk} · [medido] api1Inyeccion admite ${dobleAdmitida} solicitudes para la misma lineaId · restaurado ${restauradoOk}`);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 126 · regla 15-bis-bis — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · LA SOLICITUD INYECTADA AL CERRAR LA OFERTA CRUZA DE PESTAÑA, Y LA INCORPORACIÓN ES
  //    IDEMPOTENTE POR idProceso (regla de dominio 15-bis-bis). El detalle es pestaña propia —otro
  //    documento, otro `SOLICITUDES_LINEA`—, así que el emisor postea por `nex-solicitud` el REGISTRO
  //    que `api1Inyeccion` acaba de dejar en `SOLICITUDES_LINEA[0]` y el tubo lo incorpora con
  //    `recibirSolicitudLinea`. Lo que fija: (a) lo que se postea ES el registro recién inyectado —con
  //    un SEÑUELO sembrado antes en la lista: con la lista vacía «[0]» es el único registro y el chequeo
  //    no distingue `unshift` de `push`, que rompería al emisor real—; (b) el receptor lo incorpora TAL
  //    CUAL —mismo id, mismo contenido, al frente como lo deja `api1Inyeccion`, sin tocar `SOLIC_SEQ`:
  //    rearmarlo daría dos ids para la misma solicitud— y la bandeja y el wizard lo ven; (c) dos veces
  //    el mismo registro ⇒ UNA sola entrada, y un clon con el mismo id pero otro contenido tampoco
  //    entra ni pisa el que está; (d) dirección negativa: sin idProceso no se escribe nada. Se compara
  //    por id + JSON y nunca por identidad de objeto: postMessage entrega COPIAS, y un receptor
  //    conforme que guarde una copia superficial tiene que pasar. Se simula «la otra pestaña»
  //    inyectando con una secuencia lejana, sacando el registro de ESTA lista y clonándolo como lo
  //    haría postMessage; al final se retira todo —el señuelo incluido— y se restaura la secuencia.
  //    AUDIT_LOG NO se restaura: `api1Inyeccion` audita y la cadena es append-only (misma práctica
  //    que 106); se mide y se dice en el detalle.
  {
    const lista = api2ListarProcesos();
    const seq0 = SOLIC_SEQ;
    const audit0 = AUDIT_LOG.length;
    const nBase = lista.length;
    const RUT = "76.151.515-5";
    const clon = (o) => JSON.parse(JSON.stringify(o));      // lo que entrega postMessage: una copia
    const cuenta = (id) => lista.filter((s) => s && s.idProceso === id).length;
    const quitar = (id) => { for (let i = lista.length - 1; i >= 0; i--) if (lista[i] && lista[i].idProceso === id) lista.splice(i, 1); };
    const sol = { rut: RUT, cliente: "Prueba 15-bis-bis", tipo: "modificar", subtipo: "agregar_deudores",
      totalPropuesto: 740e6, propFactoring: 740e6, propGlobal: 0, propConfirming: 0, pedido: 90e6,
      detalle: [{ deudor: "Codelco", rutDeudor: null, monto: 60e6, pide: "puntual", motivo: "par", alcance: null, tipoLinea: "puntual" },
                { deudor: "Enel", rutDeudor: null, monto: 30e6, pide: "puntual", motivo: "par", alcance: null, tipoLinea: "puntual" }],
      deudores: 2, origen: { dealId: "OP-15BB", negocio: null }, ejecutivo: "Prueba 15-bis-bis", automatica: true };
    // SEÑUELO: una solicitud anterior, de OTRO cliente, al frente de la lista (como la deja cualquier
    // inyección previa). Es lo que hace que «[0]» mida algo en (a) y en (b).
    const ID_SENUELO = "PRC-SENUELO-15BB";
    lista.unshift({ rut: "99.999.999-9", cliente: "Señuelo 15-bis-bis", tipo: "crear", subtipo: null, totalPropuesto: 1e6, propFactoring: 1e6, propGlobal: 0, propConfirming: 0,
      pedido: 1e6, detalle: [], deudores: 0, origen: { dealId: "OP-SENUELO", negocio: null }, ejecutivo: "Señuelo 15-bis-bis", automatica: false,
      idProceso: ID_SENUELO, estado: "En gestión", refrescos: 0, ts: nowStamp(), tsEstado: nowStamp() });
    const n0 = lista.length;                                 // nBase + el señuelo

    // (a) LA OTRA PESTAÑA: inyecta y postea `SOLICITUDES_LINEA[0]`. Con el señuelo delante, que [0] sea
    //     el recién inyectado mide que API 1 lo deja AL FRENTE (un `push` dejaría el señuelo en [0] y el
    //     emisor real postearía la solicitud equivocada).
    SOLIC_SEQ = 91500;                                       // lejos del rango de la demo (PRC-26xx)
    const idA = api1Inyeccion(sol);
    const audit1 = AUDIT_LOG.length;
    const enCero = lista[0];
    const emisorOk = idA === "PRC-" + (2600 + 91501) && !!enCero && enCero.idProceso === idA && enCero.estado === "En gestión"
      && Array.isArray(enCero.detalle) && enCero.detalle.length === 2 && enCero.automatica === true && !!enCero.ts
      && lista.length === n0 + 1 && cuenta(ID_SENUELO) === 1;
    // La huella es la CARGA que viaja: lo que la consulta de estado escribe después (`estado`, `refrescos`,
    // `tsEstado`) lo pone el sistema externo, no la pestaña que inyectó, y `api3EstadoProceso` lo muta en sitio.
    const huella = (o) => { const { estado: _e, refrescos: _r, tsEstado: _t, ...resto } = o || {}; return JSON.stringify(resto); };
    const foto = huella(enCero);
    // …y en la realidad ese registro vive en el OTRO documento: se saca de esta lista y viaja clonado.
    quitar(idA);
    SOLIC_SEQ = seq0;                                        // la secuencia del tubo no se enteró de nada
    const viaje1 = clon(enCero);
    const aislOk = lista.length === n0 && cuenta(idA) === 0 && lista[0].idProceso === ID_SENUELO;

    // (b) EL TUBO LO INCORPORA TAL CUAL: mismo id y mismo contenido en [0] —por id + JSON, no por
    //     identidad—, la secuencia local intacta —no se rearma con `api1Inyeccion`—, y lo ven la
    //     bandeja (API 2/3) y el wizard.
    const mismo = () => !!lista[0] && lista[0].idProceso === idA && huella(lista[0]) === foto;
    const r1 = recibirSolicitudLinea(viaje1);
    const pre = deudoresSolicitadosLinea(RUT);
    const recibeOk = r1 === true && lista.length === n0 + 1 && mismo() && SOLIC_SEQ === seq0
      && api3EstadoProceso(idA) === "En gestión" && pre.length === 2 && pre.every((x) => x.idProceso === idA);

    // (c) IDEMPOTENTE POR id: el mismo registro otra vez → false y UNA entrada; un clon con el mismo id
    //     y otro contenido → tampoco entra ni pisa el que está.
    const r2 = recibirSolicitudLinea(viaje1);
    const viaje2 = clon(enCero); viaje2.pedido = 1; viaje2.cliente = "OTRO";
    const r3 = recibirSolicitudLinea(viaje2);
    const nIdem = cuenta(idA);
    const idemOk = r2 === false && r3 === false && lista.length === n0 + 1 && nIdem === 1 && mismo()
      && lista[0].pedido === 90e6 && lista[0].cliente === "Prueba 15-bis-bis";

    // (d) DIRECCIÓN NEGATIVA: sin idProceso no hay con qué deduplicar, así que no se escribe nada.
    const r4 = recibirSolicitudLinea(null), r5 = recibirSolicitudLinea({}), r6 = recibirSolicitudLinea({ ...clon(sol), idProceso: "" });
    const negOk = r4 === false && r5 === false && r6 === false && lista.length === n0 + 1 && mismo();

    // (e) SONDA: un registro DISTINTO (otra operación) que llegue con un id ya visto se descarta como
    //     duplicado. Es la regla tal como está escrita —idempotente por id— y también su borde: el id
    //     sale de una secuencia POR PESTAÑA que arranca en 0 en cada documento, así que dos pestañas
    //     de detalle producen el mismo «PRC-2601» y la segunda se pierde en silencio (se documenta en
    //     hallazgos; acá sólo se mide).
    const viaje3 = clon(enCero); viaje3.origen = { dealId: "OP-OTRA", negocio: null }; viaje3.rut = "76.000.000-0";
    const r7 = recibirSolicitudLinea(viaje3);
    const sondaOk = r7 === false && cuenta(idA) === 1 && mismo() && lista[0].origen.dealId === "OP-15BB";

    // Se retira lo del caso —la solicitud y el señuelo— y se restaura la secuencia. La auditoría no.
    quitar(idA); quitar(ID_SENUELO); SOLIC_SEQ = seq0;
    const auditN = AUDIT_LOG.length;
    const restauraOk = lista.length === nBase && cuenta(ID_SENUELO) === 0 && SOLIC_SEQ === seq0;

    ok("126 la solicitud inyectada al cerrar la oferta cruza de pestaña: se incorpora el registro ya armado, una sola vez por idProceso",
       emisorOk && aislOk && recibeOk && idemOk && negOk && sondaOk && restauraOk,
       `con el señuelo ${ID_SENUELO} delante, el emisor postea SOLICITUDES_LINEA[0] = ${idA} ${emisorOk} · aislada de esta lista ${aislOk} · incorporada tal cual (mismo id y JSON, al frente, SOLIC_SEQ ${seq0}→${SOLIC_SEQ}) y visible para bandeja y wizard (${pre.length} deudores) ${recibeOk} · 2× el mismo registro y un clon con otro contenido ⇒ ${nIdem} entrada ${idemOk} · sin idProceso no escribe ${negOk} · otra operación con el mismo id se descarta ${sondaOk} · lista (${nBase}) y secuencia restauradas ${restauraOk} · AUDIT_LOG ${audit0}→${auditN} (+${audit1 - audit0} por api1Inyeccion, +${auditN - audit1} por el receptor; cadena append-only, no se restaura)`);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 127 · regla 15-quater-bis — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · `InputPesos` MUESTRA EL PESO SEPARADO EN MILES DENTRO DEL CAMPO Y EMITE EL NÚMERO EN
  //    `target.value` (regla de dominio 15-quater-bis). El campo de la Propuesta del wizard dejó de ser
  //    un <input type="number"> con la cifra pegada: escribir 280000000 a ciegas es la forma más fácil
  //    de pedir 280 pesos o 280 mil millones, y los dos errores se ven idénticos. Lo que fija: (a) es un
  //    input de TEXTO numérico y lo que muestra es fmtCLP(value) —`$160.000.000`, calculado con
  //    toLocaleString("es-CL"), no un literal—; (b) el contrato con los llamadores no cambió: lo que
  //    llega a `onChange` es `{target:{value}}` con el NÚMERO en cadena, sin separadores, de modo que
  //    `+e.target.value` es el peso entero; (c) SONDAS: lo que el usuario teclea con puntos, signo peso
  //    o letras («$1.234.567», «12a34») emite sólo los dígitos, el vacío emite "0" y nunca NaN, y un
  //    valor no numérico entrante se muestra como $0; (d) el título por defecto es la lectura `M$`
  //    (fmtMM) del mismo valor, que es lo único que quedó de la lectura de abajo. Se monta el componente
  //    real con el React de la página en un contenedor propio y se desmonta al final.
  {
    const fmtOk = fmtCLP(160000000) === "$160.000.000" && fmtCLP(0) === "$0" && fmtCLP(287431509) === "$287.431.509";
    const cont = document.createElement("div"); document.body.appendChild(cont);
    const emitidos = [];
    const raiz = ReactDOM.createRoot(cont);
    const pintar = (props) => ReactDOM.flushSync(() => raiz.render(React.createElement(InputPesos, { value: 160000000, onChange: (e) => emitidos.push(e && e.target ? e.target.value : e), destacado: true, obligatorio: true, ...(props || {}) })));
    pintar();
    const el = cont.querySelector("input");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    const teclear = (txt) => { const antes = emitidos.length; setter.call(el, txt); el.dispatchEvent(new Event("input", { bubbles: true })); return emitidos.length > antes ? emitidos[emitidos.length - 1] : undefined; };
    // (a) texto numérico, con miles dentro del campo
    const tipoOk = !!el && el.type === "text" && el.getAttribute("inputmode") === "numeric" && el.value === fmtCLP(160000000) && el.value === "$160.000.000";
    const tituloOk = el.title === fmtMM(160000000) && el.title === "M$160";
    const claseOk = /\bf-prop\b/.test(el.className) && !/f-prop-vacio/.test(el.className);
    // (b) el contrato: emite el NÚMERO en target.value
    const e1 = teclear("280000000");
    const contratoOk = e1 === "280000000" && typeof e1 === "string" && +e1 === 280000000 && Number.isInteger(+e1);
    // (c) sondas: separadores, signo peso, letras, vacío
    const e2 = teclear("$1.234.567"), e3 = teclear("12a34"), e4 = teclear(""), e5 = teclear("$"), e6 = teclear("0007");
    const sondaOk = e2 === "1234567" && e3 === "1234" && e4 === "0" && e5 === "0" && e6 === "7" && [e1, e2, e3, e4, e5, e6].every((v) => !Number.isNaN(+v) && !/[^\d]/.test(v));
    // el valor entrante manda (controlado): con value=0 y obligatorio va en ámbar; con basura muestra $0
    pintar({ value: 0 }); const vacioOk = el.value === "$0" && /f-prop-vacio/.test(el.className);
    pintar({ value: "abc" }); const basuraOk = el.value === "$0";
    pintar({ value: 287431509, destacado: false }); const noRedondoOk = el.value === "$287.431.509" && !/f-prop/.test(el.className) && el.title === fmtMM(287431509);
    // dirección negativa del contrato: un <input type="number"> con la cifra pegada NO es lo que se emite
    const noNumberOk = el.type !== "number" && !/^\d+$/.test(el.value);
    ReactDOM.flushSync(() => raiz.unmount()); cont.remove();
    ok("127 InputPesos muestra el peso separado en miles DENTRO del campo (fmtCLP, texto numérico, título en M$) y emite el NÚMERO en target.value: 280000000 → \"280000000\"; «$1.234.567» → 1234567, «12a34» → 1234, vacío → 0, nunca NaN; value=0 obligatorio va en ámbar y un no-numérico muestra $0",
       fmtOk && tipoOk && tituloOk && claseOk && contratoOk && sondaOk && vacioOk && basuraOk && noRedondoOk && noNumberOk,
       `fmtCLP ${fmtOk} · texto+miles ${tipoOk} (${el.type} «${fmtCLP(160000000)}») · título ${tituloOk} · f-prop ${claseOk} · emite «${e1}» ${contratoOk} · sondas ${sondaOk} [${[e2, e3, e4, e5, e6].join("|")}] · value=0 ámbar ${vacioOk} · basura→$0 ${basuraOk} · no redondo ${noRedondoOk} · no es type=number ${noNumberOk}`);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 128 · regla 27-bis — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · LOS RÓTULOS DEL MENÚ EN EL COMMAND-K: buscar «Reportes» encuentra la vista `panel` y buscar
  //    «Gestión diaria» la vista `pipeline`; el rótulo que se muestra ES el segundo argumento de `irA`; y
  //    los nombres viejos («Tubo diario», «Gestión» a secas) ya no existen (regla 27-bis). El catálogo
  //    `VISTAS` es local de `CommandK`, así que no se puede leer: se RENDERIZA el componente —que sí es de
  //    nivel módulo— con un `irA` espía y se lee lo que ofrece y con qué argumentos navega.
  {
    const RD = (typeof ReactDOM !== "undefined") ? ReactDOM : window.ReactDOM;
    const llamadas = [];
    let cerrado = 0;
    const host = document.createElement("div"); document.body.appendChild(host);
    const root = RD.createRoot(host);
    try {
      RD.flushSync(() => root.render(React.createElement(CommandK, {
        abierto: true, onCerrar: () => { cerrado++; }, deals: [], dealVisible: () => true,
        irA: (id, label) => { llamadas.push([id, label]); }, onAbrirDeal: () => {},
      })));
      const input = host.querySelector("input");
      const escribir = (q) => {
        // Input CONTROLADO por React: hay que pasar por el setter nativo y disparar `input` (React 18
        // escucha en el contenedor raíz); flushSync vacía el trabajo síncrono pendiente.
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, q);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        RD.flushSync(() => {});
      };
      // Sólo los ítems del grupo «Ir a», por ESTRUCTURA y no por clase: la lista es el contenedor de los
      // botones, y en ella un <div> es el encabezado de grupo y un <button> un ítem del grupo abierto;
      // el rótulo del ítem es su primer <span>. Sin botones (sin resultados) no hay lista: [].
      const irAItems = () => {
        const primero = host.querySelector("button");
        if (!primero) return [];
        const res = []; let grupo = null;
        for (const el of primero.parentElement.children) {
          if (el.tagName === "DIV") { grupo = el.textContent.trim(); continue; }
          if (el.tagName === "BUTTON" && grupo === "Ir a") res.push({ label: el.querySelector("span").textContent.trim(), btn: el });
        }
        return res;
      };
      const sinResultados = () => /Sin resultados para/.test(host.innerText || host.textContent || "");

      // (a) Vacío: el catálogo entero, con los DOS rótulos nuevos y sin NINGUNO de los viejos.
      escribir("");
      const todos = irAItems().map((i) => i.label);
      const catalogoOk = todos.includes("Gestión diaria") && todos.includes("Reportes")
        && !todos.includes("Tubo diario") && !todos.includes("Gestión") && todos.length >= 9;

      // (b) Buscar «reportes» encuentra la vista y navega a `panel` con el MISMO rótulo que muestra.
      escribir("reportes");
      const r = irAItems();
      const rOk = r.length === 1 && r[0].label === "Reportes";
      if (rOk) r[0].btn.click();
      const rNav = llamadas.length === 1 && llamadas[0][0] === "panel" && llamadas[0][1] === "Reportes" && cerrado === 1;

      // (c) Buscar «gestión» da SÓLO «Gestión diaria» (no «Gestión» a secas, que era el rótulo viejo de
      //     `panel`) y navega a `pipeline` con ese rótulo.
      escribir("gestión");
      const g = irAItems();
      const gOk = g.length === 1 && g[0].label === "Gestión diaria";
      if (gOk) g[0].btn.click();
      const gNav = llamadas.length === 2 && llamadas[1][0] === "pipeline" && llamadas[1][1] === "Gestión diaria" && cerrado === 2;

      // (d) SONDA · dirección negativa: el nombre viejo no encuentra nada («tubo» → sin resultados), y
      //     ningún ítem del catálogo lleva el rótulo viejo aunque la búsqueda sea parcial («tubo d»).
      escribir("tubo");
      const tuboVacio = irAItems().length === 0 && sinResultados();
      escribir("tubo diario");
      const tuboDiarioVacio = irAItems().length === 0 && sinResultados();

      // (e) El rótulo que se muestra es el segundo argumento de `irA` para TODAS las vistas: se pincha
      //     cada una con el catálogo vacío y se compara ítem a ítem.
      escribir("");
      const antes = llamadas.length;
      const lista = irAItems();
      for (const it of lista) it.btn.click();
      const nuevas = llamadas.slice(antes);
      const rotuloEsArg = nuevas.length === lista.length && lista.every((it, i) => nuevas[i][1] === it.label)
        && nuevas.some(([id, l]) => id === "pipeline" && l === "Gestión diaria") && nuevas.some(([id, l]) => id === "panel" && l === "Reportes");

      ok("128 los rótulos del menú en el Command-K: «Reportes» y «Gestión diaria» encuentran su vista y navegan con el rótulo que muestran; los nombres viejos no existen",
        catalogoOk && rOk && rNav && gOk && gNav && tuboVacio && tuboDiarioVacio && rotuloEsArg,
        `catálogo [${todos.join(" · ")}] con los dos nuevos y sin viejos ${catalogoOk} · «reportes» → [${r.map((i) => i.label).join(",")}] ${rOk} → irA(${JSON.stringify(llamadas[0] || null)}) ${rNav}` +
        ` · «gestión» → [${g.map((i) => i.label).join(",")}] ${gOk} → irA(${JSON.stringify(llamadas[1] || null)}) ${gNav}` +
        ` · sonda «tubo» sin resultados ${tuboVacio} · «tubo diario» sin resultados ${tuboDiarioVacio} · rótulo = 2º arg de irA en ${lista.length} vistas ${rotuloEsArg}`);
    } finally { root.unmount(); host.remove(); }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 129 · regla 31 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // NNN · MODO DIRECTORIO (regla 31), la mitad que vive en una función de nivel módulo: `construirDirectorio`
  // arma el elenco de la demo. Se fija:
  // (a) los NÚMEROS DE LA REGLA, no los del perfil: 5 clientes · 3 dentro de línea + 2 parciales · 30 facturas
  //     por operación con piso de 12 al recortar (`REGLA_31` abajo; `DIRECTORIO_PERFIL` tiene que decir lo mismo,
  //     si alguien lo cambia a 4 clientes el caso cae aunque el código sea coherente consigo mismo), y que el
  //     reparto dentro/parcial sea EL MISMO que ven las pestañas «Con línea»/«Sin línea» (`lineaCreditoDe`),
  //     porque el rótulo «3 de 5» sale de ahí y no de `detalle`;
  // (b) NO INVENTA: cada factura del elenco es un documento del libro real del cliente (`libroPorEmisor`, A1)
  //     con el mismo id/folio/deudor/monto, sólo comprables (a crédito · sin NC · sin reclamo), la línea es la
  //     real (`lineaDeCliente`), y `monto`/`facturas`/`deudores` cuadran documento a documento;
  // (c) EL ALGORITMO QUE LA REGLA ENUNCIA, con una referencia escrita desde el texto del vault y no desde el
  //     código: se recorre el libro en su orden, por cliente se ordenan los deudores por volumen (desempate por
  //     nombre) y se toman COMPLETOS de mayor a menor hasta juntar las 30 —repartir uno a uno juntaría las mismas
  //     30 con el doble de deudores—; los candidatos se ordenan por RUT; el caso «dentro de línea» se CONSTRUYE
  //     soltando las facturas MÁS GRANDES del candidato de mayor holgura hasta que quepa, sin bajar de 12. La
  //     referencia da los 5 RUT en orden y, por operación, el conjunto exacto de folios: el elenco real tiene que
  //     coincidir. Con eso caen el reparto round-robin, el recorte de las más chicas y el desempate por nombre;
  // (d) DETERMINISTA: dos corridas iguales folio por folio, otra sesión da el mismo elenco cambiando sólo `exec`,
  //     y el libro no se muta; forma de oportunidad del inbound sin simular (oferta VACÍA, prospección,
  //     `_directorio`, OP-DIR1..5, dentro del tubo); NADA persiste: el conteo de claves de localStorage y
  //     sessionStorage no cambia y ningún valor guardado menciona al modo ni a sus OP-DIR;
  // (e) DIRECCIÓN NEGATIVA sobre el archivo: los emisores SIN línea existen y ninguno entra, los documentos NO
  //     comprables de los elegidos existen y ninguno entra (si esas poblaciones estuvieran vacías la exclusión se
  //     cumpliría en vacío);
  // (f) SONDA DEL PISO DE 12 con un libro PLANTADO (con el archivo real el recorte se detiene en 28/29, lejos del
  //     piso, así que el dato no lo ejercita): se reemplazan `libroPorEmisor` y `lineaDeCliente` por seis clientes
  //     sintéticos —uno con la mayor holgura que sólo cabría con 8 facturas, tres que caben justo con 12 y dos que
  //     no caben— y se restauran en `finally`. Con piso, el de 8 NO puede salir «dentro de línea» y los tres de 12
  //     quedan con exactamente 12; un recorte sin piso lo haría entrar con 8.
  {
    const REGLA_31 = { clientes: 5, cubren: 3, parciales: 2, facturas: 30, minFacturas: 12 };
    const compr = (f) => !!(f.credito && !f.notaCredito && !f.reclamada);
    // ─── medir31 · inicio ─── (la refutación regenerada reusa este bloque tal cual)
    const medir31 = (fn, P) => {
      const libro = libroPorEmisor();
      const foto = () => [...libro.entries()].map(([r, a]) => r + ":" + a.map((f) => f.id).join(",")).join("|");
      const stFoto = () => { const s = {}; for (const st of [localStorage, sessionStorage]) for (const k of Object.keys(st)) s[k] = st.getItem(k); return s; };
      const fotoAntes = foto();
      const stAntes = stFoto();
      const d1 = fn("CR"), d2 = fn("CR"), d3 = fn("JG");
      const deals = d1.deals;
      // (a) perfil de la regla
      const perfilRegla = P.clientes === REGLA_31.clientes && P.cubren === REGLA_31.cubren && P.parciales === REGLA_31.parciales
        && P.facturas === REGLA_31.facturas && P.minFacturas === REGLA_31.minFacturas;
      const cinco = deals.length === REGLA_31.clientes && d1.ids.length === deals.length && d1.detalle.length === deals.length
        && d1.ids.every((id, i) => id === deals[i].id);
      const nDeu = deals.map((d) => new Set(d.facturasDisponibles.map((f) => f.deudor)).size);
      const nFac = deals.map((d) => d.facturasDisponibles.length);
      const minFac = nFac.every((n) => n >= REGLA_31.minFacturas);
      const minDeu = nDeu.every((n) => n >= P.deudores);
      const parcialCupo = deals.map((d) => { const l = lineaDeCliente(d); return d.monto > Math.max(0, Math.round(((l && l.aprobada) || 0) - ((l && l.uso) || 0))); });
      const parcialTab = deals.map((d) => !!lineaCreditoDe(d).fueraDeLinea);
      const parcialDet = d1.detalle.map((x) => !!x.parcial);
      const coinciden = parcialCupo.every((p, i) => p === parcialTab[i] && p === parcialDet[i]);
      const nCubren = parcialTab.filter((p) => !p).length, nParc = parcialTab.filter((p) => p).length;
      const reparto = nCubren === REGLA_31.cubren && nParc === REGLA_31.parciales;
      const enTubo = deals.every((d) => !fueraDelTubo(d) && ["oferta", "prospeccion"].includes(d.stage));
      // (b) no inventa
      const ruts = deals.map((d) => d.rutEmisor);
      const distintos = new Set(ruts).size === deals.length;
      const conLinea = deals.every((d) => { const l = lineaDeCliente(d); return !!l && l.aprobada > 0; });
      let reales = true, comprables = true, cuadran = true;
      for (const d of deals) {
        const porId = new Map((libro.get(d.rutEmisor) || []).map((f) => [f.id, f]));
        for (const f of d.facturasDisponibles) {
          const o = porId.get(f.id);
          if (!o || o.folio !== f.folio || o.deudor !== f.deudor || o.monto !== f.monto || o.rutRecep !== f.rutRecep) reales = false;
          if (!compr(f)) comprables = false;
        }
        const suma = d.facturasDisponibles.reduce((a, f) => a + f.monto, 0);
        const porDeu = new Map();
        for (const f of d.facturasDisponibles) porDeu.set(f.deudor, (porDeu.get(f.deudor) || 0) + f.monto);
        const deuOk = d.deudores.length === porDeu.size && d.deudores.every((x, i, arr) => porDeu.get(x.name) === x.monto && (i === 0 || arr[i - 1].monto >= x.monto))
          && d.deudor === d.deudores[0].name;
        if (d.monto !== Math.round(suma) || d.facturas !== d.facturasDisponibles.length || !deuOk) cuadran = false;
      }
      // (c) referencia escrita desde la regla: elenco esperado (RUT en orden + folios exactos + parcial)
      const referencia = () => {
        const cands = [];
        for (const [rut, docs] of libro) {                                   // «se recorre el libro en su orden»
          const lin = lineaDeCliente({ rutEmisor: rut });
          if (!lin || !(lin.aprobada > 0)) continue;                        // «clientes con línea»
          const porDeu = new Map();
          for (const f of docs.filter(compr)) { if (!porDeu.has(f.deudor)) porDeu.set(f.deudor, []); porDeu.get(f.deudor).push(f); }
          const orden = [...porDeu.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])); // «por volumen, desempate por nombre»
          const top = []; let acum = 0;
          for (const e of orden) { top.push(e); acum += e[1].length; if (top.length >= P.deudores && acum >= P.facturas) break; }
          if (top.length < P.deudores || acum < P.facturas) continue;
          const elegidas = [];                                               // «deudores COMPLETOS de mayor a menor»
          for (const [, fs] of top) { for (const f of fs) { if (elegidas.length >= P.facturas) break; elegidas.push(f); } if (elegidas.length >= P.facturas) break; }
          const monto = elegidas.reduce((a, f) => a + (f.monto || 0), 0);
          const disponible = Math.max(0, Math.round((lin.aprobada || 0) - (lin.uso || 0)));
          cands.push({ rut, facturas: elegidas, monto, disponible, parcial: monto > disponible });
        }
        cands.sort((a, b) => a.rut.localeCompare(b.rut));                   // «desempate por RUT»
        const eleg = [];
        const cuota = (pred, n) => { for (const c of cands) { if (eleg.length >= P.clientes || n <= 0) break; if (eleg.includes(c) || !pred(c)) continue; eleg.push(c); n--; } };
        cuota((c) => !c.parcial, P.cubren);
        if (eleg.filter((c) => !c.parcial).length < P.cubren) {              // «el caso dentro de línea se CONSTRUYE»
          for (const c of cands.filter((c) => c.parcial && !eleg.includes(c)).sort((a, b) => b.disponible - a.disponible)) { // «mayor holgura»
            if (eleg.filter((x) => !x.parcial).length >= P.cubren || eleg.length >= P.clientes) break;
            const fs = [...c.facturas].sort((a, b) => (b.monto || 0) - (a.monto || 0)); let m = c.monto;
            while (fs.length > P.minFacturas && m > c.disponible) m -= (fs.shift().monto || 0);   // «se sueltan las MÁS GRANDES, piso de 12»
            if (m > c.disponible) continue;
            c.facturas = fs; c.monto = m; c.parcial = false; c.recortado = true; eleg.push(c);
          }
        }
        cuota((c) => c.parcial, P.parciales);
        cuota(() => true, P.clientes);
        return eleg;
      };
      const ref = referencia();
      const idsDe = (fs) => fs.map((f) => f.id).sort().join(",");
      const refOk = ref.length === deals.length && ref.every((c, i) => c.rut === deals[i].rutEmisor && idsDe(c.facturas) === idsDe(deals[i].facturasDisponibles) && c.parcial === !!d1.detalle[i].parcial && Math.round(c.monto) === deals[i].monto);
      // concentración, medida además de forma directa: en una operación NO recortada los deudores son un prefijo
      // del orden por volumen y todos salvo el último están completos (cada comprable del deudor está en el elenco)
      let concentradas = true;
      for (const d of deals) {
        if (d.facturasDisponibles.length !== P.facturas) continue;           // recortada: la referencia ya la fija
        const porDeu = new Map();
        for (const f of (libro.get(d.rutEmisor) || []).filter(compr)) { if (!porDeu.has(f.deudor)) porDeu.set(f.deudor, []); porDeu.get(f.deudor).push(f); }
        const orden = [...porDeu.keys()].sort((a, b) => porDeu.get(b).length - porDeu.get(a).length || a.localeCompare(b));
        const en = new Set(d.facturasDisponibles.map((f) => f.id));
        const usados = [...new Set(d.facturasDisponibles.map((f) => f.deudor))];
        const prefijo = orden.slice(0, usados.length);
        if (prefijo.some((n) => !usados.includes(n))) { concentradas = false; continue; }
        for (const n of prefijo.slice(0, -1)) if (!porDeu.get(n).every((f) => en.has(f.id))) concentradas = false;
      }
      // (d) determinista, forma y nada persiste
      const firma = (r) => r.deals.map((d) => [d.id, d.rutEmisor, d.monto, d.facturasDisponibles.map((f) => f.id).join(","), d.deudores.map((x) => x.name + "=" + x.monto).join(";")].join("#")).join("\n");
      const igual = firma(d1) === firma(d2) && JSON.stringify(d1.detalle) === JSON.stringify(d2.detalle);
      const otraSesion = firma(d3) === firma(d1) && d3.deals.every((d) => d.exec === "JG");
      const libroIntacto = foto() === fotoAntes;
      const forma = deals.every((d, i) => d._directorio === true && d.id === "OP-DIR" + (i + 1) && d.stage === "prospeccion"
        && Array.isArray(d.facturasOp) && d.facturasOp.length === 0 && d.simulado === false && d.exec === "CR" && d.esCliente === true);
      const stDespues = stFoto();
      const sinRastro = Object.keys(stDespues).length === Object.keys(stAntes).length
        && Object.entries(stDespues).every(([k, v]) => (k in stAntes) && !/directorio|OP-DIR/i.test(k) && !/directorio|OP-DIR/i.test(String(v)));
      // (e) sonda sobre el archivo
      const sinLinea = [...libro.keys()].filter((r) => { const l = lineaDeCliente({ rutEmisor: r }); return !l || !(l.aprobada > 0); });
      const ningunoSinLinea = sinLinea.length > 0 && !sinLinea.some((r) => ruts.includes(r));
      const idsElenco = new Set(deals.flatMap((d) => d.facturasDisponibles.map((f) => f.id)));
      const bloqueadas = deals.flatMap((d) => (libro.get(d.rutEmisor) || []).filter((f) => !compr(f)));
      const ningunaBloqueada = bloqueadas.length > 0 && !bloqueadas.some((f) => idsElenco.has(f.id));
      const chk = { perfilRegla, cinco, minFac, minDeu, coinciden, reparto, enTubo, distintos, conLinea, reales, comprables, cuadran, refOk, concentradas, igual, otraSesion, libroIntacto, forma, sinRastro, ningunoSinLinea, ningunaBloqueada };
      const fallan = Object.keys(chk).filter((k) => !chk[k]);
      return { pasa: fallan.length === 0, chk, fallan, nFac, nDeu, nCubren, nParc, ruts, firma: firma(d1), sinLinea: sinLinea.length, bloqueadas: bloqueadas.length, refRuts: ref.map((c) => c.rut) };
    };
    // ─── medir31 · fin ───
    const r = medir31((e) => construirDirectorio(e), DIRECTORIO_PERFIL);

    // (f) sonda del piso de 12 con un libro plantado (se restaura en finally)
    const libro0 = libroPorEmisor, linea0 = lineaDeCliente;
    const sondaPiso = (() => {
      const P = DIRECTORIO_PERFIL;
      const docs = (rut, escala) => { const a = []; let k = 0; for (let d = 0; d < 6; d++) for (let j = 0; j < 5; j++) { k++; a.push({ id: `F-${rut}-${k}`, folio: String(k), deudor: `Deudor ${d + 1}`, rutRecep: `9${d}.000.000-${d}`, monto: k * escala, credito: true, notaCredito: false, reclamada: false, tipoDeudor: "Otro", histFactoring: "" }); } return a; };
      const suma = (n, escala) => (n * (n + 1) / 2) * escala;               // suma de las n más chicas (montos 1..30 × escala)
      // Y: la mayor holgura (cabe sólo con 8); X1..X3: caben JUSTO con 12; Z1, Z2: no caben ni con 12
      const plan = [["1.000.000-Y", 10e6, suma(8, 10e6)], ["2.000.000-X", 1e6, suma(12, 1e6)], ["3.000.000-X", 1e6, suma(12, 1e6)], ["4.000.000-X", 1e6, suma(12, 1e6)], ["5.000.000-Z", 1e6, 5e6], ["6.000.000-Z", 1e6, 5e6]];
      const libroP = new Map(plan.map(([rut, esc]) => [rut, docs(rut, esc)]));
      const linP = new Map(plan.map(([rut, , disp]) => [rut, { aprobada: disp, uso: 0 }]));
      const oLibro = libroPorEmisor, oLinea = lineaDeCliente;
      try {
        libroPorEmisor = () => libroP; lineaDeCliente = (d) => linP.get((d && d.rutEmisor) || "") || null;
        const s = construirDirectorio("CR");
        const dentro = s.deals.filter((d, i) => !s.detalle[i].parcial), parc = s.deals.filter((d, i) => s.detalle[i].parcial);
        const nF = s.deals.map((d) => d.facturasDisponibles.length);
        const yDentro = dentro.some((d) => d.rutEmisor === "1.000.000-Y");
        const tresDe12 = dentro.length === P.cubren && dentro.every((d) => /-X$/.test(d.rutEmisor) && d.facturasDisponibles.length === P.minFacturas && d.monto <= linP.get(d.rutEmisor).aprobada);
        const piso = s.deals.every((d) => d.facturasDisponibles.length >= P.minFacturas);
        return { ok: !yDentro && tresDe12 && piso && parc.length === P.parciales, det: `elenco plantado ${s.deals.map((d, i) => d.rutEmisor.slice(-1) + nF[i] + (s.detalle[i].parcial ? "p" : "d")).join("/")} · Y(cabe con 8) dentro: ${yDentro} · X con 12 exactas: ${tresDe12}` };
      } catch (e) { return { ok: false, det: "sonda del piso: " + String(e).slice(0, 120) }; }
      finally { libroPorEmisor = oLibro; lineaDeCliente = oLinea; }
    })();
    const restaurado = libroPorEmisor === libro0 && lineaDeCliente === linea0 && construirDirectorio("CR").deals.map((d) => d.rutEmisor).join() === r.ruts.join();

    ok("129 modo Directorio: `construirDirectorio` arma 5 operaciones con facturas REALES del libro (A1) y la línea real, 3 dentro de línea + 2 parciales como las ve el tubo, con deudores COMPLETOS de mayor a menor, desempate por RUT, recorte de las más grandes con piso de 12, determinista, sin inventar y sin persistir",
       r.pasa && sondaPiso.ok && restaurado,
       `perfil regla 5·3+2·30/12 ${r.chk.perfilRegla} · fact ${r.nFac.join("/")} (≥12: ${r.chk.minFac}) · deud ${r.nDeu.join("/")} (≥${DIRECTORIO_PERFIL.deudores}: ${r.chk.minDeu})`
       + ` · dentro ${r.nCubren} parciales ${r.nParc} (cupo=tab=detalle: ${r.chk.coinciden}) · en tubo ${r.chk.enTubo}`
       + ` · reales ${r.chk.reales} comprables ${r.chk.comprables} cuadran ${r.chk.cuadran} distintos ${r.chk.distintos} con línea ${r.chk.conLinea}`
       + ` · referencia de la regla = elenco real (RUT en orden + folios exactos) ${r.chk.refOk} · concentración por deudor ${r.chk.concentradas}`
       + ` · 2 corridas iguales ${r.chk.igual} · otra sesión mismo elenco/exec JG ${r.chk.otraSesion} · libro intacto ${r.chk.libroIntacto} · forma ${r.chk.forma} · sin rastro (claves y valores) ${r.chk.sinRastro}`
       + ` · sonda archivo: ${r.sinLinea} emisores sin línea y 0 entran (${r.chk.ningunoSinLinea}) · ${r.bloqueadas} docs bloqueados y 0 entran (${r.chk.ningunaBloqueada})`
       + ` · sonda piso: ${sondaPiso.det} (${sondaPiso.ok}) · globales restaurados ${restaurado}`
       + (r.fallan.length ? ` · FALLAN ${r.fallan.join(",")}` : "")
       + ` · elenco ${r.ruts.join(" ")}`);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 130 · regla 17 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · TELÉFONOS OFUSCADOS EN LOS LOGS, TIMESTAMPS ABSOLUTOS Y AUDITORÍA ENCADENADA Y PERSISTENTE
  //    (regla de dominio 17). Tres mitades, una función cada una:
  //    (a) `fonoOfuscado` es lo que va a la glosa de la auditoría y a la bitácora: deja «•••» y los últimos
  //        4 dígitos, nunca el número. Sonda: un formateador que deja el número entero —o que tapa el final y
  //        deja 8 dígitos a la vista— NO pasa la misma cota, así que la cota discrimina.
  //    (b) TIMESTAMPS ABSOLUTOS: `nowStamp()` es DD-MM-YYYY HH:MM:SS.mmm, `auditFechaHora(ts)` deriva fecha y
  //        hora del ts del EVENTO. Sonda: un registro con `ts` de ayer lleva la fecha de AYER, no la de hoy ni
  //        un «hace 1 día» — la fecha se lee del evento, no del reloj de quien lo mira.
  //    (c) `registrarAuditoria` es SÍNCRONA y deja el registro arriba con ts entero, id monótono y `hAlg`; la
  //        huella SHA-256 llega por `AUDIT_COLA`, EN ORDEN: cada `h` = auditHuella(r, h del registro de abajo).
  //        Se drena la cola y se recalcula cada eslabón. Dirección negativa sobre COPIAS de la lista (el log
  //        es evidencia y no se toca): alterar una glosa, borrar un registro del medio o intercambiar dos
  //        rompe la cadena EN ese registro (`verificarAuditoria` devuelve {ok:false, en}). Persistencia:
  //        `persistirAuditoria` deja los tres en `AUDIT_KEY` con su huella, sin semilla, y lo que está en
  //        disco verifica solo.
  //    La huella es asíncrona y la suite es síncrona: el `ok` sale primero con la parte síncrona y «pendiente»,
  //    y la parte asíncrona lo REEMPLAZA en sitio. `out` se vuelve thenable para que el runner (Playwright
  //    espera un thenable devuelto por evaluate) lea la línea final; en la consola, `out` es la referencia viva.
  //    No se restaura nada a propósito: la auditoría es append-only (mismo precedente que el caso 61) y quitar
  //    los registros rompería la cadena de lo que otros casos registren encima.
  {
    // (a) teléfonos
    const fonos = ["+56 9 8765 4321", "+56987654321", "(2) 2345 6789", "9-1234-5678", "56 2 2987 6543"];
    const digitos = (s) => String(s || "").replace(/\D/g, "");
    const cota = (fmt) => fonos.every((f) => {
      const d = digitos(f), o = String(fmt(f)), od = digitos(o);
      return !o.includes(d) && od.length <= 4 && d.endsWith(od) && /^•••\d{4}$/.test(o);
    });
    const fonoOk = cota(fonoOfuscado)
      && fonoOfuscado("+56 9 8765 4321") === "•••" + digitos("+56 9 8765 4321").slice(-4)
      && fonoOfuscado("") === "—" && fonoOfuscado(null) === "—" && fonoOfuscado(undefined) === "—" && fonoOfuscado("sin número") === "—";
    const identidad = (f) => f;
    const tapaFinal = (f) => String(f).replace(/\d{3,4}(?=\s*$)/, "XXXX");   // deja 7–8 dígitos a la vista
    const sondaFono = !cota(identidad) && !cota(tapaFinal) && digitos(tapaFinal("+56 9 8765 4321")).length >= 7;

    // (b) marcas absolutas
    const t0 = Date.now();
    const p = (n) => String(n).padStart(2, "0");
    const abs = (ts) => { const d = new Date(ts); return { fecha: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`, hora: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` }; };
    const ns = nowStamp();
    const nsOk = /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}\.\d{3}$/.test(ns);
    const tAyer = t0 - 86400000;
    const fh0 = auditFechaHora(t0), fhA = auditFechaHora(tAyer);
    const fhOk = fh0.fecha === abs(t0).fecha && fh0.hora === abs(t0).hora && fhA.fecha === abs(tAyer).fecha && fhA.fecha !== fh0.fecha
      && !/hace|atr[aá]s|ago/i.test(fhA.fecha + fhA.hora + ns);

    // (c) registro síncrono
    const n0 = AUDIT_LOG.length, top0 = AUDIT_LOG[0] || null, colaAntes = AUDIT_COLA;
    const G = "regla 17 · suite · " + t0;
    registrarAuditoria({ usuario: "-- Suite de pruebas --", modulo: "Test · regla 17", accion: "Registro 1", glosa: G + " · contacto " + fonoOfuscado("+56 9 8765 4321"), empresaId: "76.000.000-0", exito: true });
    registrarAuditoria({ usuario: "-- Suite de pruebas --", modulo: "Test · regla 17", accion: "Registro 2", glosa: G + " · segundo", exito: false, ts: tAyer });
    registrarAuditoria({ usuario: "-- Suite de pruebas --", modulo: "Test · regla 17", accion: "Registro 3", glosa: G + " · tercero", exito: true });
    const t1 = Date.now();
    const r3 = AUDIT_LOG[0], r2 = AUDIT_LOG[1], r1 = AUDIT_LOG[2];
    const mios = [r1, r2, r3];
    const seqDe = (r) => parseInt(String(r.id).split("_")[1], 36);
    const bien = (r) => !!r && r.hAlg === HASH_ALG && Number.isInteger(r.ts) && /^\d{2}\/\d{2}\/\d{4}$/.test(r.fecha) && /^\d{2}:\d{2}:\d{2}$/.test(r.hora)
      && r.fecha === abs(r.ts).fecha && r.hora === abs(r.ts).hora && /^au\d+_[0-9a-z]+$/.test(r.id) && r.usuario === "-- Suite de pruebas --";
    const regOk = AUDIT_LOG.length === Math.min(n0 + 3, AUDIT_MAX) && AUDIT_LOG[3] === top0 && mios.every(bien)
      && r1.accion === "Registro 1" && r2.accion === "Registro 2" && r3.accion === "Registro 3"
      && r1.ts >= t0 && r1.ts <= t1 && r3.ts >= r1.ts && r3.ts <= t1 && r2.ts === tAyer && r2.fecha === abs(tAyer).fecha && r2.fecha !== abs(t0).fecha
      && seqDe(r2) === seqDe(r1) + 1 && seqDe(r3) === seqDe(r2) + 1
      && r1.exito === true && r2.exito === false && r1.empresaId === "76.000.000-0" && r2.empresaId === ""
      && r1.glosa.includes("•••4321") && !r1.glosa.includes("8765")
      && AUDIT_COLA !== colaAntes && typeof AUDIT_COLA.then === "function";
    const syncOk = fonoOk && sondaFono && nsOk && fhOk && regOk;
    const detSync = `fonoOfuscado oculta ${fonoOk} (${fonoOfuscado("+56 9 8765 4321")}) · sonda identidad/tapa-final no pasa ${sondaFono} · nowStamp absoluto ${nsOk} (${ns}) · fecha del evento y no del reloj ${fhOk} (ayer → ${fhA.fecha}) · registro síncrono ${regOk} (ts entero, id monótono ${seqDe(r1)}→${seqDe(r3)}, hAlg ${r3 && r3.hAlg})`;
    const iOut = out.length;
    const TIT = "130 teléfonos ofuscados en los logs, marcas absolutas y auditoría encadenada y persistente";
    ok(TIT, syncOk, detSync + " · huella y persistencia: pendiente (asíncrono)");

    // (d) asíncrono: huella encadenada, sonda sobre copias y persistencia
    const fin = (async () => {
      let c = null; while (c !== AUDIT_COLA) { c = AUDIT_COLA; try { await c; } catch (e) { /* noop */ } }
      const huellaOk = (h) => HASH_ALG === "sha256" ? /^[0-9a-f]{64}$/.test(String(h || "")) : /^x/.test(String(h || ""));
      const bajo = (r) => AUDIT_LOG[AUDIT_LOG.indexOf(r) + 1] || null;
      const hDe = (r) => (r && r.h) || "";
      const h1 = await auditHuella(r1, hDe(bajo(r1))), h2 = await auditHuella(r2, r1.h), h3 = await auditHuella(r3, r2.h);
      const cadenaOk = mios.every((r) => huellaOk(r.h)) && r1.h === h1 && r2.h === h2 && r3.h === h3
        && bajo(r1) === top0 && bajo(r2) === r1 && bajo(r3) === r2 && r1.h !== r2.h && r2.h !== r3.h && r1.h !== r3.h;
      const vAll = await verificarAuditoria();
      const todoOk = vAll.ok === true && !(vAll.incompletos || []).some((id) => mios.some((r) => r.id === id));
      // dirección negativa, sobre COPIAS
      const copia = AUDIT_LOG.slice(); const i2 = copia.indexOf(r2);
      const alterada = copia.slice(); alterada[i2] = { ...r2, glosa: r2.glosa + " (alterada)" };
      const borrada = copia.filter((r) => r !== r2);
      const cambiada = copia.slice(); cambiada[i2] = r1; cambiada[i2 + 1] = r2;
      const vAlt = await verificarAuditoria(alterada), vBor = await verificarAuditoria(borrada), vCam = await verificarAuditoria(cambiada);
      const sondaOk = vAlt.ok === false && vAlt.en === r2.id && vBor.ok === false && vBor.en === r3.id && vCam.ok === false && vCam.en === r2.id;
      // persistencia
      let persOk = false, persDet = "storage no disponible";
      if (storageDisponible()) {
        await persistirAuditoria();
        const raw = JSON.parse(localStorage.getItem(AUDIT_KEY) || "null");
        const datos = (raw && raw.datos) || [];
        const enDisco = (r) => datos.find((x) => x.id === r.id);
        const vDisco = await verificarAuditoria(datos);
        persOk = !!raw && raw._v === SCHEMA_VERSION.auditoria && datos.length <= AUDIT_MAX
          && mios.every((r) => { const x = enDisco(r); return !!x && x.h === r.h && x.hAlg === r.hAlg && x.ts === r.ts && x.glosa === r.glosa && x.fecha === r.fecha && x.hora === r.hora; })
          && datos.every((x) => x.hAlg && !/^seed/.test(x.id)) && vDisco.ok === true;
        persDet = `${datos.length} en ${AUDIT_KEY} v${raw && raw._v} · 3 míos con huella · sin semilla · cadena en disco ${vDisco.ok}`;
      }
      const todo = syncOk && cadenaOk && todoOk && sondaOk && persOk;
      ok(TIT, todo,
        detSync + ` · huella ${HASH_ALG} encadenada en orden ${cadenaOk} (h1≠h2≠h3, cada una = auditHuella(r, h de abajo)) · cadena completa ${vAll.ok}${vAll.n ? " n=" + vAll.n : ""} · sonda: glosa alterada rompe en ${vAlt.en === r2.id ? "r2" : vAlt.en} ${vAlt.ok === false} · borrado del medio rompe en ${vBor.en === r3.id ? "r3" : vBor.en} ${vBor.ok === false} · intercambio rompe en ${vCam.en === r2.id ? "r2" : vCam.en} ${vCam.ok === false} · persistida ${persOk} (${persDet})`);
      out[iOut] = out.pop();
    })().catch((e) => { out[iOut] = "FALLA " + TIT + "  · la parte asíncrona reventó: " + String(e).slice(0, 200); });
    const plazo = new Promise((res) => setTimeout(() => { if (/pendiente \(asíncrono\)$/.test(out[iOut])) out[iOut] = out[iOut].replace(/^PASA  /, "FALLA ") + " · AUDIT_COLA no drenó en 20 s"; res(); }, 20000));
    const listo = Promise.race([fin, plazo]).catch(() => {});
    // componible: si otro caso ya dejó a `out` thenable, se espera lo de acá y después se le cede el turno
    const thenPrevio = typeof out.then === "function" ? out.then : null;
    out.then = (res) => { listo.then(() => { if (thenPrevio) { out.then = thenPrevio; thenPrevio(res); } else { delete out.then; res(out); } }); };
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 131 · regla TEN-01 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // NNN · TEN-01 · AISLAMIENTO POR TENANT: toda mutación usa el tenant FIJADO AL ABRIR LA SESIÓN y, si el
  //   tenant activo cambió sin re-autenticar, el repositorio la RECHAZA (no escribe, y deja el rechazo
  //   registrado en `CONTRATO_RECHAZOS` y en el log del sistema vía `registrarRechazo(invarianteDe("TEN-01"))`).
  //   El gate vive en `crearRepo` —cada `set`/`patch`/`push`/`del` pasa por `gate(op, id, valor)`, que compara
  //   `SESION.tenant` contra `TENANT_ACTUAL`— y el caso 113 ya fija que el scope por tenant viaja con el dato
  //   (la tabla persistida se indexa por tenant); acá se fija la otra mitad: el RECHAZO. Las dos direcciones:
  //   (a) sesión y tenant activo coinciden → las cuatro escrituras pasan, aterrizan SÓLO en la tabla del tenant
  //       de la sesión y no se cuenta ningún rechazo; (b) el tenant activo cambia con la sesión abierta → las
  //       cuatro se rechazan, la tabla del tenant original queda INTACTA (ni pisada, ni parchada, ni borrada),
  //       la del tenant ajeno queda vacía, el storage no se toca, y cada rechazo queda contado y logueado con
  //       la operación, el tenant de la sesión y el activo; (c) re-autenticar —la sesión vuelve a fijar el
  //       tenant activo, que es lo que hace `abrirSesion`— cierra la brecha y se escribe de nuevo, en la tabla
  //       del tenant nuevo; (d) la misma brecha vista desde el otro lado (SESION.tenant distinto, TENANT_ACTUAL
  //       intacto) también se rechaza. La suite corre SIN sesión (pantalla de login), así que la sesión se
  //       fija a mano con la MISMA forma que `abrirSesion` y se restaura al final, igual que el tenant.
  {
    const NOM = "sonda_ten01";
    const KEY = "pc_repo_" + NOM;
    const sesion0 = SESION, tenant0 = TENANT_ACTUAL;
    const rech0 = CONTRATO_RECHAZOS["TEN-01"], rat0 = CONTRATO_RECHAZOS["RAT-01"], idm0 = CONTRATO_RECHAZOS["IDM-01"];
    const n = (c) => CONTRATO_RECHAZOS[c] || 0;
    const leerKey = () => { try { return localStorage.getItem(KEY); } catch (_) { return null; } };
    const limpiar = () => {
      try { localStorage.removeItem(KEY); } catch (_) {}
      delete REPOS[NOM];
      for (const k of Object.keys(RATE_BUCKETS)) if (k.endsWith("|" + NOM)) delete RATE_BUCKETS[k];
      for (const k of [...IDEM_APLICADAS.keys()]) if (k.startsWith(NOM + "|")) IDEM_APLICADAS.delete(k);
      for (let i = SYS_LOG.length - 1; i >= 0; i--) { const d = SYS_LOG[i] && SYS_LOG[i].datos; if (d && typeof d.mutacion === "string" && d.mutacion.startsWith(NOM + ".")) SYS_LOG.splice(i, 1); }
    };
    limpiar();
    let res = null;
    try {
      const inv = invarianteDe("TEN-01");
      const invOk = !!inv && inv.mutaciones.includes("*") && inv.autoridad === "servidor" && inv.aplicado === "repositorio" && typeof inv.evaluar !== "function";
      const r = crearRepo(NOM);

      // (a) DIRECCIÓN VÁLIDA: la sesión fijó el tenant activo y nadie lo movió.
      SESION = { usuario: "CR", via: "prueba-TEN-01", tenant: TENANT_ACTUAL, iniciada: 1, expira: 4102444800000, actividad: 1 };
      const p1 = r.set("OP-1", { estado: "aprobada" });
      r.patch("OP-1", { por: "CR" });
      r.push("OP-2", { evento: "visado" });
      r.set("OP-3", { x: 1 }); r.del("OP-3");
      const t1 = r.all(tenant0) || {};
      const validaOk = !!p1 && typeof p1.then === "function"
        && !!t1["OP-1"] && t1["OP-1"].estado === "aprobada" && t1["OP-1"].por === "CR"
        && Array.isArray(t1["OP-2"]) && t1["OP-2"].length === 1 && !("OP-3" in t1);
      let g1 = {}; try { g1 = JSON.parse(leerKey() || "{}"); } catch (_) {}
      // aterriza SÓLO en la tabla del tenant de la sesión: ninguna otra clave de tenant en el storage
      const soloTenantOk = Object.keys(g1).join(",") === SESION.tenant && !!g1[tenant0]["OP-1"] && g1[tenant0]["OP-1"].por === "CR";
      const sinRechazoValido = n("TEN-01") === (rech0 || 0);
      const foto = leerKey();
      const idLog0 = SYS_LOG[0] ? SYS_LOG[0].id : 0;

      // (b) DIRECCIÓN INVÁLIDA: el tenant activo CAMBIA con la sesión abierta (es lo que hace el host por
      //     `parameters.tenant`), sin volver a autenticar. Las cuatro operaciones tienen que rechazarse.
      const AJENO = tenant0 + "_ajeno";
      TENANT_ACTUAL = AJENO;
      const ops = [
        ["set",   () => r.set("OP-1", { estado: "pisada" })],
        ["patch", () => r.patch("OP-1", { por: "intruso" })],
        ["push",  () => r.push("OP-2", { evento: "ajeno" })],
        ["del",   () => r.del("OP-1")],
      ];
      const porOp = [];
      let todasRech = true;
      for (const [op, f] of ops) {
        const antes = n("TEN-01");
        const p = f();
        const e = SYS_LOG[0];
        const conto = n("TEN-01") === antes + 1;
        const logOk = !!e && e.id > idLog0 && e.nivel === "warn" && e.fuente === "contrato"
          && String(e.mensaje).includes("TEN-01") && String(e.mensaje).includes(`${NOM}.${op}`)
          && !!e.datos && e.datos.codigo === "TEN-01" && e.datos.mutacion === `${NOM}.${op}`
          && e.datos.sesion === tenant0 && e.datos.activo === AJENO && e.datos.autoridad === "servidor";
        const esPromesa = !!p && typeof p.then === "function";
        todasRech = todasRech && conto && logOk && esPromesa;
        porOp.push(`${op} ${conto && logOk && esPromesa ? "rechazada" : "NO(" + [conto, logOk, esPromesa].join("/") + ")"}`);
      }
      const ajenaVacia = Object.keys(r.all(AJENO) || {}).length === 0;
      TENANT_ACTUAL = tenant0;
      const t2 = r.all(tenant0) || {};
      const intactaOk = !!t2["OP-1"] && t2["OP-1"].estado === "aprobada" && t2["OP-1"].por === "CR"
        && Array.isArray(t2["OP-2"]) && t2["OP-2"].length === 1 && t2["OP-2"][0].evento === "visado";
      const storageIntacto = leerKey() === foto;
      const cuatroRechazos = n("TEN-01") === (rech0 || 0) + 4;

      // (c) RE-AUTENTICAR cierra la brecha: la sesión vuelve a fijar el tenant activo (lo que hace
      //     `abrirSesion`: `tenant: TENANT_ACTUAL`) y la escritura pasa, en la tabla del tenant NUEVO.
      const abrirFija = /tenant:\s*TENANT_ACTUAL\b/.test(String(abrirSesion));
      TENANT_ACTUAL = AJENO;
      SESION = { ...SESION, tenant: TENANT_ACTUAL };
      r.set("OP-9", { ok: 1 });
      const tA = r.all(AJENO) || {};
      const reautOk = !!tA["OP-9"] && tA["OP-9"].ok === 1 && !("OP-9" in (r.all(tenant0) || {})) && n("TEN-01") === (rech0 || 0) + 4;
      TENANT_ACTUAL = tenant0;

      // (d) LA MISMA BRECHA DESDE EL OTRO LADO: tenant activo intacto y la sesión con un tenant viejo.
      SESION = { ...SESION, tenant: tenant0 + "_viejo" };
      const a4 = n("TEN-01");
      r.set("OP-1", { estado: "pisada2" });
      const op1 = (r.all(tenant0) || {})["OP-1"];   // guardado: si el gate rechazara de más, OP-1 no existe y esto debe ser FALLA, no un throw
      const otroLadoOk = n("TEN-01") === a4 + 1 && !!op1 && op1.estado === "aprobada";

      // Ningún otro invariante se coló en la cuenta (los rechazos son de TEN-01 y no de tasa ni idempotencia).
      const soloTen01 = n("RAT-01") === (rat0 || 0) && n("IDM-01") === (idm0 || 0);

      res = { invOk, validaOk, soloTenantOk, sinRechazoValido, todasRech, porOp, ajenaVacia, intactaOk, storageIntacto, cuatroRechazos, abrirFija, reautOk, otroLadoOk, soloTen01, tenant0, AJENO };
    } finally {
      SESION = sesion0; TENANT_ACTUAL = tenant0;
      if (rech0 === undefined) delete CONTRATO_RECHAZOS["TEN-01"]; else CONTRATO_RECHAZOS["TEN-01"] = rech0;
      limpiar();
    }
    const R = res || {};
    ok("131 TEN-01 aislamiento por tenant: la mutación usa el tenant fijado en la sesión y, si el activo cambió sin re-autenticar, el repositorio la rechaza y lo registra",
       !!res && R.invOk && R.validaOk && R.soloTenantOk && R.sinRechazoValido && R.todasRech && R.ajenaVacia && R.intactaOk && R.storageIntacto && R.cuatroRechazos && R.abrirFija && R.reautOk && R.otroLadoOk && R.soloTen01,
       `invariante mutaciones * · servidor · repositorio ${R.invOk} · (a) sesión=activo (${R.tenant0}): set/patch/push/del pasan ${R.validaOk}, sólo en la tabla de la sesión ${R.soloTenantOk}, sin rechazo ${R.sinRechazoValido}`
       + ` · (b) activo→${R.AJENO} sin re-autenticar: ${(R.porOp || []).join(", ")} (contadas y logueadas con sesion/activo ${R.todasRech}) · tabla original intacta ${R.intactaOk} · tabla ajena vacía ${R.ajenaVacia} · storage intacto ${R.storageIntacto} · CONTRATO_RECHAZOS +4 ${R.cuatroRechazos}`
       + ` · (c) re-autenticar (abrirSesion fija tenant: TENANT_ACTUAL ${R.abrirFija}) vuelve a escribir, en la tabla nueva ${R.reautOk} · (d) SESION.tenant viejo con activo intacto también se rechaza ${R.otroLadoOk} · sin RAT-01/IDM-01 en la cuenta ${R.soloTen01}`);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 132 · regla RAT-01 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · RAT-01 · LÍMITE DE TASA POR (USUARIO, COLECCIÓN): máximo de mutaciones por minuto.
  //    Dos mitades. (a) `limiteTasa(clave, porMinuto)` es el contador: con una clave única, las N primeras
  //    llamadas pasan y la N+1 NO (dirección negativa); la ventana es DESLIZANTE y se mide contra
  //    `CONTRATO_LIMITES.ventanaMs` —se plantan marcas en el bucket, no se espera al reloj—: N marcas más
  //    viejas que la ventana salen y la llamada pasa; N marcas dentro de la ventana siguen contando y la
  //    llamada no pasa. Otra clave tiene su propio bucket. (b) el GATE de `crearRepo` es quien la aplica: la
  //    clave es `${usuario}|${familia}` y el tope el de `CONTRATO_LIMITES.porMinuto[familia] || default`.
  //    `otorgamiento_visado` y `otorgamiento_visado_detalle` comparten bucket (CONTRATO_FAMILIA → "visado"):
  //    se llena el bucket a tope−1, la escritura en el visado pasa (la N-ésima) y la SIGUIENTE en el
  //    detalle se rechaza con el código RAT-01 —no se escribe, la promesa resuelve {ok:false, codigo}, el
  //    contador del visor sube y el log lo dice—. «Por (usuario, colección)»: el MISMO usuario en OTRA
  //    colección pasa, y OTRO usuario en la misma colección pasa. Todo el estado que se toca (SESION,
  //    RATE_BUCKETS, CONTRATO_RECHAZOS, los tres repos, IDEM_APLICADAS) se restaura.
  {
    const V = CONTRATO_LIMITES.ventanaMs;
    const N = 5;
    // (a) contador
    const K = "rat01|suite|" + Date.now(), K2 = K + "|otra";
    delete RATE_BUCKETS[K]; delete RATE_BUCKETS[K2];
    const res = []; for (let i = 0; i < N + 2; i++) res.push(limiteTasa(K, N));
    const cuentaOk = res.slice(0, N).every((x) => x === true) && res[N] === false && res[N + 1] === false && (RATE_BUCKETS[K] || []).length === N;
    const ahora = Date.now();
    RATE_BUCKETS[K] = Array.from({ length: N }, () => ahora - V - 1000);       // fuera de la ventana
    const viejasOk = limiteTasa(K, N) === true && (RATE_BUCKETS[K] || []).length === 1;
    RATE_BUCKETS[K] = Array.from({ length: N }, () => ahora - Math.floor(V / 2)); // dentro de la ventana
    const vigentesOk = limiteTasa(K, N) === false && (RATE_BUCKETS[K] || []).length === N;
    const claveOk = limiteTasa(K2, N) === true && (RATE_BUCKETS[K2] || []).length === 1 && (RATE_BUCKETS[K] || []).length === N;
    const ceroOk = limiteTasa(K + "|0", 0) === false;                           // tope 0: ninguna pasa
    delete RATE_BUCKETS[K]; delete RATE_BUCKETS[K2]; delete RATE_BUCKETS[K + "|0"];
    const contadorOk = cuentaOk && viejasOk && vigentesOk && claveOk && ceroOk;

    // (b) gate del repositorio
    const fam = CONTRATO_FAMILIA[repoVisado.nombre] || repoVisado.nombre;
    const famDet = CONTRATO_FAMILIA[repoVisadoDetalle.nombre] || repoVisadoDetalle.nombre;
    const familiaOk = repoVisado.nombre === "otorgamiento_visado" && repoVisadoDetalle.nombre === "otorgamiento_visado_detalle"
      && !!CONTRATO_FAMILIA[repoVisado.nombre] && fam === famDet;
    const tope = CONTRATO_LIMITES.porMinuto[fam] || CONTRATO_LIMITES.porMinuto.default;
    const topeOk = Number.isFinite(tope) && tope > 0 && tope <= 1e5;   // un límite apagado (Infinity) es FALLA, no un RangeError que aborte la suite
    const famOtra = CONTRATO_FAMILIA[repoSolicitudExc.nombre] || repoSolicitudExc.nombre;
    const otraColeccionOk = famOtra !== fam;
    const U = "T-RAT01-" + Date.now(), U2 = U + "-b";
    const KU = `${U}|${fam}`, KU2 = `${U2}|${fam}`, KUo = `${U}|${famOtra}`;
    const ID = "OP-RAT01-" + Date.now(), ID2 = ID + "-b";
    const sesionAntes = SESION;
    const lsAntes = new Set([repoVisado, repoVisadoDetalle, repoSolicitudExc].map((rp) => "pc_repo_" + rp.nombre).filter((k) => localStorage.getItem(k) !== null));
    const rechAntes = Object.prototype.hasOwnProperty.call(CONTRATO_RECHAZOS, "RAT-01") ? CONTRATO_RECHAZOS["RAT-01"] : undefined;
    const nRech = () => CONTRATO_RECHAZOS["RAT-01"] || 0;
    const nLog = () => SYS_LOG.filter((e) => e.fuente === "contrato" && e.datos && e.datos.codigo === "RAT-01").length;
    const rech0 = nRech(), log0 = nLog();
    let p1, p2, p3, p4, p5, p6;
    let pasaOk = false, rechazaOk = false, otraColOk = false, otroUsrOk = false, logOk = false;
    try {
      SESION = { usuario: U, via: "suite", tenant: TENANT_ACTUAL, iniciada: Date.now(), expira: Date.now() + 3600000, actividad: Date.now() };
      delete RATE_BUCKETS[KU]; delete RATE_BUCKETS[KU2]; delete RATE_BUCKETS[KUo];
      RATE_BUCKETS[KU] = Array.from({ length: topeOk ? tope - 1 : 0 }, () => Date.now());
      // la N-ésima pasa (lo válido pasa)
      p1 = repoVisado.set(ID, { estado: "excepcion", marca: "rat01" });
      pasaOk = !!repoVisado.get(ID) && repoVisado.get(ID).marca === "rat01" && (RATE_BUCKETS[KU] || []).length === tope && nRech() === rech0;
      // la N+1, en el OTRO repo de la MISMA familia, se rechaza: no escribe, sube el contador, no consume cupo
      p2 = repoVisadoDetalle.set(ID, { marca: "rat01-detalle" });
      p3 = repoVisado.patch(ID, { marca: "rat01-patch" });
      p4 = repoVisado.del(ID);
      rechazaOk = repoVisadoDetalle.get(ID) === undefined && !!repoVisado.get(ID) && repoVisado.get(ID).marca === "rat01"
        && nRech() === rech0 + 3 && (RATE_BUCKETS[KU] || []).length === tope;
      const ultimo = SYS_LOG.find((e) => e.fuente === "contrato" && e.datos && e.datos.codigo === "RAT-01");
      logOk = nLog() === log0 + 3 && !!ultimo && ultimo.nivel === "warn" && ultimo.datos.tope === tope && ultimo.datos.familia === fam
        && ultimo.datos.mutacion === repoVisado.nombre + ".del" && /RAT-01/.test(ultimo.mensaje);
      // mismo usuario, OTRA colección: su propio bucket, pasa
      p5 = repoSolicitudExc.set(ID, { marca: "rat01-otra" });
      otraColOk = !!repoSolicitudExc.get(ID) && (RATE_BUCKETS[KUo] || []).length === 1 && nRech() === rech0 + 3;
      // OTRO usuario, MISMA colección: su propio bucket, pasa
      SESION = { ...SESION, usuario: U2 };
      p6 = repoVisadoDetalle.set(ID2, { marca: "rat01-u2" });
      otroUsrOk = !!repoVisadoDetalle.get(ID2) && (RATE_BUCKETS[KU2] || []).length === 1 && (RATE_BUCKETS[KU] || []).length === tope && nRech() === rech0 + 3;
    } finally {
      // limpieza: buckets fuera, filas de prueba borradas (con el bucket vacío el `del` pasa por el gate), sesión y contador restaurados
      delete RATE_BUCKETS[KU]; delete RATE_BUCKETS[KU2]; delete RATE_BUCKETS[KUo];
      SESION = { usuario: U, via: "suite", tenant: TENANT_ACTUAL, iniciada: Date.now(), expira: Date.now() + 3600000, actividad: Date.now() };
      repoVisado.del(ID); repoVisadoDetalle.del(ID); repoSolicitudExc.del(ID); repoVisadoDetalle.del(ID2);
      delete RATE_BUCKETS[KU]; delete RATE_BUCKETS[KUo];
      SESION = sesionAntes;
      if (rechAntes === undefined) delete CONTRATO_RECHAZOS["RAT-01"]; else CONTRATO_RECHAZOS["RAT-01"] = rechAntes;
      for (const k of [...IDEM_APLICADAS.keys()]) if (k.includes(ID)) IDEM_APLICADAS.delete(k);
      // el tubo borró estas claves al cargar (REPOS_FRESCOS): si el caso las creó, las retira (como hace el 113)
      for (const rp of [repoVisado, repoVisadoDetalle, repoSolicitudExc]) { const k = "pc_repo_" + rp.nombre; if (!lsAntes.has(k)) localStorage.removeItem(k); }
    }
    const limpioOk = repoVisado.get(ID) === undefined && repoVisadoDetalle.get(ID) === undefined && repoSolicitudExc.get(ID) === undefined
      && repoVisadoDetalle.get(ID2) === undefined && !RATE_BUCKETS[KU] && !RATE_BUCKETS[KU2] && !RATE_BUCKETS[KUo] && SESION === sesionAntes
      && (CONTRATO_RECHAZOS["RAT-01"] || 0) === (rechAntes || 0);
    const gateOk = topeOk && familiaOk && otraColeccionOk && pasaOk && rechazaOk && logOk && otraColOk && otroUsrOk && limpioOk;
    const det = `limiteTasa: ${N} pasan y la ${N + 1} no ${cuentaOk} · marcas fuera de la ventana (${V} ms) salen ${viejasOk} · dentro siguen contando ${vigentesOk} · otra clave aparte ${claveOk} · tope 0 rechaza ${ceroOk}`
      + ` · gate: familia compartida ${repoVisado.nombre}+${repoVisadoDetalle.nombre}→"${fam}" ${familiaOk} tope ${tope} (finito y ≤ 1e5: ${topeOk}) · la ${tope}ª escritura pasa ${pasaOk} · la siguiente (set/patch/del) se rechaza sin escribir ni consumir cupo ${rechazaOk} · log RAT-01 con tope y familia ${logOk}`
      + ` · mismo usuario otra colección (${famOtra}) pasa ${otraColOk} · otro usuario misma colección pasa ${otroUsrOk} · estado restaurado ${limpioOk}`;
    const TIT = "132 RAT-01 · el repositorio corta la mutación que excede el tope por (usuario, familia de colecciones) y devuelve el código del contrato";
    const iOut = out.length;
    ok(TIT, contadorOk && gateOk, det + " · promesas: pendiente (asíncrono)");
    // (c) lo que ve el LLAMADOR: la escritura válida confirma {ok:true} y la rechazada resuelve —no rechaza— con
    //     {ok:false, codigo:"RAT-01"} y la versión del contrato, que es lo que `confirmarEscrituras` mira.
    const fin = (async () => {
      const [r1, r2, r3, r4, r5, r6] = await Promise.all([p1, p2, p3, p4, p5, p6]);
      const bien = (r, repo, op) => !!r && r.ok === false && r.codigo === "RAT-01" && r.repo === repo && r.op === op && r.id === ID && r.contrato === CONTRATO_VERSION;
      const promOk = !!r1 && r1.ok === true && r1.repo === repoVisado.nombre && r1.op === "set"
        && bien(r2, repoVisadoDetalle.nombre, "set") && bien(r3, repoVisado.nombre, "patch") && bien(r4, repoVisado.nombre, "del")
        && !!r5 && r5.ok === true && !!r6 && r6.ok === true;
      ok(TIT, contadorOk && gateOk && promOk, det + ` · promesas: válida {ok:true} y rechazadas {ok:false, codigo:"RAT-01", contrato ${CONTRATO_VERSION}} ${promOk}`);
      out[iOut] = out.pop();
    })().catch((e) => { out[iOut] = "FALLA " + TIT + "  · la parte asíncrona reventó: " + String(e).slice(0, 200); });
    const plazo = new Promise((res) => setTimeout(() => { if (/pendiente \(asíncrono\)$/.test(out[iOut])) out[iOut] = out[iOut].replace(/^PASA  /, "FALLA ") + " · las promesas del repositorio no resolvieron en 5 s"; res(); }, 5000));
    const listo = Promise.race([fin, plazo]).catch(() => {});
    const thenPrevio = typeof out.then === "function" ? out.then : null;
    out.then = (res) => { listo.then(() => { if (thenPrevio) { out.then = thenPrevio; thenPrevio(res); } else { delete out.then; res(out); } }); };
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 133 · regla IDM-01 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · IDM-01 · IDEMPOTENCIA DE LA MUTACIÓN (OBSERVADA, NO BLOQUEANTE): la misma mutación no se aplica
  //    dos veces es la regla del SERVIDOR; acá sólo se CUENTAN los duplicados, porque sin una clave de
  //    mutación emitida por el cliente, bloquear un duplicado legítimo (el motor escribiendo el mismo valor
  //    dos veces) rompería la operación. Dos mitades y una sonda.
  //    (a) `esDuplicada(repo, op, id, valor)` es el detector: la clave es `repo|op|id|hashStr(JSON(valor))`
  //        sobre `IDEM_APLICADAS`, con ventana `CONTRATO_LIMITES.idemVentanaMs`. Las dos direcciones: la
  //        primera es false y la misma inmediata es true; y cambiar CUALQUIERA de los cuatro componentes
  //        —valor, op, id, repo— da false. `undefined` y `null` son el mismo valor (es como `del` llama).
  //        La ventana es deslizante y se mide contra el mapa, no contra el reloj: una marca más vieja que
  //        la ventana ya no es duplicado y se RE-registra fresca; una dentro de la ventana sí lo es; y la
  //        purga es global —una clave ajena vencida sale al evaluar cualquier otra—.
  //    (b) el GATE de `crearRepo` es quien lo consume, y lo que HACE es contar y SEGUIR: la escritura
  //        duplicada se cuenta en `CONTRATO_RECHAZOS["IDM-01"]`, se loguea con `observado: true`, y aun así
  //        se APLICA —el `push` doble deja DOS ítems iguales en la lista y en el storage, el `patch`, el
  //        `set` y el `del` dobles pasan igual— y su promesa resuelve `{ok:true}`, no `{ok:false, codigo}`.
  //        Una escritura con otro valor no se cuenta.
  //    (c) SONDA: se silencia el detector (`esDuplicada = () => false`) y el mismo par de escrituras deja
  //        de contarse; restaurado, vuelve a contar. Fija que el conteo pasa por `esDuplicada` y no por
  //        otro camino. Todo lo tocado (SESION, CONTRATO_RECHAZOS, IDEM_APLICADAS, RATE_BUCKETS, REPOS,
  //        SYS_LOG, storage, el propio `esDuplicada`) se restaura.
  {
    const V = CONTRATO_LIMITES.idemVentanaMs;
    const NOM = "sonda_idm01";
    const KEY = "pc_repo_" + NOM;
    const RP = "idm01|repo";
    const sesion0 = SESION;
    const idm0 = CONTRATO_RECHAZOS["IDM-01"], ten0 = CONTRATO_RECHAZOS["TEN-01"], rat0 = CONTRATO_RECHAZOS["RAT-01"];
    const n = (c) => CONTRATO_RECHAZOS[c] || 0;
    const clave = (repo, op, id, valor) => `${repo}|${op}|${id}|${hashStr(JSON.stringify(valor === undefined ? null : valor))}`;
    const esDupOriginal = esDuplicada;
    const limpiar = () => {
      try { localStorage.removeItem(KEY); } catch (_) {}
      delete REPOS[NOM];
      for (const k of Object.keys(RATE_BUCKETS)) if (k.endsWith("|" + NOM)) delete RATE_BUCKETS[k];
      for (const k of [...IDEM_APLICADAS.keys()]) if (k.startsWith(NOM + "|") || k.startsWith("idm01|")) IDEM_APLICADAS.delete(k);
      for (let i = SYS_LOG.length - 1; i >= 0; i--) { const d = SYS_LOG[i] && SYS_LOG[i].datos; if (d && typeof d.mutacion === "string" && d.mutacion.startsWith(NOM + ".")) SYS_LOG.splice(i, 1); }
    };
    limpiar();
    let R = null, P = [];
    try {
      const inv = invarianteDe("IDM-01");
      // Sin `evaluar`: `validarMutacion` no lo mira, lo aplica el gate del repositorio.
      const invOk = !!inv && inv.mutaciones.includes("*") && inv.autoridad === "servidor" && inv.aplicado === "observado"
        && typeof inv.evaluar !== "function" && validarMutacion("cualquiera", {}).violaciones.every((x) => x.codigo !== "IDM-01")
        && typeof V === "number" && V > 0;

      // (a) DETECTOR
      const ID = "OP-1", v1 = { estado: "aprobada", por: "CR" };
      const d1 = esDuplicada(RP, "set", ID, v1);                       // primera: false
      const claveOk = IDEM_APLICADAS.has(clave(RP, "set", ID, v1));   // y queda registrada con ESA clave
      const d2 = esDuplicada(RP, "set", ID, v1);                       // la misma inmediata: true
      const d3 = esDuplicada(RP, "set", ID, { ...v1, por: "RF" });     // otro valor: false
      const d4 = esDuplicada(RP, "patch", ID, v1);                     // otra op: false
      const d5 = esDuplicada(RP, "set", "OP-2", v1);                   // otro id: false
      const d6 = esDuplicada(RP + "|b", "set", ID, v1);                // otro repo: false
      const d7 = esDuplicada(RP, "set", ID, v1);                       // las distintas no borran la original: sigue true
      const dOrden = esDuplicada(RP, "set", ID, { por: "CR", estado: "aprobada" }); // mismo contenido, otro orden de claves (sólo se mide)
      const detectorOk = d1 === false && claveOk && d2 === true && d3 === false && d4 === false && d5 === false && d6 === false && d7 === true;
      const u1 = esDuplicada(RP, "del", ID, undefined), u2 = esDuplicada(RP, "del", ID, null);
      const nullOk = u1 === false && u2 === true;
      // ventana deslizante, medida sobre el mapa
      const K = clave(RP, "set", ID, v1);
      IDEM_APLICADAS.set(K, Date.now() - V - 1000);
      const dExp = esDuplicada(RP, "set", ID, v1);                     // vencida: ya no es duplicado…
      const reReg = IDEM_APLICADAS.has(K) && Date.now() - IDEM_APLICADAS.get(K) < 1000; // …y se re-registra fresca
      IDEM_APLICADAS.set(K, Date.now() - Math.floor(V / 2));
      const dVig = esDuplicada(RP, "set", ID, v1);                     // dentro de la ventana: duplicado
      const KV = "idm01|vieja|x|0"; IDEM_APLICADAS.set(KV, Date.now() - V - 1000);
      esDuplicada(RP, "set", "OP-3", v1);
      const purgaOk = !IDEM_APLICADAS.has(KV);                         // la purga es global
      const ventanaOk = dExp === false && reReg && dVig === true && purgaOk;

      // (b) GATE: cuenta y SIGUE
      const r = crearRepo(NOM);
      SESION = { usuario: "T-IDM01-" + Date.now(), via: "prueba-IDM-01", tenant: TENANT_ACTUAL, iniciada: 1, expira: 4102444800000, actividad: 1 };
      const idLog0 = SYS_LOG[0] ? SYS_LOG[0].id : 0;
      const b0 = n("IDM-01");
      const p1 = r.set("OP-1", v1);
      const primeraNoCuenta = n("IDM-01") === b0 && !!r.get("OP-1") && r.get("OP-1").por === "CR";
      const p2 = r.set("OP-1", v1);                                    // la misma inmediata
      const e = SYS_LOG[0];
      const dupCuenta = n("IDM-01") === b0 + 1;
      const logOk = !!e && e.id > idLog0 && e.nivel === "warn" && e.fuente === "contrato" && !!e.datos && e.datos.codigo === "IDM-01"
        && e.datos.mutacion === NOM + ".set" && e.datos.id === "OP-1" && e.datos.observado === true && e.datos.autoridad === "servidor";
      const p3 = r.set("OP-1", { ...v1, por: "RF" });                  // otro valor: no cuenta, escribe
      const otroValorOk = n("IDM-01") === b0 + 1 && r.get("OP-1").por === "RF";
      const item = { evento: "visado" };
      const p4 = r.push("OP-2", item); const p5 = r.push("OP-2", item); // push doble: se cuenta Y se aplica
      const t = r.all(TENANT_ACTUAL) || {};
      const pushOk = n("IDM-01") === b0 + 2 && Array.isArray(t["OP-2"]) && t["OP-2"].length === 2;
      const p6 = r.patch("OP-1", { n: 1 }); const p7 = r.patch("OP-1", { n: 1 });
      const patchOk = n("IDM-01") === b0 + 3 && r.get("OP-1").n === 1 && r.get("OP-1").por === "RF";
      const p8 = r.del("OP-1"); const p9 = r.del("OP-1");
      const delOk = n("IDM-01") === b0 + 4 && r.get("OP-1") === undefined;
      let g = {}; try { g = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) {}
      const storageOk = (((g[TENANT_ACTUAL] || {})["OP-2"]) || []).length === 2;   // lo aplicado dos veces está persistido dos veces
      const soloIdm = n("TEN-01") === (ten0 || 0) && n("RAT-01") === (rat0 || 0);
      const nLog = SYS_LOG.filter((x) => x.datos && x.datos.codigo === "IDM-01" && x.datos.mutacion && x.datos.mutacion.startsWith(NOM + ".")).length;
      const logCuentaOk = nLog === 4 && SYS_LOG.filter((x) => x.datos && x.datos.codigo === "IDM-01" && x.datos.mutacion && x.datos.mutacion.startsWith(NOM + ".")).every((x) => x.datos.observado === true);

      // (c) SONDA: detector silenciado → el mismo par deja de contarse; restaurado → vuelve a contar.
      let sondaOk = false, sondaNota = "";
      try {
        esDuplicada = () => false;
        const a = n("IDM-01");
        r.set("OP-5", v1); r.set("OP-5", v1);
        sondaOk = n("IDM-01") === a;
        sondaNota = sondaOk ? "silenciado el detector el duplicado NO se cuenta" : "silenciado el detector el gate siguió contando";
      } catch (ex) { sondaNota = "no se pudo silenciar: " + String(ex).slice(0, 80); }
      finally { esDuplicada = esDupOriginal; }
      const a2 = n("IDM-01"); r.set("OP-6", v1); r.set("OP-6", v1);
      const restauradoOk = esDuplicada === esDupOriginal && n("IDM-01") === a2 + 1;

      P = [p1, p2, p3, p4, p5, p6, p7, p8, p9];
      R = { invOk, V, detectorOk, dOrden, nullOk, ventanaOk, primeraNoCuenta, dupCuenta, logOk, otroValorOk, pushOk, patchOk, delOk, storageOk, soloIdm, logCuentaOk, sondaOk, sondaNota, restauradoOk };
    } finally {
      esDuplicada = esDupOriginal;
      SESION = sesion0;
      if (idm0 === undefined) delete CONTRATO_RECHAZOS["IDM-01"]; else CONTRATO_RECHAZOS["IDM-01"] = idm0;
      limpiar();
    }
    const limpioOk = esDuplicada === esDupOriginal && SESION === sesion0 && n("IDM-01") === (idm0 || 0) && !REPOS[NOM]
      && ![...IDEM_APLICADAS.keys()].some((k) => k.startsWith(NOM + "|") || k.startsWith("idm01|"));
    const Q = R || {};
    const sincOk = !!R && Q.invOk && Q.detectorOk && Q.nullOk && Q.ventanaOk && Q.primeraNoCuenta && Q.dupCuenta && Q.logOk && Q.otroValorOk
      && Q.pushOk && Q.patchOk && Q.delOk && Q.storageOk && Q.soloIdm && Q.logCuentaOk && Q.sondaOk && Q.restauradoOk && limpioOk;
    const det = `invariante * · servidor · observado · sin evaluar ${Q.invOk} · ventana ${Q.V} ms`
      + ` · esDuplicada: primera false, misma inmediata true, otro valor/op/id/repo false ${Q.detectorOk} (mismo contenido con otro orden de claves → duplicada: ${Q.dOrden}) · undefined≡null ${Q.nullOk}`
      + ` · marca vencida no es duplicado y se re-registra, vigente sí, purga global ${Q.ventanaOk}`
      + ` · gate: la primera no cuenta ${Q.primeraNoCuenta} · la misma inmediata cuenta ${Q.dupCuenta} y loguea observado:true ${Q.logOk} · otro valor no cuenta ${Q.otroValorOk}`
      + ` · push doble se cuenta Y se aplica (2 ítems) ${Q.pushOk} · patch doble ${Q.patchOk} · del doble ${Q.delOk} · storage con los 2 ítems ${Q.storageOk} · 4 entradas de log, todas observado ${Q.logCuentaOk} · sin TEN-01/RAT-01 ${Q.soloIdm}`
      + ` · sonda: ${Q.sondaNota} ${Q.sondaOk} · restaurado vuelve a contar ${Q.restauradoOk} · estado restaurado ${limpioOk}`;
    const TIT = "133 IDM-01 · la mutación duplicada se detecta y se cuenta, pero se aplica igual: la idempotencia real es del servidor";
    const iOut = out.length;
    ok(TIT, sincOk, det + " · promesas: pendiente (asíncrono)");
    // Lo que ve el LLAMADOR: las nueve escrituras —duplicadas incluidas— confirman {ok:true}; ninguna trae
    // {ok:false, codigo:"IDM-01"}, porque el gate observa y no rechaza.
    const fin = (async () => {
      const rs = await Promise.all(P);
      const promOk = rs.length === 9 && rs.every((x) => !!x && x.ok === true && x.repo === NOM && x.codigo === undefined)
        && rs[1].op === "set" && rs[4].op === "push" && rs[6].op === "patch" && rs[8].op === "del";
      ok(TIT, sincOk && promOk, det + ` · promesas: las 9 escrituras (5 duplicadas) resuelven {ok:true} sin código ${promOk}`);
      out[iOut] = out.pop();
    })().catch((e) => { out[iOut] = "FALLA " + TIT + "  · la parte asíncrona reventó: " + String(e).slice(0, 200); });
    const plazo = new Promise((res) => setTimeout(() => { if (/pendiente \(asíncrono\)$/.test(out[iOut])) out[iOut] = out[iOut].replace(/^PASA  /, "FALLA ") + " · las promesas del repositorio no resolvieron en 5 s"; res(); }, 5000));
    const listo = Promise.race([fin, plazo]).catch(() => {});
    const thenPrevio = typeof out.then === "function" ? out.then : null;
    out.then = (res) => { listo.then(() => { if (thenPrevio) { out.then = thenPrevio; thenPrevio(res); } else { delete out.then; res(out); } }); };
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 134 · regla LIN-01 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · LIN-01 · LA OPERACIÓN NO SUPERA LA LÍNEA DISPONIBLE DEL CLIENTE AL ARMARLA.
  //    Dos capas, porque el invariante declara `aplicado: "motor"` y además trae un `evaluar`:
  //    (a) CONTRATO. `validarMutacion` corre el `evaluar` de LIN-01 para las DOS mutaciones que declara
  //        (`oportunidad.crear`, `oportunidad.incorporarFacturas`): el monto se compara contra
  //        `lineaCreditoDe(deal).disponible`, que es aprobada − utilizada de la fila de LINEAS_DATA (A23).
  //        Dos direcciones sobre un cliente REAL con línea: monto = disponible PASA; disponible + 1 peso
  //        se RECHAZA con el código LIN-01, el contador del visor sube y el log lo dice. Sin `monto` en el
  //        payload juzga `deal.monto` (así entra `oportunidad.crear`). Un cliente que el archivo NO declara
  //        tiene disponible 0: un peso ya viola, cero pasa. Y una mutación que LIN-01 no cubre
  //        (`condiciones.guardar`) NO lo evalúa aunque el monto exceda — la SONDA que fija que el rechazo
  //        viene de este invariante y no de un evaluador que dice que no a todo.
  //    (b) MOTOR. `asignarLineas` es quien lo aplica de verdad: con la Línea Global Cliente en X (asignada −
  //        uso, la MISMA definición que `disponible`) y par y deudor holgados, una factura de X queda
  //        CON_LINEA y cursable exacto; de X + 1 peso queda REQUIERE_COMITE con motivo `cliente`, que es el
  //        nivel que bloqueó. Todo el estado que se toca (CONTRATO_RECHAZOS) se restaura.
  {
    const mut = invarianteDe("LIN-01");
    const declaraOk = !!mut && typeof mut.evaluar === "function"
      && mut.mutaciones.includes("oportunidad.crear") && mut.mutaciones.includes("oportunidad.incorporarFacturas")
      && !mut.mutaciones.includes("*") && !mut.mutaciones.includes("condiciones.guardar");

    // Cliente REAL con línea y uso (para que disponible ≠ aprobada y la resta se pruebe de verdad)
    const fila = LINEAS_DATA.find((l) => l.disponible > 0 && l.uso > 0) || LINEAS_DATA.find((l) => l.disponible > 0);
    const deal = { id: "OP-LIN01", cliente: fila.cliente, rutEmisor: fila.rut, monto: 0, deudores: [], facturasOp: [] };
    const lc = lineaCreditoDe(deal);
    const disp = lc.disponible;
    const dispCalc = Math.round(fila.aprobada - fila.uso);
    const lecturaOk = lc.aprobada === fila.aprobada && disp === dispCalc && disp > 0;   // disponible = aprobada − utilizada es la definición del vault (ui_detalle_y_tubo.md § «Disponible conserva UNA definición»), no de LIN-01

    const rechAntes = { ...CONTRATO_RECHAZOS };   // foto ENTERA: la sonda (a5) pasa por condiciones.guardar y podría dejar un ATR-01
    const nRech = () => CONTRATO_RECHAZOS["LIN-01"] || 0;
    const nLog = () => SYS_LOG.filter((e) => e.fuente === "contrato" && e.datos && e.datos.codigo === "LIN-01").length;
    const rech0 = nRech(), log0 = nLog();
    const viola = (v) => !v.ok && v.violaciones.length === 1 && v.violaciones[0].codigo === "LIN-01";
    const limpia = (v) => v.ok && v.violaciones.length === 0;
    let pasaOk = false, rechazaOk = false, crearOk = false, fantasmaOk = false, contadorOk = false, sondaOk = false;
    try {
      // (a1) incorporarFacturas · monto explícito: igual pasa, un peso más viola
      const vIgual = validarMutacion("oportunidad.incorporarFacturas", { deal, monto: disp });
      const vMas = validarMutacion("oportunidad.incorporarFacturas", { deal, monto: disp + 1 });
      pasaOk = limpia(vIgual);
      rechazaOk = viola(vMas);
      // (a2) crear · sin `monto` en el payload juzga deal.monto
      const vCrearSi = validarMutacion("oportunidad.crear", { deal: { ...deal, monto: disp } });
      const vCrearNo = validarMutacion("oportunidad.crear", { deal: { ...deal, monto: disp + 1 } });
      crearOk = limpia(vCrearSi) && viola(vCrearNo);
      // (a3) cliente que el archivo no declara: disponible 0 → 1 peso viola, 0 pasa
      const fantasma = { ...deal, id: "OP-LIN01-f", rutEmisor: noPrime };
      const lcF = lineaCreditoDe(fantasma);
      fantasmaOk = lcF.aprobada === 0 && lcF.disponible === 0
        && viola(validarMutacion("oportunidad.incorporarFacturas", { deal: fantasma, monto: 1 }))
        && limpia(validarMutacion("oportunidad.incorporarFacturas", { deal: fantasma, monto: 0 }));
      // (a4) cada violación cuenta en el visor y deja rastro en el log con la mutación
      const ultimo = SYS_LOG.find((e) => e.fuente === "contrato" && e.datos && e.datos.codigo === "LIN-01");
      contadorOk = nRech() === rech0 + 3 && nLog() === log0 + 3 && !!ultimo && ultimo.nivel === "warn"
        && ultimo.datos.mutacion === "oportunidad.incorporarFacturas" && /LIN-01/.test(ultimo.mensaje);
      // (a5) SONDA · una mutación que LIN-01 no cubre no lo evalúa aunque el monto exceda
      const vAjena = validarMutacion("condiciones.guardar", { deal, monto: disp + 1, pctDesc: 0, pctMax: 0 });
      sondaOk = !vAjena.violaciones.some((x) => x.codigo === "LIN-01") && nRech() === rech0 + 3;
    } finally {
      for (const k of Object.keys(CONTRATO_RECHAZOS)) delete CONTRATO_RECHAZOS[k]; Object.assign(CONTRATO_RECHAZOS, rechAntes);
    }

    // (b) MOTOR · Línea Global Cliente = asignada − uso = 50 MM; par (LF2 900) y deudor (900) holgados
    const rutP = LB[0];
    const X = 80 * MMF - 30 * MMF;   // 50.000.000 pesos
    const estMotor = () => ({ estado: estB([L("LF2-lin01", "LF2", rutP, 900)], 80, 30), deudores: { [rutP]: dl(rutP, 900) } });
    const rCabe = asignarLineas([{ id: "l1", folio: "l1", deudor: nomDe(rutP), rutRecep: rutP, monto: X, tipoDeudor: "Lista Blanca" }], "X", estMotor());
    const rNoCabe = asignarLineas([{ id: "l2", folio: "l2", deudor: nomDe(rutP), rutRecep: rutP, monto: X + 1, tipoDeudor: "Lista Blanca" }], "X", estMotor());
    const fCabe = rCabe.facturas[0], fNo = rNoCabe.facturas[0];
    const motorOk = rCabe.dispCliente === 0 && rCabe.cursable === X && fCabe.estado === "CON_LINEA"
      && rNoCabe.cursable === 0 && fNo.estado === "REQUIERE_COMITE" && fNo.motivo === "cliente" && rNoCabe.dispCliente === X
      && rNoCabe.solicitudes.length === 1 && rNoCabe.solicitudes[0].motivo === "cliente";

    ok("134 LIN-01 · la operación no supera la línea disponible del cliente: monto = disponible pasa, un peso más se rechaza con LIN-01, y el motor deja esa factura en comité con motivo `cliente`",
       declaraOk && lecturaOk && pasaOk && rechazaOk && crearOk && fantasmaOk && contadorOk && sondaOk && motorOk,
       `cliente ${fila.rut} aprobada ${fila.aprobada} uso ${fila.uso} disponible ${disp} · = pasa ${pasaOk} · +1 viola ${rechazaOk} · crear ${crearOk} · sin línea ${fantasmaOk} · contador/log ${contadorOk} · sonda mutación ajena ${sondaOk} · motor X=${X} cursable ${rCabe.cursable} / X+1 ${fNo && fNo.estado}:${fNo && fNo.motivo} ${motorOk}`);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 135 · regla OTG-01 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · OTG-01 · SÓLO APRUEBA QUIEN TIENE ATRIBUCIÓN: la excepción la resuelve un apoderado con atribución
  //    en el ÁREA y el NIVEL que la regla exige. El contrato lo declara en `INVARIANTES` (mutaciones
  //    `excepcion.aprobar` y `excepcion.rechazar`, autoridad servidor) y su `evaluar` delega en `puedeAprobarExc`,
  //    que es la misma función que los cuatro caminos de escritura del visado consultan ANTES de escribir.
  //    Se prueba con reglas REALES del catálogo (C01 · Operaciones, tramo N1; C21 · Riesgo, N5) y usuarios reales
  //    del padrón, por `validarMutacion`, que es la puerta del contrato. Las dos direcciones en cada eje:
  //    (a) el EJECUTIVO comercial (sin atribución) viola OTG-01 en `aprobar` Y en `rechazar`; la violación trae
  //        `codigo`, `nombre` y `regla`, cuenta en `CONTRATO_RECHAZOS` y queda logueada en `SYS_LOG` con la mutación;
  //        el Jefe de Operaciones (N3) pasa por escalada dentro de su área y no cuenta nada.
  //    (b) el ÁREA: el Gerente General (Comercial N3) NO aprueba una excepción de Operaciones N1 aunque su nivel sea
  //        mayor — la escalada no cruza áreas. (c) el NIVEL: el Jefe de Riesgo (N4) no aprueba C21 (Riesgo N5) y el
  //        Subgerente (N5) sí. (d) el PISO POR MONTO es parte del nivel que la regla exige: a M$200 el piso de
  //        Operaciones sube a N4 y el Jefe de Operaciones (N3) deja de poder; Operaciones N5 sigue pudiendo.
  //    (e) la atribución SIGUE AL ROL —el resolver la recalcula desde el rol, no desde el payload—: darle al
  //        ejecutivo el rol de Jefe de Operaciones lo habilita y devolvérselo lo deshabilita. (f) y es la de HOY: un
  //        reemplazo con la atribución del ausente REVOCADA habilita al reemplazante y deshabilita al ausente.
  //    (g) la invariante cubre exactamente esas dos mutaciones: `excepcion.solicitar` no la corre.
  //    (h) SONDA: con `puedeAprobarExc` silenciada (siempre true) el ejecutivo pasa → el gate va POR esa función y
  //        no por otro camino; con `puedeAprobarExc` reventando, `validarMutacion` NO bloquea y lo loguea — es el
  //        fail-open documentado («el control es del servidor»), y acá queda medido para que nadie lo dé por control.
  //    Todo lo tocado (ROL_USUARIO.CR, REEMPLAZOS, puedeAprobarExc, CONTRATO_RECHAZOS, SYS_LOG) se restaura.
  {
    const reglaDe = (cod) => REGLAS_CLIENTE.find((r) => (r.cond || "") === cod);
    const primerExc = (r) => ((r && r.tiers) || []).find((t) => t[1] === "excepcion");
    const n = () => CONTRATO_RECHAZOS["OTG-01"] || 0;
    const rech0 = CONTRATO_RECHAZOS["OTG-01"];
    const rol0 = ROL_USUARIO.CR, rmp0 = REEMPLAZOS, fnOriginal = puedeAprobarExc;
    const idLog0 = SYS_LOG[0] ? SYS_LOG[0].id : 0;
    let R = null;
    try {
      const inv = invarianteDe("OTG-01");
      const invOk = !!inv && inv.autoridad === "servidor" && typeof inv.evaluar === "function"
        && inv.mutaciones.length === 2 && inv.mutaciones.includes("excepcion.aprobar") && inv.mutaciones.includes("excepcion.rechazar")
        && /puedeAprobarExc\(/.test(String(inv.evaluar));

      const c01 = reglaDe("C01"), t01 = primerExc(c01);
      const c21 = reglaDe("C21"), t21 = primerExc(c21);
      const catalogoOk = !!c01 && c01.area === "operaciones" && !!t01 && !!c21 && c21.area === "riesgo" && !!t21;
      // El nivel que la regla exige es el del tramo subido por el piso del monto: el mismo cálculo que hace
      // `evaluarOtorgItems` (`nivelExigido`), que es de donde el visado saca `x.nivel`.
      const MONTO_CHICO = 15e6, MONTO_GRANDE = 200e6;
      const n01 = nivelExigido(c01.area, t01[2], MONTO_CHICO);      // tramo N1, piso leve 1 → 1
      const n01g = nivelExigido(c01.area, t01[2], MONTO_GRANDE);    // tramo N1, piso crítico operaciones → 4
      const n21 = nivelExigido(c21.area, t21[2], MONTO_CHICO);      // tramo N5 → 5
      const val = (tipo, usuario, regla, nivel) => validarMutacion(tipo, { usuario, regla, nivel });

      // (a) ejecutivo comercial: viola en las DOS mutaciones; la violación se describe, se cuenta y se loguea.
      const a0 = n();
      const vA = val("excepcion.aprobar", "CR", c01, n01);
      const eA = SYS_LOG[0];
      const vR = val("excepcion.rechazar", "CR", c01, n01);
      const eR = SYS_LOG[0];
      const violOk = (v) => !v.ok && v.violaciones.length === 1 && v.violaciones[0].codigo === "OTG-01"
        && v.violaciones[0].nombre === inv.nombre && v.violaciones[0].regla === inv.regla && v.contrato === CONTRATO_VERSION;
      const logOk = (e, mut) => !!e && e.id > idLog0 && e.nivel === "warn" && e.fuente === "contrato"
        && String(e.mensaje).includes("OTG-01") && String(e.mensaje).includes(mut)
        && !!e.datos && e.datos.codigo === "OTG-01" && e.datos.mutacion === mut && e.datos.autoridad === "servidor";
      const ejecViola = atribDe("CR").tipo === "pipeline" && violOk(vA) && violOk(vR) && n() === a0 + 2
        && logOk(eA, "excepcion.aprobar") && logOk(eR, "excepcion.rechazar");
      const a1 = n();
      const vJO = val("excepcion.aprobar", "JO", c01, n01), vJOr = val("excepcion.rechazar", "JO", c01, n01);
      const jefeOpPasa = vJO.ok && vJO.violaciones.length === 0 && vJOr.ok && n() === a1;
      const adminPasa = val("excepcion.aprobar", "ADMIN", c21, n21).ok && val("excepcion.rechazar", "ADMIN", c01, n01g).ok;

      // (b) el ÁREA: nivel más alto de OTRA área no sirve.
      const ggViola = atribDe("GG").atrib.comercial === 3 && !val("excepcion.aprobar", "GG", c01, n01).ok
        && !val("excepcion.rechazar", "GG", c01, n01).ok;
      // (c) el NIVEL dentro del área: N4 no alcanza un N5; N5 sí.
      const nivelOk = atribDe("RG").atrib.riesgo === 4 && !val("excepcion.aprobar", "RG", c21, n21).ok
        && atribDe("SR").atrib.riesgo === 5 && val("excepcion.aprobar", "SR", c21, n21).ok && val("excepcion.rechazar", "SR", c21, n21).ok;
      // (d) el PISO POR MONTO sube el nivel exigido: el mismo cargo pasa a M$15 y no a M$200.
      const pisoOk = n01 === 1 && n01g > atribDe("JO").atrib.operaciones && n01g <= atribDe("OP").atrib.operaciones
        && val("excepcion.aprobar", "JO", c01, n01).ok && !val("excepcion.aprobar", "JO", c01, n01g).ok
        && val("excepcion.aprobar", "OP", c01, n01g).ok;

      // (e) la atribución SIGUE AL ROL: se recalcula desde el rol, no se recuerda.
      ROL_USUARIO.CR = "jefe_operaciones";
      const conRol = val("excepcion.aprobar", "CR", c01, n01).ok;
      ROL_USUARIO.CR = rol0;
      const sinRol = !val("excepcion.aprobar", "CR", c01, n01).ok;
      const sigueAlRol = conRol && sinRol;

      // (f) la atribución es la de HOY: reemplazo con la atribución del ausente REVOCADA.
      const hoy = hoyISO();
      REEMPLAZOS = [{ id: "rmp-otg01", ausente: "SR", reemplazante: "CR", desde: hoy, hasta: hoy, motivo: "sonda OTG-01", ausenteAprueba: false, creadoPor: "", creadoEn: "" }];
      const cubrePasa = val("excepcion.aprobar", "CR", c21, n21).ok;
      const ausenteViola = !val("excepcion.aprobar", "SR", c21, n21).ok;
      REEMPLAZOS = rmp0;
      const vueltaOk = val("excepcion.aprobar", "SR", c21, n21).ok && !val("excepcion.aprobar", "CR", c21, n21).ok;
      const hoyOk = cubrePasa && ausenteViola && vueltaOk;

      // (g) cobertura exacta: otra mutación de excepción no corre OTG-01.
      const b0 = n();
      const vOtra = val("excepcion.solicitar", "CR", c01, n01);
      const coberturaOk = vOtra.ok && vOtra.violaciones.length === 0 && n() === b0;
      // Medido, no exigido: un payload SIN nivel falla cerrado (salvo super-admin).
      const sinNivelCerrado = !validarMutacion("excepcion.aprobar", { usuario: "JO", regla: c01 }).ok;

      // (h) SONDA: el gate pasa POR `puedeAprobarExc` — silenciada, el ejecutivo pasa; reventando, no bloquea.
      puedeAprobarExc = () => true;
      const sondaSilencio = val("excepcion.aprobar", "CR", c01, n01).ok;
      puedeAprobarExc = () => { throw new Error("sonda OTG-01"); };
      const c0 = n();
      const vRev = val("excepcion.aprobar", "CR", c01, n01);
      const eRev = SYS_LOG[0];
      const sondaFailOpen = vRev.ok && n() === c0 && !!eRev && eRev.nivel === "error" && eRev.fuente === "contrato"
        && /Evaluador de OTG-01 falló/.test(String(eRev.mensaje)) && !!eRev.datos && eRev.datos.codigo === "OTG-01";
      puedeAprobarExc = fnOriginal;
      const restaurada = puedeAprobarExc === fnOriginal && !val("excepcion.aprobar", "CR", c01, n01).ok;

      R = { invOk, catalogoOk, n01, n01g, n21, ejecViola, jefeOpPasa, adminPasa, ggViola, nivelOk, pisoOk, sigueAlRol, hoyOk, coberturaOk, sinNivelCerrado, sondaSilencio, sondaFailOpen, restaurada, total: n() - a0 };
    } finally {
      ROL_USUARIO.CR = rol0; REEMPLAZOS = rmp0; puedeAprobarExc = fnOriginal;
      if (rech0 === undefined) delete CONTRATO_RECHAZOS["OTG-01"]; else CONTRATO_RECHAZOS["OTG-01"] = rech0;
      for (let i = SYS_LOG.length - 1; i >= 0; i--) { const e = SYS_LOG[i]; if (e && e.id > idLog0 && e.fuente === "contrato" && e.datos && e.datos.codigo === "OTG-01") SYS_LOG.splice(i, 1); }
    }
    const Q = R || {};
    ok("135 OTG-01 sólo aprueba quien tiene atribución: validarMutacion rechaza al ejecutivo sin atribución en aprobar y rechazar, y pasa al cargo del área con el nivel que la regla exige",
       !!R && Q.invOk && Q.catalogoOk && Q.ejecViola && Q.jefeOpPasa && Q.adminPasa && Q.ggViola && Q.nivelOk && Q.pisoOk && Q.sigueAlRol && Q.hoyOk && Q.coberturaOk && Q.sondaSilencio && Q.sondaFailOpen && Q.restaurada,
       `invariante aprobar+rechazar · servidor · evaluar→puedeAprobarExc ${Q.invOk} · C01 operaciones N${Q.n01} (M$200 → N${Q.n01g}) · C21 riesgo N${Q.n21} ${Q.catalogoOk}`
       + ` · (a) CR viola en aprobar y rechazar con codigo/nombre/regla, +2 en CONTRATO_RECHAZOS y logueado ${Q.ejecViola} · JO pasa sin contar ${Q.jefeOpPasa} · ADMIN pasa ${Q.adminPasa}`
       + ` · (b) GG comercial N3 no aprueba operaciones N1 ${Q.ggViola} · (c) RG N4 no, SR N5 sí ${Q.nivelOk} · (d) piso por monto: JO pasa a M$15 y no a M$200, OP sí ${Q.pisoOk}`
       + ` · (e) sigue al rol ${Q.sigueAlRol} · (f) reemplazo revocado: cubre pasa, ausente viola, al restaurar vuelve ${Q.hoyOk} · (g) excepcion.solicitar no corre OTG-01 ${Q.coberturaOk} · sin nivel falla cerrado ${Q.sinNivelCerrado}`
       + ` · (h) sonda: silenciada pasa ${Q.sondaSilencio} · reventando no bloquea y loguea error ${Q.sondaFailOpen} · restaurada ${Q.restaurada} · rechazos netos ${Q.total}`);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 136 · regla GIR-01 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · GIR-01 · NO GIRA SIN PASAR POR CESIÓN.
  //    El invariante vive en `INVARIANTES` con `evaluar: (p) => ["cesion","giro"].includes(p.deal.stage)` y
  //    cubre UNA mutación, `oportunidad.girar`. Esa misma mutación la cubre también GIR-02 (la huella del
  //    paquete contra la evidencia de O05), así que para juzgar GIR-01 solo hay que dejar a GIR-02 satisfecho:
  //    la evidencia entra POR PARÁMETRO (`p.estado.evidencia`, que es lo que `evidenciaContratoOk` lee antes
  //    que el global) con la huella calculada por `huellaOperacion` —que NO incluye la etapa, así que la
  //    misma evidencia sirve para todas—. Con eso, lo único que cambia entre una corrida y otra es la etapa.
  //    (a) Las DOS direcciones sobre TODAS las etapas del catálogo (`STAGE_ORDER`, no una lista escrita a mano):
  //        `cesion` y `giro` pasan limpias —ni GIR-01 ni GIR-02 ni los `*` sin evaluador—; cualquier otra
  //        (`prospeccion`, `oferta`, `aceptadas`, `otorgamiento`, `perdida`, y una operación SIN etapa) se
  //        rechaza con EXACTAMENTE un código, GIR-01. `otorgamiento` se rechaza a propósito: desde ahí el
  //        camino legítimo al giro pasa por «Pendiente Integración» (regla 26), o sea por `cesion`.
  //    (b) Se distingue POR CÓDIGO de GIR-02: en `cesion` sin evidencia la única violación es GIR-02; en
  //        `oferta` sin evidencia son las dos —cada compuerta acusa lo suyo y ninguna tapa a la otra—.
  //    (c) Cada rechazo cuenta en `CONTRATO_RECHAZOS["GIR-01"]` y deja un `warn` de `contrato` con el código
  //        y la mutación, y los pasos no cuentan nada.
  //    (d) SONDAS · la etapa que se juzga es la de la OPERACIÓN: un `stage: "cesion"` suelto en el payload con
  //        `deal.stage: "oferta"` sigue rechazado; y una mutación que GIR-01 no declara (`core.inyectar`, que
  //        sí cubre GIR-02) con la operación en `oferta` NO levanta GIR-01 — el rechazo viene de este invariante
  //        y no de un evaluador que dice que no a todo.
  //    Se informa, sin asertar, el camino de un payload sin `deal`: el evaluador revienta, `validarMutacion` lo
  //    registra como error y lo cuenta como ok (falla ABIERTO por diseño: el control es del servidor).
  //    Todo el estado que se toca (CONTRATO_RECHAZOS de GIR-01/GIR-02, las líneas del log) se restaura.
  {
    const MUT = "oportunidad.girar";
    const inv = invarianteDe("GIR-01");
    const declaraOk = !!inv && inv.autoridad === "servidor" && typeof inv.evaluar === "function"
      && inv.mutaciones.includes(MUT)   // ni `aplicado` ni el número de mutaciones: cablear validarMutacion en moverEtapa los cambiaría sin romper la regla
      && invariantesDe(MUT).some((x) => x.codigo === "GIR-02");   // la otra compuerta de la misma mutación

    // Operación sintética con paquete real (dos deudores de la lista blanca, cedente del activo).
    const base = { id: "OP-GIR01", negocioNum: "NEG-GIR01", cliente: "Cliente GIR-01", rutEmisor: EMISOR_LIBRO,
      facturasOp: [fac("g1", LB[0], 12), fac("g2", LB[0], 8), fac("g3", LB[1], 5)], clienteAcepto: true };
    const huella = huellaOperacion(base);
    const conEvid = { evidencia: { [base.id]: { via: "electronica", canonico: huella, hash: null, por: "prueba", fecha: "—" } } };
    const sinEvid = { evidencia: {} };
    // La huella no depende de la etapa: la misma evidencia describe la operación en cualquiera de ellas.
    const huellaEstable = STAGE_ORDER.every((st) => huellaOperacion({ ...base, stage: st }) === huella)
      && evidenciaContratoOk({ ...base, stage: "oferta" }, conEvid).ok && !evidenciaContratoOk({ ...base, stage: "cesion" }, sinEvid).ok;

    const rechAntes = { g1: CONTRATO_RECHAZOS["GIR-01"], g2: CONTRATO_RECHAZOS["GIR-02"] };
    const nRech = (c) => CONTRATO_RECHAZOS[c] || 0;
    const idLog0 = SYS_LOG[0] ? SYS_LOG[0].id : 0;
    const logsGIR = (c) => SYS_LOG.filter((e) => e.id > idLog0 && e.fuente === "contrato" && e.datos && e.datos.codigo === c);
    const codigos = (v) => v.violaciones.map((x) => x.codigo).sort().join("+");
    const PASAN = ["cesion", "giro"];   // «haber pasado por Cesión», en etapas del catálogo
    let res = null;
    try {
      const rech0 = nRech("GIR-01"), rech02 = nRech("GIR-02");
      // (a) todas las etapas del catálogo + sin etapa, con GIR-02 satisfecho
      const etapas = [...STAGE_ORDER, undefined];
      const porEtapa = etapas.map((st) => {
        const d = { ...base }; if (st !== undefined) d.stage = st; else delete d.stage;
        const v = validarMutacion(MUT, { deal: d, estado: conEvid });
        const debePasar = PASAN.includes(st);
        const bien = debePasar ? (v.ok && v.violaciones.length === 0) : (!v.ok && codigos(v) === "GIR-01");
        return { st: st === undefined ? "(sin etapa)" : st, debePasar, ok: v.ok, cod: codigos(v) || "—", bien };
      });
      const direccionesOk = porEtapa.every((x) => x.bien)
        && porEtapa.filter((x) => x.debePasar).length === 2 && porEtapa.filter((x) => !x.debePasar).length >= 5;
      const nRechazadas = porEtapa.filter((x) => !x.debePasar).length;
      // (c) cada rechazo cuenta y se loguea con código y mutación; los pasos no cuentan
      const contadorOk = nRech("GIR-01") === rech0 + nRechazadas && nRech("GIR-02") === rech02;
      const lg = logsGIR("GIR-01");
      const logOk = lg.length === nRechazadas && lg.every((e) => e.nivel === "warn" && e.datos.mutacion === MUT && e.datos.autoridad === "servidor" && /GIR-01/.test(e.mensaje));
      // (b) distinción por código contra GIR-02
      const vCesSin = validarMutacion(MUT, { deal: { ...base, stage: "cesion" }, estado: sinEvid });
      const vOfeSin = validarMutacion(MUT, { deal: { ...base, stage: "oferta" }, estado: sinEvid });
      const codigoOk = !vCesSin.ok && codigos(vCesSin) === "GIR-02" && !vOfeSin.ok && codigos(vOfeSin) === "GIR-01+GIR-02"
        && nRech("GIR-01") === rech0 + nRechazadas + 1 && nRech("GIR-02") === rech02 + 2;
      // (d) sondas
      const vSuelto = validarMutacion(MUT, { deal: { ...base, stage: "oferta" }, stage: "cesion", estado: conEvid });
      const sondaStageOk = !vSuelto.ok && codigos(vSuelto) === "GIR-01";
      const vAjena = validarMutacion("core.inyectar", { deal: { ...base, stage: "oferta" }, estado: conEvid });
      const sondaMutOk = vAjena.ok && !vAjena.violaciones.some((x) => x.codigo === "GIR-01") && nRech("GIR-01") === rech0 + nRechazadas + 2;
      // informativo: payload sin `deal` → el evaluador revienta y falla abierto (se registra como error)
      let sinDeal = "n/a";
      try { const v0 = validarMutacion(MUT, {}); const err = SYS_LOG.find((e) => e.id > idLog0 && e.nivel === "error" && e.fuente === "contrato" && e.datos && e.datos.codigo === "GIR-01"); sinDeal = `ok=${v0.ok} viol=${codigos(v0) || "—"} errorLog=${!!err}`; } catch (e) { sinDeal = "lanza " + e.message; }
      res = { direccionesOk, porEtapa, nRechazadas, contadorOk, logOk, codigoOk, cesSin: codigos(vCesSin), ofeSin: codigos(vOfeSin), sondaStageOk, sondaMutOk, sinDeal };
    } finally {
      if (rechAntes.g1 === undefined) delete CONTRATO_RECHAZOS["GIR-01"]; else CONTRATO_RECHAZOS["GIR-01"] = rechAntes.g1;
      if (rechAntes.g2 === undefined) delete CONTRATO_RECHAZOS["GIR-02"]; else CONTRATO_RECHAZOS["GIR-02"] = rechAntes.g2;
      for (let i = SYS_LOG.length - 1; i >= 0; i--) { const e = SYS_LOG[i]; if (e && e.id > idLog0 && e.fuente === "contrato" && e.datos && (e.datos.codigo === "GIR-01" || e.datos.codigo === "GIR-02")) SYS_LOG.splice(i, 1); }
    }
    const R = res || {};
    ok("136 GIR-01 · no gira sin pasar por Cesión: `oportunidad.girar` pasa sólo en cesion/giro y cualquier otra etapa se rechaza con GIR-01, distinto de GIR-02 que juzga la huella y no la etapa",
       declaraOk && huellaEstable && !!res && R.direccionesOk && R.contadorOk && R.logOk && R.codigoOk && R.sondaStageOk && R.sondaMutOk,
       `declara servidor/[${MUT}] con GIR-02 al lado ${declaraOk} · huella estable entre etapas ${huellaEstable} · por etapa: ${(R.porEtapa || []).map((x) => `${x.st}→${x.ok ? "pasa" : "rechaza " + x.cod}${x.bien ? "" : " (MAL)"}`).join(", ")} ${R.direccionesOk}`
       + ` · contador +${R.nRechazadas} y GIR-02 quieto ${R.contadorOk} · log warn con mutación ${R.logOk} · cesion sin evidencia → ${R.cesSin} / oferta sin evidencia → ${R.ofeSin} ${R.codigoOk}`
       + ` · sonda stage suelto en payload no cuenta ${R.sondaStageOk} · sonda core.inyectar no levanta GIR-01 ${R.sondaMutOk} · [info] sin deal: ${R.sinDeal}`);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 137 · regla ATR-01 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · ATR-01 · EL DESCUENTO APLICADO NO EXCEDE LA ATRIBUCIÓN DEL ROL SIN AUTORIZACIÓN DE LA JEFATURA.
  //    El invariante vive en `INVARIANTES` (mutación `condiciones.guardar`, autoridad servidor) y su `evaluar`
  //    compara `pctDesc` contra `pctMax` con tolerancia 0,001. Lo que decide QUÉ máximo le toca a cada rol es la
  //    escalera de `evalAtribucion`: hasta `descEjec` el ejecutivo solo (ok) · hasta `descMax` con la jefatura
  //    (requiereJefe) · sobre eso el Gerente Comercial (requiereGerente) · bajo `tasaMinAbsoluta` nunca
  //    (bajoMinimo). Los dos % y el mínimo son perillas del TENANT (regla 9-bis): `bandaDescuentoDeTasa` lee
  //    `CFG_ACTIVA.descEjec/descMax` y `evalAtribucion` lee `pol("tasaMinAbsoluta")`. Y en el motor de
  //    otorgamiento la misma escalera es la variable `spreadBajoBanda` de O01 (comercial N1), que es la
  //    excepción que la jefatura visa. Ningún número de la CONFIGURACIÓN va escrito a mano: los % y el mínimo
  //    se leen del tenant, y lo que se inyecta se deriva de ellos para contradecirlos. Se prueba:
  //    (a) CONTRATO, dos direcciones con valores CALCULADOS: pctDesc = descEjec pasa; un centésimo de tasa más
  //        de descuento (medio punto sobre la referencia de 2,0) viola con el código ATR-01, cuenta en
  //        `CONTRATO_RECHAZOS` y queda en `SYS_LOG`; la tolerancia es 0,001 (0,0005 pasa · 0,002 viola); sin
  //        `pctMax` en el payload ningún descuento pasa (fail-closed) y sin descuento no hay nada que autorizar;
  //        y una mutación no cubierta (`oportunidad.cursar`) NO lo corre con el mismo payload violatorio — la
  //        sonda que fija que el rechazo viene de este invariante.
  //    (b) ESCALERA por rol, con la tasa nueva calculada desde el % (nueva = orig·(1−p/100)): p = descEjec → ok,
  //        +0,1 → requiereJefe, descMax → requiereJefe, +0,1 → requiereGerente. Y la CONSISTENCIA barrida de 0 a
  //        30 % en pasos de 0,5: ATR-01 con pctMax = descEjec viola exactamente cuando `evalAtribucion` ≠ ok
  //        (el ejecutivo solo), y con pctMax = descMax exactamente cuando es requiereGerente (jefatura autorizó).
  //    (c) LA JEFATURA CORRESPONDIENTE sale del ROL: el ejecutivo no visa nada (esJefeComercial false); el Jefe
  //        de Grupo (comercial N1) visa requiereJefe pero no requiereGerente; el Gerente Comercial (N2) y el
  //        General (N3) visan los dos. Cambiar el rol del ejecutivo a gerente lo habilita y devolverlo lo quita.
  //        Se juzga el ROL: `REEMPLAZOS` se vacía mientras corre el caso (una cobertura vigente que otro caso
  //        dejara en el padrón cambiaría quién visa) y se devuelve al salir.
  //    (d) TENANT, con valores DERIVADOS de los medidos (e2 = descEjec/2, m2 = 0,8·descEjec, e2 < m2 < descEjec):
  //        el mismo descEjec que era ok pasa a requiereGerente y un punto entre e2 y m2 a requiereJefe; con el
  //        mínimo absoluto subido sobre una tasa que hoy lo supera, ésta pasa a bajoMinimo, y bajado bajo una
  //        que hoy no lo alcanza, deja de serlo. Es la única forma de distinguir «lee la configuración» de
  //        «coincide con el default». El mínimo sólo juzga TASA: la misma baja como comisión no es bajoMinimo y
  //        sigue la misma escalera. Y la declaración es UNA: `CFG_ATRIB_DESCUENTO` ya no trae `tasaMinAbsoluta`.
  //    (e) MOTOR: sobre una operación con facturas reales, `varsOperacion` mide `tasaRefOp` y con la tasa
  //        aplicada a exactamente descEjec bajo la referencia O01 queda aprobada; un 1 % más de descuento la deja
  //        en excepción comercial N1, que nombra al Jefe de Grupo y que el ejecutivo NO puede aprobar (OTG-01).
  //    Medido, no exigido: (i) el `evaluar` toma `pctMax` del PAYLOAD (100 pasa) — el `servidor` del invariante
  //    dice que el máximo no viaja en el payload; acá es anticipación de UX. (ii) HUECO fail-open (hallazgo 5):
  //    bajo la primera banda —`bandas[0].tMin`, un literal que duplica el viejo mínimo absoluto— con el mínimo
  //    del tenant por debajo de ella, la ausencia de banda se lee como atribución ilimitada y un descuento sobre
  //    descMax sale «ok». Hoy no se alcanza (la menor tasa de referencia que el pricing puede producir queda
  //    sobre tMin); se mide y queda a la vista para que se note el día que se cierre — o el día que se alcance.
  //    Todo lo tocado (CFG_ACTIVA, ROL_USUARIO.CR, REEMPLAZOS, CONTRATO_RECHAZOS, SYS_LOG, SYS_SEQ) se restaura
  //    entero, y una excepción deja el caso en FALLA con su mensaje en vez de tumbar la suite.
  {
    const cfg0 = CFG_ACTIVA, rol0 = ROL_USUARIO.CR, rmp0 = REEMPLAZOS;
    const rech0 = Object.prototype.hasOwnProperty.call(CONTRATO_RECHAZOS, "ATR-01") ? CONTRATO_RECHAZOS["ATR-01"] : undefined;
    const log0 = SYS_LOG.slice(), seq0 = SYS_SEQ;
    const nR = () => CONTRATO_RECHAZOS["ATR-01"] || 0;
    const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
    let R = null, err = null;
    try {
      REEMPLAZOS = [];                                    // (c) y (e) juzgan el ROL, no una cobertura vigente
      const inv = invarianteDe("ATR-01");
      const invOk = !!inv && inv.autoridad === "servidor" && typeof inv.evaluar === "function"
        && inv.mutaciones.length === 1 && inv.mutaciones[0] === "condiciones.guardar";
      const val = (p, tipo) => validarMutacion(tipo || "condiciones.guardar", p);
      const viola = (v) => !v.ok && v.violaciones.length === 1 && v.violaciones[0].codigo === "ATR-01" && v.violaciones[0].regla === inv.regla;
      const limpia = (v) => v.ok && v.violaciones.length === 0;

      // Banda y % del tenant, leídos y no adivinados
      const ORIG = 2.0;                                   // tasa de referencia: banda 1,93–2,23
      const banda = bandaDescuentoDeTasa(ORIG);
      const dE = banda ? banda.descEjec : NaN, dM = banda ? banda.descMax : NaN;
      const bandaOk = !!banda && dE === CFG_ACTIVA.descEjec && dM === CFG_ACTIVA.descMax && dE > 0 && dM > dE;
      const nuevaDe = (p) => ORIG * (1 - p / 100);        // tasa nueva que produce un descuento de p %
      const ev = (p, esTasa) => evalAtribucion(ORIG, nuevaDe(p), ORIG, esTasa !== false);

      // (a) contrato: dos direcciones + tolerancia + contador/log + fail-closed sin máximo + sonda de cobertura
      const a0 = nR();
      const pctIgual = ev(dE).pctDesc;                                     // = descEjec, calculado por la función
      const pctMas = evalAtribucion(ORIG, nuevaDe(dE) - 0.01, ORIG, true).pctDesc; // un centésimo de tasa más de descuento
      const vIgual = val({ pctDesc: pctIgual, pctMax: dE });
      const vMas = val({ pctDesc: pctMas, pctMax: dE });
      const eMas = SYS_LOG[0];
      const dosDirecciones = pctIgual === dE && pctMas > dE && limpia(vIgual) && viola(vMas) && nR() === a0 + 1
        && !!eMas && eMas.id > seq0 && eMas.nivel === "warn" && eMas.fuente === "contrato" && /ATR-01/.test(String(eMas.mensaje))
        && !!eMas.datos && eMas.datos.codigo === "ATR-01" && eMas.datos.mutacion === "condiciones.guardar" && eMas.datos.autoridad === "servidor";
      const toleranciaOk = limpia(val({ pctDesc: dE + 0.0005, pctMax: dE })) && viola(val({ pctDesc: dE + 0.002, pctMax: dE }));
      const sinMax = viola(val({ pctDesc: pctIgual })) && limpia(val({ pctDesc: 0 }));  // sin máximo conocido no pasa ningún descuento; sin descuento nada que autorizar
      const a1 = nR();
      const vAjena = val({ pctDesc: pctMas, pctMax: dE }, "oportunidad.cursar");
      const sondaCobertura = !vAjena.violaciones.some((x) => x.codigo === "ATR-01") && nR() === a1;
      const payloadManda = limpia(val({ pctDesc: pctMas, pctMax: 100 }));   // medido, no exigido

      // (b) escalera + consistencia barrida
      const escalera = ev(dE).estado === "ok" && ev(dE + 0.1).estado === "requiereJefe"
        && ev(dM).estado === "requiereJefe" && ev(dM + 0.1).estado === "requiereGerente"
        && ev(0).estado === "ok" && evalAtribucion(ORIG, ORIG + 0.3, ORIG, true).estado === "ok"; // subir no es descuento
      let barridos = 0, incoherentes = [];
      for (let p = 0; p <= 30; p += 0.5) {
        const e = ev(p);
        if (e.estado === "bajoMinimo") continue;
        const vEjec = val({ pctDesc: e.pctDesc, pctMax: dE }), vJefe = val({ pctDesc: e.pctDesc, pctMax: dM });
        const okEjec = (e.estado === "ok") === vEjec.ok;
        const okJefe = (e.estado !== "requiereGerente") === vJefe.ok;
        barridos++;
        if (!okEjec || !okJefe) incoherentes.push(p + "%:" + e.estado);
      }
      const consistente = barridos >= 60 && incoherentes.length === 0;

      // (c) la jefatura correspondiente sale del rol (sin coberturas: REEMPLAZOS se vació arriba)
      const rolesOk = !esJefeComercial("CR") && !esGerenteComercial("CR")
        && esJefeComercial("JG") && !esGerenteComercial("JG")
        && esJefeComercial("GC") && esGerenteComercial("GC") && esGerenteComercial("GG") && esGerenteComercial("ADMIN");
      ROL_USUARIO.CR = "gte_comercial";
      const conRol = esGerenteComercial("CR");
      ROL_USUARIO.CR = rol0;
      const sigueAlRol = conRol && !esGerenteComercial("CR");

      // (d) tenant: % de descuento. Inyectados DERIVADOS de los medidos, e2 < m2 < dE, para contradecirlos con
      //     cualquier tenant base: dE (hoy ok) → requiereGerente, un punto entre e2 y m2 (hoy ok) → requiereJefe,
      //     e2 sigue ok. Con dE = 10 son 5/8 y el punto medio 6,5.
      const e2 = r1(dE / 2), m2 = r1(dE * 0.8), pMedio = r1((e2 + m2) / 2);
      const antes = { pE: ev(dE).estado, pM: ev(pMedio).estado, p2: ev(e2).estado };
      CFG_ACTIVA = { ...cfg0, descEjec: e2, descMax: m2 };
      const bInj = bandaDescuentoDeTasa(ORIG);
      const con = { pE: ev(dE).estado, pM: ev(pMedio).estado, p2: ev(e2).estado };
      CFG_ACTIVA = cfg0;
      const pctTenant = e2 > 0 && e2 < m2 && m2 < dE
        && antes.pE === "ok" && antes.pM === "ok" && antes.p2 === "ok"
        && !!bInj && bInj.descEjec === e2 && bInj.descMax === m2
        && con.p2 === "ok" && con.pM === "requiereJefe" && con.pE === "requiereGerente"
        && ev(dE).estado === "ok";
      //     Mínimo absoluto: tasas y mínimos inyectados proporcionales al del tenant, con el orden
      //     minBajo < tBajo < minT < tSobre < minAlto garantizado para cualquier minT > 0 (con 0,78: 0,50 / 0,60 / 0,80 / 0,85).
      const minT = pol("tasaMinAbsoluta", 0.78);
      const tSobre = r2(minT + 0.02), tBajo = r2(minT * 0.77), minAlto = r2(minT + 0.07), minBajo = r2(minT * 0.64);
      const est = (t) => evalAtribucion(ORIG, t, ORIG, true).estado;
      const sobre0 = est(tSobre), bajo0 = est(tBajo);
      CFG_ACTIVA = { ...cfg0, tasaMinAbsoluta: minAlto };
      const sobreAlto = est(tSobre);
      CFG_ACTIVA = { ...cfg0, tasaMinAbsoluta: minBajo };
      const bajoBajo = est(tBajo);
      CFG_ACTIVA = cfg0;
      const comision = evalAtribucion(ORIG, tBajo, ORIG, false).estado;   // la misma baja como comisión: el mínimo no aplica
      const minTenant = minT > 0 && minBajo < tBajo && tBajo < minT && minT < tSobre && tSobre < minAlto
        && sobre0 !== "bajoMinimo" && bajo0 === "bajoMinimo"
        && sobreAlto === "bajoMinimo" && bajoBajo !== "bajoMinimo"
        && comision !== "bajoMinimo" && comision === bajoBajo             // misma escalera que la tasa una vez sobre el mínimo
        && est(tBajo) === "bajoMinimo";                                  // restaurado
      const unaDeclaracion = !Object.prototype.hasOwnProperty.call(CFG_ATRIB_DESCUENTO, "tasaMinAbsoluta");

      // Medido, no exigido (hallazgo 5): bajo la primera banda con el mínimo del tenant por debajo de ella,
      // un descuento 10 puntos sobre descMax — y la menor tasa de referencia que el pricing produce hoy
      // (piso de spread más bajo del catálogo, con el mayor ajuste por SOW, más el costo de fondo).
      const tMin0 = CFG_ATRIB_DESCUENTO.bandas[0].tMin;
      const tRefH = r2(tMin0 - 0.08), nuevaH = r2(tRefH * (1 - (dM + 10) / 100));
      CFG_ACTIVA = { ...cfg0, tasaMinAbsoluta: minBajo };
      const hueco = evalAtribucion(tRefH, nuevaH, tRefH, true);
      CFG_ACTIVA = cfg0;
      const huecoAbierto = !hueco.banda && hueco.estado === "ok" && hueco.pctDesc > dM;
      const pp = paramsPricing();
      const ajusteMax = Math.max(0, ...Object.values(pp.sowAjuste || {}).map((a) => +(a && a.pts) || 0));
      const pisoMin = Math.min(SPREAD_MIN_DEFAULT, ...Object.values(SPREAD_MIN_DEUDOR));
      const tasaRefMin = r2(Math.max(pisoMin, r2(pp.spreadEstandar - ajusteMax)) + pp.costoFondo);
      const huecoAlcanzable = tasaRefMin < tMin0;

      // (e) motor de otorgamiento: O01 mide el mismo descuento y lo rutea a comercial N1
      const o01 = REGLAS_CLIENTE.find((r) => r.cond === "O01");
      const deudorMotor = nomDe(LB[0]);
      const MONTO = 10e6;
      const dealBase = { id: "OP-ATR01", cliente: "Cliente ATR-01", rutEmisor: EMISOR_LIBRO, deudor: deudorMotor, monto: MONTO, simulado: true,
        facturasOp: [{ id: "a1", folio: "a1", deudor: deudorMotor, rutRecep: LB[0], monto: MONTO }] };
      const tasaRef = varsOperacion({ ...dealBase, tasaDescuento: 0 }, null).tasaRefOp;
      const vEn = varsOperacion({ ...dealBase, tasaDescuento: tasaRef * (1 - dE / 100) }, null);
      const vFuera = varsOperacion({ ...dealBase, tasaDescuento: tasaRef * (1 - (dE + 1) / 100) }, null);
      const vSin = varsOperacion({ ...dealBase, tasaDescuento: 0 }, null);
      const padO01 = padronAprobadores();
      const evEn = evalReglaCli(o01, vEn, padO01), evFuera = evalReglaCli(o01, vFuera, padO01);
      const nivelReq = evFuera.disp === "excepcion" ? nivelExigido(o01.area, evFuera.nivel, MONTO) : 0;
      const cargo = nivelReq ? rolDeAreaNivel(o01.area, nivelReq) : null;
      const motorOk = !!o01 && o01.area === "comercial" && tasaRef > 0
        && !vEn.spreadBajoBanda && evEn.disp === "aprobado"
        && vFuera.spreadBajoBanda && evFuera.disp === "excepcion" && evFuera.nivel === 1 && nivelReq === 1
        && !vSin.spreadBajoBanda                                                    // sin simular no se pronuncia
        && !!cargo && !cargo.sinAprobador && /Jefe/.test(cargo.rol)
        && !puedeAprobarExc("CR", o01, nivelReq) && puedeAprobarExc("JG", o01, nivelReq) && puedeAprobarExc("GC", o01, nivelReq);

      R = { invOk, bandaOk, dE, dM, pctIgual, pctMas, dosDirecciones, toleranciaOk, sinMax, sondaCobertura, payloadManda, escalera, barridos, incoherentes, consistente,
        rolesOk, sigueAlRol, e2, m2, pMedio, con, pctTenant, minT, tSobre, tBajo, minAlto, minBajo, sobre0, sobreAlto, bajo0, bajoBajo, comision, minTenant, unaDeclaracion,
        tMin0, tRefH, nuevaH, huecoEstado: hueco.estado, huecoPct: hueco.pctDesc, huecoBanda: hueco.banda, huecoAbierto, tasaRefMin, huecoAlcanzable,
        tasaRef, cargo: cargo && cargo.rol, motorOk, total: nR() - a0 };
    } catch (e) {
      err = String((e && e.message) || e).slice(0, 300);   // una rotura de la regla es FALLA con motivo, no un throw que tumba la suite
    } finally {
      CFG_ACTIVA = cfg0; ROL_USUARIO.CR = rol0; REEMPLAZOS = rmp0;
      if (rech0 === undefined) delete CONTRATO_RECHAZOS["ATR-01"]; else CONTRATO_RECHAZOS["ATR-01"] = rech0;
      SYS_LOG.splice(0, SYS_LOG.length, ...log0); SYS_SEQ = seq0;   // el log vuelve entero, también lo que el ring hubiera evictado
    }
    const Q = R || {};
    ok("137 ATR-01 · el descuento no excede la atribución del rol sin la jefatura: pctDesc = descEjec pasa y un centésimo de tasa más (medio punto de descuento) se rechaza, la escalera ejecutivo→jefatura→gerente sale del rol y del tenant, y O01 rutea el exceso a comercial N1",
       !!R && Q.invOk && Q.bandaOk && Q.dosDirecciones && Q.toleranciaOk && Q.sinMax && Q.sondaCobertura && Q.escalera && Q.consistente
       && Q.rolesOk && Q.sigueAlRol && Q.pctTenant && Q.minTenant && Q.unaDeclaracion && Q.motorOk,
       (err ? `EXCEPCIÓN ${err} · ` : "")
       + `invariante condiciones.guardar · servidor ${Q.invOk} · banda 2,0 % ejec ${Q.dE} / máx jefatura ${Q.dM} del tenant ${Q.bandaOk}`
       + ` · (a) pctDesc ${Q.pctIgual} = descEjec pasa, ${Q.pctMas} viola con ATR-01 +1 contador y log ${Q.dosDirecciones} · tolerancia 0,0005 pasa / 0,002 viola ${Q.toleranciaOk} · sin pctMax rechaza y sin descuento pasa ${Q.sinMax}`
       + ` · sonda: oportunidad.cursar no lo corre ${Q.sondaCobertura} · medido: pctMax del payload manda (100 pasa) ${Q.payloadManda}`
       + ` · (b) escalera ok/requiereJefe/requiereGerente en descEjec, +0,1, descMax, +0,1 ${Q.escalera} · barrido 0–30 % (${Q.barridos} puntos) coherente con pctMax=descEjec (ejecutivo) y pctMax=descMax (jefatura) ${Q.consistente}${Q.incoherentes && Q.incoherentes.length ? " · incoherentes " + Q.incoherentes.join(",") : ""}`
       + ` · (c) CR no visa, JG jefatura sí / gerente no, GC y GG los dos ${Q.rolesOk} · sigue al rol ${Q.sigueAlRol}`
       + ` · (d) tenant ${Q.e2}/${Q.m2}: ${Q.dE} % ${Q.con && Q.con.pE}, ${Q.pMedio} % ${Q.con && Q.con.pM}, ${Q.e2} % ${Q.con && Q.con.p2} y al restaurar ok ${Q.pctTenant}`
       + ` · tasaMinAbsoluta ${Q.minT}: tasa ${Q.tSobre} ${Q.sobre0} → con mínimo ${Q.minAlto} ${Q.sobreAlto}; tasa ${Q.tBajo} ${Q.bajo0} → con mínimo ${Q.minBajo} ${Q.bajoBajo}; la misma baja como comisión ${Q.comision} ${Q.minTenant} · una sola declaración ${Q.unaDeclaracion}`
       + ` · medido: bajo la primera banda (tMin ${Q.tMin0}) con mínimo ${Q.minBajo}, tasaRef ${Q.tRefH} → ${Q.nuevaH} da ${Q.huecoEstado} pctDesc ${Q.huecoPct} banda ${Q.huecoBanda} → hueco fail-open ${Q.huecoAbierto}; tasaRef mínima del pricing hoy ${Q.tasaRefMin}, alcanzable ${Q.huecoAlcanzable}`
       + ` · (e) O01: tasaRef ${Q.tasaRef} · a descEjec aprobada, a descEjec+1 excepción comercial N1 → ${Q.cargo} · CR no aprueba, JG y GC sí ${Q.motorOk} · rechazos del caso ${Q.total}, restaurados`);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 138 · regla CRY-01 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · CRY-01 · EL OTP SE GUARDA COMO SHA-256 CON SAL POR EMISIÓN Y NUNCA EN CLARO; VALIDAR COMPARA
  //    HASHES, VENCE POR TTL Y ES DE UN SOLO USO. La regla es del SERVIDOR («el hash no sale del servidor»)
  //    y acá no hay servidor: lo que SÍ se gatea es lo que el cliente ejecuta y persiste.
  //    (a) `emitirOtp(neg)` devuelve el código en claro UNA vez (6 dígitos) y deja en `OTP_STORE[neg]` un
  //        registro {alg:"sha256", sal, hash, exp, usado:false, emitido} donde `hash` es exactamente
  //        SHA-256("otp$neg$sal$code") —se recalcula con `otpHash` y con `sha256Hex` directo— y NINGÚN valor
  //        del registro es el código. Sonda del detector: un registro v1 `{otp: code}` y uno con `code:` SÍ
  //        se detectan, así que la cota discrimina.
  //    (b) SAL POR EMISIÓN: el mismo código con dos sales da dos hashes distintos, el mismo neg+sal+código da
  //        el mismo hash (es determinista, no un sorteo), otro neg da otro hash; y re-emitir para el mismo
  //        negocio ROTA sal y hash y el código anterior deja de validar.
  //    (c) VALIDAR COMPARA HASHES, en las dos direcciones: el código bueno pasa y queda `usado`; el mismo con
  //        el último dígito cambiado no pasa («no es correcto»); repetir el bueno no pasa («ya fue
  //        utilizado»). Registro PLANTADO con sal fija: el código correcto pasa; alterar UN carácter del hash
  //        con el código correcto NO pasa (lo que decide es el hash); alterar la sal con el código correcto
  //        NO pasa (la sal entra al hash); `null` no pasa.
  //    (d) TTL, en las dos direcciones: `exp` en el pasado rechaza con «expiró» aunque el código sea el
  //        bueno —y también con uno malo: vencido se dice antes de mirar el código—; `exp` en el futuro pasa.
  //    (e) Sin registro: «No hay un código vigente».
  //    (f) LO QUE SE PERSISTE para el portal (`cursePersist`, la misma forma que usan `enviarCierre` y el
  //        Agente IA) es v3 = `SCHEMA_VERSION.curse` con otpHash/otpSal/otpAlg/otpExp/otpUsado, sin `otp`
  //        ni el código en ningún valor, y basta para validar recalculando —que es lo que hace curse.html—.
  //    (g) `igualConstante` es la comparación (tabla de verdad) y el contrato declara CRY-01 sobre
  //        otp.emitir/otp.validar sin `evaluar` (se aplica en la función, no en `validarMutacion`).
  //    LÍMITE DE INTENTOS: `validarOtp` NO lo lleva —vive en `LoginScreen` como estado de React
  //    (`otpIntentos` contra `AUTH_OTP_MAX`)—; acá sólo se fija que la constante exista y sea ≥ 1, y el
  //    comportamiento lo cubre el e2e del login (CRY-01.e2e.mjs). SHA-256 es asíncrono: el `ok` sale con
  //    la parte síncrona y «pendiente», la asíncrona lo reemplaza en sitio y `out` se vuelve thenable.
  //    Todo lo tocado (tres claves de OTP_STORE, una clave fs_curse_ del storage) se restaura.
  {
    const NEG = "CRY01-" + Date.now(), NEGP = NEG + "-plantado", NEGT = NEG + "-ttl", KEY = "fs_curse_" + NEG;
    const t0 = Date.now();
    const inv = invarianteDe("CRY-01");
    const contratoOk = !!inv && inv.autoridad === "servidor" && inv.aplicado === "funcion" && typeof inv.evaluar !== "function"
      && inv.mutaciones.includes("otp.emitir") && inv.mutaciones.includes("otp.validar")
      && validarMutacion("otp.validar", {}).violaciones.every((x) => x.codigo !== "CRY-01");
    const fnOk = ["emitirOtp", "validarOtp", "otpHash", "otpAleatorio", "sha256Hex", "igualConstante", "cursePersist"].every((f) => typeof window[f] === "function" || typeof eval(f) === "function");
    const ctOk = igualConstante("abc", "abc") === true && igualConstante("abc", "abd") === false && igualConstante("abc", "ab") === false
      && igualConstante("", "") === true && igualConstante(null, "") === true && igualConstante("x", null) === false;
    const constOk = Number.isFinite(OTP_TTL_MS) && OTP_TTL_MS > 0 && OTP_TTL_MS <= 86400000 && OTP_LARGO === 6
      && Number.isInteger(AUTH_OTP_MAX) && AUTH_OTP_MAX >= 1 && /^\d{6}$/.test(otpAleatorio(OTP_LARGO)) && /^\d{4}$/.test(otpAleatorio(4));
    const syncOk = contratoOk && fnOk && ctOk && constOk;
    const detSync = `contrato CRY-01 sobre otp.emitir/otp.validar sin evaluar ${contratoOk} · funciones ${fnOk} · igualConstante tabla de verdad ${ctOk} · constantes (TTL ${Math.round(OTP_TTL_MS / 60000)} min · largo ${OTP_LARGO} · AUTH_OTP_MAX ${AUTH_OTP_MAX}) ${constOk}`;
    const TIT = "138 CRY-01 · el OTP se guarda como SHA-256 con sal por emisión y nunca en claro; validar compara hashes, vence por TTL y consume un solo uso";
    const iOut = out.length;
    ok(TIT, syncOk, detSync + " · emisión, validación, TTL y persistencia: pendiente (asíncrono)");
    const hex = (s, n) => new RegExp("^[0-9a-f]{" + n + "}$").test(String(s || ""));
    // ¿algún valor del objeto (en profundidad) ES el código?
    const enClaro = (o, c) => { if (o == null) return false; if (typeof o !== "object") return String(o) === String(c); return Object.values(o).some((v) => enClaro(v, c)); };
    const limpiar = () => { delete OTP_STORE[NEG]; delete OTP_STORE[NEGP]; delete OTP_STORE[NEGT]; try { localStorage.removeItem(KEY); } catch (_) {} };
    const fin = (async () => {
      try {
        // (a) emisión
        const code = await emitirOtp(NEG);
        const reg = { ...OTP_STORE[NEG] };
        const t1 = Date.now();
        const hRecalc = await otpHash(NEG, reg.sal, code), hDirecto = await sha256Hex("otp$" + NEG + "$" + reg.sal + "$" + code);
        const emisionOk = /^\d{6}$/.test(code) && code.length === OTP_LARGO && HASH_ALG === "sha256" && reg.alg === "sha256"
          && hex(reg.sal, 32) && hex(reg.hash, 64) && reg.usado === false && reg.exp - reg.emitido === OTP_TTL_MS
          && reg.exp >= t0 + OTP_TTL_MS && reg.exp <= t1 + OTP_TTL_MS && reg.hash === hRecalc && reg.hash === hDirecto
          // Vector conocido: sin esto «se guarda como SHA-256» sólo compararía la función consigo misma (un hash de 32 bits estirado a 64 hex pasaría).
          && (await sha256Hex("abc")) === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
          && (await sha256Hex("")) === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
        const claroOk = !enClaro(reg, code) && !("code" in reg) && !("otp" in reg)
          && enClaro({ neg: NEG, otp: code, ts: t1 }, code) && enClaro({ ...reg, code }, code) && enClaro({ a: { b: 123456 } }, "123456"); // sonda: el detector discrimina (literal, no Number(code): un OTP que empieza en 0 perdía el cero)
        // (b) sal por emisión
        const salA = "a".repeat(32), salB = "b".repeat(32);
        const hA = await otpHash(NEG, salA, code), hB = await otpHash(NEG, salB, code), hA2 = await otpHash(NEG, salA, code), hOtro = await otpHash(NEG + "x", salA, code);
        const salOk = hex(hA, 64) && hA !== hB && hA === hA2 && hOtro !== hA;
        const code2 = await emitirOtp(NEG);
        const reg2 = { ...OTP_STORE[NEG] };
        const viejo = code === code2 ? { ok: false } : await validarOtp(NEG, code);
        const rotaOk = reg2.sal !== reg.sal && reg2.hash !== reg.hash && reg2.usado === false && viejo.ok === false && OTP_STORE[NEG].usado === false;
        // (c) validar: dos direcciones y el hash decide
        const mal = code2.slice(0, -1) + String((Number(code2.slice(-1)) + 1) % 10);
        const vMal = await validarOtp(NEG, mal);
        const usadoTrasFallo = OTP_STORE[NEG].usado;
        const vBien = await validarOtp(NEG, code2);
        const usadoTrasExito = OTP_STORE[NEG].usado;
        const vRep = await validarOtp(NEG, code2);
        const validaOk = vMal.ok === false && /no es correcto/i.test(vMal.error) && vBien.ok === true && usadoTrasExito === true
          && vRep.ok === false && /ya fue utilizado/i.test(vRep.error);
        const salP = "0123456789abcdef0123456789abcdef", CP = "123456";
        const plantar = async (neg, sal, code, exp, extra) => { OTP_STORE[neg] = { alg: "sha256", sal, hash: await otpHash(neg, sal, code), exp, usado: false, emitido: Date.now(), ...(extra || {}) }; };
        await plantar(NEGP, salP, CP, Date.now() + OTP_TTL_MS);
        const pMal = await validarOtp(NEGP, "123457");
        const pBien = await validarOtp(NEGP, CP);
        await plantar(NEGP, salP, CP, Date.now() + OTP_TTL_MS);
        const h0 = OTP_STORE[NEGP].hash;
        OTP_STORE[NEGP].hash = h0.slice(0, -1) + (h0.endsWith("0") ? "1" : "0");
        const pAlterado = await validarOtp(NEGP, CP);
        await plantar(NEGP, salP, CP, Date.now() + OTP_TTL_MS);
        OTP_STORE[NEGP].sal = salP.split("").reverse().join("");
        const pSal = await validarOtp(NEGP, CP);
        await plantar(NEGP, salP, CP, Date.now() + OTP_TTL_MS);
        const pNull = await validarOtp(NEGP, null);
        const pNum = await validarOtp(NEGP, 123456); // el código llega como string; un número con los mismos dígitos también calza
        const hashDecideOk = pMal.ok === false && pBien.ok === true && pAlterado.ok === false && /no es correcto/i.test(pAlterado.error)
          && pSal.ok === false && pNull.ok === false && pNum.ok === true;
        // (d) TTL
        const CT = "654321";
        await plantar(NEGT, salP, CT, Date.now() - 1);
        const tVenc = await validarOtp(NEGT, CT);
        await plantar(NEGT, salP, CT, Date.now() - 1);
        const tVencMal = await validarOtp(NEGT, "000000");
        await plantar(NEGT, salP, CT, Date.now() + OTP_TTL_MS);
        const tVig = await validarOtp(NEGT, CT);
        const ttlOk = tVenc.ok === false && /expir/i.test(tVenc.error) && tVencMal.ok === false && /expir/i.test(tVencMal.error) && tVig.ok === true;
        // (e) sin registro
        const sin = await validarOtp(NEG + "-nadie", CP);
        const sinOk = sin.ok === false && /no hay un código/i.test(sin.error);
        // (f) persistencia para el portal, con la MISMA forma que los dos llamadores
        cursePersist(NEG, { neg: NEG, otpHash: reg2.hash, otpSal: reg2.sal, otpAlg: reg2.alg, otpExp: reg2.exp, otpUsado: false, payload: { montoAGirar: 1 }, ts: Date.now() });
        const raw = localStorage.getItem(KEY); const st = raw ? JSON.parse(raw) : null;
        const persistOk = !!st && SCHEMA_VERSION.curse === 3 && st._v === SCHEMA_VERSION.curse && st.otpHash === reg2.hash && st.otpSal === reg2.sal
          && st.otpAlg === "sha256" && st.otpExp === reg2.exp && st.otpUsado === false && !("otp" in st) && !("code" in st)
          && !enClaro(st, code2) && !raw.includes('"' + code2 + '"') && st.otpHash === await otpHash(NEG, st.otpSal, code2);
        const asyncOk = emisionOk && claroOk && salOk && rotaOk && validaOk && hashDecideOk && ttlOk && sinOk && persistOk;
        const det = ` · emisión: 6 dígitos, alg sha256, sal 32 hex, hash 64 hex = SHA-256("otp$neg$sal$code") recalculado, exp = emitido + TTL ${emisionOk}`
          + ` · ningún valor del registro es el código (sonda v1 {otp} y {code} sí se detectan) ${claroOk}`
          + ` · sal: misma clave dos sales → dos hashes, determinista, otro neg otro hash ${salOk} · re-emitir rota sal y hash y el código anterior deja de validar ${rotaOk}`
          + ` · validar: malo «${vMal.error}», bueno ok y usado, repetido «${vRep.error}» ${validaOk} (un intento fallido deja usado=${usadoTrasFallo})`
          + ` · plantado: el hash decide (hash alterado ✗, sal alterada ✗, null ✗, bueno ✓) ${hashDecideOk}`
          + ` · TTL: vencido «${tVenc.error}» aun con el código bueno y antes de mirarlo, vigente ✓ ${ttlOk} · sin registro «${sin.error}» ${sinOk}`
          + ` · persistido v${st && st._v} con otpHash/otpSal/otpAlg/otpExp/otpUsado, sin el código, y basta para recalcular ${persistOk}`;
        ok(TIT, syncOk && asyncOk, detSync + det);
        out[iOut] = out.pop();
      } finally { limpiar(); }
    })().catch((e) => { limpiar(); out[iOut] = "FALLA " + TIT + "  · la parte asíncrona reventó: " + String(e).slice(0, 300); });
    const plazo = new Promise((res) => setTimeout(() => { if (/pendiente \(asíncrono\)$/.test(out[iOut])) out[iOut] = out[iOut].replace(/^PASA  /, "FALLA ") + " · la parte asíncrona no resolvió en 10 s"; res(); }, 10000));
    const listo = Promise.race([fin, plazo]).catch(() => {});
    const thenPrevio = typeof out.then === "function" ? out.then : null;
    out.then = (res) => { listo.then(() => { if (thenPrevio) { out.then = thenPrevio; thenPrevio(res); } else { delete out.then; res(out); } }); };
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 139 · regla PRI-01 — integrado el 17-09-2026 desde caso.js (cerrar la tabla de invariantes)
  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // ── NNN · PRI-01 · LA PRIORIDAD DE CURSE LA PIDE UNA JEFATURA, NO EL EJECUTIVO DUEÑO DEL NEGOCIO.
  //    El invariante vive en `INVARIANTES` (mutación `prioridadCurse.set`, autoridad servidor) y su `evaluar`
  //    es `esJefeComercial(p.usuario)`: 'ADMIN' o `atribEfectiva(code).comercial != null`. La mutación real es
  //    `setPrioridadCurse(dealId, code, on)`, que con `on` corre `validarMutacion` ANTES de escribir en
  //    `PRIORIDAD_CURSE` («el chequeo va en la FUNCIÓN, no sólo en el botón»). Se prueba:
  //    (a) el CONTRATO en las dos direcciones: un ejecutivo comercial (rol `ejec_comercial`, atribución vacía)
  //        viola con el código PRI-01, +1 en `CONTRATO_RECHAZOS` y entrada warn/contrato en `SYS_LOG`; el Jefe de
  //        Grupo, el Gerente Comercial y el Gerente General —los tres con atribución comercial EFECTIVA; el nivel
  //        se lee del padrón y sólo se imprime, la escalera N1<N2<N3 es asunto de `ROL_ATRIB`— y ADMIN pasan sin
  //        contar. Falla CERRADO: un código desconocido, un payload sin `usuario` y uno vacío se rechazan. Y sólo
  //        la jefatura COMERCIAL pide prioridad: se recorre TODO el catálogo `USERS` y cada usuario pasa si y
  //        sólo si es ADMIN o tiene atribución comercial efectiva —la partición se MIDE con `atribEfectiva`, no
  //        se escribe a mano—, exigiendo que entre los rechazados haya al menos una jefatura de OTRA área
  //        (riesgo/operaciones): es lo que distingue «jefatura comercial» de «cualquier jefatura».
  //    (b) la SONDA de cobertura: una mutación ajena (`oportunidad.cursar`) con el mismo payload violatorio no
  //        corre PRI-01 ni mueve el contador — el rechazo de (a) viene de ESTE invariante y no de otro.
  //    (c) la MUTACIÓN: `setPrioridadCurse` con el ejecutivo devuelve false y no escribe; con el jefe devuelve
  //        true y deja `{por, porNombre, ts}` con el código y el nombre del padrón.
  //    (d) SIGUE AL ROL: cambiar el rol del ejecutivo a `jefe_comercial` lo habilita y devolverlo lo quita —el
  //        padrón se invalida por firma, no por un invalidador—.
  //    (e) REEMPLAZOS (regla 19): el mismo ejecutivo, cubriendo al Jefe de Grupo desde HOY y hasta 30 días
  //        después (holgura para que la corrida no dependa de cruzar las 00:00 UTC entre dos `hoyISO()`),
  //        pasa (hereda comercial N1 del cargo que cubre), escribe la prioridad a su nombre, y el ausente sigue
  //        pudiendo (aditivo); con `ausenteAprueba: false` el ausente queda fuera y el reemplazante sigue; un
  //        reemplazo VENCIDO no habilita a nadie. `atribDe(ejec)` sigue vacía en todo momento: manda la EFECTIVA.
  //    Medido y NO exigido (queda en hallazgos): QUITAR la prioridad (`on = false`) no pasa por PRI-01 —el
  //    ejecutivo puede borrar la marca que puso su jefe—, aunque el comentario del código diga «pedir/quitar»;
  //    y `seedTareasDemo` escribe `PRIORIDAD_CURSE` directo (semilla de demo a nombre de JG, fuera del contrato).
  //    Una excepción en el cuerpo se captura y el caso queda en FALLA con el error, nunca en un throw que tumbe
  //    la suite. Todo lo tocado (REEMPLAZOS, ROL_USUARIO, PRIORIDAD_CURSE, CONTRATO_RECHAZOS, SYS_LOG) se restaura.
  {
    let R = null, deshacer = null, ejec = "?";
    try {
      // El SETUP también va dentro del try: si un global cambió de forma, el caso queda en FALLA con el
      // error y no en un throw que tumbe los casos que vienen después. `deshacer` se fija ANTES de tocar
      // nada, así el `finally` restaura exactamente lo que alcanzó a cambiarse.
      const rmp0 = REEMPLAZOS;
      ejec = Object.keys(EXECS).find((c) => ROL_USUARIO[c] === "ejec_comercial") || Object.keys(EXECS)[0];
      const rol0 = ROL_USUARIO[ejec];
      const rech0 = Object.prototype.hasOwnProperty.call(CONTRATO_RECHAZOS, "PRI-01") ? CONTRATO_RECHAZOS["PRI-01"] : undefined;
      const idLog0 = SYS_LOG[0] ? SYS_LOG[0].id : 0;
      const nR = () => CONTRATO_RECHAZOS["PRI-01"] || 0;
      const IDS = ["OP-PRI01-a", "OP-PRI01-b", "OP-PRI01-c"];
      const prio0 = IDS.map((id) => [id, PRIORIDAD_CURSE[id]]);
      deshacer = () => {
        REEMPLAZOS = rmp0; ROL_USUARIO[ejec] = rol0;
        for (const [id, v] of prio0) { if (v === undefined) delete PRIORIDAD_CURSE[id]; else PRIORIDAD_CURSE[id] = v; }
        if (rech0 === undefined) delete CONTRATO_RECHAZOS["PRI-01"]; else CONTRATO_RECHAZOS["PRI-01"] = rech0;
        for (let i = SYS_LOG.length - 1; i >= 0; i--) { const e = SYS_LOG[i]; if (e && e.id > idLog0 && e.fuente === "contrato" && e.datos && e.datos.codigo === "PRI-01") SYS_LOG.splice(i, 1); }
      };
      const inv = invarianteDe("PRI-01");
      // `includes`, no «la única mutación»: agregar `prioridadCurse.unset` (hallazgo 1) no es romper PRI-01.
      const invOk = !!inv && inv.autoridad === "servidor" && typeof inv.evaluar === "function" && inv.mutaciones.includes("prioridadCurse.set");
      const val = (p, tipo) => validarMutacion(tipo || "prioridadCurse.set", p);
      const viola = (v) => !!inv && !v.ok && v.violaciones.length === 1 && v.violaciones[0].codigo === "PRI-01" && v.violaciones[0].regla === inv.regla;
      const limpia = (v) => v.ok && v.violaciones.length === 0;
      // El ejecutivo es de verdad un ejecutivo: rol de pipeline, sin atribución por cargo ni efectiva.
      const ejecOk = rol0 === "ejec_comercial" && Object.keys(atribDe(ejec).atrib).length === 0
        && Object.keys(atribEfectiva(ejec)).length === 0 && !!USERS[ejec];

      // (a) contrato, dos direcciones
      const a0 = nR();
      const vEjec = val({ usuario: ejec, dealId: IDS[0] });
      const eLog = SYS_LOG[0];
      const rechazaEjec = viola(vEjec) && nR() === a0 + 1
        && !!eLog && eLog.id > idLog0 && eLog.nivel === "warn" && eLog.fuente === "contrato" && /PRI-01/.test(String(eLog.mensaje))
        && !!eLog.datos && eLog.datos.codigo === "PRI-01" && eLog.datos.mutacion === "prioridadCurse.set" && eLog.datos.autoridad === "servidor";
      const a1 = nR();
      const JEFES = ["JG", "GC", "GG"];
      const nivelesJefes = JEFES.map((c) => atribEfectiva(c).comercial);
      // Tener atribución comercial efectiva es la PRECONDICIÓN que le da sentido al «pasan»; el nivel sólo se imprime.
      const pasanJefes = nivelesJefes.every((n) => typeof n === "number")
        && JEFES.every((c) => limpia(val({ usuario: c, dealId: IDS[0] })))
        && limpia(val({ usuario: "ADMIN", dealId: IDS[0] })) && nR() === a1;
      const a2 = nR();
      const fallaCerrado = viola(val({ usuario: "ZZ_NO_EXISTE" })) && viola(val({ dealId: IDS[0] })) && viola(val({})) && nR() === a2 + 3;
      // Sólo la jefatura COMERCIAL: la partición del catálogo se MIDE (ADMIN o comercial efectiva ⇔ pasa).
      const CATALOGO = Object.keys(USERS);
      const DEBEN_PASAR = CATALOGO.filter((c) => c === "ADMIN" || atribEfectiva(c).comercial != null);
      const DEBEN_RECHAZAR = CATALOGO.filter((c) => !DEBEN_PASAR.includes(c));
      const OTRA_AREA = DEBEN_RECHAZAR.filter((c) => Object.keys(atribEfectiva(c)).length > 0)
        .map((c) => c + ":" + Object.entries(atribEfectiva(c)).map(([area, n]) => area + n).join("+"));
      const a3 = nR();
      const pasanMal = DEBEN_RECHAZAR.filter((c) => !viola(val({ usuario: c })));
      const rechazanMal = DEBEN_PASAR.filter((c) => !limpia(val({ usuario: c })));
      const soloComercial = OTRA_AREA.length >= 1 && pasanMal.length === 0 && rechazanMal.length === 0 && nR() === a3 + DEBEN_RECHAZAR.length;

      // (b) sonda de cobertura: otra mutación no lo corre
      const a4 = nR();
      const vAjena = val({ usuario: ejec, dealId: IDS[0] }, "oportunidad.cursar");
      const sondaCobertura = !vAjena.violaciones.some((x) => x.codigo === "PRI-01") && nR() === a4;

      // (c) la mutación real
      const a5 = nR();
      const setEjec = setPrioridadCurse(IDS[1], ejec, true);
      const noEscribe = setEjec === false && PRIORIDAD_CURSE[IDS[1]] === undefined && tienePrioridadCurse(IDS[1]) === false && nR() === a5 + 1;
      const setJefe = setPrioridadCurse(IDS[1], "JG", true);
      const reg = PRIORIDAD_CURSE[IDS[1]];
      const escribeJefe = setJefe === true && tienePrioridadCurse(IDS[1]) === true
        && !!reg && reg.por === "JG" && reg.porNombre === USERS["JG"] && !!reg.ts && nR() === a5 + 1;
      // medido, no exigido (hallazgo 1): hoy quitar no pasa por el contrato. Se imprime tal cual se mide.
      const quitaEjec = setPrioridadCurse(IDS[1], ejec, false);
      const quitarMedido = `quitar (on=false) por ${ejec} devuelve ${quitaEjec}, la marca de JG ${tienePrioridadCurse(IDS[1]) ? "sigue" : "desaparece"}, contador ${nR() === a5 + 1 ? "quieto" : "se mueve"}`;

      // (d) sigue al rol
      ROL_USUARIO[ejec] = "jefe_comercial";
      const conRol = esJefeComercial(ejec) && limpia(val({ usuario: ejec })) && atribEfectiva(ejec).comercial === ROL_ATRIB.jefe_comercial.nivel;
      ROL_USUARIO[ejec] = rol0;
      const sigueAlRol = conRol && !esJefeComercial(ejec) && viola(val({ usuario: ejec }));

      // (e) reemplazos: `esJefeComercial` no recibe hoy ni lista, así que el reemplazo entra por el global.
      //     `hasta` va 30 días adelante: `atribEfectiva` vuelve a llamar `hoyISO()` en cada consulta.
      const hoy = hoyISO();
      const hasta = new Date(Date.parse(hoy + "T00:00:00Z") + 30 * 86400e3).toISOString().slice(0, 10);
      const base = { id: "rPRI", ausente: "JG", reemplazante: ejec, desde: hoy, hasta, motivo: "Vacaciones" };
      REEMPLAZOS = [{ ...base }];
      const nJG = atribDe("JG").atrib.comercial;
      const cubre = esJefeComercial(ejec) && limpia(val({ usuario: ejec })) && atribEfectiva(ejec).comercial === nJG
        && Object.keys(atribDe(ejec).atrib).length === 0 && coberturaDe(ejec)[0] && coberturaDe(ejec)[0].code === "JG";
      const setCubre = setPrioridadCurse(IDS[2], ejec, true);
      const escribeCubre = setCubre === true && !!PRIORIDAD_CURSE[IDS[2]] && PRIORIDAD_CURSE[IDS[2]].por === ejec;
      const aditivo = esJefeComercial("JG") && limpia(val({ usuario: "JG" }));
      REEMPLAZOS = [{ ...base, ausenteAprueba: false }];
      const revocado = !esJefeComercial("JG") && viola(val({ usuario: "JG" })) && esJefeComercial(ejec) && limpia(val({ usuario: ejec }));
      REEMPLAZOS = [{ ...base, desde: "2000-01-01", hasta: "2000-01-31" }];
      const vencido = !esJefeComercial(ejec) && viola(val({ usuario: ejec })) && esJefeComercial("JG");
      REEMPLAZOS = rmp0;
      const restaurado = !esJefeComercial(ejec) && viola(val({ usuario: ejec }));
      const reemplazoOk = cubre && escribeCubre && aditivo && revocado && vencido && restaurado;

      R = { invOk, ejecOk, ejec, rechazaEjec, pasanJefes, nivelesJefes, fallaCerrado, soloComercial, CATALOGO, DEBEN_PASAR, DEBEN_RECHAZAR, OTRA_AREA, pasanMal, rechazanMal,
        sondaCobertura, noEscribe, escribeJefe, quitarMedido, sigueAlRol, cubre, escribeCubre, aditivo, revocado, vencido, restaurado, reemplazoOk, nJG, hoy, hasta, total: nR() - a0 };
    } catch (e) {
      // Una rotura que reviente (una función que ya no existe, un global con otra forma) da FALLA con el error.
      R = { error: String((e && e.message) || e).slice(0, 200) };
    } finally {
      // Si restaurar revienta, también se dice: dejar estado sucio en silencio es lo que no puede pasar.
      if (deshacer) { try { deshacer(); } catch (e2) { R = { ...(R || {}), error: ((R && R.error) ? R.error + " · " : "") + "al restaurar: " + String((e2 && e2.message) || e2).slice(0, 120) }; } }
    }
    const Q = R || {}; if (Q.ejec === undefined) Q.ejec = ejec;
    const lista = (xs) => (xs || []).join("/");
    ok("139 PRI-01 · la prioridad de curse la pide una jefatura comercial: el ejecutivo dueño del negocio se rechaza y no escribe, JG/GC/GG/ADMIN pasan y todo el resto del catálogo se rechaza, sigue al rol y al reemplazo vigente, y falla cerrado con un usuario desconocido",
       !!R && !Q.error && Q.invOk && Q.ejecOk && Q.rechazaEjec && Q.pasanJefes && Q.fallaCerrado && Q.soloComercial && Q.sondaCobertura
       && Q.noEscribe && Q.escribeJefe && Q.sigueAlRol && Q.reemplazoOk,
       (Q.error ? `EXCEPCIÓN ${Q.error} · ` : "")
       + `invariante prioridadCurse.set · servidor ${Q.invOk} · ${Q.ejec} es ejec_comercial sin atribución ${Q.ejecOk}`
       + ` · (a) ${Q.ejec} viola PRI-01 +1 contador y log ${Q.rechazaEjec} · JG/GC/GG comercial N${(Q.nivelesJefes || []).join("/N")} y ADMIN pasan sin contar ${Q.pasanJefes}`
       + ` · desconocido, sin usuario y payload vacío se rechazan ${Q.fallaCerrado}`
       + ` · sólo comercial: de ${(Q.CATALOGO || []).length} usuarios pasan ${lista(Q.DEBEN_PASAR)} y se rechazan los ${(Q.DEBEN_RECHAZAR || []).length} restantes (${lista(Q.DEBEN_RECHAZAR)}), entre ellos otras áreas ${(Q.OTRA_AREA || []).join(" ")} ${Q.soloComercial}`
       + ((Q.pasanMal || []).length ? ` ¡pasan sin ser jefatura comercial: ${lista(Q.pasanMal)}!` : "") + ((Q.rechazanMal || []).length ? ` ¡jefatura comercial rechazada: ${lista(Q.rechazanMal)}!` : "")
       + ` · (b) sonda: oportunidad.cursar no corre PRI-01 ${Q.sondaCobertura}`
       + ` · (c) setPrioridadCurse con ${Q.ejec} devuelve false y no escribe ${Q.noEscribe} · con JG escribe {por:JG, porNombre, ts} ${Q.escribeJefe} · medido, no exigido: ${Q.quitarMedido}`
       + ` · (d) rol jefe_comercial habilita y devolverlo quita ${Q.sigueAlRol}`
       + ` · (e) cubriendo a JG desde ${Q.hoy} hasta ${Q.hasta} hereda comercial N${Q.nJG} con atribDe vacía ${Q.cubre} · escribe a su nombre ${Q.escribeCubre} · JG sigue (aditivo) ${Q.aditivo} · ausenteAprueba:false revoca a JG y deja al reemplazante ${Q.revocado} · reemplazo vencido no habilita ${Q.vencido} · restaurado ${Q.restaurado}`
       + ` · rechazos netos ${Q.total}`);
  }

  // ── 140 · CERRAR LA OFERTA SE PUEDE DESHACER, Y SON TRES HECHOS DISTINTOS ────────────────────
  // «Cerrada» (el ejecutivo aprobó el paquete), «publicada» (el correo con el código de negocio ya
  // salió) y «reabierta» (la firma del cliente quedó revocada) son cosas distintas, y el botón
  // «Editar» sólo deshace la primera. Confundirlas deja o una oferta que no se puede volver a
  // cerrar —el CTA quedaba vivo y al apretarlo no pasaba nada— o una firma que reaparece sola.
  {
    const cerrada = { id: "OP-E1", stage: "oferta", ofertaCerrada: true, negocioNum: "OP-E1", publicacion: "electronica" };
    const abierta = { id: "OP-E2", stage: "oferta" };
    const editando = { ...cerrada, enEdicion: { ts: "x", por: "y" } };
    const firmada = { id: "OP-E3", stage: "cesion", ofertaCerrada: true, negocioNum: "OP-E3", clienteAcepto: true };
    const girada = { ...cerrada, id: "OP-E4", stage: "giro" };
    const enCore = { ...cerrada, id: "OP-E5", integracion: "aprobada" };
    const perdida = { ...cerrada, id: "OP-E6", stage: "perdida" };

    // (a) El predicado del CIERRE mira las dos banderas y la marca de edición.
    const vigOk = ofertaCerradaVigente(cerrada) === true && ofertaCerradaVigente(abierta) === false
      && ofertaCerradaVigente(editando) === false && ofertaCerradaVigente(null) === false;

    // (b) PUBLICAR NO SE DESHACE. El correo salió; lo que se suelta es la aprobación interna. Si
    //     `ofertaPublicada` se cayera al editar, el tab de Verificación desaparecería y con él las
    //     llamadas ya registradas — evidencia de 3 a 4 horas por deudor.
    const pubCerrada = { ...cerrada, ofertaComunicada: true };
    const pubEditando = { ...pubCerrada, enEdicion: { ts: "x" } };
    const pubOk = ofertaPublicada(pubCerrada) === true && ofertaPublicada(pubEditando) === true;

    // (c) EDITAR: a quién aplica, quién puede y qué implica.
    const eAbierta = edicionOperacion(abierta), eCerrada = edicionOperacion(cerrada);
    const eFirmada = edicionOperacion(firmada), eGirada = edicionOperacion(girada);
    const eCore = edicionOperacion(enCore), ePerdida = edicionOperacion(perdida);
    const edicOk = eAbierta.aplica === false                       // nada que reabrir: ya es editable
      && eCerrada.aplica === true && eCerrada.ok === true && !eCerrada.revocaFirma
      && eFirmada.aplica === true && eFirmada.ok === true && eFirmada.revocaFirma === true
      && eGirada.aplica === true && eGirada.ok === false           // girada no se edita
      && eCore.aplica === true && eCore.ok === false               // ya la tomó Tesorería
      && ePerdida.aplica === true && ePerdida.ok === false;
    // Y NUNCA SIN MOTIVO: un destino apagado que no dice por qué deja al ejecutivo sin dónde
    // enterarse (regla 24). Los tres «no» tienen que explicarse, y con textos distintos.
    const motivos = [eGirada.motivo, eCore.motivo, ePerdida.motivo];
    const motivoOk = motivos.every((m) => typeof m === "string" && m.length > 20)
      && new Set(motivos).size === 3 && eCerrada.motivo !== eFirmada.motivo;

    // (d) LA FIRMA SE REVOCA SÓLO CUANDO HABÍA FIRMA. `enEdicion` y `reabierta` son independientes:
    //     cerrar de nuevo limpia la primera, y si fueran la misma marca devolvería una aceptación
    //     que nadie dio. Se comprueba sobre el gate que decide si se puede girar.
    const firmadaEditando = { ...firmada, enEdicion: { ts: "x" }, reabierta: { ts: "x" } };
    const reCerrada = { ...firmadaEditando, enEdicion: undefined };        // volvió a cerrarse
    const firmaOk = aprobacionFormalCliente(firmada) === true
      && aprobacionFormalCliente(firmadaEditando) === false
      && aprobacionFormalCliente(reCerrada) === false   // cerrar NO devuelve la firma
      && ofertaCerradaVigente(reCerrada) === true;      // pero sí devuelve el cierre

    // (e) LA SOLICITUD AL COMITÉ NO SE DUPLICA. Al re-cerrar, lo que falta de línea se vuelve a
    //     calcular; si pide lo mismo no se inyecta de nuevo, porque NEX no puede retirar la
    //     anterior (regla 15) y el comité vería dos peticiones sin saber cuál rige. Se compara el
    //     DETALLE y no el total: dos repartos distintos pueden sumar igual.
    const s1 = { rut: "1-9", detalle: [{ rutDeudor: "2-7", monto: 60e6, tipoLinea: "puntual" }, { rutDeudor: "3-5", monto: 30e6, tipoLinea: "puntual" }] };
    const s2 = { rut: "1-9", detalle: [{ rutDeudor: "3-5", monto: 30e6, tipoLinea: "puntual" }, { rutDeudor: "2-7", monto: 60e6, tipoLinea: "puntual" }] }; // mismo, otro orden
    const s3 = { rut: "1-9", detalle: [{ rutDeudor: "2-7", monto: 50e6, tipoLinea: "puntual" }, { rutDeudor: "3-5", monto: 40e6, tipoLinea: "puntual" }] }; // mismo total, otro reparto
    const s4 = { rut: "1-9", detalle: [{ rutDeudor: "2-7", monto: 60e6, tipoLinea: "puntual" }] };
    const solOk = mismaSolicitudComite(s1, s2) === true && mismaSolicitudComite(s1, s3) === false
      && mismaSolicitudComite(s1, s4) === false && mismaSolicitudComite(s1, { ...s1, rut: "9-9" }) === false
      && mismaSolicitudComite(s1, null) === false;

    ok("140 cerrar la oferta se deshace con «Editar», y publicar y firmar no se deshacen con ella",
       vigOk && pubOk && edicOk && motivoOk && firmaOk && solOk,
       `cierre vigente ${vigOk} \u00b7 publicar no se deshace ${pubOk} \u00b7 a qui\u00e9n aplica editar ${edicOk} \u00b7 siempre con motivo ${motivoOk} \u00b7 la firma s\u00f3lo se revoca si la hab\u00eda, y cerrar no la devuelve ${firmaOk} \u00b7 la solicitud al comit\u00e9 no se duplica ${solOk}`);
  }

  // ── 141 · UNA REGLA MAL DEFINIDA NO SE EJECUTA NI SE VERIFICA, Y LA SALIDA LO DICE ──────────
  // El ruteo de una excepción es el par (ÁREA, NIVEL): la regla pone el área y su tramo el nivel. Una regla
  // que DECIDE y no declara área no se puede rutear, y hasta hoy se evaluaba igual: el resultado salía con
  // «Sin aprobador definido» y la operación quedaba esperando a alguien que no existe. Ahora no se ejecuta
  // y se dice. Hoy NINGUNA regla del catálogo cae acá, así que el caso las PLANTA: un test que comparara el
  // catálogo consigo mismo pasaría siempre y no vigilaría nada.
  {
    const vars = { x: 100 };                                  // una variable cualquiera para los tramos
    const tramos = [[(v) => v.x > 50, "excepcion", 3], [() => true, "aprobado"]];
    const sinArea   = { n: 9001, nombre: "Plantada sin área", cond: "C9001", hallazgo: "Hallazgo que nadie midió", tiers: tramos };
    const conArea   = { n: 9002, area: "riesgo", nombre: "Plantada con área", cond: "C9002", hallazgo: "h", tiers: tramos };
    const areaVacia = { n: 9003, area: "", nombre: "Área en blanco", cond: "C9003", tiers: tramos };
    const clasifSin = { n: 9004, nombre: "Clasificación sin área", cond: "C9004", clasif: true, clfn: () => "Clase X" };
    const sinTramos = { n: 9005, nombre: "Sin tramos", cond: "C9005" };
    // KNOCK OUT sin área: NO es mal definida. El área es a quién se le pide la EXCEPCIÓN, y un knock out
    // no se aprueba —incumple y se acabó—. Corrección del usuario (18-09-2026): «no todas las reglas
    // requieren de aprobador, las knock out no tienen». El caso lo mide contra el catálogo REAL, abajo.
    const koSinArea  = { n: 9006, nombre: "Knock out sin área", cond: "C9006", hallazgo: "h", tiers: [[(v) => v.x > 50, "rechazado"], [() => true, "aprobado"]] };
    const mixtaSinA  = { n: 9007, nombre: "Mixta sin área", cond: "C9007", hallazgo: "h", tiers: [[(v) => v.x > 90, "rechazado"], [(v) => v.x > 50, "excepcion", 2], [() => true, "aprobado"]] };

    // (a) La COMPUERTA: decide con la definición de la regla y el padrón que le pasan, y con nada más.
    //     Desde la ampliación del 18-09-2026 el padrón hace falta para juzgar el RUTEO (caso 143); las
    //     que fallan por su sola definición —sin área, clasificación, sin tramos, knock out— se resuelven
    //     antes de mirarlo, y por eso acá se siguen probando sin él.
    const pad141 = padronAprobadores();
    const g1 = reglaNoEjecutable(sinArea, pad141), g2 = reglaNoEjecutable(conArea, pad141);
    const compuertaOk = g1.noEjecutable === true && !!g1.motivo && !!g1.arregla
      && g2.noEjecutable === false
      && reglaNoEjecutable(areaVacia, pad141).noEjecutable === true    // "" es no declarar área
      && reglaNoEjecutable(clasifSin, pad141).noEjecutable === false   // informa, no decide
      && reglaNoEjecutable(sinTramos, pad141).noEjecutable === false   // no decide nada
      && reglaNoEjecutable(koSinArea, pad141).noEjecutable === false   // KNOCK OUT: no se aprueba, no necesita área
      && reglaNoEjecutable(mixtaSinA, pad141).noEjecutable === true    // pero uno de sus tramos SÍ es excepción
      && reglaNoEjecutable(null, pad141).noEjecutable === true         // falla CERRADO
      && reglaNoEjecutable(sinArea).noEjecutable === true              // y sin área no necesita el padrón
    // Y el knock out sin área SE EJECUTA de verdad, en las dos direcciones: rechaza cuando toca y aprueba
    // cuando no. Mirando sólo la compuerta, un `evalReglaCli` que igual lo cortara pasaría inadvertido.
    const koOk = evalReglaCli(koSinArea, vars, pad141).disp === "rechazado"
      && evalReglaCli(koSinArea, { x: 10 }, pad141).disp === "aprobado";
    // El criterio es el MISMO con que la mesa de reglas arma su lista (`tiers.some(excepcion)`): si
    // divergieran, la mesa mostraría reglas que el motor no rutea, o al revés.
    const conExc = REGLAS_CLIENTE.filter((rg) => !rg.clasif && (rg.tiers || []).some((t) => t[1] === "excepcion"));
    const soloKo = REGLAS_CLIENTE.filter((rg) => !rg.clasif && (rg.tiers || []).length && !(rg.tiers || []).some((t) => t[1] === "excepcion"));
    const mesaOk = conExc.every((rg) => reglaNoEjecutable(rg, pad141).noEjecutable === !rg.area)
      && soloKo.every((rg) => reglaNoEjecutable(rg, pad141).noEjecutable === false) && soloKo.length > 0;

    // (b) EL MOTOR NO LA EJECUTA. Con x=100 el primer tramo calza, así que la regla CON área levanta
    //     excepción N3; la misma sin área tiene que salir `no_ejecutada`, sin nivel y sin tramo.
    const eSin = evalReglaCli(sinArea, vars, pad141), eCon = evalReglaCli(conArea, vars, pad141);
    const noEjecutaOk = eSin.disp === "no_ejecutada" && eSin.nivel === undefined && eSin.tierIdx === null
      && !!eSin.motivo && eCon.disp === "excepcion" && eCon.nivel === 3;
    // Y no se ejecuta NI SIQUIERA cuando el tramo que calzaría es `aprobado`: no se trata de qué habría
    // dicho, sino de que nadie la evaluó. Con x=10 el primer tramo no calza y el segundo aprueba.
    const eSinAprob = evalReglaCli(sinArea, { x: 10 }, pad141), eConAprob = evalReglaCli(conArea, { x: 10 }, pad141);
    const tampocoAprobadoOk = eSinAprob.disp === "no_ejecutada" && eConAprob.disp === "aprobado";
    // La de clasificación sin área SÍ se evalúa: informa.
    const clasifOk = evalReglaCli(clasifSin, vars, pad141).disp === "clasificacion";

    // (c) EL MOTIVO distingue la causa: acá falta la DEFINICIÓN, no un usuario. «Sin aprobador definido»
    //     sigue siendo la respuesta del otro caso —el área existe y nadie la tiene—, y no se confunden.
    const motivoOk = /no declara área/.test(eSin.motivo) && !/Sin aprobador definido/.test(eSin.motivo)
      && rolDeAreaNivel("riesgo", 5).sinAprobador !== true                       // riesgo N5 sí existe
      && rolDeAreaNivel("area_que_no_existe", 3).sinAprobador === true;          // ése es el otro caso

    // (d) LA COMPUERTA ES PURA: dos llamadas dan lo mismo y no mutan la regla.
    const antes = JSON.stringify(Object.keys(sinArea).sort());
    const g1b = reglaNoEjecutable(sinArea, pad141);
    const puraOk = g1b.noEjecutable === g1.noEjecutable && g1b.motivo === g1.motivo
      && JSON.stringify(Object.keys(sinArea).sort()) === antes;

    // (e) NO BLOQUEA, pero SALE del motor. Se planta la regla en el catálogo real y se mira el veredicto
    //     de una operación: la no ejecutada viaja en `noEjec`, no está en `exc` ni en `rech`, y el estado
    //     agregado es el MISMO que sin ella —lo que protege a la operación no es el bloqueo, es que se vea—.
    const deal = { id: "OP-R35", stage: "oferta", cliente: "Cliente 35", rutEmisor: "76000001-1", monto: 30e6 };
    const vAntes = visadoDealCalc(deal, {});
    REGLAS_CLIENTE.push(sinArea);
    let vDespues = null, err = null;
    try { VISADO_CACHE.clear(); vDespues = visadoDealCalc(deal, {}); }
    catch (e) { err = e.message; }
    finally { REGLAS_CLIENTE.pop(); VISADO_CACHE.clear(); }
    const mia = vDespues && (vDespues.noEjec || []).find((x) => x.n === 9001);
    const veredictoOk = !err && !!mia && !!mia.motivo
      && !(vDespues.exc || []).some((x) => x.n === 9001)
      && !(vDespues.rech || []).some((x) => x.n === 9001)
      && vDespues.estado === vAntes.estado
      && (vAntes.noEjec || []).length === 0;   // el catálogo real no tiene ninguna: las 77 declaran área
    // Y el catálogo quedó como estaba: el caso no puede dejar una regla plantada para los que siguen.
    const restauradoOk = !REGLAS_CLIENTE.some((r) => r.n === 9001) && visadoDealCalc(deal, {}).estado === vAntes.estado;

    ok("141 una regla mal definida (tramo de excepción sin área) no se ejecuta ni se verifica y sale nombrada en el veredicto; un knock out sin área SÍ se ejecuta",
       compuertaOk && koOk && mesaOk && noEjecutaOk && tampocoAprobadoOk && clasifOk && motivoOk && puraOk && veredictoOk && restauradoOk,
       `compuerta ${compuertaOk} (excepción sin área ✓ · con área ✗ · área "" ✓ · clasificación ✗ · sin tramos ✗ · KNOCK OUT sin área ✗ · mixta sin área ✓ · null ✓) · el knock out se ejecuta en las dos direcciones ${koOk} · mismo criterio que la mesa ${mesaOk} (${conExc.length} con excepción · ${soloKo.length} knock out) · no se ejecuta ${noEjecutaOk} («${eSin.disp}» sin nivel ni tramo vs «${eCon.disp} N${eCon.nivel}») · tampoco cuando habría aprobado ${tampocoAprobadoOk} · la clasificación sí se evalúa ${clasifOk} · motivo distingue la causa ${motivoOk} («${eSin.motivo}») · pura ${puraOk} · veredicto ${veredictoOk} (noEjec ${mia ? 1 : 0} · fuera de exc/rech · estado «${vDespues && vDespues.estado}» = «${vAntes.estado}» · catálogo real sin ninguna) · catálogo restaurado ${restauradoOk}${err ? " · ERROR " + err : ""}`);
  }

  // ── 142 · LA BANDEJA INBOUND ES UNA VENTANA CON TOPE, Y LO QUE EL TOPE BOTA SE CUENTA ──────────
  // El contador de «Otras Empresas» sube y baja porque la bandeja guarda sólo las últimas N facturas
  // sin clasificar. Eso está bien —una ventana tiene que tener tope— y lo que estaba mal era que el
  // tope (60) no alcanzaba ni para un lote de ingesta (250), así que botaba en CADA lote, en silencio.
  // El recorte se prueba con la misma expresión que corre en el stream, sobre datos plantados.
  {
    // Se prueba la función REAL del fuente, no una copia: `recortarBandeja` es pura y de nivel módulo.
    const recortar = (feed, lote, tope) => recortarBandeja([...lote.slice().reverse(), ...feed], tope);
    const fac = (n, mia) => ({ id: "F" + n, esCliente: !!mia, cedente: mia ? "Cliente propio" : "Otro" });
    const lote = (desde, n, mias) => Array.from({ length: n }, (_, i) => fac(desde + i, i < mias));

    // (a) LA VENTANA ES UNA VENTANA: lo nuevo entra adelante y lo viejo sale por atrás, y el orden de
    //     llegada se conserva (la bandeja se lee de lo más nuevo a lo más viejo).
    const r1 = recortar(lote(1, 3, 0), lote(10, 2, 0), 4);
    const ventanaOk = r1.lista.length === 4 && r1.fuera === 1
      && r1.lista.map((f) => f.id).join(",") === "F11,F10,F1,F2"   // el lote entra invertido, al frente
      && !r1.lista.some((f) => f.id === "F3");                     // la más antigua salió

    // (b) EL DEFECTO: con el tope bajo el lote, recorta SIEMPRE. Con el tope de hoy, un lote entero cabe.
    const base = (typeof CFG_OPER_BASE !== "undefined") ? CFG_OPER_BASE : null;
    const tope = base ? base.topeBandeja : null, loteN = base ? base.loteStream : null;
    const chico = recortar([], lote(1, loteN || 250, 0), 60);
    const holgadoOk = !!base && tope >= loteN                       // la perilla alcanza para un lote
      && recortar([], lote(1, loteN, 0), tope).fuera === 0          // y con ella un lote no bota nada
      && chico.fuera === (loteN - 60)                               // con el tope viejo botaba 190 de 250
      && base.topeDocsCorrida === undefined;                        // el nombre viejo no vuelve

    // (c) LO QUE SALE SE CUENTA, y contar es lo único que permite decirlo. Sin recorte, cero.
    const contarOk = recortar([], lote(1, 10, 0), 100).fuera === 0
      && recortar(lote(1, 90, 0), lote(100, 30, 0), 100).fuera === 20;

    // (d) LO QUE SALE PRIMERO ES LO QUE NO ES DE NADIE. Es la decisión de la regla 40 y la razón por la
    //     que el contador dejó de bajar solo: una factura de la cartera sale únicamente cuando ya no
    //     queda otra cosa que botar. Se mide en el caso peor: un lote entero contra un tope chico.
    const mias = (l) => l.filter((f) => f.esCliente).length;
    const conLote = lote(1, 250, 40);
    const apretado = recortarBandeja([...conLote].reverse(), 60);
    const holgura  = recortarBandeja([...conLote].reverse(), 100);
    const prioridadOk = mias(holgura.lista) === 40 && holgura.fueraConDueno === 0   // caben las 40: no sale ninguna
      && holgura.fuera === 150 && holgura.lista.length === 100
      && mias(apretado.lista) === 40 && apretado.fueraConDueno === 0                // 40 ≤ 60: tampoco
      && apretado.lista.length === 60;
    // Y cuando NI ASÍ alcanza, salen de la cartera pero contadas: es lo que el aviso muestra en rojo.
    const extremo = recortarBandeja([...lote(1, 250, 40)].reverse(), 25);
    const extremoOk = extremo.lista.length === 25 && extremo.fueraConDueno === 15 && mias(extremo.lista) === 25;
    // Contra el criterio viejo —`slice(0, tope)`, por el final y sin mirar de quién era— de las 40
    // sobrevivían 0. Se compara sobre la lista COMO LLEGA al recorte: el lote se antepone INVERTIDO,
    // así que las primeras del lote quedan al final de la bandeja y son justo las que el corte se lleva.
    const comoLlega = [...conLote].reverse();
    const viejoQueda = mias(comoLlega.slice(0, 60));
    const danoOk = prioridadOk && extremoOk && viejoQueda === 0;

    ok("142 la Bandeja Inbound es una ventana con tope: lo nuevo entra adelante, sale primero lo que no es de nadie, y lo que sale se cuenta",
       ventanaOk && holgadoOk && contarOk && danoOk,
       `ventana ${ventanaOk} (${r1.lista.map((f) => f.id).join(",")}, fuera ${r1.fuera}) \u00b7 la perilla alcanza para un lote ${holgadoOk} (topeBandeja ${tope} \u2265 loteStream ${loteN}; con el tope viejo 60 botaba ${chico.fuera} de ${loteN}) \u00b7 lo que sale se cuenta ${contarOk} \u00b7 sale primero lo que no es de nadie ${danoOk} (de 40 de cartera en un lote de 250: con tope 100 quedan ${mias(holgura.lista)} y salen ${holgura.fueraConDueno} de cartera; con tope 25 quedan ${mias(extremo.lista)} y salen ${extremo.fueraConDueno} contadas; el criterio viejo dejaba ${viejoQueda})`);
  }

  // ── 143 · TENER ÁREA NO BASTA: SI NADIE PUEDE FIRMAR LA EXCEPCIÓN, LA REGLA TAMPOCO SE EJECUTA ──
  // Ampliación de la regla 35 pedida por el usuario el 18-09-2026: «si la regla especifica que es
  // excepcionable debe gatillar el mensaje que está mal definido». El ruteo es el par (ÁREA, NIVEL) y lo
  // que la operación necesita es una PERSONA al otro lado: da igual si falta el área, si el área no
  // existe en el tenant o si existe y nadie la tiene en ese nivel —las tres dejan la excepción sin
  // destinatario y la operación pegada esperando a alguien que no existe—. Antes sólo la primera paraba
  // la regla; las otras dos se evaluaban igual y salían con «Sin aprobador definido».
  {
    const tramos = [[(v) => v.x > 90, "excepcion", 5], [() => true, "aprobado"]];
    const vars = { x: 100 };
    // Un padrón INVENTADO, como el del caso 44: así el caso mide la compuerta y no el tenant de la demo.
    const rico = {
      areas: [{ id: "contraloria", label: "Contraloría" }],
      usuarios: [],
      cargos: [{ id: "contralor", rol: "Contralor", area: "contraloria", nivel: 5 }],
    };
    const pobre = { areas: [{ id: "contraloria", label: "Contraloría" }], usuarios: [], cargos: [] };
    const regla = { n: 9101, area: "contraloria", nombre: "Plantada con área y sin nadie", cond: "C9101", hallazgo: "h", tiers: tramos };
    const otraArea = { n: 9102, area: "area_que_no_existe", nombre: "Plantada con área inexistente", cond: "C9102", tiers: tramos };
    const ko = { n: 9103, area: "contraloria", nombre: "Knock out sin aprobador", cond: "C9103", tiers: [[(v) => v.x > 50, "rechazado"], [() => true, "aprobado"]] };

    // (a) LA MISMA REGLA, EL MISMO TENANT: lo único que cambia es el padrón. Con el cargo, se ejecuta;
    //     sin él, no. Es la prueba de que la compuerta juzga el RUTEO y no el texto de la regla.
    const gRico = reglaNoEjecutable(regla, rico), gPobre = reglaNoEjecutable(regla, pobre);
    const padronMandaOk = gRico.noEjecutable === false && gPobre.noEjecutable === true
      && gPobre.causa === "sin_usuario" && !!gPobre.motivo && !!gPobre.arregla
      && /Usuarios/.test(gPobre.arregla)                        // manda al mantenedor correcto
      // Y SIN PADRÓN FALLA CERRADO: quien olvide inyectarlo ve la regla marcada, no aprobada en silencio.
      && reglaNoEjecutable(regla).noEjecutable === true && reglaNoEjecutable(regla).causa === "sin_padron"
      && evalReglaCli(regla, vars).disp === "no_ejecutada";
    // (b) LAS TRES CAUSAS SE DISTINGUEN, porque se arreglan en tres mantenedores distintos.
    const gSinArea = reglaNoEjecutable({ n: 9104, nombre: "s/área", tiers: tramos }, rico);
    const gInexist = reglaNoEjecutable(otraArea, rico);
    const causasOk = gSinArea.causa === "sin_area" && gInexist.causa === "area_inexistente"
      && /Áreas/.test(gInexist.arregla) && gInexist.noEjecutable === true
      && gSinArea.arregla !== gInexist.arregla && gInexist.arregla !== gPobre.arregla;
    // (c) EL KNOCK OUT SIGUE EJECUTÁNDOSE, también con el padrón vacío: no se aprueba, no necesita a
    //     nadie. Es la corrección del usuario del mismo día, y no se pierde al ampliar la regla.
    const koOk = reglaNoEjecutable(ko, pobre).noEjecutable === false
      && evalReglaCli(ko, vars, pobre).disp === "rechazado"
      && evalReglaCli(ko, { x: 10 }, pobre).disp === "aprobado";
    // (d) SE PRUEBAN TODOS LOS TRAMOS, no el primero: el que dispara puede ser cualquiera. Acá el N5 no
    //     tiene a nadie y el N1 sí, y la regla queda igual sin ejecutar.
    const medio = { n: 9105, area: "contraloria", nombre: "Dos tramos", cond: "C9105",
                    tiers: [[(v) => v.x > 900, "excepcion", 1], [(v) => v.x > 90, "excepcion", 5], [() => true, "aprobado"]] };
    const soloN1 = { areas: rico.areas, usuarios: [], cargos: [{ id: "c1", rol: "Analista", area: "contraloria", nivel: 1 }] };
    const todosLosTramosOk = reglaNoEjecutable(medio, soloN1).noEjecutable === true
      && reglaNoEjecutable(medio, rico).noEjecutable === false;   // con N5 cubierto, el N1 escala y pasa
    // (e) EL MOTOR LO RESPETA en las dos direcciones, incluso cuando el tramo que calzaría es `aprobado`:
    //     no se trata de qué habría dicho, sino de que nadie la evaluó.
    const motorOk = evalReglaCli(regla, vars, pobre).disp === "no_ejecutada"
      && evalReglaCli(regla, vars, rico).disp === "excepcion"
      && evalReglaCli(regla, vars, rico).nivel === 5
      && evalReglaCli(regla, { x: 10 }, pobre).disp === "no_ejecutada"
      && evalReglaCli(regla, { x: 10 }, rico).disp === "aprobado";
    // (f) Y LLEGA HASTA EL VEREDICTO DE LA OPERACIÓN por el camino real —`evaluarOtorgItems` arma el
    //     padrón del tenant y lo inyecta—: se planta una regla con un área que SÍ existe en la demo
    //     (`verificacion`) y que NADIE tiene, y tiene que salir en `noEjec` sin entrar en exc ni rech.
    const areaRealSinNadie = { n: 9106, area: "verificacion", nombre: "Área real sin nadie", cond: "C9106", hallazgo: "h", tiers: tramos };
    const deal = { id: "OP-R35B", stage: "oferta", cliente: "Cliente 35B", rutEmisor: "76000001-1", monto: 30e6 };
    const vAntes = visadoDealCalc(deal, {});
    REGLAS_CLIENTE.push(areaRealSinNadie);
    let vDespues = null, err = null;
    try { VISADO_CACHE.clear(); vDespues = visadoDealCalc(deal, {}); }
    catch (e) { err = e.message; }
    finally { REGLAS_CLIENTE.pop(); VISADO_CACHE.clear(); }
    const mia = vDespues && (vDespues.noEjec || []).find((x) => x.n === 9106);
    const veredictoOk = !err && !!mia && /verificación|Verificación/i.test(mia.motivo || "")
      && !(vDespues.exc || []).some((x) => x.n === 9106)
      && !(vDespues.rech || []).some((x) => x.n === 9106)
      && vDespues.estado === vAntes.estado;                       // no bloquea: lo que protege es que se vea
    // (g) HOY NINGUNA DEL CATÁLOGO CAE ACÁ, y se mide: las 69 con excepción tienen a quién pedírsela en
    //     este tenant. Si mañana alguien borra un área o se queda sin gente en un nivel, esto se rompe —y
    //     romperse es el punto: significa que la demo está mostrando reglas que no se ejecutan.
    const padReal = padronAprobadores();
    const malasReales = REGLAS_CLIENTE.filter((rg) => reglaNoEjecutable(rg, padReal).noEjecutable);
    const catalogoOk = malasReales.length === 0 && (vAntes.noEjec || []).length === 0
      && !REGLAS_CLIENTE.some((rg) => rg.n === 9106);             // y el catálogo quedó como estaba

    ok("143 una regla excepcionable sin nadie que pueda firmar tampoco se ejecuta, y la causa dice en qué mantenedor se arregla",
       padronMandaOk && causasOk && koOk && todosLosTramosOk && motorOk && veredictoOk && catalogoOk,
       `el padrón manda ${padronMandaOk} (mismo criterio: con cargo se ejecuta, sin cargo no) · tres causas ${causasOk} (${gSinArea.causa} · ${gInexist.causa} · ${gPobre.causa}) · el knock out se ejecuta igual ${koOk} · mira todos los tramos ${todosLosTramosOk} · el motor lo respeta ${motorOk} · veredicto ${veredictoOk} («${mia && mia.motivo}» · estado «${vDespues && vDespues.estado}» = «${vAntes.estado}») · el catálogo real no tiene ninguna ${catalogoOk} (${malasReales.length} de ${REGLAS_CLIENTE.length})${err ? " · ERROR " + err : ""}`);
  }

  // ── 152 · LA IDENTIDAD DE LA SESIÓN ES UNA SOLA ────────────────────────────────────
  // El selector de usuario de la demo movía sólo el estado de React y los permisos preguntan por
  // `SESION.usuario`: la pantalla mostraba a Camila Soto y el permiso seguía preguntando por quién
  // había hecho login, así que la mesa le decía «sólo el Ejecutivo de verificación puede marcarla» a la
  // Ejecutiva de verificación. El caso mide las DOS mitades: que la identidad cambie y que los relojes
  // de la sesión no se reinicien —cambiar de persona no puede regalar ocho horas de sesión—.
  {
    const previa = typeof SESION !== "undefined" ? SESION : null;
    let r = {};
    try {
      abrirSesion("CR", "prueba");
      const t0 = { expira: SESION.expira, iniciada: SESION.iniciada, tenant: SESION.tenant };
      const antesPuede = puedeVerificarFacturas(SESION.usuario);
      suplantarSesion("EV");
      r.tras = { u: SESION.usuario, puede: puedeVerificarFacturas(SESION.usuario), relojes: SESION.expira === t0.expira && SESION.iniciada === t0.iniciada && SESION.tenant === t0.tenant, suplantado: SESION.suplantado === true };
      suplantarSesion("CR");
      r.vuelta = { u: SESION.usuario, puede: puedeVerificarFacturas(SESION.usuario) };
      // No-ops: el mismo código, un código vacío y sin sesión no rompen ni inventan identidad.
      const mismo = suplantarSesion("CR");
      r.noop = mismo.usuario === "CR" && suplantarSesion("").usuario === "CR" && suplantarSesion(null).usuario === "CR";
      r.antesPuede = antesPuede;
      // Y el rol se lee de la identidad de la SESIÓN, no del código que la pantalla esté mostrando.
      r.rol = rolLabel("EV");
    } catch (e) {
      r.err = e.message;
    } finally {
      SESION = previa;
    }
    ok("152 cambiar de usuario cambia la IDENTIDAD de la sesión, no sólo el rótulo, y no reinicia sus relojes",
       r.antesPuede === false && r.tras && r.tras.u === "EV" && r.tras.puede === true && r.tras.relojes === true && r.tras.suplantado === true
       && r.vuelta && r.vuelta.u === "CR" && r.vuelta.puede === false && r.noop === true && !r.err
       && typeof SESION !== "undefined" && SESION === previa,
       `CR no puede (${r.antesPuede}) → EV «${r.tras && r.tras.u}» puede ${r.tras && r.tras.puede} (${r.rol}), relojes intactos ${r.tras && r.tras.relojes} · de vuelta a «${r.vuelta && r.vuelta.u}» puede ${r.vuelta && r.vuelta.puede} · no-ops ${r.noop} · sesión restaurada${r.err ? " · ERROR " + r.err : ""}`);
  }

  // ── 153 · EL ATAJO DEL OTORGAMIENTO AUTOMÁTICO NO PASA POR ENCIMA DEL VISADO (OTG-02) ───────
  // `requiereOtorgamiento` nació antes del motor de reglas: mira si hay deudores «Otro» y si se supera
  // la línea, y nada más. Una operación de puros deudores Prime y dentro de línea puede tener decenas
  // de criterios del CLIENTE esperando excepción —el usuario la vio: cartel verde de «otorgamiento
  // automático, sin intervención de un especialista» con «Criterios por aprobar 38» al lado—, y con
  // `otorgAuto` la operación avanzaba a «Pendiente Integración» sin que nadie los mirara.
  {
    const deal153 = { id: "T-153", rutEmisor: "76.111.111-1", cliente: "Cliente de prueba", monto: 30 * MMF,
                      stage: "otorgamiento", facturasOp: [fac("w1", LB[3], 30)], aceptada: true, firmada: true,
                      clienteAcepto: true, otorgAuto: true, otorgMotivo: "automatico" };
    const sinVisar = { visado: {} };
    const v0 = visadoDeal(deal153, sinVisar);
    const todoAprobado = {};
    v0.exc.forEach((e) => { todoAprobado[e.stKey] = "aprobado"; });
    const visado = { visado: todoAprobado };
    const manual = { ...deal153, otorgAuto: false, otorgMotivo: "otros" };
    // (a) El fixture tiene de verdad criterios por resolver y no está bloqueado por un knock out: sin
    //     esto el caso pasaría por vacuidad el día que el catálogo deje de gatillar excepciones acá.
    const fixtureOk = v0.exc.length > 0 && v0.excPend.length === v0.exc.length && otorgBloqueado(deal153, sinVisar) === false;
    // (b) EL ATAJO NO ESTÁ VIGENTE con criterios pendientes, y sí lo está cuando no queda ninguno.
    const vigenteOk = otorgAutoVigente(deal153, sinVisar) === false
      && otorgAutoVigente(deal153, visado) === true
      && otorgAutoVigente(manual, visado) === false          // sin `otorgAuto` no hay atajo que valga
      && otorgAutoVigente(null, visado) === false;
    // (c) OTG-02, que es lo que estaba roto: no se completa el otorgamiento con excepciones pendientes,
    //     TAMPOCO por el atajo. Las dos direcciones, que es lo que un control exige (VER-01 falló años
    //     por mirarse en una sola).
    const otg02Ok = otorgamientoCompleto(deal153, sinVisar) === false
      && otorgamientoCompleto(deal153, visado) === true
      && otorgamientoCompleto(manual, sinVisar) === false
      && otorgamientoCompleto(manual, visado) === true;
    // (d) Y lo que el atajo SÍ significa no se perdió: una operación automática con el visado limpio no
    //     necesita que nadie apruebe excepciones —la manual sí las necesita aprobadas, y es la misma
    //     respuesta porque `todoAprobado` las aprobó—.
    const sentidoOk = otorgAutoVigente({ ...deal153, stage: "cesion" }, visado) === true
      && otorgamientoCompleto({ ...deal153, stage: "cesion" }, visado) === false; // fuera de Otorgamiento no se completa
    ok("153 el otorgamiento automático no se salta el visado: con criterios por aprobar no está vigente ni completa la operación (OTG-02)",
       fixtureOk && vigenteOk && otg02Ok && sentidoOk,
       `fixture ${fixtureOk} (${v0.exc.length} excepciones, ${v0.excPend.length} pendientes) · atajo vigente ${vigenteOk} (sin visar ${otorgAutoVigente(deal153, sinVisar)} · visado ${otorgAutoVigente(deal153, visado)}) · OTG-02 ${otg02Ok} (auto sin visar ${otorgamientoCompleto(deal153, sinVisar)} · auto visado ${otorgamientoCompleto(deal153, visado)} · manual sin visar ${otorgamientoCompleto(manual, sinVisar)}) · sentido ${sentidoOk}`);
  }

  console.log(out.join("\n"));
  console.log("\n" + out.filter((x) => x.startsWith("PASA")).length + " de " + out.length + " pasan.");
  return out;
})();
