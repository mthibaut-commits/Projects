/* CRY-01 · El hash del OTP no sale del servidor — la parte de la regla que es una PROPIEDAD DEL TEXTO, en dos
   archivos que tienen que decir lo mismo: el fuente (`emitirOtp`/`validarOtp`/`cursePersist`) y el portal
   `curse.html`, que valida en OTRA página recalculando el hash. Gates:
   1. `validarOtp` compara con `igualConstante(...)` y recalcula `await otpHash(...)`; nunca `r.hash ===`/`!==`.
   2. El registro que `emitirOtp` deja en `OTP_STORE[neg]` lleva `sal` y `hash: await otpHash(neg, sal, code)`,
      y NO guarda `code` como valor.
   3. Todo `cursePersist(...)` del fuente persiste `otpHash:` y `otpSal:`, y ninguno lleva `otp:`, `otpClaro` ni
      `code` en claro.
   4. El portal recalcula con el MISMO preimage (`"otp$"+neg+"$"+sal+"$"+code`) y compara con `igualConstante`;
      nunca lee un `st.otp` en claro; y su `CURSE_SCHEMA` es el `SCHEMA_VERSION.curse` del fuente (v3: si uno
      sube y el otro no, el portal descarta TODOS los enlaces).
   5. `INVARIANTES` declara CRY-01 sobre `otp.emitir` y `otp.validar`.
   Sonda negativa: cada gate se planta roto sobre una copia del texto y el detector lo caza. */
import test from "node:test";
import assert from "node:assert/strict";
import { leer } from "./_comun.mjs";

const jsx = leer("pipeline_comercial.jsx");
const portal = leer("curse.html");

const cuerpo = (src, cabecera) => {
  const i = src.indexOf(cabecera);
  if (i < 0) return null;
  const fin = src.indexOf("\n}\n", i);
  return fin < 0 ? null : src.slice(i, fin + 2);
};
const preimage = (src, re) => { const m = src.match(re); return m ? m[1].replace(/\s+/g, "") : null; };

export function fallosCRY01(jsx, portal) {
  const f = [];
  // 1 · validarOtp
  const val = cuerpo(jsx, "async function validarOtp(");
  if (!val) f.push("no encuentro `async function validarOtp(`");
  else {
    if (!/igualConstante\(\s*r\.hash\s*,\s*await otpHash\(/.test(val)) f.push("validarOtp no compara `r.hash` con `await otpHash(...)` vía igualConstante");
    if (/r\.hash\s*[!=]==?/.test(val) || /[!=]==?\s*r\.hash/.test(val)) f.push("validarOtp compara el hash con ===/!==: no es tiempo constante");
    if (!/Date\.now\(\)\s*>\s*r\.exp/.test(val)) f.push("validarOtp no vence por TTL (`Date.now() > r.exp`)");
    if (!/if\s*\(\s*r\.usado\s*\)/.test(val) || !/r\.usado\s*=\s*true/.test(val)) f.push("validarOtp no es de un solo uso (mira y marca `r.usado`)");
  }
  // 2 · emitirOtp
  const emi = cuerpo(jsx, "async function emitirOtp(");
  if (!emi) f.push("no encuentro `async function emitirOtp(`");
  else {
    const m = emi.match(/OTP_STORE\[neg\]\s*=\s*\{([^}]*)\}/);
    if (!m) f.push("emitirOtp no escribe `OTP_STORE[neg] = {…}`");
    else {
      const reg = m[1];
      if (!/hash:\s*await otpHash\(neg,\s*sal,\s*code\)/.test(reg)) f.push("el registro no lleva `hash: await otpHash(neg, sal, code)`");
      if (!/\bsal\b/.test(reg)) f.push("el registro no lleva la sal");
      const sinHash = reg.replace(/otpHash\([^)]*\)/g, "");
      if (/\bcode\b/.test(sinHash)) f.push("el registro de OTP_STORE guarda el código en claro");
    }
    if (!/const sal = salAleatoria\(\)/.test(emi)) f.push("emitirOtp no genera una sal por emisión (`salAleatoria()`)");
  }
  // 3 · cursePersist call sites
  const llamadas = [...jsx.matchAll(/cursePersist\(\s*neg\s*,\s*\{([^}]*)\}/g)].map((m) => m[1]);
  if (llamadas.length < 2) f.push(`se esperaban ≥2 llamadas a cursePersist(neg, {…}); hay ${llamadas.length}`);
  llamadas.forEach((l, i) => {
    if (!/otpHash:/.test(l) || !/otpSal:/.test(l)) f.push(`cursePersist #${i + 1} no persiste otpHash y otpSal`);
    if (/\botp:/.test(l) || /otpClaro/.test(l) || /\bcode\b/.test(l)) f.push(`cursePersist #${i + 1} persiste el OTP en claro`);
  });
  // 4 · el portal
  const pApp = preimage(jsx, /const otpHash = \(neg, sal, code\) => sha256Hex\(([^)]*)\)/);
  const pPortal = preimage(portal, /function otpHash\(neg,sal,code\)\{return sha256Hex\(([^)]*)\)/);
  if (!pApp || !pPortal) f.push("no encuentro el preimage de otpHash en el fuente o en el portal");
  else if (pApp !== pPortal) f.push(`el preimage del portal (${pPortal}) no es el del fuente (${pApp}): ningún OTP validaría`);
  if (!/igualConstante\(calc,\s*st\.otpHash\)/.test(portal)) f.push("el portal no compara el hash recalculado con igualConstante");
  if (!/otpHash\(neg,\s*st\.otpSal,\s*code\)/.test(portal)) f.push("el portal no recalcula el hash con la sal persistida");
  if (/\bst\.otp\b(?!Hash|Sal|Exp|Usado|Alg)/.test(portal)) f.push("el portal lee un `st.otp` en claro");
  const vApp = (jsx.match(/^\s*curse:\s*(\d+),/m) || [])[1], vPortal = (portal.match(/var CURSE_SCHEMA\s*=\s*(\d+)/) || [])[1];
  if (!vApp || !vPortal) f.push("no encuentro SCHEMA_VERSION.curse o CURSE_SCHEMA");
  else if (vApp !== vPortal) f.push(`SCHEMA_VERSION.curse=${vApp} y CURSE_SCHEMA=${vPortal} difieren: el portal descarta todo registro`);
  if (!/if\s*\(\s*v\s*!==\s*CURSE_SCHEMA\s*\)/.test(portal)) f.push("el portal no descarta un registro de esquema distinto (v1 con OTP en claro, v2 con hash de 32 bits)");
  // 5 · contrato
  const inv = cuerpo(jsx, '  { codigo: "CRY-01"') || (jsx.match(/\{ codigo: "CRY-01"[\s\S]*?\},\n/) || [])[0];
  if (!inv || !/mutaciones:\s*\["otp\.emitir",\s*"otp\.validar"\]/.test(inv)) f.push("INVARIANTES no declara CRY-01 sobre otp.emitir y otp.validar");
  return f;
}

