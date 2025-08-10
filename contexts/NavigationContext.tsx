import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BackHandler, Platform } from 'react-native';
import { router } from 'expo-router';

interface NavigationContextType {
  navigate: (path: string) => void;
  goBack: () => void;
  canGoBack: () => boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const navigate = (path: string) => {
    try {
      router.push(path);
    } catch (error) {
      console.error('Erreur de navigation:', error);
    }
  };

  const goBack = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push('/(tabs)/');
      }
    } catch (error) {
      console.error('Erreur de retour:', error);
      router.push('/(tabs)/');
    }
  };

  const canGoBack = () => {
    try {
      return router.canGoBack();
    } catch (error) {
      return false;
    }
  };

  return (
    <NavigationContext.Provider value={{ navigate, goBack, canGoBack }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}