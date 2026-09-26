import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// 1. DOMINIO DE AUTENTICACIÓN (Cuentas y Seguridad)
export const cuentasAutenticacion = sqliteTable('cuentas_autenticacion', {
  id: text('id').primaryKey(),
  correoElectronico: text('correo_electronico').notNull().unique(),
  contrasenaHash: text('contrasena_hash').notNull(),
  esActivo: integer('es_activo', { mode: 'boolean' }).default(true).notNull(),
  creadoEn: text('creado_en').notNull(),
  actualizadoEn: text('actualizado_en').notNull(),
});

// 2. DOMINIO ACADÉMICO (Perfil del Docente)
export const perfilesDocente = sqliteTable('perfiles_docente', {
  id: text('id').primaryKey(),
  cuentaId: text('cuenta_id')
    .references(() => cuentasAutenticacion.id, { onDelete: 'cascade' })
    .notNull()
    .unique(), // Relación 1 a 1 con la cuenta
  nombreCompleto: text('nombre_completo').notNull(),
  gradoAcademico: text('grado_academico').default('Mg.').notNull(), // Ej: Mg., Dr., Lic.
  facultad: text('facultad').notNull(),                              // Ej: FISME
  departamento: text('departamento'),                                // Ej: Ingeniería de Sistemas
  codigoInstitucional: text('codigo_institucional'),                 // Ej: Cód. Docente
  avatarUri: text('avatar_uri'),
  // firmaUri: text('firma_uri'),                                   // Reservado para implementación futura
  creadoEn: text('creado_en').notNull(),
  actualizadoEn: text('actualizado_en').notNull(),
});

// 3. PLANTILLAS DE ENCABEZADO
export const plantillas = sqliteTable('plantillas', {
  id: text('id').primaryKey(),
  nombreInstitucion: text('nombre_institucion').notNull(),
  nombreFacultad: text('nombre_facultad'),
  logoUri: text('logo_uri'),
  tituloAnoEncabezado: text('titulo_ano_encabezado').notNull(),
  esPredeterminada: integer('es_predeterminada', { mode: 'boolean' }).default(false).notNull(),
  creadoEn: text('creado_en').notNull(),
});

// 4. INFORMES ACADÉMICOS CONSOLIDADOS
export const informes = sqliteTable('informes', {
  id: text('id').primaryKey(),
  perfilDocenteId: text('perfil_docente_id').references(() => perfilesDocente.id, { onDelete: 'set null' }),
  plantillaId: text('plantilla_id').references(() => plantillas.id, { onDelete: 'set null' }),
  numeroInforme: text('numero_informe').notNull(),
  dirigidoANombre: text('dirigido_a_nombre').notNull(),
  dirigidoACargo: text('dirigido_a_cargo').notNull(),
  remitenteNombre: text('remitente_nombre').notNull(), // Congela el nombre y grado al momento de crear el informe
  asunto: text('asunto').notNull(),
  fechaStr: text('fecha_str').notNull(),
  nombreCurso: text('nombre_curso').notNull(),
  ciclo: text('ciclo').notNull(),
  semestre: text('semestre').notNull(),
  totalEstudiantes: integer('total_estudiantes').notNull(),
  estado: text('estado', { enum: ['BORRADOR', 'COMPLETADO', 'SINCRONIZADO'] }).default('BORRADOR').notNull(),
  creadoEn: text('creado_en').notNull(),
  actualizadoEn: text('actualizado_en').notNull(),
});

// 5. RESULTADOS ESTADÍSTICOS POR UNIDAD
export const resultadosUnidad = sqliteTable('resultados_unidad', {
  id: text('id').primaryKey(),
  informeId: text('informe_id').references(() => informes.id, { onDelete: 'cascade' }).notNull(),
  nombreUnidad: text('nombre_unidad').notNull(),
  cantidadAprobados: integer('cantidad_aprobados').notNull(),
  cantidadDesaprobados: integer('cantidad_desaprobados').notNull(),
  porcentajeAprobados: real('porcentaje_aprobados').notNull(),
  porcentajeDesaprobados: real('porcentaje_desaprobados').notNull(),
  textoInterpretacion: text('texto_interpretacion'),
});

// 6. ACTIVIDADES EVALUATIVAS
export const actividades = sqliteTable('actividades', {
  id: text('id').primaryKey(),
  informeId: text('informe_id').references(() => informes.id, { onDelete: 'cascade' }).notNull(),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  categoria: text('categoria', { enum: ['CONOCIMIENTO', 'DESEMPENO', 'PRODUCTO'] }).notNull(),
});

// 7. EVIDENCIAS FOTOGRÁFICAS
export const evidencias = sqliteTable('evidencias', {
  id: text('id').primaryKey(),
  actividadId: text('actividad_id').references(() => actividades.id, { onDelete: 'cascade' }).notNull(),
  rutaArchivoLocal: text('ruta_archivo_local').notNull(),
  urlRemota: text('url_remota'),
  leyenda: text('leyenda'),
  creadoEn: text('creado_en').notNull(),
});