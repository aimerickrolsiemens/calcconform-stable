// Types et utilitaires pour les fichiers .calcprojet
export const CALCPROJET_EXTENSION = '.calcprojet';

export const isValidImportFile = (name: string): boolean => {
  if (!name || typeof name !== 'string') {
    return false;
  }
  const lowerName = name.toLowerCase();
  return lowerName.endsWith(CALCPROJET_EXTENSION) || lowerName.endsWith('.json');
};

export const isValidCalcProjetFile = (name: string): boolean => {
  if (!name || typeof name !== 'string') {
    return false;
  }
  return name.toLowerCase().endsWith(CALCPROJET_EXTENSION);
};

export const generateSafeFileName = (projectName: string): string => {
  // Nettoyer le nom du projet : remplacer tous les caractères interdits par _
  const safeName = projectName
    .replace(/[\/\\:*?"<>|]/g, '_') // Caractères interdits Windows/Unix
    .replace(/\s+/g, '_') // Espaces → underscores
    .substring(0, 30); // Limiter la longueur
  
  const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `Projet_${safeName}_${dateString}${CALCPROJET_EXTENSION}`;
};