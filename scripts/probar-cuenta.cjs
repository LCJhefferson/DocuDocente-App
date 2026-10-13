/* global __dirname */
// Ejecutar: node scripts/probar-cuenta.cjs. Sin celular ni envíos reales.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { transformSync } = require('esbuild');
const root = path.resolve(__dirname, '..');
function cargar(ruta, mocks = {}) {
  const codigo = transformSync(fs.readFileSync(path.join(root, ruta), 'utf8'), { loader: 'ts', format: 'cjs' }).code;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', codigo)(id => {
    if (!(id in mocks)) throw new Error('Dependencia no simulada: ' + id);
    return mocks[id];
  }, modulo, modulo.exports);
  return modulo.exports;
}
const v = cargar('src/utils/validaciones.ts');
const pruebas = [];
const prueba = (nombre, fn) => pruebas.push([nombre, fn]);
const datos = { nombreCompleto: 'María O’Connor-Pérez', gradoAcademico: 'Mg.', facultad: 'FISME', correoElectronico: ' Docente@Ejemplo.com ', contrasena: 'Docente123', departamento: '', codigoInstitucional: 'ABC-123' };
function entorno() {
  const cuentas = [];
  let perfilFalla = false, envioFalla = false, enviados = 0, codigo = '123456';
  const esquema = { id: 'id', correoElectronico: 'correoElectronico' };
  const coincide = (c, f) => c[f.campo] === f.valor;
  const db = {
    select: () => ({ from: () => ({ where: async f => cuentas.filter(c => coincide(c,f)) }) }),
    insert: () => ({ values: async c => { if (cuentas.some(x => x.correoElectronico === c.correoElectronico)) throw new Error('duplicado'); cuentas.push(c); } }),
    update: () => ({ set: valores => ({ where: async f => { for (const c of cuentas) if (coincide(c,f)) Object.assign(c,valores); } }) }),
    delete: () => ({ where: async f => { const i = cuentas.findIndex(c => coincide(c,f)); if (i >= 0) cuentas.splice(i,1); } }),
  };
  const seguridad = { hashContrasena: async (correo, clave) => crypto.createHash('sha256').update(`${correo}:${clave}`).digest('hex'), esHash: x => /^[0-9a-f]{64}$/.test(x), generarCodigo: () => codigo };
  const { AuthService } = cargar('src/services/authService.ts', {
    'drizzle-orm': { eq: (campo, valor) => ({ campo, valor }) },
    'expo-secure-store': { setItemAsync: async () => {}, getItemAsync: async () => null, deleteItemAsync: async () => {} },
    'react-native-get-random-values': {}, uuid: { v4: () => crypto.randomUUID() },
    '../database/client': { db }, '../database/schema': { cuentasAutenticacion: esquema },
    '../utils/seguridad': seguridad, '../utils/validaciones': v,
    './correoService': { enviarCodigoRecuperacion: async () => { if (envioFalla) throw new Error('sin conexión'); enviados++; } },
    './perfilDocenteService': { PerfilDocenteService: { crearPerfil: async () => { if (perfilFalla) throw new Error('falló perfil'); } } },
  });
  return { auth: AuthService, cuentas, setPerfilFalla: x => perfilFalla=x, setEnvioFalla: x => envioFalla=x, setCodigo: x => codigo=x, get enviados() { return enviados; } };
}
prueba('correo válido, normalización y dominios inválidos', () => {
  assert.ok(v.esCorreoValido(' María@untrm.edu.pe '));
  for (const x of ['a..b@untrm.edu.pe','a@-dominio.com','a@dominio..com','a b@dominio.com','a@b','']) assert.equal(v.esCorreoValido(x),false,x);
});
prueba('contraseña: longitud, letras, números y espacios', () => {
  assert.equal(v.validarContrasena('Abcdef12'),null);
  assert.equal(v.validarContrasena('Contraseña12!'),null);
  for (const x of ['', 'Abcd123', '12345678', 'abcdefgh', ' Clave123', 'Clave 123', 'Clave123 ', 'a'.repeat(128)+'1']) assert.ok(v.validarContrasena(x));
});
prueba('nombres con tildes, apóstrofos y guiones; rechaza números y controles', () => {
  assert.equal(v.validarNombre(datos.nombreCompleto),null);
  for (const x of ['', '123', 'Pedro9', '---', 'Pedro\u0000']) assert.ok(v.validarNombre(x));
});
prueba('facultad obligatoria y límites de campos del registro', () => {
  assert.equal(v.validarPerfil(datos),null);
  assert.ok(v.validarPerfil({...datos,facultad:' '}));
  assert.ok(v.validarPerfil({...datos,codigoInstitucional:'a b'}));
  assert.ok(v.validarPerfil({...datos,departamento:'x'.repeat(201)}));
});
prueba('registro normaliza correo y guarda hash, no contraseña', async () => {
  const e=entorno(); await e.auth.registrarse(datos);
  assert.equal(e.cuentas[0].correoElectronico,'docente@ejemplo.com');
  assert.match(e.cuentas[0].contrasenaHash,/^[0-9a-f]{64}$/);
  assert.notEqual(e.cuentas[0].contrasenaHash,datos.contrasena);
});
prueba('registro rechaza correo duplicado sin distinguir mayúsculas', async () => {
  const e=entorno(); await e.auth.registrarse(datos);
  await assert.rejects(e.auth.registrarse({...datos,correoElectronico:'DOCENTE@ejemplo.com'}),/registrado/);
  assert.equal(e.cuentas.length,1);
});
prueba('servicio rechaza registro inválido antes de escribir', async () => {
  const e=entorno();
  for (const cambio of [{nombreCompleto:'123'},{facultad:''},{contrasena:'Clave123 '},{correoElectronico:'no-correo'}]) await assert.rejects(e.auth.registrarse({...datos,...cambio}));
  assert.equal(e.cuentas.length,0);
});
prueba('si falla el perfil se puede volver a registrar el mismo correo', async () => {
  const e=entorno(); e.setPerfilFalla(true);
  await assert.rejects(e.auth.registrarse(datos),/perfil/); assert.equal(e.cuentas.length,0);
  e.setPerfilFalla(false); await e.auth.registrarse(datos); assert.equal(e.cuentas.length,1);
});
prueba('recuperación bloquea correo inválido, inexistente y cuenta desactivada', async () => {
  const e=entorno(); await assert.rejects(e.auth.solicitarRecuperacion('mal')); await assert.rejects(e.auth.solicitarRecuperacion('nadie@ejemplo.com'));
  await e.auth.registrarse(datos); e.cuentas[0].esActivo=false; await assert.rejects(e.auth.solicitarRecuperacion('docente@ejemplo.com')); assert.equal(e.enviados,0);
});
prueba('código válido cambia contraseña y no puede reutilizarse', async () => {
  const e=entorno(); await e.auth.registrarse(datos); await e.auth.solicitarRecuperacion('docente@ejemplo.com');
  const anterior=e.cuentas[0].contrasenaHash;
  await e.auth.restablecerContrasena('docente@ejemplo.com','123456','NuevaClave123'); assert.notEqual(e.cuentas[0].contrasenaHash,anterior);
  await assert.rejects(e.auth.restablecerContrasena('docente@ejemplo.com','123456','OtraClave123'),/venció/);
});
prueba('rechaza código de letras o longitud incorrecta y contraseña débil', async () => {
  const e=entorno(); await e.auth.registrarse(datos); await e.auth.solicitarRecuperacion('docente@ejemplo.com');
  for (const c of ['abcdef','12345','1234567']) await assert.rejects(e.auth.restablecerContrasena('docente@ejemplo.com',c,'NuevaClave123'),/dígitos/);
  await assert.rejects(e.auth.restablecerContrasena('docente@ejemplo.com','123456','corta'),/caracteres/);
  await e.auth.restablecerContrasena('docente@ejemplo.com','123456','NuevaClave123');
});
prueba('cinco códigos incorrectos bloquean ese código', async () => {
  const e=entorno(); await e.auth.registrarse(datos); await e.auth.solicitarRecuperacion('docente@ejemplo.com');
  for (let i=0;i<5;i++) await assert.rejects(e.auth.restablecerContrasena('docente@ejemplo.com','999999','NuevaClave123'),/correcto/);
  await assert.rejects(e.auth.restablecerContrasena('docente@ejemplo.com','123456','NuevaClave123'),/intentos/);
});
prueba('código vence a los diez minutos exactos', async () => {
  const e=entorno(); const ahora=Date.now; let reloj=ahora(); Date.now=()=>reloj;
  try { await e.auth.registrarse(datos); await e.auth.solicitarRecuperacion('docente@ejemplo.com'); reloj+=600000; await assert.rejects(e.auth.restablecerContrasena('docente@ejemplo.com','123456','NuevaClave123'),/venció/); }
  finally { Date.now=ahora; }
});
prueba('reenvío espera un minuto e invalida el código anterior', async () => {
  const e=entorno(); const ahora=Date.now; let reloj=ahora(); Date.now=()=>reloj;
  try {
    await e.auth.registrarse(datos); await e.auth.solicitarRecuperacion('docente@ejemplo.com');
    await assert.rejects(e.auth.solicitarRecuperacion('docente@ejemplo.com'),/minuto/);
    reloj+=60000; e.setCodigo('654321'); await e.auth.solicitarRecuperacion('docente@ejemplo.com');
    await assert.rejects(e.auth.restablecerContrasena('docente@ejemplo.com','123456','NuevaClave123'),/correcto/);
    await e.auth.restablecerContrasena('docente@ejemplo.com','654321','NuevaClave123'); assert.equal(e.enviados,2);
  } finally { Date.now=ahora; }
});
prueba('error de envío permite reintentar y no crea código', async () => {
  const e=entorno(); await e.auth.registrarse(datos); e.setEnvioFalla(true);
  await assert.rejects(e.auth.solicitarRecuperacion('docente@ejemplo.com'),/conexión/);
  await assert.rejects(e.auth.restablecerContrasena('docente@ejemplo.com','123456','NuevaClave123'),/venció/);
  e.setEnvioFalla(false); await e.auth.solicitarRecuperacion('docente@ejemplo.com');
});
prueba('dos cambios simultáneos no reutilizan el mismo código', async () => {
  const e=entorno(); await e.auth.registrarse(datos); await e.auth.solicitarRecuperacion('docente@ejemplo.com');
  const resultados=await Promise.allSettled([e.auth.restablecerContrasena('docente@ejemplo.com','123456','NuevaClave123'),e.auth.restablecerContrasena('docente@ejemplo.com','123456','OtraClave123')]);
  assert.equal(resultados.filter(x=>x.status==='fulfilled').length,1);
});
prueba('EmailJS funciona sin .env y envía las variables del template', async () => {
  const original=global.fetch; let pedido;
  global.fetch=async (url, opts)=>{ pedido={url,opts}; return {ok:true,status:200}; };
  try {
    const {enviarCodigoRecuperacion}=cargar('src/services/correoService.ts');
    await enviarCodigoRecuperacion('prueba@ejemplo.com','123456',10);
    const body=JSON.parse(pedido.opts.body);
    assert.equal(body.service_id,'service_nb3wbpn'); assert.equal(body.template_id,'template_s82sv9m'); assert.equal(body.user_id,'5p7IY-8Ahf3bckbuv');
    assert.deepEqual(body.template_params,{to_email:'prueba@ejemplo.com',codigo:'123456',minutos:10});
  } finally { global.fetch=original; }
});
prueba('EmailJS informa límite de envíos, error HTTP y falta de conexión', async () => {
  const original=global.fetch; const {enviarCodigoRecuperacion:enviar}=cargar('src/services/correoService.ts');
  try {
    global.fetch=async()=>({ok:false,status:429}); await assert.rejects(enviar('a@b.com','123456',10),/límite/);
    global.fetch=async()=>({ok:false,status:400}); await assert.rejects(enviar('a@b.com','123456',10),/configuración/);
    global.fetch=async()=>{throw new TypeError('Network request failed');}; await assert.rejects(enviar('a@b.com','123456',10),/conexión/);
    global.fetch=async()=>{const e=new Error('abort');e.name='AbortError';throw e;}; await assert.rejects(enviar('a@b.com','123456',10),/tardó/);
  } finally {global.fetch=original;}
});
(async()=>{ let fallos=0; for(const [nombre, fn] of pruebas){try{await fn(); console.log('OK '+nombre);}catch(e){fallos++;console.error('FALLO '+nombre,e);}} console.log(`${pruebas.length-fallos}/${pruebas.length} pruebas correctas`);process.exitCode=fallos?1:0;})();
