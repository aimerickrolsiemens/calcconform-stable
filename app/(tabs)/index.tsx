import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput, Platform, Alert, Animated } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Plus, Settings, Building, Star, Trash2, SquareCheck as CheckSquare, Square, X, Upload, Download } from 'lucide-react-native';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import * as Sharing from 'expo-sharing';
import { ProjectCard } from '@/components/ProjectCard';
import { Project } from '@/types';
import { useStorage } from '@/contexts/StorageContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useModal } from '@/contexts/ModalContext';
import { addEventListener } from '@/utils/EventEmitter';
import { LoadingScreen } from '@/components/LoadingScreen';
import { exportProject, getRelatedNotes } from '@/utils/projectExport';
import { isValidCalcProjetFile } from '@/utils/fileTypes';
import { FileImporter } from '@/components/FileImporter';

interface PredefinedZone {
  id: string;
  name: string;
  highShutters: number;
  lowShutters: number;
}

interface PredefinedBuilding {
  id: string;
  name: string;
  zones: PredefinedZone[];
}

interface PredefinedStructure {
  enabled: boolean;
  defaultReferenceFlow?: number;
  buildings: PredefinedBuilding[];
}

export default function ProjectsScreen() {
  const { strings } = useLanguage();
  const { theme } = useTheme();
  const { showModal, hideModal } = useModal();
  const { 
    projects, 
    favoriteProjects, 
    createProject, 
    createBuilding, 
    createFunctionalZone, 
    createShutter, 
    deleteProject, 
    setFavoriteProjects,
    notes,
    importProject: importProjectToStorage
  } = useStorage();
  
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fonction locale pour gérer l'ouverture du modal
  const handleCreateModal = useCallback(() => {
    console.log('📱 Ouverture du modal de création de projet');
    try {
      router.push('/(tabs)/project/create');
    } catch (error) {
      console.error('Erreur de navigation vers création projet:', error);
    }
  }, []);

  const handleExportProject = () => {
    if (projects.length === 0) {
      Alert.alert(
        'Aucun projet',
        'Vous devez créer au moins un projet avant de pouvoir l\'exporter.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    showModal(<ExportProjectModal 
      projects={projects}
      notes={notes}
      onCancel={() => hideModal()}
    />);
  };

  const handleImportSuccess = (projectName: string) => {
    console.log('🎉 Import réussi pour le projet:', projectName);
    // Le projet sera automatiquement visible dans la liste
  };

  const handleImportError = (error: string) => {
    console.error('❌ Erreur import:', error);
  };

  const handleFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) {
      console.log('📁 Aucun fichier sélectionné');
      return;
    }

    console.log('📁 Fichier sélectionné:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Vérifier l'extension .calcprojet (insensible à la casse)
    if (!isValidImportFile(file.name)) {
      const error = `Format invalide: "${file.name}". Attendu: fichier .calcprojet ou .json`;
      console.error('❌', error);
      Alert.alert('Format invalide', 'Veuillez sélectionner un fichier .calcprojet ou .json exporté depuis CalcConform.');
      target.value = '';
      return;
    }

    try {
      console.log('📖 Début lecture fichier avec FileReader...');
      
      // Lire le fichier avec FileReader
      const fileContent = await readFileAsText(file);
      console.log('✅ Fichier lu avec succès, taille:', fileContent.length, 'caractères');

      // Parser le JSON
      let projectData;
      try {
        projectData = JSON.parse(fileContent);
        console.log('✅ JSON parsé avec succès');
        console.log('📊 Structure:', {
          hasProject: !!projectData.project,
          hasVersion: !!projectData.version,
          projectName: projectData.project?.name,
          buildingsCount: projectData.project?.buildings?.length || 0,
          notesCount: projectData.relatedNotes?.length || 0
        });
      } catch (parseError) {
        const error = `Fichier .calcprojet corrompu: ${parseError.message}`;
        console.error('❌ Erreur parsing JSON:', parseError);
        Alert.alert('Fichier corrompu', 'Le fichier .calcprojet ne contient pas de données JSON valides.');
        target.value = '';
        return;
      }

      // Valider la structure
      if (!projectData.project || !projectData.version) {
        const error = 'Structure invalide dans le fichier .calcprojet';
        console.error('❌', error);
        Alert.alert('Fichier invalide', 'Le fichier .calcprojet semble corrompu ou invalide.');
        target.value = '';
        return;
      }

      // Valider les données du projet
      if (!projectData.project.name || !projectData.project.id) {
        const error = 'Données de projet invalides';
        console.error('❌', error);
        Alert.alert('Données invalides', 'Les données de projet dans le fichier .calcprojet sont invalides.');
        target.value = '';
        return;
      }

      console.log('✅ Fichier .calcprojet valide, début import du projet:', projectData.project.name);

      // Importer le projet complet
      const success = await importProjectToStorage(projectData.project, projectData.relatedNotes || []);
      
      if (success) {
        console.log('✅ Import terminé avec succès');
        Alert.alert(
          'Import réussi',
          `Le projet "${projectData.project.name}" a été importé avec succès.`
        );
        handleImportSuccess(projectData.project.name);
      } else {
        console.error('❌ Import échoué dans le storage');
        Alert.alert('Erreur d\'import', 'Impossible d\'importer le projet. Veuillez réessayer.');
      }

    } catch (error) {
      const errorMessage = `Erreur lors de l'import: ${error.message || error}`;
      console.error('❌ Erreur générale import:', error);
      console.error('❌ Stack trace:', error.stack);
      Alert.alert('Erreur d\'import', errorMessage);
    } finally {
      target.value = '';
    }
  };

  // Fonction pour lire un fichier avec FileReader
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          resolve(content);
        } else {
          reject(new Error('Contenu fichier vide'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Erreur FileReader'));
      };
      
      reader.readAsText(file);
    });
  };

  const loadProjects = useCallback(async () => {
    try {
      console.log('📦 Chargement des projets...');
      console.log(`✅ ${projects.length} projets chargés`);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des projets:', error);
    } finally {
      setLoading(false);
    }
  }, [projects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Projects screen focused, reloading data...');
      loadProjects();
      
      // Animation de fondu à l'entrée
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, [loadProjects])
  );

  const generateUniqueId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;


  const handleProjectPress = (project: Project) => {
    if (selectionMode) {
      handleProjectSelection(project.id);
    } else {
      try {
        router.push(`/(tabs)/project/${project.id}`);
      } catch (error) {
        console.error('Erreur navigation vers projet:', error);
        // Fallback avec replace
        router.replace(`/(tabs)/project/${project.id}`);
      }
    }
  };

  const handleProjectLongPress = (project: Project) => {
    if (!selectionMode) {
      setSelectionMode(true);
      handleProjectSelection(project.id);
    }
  };

  const handleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(projectId)) {
        newSelection.delete(projectId);
      } else {
        newSelection.add(projectId);
      }
      return newSelection;
    });
  };

  const handleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedProjects(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedProjects.size === 0) return;

    showModal(<BulkDeleteProjectsModal 
      count={selectedProjects.size}
      onConfirm={() => confirmBulkDeleteProjects()}
      onCancel={() => hideModal()}
      strings={strings}
    />);
  };

  const handleBulkFavorite = async () => {
    if (selectedProjects.size === 0) return;

    const newFavorites = new Set(favoriteProjects);
    for (const projectId of selectedProjects) {
      if (newFavorites.has(projectId)) {
        newFavorites.delete(projectId);
      } else {
        newFavorites.add(projectId);
      }
    }
    
    await setFavoriteProjects(Array.from(newFavorites));
    setSelectedProjects(new Set());
    setSelectionMode(false);
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === sortedProjects.length) {
      // Si tout est sélectionné, tout désélectionner
      setSelectedProjects(new Set());
    } else {
      // Sinon, tout sélectionner
      const allProjectIds = new Set(sortedProjects.map(p => p.id));
      setSelectedProjects(allProjectIds);
    }
  };

  const handleToggleFavorite = async (projectId: string) => {
    // Protection contre null/undefined
    const newFavorites = new Set(favoriteProjects || []);
    if (newFavorites.has(projectId)) {
      newFavorites.delete(projectId);
    } else {
      newFavorites.add(projectId);
    }
    
    await setFavoriteProjects(Array.from(newFavorites));
  };

  const handleEditProject = (project: Project) => {
    router.push(`/(tabs)/project/edit/${project.id}`);
  };

  const handleDeleteProject = async (project: Project) => {
    showModal(<DeleteProjectModal 
      project={project}
      onConfirm={() => confirmDeleteProject(project)}
      onCancel={() => hideModal()}
      strings={strings}
    />);
  };

  const confirmDeleteProject = async (project: Project) => {
    try {
      const success = await deleteProject(project.id);
      if (success) {
        console.log('✅ Projet supprimé avec succès');
        hideModal();
      } else {
        console.error('❌ Erreur: Projet non trouvé pour la suppression');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  // Trier les projets : favoris en premier
  const sortedProjects = [...projects].sort((a, b) => {
    // Protection contre null/undefined
    const aIsFavorite = favoriteProjects?.includes(a.id) || false;
    const bIsFavorite = favoriteProjects?.includes(b.id) || false;
    
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    
    // Si même statut de favori, trier par date de création (plus récent en premier)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const confirmBulkDeleteProjects = async () => {
    try {
      for (const projectId of selectedProjects) {
        const success = await deleteProject(projectId);
        if (!success) {
          console.error('Erreur lors de la suppression du projet:', projectId);
        }
      }
      setSelectedProjects(new Set());
      setSelectionMode(false);
      hideModal();
    } catch (error) {
      console.error('Erreur lors de la suppression en lot:', error);
    }
  };

  const renderProject = ({ item }: { item: Project }) => (
    <ProjectCard
      project={item}
      isFavorite={favoriteProjects?.includes(item.id) || false}
      isSelected={selectedProjects.has(item.id)}
      selectionMode={selectionMode}
      onPress={() => handleProjectPress(item)}
      onLongPress={() => handleProjectLongPress(item)}
      onToggleFavorite={() => handleToggleFavorite(item.id)}
      onEdit={() => handleEditProject(item)}
      onDelete={() => handleDeleteProject(item)}
    />
  );

  const styles = createStyles(theme);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <Header
        title={strings.projectsTitle}
        subtitle={strings.projectsSubtitle}
        rightComponent={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleSelectionMode} style={styles.selectionButton}>
              <Text style={styles.selectionButtonText}>
                {selectionMode ? strings.cancel : 'Sélect.'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreateModal} style={styles.actionButton}>
              <Plus size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      {selectionMode && (
        <View style={styles.selectionToolbar}>
          <Text style={styles.selectionCount}>
            {selectedProjects.size} {strings.selected}{selectedProjects.size > 1 ? 's' : ''}
          </Text>
          <View style={styles.selectionActionsColumn}>
            <TouchableOpacity 
              style={[
                styles.selectAllButton,
                selectedProjects.size === sortedProjects.length 
                  ? styles.selectAllButtonActive 
                  : styles.selectAllButtonInactive
              ]}
              onPress={handleSelectAll}
            >
              {selectedProjects.size === sortedProjects.length ? (
                <CheckSquare size={20} color="#FFFFFF" />
              ) : (
                <Square size={20} color={theme.colors.textTertiary} />
              )}
              <Text style={[
                styles.selectAllButtonText,
                selectedProjects.size === sortedProjects.length 
                  ? styles.selectAllButtonTextActive 
                  : styles.selectAllButtonTextInactive
              ]}>
                {selectedProjects.size === sortedProjects.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Text>
            </TouchableOpacity>
            <View style={styles.selectionActionsRow}>
              <TouchableOpacity 
                style={styles.toolbarButton}
                onPress={handleBulkFavorite}
                disabled={selectedProjects.size === 0}
              >
                <Star size={20} color={selectedProjects.size > 0 ? "#F59E0B" : theme.colors.textTertiary} />
                <Text style={[styles.toolbarButtonText, { color: selectedProjects.size > 0 ? "#F59E0B" : theme.colors.textTertiary }]}>
                  {strings.favorites}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.toolbarButton}
                onPress={handleBulkDelete}
                disabled={selectedProjects.size === 0}
              >
                <Trash2 size={20} color={selectedProjects.size > 0 ? theme.colors.error : theme.colors.textTertiary} />
                <Text style={[styles.toolbarButtonText, { color: selectedProjects.size > 0 ? theme.colors.error : theme.colors.textTertiary }]}>
                  {strings.delete}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.content, Platform.OS === 'web' && styles.contentWeb]}>
        {projects.length === 0 ? (
          <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
            <Building size={64} color={theme.colors.textTertiary} />
            <Text style={styles.emptyTitle}>{strings.noProjects}</Text>
            <Text style={styles.emptySubtitle}>
              {strings.noProjectsDesc}
            </Text>
            <View style={styles.emptyActions}>
              <View style={styles.emptyMainAction}>
                <Button
                  title={strings.createFirstProject}
                  onPress={handleCreateModal}
                  style={styles.createButton}
                />
              </View>
              <View style={styles.emptyImportAction}>
                <FileImporter
                  onImportSuccess={handleImportSuccess}
                  onImportError={handleImportError}
                  style={styles.fileImporter}
                />
              </View>
            </View>
          </Animated.View>
        ) : (
          <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
            <View style={styles.compactActions}>
              <TouchableOpacity
                style={styles.compactButton}
                onPress={handleExportProject}
              >
                <Download size={16} color={theme.colors.primary} />
                <Text style={styles.compactButtonText}>Exporter</Text>
              </TouchableOpacity>
              <FileImporter
                onImportSuccess={handleImportSuccess}
                onImportError={handleImportError}
                style={styles.compactFileImporter}
              />
            </View>
            <FlatList
              data={sortedProjects}
              renderItem={renderProject}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[
                styles.listContainer,
                Platform.OS === 'web' && styles.listContainerWeb
              ]}
            />
          </Animated.View>
        )}
        
        {/* Input caché pour l'import */}
        {Platform.OS === 'web' && (
          <input
            ref={fileInputRef}
            type="file"
            accept=".calcprojet"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e as any)}
          />
        )}
      </View>

    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  contentWeb: {
    paddingBottom: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  selectionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
  },
  actionButton: {
    padding: 8,
  },
  selectionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectionCount: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: theme.colors.text,
  },
  selectionActions: {
    flexDirection: 'column',
    gap: 8,
  },
  selectionActionsColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  selectionActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  selectAllButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  selectAllButtonInactive: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  selectAllButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  selectAllButtonTextActive: {
    color: '#FFFFFF',
  },
  selectAllButtonTextInactive: {
    color: theme.colors.textTertiary,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  toolbarButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  createButton: {
    paddingHorizontal: 32,
  },
  emptyActions: {
    alignItems: 'center',
    gap: 16,
  },
  emptyMainAction: {
    width: '100%',
    alignItems: 'center',
  },
  emptyImportAction: {
    width: '100%',
    alignItems: 'center',
  },
  importOnlyButton: {
    width: '100%',
    paddingHorizontal: 32,
  },
  fileImporter: {
    width: '100%',
  },
  compactActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
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
  compactFileImporter: {
    flex: 1,
  },
  compactButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: theme.colors.textSecondary,
  },
  listContainer: {
    padding: 16,
  },
  listContainerWeb: {
    paddingBottom: 16,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  modalBold: {
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  
  // Styles spécifiques pour le modal d'export avec taille fixe
  exportModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    height: Platform.OS === 'web' ? '70vh' : '80%',
    maxHeight: Platform.OS === 'web' ? 500 : 600,
    flexDirection: 'column',
  },
  
  // Styles pour le modal d'export
  exportContent: {
    flex: 1,
    marginBottom: 20,
  },
  exportDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  projectsListFixed: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  projectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  projectOptionSelected: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  projectOptionContent: {
    flex: 1,
  },
  projectOptionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  projectOptionTitleSelected: {
    color: theme.colors.primary,
  },
  projectOptionStats: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.textSecondary,
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  exportFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  exportButton: {
    flex: 1,
  },
});

