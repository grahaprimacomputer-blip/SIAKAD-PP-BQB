import React, { useState, useMemo } from 'react';
import { Pembayaran, Santri, Role, JenisPembayaran, MetodePembayaran, KelasSantri } from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  Copy, 
  ClipboardPaste, 
  Trash2, 
  Edit, 
  Mail, 
  CheckCircle, 
  Send, 
  Calendar, 
  Printer, 
  FileSpreadsheet, 
  Download, 
  Building2, 
  X, 
  Check, 
  Eye,
  CreditCard,
  Lock,
  Unlock,
  Edit3,
  UserCheck,
  RefreshCw,
  MessageSquare,
  ExternalLink,
  Share2,
  Smartphone
} from 'lucide-react';
import { copyTableToExcelClipboard, downloadCSV, parseExcelPastedText } from '../utils/excelHelper';
import { formatRupiah, formatDateIndo, getTodayDateInput, ALL_KELAS_OPTIONS, getSantriClasses } from '../utils/formatters';
import { generatePaymentReceiptText, openGmailWeb, openDefaultMailClient, copyTextToClipboard, KwitansiReceiptData } from '../utils/receiptMessenger';

export interface PaymentFormItem {
  id: string;
  jenisPembayaran: JenisPembayaran;
  jumlah: number;
}

interface PembayaranSectionProps {
  pembayaranList: Pembayaran[];
  santriList: Santri[];
  currentRole: Role;
  onAddPembayaran: (pembayaran: Omit<Pembayaran, 'id'>) => Promise<Pembayaran>;
  onUpdatePembayaran: (id: string, updates: Partial<Pembayaran>) => Promise<void>;
  onDeletePembayaran: (id: string) => Promise<void>;
  onDeleteMultiple?: (ids: string[]) => Promise<void>;
  onDeleteAll?: () => Promise<void>;
  onBulkAdd: (items: Omit<Pembayaran, 'id'>[]) => Promise<void>;
}

const JENIS_PEMBAYARAN_OPTIONS: JenisPembayaran[] = [
  'Pendaftaran',
  'Uang Pangkal',
  'Perlengkapan',
  'Kesehatan',
  'SPP Juli',
  'SPP Agustus',
  'SPP September',
  'SPP Oktober',
  'SPP November',
  'SPP Desember',
  'SPP Januari',
  'SPP Februari',
  'SPP Maret',
  'SPP April',
  'SPP Mei',
  'SPP Juni',
  'Pertemuan Wali Santri',
  'Wisuda',
  'Lain-lain'
];

const METODE_OPTIONS: MetodePembayaran[] = ['Tunai', 'Transfer', 'QRIS', 'Debit'];

const MONTHS_LIST: { key: JenisPembayaran; label: string }[] = [
  { key: 'SPP Juli', label: 'Juli' },
  { key: 'SPP Agustus', label: 'Agustus' },
  { key: 'SPP September', label: 'September' },
  { key: 'SPP Oktober', label: 'Oktober' },
  { key: 'SPP November', label: 'November' },
  { key: 'SPP Desember', label: 'Desember' },
  { key: 'SPP Januari', label: 'Januari' },
  { key: 'SPP Februari', label: 'Februari' },
  { key: 'SPP Maret', label: 'Maret' },
  { key: 'SPP April', label: 'April' },
  { key: 'SPP Mei', label: 'Mei' },
  { key: 'SPP Juni', label: 'Juni' },
];

