import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { marcaSeccion } from '../../data/catalogoPlantillas';
import { DefinicionPlantilla, TipoSeccion } from '../../models/Plantilla';
import { AnalisisDocx } from '../../utils/analizarDocx';
import { fuenteLogo } from '../../utils/logos';

const NOMBRE_TIPO: Record<TipoSeccion, string> = {
  apertura: 'Apertura',
  datos_generales: 'Datos generales',
  cursos: 'Tabla de cursos',
  criterios: 'Criterios',
  resultados_unidad: 'Resultados por unidad',
  actividades_por_curso: 'Actividades por curso',
  evidencias: 'Evidencias',
  analisis: 'Análisis',
  resumen: 'Resumen',
  recomendacion: 'Recomendación',
  otras_actividades: 'Otras actividades',
  documentacion: 'Documentación',
  cierre: 'Cierre y firma',
  texto: 'Texto libre',
};

type Props = {
  visible: boolean;
  nombreInicial: string;
  analisis: AnalisisDocx | null;
  onCancelar: () => void;
  onGuardar: (nombre: string, definicion: DefinicionPlantilla) => void;
};

const lineas = (texto: string) => texto.split('\n').map((l) => l.trim()).filter(Boolean);

/** "Resultado del análisis": el docente revisa y corrige lo detectado antes de guardar */
export const ResultadoAnalisis = ({ visible, nombreInicial, analisis, onCancelar, onGuardar }: Props) => {
  const [nombre, setNombre] = useState(nombreInicial);
  const [def, setDef] = useState<DefinicionPlantilla | null>(analisis?.definicion ?? null);

  useEffect(() => {
    setNombre(nombreInicial);
    setDef(analisis ? (JSON.parse(JSON.stringify(analisis.definicion)) as DefinicionPlantilla) : null);
  }, [analisis, nombreInicial]);

  if (!analisis || !def) return null;

  const cambiarCabecera = (cambios: Partial<DefinicionPlantilla['cabecera']>) => setDef({ ...def, cabecera: { ...def.cabecera, ...cambios } });
  const cambiarCampo = (i: number, valor: string) => setDef({ ...def, campos: def.campos.map((c, j) => (j === i ? { ...c, valor } : c)) });
  const quitarSeccion = (i: number) => setDef({ ...def, secciones: def.secciones.filter((_, j) => j !== i) });
  const { hallazgos } = analisis;
  let numero = 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancelar}>
      <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Resultado del análisis</Text>
        <Text style={styles.ayuda}>Revisa lo que encontramos en tu Word y corrige lo que haga falta.</Text>

        <Text style={styles.seccion}>Nombre de la plantilla</Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} />

        <Text style={styles.seccion}>Formato</Text>
        <View style={styles.tarjeta}>
          <Text style={styles.norma}>{hallazgos.norma}</Text>
          <Text style={styles.ayuda}>{hallazgos.motivoNorma}</Text>
        </View>

        <Text style={styles.seccion}>Cabecera</Text>
        <View style={styles.tarjeta}>
          <View style={styles.fila}>
            {def.cabecera.logoIzquierdo ? <Image source={fuenteLogo(def.cabecera.logoIzquierdo)} style={styles.logo} resizeMode="contain" /> : <Text style={styles.ayuda}>Sin logo izquierdo</Text>}
            {def.cabecera.logoDerecho ? <Image source={fuenteLogo(def.cabecera.logoDerecho)} style={styles.logo} resizeMode="contain" /> : null}
          </View>
          <Text style={styles.etiqueta}>Texto izquierdo</Text>
          <TextInput style={styles.input} multiline value={def.cabecera.textoIzquierdo.join('\n')} onChangeText={(v) => cambiarCabecera({ textoIzquierdo: lineas(v) })} />
          <Text style={styles.etiqueta}>Texto derecho</Text>
          <TextInput style={styles.input} multiline value={def.cabecera.textoDerecho.join('\n')} onChangeText={(v) => cambiarCabecera({ textoDerecho: lineas(v) })} />
          <Text style={styles.etiqueta}>Lema del año</Text>
          <TextInput style={styles.input} multiline value={def.cabecera.lema ?? ''} onChangeText={(v) => cambiarCabecera({ lema: v.trim() || null })} />
        </View>

        {def.pie.lineas.length > 0 && (
          <>
            <Text style={styles.seccion}>Pie de página</Text>
            <View style={styles.tarjeta}>
              {def.pie.lineas.map((l) => (
                <Text key={l} style={styles.textoChico}>{l}</Text>
              ))}
            </View>
          </>
        )}

        {def.campos.length > 0 && (
          <>
            <Text style={styles.seccion}>Datos del oficio (se autocompletarán con estos valores)</Text>
            {def.campos.map((c, i) => (
              <View key={c.clave} style={styles.campo}>
                <Text style={styles.etiqueta}>{c.etiqueta}</Text>
                <TextInput style={styles.input} multiline value={c.valor} onChangeText={(v) => cambiarCampo(i, v)} />
              </View>
            ))}
          </>
        )}

        <Text style={styles.seccion}>Estructura ({def.secciones.length} partes)</Text>
        {def.secciones.map((s, i) => {
          const marca = s.titulo ? marcaSeccion(def.numeracion, numero++) : '';
          return (
            <View key={`${s.tipo}-${i}`} style={styles.filaSeccion}>
              <View style={{ flex: 1 }}>
                <Text style={styles.textoSeccion}>{s.titulo ? `${marca} ${s.titulo}` : NOMBRE_TIPO[s.tipo]}</Text>
                <Text style={styles.tipo}>{NOMBRE_TIPO[s.tipo]}</Text>
              </View>
              <TouchableOpacity onPress={() => quitarSeccion(i)} accessibilityLabel="Quitar sección" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle-outline" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          );
        })}

        {hallazgos.marcadores.length > 0 && (
          <>
            <Text style={styles.seccion}>Marcadores encontrados</Text>
            <Text style={styles.textoChico}>{hallazgos.marcadores.join('   ')}</Text>
          </>
        )}

        {hallazgos.avisos.map((a) => (
          <View key={a} style={styles.aviso}>
            <Ionicons name="information-circle-outline" size={16} color="#B45309" />
            <Text style={styles.textoAviso}>{a}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.boton} onPress={() => onGuardar(nombre.trim() || nombreInicial, def)}>
          <Text style={styles.textoBoton}>Guardar como plantilla</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.botonSecundario} onPress={onCancelar}>
          <Text style={styles.textoSecundario}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#F3F4F6' },
  contenido: { padding: 16, paddingTop: 40, paddingBottom: 48 },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  ayuda: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  seccion: { fontSize: 13, fontWeight: 'bold', color: '#374151', marginTop: 20, marginBottom: 8 },
  tarjeta: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, gap: 6 },
  norma: { fontSize: 16, fontWeight: 'bold', color: '#2563EB' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { width: 120, height: 48 },
  etiqueta: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginTop: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 13, backgroundColor: '#FFFFFF' },
  campo: { marginBottom: 10 },
  textoChico: { fontSize: 12, color: '#374151' },
  filaSeccion: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, marginBottom: 6, gap: 8 },
  textoSeccion: { fontSize: 13, fontWeight: '600', color: '#111827' },
  tipo: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  aviso: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 8, padding: 8, marginTop: 8 },
  textoAviso: { flex: 1, fontSize: 12, color: '#B45309' },
  boton: { backgroundColor: '#2563EB', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  textoBoton: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  botonSecundario: { paddingVertical: 14, alignItems: 'center' },
  textoSecundario: { color: '#4B5563', fontWeight: 'bold', fontSize: 14 },
});
