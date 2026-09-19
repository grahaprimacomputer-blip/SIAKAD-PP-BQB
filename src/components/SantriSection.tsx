import React, { useState, useMemo } from 'react';
import { Santri, Role, ProgramSantri, JenjangPendidikan, StatusOrtu, KelasSantri } from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  Copy, 
  ClipboardPaste, 
  Trash2, 
  Edit, 
  UserCheck, 
  Download, 
  Printer, 
  BarChart3, 
  X, 
  Check, 
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Phone,
  GraduationCap,
  Camera,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  Link2,
  Mail,
  User,
  Building2,
  CheckCircle
} from 'lucide-react';
import { copyTableToExcelClipboard, downloadCSV, parseExcelPastedText } from '../utils/excelHelper';
import { formatDateIndo, getSantriClasses, ALL_KELAS_OPTIONS, DEFAULT_SANTRI_FOTO } from '../utils/formatters';
import { resizeSantriPhotoTo1cm, validateJpgUpload, PIXELS_PER_CM } from '../utils/imageHelper';
import { ModalKenaikanKelas } from './ModalKenaikanKelas';

interface SantriSectionProps {
  santriList: Santri[];
  currentRole: Role;
  onAddSantri: (santri: Omit<Santri, 'id'>) => Promise<Santri>;
  onUpdateSantri: (id: string, santri: Partial<Santri>) => Promise<void>;
  onDeleteSantri: (id: string) => Promise<void>;
  onDeleteMultiple: (ids: string[]) => Promise<void>;
  onDeleteAll: () => Promise<void>;
  onBulkAdd: (items: Omit<Santri, 'id'>[]) => Promise<void>;
  onBulkUpdateSantri?: (updates: { id: string; data: Partial<Santri> }[]) => Promise<void>;
}

