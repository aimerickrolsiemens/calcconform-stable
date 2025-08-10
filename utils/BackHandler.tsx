import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { router } from 'expo-router';

/**
 * Custom hook to handle Android back button presses
 * Optimisé pour utiliser la même logique que les boutons retour internes
 */
export function useAndroidBackButton(customBackAction?: () => void, isHomePage?: boolean) {
  useEffect(() => {
    // Seulement sur Android pour éviter les erreurs sur autres plateformes
    if (Platform.OS !== 'android') return;

    const backAction = () => {
      try {
        // Si on est sur la page d'accueil, laisser le comportement par défaut (fermer l'app)
        if (isHomePage) {
          console.log('📱 Page d\'accueil - fermeture de l\'app');
          return false;
        }

        // Si il y a une action personnalisée, l'exécuter
        if (customBackAction) {
          console.log('📱 Exécution action retour personnalisée');
          customBackAction();
          return true;
        }

        // Comportement par défaut : utiliser l'historique de navigation d'expo-router
        if (router.canGoBack()) {
          console.log('📱 Navigation retour via expo-router');
          router.back();
          return true;
        }

        // Si on ne peut pas revenir en arrière, laisser le comportement par défaut
        console.log('📱 Aucune navigation possible, fermeture de l\'app');
        return false;
      } catch (error) {
        if (__DEV__) {
          console.warn('Erreur dans useAndroidBackButton:', error);
        }
        // En cas d'erreur, essayer quand même de revenir en arrière
        try {
          if (router.canGoBack()) {
            router.back();
            return true;
          }
        } catch (fallbackError) {
          console.warn('Erreur fallback navigation:', fallbackError);
        }
        return false;
      }
    };

    // Ajouter l'écouteur d'événement avec gestion d'erreur
    let backHandler: any = null;
    try {
      backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );
    } catch (error) {
      if (__DEV__) {
        console.warn('Erreur lors de l\'ajout du BackHandler:', error);
      }
      return;
    }

    // Nettoyer l'écouteur au démontage
    return () => {
      try {
        if (backHandler && backHandler.remove) {
          backHandler.remove();
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('Erreur lors du nettoyage BackHandler:', error);
        }
      }
    };
  }, [customBackAction, isHomePage]);
}

/**
 * Custom hook pour gérer le double appui pour quitter
 * Optimisé pour APK Android avec gestion d'erreur robuste
 */
export function useDoubleBackToExit() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let backPressCount = 0;
    let backPressTimer: NodeJS.Timeout | null = null;

    const handleBackPress = () => {
      try {
        // Si c'est le premier appui ou que le timer a expiré
        if (backPressCount === 0 || !backPressTimer) {
          backPressCount = 1;
          
          // Réinitialiser le compteur après 2 secondes
          backPressTimer = setTimeout(() => {
            backPressCount = 0;
            backPressTimer = null;
          }, 2000);
          
          return true; // Empêcher le comportement par défaut
        } 
        
        // C'est le deuxième appui dans la fenêtre de temps
        // Laisser le comportement par défaut (quitter l'app)
        return false;
      } catch (error) {
        if (__DEV__) {
          console.warn('Erreur dans useDoubleBackToExit:', error);
        }
        return false;
      }
    };

    let backHandler: any = null;
    try {
      backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        handleBackPress
      );
    } catch (error) {
      if (__DEV__) {
        console.warn('Erreur lors de l\'ajout du DoubleBackToExit:', error);
      }
      return;
    }

    return () => {
      try {
        if (backPressTimer) {
          clearTimeout(backPressTimer);
        }
        if (backHandler && backHandler.remove) {
          backHandler.remove();
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('Erreur lors du nettoyage DoubleBackToExit:', error);
        }
      }
    };
  }, []);
}