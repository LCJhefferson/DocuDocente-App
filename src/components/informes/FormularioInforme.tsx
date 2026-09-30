import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { EntradaResultadoUnidad, UNIDADES_INFORME } from '../../models/Informe';
import { calcularResumenUnidad } from '../../utils/estadisticas';

interface CursoInforme {
  id: string;
  nombre: string;
  ciclo: string;
  semestre: string;
}

interface Props {
  curso: CursoInforme;
  onGuardar: (
    datos: {
      cursoId: string;
      numeroInforme: string;
      dirigidoANombre: string;
      dirigidoACargo: string;
      asunto: string;
      fechaStr: string;
      nombreCurso: string;
      ciclo: string;
      semestre: string;
    },
    unidades: EntradaResultadoUnidad[]
  ) => Promise<void>;
  onCancelar: () => void;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "Bagua, 29 de septiembre de 2026"
const fechaDeHoy = () => {
  const hoy = new Date();
  return `Bagua, ${hoy.getDate()} de ${MESES[hoy.getMonth()]} de ${hoy.getFullYear()}`;
};

// Solo dígitos: evita letras o signos en las cantidades
const soloNumeros = (texto: string) => texto.replace(/[^0-9]/g, '');

export const FormularioInforme = ({ curso, onGuardar, onCancelar }: Props) => {
  const [numeroInforme, setNumeroInforme] = useState(`001-${new Date().getFullYear()}-UNTRM-FISME`);
  const [dirigidoANombre, setDirigidoANombre] = useState('');
  const [dirigidoACargo, setDirigidoACargo] = useState('');
  const [asunto, setAsunto] = useState('Informe de resultados de evaluación de la Unidad I');
  const [fechaStr, setFechaStr] = useState(fechaDeHoy());
  const [guardando, setGuardando] = useState(false);

  // Cantidades por unidad como texto (así el campo puede quedar vacío)
  const [cantidades, setCantidades] = useState<Record<string, { aprobados: string; desaprobados: string }>>(
    Object.fromEntries(UNIDADES_INFORME.map((u) => [u, { aprobados: '', desaprobados: '' }]))
  );

  const cambiarCantidad = (unidad: string, campo: 'aprobados' | 'desaprobados', valor: string) => {
    setCantidades((actual) => ({ ...actual, [unidad]: { ...actual[unidad], [campo]: soloNumeros(valor) } }));
  };

  const guardar = async () => {
    // Solo se incluyen las unidades que tienen al menos un estudiante
    const unidades: EntradaResultadoUnidad[] = UNIDADES_INFORME.map((u) => ({
      nombreUnidad: u,
      cantidadAprobados: Number(cantidades[u].aprobados || 0),
      cantidadDesaprobados: Number(cantidades[u].desaprobados || 0),
    })).filter((u) => u.cantidadAprobados + u.cantidadDesaprobados > 0);

    if (!numeroInforme.trim() || !dirigidoANombre.trim() || !dirigidoACargo.trim() || !asunto.trim()) {
      Alert.alert('Faltan datos', 'Completa el N° de informe, a quién va dirigido, su cargo y el asunto.');
      return;
    }
    if (unidades.length === 0) {
      Alert.alert('Faltan resultados', 'Ingresa aprobados y desaprobados de al menos una unidad.');
      return;
    }

    setGuardando(true);
    try {
      await onGuardar(
        {
          cursoId: curso.id,
          numeroInforme,
          dirigidoANombre,
          dirigidoACargo,
          asunto,
          fechaStr,
          nombreCurso: curso.nombre,
          ciclo: curso.ciclo,
          semestre: curso.semestre,
        },
        unidades
      );
    } catch (error) {
      console.error('[FormularioInforme] Error al guardar:', error);
      Alert.alert('Error', 'No se pudo guardar el informe. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Text style={styles.titulo}>Nuevo informe</Text>
      <Text style={styles.subtitulo}>{curso.nombre} · Ciclo {curso.ciclo} · {curso.semestre}</Text>

      {/* DATOS DEL OFICIO */}
      <Text style={styles.seccion}>Datos del informe</Text>
      <Campo etiqueta="N° de informe" valor={numeroInforme} onCambiar={setNumeroInforme} />
      <Campo etiqueta="Dirigido a" valor={dirigidoANombre} onCambiar={setDirigidoANombre} ejemplo="Dr. Roberto Pérez Astonitas" />
      <Campo etiqueta="Cargo" valor={dirigidoACargo} onCambiar={setDirigidoACargo} ejemplo="Director de la Escuela Profesional de Ingeniería de Sistemas" />
      <Campo etiqueta="Asunto" valor={asunto} onCambiar={setAsunto} />
      <Campo etiqueta="Lugar y fecha" valor={fechaStr} onCambiar={setFechaStr} />

      {/* RESULTADOS POR UNIDAD */}
      <Text style={styles.seccion}>Resultados por unidad</Text>
      <Text style={styles.ayuda}>Deja en blanco las unidades que aún no evalúas.</Text>

      {UNIDADES_INFORME.map((unidad) => {
        const aprobados = Number(cantidades[unidad].aprobados || 0);
        const desaprobados = Number(cantidades[unidad].desaprobados || 0);
        const resumen = calcularResumenUnidad(aprobados, desaprobados);

        return (
          <View key={unidad} style={styles.tarjetaUnidad}>
            <Text style={styles.nombreUnidad}>{unidad}</Text>
            <View style={styles.fila}>
              <CampoNumero etiqueta="Aprobados" valor={cantidades[unidad].aprobados} onCambiar={(v) => cambiarCantidad(unidad, 'aprobados', v)} />
              <CampoNumero etiqueta="Desaprobados" valor={cantidades[unidad].desaprobados} onCambiar={(v) => cambiarCantidad(unidad, 'desaprobados', v)} />
            </View>

            {/* Vista previa de los porcentajes mientras escribe */}
            {resumen.total > 0 && (
              <Text style={styles.porcentajes}>
                {resumen.total} estudiantes · {resumen.porcentajeAprobados} % aprobados · {resumen.porcentajeDesaprobados} % desaprobados
              </Text>
            )}
            {resumen.requierePlanMejora && (
              <View style={styles.alerta}>
                <Ionicons name="warning-outline" size={16} color="#B45309" />
                <Text style={styles.textoAlerta}>20 % o más de desaprobados: requiere Plan de Mejora.</Text>
              </View>
            )}
          </View>
        );
      })}

      {/* ACCIONES */}
      <TouchableOpacity style={[styles.botonPrincipal, guardando && styles.botonDeshabilitado]} onPress={guardar} disabled={guardando}>
        {guardando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.textoBotonPrincipal}>Generar informe</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.botonSecundario} onPress={onCancelar} disabled={guardando}>
        <Text style={styles.textoBotonSecundario}>Cancelar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ---- Campos reutilizables del formulario ----

const Campo = ({ etiqueta, valor, onCambiar, ejemplo }: { etiqueta: string; valor: string; onCambiar: (v: string) => void; ejemplo?: string }) => (
  <View style={styles.campo}>
    <Text style={styles.etiqueta}>{etiqueta}</Text>
    <TextInput style={styles.input} value={valor} onChangeText={onCambiar} placeholder={ejemplo} placeholderTextColor="#94A3B8" />
  </View>
);

const CampoNumero = ({ etiqueta, valor, onCambiar }: { etiqueta: string; valor: string; onCambiar: (v: string) => void }) => (
  <View style={styles.campoNumero}>
    <Text style={styles.etiqueta}>{etiqueta}</Text>
    <TextInput style={styles.input} value={valor} onChangeText={onCambiar} keyboardType="number-pad" placeholder="0" placeholderTextColor="#94A3B8" maxLength={3} />
  </View>
);

const styles = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 40 },
  titulo: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  subtitulo: { fontSize: 13, color: '#64748B', marginTop: 4 },
  seccion: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 24, marginBottom: 8 },
  ayuda: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  campo: { marginBottom: 12 },
  etiqueta: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  tarjetaUnidad: { backgroundColor: '#F1F5F9', borderRadius: 16, padding: 12, marginBottom: 12 },
  nombreUnidad: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  fila: { flexDirection: 'row', gap: 12 },
  campoNumero: { flex: 1 },
  porcentajes: { fontSize: 12, color: '#0F172A', marginTop: 8 },
  alerta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 8 },
  textoAlerta: { flex: 1, fontSize: 12, color: '#B45309' },
  botonPrincipal: { backgroundColor: '#38BDF8', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  botonDeshabilitado: { opacity: 0.6 },
  textoBotonPrincipal: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  botonSecundario: { paddingVertical: 14, alignItems: 'center' },
  textoBotonSecundario: { color: '#64748B', fontSize: 15, fontWeight: '600' },
});