export const SantriSection: React.FC<SantriSectionProps> = ({
  santriList,
  currentRole,
  onAddSantri,
  onUpdateSantri,
  onDeleteSantri,
  onDeleteMultiple,
  onDeleteAll,
  onBulkAdd,
  onBulkUpdateSantri
}) => {
  // Filtering & search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  const [selectedJenjang, setSelectedJenjang] = useState<string>('ALL');
  const [selectedKelas, setSelectedKelas] = useState<string>('ALL');
  const [selectedStatusAyah, setSelectedStatusAyah] = useState<string>('ALL');
  const [showCharts, setShowCharts] = useState(true);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSantri, setEditingSantri] = useState<Santri | null>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [individualSantriModal, setIndividualSantriModal] = useState<Santri | null>(null);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);
  const [copySuccessMsg, setCopySuccessMsg] = useState('');
  const [photoErrorAlert, setPhotoErrorAlert] = useState<string | null>(null);
  const [isProcessingPhotoId, setIsProcessingPhotoId] = useState<string | null>(null);
  const [isFormPhotoProcessing, setIsFormPhotoProcessing] = useState(false);
  const [formPhotoStats, setFormPhotoStats] = useState<{ originalKb: number; finalKb: number; name: string } | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  // Kolom Terkait hover state: NIP, NISN, NAMA, EMAIL
  const [hoveredLinkedSantriId, setHoveredLinkedSantriId] = useState<string | null>(null);

  // Modal Fasilitas Kenaikan & Tinggal Kelas
  const [isKenaikanModalOpen, setIsKenaikanModalOpen] = useState(false);
  const [selectedSantriForKenaikanId, setSelectedSantriForKenaikanId] = useState<string | null>(null);

  const canEditOrDelete = currentRole === 'admin';

  // Filtered list (Kolom NIP, NISN, Nama, dan Email saling terhubung dalam pencarian)
  const filteredSantri = useMemo(() => {
    const search = (searchTerm || '').trim().toLowerCase();
    return santriList.filter(s => {
      if (!s) return false;
      const namaVal = (s.nama || '').toLowerCase();
      const nipVal = (s.nip || '').toLowerCase();
      const nisnVal = (s.nisn || s.nis || s.npm || '').toLowerCase();
      const emailVal = (s.email || '').toLowerCase();
      const alamatVal = (s.alamat || '').toLowerCase();

      const matchSearch = !search ||
        namaVal.includes(search) ||
        nipVal.includes(search) ||
        nisnVal.includes(search) ||
        emailVal.includes(search) ||
        alamatVal.includes(search);
      
      const matchProg = selectedProgram === 'ALL' || s.program === selectedProgram;
      const matchJenj = selectedJenjang === 'ALL' || s.jenjangPendidikan === selectedJenjang;
      const santriClasses = getSantriClasses(s);
      const matchKelas = selectedKelas === 'ALL' || s.kelas === selectedKelas || santriClasses.includes(selectedKelas);
      const matchAyah = selectedStatusAyah === 'ALL' || s.statusAyah === selectedStatusAyah;

      return matchSearch && matchProg && matchJenj && matchKelas && matchAyah;
    });
  }, [santriList, searchTerm, selectedProgram, selectedJenjang, selectedKelas, selectedStatusAyah]);

  // Statistics for Charts
  const statsProgram = useMemo(() => {
    const counts = { 'TAHFIDZ': 0, 'DINIYAH': 0, 'TAHFIDZ & DINIYAH': 0 };
    filteredSantri.forEach(s => {
      if (counts[s.program] !== undefined) counts[s.program]++;
    });
    return counts;
  }, [filteredSantri]);

  const statsJenjang = useMemo(() => {
    const counts = { 'SMP/MTs': 0, 'SMA/MA': 0, 'UMUM': 0 };
    filteredSantri.forEach(s => {
      if (counts[s.jenjangPendidikan] !== undefined) counts[s.jenjangPendidikan]++;
    });
    return counts;
  }, [filteredSantri]);

  // Selection Handlers
  const handleSelectAllToggle = () => {
    if (selectedIds.length === filteredSantri.length && filteredSantri.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSantri.map(s => s.id));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Copy Linked Identity Unit (NIP, NISN, Nama, Email)
  const handleCopyLinkedIdentity = (s: Santri, e: React.MouseEvent) => {
    e.stopPropagation();
    const nisnVal = s.nisn || s.nis || s.npm || '-';
    const text = `NIP: ${s.nip} | NISN: ${nisnVal} | Nama: ${s.nama} | Email: ${s.email}`;
    navigator.clipboard.writeText(text);
    setCopySuccessMsg(`Identitas Terkait Santri "${s.nama}" berhasil disalin (NIP • NISN • Nama • Email)!`);
    setTimeout(() => setCopySuccessMsg(''), 4000);
  };

  // Copy to Excel Clipboard (Kolom NIP, NISN, NAMA, EMAIL terpisah)
  const handleCopyTableToExcel = async (onlySelected: boolean = false) => {
    const targetData = onlySelected && selectedIds.length > 0
      ? santriList.filter(s => selectedIds.includes(s.id))
      : filteredSantri;

    if (targetData.length === 0) {
      alert('Tidak ada data untuk disalin!');
      return;
    }

    const headers = [
      'NIP', 'NISN', 'NAMA', 'EMAIL', 'T. LAHIR', 'TGL LAHIR', 'ALAMAT',
      'PROGRAM', 'JENJANG PENDIDIKAN', 'ASAL SEKOLAH', 'NO TLP',
      'NAMA AYAH', 'PEKERJAAN AYAH', 'STATUS AYAH',
      'NAMA IBU', 'PEKERJAAN IBU', 'STATUS IBU'
    ];

    const rows = targetData.map(s => [
      s.nip,
      s.nisn || s.nis || s.npm || '',
      s.nama,
      s.email,
      s.tempatLahir,
      s.tanggalLahir,
      s.alamat,
      s.program,
      s.jenjangPendidikan,
      s.asalSekolah,
      s.noTlp,
      s.namaAyah,
      s.pekerjaanAyah,
      s.statusAyah,
      s.namaIbu,
      s.pekerjaanIbu,
      s.statusIbu
    ]);

    const ok = await copyTableToExcelClipboard(headers, rows);
    if (ok) {
      setCopySuccessMsg(`Berhasil menyalin ${targetData.length} data santri ke format Excel! Kolom NIP, NISN, Nama, dan Email tersusun rapi.`);
      setTimeout(() => setCopySuccessMsg(''), 4000);
    }
  };

  // Copy ALL data
  const handleCopyAllData = async () => {
    const headers = [
      'NIP', 'NISN', 'NAMA', 'EMAIL', 'T. LAHIR', 'TGL LAHIR', 'ALAMAT',
      'PROGRAM', 'JENJANG PENDIDIKAN', 'ASAL SEKOLAH', 'NO TLP',
      'NAMA AYAH', 'PEKERJAAN AYAH', 'STATUS AYAH',
      'NAMA IBU', 'PEKERJAAN IBU', 'STATUS IBU'
    ];

    const rows = santriList.map(s => [
      s.nip, s.nisn || s.nis || s.npm || '', s.nama, s.email, s.tempatLahir, s.tanggalLahir, s.alamat,
      s.program, s.jenjangPendidikan, s.asalSekolah, s.noTlp,
      s.namaAyah, s.pekerjaanAyah, s.statusAyah,
      s.namaIbu, s.pekerjaanIbu, s.statusIbu
    ]);

    const ok = await copyTableToExcelClipboard(headers, rows);
    if (ok) {
      setCopySuccessMsg(`Seluruh ${santriList.length} data santri berhasil disalin ke clipboard Excel.`);
      setTimeout(() => setCopySuccessMsg(''), 4000);
    }
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const headers = [
      'NIP', 'NISN', 'NAMA', 'EMAIL', 'T. LAHIR', 'TGL LAHIR', 'ALAMAT',
      'PROGRAM', 'JENJANG PENDIDIKAN', 'ASAL SEKOLAH', 'NO TLP',
      'NAMA AYAH', 'PEKERJAAN AYAH', 'STATUS AYAH',
      'NAMA IBU', 'PEKERJAAN IBU', 'STATUS IBU'
    ];
    const rows = filteredSantri.map(s => [
      s.nip, s.nisn || s.nis || s.npm || '', s.nama, s.email, s.tempatLahir, s.tanggalLahir, s.alamat,
      s.program, s.jenjangPendidikan, s.asalSekolah, s.noTlp,
      s.namaAyah, s.pekerjaanAyah, s.statusAyah,
      s.namaIbu, s.pekerjaanIbu, s.statusIbu
    ]);
    downloadCSV('data_santri_pp_baitul_quran_belopa', headers, rows);
  };

  // Parse and Paste from Excel
  const handleProcessPasteFromExcel = async () => {
    const parsedRows = parseExcelPastedText(pasteRawText);
    if (parsedRows.length === 0) {
      alert('Teks kosong atau format tidak dikenali!');
      return;
    }

    // Check if first row is header
    let dataRows = parsedRows;
    const firstRowText = parsedRows[0].join(' ').toLowerCase();
    if (firstRowText.includes('nip') || firstRowText.includes('nama') || firstRowText.includes('nis')) {
      dataRows = parsedRows.slice(1);
    }

    const newSantriItems: Omit<Santri, 'id'>[] = [];

    dataRows.forEach((cols, idx) => {
      if (!cols[2] && !cols[1] && !cols[0]) return; // Skip empty row

      const nip = cols[0] || `NIP-BQB-${String(Date.now()).slice(-4)}${idx}`;
      const nisnVal = cols[1] || `009${String(Date.now()).slice(-4)}${idx}`;
      const nama = cols[2] || `Santri Baru ${idx + 1}`;
      const email = cols[3] && cols[3].includes('@') 
        ? cols[3] 
        : generateLinkedEmail(nama, nisnVal);
      const tempatLahir = cols[4] || 'Belopa';
      const tanggalLahir = cols[5] || '2009-01-01';
      const alamat = cols[6] || 'Belopa, Kab. Luwu';
      
      const rawProg = (cols[7] || '').toUpperCase();
      let program: ProgramSantri = 'TAHFIDZ & DINIYAH';
      if (rawProg.includes('TAHFIDZ') && !rawProg.includes('DINIYAH')) program = 'TAHFIDZ';
      else if (rawProg.includes('DINIYAH') && !rawProg.includes('TAHFIDZ')) program = 'DINIYAH';

      const rawJenj = (cols[8] || '').toUpperCase();
      let jenjang: JenjangPendidikan = 'SMP/MTs';
      if (rawJenj.includes('SMA') || rawJenj.includes('MA')) jenjang = 'SMA/MA';
      else if (rawJenj.includes('UMUM')) jenjang = 'UMUM';

      const asalSekolah = cols[9] || 'SMP/MTs';
      const noTlp = cols[10] || '08123456789';
      const namaAyah = cols[11] || '-';
      const pekerjaanAyah = cols[12] || '-';
      const statusAyah: StatusOrtu = (cols[13] || '').toUpperCase().includes('MENINGGAL') ? 'MENINGGAL' : 'HIDUP';
      const namaIbu = cols[14] || '-';
      const pekerjaanIbu = cols[15] || '-';
      const statusIbu: StatusOrtu = (cols[16] || '').toUpperCase().includes('MENINGGAL') ? 'MENINGGAL' : 'HIDUP';

      newSantriItems.push({
        nip,
        nisn: nisnVal,
        nis: nisnVal,
        nama,
        email,
        tempatLahir,
        tanggalLahir,
        alamat,
        program,
        jenjangPendidikan: jenjang,
        asalSekolah,
        noTlp,
        fotoUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80`,
        namaAyah,
        pekerjaanAyah,
        statusAyah,
        namaIbu,
        pekerjaanIbu,
        statusIbu,
        tahunMasuk: Number(cols[17]) || 2024,
        kelas: (cols[18] && ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'].includes(cols[18]) ? cols[18] : 'Kelas 1') as KelasSantri
      });
    });

    if (newSantriItems.length > 0) {
      await onBulkAdd(newSantriItems);
      setIsPasteModalOpen(false);
      setPasteRawText('');
      setCopySuccessMsg(`Berhasil menambahkan ${newSantriItems.length} santri baru dari Excel!`);
      setTimeout(() => setCopySuccessMsg(''), 4000);
    } else {
      alert('Tidak ada baris data santri yang valid ditemukan.');
    }
  };

  // Form State for Add / Edit
  const [formState, setFormState] = useState<Omit<Santri, 'id'>>({
    nip: '',
    nisn: '',
    nis: '',
    nama: '',
    email: '',
    tahunMasuk: 2024,
    kelas: 'Kelas 1',
    tempatLahir: 'Belopa',
    tanggalLahir: '2009-05-10',
    alamat: 'Kec. Belopa, Kab. Luwu',
    program: 'TAHFIDZ & DINIYAH',
    jenjangPendidikan: 'SMP/MTs',
    asalSekolah: '',
    noTlp: '',
    fotoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    namaAyah: '',
    pekerjaanAyah: '',
    statusAyah: 'HIDUP',
    namaIbu: '',
    pekerjaanIbu: '',
    statusIbu: 'HIDUP'
  });

  const openAddModal = () => {
    // Siapkan form input manual untuk NIP, NISN, Nama, Email, Tahun Masuk, dan Kelas
    setFormState({
      nip: '',
      nisn: '',
      nis: '',
      nama: '',
      email: '',
      tahunMasuk: 2024,
      kelas: 'Kelas 1',
      kelasList: ['Kelas 1'],
      tempatLahir: 'Belopa',
      tanggalLahir: '2009-01-01',
      alamat: 'Belopa, Kab. Luwu',
      program: 'TAHFIDZ & DINIYAH',
      jenjangPendidikan: 'SMP/MTs',
      asalSekolah: '',
      noTlp: '08',
      fotoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      namaAyah: '',
      pekerjaanAyah: '',
      statusAyah: 'HIDUP',
      namaIbu: '',
      pekerjaanIbu: '',
      statusIbu: 'HIDUP'
    });
    setEditingSantri(null);
    setFormPhotoStats(null);
    setPhotoErrorAlert(null);
    setShowUrlInput(false);
    setIsAddModalOpen(true);
  };

  const openEditModal = (santri: Santri) => {
    if (!canEditOrDelete) {
      alert('Perhatian: Akun Anda hanya memiliki izin tambah data. Edit data hanya dapat dilakukan oleh Admin.');
      return;
    }
    const nisnVal = santri.nisn || santri.nis || santri.npm || '';
    const derivedClasses = (santri.kelasList && santri.kelasList.length > 0) 
      ? santri.kelasList 
      : (getSantriClasses(santri) as any);
    setEditingSantri(santri);
    setFormState({ 
      ...santri,
      nisn: nisnVal,
      nis: nisnVal,
      tahunMasuk: santri.tahunMasuk || 2024,
      kelas: santri.kelas || 'Kelas 1',
      kelasList: derivedClasses
    });
    setFormPhotoStats(null);
    setPhotoErrorAlert(null);
    setShowUrlInput(false);
    setIsAddModalOpen(true);
  };

  const handleSaveSantriForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.nama.trim()) {
      alert('Nama santri wajib diisi!');
      return;
    }

    const nisnVal = (formState.nisn || formState.nis || '').trim();
    // Ensure email is generated if left empty
    const finalEmail = formState.email.trim() || 
      generateLinkedEmail(formState.nama, nisnVal);

    const dataToSave = {
      ...formState,
      nisn: nisnVal,
      nis: nisnVal,
      email: finalEmail
    };

    const savedNama = formState.nama;
    const isEdit = !!editingSantri;

    // Tutup modal form secara instan dan otomatis begitu tombol simpan ditekan
    setIsAddModalOpen(false);
    setEditingSantri(null);

    try {
      if (isEdit && editingSantri) {
        await onUpdateSantri(editingSantri.id, dataToSave);
        setCopySuccessMsg(`Data santri "${savedNama}" berhasil diperbarui.`);
      } else {
        await onAddSantri(dataToSave);
        setCopySuccessMsg(`Data santri "${savedNama}" berhasil disimpan dan form ditutup otomatis.`);
      }
    } catch (err) {
      console.error("Gagal menyimpan santri:", err);
      alert('Terjadi kendala saat menyimpan data ke database.');
    } finally {
      setIsAddModalOpen(false);
      setEditingSantri(null);
    }

    setTimeout(() => setCopySuccessMsg(''), 5000);
  };

  // Handler upload foto dari tabel santri langsung
  const handleTablePhotoUpload = async (santri: Santri, file: File) => {
    if (!canEditOrDelete) {
      alert('Akses Terbatas: Hanya akun Admin yang dapat mengedit atau mengganti foto santri yang sudah tersimpan. Pengguna (User 1 & User 2) dapat mengunggah foto saat Tambah Santri Baru.');
      return;
    }

    const validation = validateJpgUpload(file);
    if (!validation.valid) {
      setPhotoErrorAlert(validation.error || 'Format file harus berupa JPG (.jpg / .jpeg)');
      setTimeout(() => setPhotoErrorAlert(null), 6000);
      return;
    }

    try {
      setIsProcessingPhotoId(santri.id);
      setPhotoErrorAlert(null);
      const processed = await resizeSantriPhotoTo1cm(file);
      await onUpdateSantri(santri.id, { fotoUrl: processed.dataUrl });
      
      // Jika modal individual santri terbuka untuk santri ini, update juga
      if (individualSantriModal && individualSantriModal.id === santri.id) {
        setIndividualSantriModal(prev => prev ? { ...prev, fotoUrl: processed.dataUrl } : null);
      }

      setCopySuccessMsg(`Foto santri "${santri.nama}" berhasil diunggah dan otomatis diubah menjadi ukuran 1cm x 1cm (${processed.width}x${processed.height} px format JPG)!`);
      setTimeout(() => setCopySuccessMsg(''), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses foto santri.';
      setPhotoErrorAlert(`Upload Foto Gagal: ${msg}`);
      setTimeout(() => setPhotoErrorAlert(null), 6000);
    } finally {
      setIsProcessingPhotoId(null);
    }
  };

  // Handler upload foto di Form Modal (Tambah / Edit)
  const handleFormPhotoUpload = async (file: File) => {
    const validation = validateJpgUpload(file);
    if (!validation.valid) {
      setPhotoErrorAlert(validation.error || 'Format file harus berupa JPG (.jpg / .jpeg)');
      setTimeout(() => setPhotoErrorAlert(null), 6000);
      return;
    }

    try {
      setIsFormPhotoProcessing(true);
      setPhotoErrorAlert(null);
      const processed = await resizeSantriPhotoTo1cm(file);
      setFormState(prev => ({ ...prev, fotoUrl: processed.dataUrl }));
      setFormPhotoStats({
        name: processed.originalName,
        originalKb: processed.originalSizeKb,
        finalKb: processed.finalSizeKb
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses foto santri.';
      setPhotoErrorAlert(msg);
      setTimeout(() => setPhotoErrorAlert(null), 6000);
    } finally {
      setIsFormPhotoProcessing(false);
    }
  };

  // Helper to generate linked email from Nama and NISN
  const generateLinkedEmail = (nama: string, nisnVal: string) => {
    const slug = (nama || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
    const cleanNisn = (nisnVal || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!slug) return '';
    return cleanNisn ? `${slug}.${cleanNisn.slice(-4)}@santri.id` : `${slug}@santri.id`;
  };

  // Input Manual Nama Santri (tidak menimpa email manual)
  const handleNamaChange = (newNama: string) => {
    setFormState(prev => ({
      ...prev,
      nama: newNama
    }));
  };

  // Input Manual NISN Santri (tidak menimpa email manual)
  const handleNisnChange = (newNisn: string) => {
    setFormState(prev => ({
      ...prev,
      nisn: newNisn,
      nis: newNisn
    }));
  };

  // Helper opsional untuk generate NIP & NISN contoh secara otomatis
  const handleGenerateAutoNipNisn = () => {
    const nextNum = santriList.length + 1;
    const nipVal = `NIP-BQB-${String(nextNum).padStart(4, '0')}`;
    const nisnVal = `009${String(Date.now()).slice(-3)}${String(nextNum).padStart(4, '0')}`;
    setFormState(prev => ({
      ...prev,
      nip: nipVal,
      nisn: nisnVal,
      nis: nisnVal
    }));
    setCopySuccessMsg('Contoh NIP & NISN berhasil di-generate!');
    setTimeout(() => setCopySuccessMsg(''), 3000);
  };

  // Manual trigger untuk auto-generate email bila diperlukan
  const handleSyncLinkedEmail = () => {
    const currentNisn = formState.nisn || formState.nis || '';
    const autoEmail = generateLinkedEmail(formState.nama || 'santri', currentNisn);
    if (autoEmail) {
      setFormState(prev => ({ ...prev, email: autoEmail }));
      setCopySuccessMsg('Email berhasil di-generate dari Nama & NISN!');
      setTimeout(() => setCopySuccessMsg(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {copySuccessMsg && (
        <div className="p-4 bg-emerald-700 text-white rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-amber-300 shrink-0" />
            <span className="text-sm font-medium">{copySuccessMsg}</span>
          </div>
          <button onClick={() => setCopySuccessMsg('')} className="p-1 hover:bg-emerald-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert Toast */}
      {photoErrorAlert && (
        <div className="p-4 bg-red-600 text-white rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-200 shrink-0" />
            <span className="text-sm font-medium">{photoErrorAlert}</span>
          </div>
          <button onClick={() => setPhotoErrorAlert(null)} className="p-1 hover:bg-red-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Actions Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Tabel & Manajemen Data Santri
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {filteredSantri.length} Santri Terdaftar
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pondok Pesantren Baitul Qur'an Belopa • Luwu, Sulawesi Selatan
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tambah Santri */}
            <button
              id="btn-tambah-santri"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Tambah Santri</span>
            </button>

            {/* Fasilitas Naik / Tinggal Kelas */}
            <button
              id="btn-fasilitas-kenaikan-santri"
              onClick={() => {
                setSelectedSantriForKenaikanId(null);
                setIsKenaikanModalOpen(true);
              }}
              title="Atur Kenaikan Kelas atau Tinggal Kelas Santri (Hingga Kelas 6)"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-sm transition-all border border-amber-400/40 cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-amber-300" />
              <span>Naik / Tinggal Kelas</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-400 text-emerald-950 text-[10px] font-black">
                s/d Kls 6
              </span>
            </button>

            {/* Copy ke Excel */}
            <button
              id="btn-copy-excel-santri"
              onClick={() => handleCopyTableToExcel(false)}
              title="Salin tabel data santri ke format Excel (TSV)"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold transition"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-700" />
              <span>Copy ke Excel</span>
            </button>

            {/* Copy SEMUA Data */}
            <button
              id="btn-copy-all-santri"
              onClick={handleCopyAllData}
              title="Salin seluruh data santri sekaligus ke clipboard Excel"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-semibold transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
              <span>Copy Semua Data</span>
            </button>

            {/* Tempel dari Excel */}
            <button
              id="btn-paste-excel-santri"
              onClick={() => setIsPasteModalOpen(true)}
              title="Tempel data dari Microsoft Excel atau Google Sheets"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-amber-700" />
              <span>Tempel dari Excel</span>
            </button>

            {/* Download CSV */}
            <button
              id="btn-download-csv-santri"
              onClick={handleDownloadCSV}
              title="Unduh file data santri dalam format CSV"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition border border-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Download CSV</span>
            </button>

            {/* Toggle Grafik */}
            <button
              id="btn-toggle-grafik-santri"
              onClick={() => setShowCharts(!showCharts)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                showCharts 
                  ? 'bg-amber-500 text-emerald-950 border-amber-400 font-bold' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{showCharts ? 'Sembunyikan Grafik' : 'Lihat Grafik'}</span>
            </button>

            {/* Hapus Semua Data (Admin Only) */}
            {canEditOrDelete && (
              <button
                id="btn-delete-all-santri"
                onClick={() => setConfirmDeleteAllOpen(true)}
                title="Hapus semua data santri (Khusus Admin)"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Hapus Semua Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="search-santri"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari NIP, NISN, Nama, Email, Alamat..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
            />
          </div>

          {/* Program Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="filter-program-santri"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">Semua Program</option>
              <option value="TAHFIDZ">TAHFIDZ</option>
              <option value="DINIYAH">DINIYAH</option>
              <option value="TAHFIDZ & DINIYAH">TAHFIDZ & DINIYAH</option>
            </select>
          </div>

          {/* Jenjang Filter */}
          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="filter-jenjang-santri"
              value={selectedJenjang}
              onChange={(e) => setSelectedJenjang(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">Semua Jenjang</option>
              <option value="SMP/MTs">SMP/MTs</option>
              <option value="SMA/MA">SMA/MA</option>
              <option value="UMUM">UMUM</option>
            </select>
          </div>

          {/* Kelas Filter (Pilihan Kelas 1 sampai Kelas 6) */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <select
              id="filter-kelas-santri"
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-emerald-50/50 border border-emerald-300 font-semibold text-emerald-950 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">Semua Kelas (1 - 6)</option>
              <option value="Kelas 1">Kelas 1</option>
              <option value="Kelas 2">Kelas 2</option>
              <option value="Kelas 3">Kelas 3</option>
              <option value="Kelas 4">Kelas 4</option>
              <option value="Kelas 5">Kelas 5</option>
              <option value="Kelas 6">Kelas 6</option>
            </select>
          </div>

          {/* Status Orang Tua Filter */}
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="filter-status-ayah"
              value={selectedStatusAyah}
              onChange={(e) => setSelectedStatusAyah(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">Status Ayah: Semua</option>
              <option value="HIDUP">Ayah Hidup</option>
              <option value="MENINGGAL">Ayah Meninggal (Yatim)</option>
            </select>
          </div>
        </div>

        {/* Selected Rows Multi-Action Bar */}
        {selectedIds.length > 0 && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-medium text-emerald-900">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>{selectedIds.length} santri terpilih</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyTableToExcel(true)}
                className="px-2.5 py-1 bg-white border border-emerald-300 hover:bg-emerald-100 rounded text-emerald-800 font-semibold"
              >
                Copy Terpilih ke Excel
              </button>
              {canEditOrDelete && (
                <button
                  onClick={() => {
                    if (confirm(`Yakin ingin menghapus ${selectedIds.length} santri terpilih?`)) {
                      onDeleteMultiple(selectedIds);
                      setSelectedIds([]);
                    }
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold"
                >
                  Hapus Terpilih
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* GRAFIK DATA SANTRI SECTION */}
      {showCharts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Grafik Program Santri */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Grafik Santri Berdasarkan Program
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">Total: {filteredSantri.length}</span>
            </div>

            <div className="space-y-3 pt-2">
              {Object.entries(statsProgram).map(([prog, count]) => {
                const total = filteredSantri.length || 1;
                const countNum = Number(count) || 0;
                const pct = Math.round((countNum / total) * 100);
                return (
                  <div key={prog} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{prog}</span>
                      <span className="text-slate-500 font-medium">{countNum} santri ({pct}%)</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          prog === 'TAHFIDZ' ? 'bg-emerald-600' :
                          prog === 'DINIYAH' ? 'bg-amber-500' : 'bg-teal-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grafik Jenjang Pendidikan */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-amber-600" />
                Grafik Santri Berdasarkan Jenjang Pendidikan
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">SMP/MTs • SMA/MA • Umum</span>
            </div>

            <div className="space-y-3 pt-2">
              {Object.entries(statsJenjang).map(([jenj, count]) => {
                const total = filteredSantri.length || 1;
                const countNum = Number(count) || 0;
                const pct = Math.round((countNum / total) * 100);
                return (
                  <div key={jenj} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{jenj}</span>
                      <span className="text-slate-500 font-medium">{countNum} santri ({pct}%)</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          jenj === 'SMP/MTs' ? 'bg-indigo-600' :
                          jenj === 'SMA/MA' ? 'bg-amber-500' : 'bg-emerald-700'
                        }`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TABEL DATA SANTRI LENGKAP */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Banner Penjelas Kolom Terpisah tapi Saling Terkait */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50/50 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-800 text-amber-300 shadow-sm">
              <Link2 className="w-3 h-3" />
            </span>
            <span className="font-bold">Kolom Identitas Santri:</span>
            <span className="text-slate-700">
              Kolom tersendiri untuk <strong>NIP</strong>, <strong>NISN</strong>, <strong>Nama Santri</strong>, dan <strong>Email</strong> (tersaji terpisah &amp; otomatis tersinkronisasi).
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-emerald-800">
            <span className="bg-white/90 border border-emerald-200 px-2.5 py-0.5 rounded-md font-medium text-emerald-900 shadow-xs">
              💡 Kolom tersendiri untuk NIP, NISN, Nama, dan Email
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-emerald-900 text-white font-semibold">
                {/* Checkbox Seleksi Semua */}
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    id="select-all-santri"
                    checked={selectedIds.length === filteredSantri.length && filteredSantri.length > 0}
                    onChange={handleSelectAllToggle}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="p-3 whitespace-nowrap text-center" title="Foto 1cm x 1cm (Klik foto untuk upload file JPG)">FOTO (1cm x 1cm)</th>

                {/* 4 Kolom Tersendiri: NIP, NISN, NAMA SANTRI, EMAIL */}
                <th 
                  className="p-3 whitespace-nowrap bg-emerald-950/95 border-l border-emerald-700/70 font-mono text-emerald-100" 
                  title="Kolom Tersendiri: NIP (Nomor Induk Pondok)"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                    <span>NIP</span>
                  </div>
                </th>
                <th 
                  className="p-3 whitespace-nowrap bg-emerald-950/95 border-l border-emerald-800/60 font-mono text-emerald-100" 
                  title="Kolom Tersendiri: NISN (Nomor Induk Siswa Nasional)"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                    <span>NISN</span>
                  </div>
                </th>
                <th 
                  className="p-3 whitespace-nowrap bg-emerald-950/95 border-l border-emerald-800/60 text-emerald-100" 
                  title="Kolom Tersendiri: Nama Lengkap Santri"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
                    <span>NAMA SANTRI</span>
                  </div>
                </th>
                <th 
                  className="p-3 whitespace-nowrap bg-emerald-950/95 border-l border-r border-emerald-700/70 text-emerald-100" 
                  title="Kolom Tersendiri: Email Santri"
                >
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>EMAIL</span>
                  </div>
                </th>

                {/* Kolom Tahun Masuk dan Kolom Kelas (Kelas 1 sampai Kelas 6) */}
                <th className="p-3 whitespace-nowrap bg-emerald-950 text-amber-200 border-r border-emerald-700/60 font-semibold" title="Tahun Masuk Santri">
                  TAHUN MASUK
                </th>
                <th className="p-3 whitespace-nowrap bg-emerald-950 text-amber-300 border-r border-emerald-700/60 font-bold" title="Pilihan Kelas 1 sampai Kelas 6">
                  KELAS (1 - 6)
                </th>

                <th className="p-3 whitespace-nowrap">PROGRAM</th>
                <th className="p-3 whitespace-nowrap">JENJANG</th>
                <th className="p-3 whitespace-nowrap">T. LAHIR</th>
                <th className="p-3 whitespace-nowrap">TGL LAHIR</th>
                <th className="p-3 whitespace-nowrap">ALAMAT</th>
                <th className="p-3 whitespace-nowrap">ASAL SEKOLAH</th>
                <th className="p-3 whitespace-nowrap">NO TLP</th>
                <th className="p-3 whitespace-nowrap">NAMA AYAH</th>
                <th className="p-3 whitespace-nowrap">PEKERJAAN AYAH</th>
                <th className="p-3 whitespace-nowrap">STATUS AYAH</th>
                <th className="p-3 whitespace-nowrap">NAMA IBU</th>
                <th className="p-3 whitespace-nowrap">PEKERJAAN IBU</th>
                <th className="p-3 whitespace-nowrap">STATUS IBU</th>
                <th className="p-3 whitespace-nowrap text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSantri.length === 0 ? (
                <tr>
                  <td colSpan={20} className="p-8 text-center text-slate-400">
                    Tidak ada data santri yang sesuai filter atau kata kunci.
                  </td>
                </tr>
              ) : (
                filteredSantri.map((s) => {
                  const isChecked = selectedIds.includes(s.id);
                  const isLinkedHovered = hoveredLinkedSantriId === s.id;
                  const nisnValue = s.nisn || s.nis || s.npm || '-';

                  return (
                    <tr 
                      key={s.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-emerald-50/50' : ''}`}
                    >
                      {/* Checkbox per row */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(s.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Foto ukuran 1cm x 1cm (38px x 38px pada 96 DPI) */}
                      <td className="p-2 text-center">
                        <div className="inline-flex flex-col items-center group relative">
                          <div 
                            style={{ width: `${PIXELS_PER_CM}px`, height: `${PIXELS_PER_CM}px` }} 
                            className="rounded-md overflow-hidden bg-slate-100 border border-slate-300 shrink-0 relative shadow-sm transition-transform group-hover:scale-105"
                            title={`Foto santri: ${s.nama} (Ukuran 1cm x 1cm). Klik untuk upload foto JPG.`}
                          >
                            <img
                              src={(s.fotoUrl && s.fotoUrl.trim()) ? s.fotoUrl : DEFAULT_SANTRI_FOTO}
                              alt={s.nama || 'Santri'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // fallback image
                                (e.target as HTMLImageElement).src = DEFAULT_SANTRI_FOTO;
                              }}
                            />

                            {/* Loading Overlay */}
                            {isProcessingPhotoId === s.id && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                              </div>
                            )}

                            {/* Camera Upload Button Overlay */}
                            {isProcessingPhotoId !== s.id && (
                              <label
                                htmlFor={`photo-upload-table-${s.id}`}
                                onClick={(e) => {
                                  if (!canEditOrDelete) {
                                    e.preventDefault();
                                    alert('Akses Terbatas: Hanya Admin yang dapat mengedit/mengganti foto santri yang sudah tersimpan. Pengguna (User 1 & 2) dapat mengunggah foto saat Tambah Santri Baru.');
                                  }
                                }}
                                className={`absolute inset-0 bg-emerald-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white ${
                                  canEditOrDelete ? 'cursor-pointer' : 'cursor-not-allowed'
                                }`}
                                title={
                                  canEditOrDelete
                                    ? 'Upload Foto JPG (Otomatis diubah menjadi 1cm x 1cm)'
                                    : 'Hanya Admin yang dapat mengedit foto santri tersimpan'
                                }
                              >
                                <Camera className="w-3 h-3 text-amber-300 drop-shadow" />
                              </label>
                            )}
                          </div>

                          {/* Hidden File Input for this santri row */}
                          {canEditOrDelete && (
                            <input
                              id={`photo-upload-table-${s.id}`}
                              type="file"
                              accept=".jpg,.jpeg,image/jpeg"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleTablePhotoUpload(s, file);
                                }
                                e.target.value = '';
                              }}
                            />
                          )}
                        </div>
                      </td>

                      {/* 1. NIP (Kolom Tersendiri) */}
                      <td 
                        onMouseEnter={() => setHoveredLinkedSantriId(s.id)}
                        onMouseLeave={() => setHoveredLinkedSantriId(null)}
                        className={`p-3 font-mono font-bold whitespace-nowrap transition-all border-l ${
                          isLinkedHovered 
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-600 ring-1 ring-emerald-500/50 shadow-inner' 
                            : 'text-slate-900 border-slate-200/60'
                        }`}
                        title={`Kolom NIP: ${s.nip}`}
                      >
                        <div className="flex items-center gap-1.5">
                          {isLinkedHovered && <Link2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 animate-pulse" />}
                          <span>{s.nip}</span>
                        </div>
                      </td>

                      {/* 2. NISN (Kolom Tersendiri) */}
                      <td 
                        onMouseEnter={() => setHoveredLinkedSantriId(s.id)}
                        onMouseLeave={() => setHoveredLinkedSantriId(null)}
                        className={`p-3 font-mono whitespace-nowrap transition-all border-l ${
                          isLinkedHovered 
                            ? 'bg-emerald-100 text-emerald-950 font-bold ring-1 ring-emerald-500/50 shadow-inner' 
                            : 'font-semibold text-emerald-800 border-slate-200/60'
                        }`}
                        title={`Kolom NISN: ${nisnValue}`}
                      >
                        <div className="flex items-center gap-1.5">
                          {isLinkedHovered && <Link2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                          <span>{nisnValue}</span>
                        </div>
                      </td>

                      {/* 3. NAMA SANTRI (Kolom Tersendiri) */}
                      <td 
                        onMouseEnter={() => setHoveredLinkedSantriId(s.id)}
                        onMouseLeave={() => setHoveredLinkedSantriId(null)}
                        className={`p-3 whitespace-nowrap transition-all border-l ${
                          isLinkedHovered 
                            ? 'bg-emerald-100 text-emerald-950 font-bold ring-1 ring-emerald-500/50 shadow-inner' 
                            : 'font-semibold text-slate-900 border-slate-200/60'
                        }`}
                        title={`Kolom Nama Santri: ${s.nama}`}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIndividualSantriModal(s)}
                            className="hover:text-emerald-700 hover:underline text-left font-bold"
                            title="Klik untuk melihat Formulir Biodata Santri Per Orang"
                          >
                            {s.nama}
                          </button>
                          {isLinkedHovered && (
                            <button
                              onClick={(e) => handleCopyLinkedIdentity(s, e)}
                              title="Salin Rangkaian Identitas Terkait (NIP • NISN • Nama • Email)"
                              className="px-1.5 py-0.5 rounded bg-emerald-200 hover:bg-emerald-300 text-emerald-900 transition flex items-center gap-1 text-[10px] font-medium"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Salin</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 4. EMAIL (Kolom Tersendiri) */}
                      <td 
                        onMouseEnter={() => setHoveredLinkedSantriId(s.id)}
                        onMouseLeave={() => setHoveredLinkedSantriId(null)}
                        className={`p-3 whitespace-nowrap font-mono text-[11px] transition-all border-l border-r ${
                          isLinkedHovered 
                            ? 'bg-emerald-100 text-emerald-950 font-semibold border-emerald-600 ring-1 ring-emerald-500/50 shadow-inner' 
                            : 'text-slate-600 border-slate-200/60'
                        }`}
                        title={`Kolom Email: ${s.email}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Mail className={`w-3.5 h-3.5 ${isLinkedHovered ? 'text-emerald-700' : 'text-slate-400'} shrink-0`} />
                          <span>{s.email}</span>
                        </div>
                      </td>

                      {/* TAHUN MASUK */}
                      <td className="p-3 whitespace-nowrap text-center font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200/60">
                        {s.tahunMasuk || 2024}
                      </td>

                      {/* KELAS (Dapat Memilih & Menampilkan Lebih Dari 1 Kelas) */}
                      <td className="p-3 text-center border-r border-slate-200/60">
                        <div className="flex flex-wrap gap-1 justify-center items-center max-w-[130px] mx-auto">
                          {getSantriClasses(s).map(k => (
                            <span 
                              key={k} 
                              className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs whitespace-nowrap"
                              title={`Santri terdaftar pada ${k} (terhubung ke Form Pembayaran Khusus)`}
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                        {s.statusAkademik && (
                          <div className="mt-1">
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              s.statusAkademik === 'Naik Kelas'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : s.statusAkademik === 'Tinggal Kelas'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-purple-100 text-purple-800 border border-purple-300'
                            }`}>
                              {s.statusAkademik}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* PROGRAM */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.program === 'TAHFIDZ' 
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.program === 'DINIYAH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}>
                          {s.program}
                        </span>
                      </td>

                      {/* JENJANG PENDIDIKAN */}
                      <td className="p-3 whitespace-nowrap font-medium text-slate-700">
                        {s.jenjangPendidikan}
                      </td>

                      {/* T. LAHIR */}
                      <td className="p-3 whitespace-nowrap text-slate-700">
                        {s.tempatLahir}
                      </td>

                      {/* TGL LAHIR */}
                      <td className="p-3 whitespace-nowrap text-slate-700">
                        {s.tanggalLahir}
                      </td>

                      {/* ALAMAT */}
                      <td className="p-3 text-slate-600 max-w-[180px] truncate" title={s.alamat}>
                        {s.alamat}
                      </td>

                      {/* ASAL SEKOLAH */}
                      <td className="p-3 whitespace-nowrap text-slate-600">
                        {s.asalSekolah || '-'}
                      </td>

                      {/* NO TLP */}
                      <td className="p-3 whitespace-nowrap text-slate-700">
                        {s.noTlp}
                      </td>

                      {/* NAMA AYAH */}
                      <td className="p-3 whitespace-nowrap text-slate-800">
                        {s.namaAyah}
                      </td>

                      {/* PEKERJAAN AYAH */}
                      <td className="p-3 whitespace-nowrap text-slate-600">
                        {s.pekerjaanAyah}
                      </td>

                      {/* STATUS AYAH */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          s.statusAyah === 'HIDUP' 
                            ? 'bg-slate-100 text-slate-700' 
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {s.statusAyah}
                        </span>
                      </td>

                      {/* NAMA IBU */}
                      <td className="p-3 whitespace-nowrap text-slate-800">
                        {s.namaIbu}
                      </td>

                      {/* PEKERJAAN IBU */}
                      <td className="p-3 whitespace-nowrap text-slate-600">
                        {s.pekerjaanIbu}
                      </td>

                      {/* STATUS IBU */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          s.statusIbu === 'HIDUP' 
                            ? 'bg-slate-100 text-slate-700' 
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {s.statusIbu}
                        </span>
                      </td>

                      {/* AKSI (Edit & Hapus hanya untuk Admin) */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* View Biodata Per Orang */}
                          <button
                            onClick={() => setIndividualSantriModal(s)}
                            title="Lihat Biodata Per Orang"
                            className="p-1 rounded hover:bg-slate-200 text-slate-600 transition"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>

                          {/* Kenaikan / Tinggal Kelas Per Santri */}
                          <button
                            onClick={() => {
                              setSelectedSantriForKenaikanId(s.id);
                              setIsKenaikanModalOpen(true);
                            }}
                            title={`Atur Kenaikan/Tinggal Kelas (${s.nama})`}
                            className="p-1 rounded hover:bg-amber-100 text-amber-800 transition cursor-pointer"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                          </button>

                          {canEditOrDelete ? (
                            <>
                              <button
                                onClick={() => openEditModal(s)}
                                title="Edit Data Santri (Khusus Admin)"
                                className="p-1 rounded hover:bg-emerald-100 text-emerald-800 transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus santri ${s.nama}?`)) {
                                    onDeleteSantri(s.id);
                                  }
                                }}
                                title="Hapus Data Santri (Khusus Admin)"
                                className="p-1 rounded hover:bg-rose-100 text-rose-700 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span 
                              title="User 1 & User 2 hanya bisa tambah data (tak bisa edit/hapus)"
                              className="text-[10px] text-slate-400 italic px-1"
                            >
                              View Only
                            </span>
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

      {/* FORM DATA SANTRI PER ORANG MODAL (Sesuai Permintaan) */}
      {individualSantriModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest">
                  PP BAITUL QUR’AN BELOPA
                </span>
                <h3 className="text-lg font-bold">Formulir Data Santri Per Orang</h3>
              </div>
              <button
                onClick={() => setIndividualSantriModal(null)}
                className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Santri Identity Banner */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                {/* Foto 1cm x 1cm display with option to view enlarged */}
                <div className="text-center flex flex-col items-center">
                  <div className="flex items-center gap-3">
                    {/* Actual 1cm x 1cm (38px x 38px) */}
                    <div className="flex flex-col items-center">
                      <div 
                        style={{ width: `${PIXELS_PER_CM}px`, height: `${PIXELS_PER_CM}px` }} 
                        className="rounded-md overflow-hidden bg-slate-200 border-2 border-emerald-600 shadow-sm relative shrink-0"
                        title="Foto Ukuran Pas 1cm x 1cm"
                      >
                        <img
                          src={(individualSantriModal.fotoUrl && individualSantriModal.fotoUrl.trim()) ? individualSantriModal.fotoUrl : DEFAULT_SANTRI_FOTO}
                          alt={individualSantriModal.nama || 'Santri'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_SANTRI_FOTO;
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 mt-0.5">1cm x 1cm</span>
                    </div>

                    {/* Enlarged view */}
                    <div className="flex flex-col items-center">
                      <div 
                        style={{ width: '64px', height: '64px' }} 
                        className="rounded-xl overflow-hidden bg-slate-200 border-2 border-emerald-700 shadow-md relative shrink-0"
                        title="Tampilan Pembesar"
                      >
                        <img
                          src={(individualSantriModal.fotoUrl && individualSantriModal.fotoUrl.trim()) ? individualSantriModal.fotoUrl : DEFAULT_SANTRI_FOTO}
                          alt={individualSantriModal.nama || 'Santri'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_SANTRI_FOTO;
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5">Pratinjau</span>
                    </div>
                  </div>

                  {/* Direct upload button for admin */}
                  {canEditOrDelete && (
                    <label className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold cursor-pointer transition">
                      <Camera className="w-3 h-3 text-emerald-700" />
                      <span>Ganti Foto JPG</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && individualSantriModal) {
                            handleTablePhotoUpload(individualSantriModal, file);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h4 className="text-lg font-bold text-slate-900">{individualSantriModal.nama}</h4>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 flex items-center gap-1">
                      <Link2 className="w-3 h-3 text-emerald-700" />
                      NIP: {individualSantriModal.nip}
                    </span>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 flex items-center gap-1">
                      <Link2 className="w-3 h-3 text-amber-700" />
                      NISN: {individualSantriModal.nisn || individualSantriModal.nis || individualSantriModal.npm}
                    </span>
                    <span className="text-xs text-slate-700 font-mono flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                      <Mail className="w-3 h-3 text-emerald-700" />
                      {individualSantriModal.email}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-800 text-white">
                      {individualSantriModal.program}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                      {individualSantriModal.jenjangPendidikan}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Detail Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Data Pribadi */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-800 text-sm border-b pb-1.5 border-slate-100 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-emerald-700" />
                    Data Akademik & Pribadi
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-slate-500">Tempat, Tgl Lahir:</span>
                    <span className="col-span-2 font-medium text-slate-800">
                      {individualSantriModal.tempatLahir}, {formatDateIndo(individualSantriModal.tanggalLahir)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-slate-500">Alamat Domisili:</span>
                    <span className="col-span-2 font-medium text-slate-800">{individualSantriModal.alamat}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-slate-500">Asal Sekolah:</span>
                    <span className="col-span-2 font-medium text-slate-800">{individualSantriModal.asalSekolah || '-'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-slate-500">No. Telepon / WA:</span>
                    <span className="col-span-2 font-medium text-slate-800 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      {individualSantriModal.noTlp}
                    </span>
                  </div>
                </div>

                {/* Data Orang Tua */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="font-bold text-slate-800 text-sm border-b pb-1.5 border-slate-100 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-700" />
                    Data Orang Tua / Wali
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-slate-500">Nama Ayah:</span>
                    <span className="col-span-2 font-medium text-slate-800">
                      {individualSantriModal.namaAyah} ({individualSantriModal.statusAyah})
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-slate-500">Pekerjaan Ayah:</span>
                    <span className="col-span-2 font-medium text-slate-800">{individualSantriModal.pekerjaanAyah || '-'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-slate-500">Nama Ibu:</span>
                    <span className="col-span-2 font-medium text-slate-800">
                      {individualSantriModal.namaIbu} ({individualSantriModal.statusIbu})
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-slate-500">Pekerjaan Ibu:</span>
                    <span className="col-span-2 font-medium text-slate-800">{individualSantriModal.pekerjaanIbu || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Biodata</span>
              </button>

              <div className="flex items-center gap-2">
                {canEditOrDelete && (
                  <button
                    onClick={() => {
                      const cur = individualSantriModal;
                      setIndividualSantriModal(null);
                      openEditModal(cur);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-semibold hover:bg-emerald-700"
                  >
                    Edit Data Ini
                  </button>
                )}
                <button
                  onClick={() => setIndividualSantriModal(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300"
                >
                  Tutup
                </button>
              </div>
            </div>
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
                <h3 className="font-bold text-slate-900 text-base">Tempel Data dari Microsoft Excel</h3>
              </div>
              <button onClick={() => setIsPasteModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600">
                Salin baris santri dari Microsoft Excel atau Google Sheets, lalu tempel (Ctrl+V) ke dalam kotak teks di bawah. Sistem akan otomatis memetakan kolom:
              </p>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-600">
                Kolom: [NIP] [NISN] [NAMA] [EMAIL] [T. LAHIR] [TGL LAHIR] [ALAMAT] [PROGRAM] [JENJANG] [ASAL SEKOLAH] [NO TLP] [AYAH] [PEKERJAAN] [STATUS AYAH] [IBU] [PEKERJAAN] [STATUS IBU]
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
                  Import Data ke Sistem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT SANTRI */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full my-2 sm:my-6 flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header Modal - Selalu terlihat di atas (Fixed / Sticky) */}
            <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-xs border-b border-emerald-800">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  PP BAITUL QUR’AN BELOPA
                </span>
                <h3 className="text-base font-bold">
                  {editingSantri ? 'Edit Data Santri' : 'Form Tambah Santri Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white transition"
                title="Tutup form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body - Scrollable dari atas ke bawah */}
            <form onSubmit={handleSaveSantriForm} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
                {/* BAGIAN 1: KOLOM NIP DAN KOLOM NISN (INPUT MANUAL) */}
                <div className="p-4 rounded-xl border-2 border-emerald-600 bg-emerald-50/60 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-emerald-800 text-amber-300">
                        <Building2 className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                          KOLOM IDENTITAS UTAMA (NIP &amp; NISN SANTRI)
                        </h4>
                        <span className="text-[11px] text-emerald-900 font-medium">
                          Ketik NIP dan NISN secara manual pada masing-masing kolom di bawah ini:
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateAutoNipNisn}
                      className="text-[10px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-2.5 py-1 rounded shadow-xs transition flex items-center gap-1"
                      title="Generate format contoh NIP & NISN jika dibutuhkan"
                    >
                      <RefreshCw className="w-3 h-3 text-emerald-700" />
                      <span>Contoh NIP / NISN</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* KOLOM NIP */}
                    <div className="bg-white p-3 rounded-lg border-2 border-slate-300 focus-within:border-emerald-600 shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-900 text-xs">
                          KOLOM NIP (Nomor Induk Pondok)*
                        </label>
                        <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                          INTERNAL PONDOK
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={formState.nip}
                        onChange={(e) => setFormState(prev => ({ ...prev, nip: e.target.value }))}
                        placeholder="Contoh: NIP-BQB-0001"
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-mono text-sm font-bold text-slate-900 bg-white"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        ID pondok santri Baitul Qur'an Belopa (input manual)
                      </span>
                    </div>

                    {/* KOLOM NISN */}
                    <div className="bg-white p-3 rounded-lg border-2 border-slate-300 focus-within:border-emerald-600 shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-900 text-xs">
                          KOLOM NISN (Nomor Induk Siswa Nasional)*
                        </label>
                        <span className="text-[9px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                          10 DIGIT NASIONAL
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={formState.nisn || formState.nis || formState.npm || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormState(prev => ({ ...prev, nisn: val, nis: val }));
                        }}
                        placeholder="Contoh: 0091234567"
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-mono text-sm font-bold text-emerald-900 bg-white"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        10 digit NISN resmi santri (input manual)
                      </span>
                    </div>
                  </div>
                </div>

              {/* KOLOM NAMA LENGKAP SANTRI DAN KOLOM EMAIL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* KOLOM NAMA SANTRI */}
                <div>
                  <label className="block font-bold text-slate-800 text-xs mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Nama Lengkap Santri*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.nama}
                    onChange={(e) => setFormState(prev => ({ ...prev, nama: e.target.value }))}
                    placeholder="Contoh: Muhammad Farhan Al-Fatih"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-semibold text-xs text-slate-900 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Nama resmi santri sesuai dokumen akta kelahiran / ijazah
                  </span>
                </div>

                {/* KOLOM EMAIL SANTRI */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Alamat Email Santri*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSyncLinkedEmail}
                      className="text-[10px] font-semibold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded transition flex items-center gap-1"
                      title="Generate email otomatis dari Nama dan NISN jika diperlukan"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Auto Email</span>
                    </button>
                  </div>
                  <input
                    type="email"
                    required
                    value={formState.email}
                    onChange={(e) => setFormState(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Contoh: santri@gmail.com"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-mono text-xs text-slate-900 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Email untuk pengiriman bukti kwitansi syahriah &amp; informasi pondok
                  </span>
                </div>
              </div>

              {/* Upload Foto Santri (Wajib JPG & Otomatis 1cm x 1cm) */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    <span>Upload Foto Santri (Wajib File JPG • Otomatis Diubah ke 1cm x 1cm)</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-900 bg-emerald-200/80 px-2.5 py-0.5 rounded-full inline-block">
                    Standar Pas Foto: 1cm x 1cm ({PIXELS_PER_CM}×{PIXELS_PER_CM} px)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Real 1cm x 1cm preview */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div 
                      style={{ width: `${PIXELS_PER_CM}px`, height: `${PIXELS_PER_CM}px` }}
                      className="rounded-md overflow-hidden bg-slate-100 border-2 border-emerald-600 shadow-sm relative shrink-0"
                      title="Ukuran Nyata: 1cm x 1cm (38px x 38px)"
                    >
                      <img
                        src={(formState.fotoUrl && formState.fotoUrl.trim()) ? formState.fotoUrl : DEFAULT_SANTRI_FOTO}
                        alt="Preview 1cm x 1cm"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_SANTRI_FOTO;
                        }}
                      />
                      {isFormPhotoProcessing && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <RefreshCw className="w-3 h-3 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-slate-600">1cm x 1cm</span>
                  </div>

                  {/* Enlarged preview for clarity */}
                  <div className="flex flex-col items-center gap-1 shrink-0 hidden sm:flex">
                    <div 
                      style={{ width: '60px', height: '60px' }}
                      className="rounded-lg overflow-hidden bg-slate-100 border border-slate-300 shadow-sm relative shrink-0"
                      title="Pratinjau detail"
                    >
                      <img
                        src={(formState.fotoUrl && formState.fotoUrl.trim()) ? formState.fotoUrl : DEFAULT_SANTRI_FOTO}
                        alt="Preview Detail"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_SANTRI_FOTO;
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400">Pratinjau</span>
                  </div>

                  {/* Drag and Drop Zone & Button */}
                  <div className="flex-1 w-full space-y-2">
                    <div 
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFormPhotoUpload(file);
                      }}
                      className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl p-3 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            Tarik & Lepas Foto JPG di sini, atau klik tombol
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Hanya format <strong className="text-emerald-700">.JPG / .JPEG</strong> • Otomatis dipotong simetris 1cm x 1cm
                          </p>
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer shadow-sm transition shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih File JPG</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,image/jpeg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFormPhotoUpload(file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>

                    {/* Stats if processed */}
                    {formPhotoStats && (
                      <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                        <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>
                          Foto <strong>{formPhotoStats.name}</strong> berhasil diubah ke 1cm x 1cm ({PIXELS_PER_CM}×{PIXELS_PER_CM} px JPG). Ukuran awal {formPhotoStats.originalKb} KB ➔ kini {formPhotoStats.finalKb} KB.
                        </span>
                      </div>
                    )}

                    {/* Manual URL toggle */}
                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="text-emerald-700 hover:underline font-medium"
                      >
                        {showUrlInput ? 'Sembunyikan URL Foto' : 'Atau masukkan tautan URL foto'}
                      </button>
                    </div>

                    {showUrlInput && (
                      <input
                        type="text"
                        value={formState.fotoUrl}
                        onChange={(e) => setFormState({ ...formState, fotoUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Tahun Masuk */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Tahun Masuk*</label>
                  <input
                    type="number"
                    required
                    min="2015"
                    max="2035"
                    value={formState.tahunMasuk || 2024}
                    onChange={(e) => setFormState({ ...formState, tahunMasuk: parseInt(e.target.value) || 2024 })}
                    placeholder="2024"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 text-xs font-bold"
                  />
                </div>

                {/* Program */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Program*</label>
                  <select
                    value={formState.program}
                    onChange={(e) => setFormState({ ...formState, program: e.target.value as ProgramSantri })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 text-xs"
                  >
                    <option value="TAHFIDZ">TAHFIDZ</option>
                    <option value="DINIYAH">DINIYAH</option>
                    <option value="TAHFIDZ & DINIYAH">TAHFIDZ & DINIYAH</option>
                  </select>
                </div>

                {/* Jenjang */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Jenjang Pendidikan*</label>
                  <select
                    value={formState.jenjangPendidikan}
                    onChange={(e) => setFormState({ ...formState, jenjangPendidikan: e.target.value as JenjangPendidikan })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 text-xs"
                  >
                    <option value="SMP/MTs">SMP/MTs</option>
                    <option value="SMA/MA">SMA/MA</option>
                    <option value="UMUM">UMUM</option>
                  </select>
                </div>

                {/* No Telepon */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Nomor WA / Telepon*</label>
                  <input
                    type="text"
                    required
                    value={formState.noTlp}
                    onChange={(e) => setFormState({ ...formState, noTlp: e.target.value })}
                    placeholder="081234567890"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 text-xs"
                  />
                </div>
              </div>

              {/* MULTI-KELAS SANTRI (Dapat memilih lebih dari satu kelas, terhubung dengan Form Pembayaran Khusus) */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 rounded-xl border border-emerald-300/80 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Kolom Kelas Santri (Bisa Memilih Lebih Dari 1 Kelas)*</span>
                    </label>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                      Multi-Kelas
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-slate-500">Pilihan Cepat:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormState(prev => ({
                          ...prev,
                          kelas: 'Kelas 3',
                          kelasList: ['Kelas 1', 'Kelas 2', 'Kelas 3']
                        }));
                      }}
                      className="px-2 py-0.5 bg-white hover:bg-emerald-100 text-emerald-800 rounded font-semibold border border-emerald-300 transition"
                    >
                      Kelas 1 s/d 3
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormState(prev => ({
                          ...prev,
                          kelas: 'Kelas 6',
                          kelasList: [...ALL_KELAS_OPTIONS]
                        }));
                      }}
                      className="px-2 py-0.5 bg-white hover:bg-emerald-100 text-emerald-800 rounded font-semibold border border-emerald-300 transition"
                    >
                      Semua (1-6)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
                  {ALL_KELAS_OPTIONS.map((k) => {
                    const activeList = formState.kelasList && formState.kelasList.length > 0
                      ? formState.kelasList
                      : (formState.kelas ? [formState.kelas] : ['Kelas 1']);
                    const isSelected = activeList.includes(k as any);

                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          let nextList: KelasSantri[];
                          if (isSelected) {
                            if (activeList.length === 1) return; // Jaga minimal 1 kelas
                            nextList = activeList.filter(item => item !== k);
                          } else {
                            nextList = [...activeList, k as any].sort();
                          }
                          const highest = nextList[nextList.length - 1] || 'Kelas 1';
                          setFormState(prev => ({
                            ...prev,
                            kelasList: nextList,
                            kelas: highest
                          }));
                        }}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-between border ${
                          isSelected
                            ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm ring-2 ring-emerald-600/40'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50/50'
                        }`}
                      >
                        <span>{k}</span>
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-amber-300 stroke-[3]" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded border border-slate-300 inline-block" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-emerald-900 font-medium pt-0.5">
                  *Santri yang memilih lebih dari satu kelas akan memiliki formulir riwayat pembayaran khusus tersendiri untuk setiap kelas yang dipilih (misal santri kelas 3 memiliki form pembayaran kelas 1, 2, dan 3).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formState.tempatLahir}
                    onChange={(e) => setFormState({ ...formState, tempatLahir: e.target.value })}
                    placeholder="Belopa"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formState.tanggalLahir}
                    onChange={(e) => setFormState({ ...formState, tanggalLahir: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Asal Sekolah</label>
                  <input
                    type="text"
                    value={formState.asalSekolah}
                    onChange={(e) => setFormState({ ...formState, asalSekolah: e.target.value })}
                    placeholder="SD/SMP/MTs..."
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
                <input
                  type="text"
                  value={formState.alamat}
                  onChange={(e) => setFormState({ ...formState, alamat: e.target.value })}
                  placeholder="Jl. Trans Sulawesi, Belopa, Kab. Luwu"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Data Orang Tua */}
              <div className="pt-3 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  Data Orang Tua (Ayah & Ibu)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Ayah</label>
                    <input
                      type="text"
                      value={formState.namaAyah}
                      onChange={(e) => setFormState({ ...formState, namaAyah: e.target.value })}
                      placeholder="Nama Ayah"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pekerjaan Ayah</label>
                    <input
                      type="text"
                      value={formState.pekerjaanAyah}
                      onChange={(e) => setFormState({ ...formState, pekerjaanAyah: e.target.value })}
                      placeholder="Wiraswasta / PNS"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status Ayah</label>
                    <select
                      value={formState.statusAyah}
                      onChange={(e) => setFormState({ ...formState, statusAyah: e.target.value as StatusOrtu })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    >
                      <option value="HIDUP">HIDUP</option>
                      <option value="MENINGGAL">MENINGGAL</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Ibu</label>
                    <input
                      type="text"
                      value={formState.namaIbu}
                      onChange={(e) => setFormState({ ...formState, namaIbu: e.target.value })}
                      placeholder="Nama Ibu"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pekerjaan Ibu</label>
                    <input
                      type="text"
                      value={formState.pekerjaanIbu}
                      onChange={(e) => setFormState({ ...formState, pekerjaanIbu: e.target.value })}
                      placeholder="IRT / PNS"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status Ibu</label>
                    <select
                      value={formState.statusIbu}
                      onChange={(e) => setFormState({ ...formState, statusIbu: e.target.value as StatusOrtu })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    >
                      <option value="HIDUP">HIDUP</option>
                      <option value="MENINGGAL">MENINGGAL</option>
                    </select>
                  </div>
                </div>
              </div>
              </div>

              {/* Submit Buttons - Fixed di bawah form agar selalu tampak */}
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
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4 text-amber-300" />
                  <span>{editingSantri ? 'Simpan Perubahan' : 'Simpan & Tambah Santri'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE ALL MODAL */}
      {confirmDeleteAllOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Konfirmasi Hapus Semua Data Santri</h3>
            <p className="text-xs text-slate-600 mb-4">
              Peringatan: Seluruh {santriList.length} data santri PP Baitul Qur'an Belopa akan dihapus secara permanen dari database. Tindakan ini hanya dapat dilakukan oleh Admin.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setConfirmDeleteAllOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  await onDeleteAll();
                  setSelectedIds([]);
                  setConfirmDeleteAllOpen(false);
                  setCopySuccessMsg('Semua data santri telah berhasil dibersihkan.');
                  setTimeout(() => setCopySuccessMsg(''), 4000);
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FASILITAS KENAIKAN KELAS & TINGGAL KELAS */}
      {isKenaikanModalOpen && (
        <ModalKenaikanKelas
          isOpen={isKenaikanModalOpen}
          onClose={() => {
            setIsKenaikanModalOpen(false);
            setSelectedSantriForKenaikanId(null);
          }}
          santriList={santriList}
          preselectedSantriId={selectedSantriForKenaikanId || undefined}
          onSingleUpdate={onUpdateSantri}
          onBulkUpdate={onBulkUpdateSantri}
          onSuccess={(msg) => {
            setCopySuccessMsg(msg);
            setTimeout(() => setCopySuccessMsg(''), 5000);
          }}
        />
      )}
    </div>
  );
};