// Modal de confirmation pour la suppression en lot
const BulkDeleteProjectsModal = ({ count, onConfirm, onCancel, strings }: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  strings: any;
}) => {
  const { theme } = useTheme();
  const modalStyles = createStyles(theme);

  return (
    <View style={modalStyles.modalContent}>
      <View style={modalStyles.modalHeader}>
        <Text style={modalStyles.modalTitle}>
          {strings.confirmDelete || 'Confirmer la suppression'}
        </Text>
        <TouchableOpacity onPress={onCancel} style={modalStyles.closeButton}>
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={modalStyles.modalBody}>
        <Text style={modalStyles.modalText}>
          {strings.confirmBulkDeleteMessage || `Êtes-vous sûr de vouloir supprimer ${count} projet${count > 1 ? 's' : ''} ?`}
        </Text>
        <Text style={[modalStyles.modalText, modalStyles.modalBold]}>
          {strings.actionIrreversible || 'Cette action est irréversible.'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity
          style={[modalStyles.toolbarButton, { flex: 1, backgroundColor: theme.colors.surfaceSecondary }]}
          onPress={onCancel}
        >
          <Text style={[modalStyles.toolbarButtonText, { color: theme.colors.textSecondary }]}>
            {strings.cancel || 'Annuler'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[modalStyles.toolbarButton, { flex: 1, backgroundColor: theme.colors.error }]}
          onPress={onConfirm}
        >
          <Text style={[modalStyles.toolbarButtonText, { color: 'white' }]}>
            {strings.delete || 'Supprimer'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Modal pour l'export de projet
const ExportProjectModal = ({ projects, notes, onCancel }: {
  projects: Project[];
  notes: Note[];
  onCancel: () => void;
}) => {
  const { theme } = useTheme();
  const { hideModal } = useModal();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const styles = createStyles(theme);

  const handleExport = async () => {
    if (!selectedProjectId) return;
    
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;
    
    setExporting(true);
    try {
      // Trouver les notes liées au projet
      const relatedNotes = getRelatedNotes(project, notes);
      console.log('📝 Notes liées trouvées:', relatedNotes.length);
      
      const success = await exportProject(project, relatedNotes);
      
      if (success) {
        Alert.alert(
          'Export réussi',
          `Le projet "${project.name}" a été exporté avec succès.`,
          [{ 
            text: 'Voir le projet', 
            onPress: () => {
              hideModal();
              // Le projet importé sera visible dans la liste
              setTimeout(() => {
                router.replace('/(tabs)/');
              }, 100);
            }
          }]
        );
      } else {
        console.error('❌ Import .sccf échoué dans le storage');
        Alert.alert(
          'Erreur d\'export',
          'Impossible d\'importer le projet .sccf. Veuillez réessayer.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Erreur générale import .sccf:', error);
      console.error('❌ Stack trace:', error.stack);
      Alert.alert(
        'Erreur d\'export',
        `Le fichier .sccf semble corrompu: ${error.message || error}`,
        [{ text: 'OK' }]
      );
    } finally {
      setExporting(false);
    }
  };

  const getProjectStats = (project: Project) => {
    const buildingCount = project.buildings.length;
    const zoneCount = project.buildings.reduce((total, building) => 
      total + building.functionalZones.length, 0);
    const shutterCount = project.buildings.reduce((total, building) => 
      total + building.functionalZones.reduce((zoneTotal, zone) => 
        zoneTotal + zone.shutters.length, 0), 0);
    const relatedNotesCount = getRelatedNotes(project, notes).length;
    
    return { buildingCount, zoneCount, shutterCount, relatedNotesCount };
  };

  return (
    <View style={styles.exportModalContent}>
      <View style={styles.modalHeader}>
        <Upload size={32} color={theme.colors.primary} />
        <Text style={styles.modalTitle}>Exporter un projet</Text>
        <TouchableOpacity 
          onPress={onCancel}
          style={styles.closeButton}
        >
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.exportContent}>
        <Text style={styles.exportDescription}>
          Sélectionnez le projet à exporter. Un fichier .calcprojet sera créé avec toutes les données du projet.
        </Text>
        
        <ScrollView style={styles.projectsListFixed} showsVerticalScrollIndicator={true}>
          {projects.map((project) => {
            const isSelected = selectedProjectId === project.id;
            const stats = getProjectStats(project);
            
            return (
              <TouchableOpacity
                key={project.id}
                style={[
                  styles.projectOption,
                  isSelected && styles.projectOptionSelected
                ]}
                onPress={() => setSelectedProjectId(project.id)}
              >
                <View style={styles.projectOptionContent}>
                  <Text style={[
                    styles.projectOptionTitle,
                    isSelected && styles.projectOptionTitleSelected
                  ]}>
                    {project.name}
                  </Text>
                  <Text style={styles.projectOptionStats}>
                    {stats.buildingCount} bâtiments • {stats.zoneCount} zones • {stats.shutterCount} volets
                  </Text>
                </View>
                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <CheckSquare size={20} color={theme.colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.exportFooter}>
        <Button
          title="Annuler"
          onPress={onCancel}
          variant="secondary"
          style={styles.exportButton}
        />
        <Button
          title={exporting ? "Export..." : "Exporter"}
          onPress={handleExport}
          disabled={!selectedProjectId || exporting}
          style={styles.exportButton}
        />
      </View>
    </View>
  );
};

// Modal de confirmation pour la suppression d'un projet
const DeleteProjectModal = ({ project, onConfirm, onCancel, strings }: {
  project: Project;
  onConfirm: () => void;
  onCancel: () => void;
  strings: any;
}) => {
  const { theme } = useTheme();
  const modalStyles = createStyles(theme);

  return (
    <View style={modalStyles.modalContent}>
      <View style={modalStyles.modalHeader}>
        <Text style={modalStyles.modalTitle}>Supprimer le projet</Text>
        <TouchableOpacity onPress={onCancel} style={modalStyles.closeButton}>
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={modalStyles.modalBody}>
        <Text style={modalStyles.modalText}>
          <Text>⚠️ </Text>
          <Text style={modalStyles.modalBold}>Cette action est irréversible !</Text>
          <Text>{'\n\n'}</Text>
          <Text>Êtes-vous sûr de vouloir supprimer le projet </Text>
          <Text style={modalStyles.modalBold}>"{project.name}"</Text>
          <Text> ?</Text>
          <Text>{'\n\n'}</Text>
          <Text>Tous les bâtiments, zones et volets associés seront également supprimés.</Text>
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity
          style={[modalStyles.toolbarButton, { flex: 1, backgroundColor: theme.colors.surfaceSecondary }]}
          onPress={onCancel}
        >
          <Text style={[modalStyles.toolbarButtonText, { color: theme.colors.textSecondary }]}>
            {strings.cancel || 'Annuler'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[modalStyles.toolbarButton, { flex: 1, backgroundColor: theme.colors.error }]}
          onPress={onConfirm}
        >
          <Text style={[modalStyles.toolbarButtonText, { color: 'white' }]}>
            Supprimer
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};