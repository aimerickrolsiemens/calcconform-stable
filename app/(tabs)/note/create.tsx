import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { NoteImageGallery } from '@/components/NoteImageGallery';
import { useStorage } from '@/contexts/StorageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { compressImageFromFile, validateImageBase64, formatFileSize } from '@/utils/imageCompression';
import { useCallback } from 'react';

export default function CreateNoteScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { createNote, notes } = useStorage();
  const { preserveData } = useLocalSearchParams<{ preserveData?: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ content?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shouldReset, setShouldReset] = useState(true);

  // Réinitialiser le formulaire au focus de la page
  useFocusEffect(
    useCallback(() => {
      console.log('📝 Page de création de note focalisée - shouldReset:', shouldReset);
      
      // Réinitialiser le formulaire si nécessaire
      if (shouldReset) {
        console.log('🔄 Réinitialisation du formulaire');
        setTitle('');
        setDescription('');
        setLocation('');
        setTags('');
        setContent('');
        setImages([]);
        setErrors({});
        setLoading(false);
        setShouldReset(false);
      }
    }, [shouldReset])
  );

  const handleBack = () => {
    safeNavigate('/(tabs)/notes');
  };

  const safeNavigate = (path: string) => {
    try {
      if (router.canGoBack !== undefined) {
        router.push(path);
      } else {
        setTimeout(() => {
          router.push(path);
        }, 100);
      }
    } catch (error) {
      console.error('Erreur de navigation:', error);
      setTimeout(() => {
        try {
          router.push(path);
        } catch (retryError) {
          console.error('Erreur de navigation retry:', retryError);
        }
      }, 200);
    }
  };

  const validateForm = () => {
    // CORRECTION: Validation améliorée pour éviter les créations vides
    const newErrors: { content?: string } = {};
    
    // Vérifier qu'il y a au moins du contenu OU des images valides
    const hasContent = content.trim().length > 0;
    const hasValidImages = images.length > 0 && images.some(img => 
      img && typeof img === 'string' && img.startsWith('data:image/')
    );
    
    if (!hasContent && !hasValidImages) {
      newErrors.content = 'Veuillez ajouter du contenu ou des images à votre note';
    }
    
    // Vérifier la limite d'images pour éviter les problèmes de performance
    if (images.length > 20) {
      newErrors.content = 'Limite de 20 images par note dépassée';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    
    console.log('🚀 Début création note avec:', {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      tags: tags.trim(),
      content: content.trim(),
      imagesCount: images.length
    });

    setLoading(true);
    try {
      // Générer un titre automatique si aucun titre n'est fourni
      let finalTitle = title.trim();
      if (!finalTitle) {
        const existingTitles = notes.map(n => n.title).filter(t => t.startsWith('Note sans titre'));
        const nextNumber = existingTitles.length + 1;
        finalTitle = `Note sans titre ${nextNumber}`;
      }
      
      // CORRECTION MAJEURE: Validation et préparation des images pour éviter les échecs de création
      console.log('📸 Validation des images avant création...');
      const validImages: string[] = [];
      
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img && typeof img === 'string' && img.trim() !== '' && img.startsWith('data:image/')) {
          try {
            // Vérifier que l'image n'est pas corrompue en tentant de la parser
            const base64Data = img.split(',')[1];
            if (base64Data && base64Data.length > 100) {
              validImages.push(img);
              console.log(`✅ Image ${i + 1} validée pour création`);
            } else {
              console.warn(`⚠️ Image ${i + 1} trop petite ou corrompue, ignorée`);
            }
          } catch (error) {
            console.warn(`⚠️ Image ${i + 1} corrompue, ignorée:`, error);
          }
        } else {
          console.warn(`⚠️ Image ${i + 1} invalide, ignorée`);
        location: location.trim() || undefined,
        tags: tags.trim() || undefined,
        content: content.trim(),
        images: validImages.length > 0 ? validImages : undefined
      };
      
      console.log('📋 Données finales de la note à créer:', {
        title: noteData.title,
        hasDescription: !!noteData.description,
        hasLocation: !!noteData.location,
        hasTags: !!noteData.tags,
        contentLength: noteData.content.length,
        finalImagesCount: noteData.images?.length || 0,
        hasImages: !!noteData.images
      });
      
      console.log('📋 Données finales de la note à créer:', {
        title: noteData.title,
        hasDescription: !!noteData.description,
        hasLocation: !!noteData.location,
        hasTags: !!noteData.tags,
        contentLength: noteData.content.length,
        finalImagesCount: noteData.images?.length || 0,
        hasImages: !!noteData.images
      });
      
      // Vérifier la taille totale des données avant création
      const dataSize = JSON.stringify(noteData).length;
      const dataSizeMB = (dataSize / 1024 / 1024).toFixed(2);
      console.log(`📊 Taille totale des données: ${dataSizeMB} MB`);
      
      // Limite de sécurité pour éviter les échecs de stockage
      if (dataSize > 50 * 1024 * 1024) { // 50MB max
        console.error('❌ Données trop volumineuses pour le stockage:', dataSizeMB, 'MB');
        Alert.alert(
          'Note trop volumineuse',
          `La note (${dataSizeMB}MB) dépasse la limite de stockage. Réduisez le nombre d'images.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      console.log('💾 Tentative de création de la note...');
      
      // Créer la note avec gestion d'erreur améliorée
      let note;
      try {
        note = await createNote(noteData);
      } catch (createError) {
        console.error('❌ Erreur spécifique createNote:', createError);
        
        // Si l'erreur est liée aux images, essayer sans les images
        if (validImages.length > 0) {
          console.log('🔄 Tentative de création sans images...');
          try {
            const noteDataWithoutImages = {
              ...noteData,
              images: undefined
            };
            note = await createNote(noteDataWithoutImages);
            
            if (note) {
              Alert.alert(
                'Note créée partiellement',
                'La note a été créée mais les images n\'ont pas pu être sauvegardées. Vous pouvez les ajouter depuis la page d\'édition.',
                [{ text: 'OK' }]
              );
            }
          } catch (fallbackError) {
            console.error('❌ Erreur création fallback:', fallbackError);
            throw createError; // Relancer l'erreur originale
          }
        } else {
          throw createError; // Relancer l'erreur si pas d'images
        }
      }
      
      if (note) {
        console.log('✅ Note créée avec succès:', note.id);
        console.log('✅ Images dans la note créée:', note.images?.length || 0);
        
        // Marquer qu'il faut réinitialiser le formulaire au prochain focus
        setShouldReset(true);
        
        // Navigation sécurisée avec délai pour éviter les conflits
        setTimeout(() => {
          safeNavigate(`/(tabs)/note/${note.id}`);
        }, 100);
      } else {
        console.error('❌ createNote a retourné null - problème dans StorageContext');
        Alert.alert('Erreur', 'Impossible de créer la note. Veuillez réessayer.');
        setShouldReset(true);
        setTimeout(() => {
          safeNavigate('/(tabs)/notes');
        }, 100);
      }
    } catch (error) {
      console.error('❌ Erreur générale lors de la création de la note:', error);
      console.error('❌ Stack trace:', error.stack);
      
      // Message d'erreur plus informatif
      const errorMessage = error.message || 'Erreur inconnue';
      Alert.alert(
        'Erreur de création',
        `Impossible de créer la note: ${errorMessage}. Essayez avec moins d'images.`,
        [{ text: 'OK' }]
      );
      
      setShouldReset(true);
      setTimeout(() => {
        safeNavigate('/(tabs)/notes');
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const processImage = async (file: File): Promise<string> => {
    console.log('📸 Traitement image création avec compression:', file.name, formatFileSize(file.size));
    
    // Vérification de la taille avant traitement
    const maxSize = 50 * 1024 * 1024; // 50MB max par image (augmenté pour permettre la compression)
    if (file.size > maxSize) {
      throw new Error(`Image trop volumineuse: ${formatFileSize(file.size)} > ${formatFileSize(maxSize)}`);
    }
    
    try {
      // Compresser l'image avec des paramètres optimisés
      const compressionResult = await compressImageFromFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85, // Qualité élevée pour garder la lisibilité
        format: 'jpeg'
      });
      
      console.log('✅ Image création compressée avec succès:');
      console.log(`   Taille originale: ${formatFileSize(compressionResult.originalSize)}`);
      console.log(`   Taille compressée: ${formatFileSize(compressionResult.compressedSize)}`);
      console.log(`   Compression: ${compressionResult.compressionRatio.toFixed(1)}%`);
      
      return compressionResult.compressedBase64;
    } catch (error) {
      console.error('❌ Erreur compression image création:', error);
      throw new Error('Impossible de traiter l\'image');
    }
  };

  const handleAddImage = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    
    if (files && files.length > 0) {
      // Vérifier la taille totale et le nombre d'images
      const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
      const totalSizeMB = totalSize / 1024 / 1024;
      const newTotalImages = images.length + files.length;
      
      if (totalSizeMB > 50) {
        console.warn('⚠️ Taille totale trop importante:', totalSizeMB.toFixed(2), 'MB');
        Alert.alert(
          'Images trop volumineuses',
          `La taille totale des images (${totalSizeMB.toFixed(1)}MB) dépasse la limite de 50MB.`,
          [{ text: 'OK' }]
        );
        target.value = '';
        return;
      }
      
      if (newTotalImages > 20) {
        console.warn('⚠️ Limite d\'images atteinte (20 max)');
        Alert.alert(
          'Limite d\'images atteinte',
          'Vous ne pouvez pas ajouter plus de 20 images par note.',
          [{ text: 'OK' }]
        );
        target.value = '';
        return;
      }
      
      try {
        console.log('📸 Images sélectionnées:', files.length);
        
        // CORRECTION MAJEURE : Traitement séquentiel avec gestion d'erreur robuste
        const processedImages: string[] = [];
        const failedImages: string[] = [];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          if (!file || !file.type.startsWith('image/')) {
            console.warn(`⚠️ Fichier ${i} ignoré (pas une image):`, file?.type);
            failedImages.push(file?.name || `Fichier ${i + 1}`);
            continue;
          }
          
          try {
            console.log(`📸 Traitement image ${i + 1}/${files.length}:`, file.name);
            
            // Vérification de la taille avant traitement
            if (file.size > 20 * 1024 * 1024) { // 20MB max par fichier
              console.warn(`⚠️ Fichier ${file.name} trop volumineux:`, (file.size / 1024 / 1024).toFixed(2), 'MB');
              failedImages.push(file.name);
              continue;
            }
            
            const compressedImage = await processImage(file);
            
            if (compressedImage && validateImageBase64(compressedImage)) {
              processedImages.push(compressedImage);
              console.log(`✅ Image ${i + 1} traitée et validée avec succès`);
            } else {
              console.error(`❌ Image ${i + 1} invalide après traitement`);
              failedImages.push(file.name);
            }
            
            // Pause pour éviter de bloquer l'UI
            if (i < files.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (error) {
            console.error(`❌ Erreur traitement image ${i + 1}:`, error);
            failedImages.push(file.name);
          }
        }
        
        // Ajouter toutes les images traitées avec succès
        if (processedImages.length > 0) {
          setImages(prev => [...prev, ...processedImages]);
          console.log(`✅ ${processedImages.length}/${files.length} images ajoutées avec succès`);
          
          // Afficher un message informatif si certaines images ont échoué
          if (failedImages.length > 0) {
            Alert.alert(
              'Images partiellement ajoutées',
              `${processedImages.length} image(s) ajoutée(s) avec succès.\n${failedImages.length} image(s) ignorée(s) (format invalide ou trop volumineuse).`,
              [{ text: 'OK' }]
            );
          }
        } else {
          console.warn('⚠️ Aucune image n\'a pu être traitée');
          Alert.alert(
            'Aucune image ajoutée', 
            'Aucune image n\'a pu être traitée. Vérifiez que les fichiers sont des images valides et pas trop volumineuses.',
            [{ text: 'OK' }]
          );
        }
        
      } catch (error) {
        console.error('❌ Erreur générale lors du traitement des images:', error);
        Alert.alert(
          'Erreur de traitement', 
          'Erreur lors du traitement des images. Essayez avec moins d\'images ou des fichiers plus petits.',
          [{ text: 'OK' }]
        );
      }
    }
    
    // Réinitialiser l'input
    target.value = '';
  };


  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Header
        title={strings.newNote}
        onBack={handleBack}
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Input
            label={strings.noteTitle}
            value={title}
            onChangeText={setTitle}
          />

          <Input
            label={strings.description}
            value={description}
            onChangeText={setDescription}
          />

          <Input
            label="Lieu"
            value={location}
            onChangeText={setLocation}
          />

          <Input
            label="Mots-clés"
            value={tags}
            onChangeText={setTags}
          />

          <NoteImageGallery 
            images={images}
            onRemoveImage={handleRemoveImage}
            editable={true}
            disableViewer={true}
          />

          <View style={styles.imageButtonContainer}>
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleAddImage}
            >
              <Camera size={16} color={theme.colors.primary} />
              <Text style={styles.addPhotoText}>Ajouter une photo</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.contentLabel}>{strings.noteContent}</Text>
          <TextInput
            style={styles.contentTextInput}
            value={content}
            onChangeText={setContent}
            placeholder={strings.writeYourNote}
            placeholderTextColor={theme.colors.textTertiary}
            multiline={true}
            textAlignVertical="top"
            scrollEnabled={true}
            autoCorrect={true}
            spellCheck={true}
            returnKeyType="default"
            blurOnSubmit={false}
          />
          {errors.content && (
            <Text style={styles.errorText}>{errors.content}</Text>
          )}

          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e as any)}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.fixedFooter}>
        <Button
          title={loading ? "Création..." : strings.createNote}
          onPress={handleCreate}
          disabled={false}
          style={styles.footerButton}
        />
      </View>

    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 140, // Espace augmenté pour le bouton fixe
  },
  imageButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 36,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addPhotoText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.primary,
  },
  contentLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
    marginBottom: 12,
    marginTop: 16,
  },
  contentTextInput: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text,
    lineHeight: 24,
    minHeight: 200,
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' && {
      outlineWidth: 0,
      resize: 'none',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }),
  },
  fixedFooter: {
    position: Platform.OS === 'web' ? 'fixed' : 'absolute',
    bottom: Platform.OS === 'web' ? 20 : 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  footerButton: {
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.error,
    marginTop: 8,
  },
});