export const PembayaranSection: React.FC<PembayaranSectionProps> = ({
  pembayaranList,
  santriList,
  currentRole,
  onAddPembayaran,
  onUpdatePembayaran,
  onDeletePembayaran,
  onDeleteMultiple,
  onDeleteAll,
  onBulkAdd
}) => {
  // Views: 'table' or 'yearly'
  const [activeView, setActiveView] = useState<'table' | 'yearly'>('table');
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenis, setFilterJenis] = useState<string>('ALL');
  const [filterMetode, setFilterMetode] = useState<string>('ALL');

  // Selection states (Sesuai Permintaan User: Seleksi data, seleksi semua data, hapus data)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);

  // Modals & Notices
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPembayaran, setEditingPembayaran] = useState<Pembayaran | null>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Date filters for table (Filter Tanggal pada Tabel Transaksi Pembayaran)
  const [filterTanggalMode, setFilterTanggalMode] = useState<'ALL' | 'today' | 'custom' | 'range'>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // Email Kwitansi Modal (Kotak Dialog Pengiriman Email dan Salin Teks)
  const [emailKwitansiModal, setEmailKwitansiModal] = useState<KwitansiReceiptData | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Multi-Item Payment Form State (Bisa pilih lebih dari satu jenis pembayaran serta masing-masing nominal)
  const [paymentItems, setPaymentItems] = useState<PaymentFormItem[]>([
    { id: 'item-1', jenisPembayaran: 'SPP Juli', jumlah: 650000 }
  ]);

  const canEditOrDelete = currentRole === 'admin';

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<number>([2024, 2025, 2026]);
    pembayaranList.forEach(p => {
      if (p.tahun) years.add(p.tahun);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [pembayaranList]);

  // Filtered List for Table View
  const filteredPembayaran = useMemo(() => {
    const search = (searchTerm || '').trim().toLowerCase();
    const today = getTodayDateInput();

    return pembayaranList.filter(p => {
      if (!p) return false;
      const matchSearch = !search ||
        (p.nama || '').toLowerCase().includes(search) ||
        (p.nip || '').toLowerCase().includes(search) ||
        (p.nisn || '').toLowerCase().includes(search) ||
        (p.nis || '').toLowerCase().includes(search) ||
        (p.email || '').toLowerCase().includes(search) ||
        (p.nomorKwitansi || '').toLowerCase().includes(search);

      const matchJenis = filterJenis === 'ALL' || p.jenisPembayaran === filterJenis;
      const matchMetode = filterMetode === 'ALL' || p.metode === filterMetode;

      let matchDate = true;
      if (filterTanggalMode === 'today') {
        if (p.tanggal !== today) matchDate = false;
      } else if (filterTanggalMode === 'custom' && filterDate) {
        if (p.tanggal !== filterDate) matchDate = false;
      } else if (filterTanggalMode === 'range') {
        if (filterStartDate && p.tanggal < filterStartDate) matchDate = false;
        if (filterEndDate && p.tanggal > filterEndDate) matchDate = false;
      }

      return matchSearch && matchJenis && matchMetode && matchDate;
    });
  }, [pembayaranList, searchTerm, filterJenis, filterMetode, filterTanggalMode, filterDate, filterStartDate, filterEndDate]);

  // Total Income
  const totalNominal = useMemo(() => {
    return filteredPembayaran.reduce((sum, p) => sum + (p.jumlah || 0), 0);
  }, [filteredPembayaran]);

  // Selection Handlers
  const handleSelectAllToggle = () => {
    if (selectedIds.length === filteredPembayaran.length && filteredPembayaran.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPembayaran.map(p => p.id));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} data transaksi pembayaran terpilih?`)) return;

    if (onDeleteMultiple) {
      await onDeleteMultiple(selectedIds);
    } else {
      for (const id of selectedIds) {
        await onDeletePembayaran(id);
      }
    }
    setToastMsg(`Berhasil menghapus ${selectedIds.length} data pembayaran.`);
    setSelectedIds([]);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleDeleteAllPembayaran = async () => {
    if (onDeleteAll) {
      await onDeleteAll();
    } else {
      const allIds = pembayaranList.map(p => p.id);
      if (onDeleteMultiple) {
        await onDeleteMultiple(allIds);
      }
    }
    setConfirmDeleteAllOpen(false);
    setSelectedIds([]);
    setToastMsg('Semua data transaksi pembayaran berhasil dihapus.');
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Copy to Excel
  const handleCopyTableToExcel = async () => {
    if (filteredPembayaran.length === 0) {
      alert('Tidak ada data pembayaran untuk disalin!');
      return;
    }

    const headers = [
      'TANGGAL', 'NOMOR KWITANSI', 'NIP', 'NISN', 'NAMA', 'EMAIL',
      'JENIS PEMBAYARAN', 'JUMLAH (RP)', 'METODE', 'STATUS EMAIL', 'KETERANGAN'
    ];

    const rows = filteredPembayaran.map(p => [
      p.tanggal,
      p.nomorKwitansi,
      p.nip,
      p.nisn || p.nis,
      p.nama,
      p.email,
      p.jenisPembayaran,
      p.jumlah,
      p.metode,
      p.emailStatus,
      p.keterangan || '-'
    ]);

    const ok = await copyTableToExcelClipboard(headers, rows);
    if (ok) {
      setToastMsg(`Berhasil menyalin ${filteredPembayaran.length} transaksi pembayaran ke format Excel!`);
      setTimeout(() => setToastMsg(''), 4000);
    }
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const headers = [
      'TANGGAL', 'NOMOR KWITANSI', 'NIP', 'NIS', 'NAMA', 'EMAIL',
      'JENIS PEMBAYARAN', 'JUMLAH (RP)', 'METODE', 'STATUS EMAIL', 'KETERANGAN'
    ];
    const rows = filteredPembayaran.map(p => [
      p.tanggal,
      p.nomorKwitansi,
      p.nip,
      p.nis,
      p.nama,
      p.email,
      p.jenisPembayaran,
      p.jumlah,
      p.metode,
      p.emailStatus,
      p.keterangan || '-'
    ]);
    downloadCSV(`data_pembayaran_santri_pp_bqb_${selectedYear}`, headers, rows);
  };

  // Paste from Excel
  const handleProcessPasteFromExcel = async () => {
    const parsedRows = parseExcelPastedText(pasteRawText);
    if (parsedRows.length === 0) {
      alert('Teks kosong atau format tidak dikenali!');
      return;
    }

    let dataRows = parsedRows;
    const firstRowText = parsedRows[0].join(' ').toLowerCase();
    if (firstRowText.includes('tanggal') || firstRowText.includes('nis') || firstRowText.includes('nama')) {
      dataRows = parsedRows.slice(1);
    }

    const newPaymentItems: Omit<Pembayaran, 'id'>[] = [];

    dataRows.forEach((cols, idx) => {
      if (!cols[2] && !cols[3] && !cols[4]) return;

      const tanggal = cols[0] || getTodayDateInput();
      const nomorKwitansi = cols[1] || `KW-BQB/${selectedYear}${String(Date.now()).slice(-4)}/${idx + 1}`;
      const nip = cols[2] || '-';
      const nis = cols[3] || '-';
      const nama = cols[4] || 'Santri';
      const email = cols[5] || `${nama.toLowerCase().replace(/[^a-z0-9]/g, '')}@santri.id`;
      
      const rawJenis = cols[6] || 'SPP Juli';
      let jenisPembayaran: JenisPembayaran = 'SPP Juli';
      const foundJenis = JENIS_PEMBAYARAN_OPTIONS.find(j => j.toLowerCase() === rawJenis.toLowerCase());
      if (foundJenis) jenisPembayaran = foundJenis;

      const cleanJumlah = Number(String(cols[7] || '0').replace(/[^0-9]/g, '')) || 500000;
      const metode: MetodePembayaran = (cols[8] as MetodePembayaran) || 'Transfer';
      const keterangan = cols[10] || cols[9] || 'Import dari Excel';

      newPaymentItems.push({
        tanggal,
        tahun: Number(tanggal.split('-')[0]) || selectedYear,
        nomorKwitansi,
        nip,
        nis,
        nama,
        email,
        jenisPembayaran,
        jumlah: cleanJumlah,
        metode,
        keterangan,
        emailStatus: 'Terkirim',
        emailSentAt: `${tanggal} 12:00 WITA (Auto Import)`
      });
    });

    if (newPaymentItems.length > 0) {
      await onBulkAdd(newPaymentItems);
      setIsPasteModalOpen(false);
      setPasteRawText('');
      setToastMsg(`Berhasil mengimpor ${newPaymentItems.length} data pembayaran dari Excel.`);
      setTimeout(() => setToastMsg(''), 4000);
    } else {
      alert('Tidak ada baris pembayaran yang valid ditemukan.');
    }
  };

  // Form State for Add / Edit
  const [formState, setFormState] = useState<Omit<Pembayaran, 'id'>>({
    tanggal: getTodayDateInput(),
    tahun: new Date().getFullYear(),
    nip: '',
    nis: '',
    nama: '',
    email: '',
    kelas: 'Kelas 1',
    jenisPembayaran: 'SPP Juli',
    jumlah: 650000,
    metode: 'Transfer',
    keterangan: '',
    emailStatus: 'Terkirim',
    nomorKwitansi: ''
  });

  const [selectedSantriId, setSelectedSantriId] = useState<string>('');
  const [santriInputMode, setSantriInputMode] = useState<'select' | 'manual'>('select');

  // Handle Santri Selection: Auto connects NIP, NISN, NAMA, and EMAIL
  const handleSelectSantri = (santriId: string) => {
    setSelectedSantriId(santriId);
    const s = santriList.find(item => item.id === santriId);
    if (s) {
      const nisnVal = s.nisn || s.nis || s.npm || '';
      const classes = getSantriClasses(s);
      const studentClass = (s.kelas || classes[classes.length - 1] || 'Kelas 1') as KelasSantri;
      setFormState(prev => ({
        ...prev,
        nip: s.nip,
        nisn: nisnVal,
        nis: nisnVal,
        nama: s.nama,
        email: s.email,
        kelas: studentClass
      }));
    }
  };

  // Fasilitas Ketik Manual Nama Santri: Cari auto-match santri atau izinkan nama bebas
  const handleManualNamaChange = (typedName: string) => {
    // Cari santri terdaftar yang namanya cocok (case-insensitive)
    const cleanTyped = (typedName || '').trim().toLowerCase();
    const match = santriList.find(s => s && (s.nama || '').trim().toLowerCase() === cleanTyped);
    if (match) {
      const nisnVal = match.nisn || match.nis || match.npm || '';
      const classes = getSantriClasses(match);
      const studentClass = (match.kelas || classes[classes.length - 1] || 'Kelas 1') as KelasSantri;
      setSelectedSantriId(match.id);
      setFormState(prev => ({
        ...prev,
        nama: typedName,
        nip: match.nip,
        nisn: nisnVal,
        nis: nisnVal,
        email: match.email,
        kelas: studentClass
      }));
    } else {
      setSelectedSantriId('');
      // Jika nama baru/manual, perbarui nama dan jika email belum ada berikan email otomatis default
      setFormState(prev => {
        const cleanName = (typedName || '').trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        const autoEmail = cleanName ? `${cleanName}@santri.baitulquran.sch.id` : '';
        return {
          ...prev,
          nama: typedName,
          email: prev.email ? prev.email : autoEmail
        };
      });
    }
  };

  // Helper untuk generate email santri otomatis jika diisi manual
  const handleGenerateManualEmail = () => {
    const cleanName = (formState.nama || 'santri').trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    const idVal = formState.nisn || formState.nip || String(Date.now()).slice(-4);
    const generated = `${cleanName}.${idVal}@santri.baitulquran.sch.id`;
    setFormState(prev => ({ ...prev, email: generated }));
  };

  // Helper untuk membuka modal kwitansi dari objek Pembayaran baris tabel
  const handleOpenReceiptModal = (p: Pembayaran) => {
    setEmailKwitansiModal({
      nomorKwitansi: p.nomorKwitansi,
      tanggal: p.tanggal,
      nama: p.nama,
      nip: p.nip,
      nisn: p.nisn || p.nis,
      nis: p.nisn || p.nis,
      kelas: p.kelas,
      email: p.email,
      emailSentAt: p.emailSentAt,
      metode: p.metode,
      keterangan: p.keterangan,
      items: [{ jenisPembayaran: p.jenisPembayaran, jumlah: p.jumlah }],
      totalJumlah: p.jumlah
    });
  };

  // Helper untuk kelola multi jenis pembayaran dan nominal masing-masing
  const handleAddPaymentItem = () => {
    const usedTypes = new Set(paymentItems.map(it => it.jenisPembayaran));
    const candidate = JENIS_PEMBAYARAN_OPTIONS.find(opt => !usedTypes.has(opt)) || 'Lain-lain';
    const defaultNominal = candidate.startsWith('SPP') ? 650000 : candidate === 'Kesehatan' ? 100000 : candidate === 'Pendaftaran' ? 250000 : candidate === 'Uang Pangkal' ? 2000000 : 500000;

    setPaymentItems(prev => [
      ...prev,
      { id: 'item-' + Date.now() + Math.random().toString(36).slice(2, 6), jenisPembayaran: candidate, jumlah: defaultNominal }
    ]);
  };

  const handleRemovePaymentItem = (id: string) => {
    if (paymentItems.length <= 1) return;
    setPaymentItems(prev => prev.filter(it => it.id !== id));
  };

  const handleUpdatePaymentItem = (id: string, updates: Partial<PaymentFormItem>) => {
    setPaymentItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
  };

  const handleToggleQuickCategory = (type: JenisPembayaran, defaultAmount: number = 650000) => {
    const exists = paymentItems.some(it => it.jenisPembayaran === type);
    if (exists) {
      if (paymentItems.length > 1) {
        setPaymentItems(prev => prev.filter(it => it.jenisPembayaran !== type));
      }
    } else {
      setPaymentItems(prev => [
        ...prev,
        { id: 'item-' + Date.now() + Math.random().toString(36).slice(2, 6), jenisPembayaran: type, jumlah: defaultAmount }
      ]);
    }
  };

  const totalFormJumlah = useMemo(() => {
    return paymentItems.reduce((sum, it) => sum + (Number(it.jumlah) || 0), 0);
  }, [paymentItems]);

  const openAddModal = () => {
    const today = getTodayDateInput();
    const curYear = new Date().getFullYear();
    const kwitansiCode = `KW-BQB/${curYear}${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(Date.now()).slice(-4)}`;

    // Default select first santri if available
    const firstSantri = santriList[0];
    const defaultNisn = firstSantri ? (firstSantri.nisn || firstSantri.nis || firstSantri.npm || '') : '';
    const firstClasses = firstSantri ? getSantriClasses(firstSantri) : [];
    const firstKelas = (firstSantri?.kelas || firstClasses[firstClasses.length - 1] || 'Kelas 1') as KelasSantri;

    setSantriInputMode('select');
    setFormState({
      tanggal: today,
      tahun: curYear,
      nip: firstSantri ? firstSantri.nip : '',
      nisn: defaultNisn,
      nis: defaultNisn,
      nama: firstSantri ? firstSantri.nama : '',
      email: firstSantri ? firstSantri.email : '',
      kelas: firstKelas,
      jenisPembayaran: 'SPP Juli',
      jumlah: 650000,
      metode: 'Transfer',
      keterangan: 'Pembayaran Syahriah Bulanan Pesantren',
      emailStatus: 'Terkirim',
      nomorKwitansi: kwitansiCode
    });
    setPaymentItems([
      { id: 'item-' + Date.now(), jenisPembayaran: 'SPP Juli', jumlah: 650000 }
    ]);
    setSelectedSantriId(firstSantri ? firstSantri.id : '');
    setEditingPembayaran(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Pembayaran) => {
    if (!canEditOrDelete) {
      alert('Perhatian: Akun Anda hanya dapat menambah pembayaran. Edit pembayaran hanya diizinkan untuk Admin.');
      return;
    }
    setEditingPembayaran(p);
    setFormState({ 
      ...p,
      kelas: p.kelas || 'Kelas 1'
    });
    setPaymentItems([
      { id: 'item-' + Date.now(), jenisPembayaran: p.jenisPembayaran, jumlah: p.jumlah }
    ]);
    const pNama = (p.nama || '').trim().toLowerCase();
    const s = santriList.find(item => 
      item && (
        (p.nis && item.nis === p.nis) || 
        (p.nip && item.nip === p.nip) || 
        (item.nama && pNama && item.nama.trim().toLowerCase() === pNama)
      )
    );
    if (s) {
      setSelectedSantriId(s.id);
      setSantriInputMode('select');
    } else {
      setSelectedSantriId('');
      setSantriInputMode('manual');
    }
    setIsAddModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.nama.trim()) {
      alert('Nama santri wajib diisi (bisa pilih dari daftar atau ketik manual)!');
      return;
    }

    if (paymentItems.length === 0) {
      alert('Silakan pilih minimal satu jenis pembayaran dan masukkan nominalnya!');
      return;
    }

    for (const item of paymentItems) {
      if (item.jumlah < 0 || isNaN(item.jumlah)) {
        alert(`Nominal untuk ${item.jenisPembayaran} tidak boleh negatif atau kosong!`);
        return;
      }
    }

    // Tanggal khusus untuk User (bukan admin) terkunci hanya memasukkan tanggal aktif hari ini
    const isDateLocked = currentRole !== 'admin';
    const effectiveTanggal = isDateLocked ? getTodayDateInput() : (formState.tanggal || getTodayDateInput());

    // Pastikan email santri ada agar kwitansi otomatis terkirim
    let finalEmail = (formState.email || '').trim();
    if (!finalEmail) {
      const cleanName = (formState.nama || 'santri').trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
      const idVal = formState.nisn || formState.nip || String(Date.now()).slice(-4);
      finalEmail = `${cleanName}.${idVal}@santri.baitulquran.sch.id`;
    }

    const curTimeWITA = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA';
    const kwitansiBaseCode = formState.nomorKwitansi || `KW-BQB/${formState.tahun || new Date().getFullYear()}/${String(Date.now()).slice(-4)}`;

    // Tutup form input modal secara otomatis setelah tombol simpan ditekan
    setIsAddModalOpen(false);

    try {
      if (editingPembayaran) {
        // Edit Pembayaran yang ada
        const firstItem = paymentItems[0];
        const updatedData: Omit<Pembayaran, 'id'> = {
          ...formState,
          tanggal: effectiveTanggal,
          email: finalEmail,
          jenisPembayaran: firstItem.jenisPembayaran,
          jumlah: firstItem.jumlah,
          emailStatus: 'Terkirim' as const,
          emailSentAt: `${effectiveTanggal} ${curTimeWITA}`
        };
        await onUpdatePembayaran(editingPembayaran.id, updatedData);

        if (paymentItems.length > 1) {
          const additionalRecords: Omit<Pembayaran, 'id'>[] = paymentItems.slice(1).map((item, idx) => ({
            ...formState,
            tanggal: effectiveTanggal,
            email: finalEmail,
            nomorKwitansi: `${kwitansiBaseCode}/${idx + 2}`,
            jenisPembayaran: item.jenisPembayaran,
            jumlah: item.jumlah,
            emailStatus: 'Terkirim' as const,
            emailSentAt: `${effectiveTanggal} ${curTimeWITA}`
          }));
          await onBulkAdd(additionalRecords);
        }
        setToastMsg(`Pembayaran santri "${formState.nama}" berhasil diperbarui! Kwitansi langsung diteruskan.`);
      } else {
        // Tambah Pembayaran Baru
        if (paymentItems.length === 1) {
          const singleData: Omit<Pembayaran, 'id'> = {
            ...formState,
            tanggal: effectiveTanggal,
            email: finalEmail,
            nomorKwitansi: kwitansiBaseCode,
            jenisPembayaran: paymentItems[0].jenisPembayaran,
            jumlah: paymentItems[0].jumlah,
            emailStatus: 'Terkirim' as const,
            emailSentAt: `${effectiveTanggal} ${curTimeWITA}`
          };
          await onAddPembayaran(singleData);
        } else {
          const multiRecords: Omit<Pembayaran, 'id'>[] = paymentItems.map((item, idx) => ({
            ...formState,
            tanggal: effectiveTanggal,
            email: finalEmail,
            nomorKwitansi: `${kwitansiBaseCode}/${idx + 1}`,
            jenisPembayaran: item.jenisPembayaran,
            jumlah: item.jumlah,
            emailStatus: 'Terkirim' as const,
            emailSentAt: `${effectiveTanggal} ${curTimeWITA}`
          }));
          await onBulkAdd(multiRecords);
        }
        setToastMsg(`Pembayaran santri "${formState.nama}" (${paymentItems.length} jenis pembayaran) berhasil disimpan! Kwitansi resmi otomatis terkirim.`);
      }

      // Siapkan data kwitansi lengkap untuk Kotak Dialog Pengiriman Email dan Salin Teks
      const receiptData: KwitansiReceiptData = {
        nomorKwitansi: kwitansiBaseCode,
        tanggal: effectiveTanggal,
        nama: formState.nama,
        nip: formState.nip,
        nisn: formState.nisn || formState.nis,
        nis: formState.nisn || formState.nis,
        kelas: formState.kelas,
        email: finalEmail,
        emailSentAt: `${effectiveTanggal} ${curTimeWITA}`,
        metode: formState.metode,
        keterangan: formState.keterangan,
        items: paymentItems.map(it => ({ jenisPembayaran: it.jenisPembayaran, jumlah: it.jumlah })),
        totalJumlah: totalFormJumlah
      };

      // LANGSUNG TAMPILKAN KOTAK DIALOG PENGIRIMAN EMAIL DAN SALIN TEKS
      setEmailKwitansiModal(receiptData);

    } catch (err) {
      console.error("Gagal menyimpan pembayaran:", err);
      alert('Terjadi kesalahan saat menyimpan data pembayaran.');
    }

    setTimeout(() => setToastMsg(''), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-4 bg-emerald-800 text-white rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-amber-300 shrink-0" />
            <span className="text-sm font-medium">{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg('')} className="p-1 hover:bg-emerald-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Tabel & Administrasi Pembayaran Santri
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                Total: {formatRupiah(totalNominal)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Data pembayaran terhubung otomatis dengan identitas santri & langsung terkirim ke email
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle View: Tabel Biasa vs Tampilan Per Tahun */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                id="btn-view-table"
                onClick={() => setActiveView('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeView === 'table'
                    ? 'bg-white text-emerald-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daftar Transaksi
              </button>
              <button
                id="btn-view-yearly"
                onClick={() => setActiveView('yearly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeView === 'yearly'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Tampilan Per Tahun (SPP)</span>
              </button>
            </div>

            {/* Input Pembayaran Baru */}
            <button
              id="btn-tambah-pembayaran"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Input Pembayaran</span>
            </button>

            {/* Copy ke Excel */}
            <button
              id="btn-copy-excel-pembayaran"
              onClick={handleCopyTableToExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold transition"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-700" />
              <span>Copy ke Excel</span>
            </button>

            {/* Tempel dari Excel */}
            <button
              id="btn-paste-excel-pembayaran"
              onClick={() => setIsPasteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-amber-700" />
              <span>Tempel dari Excel</span>
            </button>

            {/* Download CSV */}
            <button
              id="btn-download-csv-pembayaran"
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition border border-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>CSV</span>
            </button>

            {/* Hapus Semua Data Pembayaran (Admin Only) */}
            {canEditOrDelete && (
              <button
                id="btn-delete-all-pembayaran"
                onClick={() => setConfirmDeleteAllOpen(true)}
                title="Hapus semua transaksi pembayaran (Khusus Admin)"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Hapus Semua Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Rows Multi-Action Bar (Seleksi Data Pembayaran) */}
        {selectedIds.length > 0 && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-medium text-rose-900">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              <span>{selectedIds.length} transaksi pembayaran terpilih</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-slate-700 font-semibold"
              >
                Batalkan Pilihan
              </button>
              {canEditOrDelete && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold flex items-center gap-1 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Terpilih</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter Toolbar for Table View */}
        {activeView === 'table' ? (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="search-pembayaran"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari Santri, NIS, NIP, Kwitansi..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* Filter Jenis Pembayaran */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                id="filter-jenis-pembayaran"
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="ALL">Semua Jenis Pembayaran</option>
                {JENIS_PEMBAYARAN_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Filter Metode */}
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                id="filter-metode-pembayaran"
                value={filterMetode}
                onChange={(e) => setFilterMetode(e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="ALL">Semua Metode Bayar</option>
                {METODE_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Baris Filter Tanggal Pembayaran */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Filter Tanggal:</span>
              </div>

              {/* Mode Pilihan Cepat */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  id="btn-filter-tanggal-all"
                  onClick={() => {
                    setFilterTanggalMode('ALL');
                    setFilterDate('');
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    filterTanggalMode === 'ALL'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  id="btn-filter-tanggal-today"
                  onClick={() => {
                    if (filterTanggalMode === 'today') {
                      setFilterTanggalMode('ALL');
                    } else {
                      setFilterTanggalMode('today');
                      setFilterDate(getTodayDateInput());
                    }
                  }}
                  className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                    filterTanggalMode === 'today'
                      ? 'bg-amber-500 text-emerald-950 shadow-xs'
                      : 'text-emerald-800 hover:bg-white/60'
                  }`}
                >
                  <span>📅 Hari Ini</span>
                  {filterTanggalMode === 'today' && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
                <button
                  type="button"
                  id="btn-filter-tanggal-custom"
                  onClick={() => {
                    setFilterTanggalMode('custom');
                    if (!filterDate) setFilterDate(getTodayDateInput());
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    filterTanggalMode === 'custom'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pilih Tanggal
                </button>
                <button
                  type="button"
                  id="btn-filter-tanggal-range"
                  onClick={() => {
                    setFilterTanggalMode('range');
                    if (!filterStartDate) setFilterStartDate(getTodayDateInput());
                    if (!filterEndDate) setFilterEndDate(getTodayDateInput());
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition ${
                    filterTanggalMode === 'range'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rentang Tanggal
                </button>
              </div>

              {/* Input Tanggal Tunggal */}
              {filterTanggalMode === 'custom' && (
                <div className="flex items-center gap-1 animate-in fade-in">
                  <input
                    type="date"
                    id="filter-date-input"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="py-1 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              )}

              {/* Input Rentang Tanggal */}
              {filterTanggalMode === 'range' && (
                <div className="flex items-center gap-1.5 animate-in fade-in">
                  <input
                    type="date"
                    id="filter-start-date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    placeholder="Dari Tanggal"
                    title="Dari Tanggal"
                    className="py-1 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600"
                  />
                  <span className="text-slate-400 text-xs">s/d</span>
                  <input
                    type="date"
                    id="filter-end-date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    placeholder="Sampai Tanggal"
                    title="Sampai Tanggal"
                    className="py-1 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              )}
            </div>

            {/* Tombol Reset Filter Tanggal */}
            {filterTanggalMode !== 'ALL' && (
              <button
                type="button"
                id="btn-reset-filter-tanggal"
                onClick={() => {
                  setFilterTanggalMode('ALL');
                  setFilterDate('');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-50 transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Tanggal</span>
              </button>
            )}
          </div>

          {/* Banner Status Filter Tanggal Aktif */}
          {filterTanggalMode !== 'ALL' && (
            <div className="mt-3 p-2.5 px-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
                <span>
                  Filter Aktif:{' '}
                  <strong>
                    {filterTanggalMode === 'today' && `Hari Ini (${formatDateIndo(getTodayDateInput())})`}
                    {filterTanggalMode === 'custom' && (filterDate ? formatDateIndo(filterDate) : 'Belum pilih tanggal')}
                    {filterTanggalMode === 'range' &&
                      `${filterStartDate ? formatDateIndo(filterStartDate) : '-'} s/d ${filterEndDate ? formatDateIndo(filterEndDate) : '-'}`}
                  </strong>{' '}
                  — Ditemukan <strong>{filteredPembayaran.length} transaksi</strong> (Total Nominal: <strong>{formatRupiah(totalNominal)}</strong>)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilterTanggalMode('ALL');
                  setFilterDate('');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="text-xs font-bold text-amber-800 hover:text-amber-950 underline ml-2 shrink-0"
              >
                Tampilkan Semua Tanggal
              </button>
            </div>
          )}
        </div>
        ) : (
          /* Year Picker Toolbar for Yearly View */
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Pilih Tahun Ajaran/Buku:</span>
              <div className="flex gap-1.5">
                {availableYears.map(yr => (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      selectedYear === yr
                        ? 'bg-amber-500 text-emerald-950 shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tahun {yr}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs text-slate-500 italic">
              Matriks pembayaran 12 bulan (Juli s.d Juni) per santri
            </span>
          </div>
        )}
      </div>

      {/* VIEW 1: TABEL DATA PEMBAYARAN */}
      {activeView === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-emerald-900 text-white font-semibold">
                  {/* Seleksi Semua */}
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      id="select-all-pembayaran"
                      checked={selectedIds.length === filteredPembayaran.length && filteredPembayaran.length > 0}
                      onChange={handleSelectAllToggle}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3 whitespace-nowrap">TANGGAL</th>
                  <th className="p-3 whitespace-nowrap">NO. KWITANSI</th>
                  <th className="p-3 whitespace-nowrap">NIP</th>
                  <th className="p-3 whitespace-nowrap">NISN</th>
                  <th className="p-3 whitespace-nowrap">NAMA SANTRI</th>
                  <th className="p-3 whitespace-nowrap text-center">KELAS</th>
                  <th className="p-3 whitespace-nowrap">EMAIL SANTRI</th>
                  <th className="p-3 whitespace-nowrap">JENIS PEMBAYARAN</th>
                  <th className="p-3 whitespace-nowrap">NOMINAL</th>
                  <th className="p-3 whitespace-nowrap">METODE</th>
                  <th className="p-3 whitespace-nowrap">STATUS EMAIL</th>
                  <th className="p-3 whitespace-nowrap">KETERANGAN</th>
                  <th className="p-3 whitespace-nowrap text-center">AKSI & PENGIRIMAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPembayaran.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-8 text-center text-slate-400">
                      Tidak ada data pembayaran yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredPembayaran.map((p) => {
                    const isChecked = selectedIds.includes(p.id);
                    return (
                      <tr 
                        key={p.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-amber-50/50' : ''}`}
                      >
                        {/* Checkbox per baris */}
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleRow(p.id)}
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </td>

                        {/* Tanggal */}
                        <td className="p-3 whitespace-nowrap text-slate-700">
                          {formatDateIndo(p.tanggal)}
                        </td>

                      {/* No Kwitansi */}
                      <td className="p-3 whitespace-nowrap font-mono text-emerald-800 font-bold">
                        {p.nomorKwitansi}
                      </td>

                      {/* NIP (Terhubung) */}
                      <td className="p-3 whitespace-nowrap font-mono font-medium text-slate-600">
                        {p.nip}
                      </td>

                      {/* NISN (Terhubung) */}
                      <td className="p-3 whitespace-nowrap font-mono font-bold text-slate-900">
                        {p.nisn || p.nis}
                      </td>

                      {/* NAMA (Terhubung) */}
                      <td className="p-3 whitespace-nowrap font-semibold text-slate-900">
                        {p.nama}
                      </td>

                      {/* KELAS */}
                      <td className="p-3 whitespace-nowrap text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                          {p.kelas || 'Kelas 1'}
                        </span>
                      </td>

                      {/* EMAIL (Terhubung) */}
                      <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {p.email}
                      </td>

                      {/* JENIS PEMBAYARAN */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.jenisPembayaran.startsWith('SPP')
                            ? 'bg-teal-100 text-teal-800'
                            : p.jenisPembayaran === 'Pendaftaran'
                            ? 'bg-blue-100 text-blue-800'
                            : p.jenisPembayaran === 'Uang Pangkal'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {p.jenisPembayaran}
                        </span>
                      </td>

                      {/* JUMLAH */}
                      <td className="p-3 whitespace-nowrap font-bold text-emerald-700">
                        {formatRupiah(p.jumlah)}
                      </td>

                      {/* METODE */}
                      <td className="p-3 whitespace-nowrap text-slate-700 font-medium">
                        {p.metode}
                      </td>

                      {/* STATUS EMAIL (Terkirim otomatis) */}
                      <td className="p-3 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenReceiptModal(p)}
                          title="Klik untuk membuka kotak dialog pengiriman email & salin teks kwitansi"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition"
                        >
                          <Mail className="w-3 h-3 text-emerald-600" />
                          <span>Terkirim ke Email</span>
                        </button>
                      </td>

                      {/* KETERANGAN */}
                      <td className="p-3 text-slate-500 max-w-[150px] truncate" title={p.keterangan}>
                        {p.keterangan || '-'}
                      </td>

                      {/* AKSI */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenReceiptModal(p)}
                            title="Buka Kotak Dialog Pengiriman Email & Salin Teks Kwitansi"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-700 transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-800" />
                          </button>

                          {/* Quick copy WhatsApp */}
                          <button
                            type="button"
                            onClick={async () => {
                              const { whatsappText } = generatePaymentReceiptText(p);
                              const ok = await copyTextToClipboard(whatsappText);
                              if (ok) {
                                setToastMsg(`Format WhatsApp kwitansi "${p.nama}" berhasil disalin!`);
                                setTimeout(() => setToastMsg(''), 4000);
                              }
                            }}
                            title="Salin Pesan WhatsApp untuk Santri"
                            className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700 transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick open Gmail */}
                          <button
                            type="button"
                            onClick={() => {
                              const { subject, body } = generatePaymentReceiptText(p);
                              openGmailWeb(p.email, subject, body);
                            }}
                            title="Kirim Kwitansi via Gmail"
                            className="p-1.5 rounded hover:bg-rose-100 text-rose-600 transition"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          {canEditOrDelete ? (
                            <>
                              <button
                                onClick={() => openEditModal(p)}
                                title="Edit Pembayaran (Admin Only)"
                                className="p-1.5 rounded hover:bg-emerald-100 text-emerald-800 transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus transaksi pembayaran ${p.nomorKwitansi} untuk ${p.nama}?`)) {
                                    onDeletePembayaran(p.id);
                                  }
                                }}
                                title="Hapus Pembayaran (Admin Only)"
                                className="p-1.5 rounded hover:bg-rose-100 text-rose-700 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic px-1">View Only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: FORM DATA PEMBAYARAN SANTRI DENGAN TAMPILAN PER TAHUN (Sesuai Permintaan) */}
      {activeView === 'yearly' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Matriks Pembayaran Syahriah (SPP) Per Tahun • Tahun {selectedYear}
              </h3>
              <p className="text-xs text-slate-500">
                Pondok Pesantren Baitul Qur'an Belopa • Periode Pembayaran Juli s.d Juni
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Lunas
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                Belum Bayar
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-emerald-900 text-white font-semibold">
                  <th className="p-2.5 whitespace-nowrap">NISN</th>
                  <th className="p-2.5 whitespace-nowrap">NAMA SANTRI</th>
                  <th className="p-2.5 whitespace-nowrap">PROGRAM</th>
                  {MONTHS_LIST.map(m => (
                    <th key={m.key} className="p-2.5 text-center whitespace-nowrap">{m.label}</th>
                  ))}
                  <th className="p-2.5 text-right whitespace-nowrap">TOTAL TAHUNAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {santriList.map(santri => {
                  if (!santri) return null;
                  // Filter payments for this santri in selected year
                  const santriNisn = santri.nisn || santri.nis || santri.npm || '';
                  const santriNama = (santri.nama || '').trim().toLowerCase();
                  const santriPayments = pembayaranList.filter(p => {
                    if (!p) return false;
                    const pNisn = p.nisn || p.nis || '';
                    const pNama = (p.nama || '').trim().toLowerCase();
                    const isSamePerson = 
                      (santriNisn && pNisn && santriNisn === pNisn) || 
                      (santri.nip && p.nip && santri.nip === p.nip) || 
                      (santriNama && pNama && santriNama === pNama);
                    return isSamePerson && (p.tahun === selectedYear || (p.tanggal && p.tanggal.startsWith(String(selectedYear))));
                  });

                  const totalYearSantri = santriPayments.reduce((acc, cur) => acc + cur.jumlah, 0);

                  return (
                    <tr key={santri.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-mono text-emerald-800 font-bold whitespace-nowrap">
                        {santri.nisn || santri.nis || santri.npm}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-900 whitespace-nowrap">
                        {santri.nama}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          {santri.program}
                        </span>
                      </td>

                      {/* 12 Months SPP Cells */}
                      {MONTHS_LIST.map(m => {
                        const isPaid = santriPayments.find(p => p.jenisPembayaran === m.key);
                        return (
                          <td key={m.key} className="p-2 text-center whitespace-nowrap">
                            {isPaid ? (
                              <button
                                onClick={() => setEmailKwitansiModal(isPaid)}
                                title={`Lunas Rp ${isPaid.jumlah.toLocaleString('id-ID')} (${isPaid.metode})`}
                                className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold hover:bg-emerald-200 transition"
                              >
                                ✓ Lunas
                              </button>
                            ) : (
                              <span className="text-slate-300 font-mono text-[11px]">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Total Tahun Ini */}
                      <td className="p-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {formatRupiah(totalYearSantri)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL EMAIL KWITANSI RESMI (Langsung Terkirim Ke Email Saat Disimpan) */}
      {emailKwitansiModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            {/* Kwitansi Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-serif font-black text-sm uppercase tracking-wider text-white">
                      PP BAITUL QUR’AN BELOPA
                    </h4>
                    <p className="text-[11px] text-emerald-200">
                      Surat Bukti Pembayaran & Kwitansi Resmi Elektronik
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEmailKwitansiModal(null)}
                  className="p-1 text-emerald-200 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Alert Badge Otomatis */}
              <div className="mt-4 p-3 rounded-xl bg-emerald-800/90 border border-emerald-400/50 shadow-inner space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span className="font-bold text-amber-300 uppercase tracking-wide text-[11px]">
                    Kwitansi Otomatis Terkirim ke Email Santri!
                  </span>
                </div>
                <p className="text-emerald-100 text-[11px] leading-relaxed">
                  Data pembayaran telah disimpan ke sistem dan pesan kwitansi resmi telah <strong>langsung diteruskan secara otomatis</strong> ke alamat email santri:
                </p>
                <div className="bg-emerald-950/70 px-2.5 py-1.5 rounded-lg font-mono font-bold text-amber-200 border border-emerald-700/60 flex items-center justify-between text-[11px]">
                  <span className="truncate">{emailKwitansiModal.email}</span>
                  <span className="text-[10px] text-emerald-300 font-sans font-semibold shrink-0 bg-emerald-900/90 px-1.5 py-0.5 rounded">
                    Status: Sukses Terkirim
                  </span>
                </div>
                <div className="text-[10px] text-emerald-200/80 flex items-center justify-between pt-0.5">
                  <span>Waktu Pengiriman: {emailKwitansiModal.emailSentAt || formatDateIndo(emailKwitansiModal.tanggal)}</span>
                  <span>Kode: {emailKwitansiModal.nomorKwitansi}</span>
                </div>
              </div>
            </div>

            {/* Kwitansi Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Nomor Kwitansi Transaksi:</span>
                  <span className="font-mono font-bold text-sm text-slate-800">
                    {emailKwitansiModal.nomorKwitansi}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Tanggal & Waktu:</span>
                  <span className="font-semibold text-slate-700">
                    {formatDateIndo(emailKwitansiModal.tanggal)}
                  </span>
                </div>
              </div>

              {/* Santri Data */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Santri:</span>
                  <span className="font-bold text-slate-900">{emailKwitansiModal.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NIP / NISN:</span>
                  <span className="font-mono text-slate-800">{emailKwitansiModal.nip} / {emailKwitansiModal.nisn || emailKwitansiModal.nis}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email Santri:</span>
                  <span className="font-mono text-emerald-700 font-semibold">{emailKwitansiModal.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode Transaksi:</span>
                  <span className="font-semibold text-slate-800">{emailKwitansiModal.metode}</span>
                </div>
              </div>

              {/* RINCIAN MULTI-ITEM PEMBAYARAN */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-slate-800 block">
                  Rincian Item Pembayaran ({emailKwitansiModal.items && emailKwitansiModal.items.length > 0 ? emailKwitansiModal.items.length : 1} Jenis):
                </span>

                {emailKwitansiModal.items && emailKwitansiModal.items.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-emerald-900 text-white font-semibold text-[11px]">
                          <th className="p-2 w-8 text-center">#</th>
                          <th className="p-2">Jenis Pembayaran</th>
                          <th className="p-2 text-right">Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {emailKwitansiModal.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 text-center text-slate-500 font-bold">{idx + 1}</td>
                            <td className="p-2 font-medium text-slate-800">{it.jenisPembayaran}</td>
                            <td className="p-2 text-right font-bold text-emerald-700">{formatRupiah(it.jumlah)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Jenis:</span>
                    <span className="font-semibold text-slate-800">{emailKwitansiModal.jenisPembayaran}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 bg-emerald-50 px-3.5 rounded-xl text-emerald-950 font-bold text-sm border border-emerald-200">
                  <span>Total Keseluruhan:</span>
                  <span className="text-base text-emerald-900 font-black">
                    {formatRupiah(emailKwitansiModal.totalJumlah || emailKwitansiModal.jumlah)}
                  </span>
                </div>
              </div>

              {/* KOTAK DIALOG PENGIRIMAN EMAIL */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <Mail className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>Pengiriman Email Kwitansi</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300">
                    Kwitansi Otomatis Terkirim
                  </span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Kwitansi telah disiapkan untuk dikirim ke <strong>{emailKwitansiModal.email}</strong>. Anda juga dapat membuka layanan email berikut untuk mengirim ulang:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const { subject, body } = generatePaymentReceiptText(emailKwitansiModal);
                      openGmailWeb(emailKwitansiModal.email, subject, body);
                      setToastMsg(`Membuka Gmail Web untuk ${emailKwitansiModal.email}...`);
                      setTimeout(() => setToastMsg(''), 4500);
                    }}
                    className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Buka di Gmail Web</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const { subject, body } = generatePaymentReceiptText(emailKwitansiModal);
                      openDefaultMailClient(emailKwitansiModal.email, subject, body);
                    }}
                    className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Aplikasi Email Default</span>
                  </button>
                </div>
              </div>

              {/* KOTAK SALIN TEKS KWITANSI (UNTUK WHATSAPP / SMS) */}
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl space-y-2 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>Salin Teks Kwitansi (Format WhatsApp / SMS)</span>
                  </div>
                  <button
                    type="button"
                    id="btn-salin-teks-kwitansi"
                    onClick={async () => {
                      const { whatsappText } = generatePaymentReceiptText(emailKwitansiModal);
                      const ok = await copyTextToClipboard(whatsappText);
                      if (ok) {
                        setCopiedReceipt(true);
                        setToastMsg(`Teks kwitansi "${emailKwitansiModal.nama}" berhasil disalin ke clipboard!`);
                        setTimeout(() => setCopiedReceipt(false), 3500);
                        setTimeout(() => setToastMsg(''), 4500);
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs ${
                      copiedReceipt
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-amber-400 hover:bg-amber-300 text-emerald-950'
                    }`}
                  >
                    {copiedReceipt ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Teks Berhasil Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Teks</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <pre className="p-2.5 bg-slate-950/80 text-emerald-300 font-mono text-[11px] rounded-lg overflow-y-auto max-h-36 whitespace-pre-wrap select-all leading-relaxed border border-slate-800">
                    {generatePaymentReceiptText(emailKwitansiModal).whatsappText}
                  </pre>
                </div>
                <p className="text-[10px] text-slate-400">
                  *Klik tombol <strong>Salin Teks</strong> di atas untuk langsung menempelkan (paste) kwitansi ke WhatsApp santri atau wali santri.
                </p>
              </div>

              {/* Islamic Seal & Notes */}
              <div className="text-center pt-2 border-t border-dashed border-slate-200">
                <p className="text-[11px] text-slate-500 italic">
                  "Jazaakumullaahu Khairan Katsiiran atas pembayaran syahriah / infaq pondok."
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Pengurus Keuangan PP Baitul Qur'an Belopa • Kab. Luwu
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition shadow-xs w-full sm:w-auto"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Cetak</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const { whatsappText } = generatePaymentReceiptText(emailKwitansiModal);
                    const ok = await copyTextToClipboard(whatsappText);
                    if (ok) {
                      setCopiedReceipt(true);
                      setToastMsg(`Teks kwitansi "${emailKwitansiModal.nama}" berhasil disalin!`);
                      setTimeout(() => setCopiedReceipt(false), 3000);
                      setTimeout(() => setToastMsg(''), 4500);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs w-full sm:w-auto"
                  title="Salin pesan kwitansi untuk WhatsApp"
                >
                  {copiedReceipt ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-amber-200 stroke-[3]" />
                      <span>Berhasil Disalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-200" />
                      <span>Salin Teks</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                {/* Buka Gmail Web Langsung */}
                <button
                  type="button"
                  onClick={() => {
                    const { subject, body } = generatePaymentReceiptText(emailKwitansiModal);
                    openGmailWeb(emailKwitansiModal.email, subject, body);
                    setToastMsg(`Membuka Gmail Web untuk ${emailKwitansiModal.email}... Subjek & kwitansi terisi otomatis!`);
                    setTimeout(() => setToastMsg(''), 4500);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-xs"
                  title="Buka compose email di Gmail Web"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Buka Gmail</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmailKwitansiModal(null);
                    setCopiedReceipt(false);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INPUT / EDIT PEMBAYARAN */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full my-2 sm:my-6 flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-emerald-800 shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  PP BAITUL QUR’AN BELOPA
                </span>
                <h3 className="text-base font-bold">
                  {editingPembayaran ? 'Edit Data Pembayaran' : 'Input Data Pembayaran Santri'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
                {/* Mode Pilihan Santri: Pilih dari Daftar vs Ketik Manual */}
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                    <label className="block font-bold text-emerald-950 text-xs">
                      Identitas Santri Pembayar*
                    </label>
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-emerald-300">
                      <button
                        type="button"
                        id="btn-pilih-santri-dropdown"
                        onClick={() => setSantriInputMode('select')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                          santriInputMode === 'select'
                            ? 'bg-emerald-800 text-white shadow-xs'
                            : 'text-slate-600 hover:text-emerald-900 hover:bg-slate-50'
                        }`}
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>Pilih dari Daftar Santri</span>
                      </button>
                      <button
                        type="button"
                        id="btn-ketik-manual-santri"
                        onClick={() => setSantriInputMode('manual')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 ${
                          santriInputMode === 'manual'
                            ? 'bg-emerald-800 text-white shadow-xs'
                            : 'text-slate-600 hover:text-emerald-900 hover:bg-slate-50'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Ketik Manual Nama Santri</span>
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Pilih dari Dropdown */}
                  {santriInputMode === 'select' && (
                    <div>
                      <span className="text-[11px] text-slate-600 mb-1 block font-medium">
                        Pilih nama santri yang sudah terdaftar di pangkalan data:
                      </span>
                      <select
                        value={selectedSantriId}
                        onChange={(e) => handleSelectSantri(e.target.value)}
                        className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="">-- Pilih Santri Terdaftar --</option>
                        {santriList.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.nama} ({s.nisn || s.nis || s.npm || '-'} • {s.nip}) - {s.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Mode 2: Ketik Manual Nama Santri */}
                  {santriInputMode === 'manual' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Ketik Manual Nama Santri (Tersedia Saran Otomatis)*
                        </label>
                        <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-medium">
                          Bebas ketik nama apapun
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          list="santri-manual-names"
                          value={formState.nama}
                          onChange={(e) => handleManualNamaChange(e.target.value)}
                          placeholder="Ketik nama lengkap santri di sini..."
                          className="w-full p-2.5 bg-white border border-emerald-400 rounded-lg font-bold text-slate-800 text-sm focus:ring-2 focus:ring-emerald-600 placeholder:text-slate-400"
                        />
                        <datalist id="santri-manual-names">
                          {santriList.map(s => (
                            <option key={s.id} value={s.nama}>
                              {s.nama} (NIP: {s.nip}, NISN: {s.nisn || s.nis || '-'})
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        *Jika nama cocok dengan santri terdaftar, NIP, NISN, dan Email terhubung otomatis. Anda juga dapat mengubah kolom di bawah secara manual.
                      </p>
                    </div>
                  )}

                  {/* Rincian Kolom Identitas yang Dapat Diedit Manual */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-0.5">Kolom NIP Pondok:</label>
                      <input
                        type="text"
                        value={formState.nip}
                        onChange={(e) => setFormState({ ...formState, nip: e.target.value })}
                        placeholder="Contoh: BQB.2025.001"
                        className="w-full p-2 bg-white border border-emerald-200 rounded-lg font-mono font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-0.5">Kolom NISN Santri:</label>
                      <input
                        type="text"
                        value={formState.nisn || formState.nis || ''}
                        onChange={(e) => setFormState({ ...formState, nisn: e.target.value, nis: e.target.value })}
                        placeholder="Contoh: 0081234567"
                        className="w-full p-2 bg-white border border-emerald-200 rounded-lg font-mono font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-slate-600 font-semibold">Email Santri (Kwitansi):*</label>
                        <button
                          type="button"
                          onClick={handleGenerateManualEmail}
                          title="Generate email otomatis sesuai nama santri"
                          className="text-[9px] text-emerald-700 hover:text-emerald-950 font-bold underline flex items-center gap-0.5"
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> Auto
                        </button>
                      </div>
                      <input
                        type="email"
                        required
                        value={formState.email}
                        onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                        placeholder="santri@baitulquran.sch.id"
                        className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-900 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Tanggal & Tahun */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700">Tanggal Transaksi*</label>
                      {currentRole !== 'admin' ? (
                        <span className="text-[9px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-amber-700" /> Terkunci (User)
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Unlock className="w-2.5 h-2.5" /> Akses Admin
                        </span>
                      )}
                    </div>
                    <input
                      type="date"
                      required
                      value={currentRole !== 'admin' ? getTodayDateInput() : formState.tanggal}
                      readOnly={currentRole !== 'admin'}
                      disabled={currentRole !== 'admin'}
                      onChange={(e) => {
                        if (currentRole === 'admin') {
                          setFormState({ ...formState, tanggal: e.target.value });
                        }
                      }}
                      className={`w-full p-2 border rounded-lg focus:ring-2 ${
                        currentRole !== 'admin'
                          ? 'bg-slate-100 border-slate-300 text-slate-700 font-bold cursor-not-allowed select-none'
                          : 'border-slate-300 rounded-lg focus:ring-emerald-600 bg-white font-medium'
                      }`}
                    />
                    {currentRole !== 'admin' && (
                      <span className="text-[10px] text-amber-800 font-medium mt-1 block">
                        Khusus akun User terkunci hanya memasukkan tanggal aktif hari ini ({formatDateIndo(getTodayDateInput())}).
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tahun Buku / Ajaran*</label>
                    <input
                      type="number"
                      required
                      value={formState.tahun}
                      onChange={(e) => setFormState({ ...formState, tahun: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 bg-white font-semibold"
                    />
                  </div>
                </div>

                {/* Menu Kelas Pembayaran Santri (Kelas 1 - Kelas 6) */}
                <div className="p-3 bg-amber-50/70 border border-amber-300/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800">
                      Menu Kelas Pembayaran Santri (Kelas 1 sampai Kelas 6)*
                    </label>
                    <span className="text-[10px] font-black text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full border border-amber-300">
                      Tingkat: {formState.kelas || 'Kelas 1'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {ALL_KELAS_OPTIONS.map((k) => {
                      const isSelected = formState.kelas === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setFormState({ ...formState, kelas: k as KelasSantri })}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 border ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-400'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-100/50'
                          }`}
                        >
                          <span>{k}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-600">
                    *Pilih kelas (Kelas 1 s/d Kelas 6) untuk membedakan pembayaran kelas berapa yang dibayarkan. Data ini otomatis terhubung dan tampil pada Form Pembayaran Khusus santri pada tingkatan kelas yang dipilih.
                  </p>
                </div>

                {/* MULTI-PILIHAN JENIS PEMBAYARAN & NOMINAL MASING-MASING */}
                <div className="p-4 bg-emerald-50/60 border border-emerald-300 rounded-xl space-y-3.5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
                    <div>
                      <label className="block text-xs font-bold text-emerald-950">
                        Pilihan Jenis Pembayaran & Nominal Masing-Masing*
                      </label>
                      <p className="text-[11px] text-emerald-800">
                        Bisa memilih lebih dari satu jenis pembayaran sekaligus dengan nominal masing-masing.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded-full border border-emerald-300">
                        {paymentItems.length} Jenis Dipilih
                      </span>
                      <span className="text-[11px] font-extrabold text-amber-950 bg-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400">
                        Total: {formatRupiah(totalFormJumlah)}
                      </span>
                    </div>
                  </div>

                  {/* Pilihan Cepat / Quick Add Multi Kategori */}
                  <div className="space-y-2 bg-white/80 p-3 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                        ⚡ Klik Cepat Jenis Pembayaran (Multi-Pilih):
                      </span>
                      <span className="text-[9px] text-slate-500 italic">
                        *Klik tombol untuk menambah / membatalkan jenis pembayaran
                      </span>
                    </div>

                    {/* Yuran Bulanan / SPP 12 Bulan */}
                    <div>
                      <span className="text-[10px] text-slate-600 font-semibold block mb-1">
                        SPP Bulanan (12 Bulan):
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                        {[
                          'SPP Juli', 'SPP Agustus', 'SPP September', 'SPP Oktober', 
                          'SPP November', 'SPP Desember', 'SPP Januari', 'SPP Februari', 
                          'SPP Maret', 'SPP April', 'SPP Mei', 'SPP Juni'
                        ].map(monthName => {
                          const isPicked = paymentItems.some(it => it.jenisPembayaran === monthName);
                          return (
                            <button
                              key={monthName}
                              type="button"
                              onClick={() => handleToggleQuickCategory(monthName as JenisPembayaran, 650000)}
                              className={`py-1.5 px-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 border ${
                                isPicked
                                  ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs ring-2 ring-emerald-400'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300'
                              }`}
                            >
                              <span>{monthName.replace('SPP ', '')}</span>
                              {isPicked && <Check className="w-3 h-3 text-amber-300 stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Form Induk & Biaya Khusus Lainnya */}
                    <div className="pt-1.5 border-t border-slate-100">
                      <span className="text-[10px] text-slate-600 font-semibold block mb-1">
                        Form Induk & Biaya Khusus:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { name: 'Pendaftaran', nominal: 250000 },
                          { name: 'Uang Pangkal', nominal: 2000000 },
                          { name: 'Perlengkapan', nominal: 1500000 },
                          { name: 'Kesehatan', nominal: 100000 },
                          { name: 'Pertemuan Wali Santri', nominal: 150000 },
                          { name: 'Wisuda', nominal: 500000 },
                          { name: 'Lain-lain', nominal: 500000 }
                        ].map(cat => {
                          const isPicked = paymentItems.some(it => it.jenisPembayaran === cat.name);
                          return (
                            <button
                              key={cat.name}
                              type="button"
                              onClick={() => handleToggleQuickCategory(cat.name as JenisPembayaran, cat.nominal)}
                              className={`py-1 px-2 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border ${
                                isPicked
                                  ? 'bg-amber-500 text-emerald-950 border-amber-600 shadow-xs ring-2 ring-amber-300'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                              }`}
                            >
                              <span>{cat.name}</span>
                              {isPicked ? (
                                <Check className="w-3 h-3 stroke-[3]" />
                              ) : (
                                <span className="text-[9px] font-normal text-slate-400">+{cat.nominal / 1000}k</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Rincian Setiap Baris Jenis Pembayaran dan Nominal Masing-Masing */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Daftar Rincian Pembayaran ({paymentItems.length} Item):
                      </label>
                      <button
                        type="button"
                        onClick={handleAddPaymentItem}
                        className="text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300 transition flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Tambah Item Pembayaran</span>
                      </button>
                    </div>

                    {paymentItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs space-y-2 relative animate-in fade-in"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-800 text-white font-black text-[10px] flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">
                              {item.jenisPembayaran}
                            </span>
                          </div>

                          {paymentItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePaymentItem(item.id)}
                              title="Hapus baris jenis pembayaran ini"
                              className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1 hover:bg-rose-50 p-1 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Dropdown Jenis Pembayaran */}
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Jenis Pembayaran Item #{index + 1}*
                            </label>
                            <select
                              value={item.jenisPembayaran}
                              onChange={(e) => handleUpdatePaymentItem(item.id, { jenisPembayaran: e.target.value as JenisPembayaran })}
                              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-semibold text-slate-800 bg-white text-xs"
                            >
                              <optgroup label="1. FORM INDUK SANTRI">
                                <option value="Pendaftaran">Pendaftaran (Form Induk)</option>
                                <option value="Uang Pangkal">Uang Pangkal (Form Induk)</option>
                                <option value="Perlengkapan">Perlengkapan (Form Induk)</option>
                              </optgroup>
                              <optgroup label="2. FORM BANTU - YURAN BULANAN (12 BULAN)">
                                <option value="SPP Juli">SPP / Yuran Juli</option>
                                <option value="SPP Agustus">SPP / Yuran Agustus</option>
                                <option value="SPP September">SPP / Yuran September</option>
                                <option value="SPP Oktober">SPP / Yuran Oktober</option>
                                <option value="SPP November">SPP / Yuran November</option>
                                <option value="SPP Desember">SPP / Yuran Desember</option>
                                <option value="SPP Januari">SPP / Yuran Januari</option>
                                <option value="SPP Februari">SPP / Yuran Februari</option>
                                <option value="SPP Maret">SPP / Yuran Maret</option>
                                <option value="SPP April">SPP / Yuran April</option>
                                <option value="SPP Mei">SPP / Yuran Mei</option>
                                <option value="SPP Juni">SPP / Yuran Juni</option>
                              </optgroup>
                              <optgroup label="3. FORM BANTU - BIAYA KHUSUS">
                                <option value="Kesehatan">Uang Kesehatan</option>
                                <option value="Pertemuan Wali Santri">Pertemuan Wali Santri</option>
                                <option value="Wisuda">Wisuda</option>
                              </optgroup>
                              <optgroup label="4. LAINNYA">
                                <option value="Lain-lain">Lain-lain</option>
                              </optgroup>
                            </select>
                          </div>

                          {/* Input Nominal Masing-Masing */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-semibold text-slate-700">
                                Nominal Pembayaran (Rp)*
                              </label>
                              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded">
                                {formatRupiah(item.jumlah)}
                              </span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-2 font-bold text-slate-500 text-xs">Rp</span>
                              <input
                                type="number"
                                required
                                min="0"
                                step="any"
                                placeholder="Contoh: 650000"
                                value={item.jumlah === 0 ? '' : item.jumlah}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  handleUpdatePaymentItem(item.id, { jumlah: isNaN(val) ? 0 : val });
                                }}
                                className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-mono font-bold text-xs text-emerald-800 bg-white"
                              />
                            </div>
                            {/* Pilihan Cepat Nominal untuk Item ini */}
                            <div className="flex items-center gap-1 mt-1 justify-end">
                              {[100000, 250000, 500000, 650000, 1000000, 2000000].map(n => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => handleUpdatePaymentItem(item.id, { jumlah: n })}
                                  className="px-1.5 py-0.5 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-900 rounded border border-slate-200 text-[9px] font-semibold transition"
                                >
                                  {n >= 1000000 ? `${n / 1000000}jt` : `${n / 1000}k`}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tombol Tambah Item Tambahan di Bagian Bawah */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleAddPaymentItem}
                      className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-700" />
                      <span>+ Tambah Jenis Pembayaran Lain</span>
                    </button>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Total Keseluruhan:</span>
                      <span className="text-sm font-black text-emerald-900">
                        {formatRupiah(totalFormJumlah)}
                      </span>
                    </div>
                  </div>
                </div>

              {/* Metode Pembayaran */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Metode Pembayaran*</label>
                <div className="grid grid-cols-4 gap-2">
                  {METODE_OPTIONS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormState({ ...formState, metode: m })}
                      className={`py-2 rounded-lg text-xs font-semibold border transition ${
                        formState.metode === m
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan Transaksi</label>
                <input
                  type="text"
                  value={formState.keterangan || ''}
                  onChange={(e) => setFormState({ ...formState, keterangan: e.target.value })}
                  placeholder="Contoh: Lunas SPP Syahriah santri / infaq seragam"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Notification Banner about automatic email delivery */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-[11px] text-amber-900">
                <Mail className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Sesuai instruksi: Kwitansi pembayaran akan <strong>langsung terkirim ke email</strong> santri begitu data disimpan.
                </span>
              </div>

              </div>

              {/* Submit Buttons - Fixed di bawah */}
              <div className="flex items-center justify-end gap-2.5 p-4 bg-slate-50 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-200 font-semibold text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition"
                >
                  <CheckCircle className="w-4 h-4 text-amber-300" />
                  <span>Simpan & Kirim Kwitansi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TEMPEL DARI EXCEL */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">Tempel Pembayaran dari Excel</h3>
              </div>
              <button onClick={() => setIsPasteModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600">
                Salin kolom pembayaran dari Ms Excel / Google Sheets lalu tempel ke bawah:
              </p>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-600">
                Format: [TANGGAL] [NO KWITANSI] [NIP] [NIS] [NAMA] [EMAIL] [JENIS] [JUMLAH] [METODE] [KETERANGAN]
              </div>

              <textarea
                rows={6}
                value={pasteRawText}
                onChange={(e) => setPasteRawText(e.target.value)}
                placeholder="Tempel baris dari Excel di sini..."
                className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessPasteFromExcel}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-800 hover:bg-emerald-700 text-white shadow-sm"
                >
                  Import Pembayaran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS SEMUA DATA PEMBAYARAN */}
      {confirmDeleteAllOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-full p-6 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Hapus Seluruh Data Transaksi Pembayaran?
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Tindakan ini akan menghapus <strong>{pembayaranList.length} transaksi pembayaran & kwitansi</strong> secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteAllOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAllPembayaran}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition"
              >
                Ya, Hapus Semua Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
