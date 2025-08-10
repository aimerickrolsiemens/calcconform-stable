import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BackHandler, Platform } from 'react-native';
import { router } from 'expo-router';

interface NavigationState {
  currentPath: string;
  params?: Record<string, any>;
  title?: string;
}

interface NavigationContextType {
  currentState: NavigationState;
  canGoBack: boolean;
  navigate: (path: string, params?: Record<string, any>, title?: string) => void;
  goBack: () => boolean;
  replace: (path: string, params?: Record<string, any>, title?: string) => void;
  getHistoryLength: () => number;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [navigationStack, setNavigationStack] = useState<NavigationState[]>([
    { currentPath: '/(tabs)/', title: 'Projets' }
  ]);

  const currentState = navigationStack[navigationStack.length - 1];
  const canGoBack = navigationStack.length > 1;

  // Fonction centralisée de retour logique
  const handleLogicalBack = (): boolean => {
    console.log('🔙 handleLogicalBack appelé - Stack length:', navigationStack.length);
    
    if (navigationStack.length <= 1) {
      console.log('🏠 Déjà à l\'accueil, pas de retour possible');
      return false; // Laisser le comportement par défaut (fermer l'app)
    }

    // Retirer la page actuelle de la pile
    setNavigationStack(prev => {
      const newStack = prev.slice(0, -1);
      const previousState = newStack[newStack.length - 1];
      
      console.log('📱 Retour vers:', previousState.currentPath);
      
      // Naviguer vers la page précédente
      try {
        if (previousState.params) {
          router.push({
            pathname: previousState.currentPath,
            params: previousState.params
          });
        } else {
          router.push(previousState.currentPath);
        }
      } catch (error) {
        console.error('❌ Erreur navigation retour:', error);
        // Fallback vers router.back()
        if (router.canGoBack()) {
          router.back();
        }
      }
      
      return newStack;
    });

    return true; // Retour géré
  };

  // Fonction pour naviguer vers une nouvelle page
  const navigate = (path: string, params?: Record<string, any>, title?: string) => {
    console.log('➡️ Navigation vers:', path, params ? 'avec params' : 'sans params');
    
    const newState: NavigationState = {
      currentPath: path,
      params,
      title
    };

    // Ajouter à la pile
    setNavigationStack(prev => [...prev, newState]);

    // Naviguer avec expo-router
    try {
      if (params) {
        router.push({
          pathname: path,
          params
        });
      } else {
        router.push(path);
      }
    } catch (error) {
      console.error('❌ Erreur navigation:', error);
      // Retirer de la pile en cas d'erreur
      setNavigationStack(prev => prev.slice(0, -1));
    }
  };

  // Fonction pour remplacer la page actuelle (sans ajouter à l'historique)
  const replace = (path: string, params?: Record<string, any>, title?: string) => {
    console.log('🔄 Remplacement vers:', path);
    
    const newState: NavigationState = {
      currentPath: path,
      params,
      title
    };

    // Remplacer la page actuelle dans la pile
    setNavigationStack(prev => {
      const newStack = [...prev];
      newStack[newStack.length - 1] = newState;
      return newStack;
    });

    // Naviguer avec expo-router
    try {
      if (params) {
        router.replace({
          pathname: path,
          params
        });
      } else {
        router.replace(path);
      }
    } catch (error) {
      console.error('❌ Erreur remplacement:', error);
    }
  };

  const getHistoryLength = () => navigationStack.length;

  // Gestion du retour natif sur mobile
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const backAction = () => {
      return handleLogicalBack();
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigationStack.length]);

  // Gestion du retour natif sur web (bouton retour navigateur, geste retour)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handlePopState = (event: PopStateEvent) => {
      console.log('🌐 PopState détecté sur web');
      event.preventDefault();
      handleLogicalBack();
    };

    // Ajouter un état à l'historique du navigateur pour chaque navigation
    const currentUrl = window.location.href;
    if (!window.history.state || window.history.state.navigationId !== currentState.currentPath) {
      window.history.pushState(
        { navigationId: currentState.currentPath },
        currentState.title || '',
        currentUrl
      );
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentState, navigationStack.length]);

  // Double appui pour quitter sur Android (page d'accueil uniquement)
  useEffect(() => {
    if (Platform.OS !== 'android' || navigationStack.length > 1) return;

    let backPressCount = 0;
    let backPressTimer: NodeJS.Timeout | null = null;

    const handleDoubleBackPress = () => {
      if (backPressCount === 0) {
        backPressCount = 1;
        console.log('📱 Premier appui retour sur accueil - appuyez encore pour quitter');
        
        backPressTimer = setTimeout(() => {
          backPressCount = 0;
          backPressTimer = null;
        }, 2000);
        
        return true; // Empêcher le comportement par défaut
      }
      
      console.log('📱 Deuxième appui retour - fermeture de l\'app');
      return false; // Laisser fermer l'app
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleDoubleBackPress);
    
    return () => {
      if (backPressTimer) clearTimeout(backPressTimer);
      backHandler.remove();
    };
  }, [navigationStack.length]);

  return (
    <NavigationContext.Provider value={{
      currentState,
      canGoBack,
      navigate,
      goBack: handleLogicalBack,
      replace,
      getHistoryLength
    }}>
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