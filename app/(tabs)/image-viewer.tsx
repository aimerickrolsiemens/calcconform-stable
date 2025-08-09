import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function ImageViewerScreen() {
  const { imageUri, imageIndex, totalImages, allImages, noteId, returnTo } = useLocalSearchParams<{ 
    imageUri: string; 
    imageIndex?: string; 
    totalImages?: string; 
    allImages?: string;
    noteId?: string;
    returnTo?: string;
  }>();

  // Initialiser l'index à partir du paramètre à chaque rendu
  const initialIndex = parseInt(imageIndex || '1') - 1;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Parse all images from the parameter
  const images = allImages ? JSON.parse(decodeURIComponent(allImages)) : [imageUri];
  const totalCount = images.length;

  // Réinitialiser l'index quand les paramètres changent
  useEffect(() => {
    const newIndex = parseInt(imageIndex || '1') - 1;
    setCurrentIndex(newIndex);
  }, [imageIndex, imageUri]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < totalCount - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleClose = () => {
    try {
      console.log('🔙 Fermeture visualiseur - returnTo:', returnTo, 'noteId:', noteId);
      
      // Logique simplifiée et claire
      if (returnTo === 'create') {
        console.log('📝 Retour vers création de note');
        // CORRIGÉ : Ajouter le paramètre preserveData pour éviter la réinitialisation
        router.replace('/(tabs)/note/create?preserveData=true');
      } else if (returnTo === 'edit' && noteId) {
        console.log('✏️ Retour vers édition de note:', noteId);
        router.replace(`/(tabs)/note/edit/${noteId}`);
      } else if (noteId) {
        console.log('📖 Retour vers détail de note:', noteId);
        router.replace(`/(tabs)/note/${noteId}`);
      } else {
        console.log('🔙 Retour simple');
        router.back();
      }
    } catch (error) {
      console.error('❌ Erreur navigation visualiseur:', error);
      // Fallback sécurisé
      if (noteId) {
        router.replace(`/(tabs)/note/${noteId}`);
      } else {
        router.replace('/(tabs)/notes');
      }
    }
  };

  const styles = createStyles();

  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden={Platform.OS !== 'web'} />
      
      {/* Bouton fermer fixe */}
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={handleClose}
        activeOpacity={0.7}
      >
        <X size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Compteur d'images */}
      {totalCount > 1 && (
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {totalCount}
          </Text>
        </View>
      )}

      {/* Boutons de navigation (si plusieurs images) */}
      {totalCount > 1 && (
        <>
          {currentIndex > 0 && (
            <TouchableOpacity 
              style={[styles.navButton, styles.navButtonLeft]} 
              onPress={goToPrevious}
              activeOpacity={0.7}
            >
              <ChevronLeft size={32} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          {currentIndex < totalCount - 1 && (
            <TouchableOpacity 
              style={[styles.navButton, styles.navButtonRight]} 
              onPress={goToNext}
              activeOpacity={0.7}
            >
              <ChevronRight size={32} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Image plein écran */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: images[currentIndex] }}
          style={styles.image}
          resizeMode="contain"
          onLoad={() => console.log('✅ Image chargée dans le visualiseur')}
          onError={(error) => console.error('❌ Erreur chargement image visualiseur:', error)}
        />
      </View>

      {/* Indicateurs de points (si plusieurs images) */}
      {totalCount > 1 && (
        <View style={styles.dotsContainer}>
          {images.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive
              ]}
              onPress={() => setCurrentIndex(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  counter: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 10,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    marginTop: -30,
  },
  navButtonLeft: {
    left: 20,
  },
  navButtonRight: {
    right: 20,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 40 : 80,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 12,
    height: 8,
    borderRadius: 4,
  },
});