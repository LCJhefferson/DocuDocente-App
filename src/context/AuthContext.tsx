// src/context/AuthContext.tsx
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { CredencialesLogin, EntradaRegistro } from '../models/Autenticacion';
import { PerfilDocente } from '../models/PerfilDocente';
import { AuthService } from '../services/authService';
import { PerfilDocenteService } from '../services/perfilDocenteService';

interface AuthContextProps {
  cuentaId: string | null;
  perfilDocente: PerfilDocente | null;
  cargando: boolean;
  iniciarSesion: (credenciales: CredencialesLogin) => Promise<void>;
  registrarse: (entrada: EntradaRegistro) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  recargarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const [perfilDocente, setPerfilDocente] = useState<PerfilDocente | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);

  // Carga inicial del estado de la sesión
  useEffect(() => {
    verificarSesion();
  }, []);

  const verificarSesion = async () => {
    try {
      const idGuardado = await AuthService.obtenerIdCuentaActiva();
      if (idGuardado) {
        setCuentaId(idGuardado);
        const perfil = await PerfilDocenteService.obtenerPorCuentaId(idGuardado);
        setPerfilDocente(perfil);
      }
    } catch (error) {
      console.error('[AuthContext] Error al verificar sesión:', error);
    } finally {
      setCargando(false);
    }
  };

  const recargarPerfil = async () => {
    if (!cuentaId) return;
    const perfil = await PerfilDocenteService.obtenerPorCuentaId(cuentaId);
    setPerfilDocente(perfil);
  };

  const iniciarSesion = async (credenciales: CredencialesLogin) => {
    const id = await AuthService.iniciarSesion(credenciales);
    setCuentaId(id);
    const perfil = await PerfilDocenteService.obtenerPorCuentaId(id);
    setPerfilDocente(perfil);
  };

  const registrarse = async (entrada: EntradaRegistro) => {
    const id = await AuthService.registrarse(entrada);
    setCuentaId(id);
    const perfil = await PerfilDocenteService.obtenerPorCuentaId(id);
    setPerfilDocente(perfil);
  };

  const cerrarSesion = async () => {
    await AuthService.cerrarSesion();
    setCuentaId(null);
    setPerfilDocente(null);
  };

  return (
    <AuthContext.Provider
      value={{
        cuentaId,
        perfilDocente,
        cargando,
        iniciarSesion,
        registrarse,
        cerrarSesion,
        recargarPerfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};