import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { EntradaCrearInforme, EntradaResultadoUnidad, Informe } from '../models/Informe';
import { InformeService } from '../services/informeService';
import { compartirPdf, generarPdfInforme } from '../services/pdfService';

/**
 * Lógica del módulo de informes para las pantallas:
 * historial, crear, eliminar y exportar a PDF.
 */
export const useInformes = () => {
  const { perfilDocente } = useAuth();
  const [informes, setInformes] = useState<Informe[]>([]);
  const [cargando, setCargando] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  // Recarga el historial del docente conectado
  const cargarInformes = useCallback(async () => {
    if (!perfilDocente) return;
    setCargando(true);
    try {
      setInformes(await InformeService.obtenerInformesPorDocente(perfilDocente.id));
    } finally {
      setCargando(false);
    }
  }, [perfilDocente]);

  // Crea el informe y devuelve su id (para abrir la vista previa)
  const crearInforme = async (
    datos: Omit<EntradaCrearInforme, 'perfilDocenteId' | 'remitenteNombre'>,
    unidades: EntradaResultadoUnidad[]
  ): Promise<string> => {
    if (!perfilDocente) throw new Error('No hay un docente con sesión iniciada.');

    const id = await InformeService.crearInforme(
      {
        ...datos,
        perfilDocenteId: perfilDocente.id,
        remitenteNombre: `${perfilDocente.gradoAcademico} ${perfilDocente.nombreCompleto}`,
      },
      unidades
    );
    await cargarInformes();
    return id;
  };

  const eliminarInforme = async (informeId: string) => {
    await InformeService.eliminarInforme(informeId);
    await cargarInformes();
  };

  // Genera el PDF y abre el menú para compartirlo
  const exportarPdf = async (informeId: string) => {
    setGenerandoPdf(true);
    try {
      const datos = await InformeService.obtenerInformeCompleto(informeId);
      if (!datos) throw new Error('No se encontró el informe.');
      const uri = await generarPdfInforme(datos);
      await compartirPdf(uri);
    } finally {
      setGenerandoPdf(false);
    }
  };

  return {
    informes,
    cargando,
    generandoPdf,
    cargarInformes,
    crearInforme,
    eliminarInforme,
    exportarPdf,
  };
};
