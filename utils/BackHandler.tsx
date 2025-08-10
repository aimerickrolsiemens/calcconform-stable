import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { router } from 'expo-router';

/**
 * Hook pour gérer le retour natif avec la même logique que les boutons internes
 */
export function useNativeBackHandler(customBackAction?: () => void, isHomePage?: boolean) {
  useEffect(() => {
    // Seulement sur Android et iOS (pas web)
    if (Platform.OS === 'web') return;

    const backAction = () => {
      try {
        console.log('📱 Retour natif déclenché - isHomePage:', isHomePage);
        
        // Si on est sur la page d'accueil, laisser le comportement par défaut (fermer l'app)
        if (isHomePage) {
          console.log('🏠 Page d\'accueil - fermeture de l\'app autorisée');
          return false;
        }

        // Si il y a une action personnalisée (même logique que le bouton "<"), l'exécuter
        if (customBackAction) {
          console.log('🔙 Exécution de l\'action retour personnalisée (même que bouton "<")');
          customBackAction();
          return true; // Empêcher le comportement par défaut
        }

        // Fallback : utiliser l'historique d'expo-router si disponible
        if (router.canGoBack()) {
          console.log('📱 Retour via expo-router');
          router.back();
          return true;
        }

        // Si aucune navigation possible, laisser le comportement par défaut
        console.log('📱 Aucune navigation possible, fermeture de l\'app');
        return false;
      } catch (error) {
        console.warn('Erreur dans useNativeBackHandler:', error);
        return false;
      }
    };

    // Ajouter l'écouteur d'événement
    let backHandler: any = null;
    try {
      backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      console.log('✅ BackHandler configuré avec action personnalisée');
    } catch (error) {
      console.warn('Erreur lors de l\'ajout du BackHandler:', error);
      return;
    }

    // Nettoyer l'écouteur au démontage
    return () => {
      try {
        if (backHandler && backHandler.remove) {
          backHandler.remove();
          console.log('🧹 BackHandler nettoyé');
        }
      } catch (error) {
        console.warn('Erreur lors du nettoyage BackHandler:', error);
      }
    };
  }, [customBackAction, isHomePage]);
}

/**
 * Hook pour gérer le double appui pour quitter (page d'accueil uniquement)
 */
export function useDoubleBackToExit() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let backPressCount = 0;
    let backPressTimer: NodeJS.Timeout | null = null;

    const handleBackPress = () => {
      try {
        if (backPressCount === 0 || !backPressTimer) {
          backPressCount = 1;
          console.log('📱 Premier appui retour - appuyez encore pour quitter');
          
          // Réinitialiser le compteur après 2 secondes
          backPressTimer = setTimeout(() => {
            backPressCount = 0;
            backPressTimer = null;
          }, 2000);
          
          return true; // Empêcher le comportement par défaut
        } 
        
        // C'est le deuxième appui dans la fenêtre de temps
        console.log('📱 Deuxième appui retour - fermeture de l\'app');
        return false; // Laisser le comportement par défaut (quitter l'app)
      } catch (error) {
        console.warn('Erreur dans useDoubleBackToExit:', error);
        return false;
      }
    };

    let backHandler: any = null;
    try {
      backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    } catch (error) {
      console.warn('Erreur lors de l\'ajout du DoubleBackToExit:', error);
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
        console.warn('Erreur lors du nettoyage DoubleBackToExit:', error);
      }
    };
  }, []);
}