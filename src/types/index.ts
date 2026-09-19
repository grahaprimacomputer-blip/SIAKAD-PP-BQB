export type Role = 'admin' | 'user1' | 'user2';

export interface UserSession {
  email: string;
  name: string;
  role: Role;
  avatar?: string;
}

export type ProgramSantri = 'TAHFIDZ' | 'DINIYAH' | 'TAHFIDZ & DINIYAH';
export type JenjangPendidikan = 'SMP/MTs' | 'SMA/MA' | 'UMUM';
export type StatusOrtu = 'HIDUP' | 'MENINGGAL';
export type KelasSantri = 'Kelas 1' | 'Kelas 2' | 'Kelas 3' | 'Kelas 4' | 'Kelas 5' | 'Kelas 6';

export type StatusAkademik = 'Aktif' | 'Naik Kelas' | 'Tinggal Kelas' | 'Lulus' | 'Mutasi';

export interface RiwayatKenaikanKelas {
  id: string;
  tanggal: string; // YYYY-MM-DD
  dariKelas: KelasSantri;
  keKelas: KelasSantri | 'Lulus';
  status: 'Naik Kelas' | 'Tinggal Kelas' | 'Lulus';
  tahunAjaran: string; // e.g. "2025/2026", "2026/2027"
  catatan?: string;
  diprosesOleh?: string;
}

export interface Santri {
  id: string;
  nip: string; // Nomor Induk Pondok
  nisn: string; // Nomor Induk Siswa Nasional (NISN)
  nis?: string; // Nomor Induk Santri (NIS / Legacy)
  npm?: string; // Legacy
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  alamat: string;
  program: ProgramSantri;
  jenjangPendidikan: JenjangPendidikan;
  asalSekolah: string;
  noTlp: string;
  fotoUrl: string; // Foto 1cm x 1cm display
  email: string; // Terhubung dengan NIP, NISN, NAMA, KELAS
  tahunMasuk: number | string; // Kolom Tahun Masuk
  kelas: KelasSantri; // Kolom Kelas (Kelas 1 - Kelas 6)
  kelasList?: KelasSantri[]; // Multi-Kelas Santri (Dapat memilih lebih dari 1 kelas: misal Kelas 1, Kelas 2, Kelas 3, s/d Kelas 6)
  statusAkademik?: StatusAkademik; // Status Kenaikan / Akademik
  tahunAjaranAktif?: string; // Tahun Ajaran aktif saat ini, misal "2025/2026"
  riwayatKelas?: RiwayatKenaikanKelas[]; // Riwayat kenaikan kelas per tahun ajaran
  namaAyah: string;
  pekerjaanAyah: string;
  statusAyah: StatusOrtu;
  namaIbu: string;
  pekerjaanIbu: string;
  statusIbu: StatusOrtu;
  createdAt?: string;
  updatedAt?: string;
}

export type JenisPembayaran =
  | 'Pendaftaran'
  | 'Uang Pangkal'
  | 'Perlengkapan'
  | 'Kesehatan'
  | 'SPP Juli'
  | 'SPP Agustus'
  | 'SPP September'
  | 'SPP Oktober'
  | 'SPP November'
  | 'SPP Desember'
  | 'SPP Januari'
  | 'SPP Februari'
  | 'SPP Maret'
  | 'SPP April'
  | 'SPP Mei'
  | 'SPP Juni'
  | 'Pertemuan Wali Santri'
  | 'Wisuda'
  | 'Lain-lain';

export type MetodePembayaran = 'Tunai' | 'Transfer' | 'QRIS' | 'Debit';

export interface FormIndukSantri {
  nip: string;
  nisn: string;
  nama: string;
  email: string;
  tahunMasuk: number | string;
  kelas: KelasSantri;
  uangPendaftaran: number;
  uangPangkal: number;
  perlengkapan: number;
}

export interface FormBantuPembayaran {
  uangKesehatan: number;
  yuranJuli: number;
  yuranAgustus: number;
  yuranSeptember: number;
  yuranOktober: number;
  yuranNovember: number;
  yuranDesember: number;
  yuranJanuari: number;
  yuranFebruari: number;
  yuranMaret: number;
  yuranApril: number;
  yuranMei: number;
  yuranJuni: number;
  pertemuanWaliSantri: number;
  wisuda: number;
}

export interface RekapPembayaranKhususSantri {
  santriId: string;
  formInduk: FormIndukSantri;
  formBantu: FormBantuPembayaran;
  terakhirDiperbarui?: string;
  statusKirimEmail?: 'Terkirim' | 'Belum Dikirim';
  terakhirKirimEmail?: string;
}

export interface Pembayaran {
  id: string;
  tanggal: string; // tgl
  tahun: number; // e.g. 2025, 2026
  nip: string;
  nis: string;
  nisn?: string; // NISN Santri
  nama: string;
  email: string; // terhubung
  kelas?: KelasSantri; // Kolom Kelas Pembayaran (Kelas 1 - Kelas 6)
  jenisPembayaran: JenisPembayaran;
  jumlah: number;
  metode: MetodePembayaran;
  keterangan?: string;
  emailStatus: 'Terkirim' | 'Menunggu' | 'Gagal';
  emailSentAt?: string;
  nomorKwitansi: string;
  createdAt?: string;
  updatedAt?: string;
}

export type KategoriPengeluaran =
  | 'Operasional'
  | 'Konsumsi'
  | 'ATK'
  | 'Maintenance'
  | 'Listrik dan Air'
  | 'Gaji'
  | 'Panjar Dosen'
  | 'BPJS'
  | 'Setoran Bank'
  | 'Setoran Pimpinan'
  | 'Penarikan Bank'
  | 'Lain-lain';

export interface Pengeluaran {
  id: string;
  tanggal: string; // tanggak (auto hari ini)
  kategori: KategoriPengeluaran;
  keterangan: string;
  metode: MetodePembayaran;
  jumlah: number;
  createdAt?: string;
  updatedAt?: string;
}
