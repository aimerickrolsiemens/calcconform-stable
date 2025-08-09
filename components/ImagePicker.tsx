import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ImagePickerProps {
  onImageSelected: (imageBase64: string) => void;
  onClose: () => void;
}

export function ImagePicker({ onImageSelected, onClose }: ImagePickerProps) {
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('📸 Traitement image sans compression:', (file.size / 1024 / 1024).toFixed(2), 'Mo');
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        if (base64 && base64.length > 0) {
          console.log('✅ Image traitée avec succès');
          resolve(base64);
        } else {
          reject(new Error('Base64 vide'));
        }
      };
      reader.onerror = () => reject(new Error('Erreur FileReader'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file && file.type.startsWith('image/')) {
      try {
        console.log('📸 Image sélectionnée:', file.name, 'Taille:', file.size, 'Type:', file.type);
        
        // Traiter l'image sans compression
        const processedBase64 = await processImage(file);
        console.log('💾 Image traitée pour stockage');
        
        // Passer l'image traitée
        onImageSelected(processedBase64);
        onClose();
      } catch (error) {
        console.error('Erreur lors du traitement de l\'image:', error);
        onClose();
      }
    }
    
    // Reset input
    target.value = '';
  };

  const handlePhotoClick = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajouter une image</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.singleOption} onPress={handlePhotoClick}>
        <View style={styles.optionIcon}>
          <Camera size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.optionContent}>
          <Text style={styles.optionTitle}>Ajouter une photo</Text>
        </View>
      </TouchableOpacity>

      {/* Inputs cachés pour web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFileSelect(e as any)}
        />
      )}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  options: {
    gap: 12,
  },
  singleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    textAlign: 'center',
  },
});