test("CRY-01 · el fuente hashea con sal, compara en tiempo constante y persiste sólo el hash; el portal recalcula lo mismo", () => {
  assert.deepEqual(fallosCRY01(jsx, portal), []);
});

test("CRY-01 · sonda negativa: cada gate cae si se planta la violación", () => {
  const val = cuerpo(jsx, "async function validarOtp(");
  const s1 = jsx.replace(val, val.replace(/!igualConstante\(r\.hash,\s*await otpHash\(([^)]*)\)\)/, "r.hash !== await otpHash($1)"));
  assert.ok(s1 !== jsx && fallosCRY01(s1, portal).some((x) => /===\/!==|igualConstante/.test(x)), "comparar con !== tiene que caer");
  const s2 = jsx.replace(/OTP_STORE\[neg\] = \{ alg: HASH_ALG, sal,/, "OTP_STORE[neg] = { alg: HASH_ALG, sal, code,");
  assert.ok(s2 !== jsx && fallosCRY01(s2, portal).some((x) => /código en claro/.test(x)), "guardar `code` en el registro tiene que caer");
  const s3 = jsx.replace(/cursePersist\(neg, \{ neg, otpHash: otpReg\.hash,/, "cursePersist(neg, { neg, otp: otpClaro, otpHash: otpReg.hash,");
  assert.ok(s3 !== jsx && fallosCRY01(s3, portal).some((x) => /persiste el OTP en claro/.test(x)), "persistir el OTP en claro tiene que caer");
  const p4 = portal.replace('sha256Hex("otp$"+neg+"$"+sal+"$"+code)', 'sha256Hex("otp#"+neg+"$"+sal+"$"+code)');
  assert.ok(p4 !== portal && fallosCRY01(jsx, p4).some((x) => /preimage/.test(x)), "un preimage distinto en el portal tiene que caer");
  const p5 = portal.replace(/var CURSE_SCHEMA=3;/, "var CURSE_SCHEMA=4;");
  assert.ok(p5 !== portal && fallosCRY01(jsx, p5).some((x) => /difieren/.test(x)), "un esquema distinto entre app y portal tiene que caer");
  const p6 = portal.replace(/igualConstante\(calc,st\.otpHash\)/, "(calc===st.otpHash)");
  assert.ok(p6 !== portal && fallosCRY01(jsx, p6).some((x) => /igualConstante/.test(x)), "el portal comparando con === tiene que caer");
  const s7 = jsx.replace(/if \(Date\.now\(\) > r\.exp\) return \{ ok: false, error: "El código expiró" \};\n/, "");
  assert.ok(s7 !== jsx && fallosCRY01(s7, portal).some((x) => /TTL/.test(x)), "quitar el TTL tiene que caer");
});
