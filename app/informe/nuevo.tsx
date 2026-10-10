import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { CATALOGO, definicionDelCatalogo, nombreDelCatalogo, TipoCatalogo } from '../../src/data/catalogoPlantillas';
import { Curso } from '../../src/models/Curso';
import { UNIDADES_INFORME } from '../../src/models/Informe';
import { ContenidoInforme, DefinicionPlantilla, InformeConPlantilla, TipoSeccion } from '../../src/models/Plantilla';
import { CursoService } from '../../src/services/cursoService';
import { DatosInforme, informeDatosService } from '../../src/services/informeDatosService';
import { InformeService } from '../../src/services/informeService';
import { plantillaService } from '../../src/services/plantillaService';
import { reemplazarMarcadores, unidadEnRomano } from '../../src/utils/informeTexto';

type Opcion = { id: string; plantillaId: string | null; nombre: string; definicion: DefinicionPlantilla };

const TEXTOS_LIBRES: { tipo: TipoSeccion; etiqueta: string; ayuda: string }[] = [
  { tipo: 'apertura', etiqueta: 'Párrafo de apertura', ayuda: '' },
  { tipo: 'resumen', etiqueta: 'Resumen', ayuda: 'Un punto por línea.' },
  { tipo: 'recomendacion', etiqueta: 'Recomendaciones', ayuda: 'Un punto por línea.' },
];

