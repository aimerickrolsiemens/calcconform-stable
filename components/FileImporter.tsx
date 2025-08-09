import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Upload } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useStorage } from '@/contexts/StorageContext';
import { importProjectUniversal, ExportData } from '@/utils/projectExport';

interface FileImporterProps {
  onImportSuccess?: (projectName: string) => void;
  onImportError?: (error: string) => void;
  style?: any;
}

export function FileImporter({ onImportSuccess, onImportError, style }: FileImporterProps) {
  const { theme } = useTheme();
  const { importProject: importProjectToStorage } = useStorage();

  const handleImportClick = async () => {
    console.log('📁 Clic sur bouton import');
    
    try {
      await importProjectUniversal(async (data: ExportData) => {
        try {
          console.log('✅ Données reçues pour import:', data.project.name);
          
          // Importer dans le storage
          const success = await importProjectToStorage(data.project, data.relatedNotes || []);
          
          if (success) {
            Alert.alert(
              'Import réussi',
              `Le projet "${data.project.name}" a été importé avec succès.`
            );
            onImportSuccess?.(data.project.name);
          } else {
            console.error('❌ Import échoué dans le storage');
            Alert.alert('Erreur d\'import', 'Impossible d\'importer le projet. Veuillez réessayer.');
            onImportError?.('Erreur de stockage');
          }
        } catch (error) {
          console.error('❌ Erreur stockage import:', error);
          Alert.alert('Erreur d\'import', 'Erreur lors de l\'import du projet.');
          onImportError?.(`Erreur de stockage: ${error.message || error}`);
        }
      });
    } catch (error) {
      console.error('❌ Erreur générale import:', error);
      onImportError?.(`Erreur d'import: ${error.message || error}`);
    }
  };

  const styles = createStyles(theme);

  return (
    <TouchableOpacity
      style={[styles.compactButton, style]}
      onPress={handleImportClick}
    >
      <Upload size={16} color={theme.colors.primary} />
      <Text style={styles.compactButtonText}>Importer</Text>
    </TouchableOpacity>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  compactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  compactButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
  },
});