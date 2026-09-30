// Cálculos estadísticos del informe (funciones puras: sin base de datos ni pantalla)

// Art. 62° del Reglamento de Evaluación: con 20 % o más de desaprobados
// el docente debe formular un Plan de Mejora Académica.
export const LIMITE_PLAN_MEJORA = 20;

export interface ResumenUnidad {
  total: number;
  porcentajeAprobados: number;
  porcentajeDesaprobados: number;
  requierePlanMejora: boolean;
}

// Redondea a 2 decimales (81.8181... -> 81.82)
const redondear = (valor: number) => Math.round(valor * 100) / 100;

export const calcularResumenUnidad = (aprobados: number, desaprobados: number): ResumenUnidad => {
  const total = aprobados + desaprobados;

  // Caso límite: unidad sin estudiantes -> evitamos dividir entre 0
  if (total === 0) {
    return { total: 0, porcentajeAprobados: 0, porcentajeDesaprobados: 0, requierePlanMejora: false };
  }

  const porcentajeDesaprobados = redondear((desaprobados / total) * 100);

  return {
    total,
    porcentajeAprobados: redondear((aprobados / total) * 100),
    porcentajeDesaprobados,
    requierePlanMejora: porcentajeDesaprobados >= LIMITE_PLAN_MEJORA,
  };
};

// Texto automático para la sección "Análisis de resultados"
export const generarInterpretacion = (nombreUnidad: string, aprobados: number, desaprobados: number): string => {
  const r = calcularResumenUnidad(aprobados, desaprobados);

  if (r.total === 0) return `En la ${nombreUnidad} no se registraron estudiantes evaluados.`;

  const base =
    `En la ${nombreUnidad} se evaluó a ${r.total} estudiantes: ${aprobados} aprobados ` +
    `(${r.porcentajeAprobados} %) y ${desaprobados} desaprobados (${r.porcentajeDesaprobados} %).`;

  return r.requierePlanMejora
    ? `${base} La desaprobación alcanza o supera el ${LIMITE_PLAN_MEJORA} %, por lo que corresponde formular un Plan de Mejora Académica.`
    : `${base} La desaprobación se mantiene por debajo del ${LIMITE_PLAN_MEJORA} %.`;
};