export default function NuevoInformeScreen() {
  const router = useRouter();
  const { cursoId } = useLocalSearchParams<{ cursoId?: string }>();
  const { perfilDocente } = useAuth();

  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [opcionId, setOpcionId] = useState<string | null>(null);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoIds, setCursoIds] = useState<string[]>(cursoId ? [cursoId] : []);
  const [unidades, setUnidades] = useState<string[]>(['Unidad 1']);
  const [datos, setDatos] = useState<DatosInforme | null>(null);
  const [anterior, setAnterior] = useState<InformeConPlantilla | null>(null);

  const [campos, setCampos] = useState<Record<string, string>>({});
  const [textos, setTextos] = useState<Partial<Record<TipoSeccion, string>>>({});
  const [metodologias, setMetodologias] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const opcion = opciones.find((o) => o.id === opcionId) ?? null;
  const tiposEnPlantilla = useMemo(() => new Set(opcion?.definicion.secciones.map((s) => s.tipo)), [opcion]);

  // Plantillas del docente (la predeterminada primero) + las del catálogo
  useEffect(() => {
    if (!perfilDocente) return;
    (async () => {
      const propias = await plantillaService.listar();
      const lista: Opcion[] = [
        ...propias
          .sort((a, b) => Number(b.esPredeterminada) - Number(a.esPredeterminada))
          .map((p) => ({ id: p.id, plantillaId: p.id, nombre: p.nombre, definicion: p.definicion })),
        ...CATALOGO.map((c) => ({
          id: `catalogo-${c.tipo}`,
          plantillaId: null,
          nombre: `Catálogo · ${nombreDelCatalogo(c.tipo as TipoCatalogo, 'B')}`,
          definicion: definicionDelCatalogo(c.tipo as TipoCatalogo, 'B'),
        })),
      ];
      setOpciones(lista);
      setOpcionId(lista[0]?.id ?? null);
      setCursos(await CursoService.obtenerCursosPorDocente(perfilDocente.id));
      setAnterior(await InformeService.obtenerUltimoContenido(perfilDocente.id));
    })().catch((e) => console.error('[NuevoInforme] Error al cargar:', e));
  }, [perfilDocente]);

  // Reúne los datos cada vez que cambian los cursos o las unidades
  useEffect(() => {
    if (!perfilDocente) return;
    informeDatosService
      .reunir({ perfilDocenteId: perfilDocente.id, cursoIds, unidades: UNIDADES_INFORME.filter((u) => unidades.includes(u)) })
      .then(setDatos)
      .catch((e) => console.error('[NuevoInforme] Error al reunir datos:', e));
  }, [perfilDocente, cursoIds, unidades]);

  // Autocompleta campos y textos al elegir plantilla (todo queda editable)
  useEffect(() => {
    if (!opcion || !datos) return;
    const valores = datos.valores;
    const autocompletado: Record<string, string> = {};
    for (const c of opcion.definicion.campos) {
      autocompletado[c.clave] =
        c.clave === 'numero'
          ? datos.numeroSugerido
          : c.clave === 'fecha'
            ? datos.fecha
            : c.clave === 'de'
              ? `${valores.docente}\nDocente de la Facultad de ${datos.docente.facultad}`
              : c.clave === 'a'
                ? anterior?.contenido.campos.a ?? c.valor
                : reemplazarMarcadores(c.valor, valores);
    }
    setCampos(autocompletado);
    const apertura = opcion.definicion.secciones.find((s) => s.tipo === 'apertura')?.texto;
    setTextos({ apertura: apertura ? reemplazarMarcadores(apertura, valores) : undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opcionId, datos?.valores.unidades, datos?.valores.semestre, anterior]);

  const alternar = (lista: string[], valor: string) => (lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);

  const usarAnterior = () => {
    if (!anterior) return;
    const previo = anterior.contenido;
    setCampos((c) => ({ ...c, a: previo.campos.a ?? c.a, de: previo.campos.de ?? c.de, ref: previo.campos.ref ?? c.ref }));
    setTextos((t) => ({ ...t, resumen: previo.textos?.resumen, recomendacion: previo.textos?.recomendacion }));
    setMetodologias((m) => ({ ...m, ...previo.metodologias }));
  };

  const generar = async () => {
    if (!perfilDocente || !opcion || !datos) return;
    if (!cursoIds.length || !unidades.length) {
      Alert.alert('Falta elegir', 'Selecciona al menos un curso y una unidad.');
      return;
    }
    if (!campos.a?.trim() || (campos.asunto !== undefined && !campos.asunto.trim())) {
      Alert.alert('Faltan datos', 'Completa a quién va dirigido y el asunto.');
      return;
    }

    const contenido: ContenidoInforme = { campos, textos, metodologias };
    const guardado: InformeConPlantilla = {
      plantillaNombre: opcion.nombre,
      definicion: opcion.definicion,
      cursoIds,
      unidades: datos.unidades,
      contenido,
      resultados: Object.fromEntries(
        datos.cursos.map((dc) => [
          dc.curso.id,
          dc.resultados.map((r) => ({ nombreUnidad: r.nombreUnidad, aprobados: r.aprobados, desaprobados: r.desaprobados })),
        ])
      ),
    };

    setGuardando(true);
    try {
      const id = await InformeService.crearInformeConPlantilla({ perfilDocenteId: perfilDocente.id, plantillaId: opcion.plantillaId, datos, guardado });
      router.replace({ pathname: '/informe/[id]', params: { id } });
    } catch (error) {
      console.error('[NuevoInforme] Error al guardar:', error);
      Alert.alert('Error', 'No se pudo guardar el informe.');
    } finally {
      setGuardando(false);
    }
  };

  if (!opcion) {
    return <ActivityIndicator style={{ flex: 1 }} color="#1E88E5" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Nuevo informe</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        {/* 1. PLANTILLA */}
        <Text style={styles.seccion}>1. Plantilla</Text>
        {opciones.map((o) => (
          <TouchableOpacity key={o.id} style={[styles.opcion, o.id === opcionId && styles.opcionActiva]} onPress={() => setOpcionId(o.id)}>
            <Ionicons name={o.id === opcionId ? 'radio-button-on' : 'radio-button-off'} size={18} color={o.id === opcionId ? '#1E88E5' : '#94A3B8'} />
            <Text style={styles.textoOpcion}>{o.nombre}</Text>
          </TouchableOpacity>
        ))}

        {/* 2. CURSOS Y UNIDADES */}
        <Text style={styles.seccion}>2. Cursos y unidades</Text>
        {cursos.length === 0 && <Text style={styles.ayuda}>Aún no tienes cursos registrados.</Text>}
        {cursos.map((c) => {
          const elegido = cursoIds.includes(c.id);
          const sinNotas = datos?.cursos.find((d) => d.curso.id === c.id)?.resultados.length === 0;
          return (
            <TouchableOpacity key={c.id} style={[styles.opcion, elegido && styles.opcionActiva]} onPress={() => setCursoIds((l) => alternar(l, c.id))}>
              <Ionicons name={elegido ? 'checkbox' : 'square-outline'} size={18} color={elegido ? '#1E88E5' : '#94A3B8'} />
              <View style={{ flex: 1 }}>
                <Text style={styles.textoOpcion}>{c.nombre}</Text>
                {elegido && sinNotas && <Text style={styles.aviso}>Sin notas guardadas en las unidades elegidas</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={styles.fila}>
          {UNIDADES_INFORME.map((u) => (
            <TouchableOpacity key={u} style={[styles.chip, unidades.includes(u) && styles.chipActivo]} onPress={() => setUnidades((l) => alternar(l, u))}>
              <Text style={[styles.textoChip, unidades.includes(u) && styles.textoChipActivo]}>{unidadEnRomano(u)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3. DATOS DEL OFICIO */}
        <View style={styles.filaTitulo}>
          <Text style={styles.seccion}>3. Datos del oficio</Text>
          {anterior && (
            <TouchableOpacity onPress={usarAnterior}>
              <Text style={styles.enlace}>Usar los del informe anterior</Text>
            </TouchableOpacity>
          )}
        </View>
        {opcion.definicion.campos.map((c) => (
          <View key={c.clave} style={styles.campo}>
            <Text style={styles.etiqueta}>{c.etiqueta}</Text>
            <TextInput
              style={styles.input}
              value={campos[c.clave] ?? ''}
              onChangeText={(v) => setCampos((actual) => ({ ...actual, [c.clave]: v }))}
              multiline={c.clave === 'a' || c.clave === 'de' || c.clave === 'ref' || c.clave === 'asunto'}
              placeholder={c.clave === 'a' ? 'Nombre\nCargo' : ''}
              placeholderTextColor="#94A3B8"
            />
          </View>
        ))}

        {/* 4. TEXTOS */}
        <Text style={styles.seccion}>4. Textos del informe</Text>
        {TEXTOS_LIBRES.filter((t) => tiposEnPlantilla.has(t.tipo)).map((t) => (
          <View key={t.tipo} style={styles.campo}>
            <Text style={styles.etiqueta}>{t.etiqueta}</Text>
            {t.ayuda ? <Text style={styles.ayuda}>{t.ayuda}</Text> : null}
            <TextInput
              style={[styles.input, styles.inputLargo]}
              value={textos[t.tipo] ?? ''}
              onChangeText={(v) => setTextos((actual) => ({ ...actual, [t.tipo]: v }))}
              multiline
            />
          </View>
        ))}
        {tiposEnPlantilla.has('actividades_por_curso') &&
          cursos
            .filter((c) => cursoIds.includes(c.id))
            .map((c) => (
              <View key={c.id} style={styles.campo}>
                <Text style={styles.etiqueta}>Metodología · {c.nombre}</Text>
                <Text style={styles.ayuda}>Un punto por línea.</Text>
                <TextInput
                  style={[styles.input, styles.inputLargo]}
                  value={metodologias[c.id] ?? ''}
                  onChangeText={(v) => setMetodologias((actual) => ({ ...actual, [c.id]: v }))}
                  multiline
                />
              </View>
            ))}
        <Text style={styles.ayuda}>
          Las tablas de cursos, resultados, evidencias, análisis y otras actividades se llenan solas con tus datos.
        </Text>

        <TouchableOpacity style={[styles.boton, guardando && { opacity: 0.6 }]} onPress={generar} disabled={guardando || !datos}>
          {guardando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.textoBoton}>Generar informe</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  titulo: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  contenido: { padding: 16, paddingBottom: 48 },
  seccion: { fontSize: 15, fontWeight: '700', color: '#124874', marginTop: 20, marginBottom: 8 },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  enlace: { fontSize: 13, fontWeight: '600', color: '#1E88E5', marginTop: 12 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  opcionActiva: { borderColor: '#1E88E5', backgroundColor: '#EFF6FF' },
  textoOpcion: { fontSize: 14, color: '#0F172A', flexShrink: 1 },
  aviso: { fontSize: 12, color: '#B45309', marginTop: 2 },
  fila: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E1' },
  chipActivo: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
  textoChip: { fontSize: 13, color: '#475569', fontWeight: '600' },
  textoChipActivo: { color: '#FFFFFF' },
  campo: { marginBottom: 12 },
  etiqueta: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 4 },
  ayuda: { fontSize: 12, color: '#94A3B8', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F172A' },
  inputLargo: { minHeight: 90, textAlignVertical: 'top' },
  boton: { backgroundColor: '#1E88E5', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  textoBoton: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
