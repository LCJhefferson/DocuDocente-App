// "2026-09-29T20:15:00.000Z" -> "29/09/2026"
export const formatearFecha = (fechaIso: string): string => {
  const fecha = new Date(fechaIso);
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
};
