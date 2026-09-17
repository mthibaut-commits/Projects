/* CRY-01 · LÍMITE DE INTENTOS del OTP. Vive sólo en `LoginScreen` (estado de React: `otpIntentos` contra
   `AUTH_OTP_MAX = 3`), así que ninguna función pura lo sostiene y se gatea en la pantalla. Dos direcciones:
   (−) tres códigos incorrectos devuelven a credenciales con «Demasiados intentos» —el paso 2FA desaparece—,
       y en cada fallo intermedio el código ROTA (se emite uno nuevo y la pantalla lo dice);
   (+) un fallo por debajo del límite NO expulsa: el código nuevo que se muestra entra a la app. */
const CASILLAS = 'input[aria-label^="Dígito"]';
const leerCodigo = (p) => p.evaluate(() => (document.body.innerText.match(/el código enviado es\s*(\d{4,8})/) || [])[1] || "");
const equivocado = (c) => c.slice(0, -1) + String((Number(c.slice(-1)) + 1) % 10);
async function escribir(p, code) { const cas = p.locator(CASILLAS); for (let i = 0; i < code.length; i++) await cas.nth(i).fill(code[i]); }
async function alLogin(p) {
  if (/Gestión diaria/.test(await p.evaluate(() => document.body.innerText || ""))) await p.locator('button[title="Cerrar sesión"]').first().click();
  await p.waitForFunction(() => /Bienvenido/.test(document.body.innerText || ""), null, { timeout: 60000 });
}
async function alOtp(p) {
  await p.getByRole("button", { name: "Ingresar", exact: true }).click();
  await p.waitForFunction(() => /el código enviado es\s*\d{6}/.test(document.body.innerText || ""), null, { timeout: 60000 });
  const c = await leerCodigo(p);
  if (!/^\d{6}$/.test(c)) throw new Error("no pude leer el código 2FA de la pantalla");
  return c;
}
export const casos = [
  { id: "e2e-CRY-01-limite", titulo: "CRY-01 · tres códigos incorrectos devuelven a credenciales (AUTH_OTP_MAX) y cada fallo rota el código",
    correr: async (h) => {
      const p = h.pagina;
      await alLogin(p);
      const c1 = await alOtp(p);
      const codigos = [c1];
      for (let intento = 1; intento <= 3; intento++) {
        const actual = codigos[codigos.length - 1];
        await escribir(p, equivocado(actual));
        await p.getByRole("button", { name: "Verificar y entrar" }).click();
        if (intento < 3) {
          await p.waitForFunction((prev) => { const m = (document.body.innerText || "").match(/el código enviado es\s*(\d{6})/); return !!m && m[1] !== prev; }, actual, { timeout: 20000 });
          const t = await h.texto(p);
          if (!/código nuevo/i.test(t)) throw new Error(`tras el fallo ${intento} la pantalla no avisa del código nuevo`);
          if (/Demasiados intentos/.test(t)) throw new Error(`expulsado en el fallo ${intento}, antes del límite`);
          codigos.push(await leerCodigo(p));
        } else {
          await p.waitForFunction(() => /Demasiados intentos/.test(document.body.innerText || ""), null, { timeout: 20000 });
        }
      }
      const t = await h.texto(p);
      const enCred = (await p.getByRole("button", { name: "Ingresar", exact: true }).count()) > 0 && (await p.locator(CASILLAS).count()) === 0 && /Bienvenido/.test(t);
      if (!enCred) throw new Error("tras 3 fallos no volvió al paso de credenciales");
      if (/Gestión diaria/.test(t)) throw new Error("entró a la app con códigos incorrectos");
      const rotan = new Set(codigos).size === codigos.length;
      if (!rotan) throw new Error("el código no rotó entre fallos: " + codigos.join(","));
      return `3 fallos → «Demasiados intentos» y de vuelta a credenciales · códigos distintos en cada intento ${codigos.length} · sin entrar`;
    } },
  { id: "e2e-CRY-01-bajo-limite", titulo: "CRY-01 · un fallo bajo el límite no expulsa: el código nuevo que se emite entra a la app",
    correr: async (h) => {
      const p = h.pagina;
      await alLogin(p);
      const c1 = await alOtp(p);
      await escribir(p, equivocado(c1));
      await p.getByRole("button", { name: "Verificar y entrar" }).click();
      await p.waitForFunction((prev) => { const m = (document.body.innerText || "").match(/el código enviado es\s*(\d{6})/); return !!m && m[1] !== prev; }, c1, { timeout: 20000 });
      const c2 = await leerCodigo(p);
      // el código ANTERIOR ya no sirve: se escribe c1 (rotado) y sigue sin entrar
      await escribir(p, c1);
      await p.getByRole("button", { name: "Verificar y entrar" }).click();
      await p.waitForFunction((prev) => { const m = (document.body.innerText || "").match(/el código enviado es\s*(\d{6})/); return !!m && m[1] !== prev; }, c2, { timeout: 20000 });
      if (/Gestión diaria/.test(await h.texto(p))) throw new Error("un código rotado entró a la app");
      const c3 = await leerCodigo(p);
      await escribir(p, c3);
      await p.getByRole("button", { name: "Verificar y entrar" }).click();
      await p.waitForFunction(() => /Gestión diaria/.test(document.body.innerText || ""), null, { timeout: 60000 });
      return `fallo 1 rota el código (${c1 !== c2}) · el rotado no entra · el vigente entra a «Gestión diaria» en el intento 3 de ${3}`;
    } },
];
