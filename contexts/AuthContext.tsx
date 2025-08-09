import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  authenticate: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Code d'authentification défini en dur
const AUTHENTICATION_CODE = 'SCC2025';
const AUTH_STORAGE_KEY = 'SIEMENS_AUTHENTICATED';

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthenticationStatus();
  }, []);

  const checkAuthenticationStatus = async () => {
    try {
      console.log('🔐 Vérification du statut d\'authentification...');
      
      let authStatus: string | null = null;
      
      if (Platform.OS === 'web') {
        authStatus = localStorage.getItem(AUTH_STORAGE_KEY);
      } else {
        authStatus = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      }
      
      const isAuth = authStatus === 'true';
      console.log('🔐 Statut d\'authentification:', isAuth ? 'Authentifié' : 'Non authentifié');
      
      setIsAuthenticated(isAuth);
    } catch (error) {
      console.error('❌ Erreur lors de la vérification d\'authentification:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const authenticate = async (code: string): Promise<boolean> => {
    try {
      console.log('🔐 Tentative d\'authentification avec le code:', code);
      
      if (code.trim() === AUTHENTICATION_CODE) {
        console.log('✅ Code d\'authentification correct');
        
        // Sauvegarder l'état d'authentification
        if (Platform.OS === 'web') {
          localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        } else {
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, 'true');
        }
        
        setIsAuthenticated(true);
        return true;
      } else {
        console.log('❌ Code d\'authentification incorrect');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'authentification:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log('🔐 Déconnexion...');
      
      if (Platform.OS === 'web') {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } else {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      }
      
      setIsAuthenticated(false);
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isLoading, 
      authenticate, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}