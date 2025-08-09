/**
 * Utilitaires de compression d'images pour l'application Siemens CalcConform
 * Optimisé pour réduire la taille des données tout en préservant la qualité visuelle
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp';
}

export interface CompressionResult {
  compressedBase64: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Compresse une image à partir d'un fichier File
 */
export async function compressImageFromFile(
  file: File, 
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    console.log('📸 Début compression image:', file.name, (file.size / 1024 / 1024).toFixed(2), 'MB');
    
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context non disponible'));
      return;
    }

    img.onload = () => {
      try {
        // Calculer les nouvelles dimensions en préservant le ratio
        const { width: newWidth, height: newHeight } = calculateDimensions(
          img.width, 
          img.height, 
          maxWidth, 
          maxHeight
        );

        console.log(`📐 Redimensionnement: ${img.width}x${img.height} → ${newWidth}x${newHeight}`);

        // Configurer le canvas
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Améliorer la qualité de rendu
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convertir en base64 avec compression
        const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(mimeType, quality);

        // Calculer les statistiques de compression
        const originalSize = file.size;
        const compressedSize = Math.round((compressedBase64.length * 3) / 4); // Approximation base64
        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

        console.log('✅ Compression terminée:');
        console.log(`   Taille originale: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Taille compressée: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Ratio de compression: ${compressionRatio.toFixed(1)}%`);

        resolve({
          compressedBase64,
          originalSize,
          compressedSize,
          compressionRatio
        });

      } catch (error) {
        console.error('❌ Erreur lors de la compression:', error);
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Impossible de charger l\'image pour compression'));
    };

    // Charger l'image depuis le fichier
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Erreur FileReader'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresse une image à partir d'une chaîne base64
 */
export async function compressImageFromBase64(
  base64: string, 
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    console.log('📸 Début compression base64, taille:', (base64.length / 1024).toFixed(2), 'KB');
    
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context non disponible'));
      return;
    }

    img.onload = () => {
      try {
        const { width: newWidth, height: newHeight } = calculateDimensions(
          img.width, 
          img.height, 
          maxWidth, 
          maxHeight
        );

        canvas.width = newWidth;
        canvas.height = newHeight;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(mimeType, quality);

        const originalSize = Math.round((base64.length * 3) / 4);
        const compressedSize = Math.round((compressedBase64.length * 3) / 4);
        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

        console.log('✅ Compression base64 terminée:');
        console.log(`   Ratio de compression: ${compressionRatio.toFixed(1)}%`);

        resolve({
          compressedBase64,
          originalSize,
          compressedSize,
          compressionRatio
        });

      } catch (error) {
        console.error('❌ Erreur lors de la compression base64:', error);
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Impossible de charger l\'image base64 pour compression'));
    };

    img.src = base64;
  });
}

/**
 * Calcule les nouvelles dimensions en préservant le ratio d'aspect
 */
function calculateDimensions(
  originalWidth: number, 
  originalHeight: number, 
  maxWidth: number, 
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // Si l'image est déjà plus petite que les limites, la garder telle quelle
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  // Calculer le ratio de redimensionnement
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const ratio = Math.min(widthRatio, heightRatio);

  // Appliquer le ratio
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  return { width, height };
}

/**
 * Valide qu'une image base64 est correcte
 */
export function validateImageBase64(base64: string): boolean {
  if (!base64 || typeof base64 !== 'string') {
    return false;
  }

  // Vérifier le format base64 d'image
  if (!base64.startsWith('data:image/')) {
    return false;
  }

  // Vérifier qu'il y a des données après l'en-tête
  const commaIndex = base64.indexOf(',');
  if (commaIndex === -1 || base64.length - commaIndex < 100) {
    return false;
  }

  return true;
}

/**
 * Obtient la taille approximative d'une image base64 en bytes
 */
export function getBase64Size(base64: string): number {
  if (!base64) return 0;
  
  // Approximation : base64 fait environ 4/3 de la taille originale
  const commaIndex = base64.indexOf(',');
  if (commaIndex === -1) return 0;
  
  const dataLength = base64.length - commaIndex - 1;
  return Math.round((dataLength * 3) / 4);
}

/**
 * Formate la taille en bytes en format lisible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}