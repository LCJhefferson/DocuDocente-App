# DocuDocente

Aplicación móvil para que los docentes de la UNTRM (Facultad de Ingeniería de Sistemas y Mecánica Eléctrica, sede Bagua) registren sus cursos, evidencias y notas, y generen el informe de cada unidad en PDF con el formato institucional.

Proyecto del curso **Programación de Aplicaciones Móviles** (2026-II) — Mg. Eder Nicanor Figueroa Piscoya.

## Funcionalidades (Unidad I)

| Módulo | Qué hace |
|---|---|
| Cuenta | Registro en 3 pasos, inicio y cierre de sesión (la sesión queda guardada). |
| Cursos | Crear, editar y eliminar cursos; cada curso tiene Unidad 1, 2 y 3. |
| Evidencias | Foto con cámara, galería o archivo, clasificada por tipo de actividad y unidad. |
| Extracurriculares | Registrar, buscar y eliminar actividades fuera de clase (jurados, charlas, campañas…). |
| Notas y estadísticas | Subir Excel/CSV o ingresar totales; calcula % de aprobados/desaprobados y muestra gráfico. |
| Informes | Genera el informe de unidad con las notas guardadas, vista previa, descarga en PDF, compartir e historial. Avisa cuando corresponde Plan de Mejora (20 % o más de desaprobados). |

## Tecnologías

React Native 0.86 · Expo SDK 57 · TypeScript · Expo Router · SQLite (expo-sqlite) + Drizzle ORM · expo-secure-store · expo-image-picker · expo-document-picker · xlsx · react-native-gifted-charts · expo-print · expo-sharing.

Los datos se guardan en el teléfono (SQLite); la app funciona sin internet.

## Requisitos

- [Node.js](https://nodejs.org/) 20.19 o superior (recomendado 22 LTS) y Git.
- Un celular Android con la app **Expo Go** (Play Store), en la **misma red wifi** que la computadora.

## Cómo ejecutar

```bash
git clone https://github.com/LCJhefferson/DocuDocente-App.git
cd DocuDocente-App
npm install
npx expo start
```

Escanea el código QR que aparece en la terminal con Expo Go.

**Si el celular no conecta** (redes de la universidad suelen bloquear la conexión local):

- Usa la zona wifi del celular o la red de casa, y fuerza la IP de tu computadora:
  ```bash
  # Windows PowerShell (reemplaza por tu IP, la ves con ipconfig)
  $env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.9"; npx expo start --lan
  ```
- O prueba el modo túnel: `npx expo start --tunnel`.

> La versión web no está soportada: la app usa SQLite del teléfono.

### Cuenta de prueba

En una instalación nueva la app crea una cuenta de ejemplo (ver `src/database/client.ts`):
**docente@ejemplo.com** / **123456**. También puedes crear tu propia cuenta.

El botón ↻ del detalle de un curso borra la base de datos local y la vuelve a crear (solo para desarrollo).

## Estructura

```
app/                       rutas (Expo Router)
├── _layout.tsx            Stack raíz y control de sesión
├── login.tsx, registro.tsx, modal.tsx (perfil)
├── (tabs)/                extracurriculares · index (cursos) · two (informes)
├── curso/                 [id].tsx (detalle por unidad) · notas-estadisticas.tsx
└── informe/               [id].tsx (vista previa)
src/
├── components/            componentes reutilizables (cursos, informes, modales)
├── context/               AuthContext (sesión)
├── database/              schema.ts (tablas) · client.ts (creación y migraciones)
├── hooks/                 useInformes
├── models/                tipos TypeScript
├── services/              acceso a datos: auth, cursos, evidencias, estadísticas, informes, PDF
└── utils/                 cálculos puros (regla del 20 %, fechas)
```

## Equipo

| Integrante | GitHub | Módulo |
|---|---|---|
| Jhefferson Leon Chupillon | [@LCJhefferson](https://github.com/LCJhefferson) | Base: login, registro, cursos, evidencias, BD |
| Cristian Trigoso Santillan | [@luis412xd-lang](https://github.com/luis412xd-lang) | Actividades extracurriculares |
| Jeferson Vela Chappa | [@jeffvc04](https://github.com/jeffvc04) | Notas y estadísticas |
| Geysen Jhosmel Villa Gomez | [@Jhsml](https://github.com/Jhsml) | Diseño UI y generación de informes |
| Donald Mosqueda Vallejos | [@donaldivan1501](https://github.com/donaldivan1501) | Plantilla personalizable del informe |

## Cómo trabajamos

1. Cada integrante trabaja en **su propia rama** creada desde `main` (ej. `cristian/extracurriculares`, `feature/notas-estadisticas`).
2. Nadie sube cambios directo a `main`: se abre un **pull request** y Jhefferson lo revisa y lo une.
3. Antes de empezar algo nuevo, crea la rama desde el `main` actualizado:
   ```bash
   git switch main
   git pull
   git switch -c tu-nombre/tu-modulo
   ```
4. No modifiques archivos de otro módulo sin avisar a su responsable.

## Pendiente (siguientes unidades)

- Exportar el informe a Word e incluir el gráfico en el PDF.
- Pantalla de plantilla personalizable (el PDF ya la lee de la tabla `plantillas`).
- Corregir la lectura de Excel con columna inexistente y decimales con coma.
- Cifrar contraseñas y backend con autenticación JWT.
