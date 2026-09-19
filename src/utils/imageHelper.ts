/**
 * Helper untuk validasi dan pemrosesan foto santri
 * Spesifikasi:
 * - Tipe file wajib JPG (.jpg / .jpeg)
 * - Otomatis diubah ukurannya (resize) menjadi 1cm x 1cm (38px x 38px pada resolusi layar standar 96 DPI)
 * - Pemotongan proporsional (Center-crop square 1:1) agar foto tidak gepeng/terdistorsi
 * - Menghasilkan data URL image/jpeg berkualitas tinggi yang ringan untuk database & offline
 */

export const PIXELS_PER_CM = 38; // 1cm = ~37.795px ≈ 38px pada 96 DPI

export interface ProcessedPhotoResult {
  dataUrl: string;
  width: number;
  height: number;
  originalName: string;
  originalSizeKb: number;
  finalSizeKb: number;
}

/**
 * Memvalidasi apakah file yang diunggah bertipe JPG/JPEG
 */
export function isJpgFile(file: File): boolean {
  const validMimes = ['image/jpeg', 'image/pjpeg'];
  const hasJpgExtension = /\.(jpe?g)$/i.test(file.name);
  const isMimeJpg = validMimes.includes(file.type.toLowerCase());

  return isMimeJpg || (hasJpgExtension && (!file.type || file.type.startsWith('image/')));
}

/**
 * Memvalidasi file dan mengembalikan pesan kesalahan jika bukan JPG
 */
export function validateJpgUpload(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Tidak ada file yang dipilih' };
  }

  if (!isJpgFile(file)) {
    const extension = file.name.split('.').pop() || 'unknown';
    return {
      valid: false,
      error: `Format file tidak valid (.${extension}). Sistem hanya menerima file foto berformat JPG (.jpg / .jpeg).`
    };
  }

  // Maksimal ukuran file sumber 10MB sebelum di-resize
  const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
  if (file.size > MAX_SOURCE_BYTES) {
    return {
      valid: false,
      error: 'Ukuran file terlalu besar (maksimal 10MB). Harap pilih file JPG yang lebih kecil.'
    };
  }

  return { valid: true };
}

/**
 * Mengubah ukuran foto yang diunggah menjadi ukuran tepat 1cm x 1cm (38x38 pixel)
 * dalam format JPEG dengan center-crop agar wajah tetap simetris.
 */
export function resizeSantriPhotoTo1cm(file: File): Promise<ProcessedPhotoResult> {
  return new Promise((resolve, reject) => {
    const validation = validateJpgUpload(file);
    if (!validation.valid) {
      reject(new Error(validation.error || 'Format file harus berupa JPG'));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar dari perangkat Anda.'));
    };

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error('File gambar JPG rusak atau tidak dapat diproses browser.'));
      };

      img.onload = () => {
        try {
          const TARGET_SIZE = PIXELS_PER_CM; // 38px = 1cm
          const canvas = document.createElement('canvas');
          canvas.width = TARGET_SIZE;
          canvas.height = TARGET_SIZE;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Browser tidak mendukung pemrosesan grafis canvas.'));
            return;
          }

          // Atur kualitas render gambar
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Background putih untuk latar pas foto
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

          // Center Crop (1:1 aspect ratio)
          const srcW = img.naturalWidth || img.width;
          const srcH = img.naturalHeight || img.height;
          const minDimension = Math.min(srcW, srcH);

          const srcX = (srcW - minDimension) / 2;
          const srcY = (srcH - minDimension) / 2;

          // Gambar ke canvas dengan ukuran tepat 38x38 px (1cm x 1cm)
          ctx.drawImage(
            img,
            srcX,
            srcY,
            minDimension,
            minDimension,
            0,
            0,
            TARGET_SIZE,
            TARGET_SIZE
          );

          // Ekspor kembali ke format JPG murni
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          const originalSizeKb = Math.round(file.size / 1024);
          const finalSizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

          resolve({
            dataUrl,
            width: TARGET_SIZE,
            height: TARGET_SIZE,
            originalName: file.name,
            originalSizeKb,
            finalSizeKb
          });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Kesalahan saat mengubah ukuran gambar.';
          reject(new Error(errMsg));
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
