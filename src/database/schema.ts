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
    .unique(),
  nombreCompleto: text('nombre_completo').notNull(),
  gradoAcademico: text('grado_academico').default('Mg.').notNull(),
  facultad: text('facultad').notNull(),
  departamento: text('departamento'),
  codigoInstitucional: text('codigo_institucional'),
  avatarUri: text('avatar_uri'),
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
  formato: text('formato').default('APA 7').notNull(), // <-- NUEVA COLUMNA AÑADIDA
  esPredeterminada: integer('es_predeterminada', { mode: 'boolean' }).default(false).notNull(),
  creadoEn: text('creado_en').notNull(),
});

// 4. CURSOS
export const cursos = sqliteTable('cursos', {
  id: text('id').primaryKey(),
  perfilDocenteId: text('perfil_docente_id')
    .references(() => perfilesDocente.id, { onDelete: 'cascade' })
    .notNull(),
  nombre: text('nombre').notNull(),
  codigo: text('codigo'),
  ciclo: text('ciclo').notNull(),
  semestre: text('semestre').notNull(),
  creadoEn: text('creado_en').notNull(),
  actualizadoEn: text('actualizado_en').notNull(),
});

// 5. INFORMES
export const informes = sqliteTable('informes', {
  id: text('id').primaryKey(),
  perfilDocenteId: text('perfil_docente_id').references(() => perfilesDocente.id, { onDelete: 'set null' }),
  cursoId: text('curso_id').references(() => cursos.id, { onDelete: 'cascade' }),
  plantillaId: text('plantilla_id').references(() => plantillas.id, { onDelete: 'set null' }),
  numeroInforme: text('numero_informe').notNull(),
  dirigidoANombre: text('dirigido_a_nombre').notNull(),
  dirigidoACargo: text('dirigido_a_cargo').notNull(),
  remitenteNombre: text('remitente_nombre').notNull(),
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

// 6. RESULTADOS ESTADÍSTICOS POR UNIDAD
export const resultadosUnidad = sqliteTable('resultados_unidad', {
  id: text('id').primaryKey(),
  cursoId: text('curso_id').references(() => cursos.id, { onDelete: 'cascade' }),
  informeId: text('informe_id').references(() => informes.id, { onDelete: 'cascade' }),
  nombreUnidad: text('nombre_unidad').notNull(),
  cantidadAprobados: integer('cantidad_aprobados').notNull(),
  cantidadDesaprobados: integer('cantidad_desaprobados').notNull(),
  porcentajeAprobados: real('porcentaje_aprobados').notNull(),
  porcentajeDesaprobados: real('porcentaje_desaprobados').notNull(),
  tipoGrafico: text('tipo_grafico').default('pastel'),
  textoInterpretacion: text('texto_interpretacion'),
});

// 7. ACTIVIDADES EVALUATIVAS
export const actividades = sqliteTable('actividades', {
  id: text('id').primaryKey(),
  informeId: text('informe_id').references(() => informes.id, { onDelete: 'cascade' }).notNull(),
  nombre: text('nombre').notNull(),
  descripcion: text('descripcion'),
  categoria: text('categoria', { enum: ['CONOCIMIENTO', 'DESEMPENO', 'PRODUCTO'] }).notNull(),
});

// 8. EVIDENCIAS
export const evidencias = sqliteTable('evidencias', {
  id: text('id').primaryKey(),
  tipoGeneral: text('tipo_general', { enum: ['ACADEMICA', 'EXTRACURRICULAR'] })
    .default('ACADEMICA')
    .notNull(),
  cursoId: text('curso_id').references(() => cursos.id, { onDelete: 'cascade' }),
  actividadId: text('actividad_id').references(() => actividades.id, { onDelete: 'cascade' }),
  nombreActividad: text('nombre_actividad').notNull(),
  descripcion: text('descripcion'),
  unidad: text('unidad'), 
  tipoActividad: text('tipo_actividad'),
  rutaArchivoLocal: text('ruta_archivo_local'),
  urlRemota: text('url_remota'),
  tipoArchivo: text('tipo_archivo').default('IMAGE'),
  leyenda: text('leyenda'),
  creadoEn: text('creado_en').notNull(),
  actualizadoEn: text('actualizado_en').notNull(),
});