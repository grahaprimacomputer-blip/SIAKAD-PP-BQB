export const DEFAULT_SANTRI_FOTO = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';

export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

export const formatDateIndo = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateStr;
  }
};

export const formatDateShortIndo = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const getTodayDateInput = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ALL_KELAS_OPTIONS = [
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6',
] as const;

export type KelasOption = (typeof ALL_KELAS_OPTIONS)[number];

// Helper: Menghitung daftar kelas santri (multi-kelas)
// Santri yang naik ke Kelas 2, 3, 4, 5, atau 6 memiliki formulir untuk setiap kelas yang telah dicapai
export const getSantriClasses = (santri: { kelas?: string; kelasList?: string[] } | null | undefined): string[] => {
  if (!santri) return ['Kelas 1'];
  
  const currentKelas = santri.kelas || 'Kelas 1';
  const match = currentKelas.match(/\d+/);
  const currentNum = match ? parseInt(match[0], 10) : 1;
  
  // Ambil kelas-kelas dari kelasList jika ada
  const explicitSet = new Set<string>();
  if (Array.isArray(santri.kelasList)) {
    santri.kelasList.forEach(k => {
      if (ALL_KELAS_OPTIONS.includes(k as any)) {
        explicitSet.add(k);
      }
    });
  }

  // Otomatis sertakan semua kelas dari Kelas 1 sampai kelas aktif saat ini
  for (let i = 1; i <= Math.min(6, Math.max(1, currentNum)); i++) {
    explicitSet.add(`Kelas ${i}`);
  }

  // Kembalikan dalam urutan ascending Kelas 1 -> Kelas 6
  return ALL_KELAS_OPTIONS.filter(k => explicitSet.has(k));
};

export const getNextKelas = (currentKelas: string): string => {
  switch (currentKelas) {
    case 'Kelas 1': return 'Kelas 2';
    case 'Kelas 2': return 'Kelas 3';
    case 'Kelas 3': return 'Kelas 4';
    case 'Kelas 4': return 'Kelas 5';
    case 'Kelas 5': return 'Kelas 6';
    case 'Kelas 6': return 'Lulus';
    default: return 'Kelas 1';
  }
};

export const getPreviousKelas = (currentKelas: string): string | null => {
  switch (currentKelas) {
    case 'Kelas 2': return 'Kelas 1';
    case 'Kelas 3': return 'Kelas 2';
    case 'Kelas 4': return 'Kelas 3';
    case 'Kelas 5': return 'Kelas 4';
    case 'Kelas 6': return 'Kelas 5';
    default: return null;
  }
};

export const DEFAULT_TAHUN_AJARAN_LIST = [
  '2024/2025',
  '2025/2026',
  '2026/2027',
  '2027/2028',
  '2028/2029'
];

