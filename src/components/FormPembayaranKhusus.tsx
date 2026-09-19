import React, { useState, useMemo, useEffect } from 'react';
import { 
  Santri, 
  Pembayaran, 
  Role, 
  KelasSantri 
} from '../types';
import { formatRupiah, formatDateIndo, formatDateShortIndo, getSantriClasses, ALL_KELAS_OPTIONS } from '../utils/formatters';
import { 
  generateRekapKhususText, 
  openGmailWeb, 
  openDefaultMailClient, 
  copyTextToClipboard, 
  openWhatsAppWebOrApp 
} from '../utils/receiptMessenger';
import { LandscapePembayaranKhusus, SantriKhususSummary, CategorySummary } from './LandscapePembayaranKhusus';
import { ModalKenaikanKelas } from './ModalKenaikanKelas';
import { 
  Printer, 
  Check, 
  CheckCircle2, 
  Mail, 
  MessageSquare, 
  Calendar, 
  CreditCard, 
  Layers, 
  User, 
  Search, 
  Filter, 
  DollarSign, 
  Sparkles,
  CheckCircle,
  ExternalLink,
  Table as TableIcon,
  FileText,
  Clock,
  Receipt,
  Download,
  AlertCircle,
  Monitor,
  Camera,
  Send,
  Copy,
  GraduationCap,
  Plus
} from 'lucide-react';

interface FormPembayaranKhususProps {
  santriList: Santri[];
  pembayaranList: Pembayaran[];
  currentRole: Role;
  onRecordPembayaran?: (pembayaran: Omit<Pembayaran, 'id'>) => Promise<Pembayaran>;
  onNavigateToPembayaran?: () => void;
  onUpdateSantri?: (id: string, data: Partial<Santri>) => Promise<void>;
  onBulkUpdateSantri?: (updates: { id: string; data: Partial<Santri> }[]) => Promise<void>;
}

const KELAS_LIST: KelasSantri[] = [
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6'
];

// Helper to compute santri payments strictly from actual pembayaranList
const computeSantriKhususSummary = (
  santri: Santri, 
  pembayaranList: Pembayaran[],
  targetKelas?: string
): SantriKhususSummary => {
  const santriNip = (santri.nip || '').trim().toLowerCase();
  const santriNama = (santri.nama || '').trim().toLowerCase();
  const santriNisn = (santri.nisn || santri.nis || '').trim();
  const santriClasses = getSantriClasses(santri);

  // Match transactions by NIP, Nama, NISN, or NIS AND class if specified
  const matchedTx = pembayaranList.filter(p => {
    const pNip = (p.nip || '').trim().toLowerCase();
    const pNama = (p.nama || '').trim().toLowerCase();
    const pNisn = (p.nisn || p.nis || '').trim();

    const matchNip = Boolean(santriNip && pNip && (pNip === santriNip));
    const matchNama = Boolean(santriNama && pNama && (pNama === santriNama));
    const matchNisn = Boolean(santriNisn && pNisn && (pNisn === santriNisn));
    const matchId = Boolean((p as any).santriId && (p as any).santriId === santri.id);

    const isMatch = matchNip || matchNama || matchNisn || matchId;
    if (!isMatch) return false;

    // Filter by targetKelas if specified
    if (targetKelas) {
      if (p.kelas) {
        return p.kelas === targetKelas;
      }
      // If legacy payment without p.kelas, assign to santri's primary class
      return (santriClasses[0] === targetKelas) || (santri.kelas === targetKelas);
    }

    return true;
  });

  const getCatSummary = (keywords: string[]): CategorySummary => {
    const filtered = matchedTx.filter(p => {
      const jenis = (p.jenisPembayaran || '').toLowerCase();
      return keywords.some(k => jenis.includes(k.toLowerCase()));
    });

    const paid = filtered.reduce((sum, item) => sum + (item.jumlah || 0), 0);
    const dates = filtered.map(p => p.tanggal).filter(Boolean);
    return {
      paid,
      count: filtered.length,
      transactions: filtered,
      dates,
      latestDate: filtered.length > 0 ? filtered[filtered.length - 1].tanggal : undefined,
      latestReceipt: filtered.length > 0 ? filtered[filtered.length - 1].nomorKwitansi : undefined
    };
  };

  // Form Induk Components
  const pendaftaran = getCatSummary(['Pendaftaran']);
  const uangPangkal = getCatSummary(['Uang Pangkal', 'Pangkal']);
  const perlengkapan = getCatSummary(['Perlengkapan']);

  // Form Bantu Components
  const uangKesehatan = getCatSummary(['Kesehatan']);
  const yuranJuli = getCatSummary(['Juli']); // Matches 'SPP Juli', 'Yuran Juli', 'SPP / Yuran Juli', etc.
  const yuranAgustus = getCatSummary(['Agustus']);
  const yuranSeptember = getCatSummary(['September']);
  const yuranOktober = getCatSummary(['Oktober']);
  const yuranNovember = getCatSummary(['November']);
  const yuranDesember = getCatSummary(['Desember']);
  const yuranJanuari = getCatSummary(['Januari']);
  const yuranFebruari = getCatSummary(['Februari']);
  const yuranMaret = getCatSummary(['Maret']);
  const yuranApril = getCatSummary(['April']);
  const yuranMei = getCatSummary(['Mei']);
  const yuranJuni = getCatSummary(['Juni']);
  const pertemuanWali = getCatSummary(['Pertemuan Wali', 'Wali']);
  const wisuda = getCatSummary(['Wisuda']);

  const totalInduk = pendaftaran.paid + uangPangkal.paid + perlengkapan.paid;
  const totalBantu = 
    uangKesehatan.paid +
    yuranJuli.paid + yuranAgustus.paid + yuranSeptember.paid + yuranOktober.paid +
    yuranNovember.paid + yuranDesember.paid + yuranJanuari.paid + yuranFebruari.paid +
    yuranMaret.paid + yuranApril.paid + yuranMei.paid + yuranJuni.paid +
    pertemuanWali.paid + wisuda.paid;

  const grandTotal = totalInduk + totalBantu;

  return {
    santri,
    allTransactions: matchedTx,
    pendaftaran,
    uangPangkal,
    perlengkapan,
    uangKesehatan,
    yuranJuli,
    yuranAgustus,
    yuranSeptember,
    yuranOktober,
    yuranNovember,
    yuranDesember,
    yuranJanuari,
    yuranFebruari,
    yuranMaret,
    yuranApril,
    yuranMei,
    yuranJuni,
    pertemuanWali,
    wisuda,
    totalInduk,
    totalBantu,
    grandTotal
  };
};

export const FormPembayaranKhusus: React.FC<FormPembayaranKhususProps> = ({
  santriList,
  pembayaranList,
  currentRole,
  onNavigateToPembayaran,
  onUpdateSantri,
  onBulkUpdateSantri
}) => {
  // Class Tab selection: 'Kelas 1' default or 'ALL'
  const [selectedKelasTab, setSelectedKelasTab] = useState<KelasSantri | 'ALL'>('Kelas 1');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Santri ID for Detail / Landscape View
  const [selectedSantriId, setSelectedSantriId] = useState<string>('');

  // Selected class level sub-tab for active santri (e.g., Santri Kelas 3 has Kelas 1, Kelas 2, Kelas 3)
  const [activeKelasSubTab, setActiveKelasSubTab] = useState<string>('');

  // View Mode: 'landscape' (Landscape Pas Layar / Siap Screenshot WA), 'detail' (Vertikal Lengkap), 'matrix' (Tabel Matriks Kelas)
  const [viewMode, setViewMode] = useState<'landscape' | 'detail' | 'matrix'>('landscape');

  // Kenaikan & Tinggal Kelas Modal State
  const [isKenaikanModalOpen, setIsKenaikanModalOpen] = useState(false);
  const [selectedSantriForKenaikanId, setSelectedSantriForKenaikanId] = useState<string | null>(null);

  // UI state
  const [toastMessage, setToastMessage] = useState<string>('');
  const [emailModalData, setEmailModalData] = useState<{
    santri: Santri;
    summary: SantriKhususSummary;
    nomorRef: string;
    kelas: string;
  } | null>(null);

  // Filter santri list based on active class tab and search term (checks kelasList for multi-class santri)
  const santriFilteredByKelas = useMemo(() => {
    const search = (searchTerm || '').trim().toLowerCase();
    return santriList.filter(s => {
      if (!s) return false;
      const classes = getSantriClasses(s);
      const matchKelas = selectedKelasTab === 'ALL' || classes.includes(selectedKelasTab);
      const matchSearch = !search ||
        (s.nama || '').toLowerCase().includes(search) ||
        (s.nip || '').toLowerCase().includes(search) ||
        (s.nisn || s.nis || s.npm || '').toLowerCase().includes(search) ||
        (s.email || '').toLowerCase().includes(search);
      return matchKelas && matchSearch;
    });
  }, [santriList, selectedKelasTab, searchTerm]);

  // Set default selected santri if current is not in filtered list
  useMemo(() => {
    if (santriFilteredByKelas.length > 0) {
      if (!selectedSantriId || !santriFilteredByKelas.some(s => s.id === selectedSantriId)) {
        setSelectedSantriId(santriFilteredByKelas[0].id);
      }
    } else {
      setSelectedSantriId('');
    }
  }, [santriFilteredByKelas, selectedSantriId]);

  // Active Santri Object
  const activeSantri = useMemo(() => {
    return santriList.find(s => s.id === selectedSantriId) || null;
  }, [santriList, selectedSantriId]);

  // Multi-Class List of Active Santri (Kelas 1 s/d Kelas N)
  const activeSantriClasses = useMemo(() => {
    if (!activeSantri) return [];
    return getSantriClasses(activeSantri);
  }, [activeSantri]);

  // Keep activeKelasSubTab in sync with active santri's classes
  useEffect(() => {
    if (activeSantri) {
      const classes = getSantriClasses(activeSantri);
      if (selectedKelasTab !== 'ALL' && classes.includes(selectedKelasTab)) {
        setActiveKelasSubTab(selectedKelasTab);
      } else if (!activeKelasSubTab || !classes.includes(activeKelasSubTab as any)) {
        setActiveKelasSubTab(activeSantri.kelas || classes[classes.length - 1] || 'Kelas 1');
      }
    }
  }, [activeSantri, selectedKelasTab]);

  // Compute summary strictly from actual pembayaranList for the active santri on selected class
  const activeSummary = useMemo(() => {
    if (!activeSantri) return null;
    const targetCls = activeKelasSubTab || activeSantri.kelas;
    return computeSantriKhususSummary(activeSantri, pembayaranList, targetCls);
  }, [activeSantri, pembayaranList, activeKelasSubTab]);

  // Class summaries for all available classes of active santri (e.g. Kelas 1, Kelas 2, Kelas 3)
  const classSummaries = useMemo(() => {
    if (!activeSantri) return [];
    return activeSantriClasses.map(cls => ({
      kelas: cls,
      summary: computeSantriKhususSummary(activeSantri, pembayaranList, cls)
    }));
  }, [activeSantri, activeSantriClasses, pembayaranList]);

  // Siapkan dan aktifkan formulir kelas santri (s/d Kelas 6)
  const handleActivateClass = async (targetCls: string) => {
    if (!activeSantri) return;
    const currentClasses = getSantriClasses(activeSantri);
    if (!currentClasses.includes(targetCls as KelasSantri)) {
      if (onUpdateSantri) {
        await onUpdateSantri(activeSantri.id, {
          kelas: targetCls as KelasSantri
        });
        setToastMessage(`Formulir ${targetCls} berhasil disiapkan dan diaktifkan untuk ${activeSantri.nama}!`);
        setTimeout(() => setToastMessage(''), 4000);
      }
    }
    setActiveKelasSubTab(targetCls);
  };

  // Compute summaries for all santri in current class (used for matrix table & class stats)
  const allSummariesInKelas = useMemo(() => {
    const targetCls = selectedKelasTab === 'ALL' ? undefined : selectedKelasTab;
    return santriFilteredByKelas.map(s => computeSantriKhususSummary(s, pembayaranList, targetCls));
  }, [santriFilteredByKelas, pembayaranList, selectedKelasTab]);

  // Class statistics summary strictly from actual transactions
  const summaryKelas = useMemo(() => {
    let countSantri = santriFilteredByKelas.length;
    let santriWithPayments = 0;
    let sumTotalInduk = 0;
    let sumTotalBantu = 0;

    allSummariesInKelas.forEach(s => {
      sumTotalInduk += s.totalInduk;
      sumTotalBantu += s.totalBantu;
      if (s.grandTotal > 0) {
        santriWithPayments++;
      }
    });

    return {
      count: countSantri,
      santriWithPayments,
      santriNoPayments: countSantri - santriWithPayments,
      totalInduk: sumTotalInduk,
      totalBantu: sumTotalBantu,
      grandTotal: sumTotalInduk + sumTotalBantu
    };
  }, [santriFilteredByKelas, allSummariesInKelas]);

  // 1. KIRIM REKAP KE EMAIL SANTRI (Buka Modal)
  const handleSendEmail = () => {
    if (!activeSantri || !activeSummary) return;
    const currentCls = activeKelasSubTab || activeSantri.kelas;
    const nomorRef = `KW-REKAP/${currentCls.replace(/\s+/g, '')}/${Date.now().toString().slice(-6)}`;

    setEmailModalData({
      santri: activeSantri,
      summary: activeSummary,
      nomorRef,
      kelas: currentCls
    });

    setToastMessage(`Menyiapkan data rincian formulir ${currentCls} untuk ${activeSantri.email}!`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // 2. BUKA GMAIL WEB LANGSUNG
  const handleOpenGmail = () => {
    if (!activeSantri || !activeSummary) return;
    const currentCls = activeKelasSubTab || activeSantri.kelas;
    const { subject, body } = generateRekapKhususText(activeSantri, activeSummary, currentCls);
    openGmailWeb(activeSantri.email, subject, body);
    setToastMessage(`Membuka Gmail Web untuk ${activeSantri.email} dengan format rincian ${currentCls}...`);
    setTimeout(() => setToastMessage(''), 5000);
  };

  // 3. BUKA APLIKASI EMAIL (MAILTO:)
  const handleOpenEmailApp = () => {
    if (!activeSantri || !activeSummary) return;
    const currentCls = activeKelasSubTab || activeSantri.kelas;
    const { subject, body } = generateRekapKhususText(activeSantri, activeSummary, currentCls);
    openDefaultMailClient(activeSantri.email, subject, body);
  };

  // 4. SALIN FORMAT PESAN KE WHATSAPP & BUKA WA
  const handleCopyWhatsApp = async () => {
    if (!activeSantri || !activeSummary) return;
    const currentCls = activeKelasSubTab || activeSantri.kelas;
    const { whatsappText } = generateRekapKhususText(activeSantri, activeSummary, currentCls);
    const ok = await copyTextToClipboard(whatsappText);
    if (ok) {
      setToastMessage(`Format WhatsApp untuk ${activeSantri.nama} (${currentCls}) berhasil disalin! Membuka WhatsApp...`);
      setTimeout(() => {
        openWhatsAppWebOrApp(activeSantri.noTlp, whatsappText);
      }, 400);
      setTimeout(() => setToastMessage(''), 5000);
    }
  };

  // Export matrix table to CSV
  const handleExportCSV = () => {
    if (allSummariesInKelas.length === 0) return;

    const headers = [
      'NIP', 'NISN', 'Nama Santri', 'Kelas', 'Tahun Masuk', 'Email',
      'Pendaftaran', 'Uang Pangkal', 'Perlengkapan', 'Subtotal Induk',
      'Kesehatan', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Pertemuan Wali', 'Wisuda',
      'Subtotal Bantu', 'Grand Total Masuk'
    ];

    const valOrEmpty = (val: number) => val > 0 ? val.toString() : '';

    const rows = allSummariesInKelas.map(s => [
      `"${s.santri.nip}"`,
      `"${s.santri.nisn || ''}"`,
      `"${s.santri.nama}"`,
      `"${s.santri.kelas}"`,
      `"${s.santri.tahunMasuk}"`,
      `"${s.santri.email}"`,
      valOrEmpty(s.pendaftaran.paid),
      valOrEmpty(s.uangPangkal.paid),
      valOrEmpty(s.perlengkapan.paid),
      valOrEmpty(s.totalInduk),
      valOrEmpty(s.uangKesehatan.paid),
      valOrEmpty(s.yuranJuli.paid),
      valOrEmpty(s.yuranAgustus.paid),
      valOrEmpty(s.yuranSeptember.paid),
      valOrEmpty(s.yuranOktober.paid),
      valOrEmpty(s.yuranNovember.paid),
      valOrEmpty(s.yuranDesember.paid),
      valOrEmpty(s.yuranJanuari.paid),
      valOrEmpty(s.yuranFebruari.paid),
      valOrEmpty(s.yuranMaret.paid),
      valOrEmpty(s.yuranApril.paid),
      valOrEmpty(s.yuranMei.paid),
      valOrEmpty(s.yuranJuni.paid),
      valOrEmpty(s.pertemuanWali.paid),
      valOrEmpty(s.wisuda.paid),
      valOrEmpty(s.totalBantu),
      valOrEmpty(s.grandTotal)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Pembayaran_Khusus_${selectedKelasTab.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="p-4 bg-emerald-800 text-white rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 border border-emerald-600">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-emerald-200 hover:text-white text-xs font-bold px-2 py-1">
            ✕
          </button>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-xl border border-emerald-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold shadow-md shrink-0">
              <Layers className="w-6 h-6 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold font-serif tracking-tight">
                  FORM PEMBAYARAN KHUSUS TIAP SANTRI
                </h2>
                <span className="bg-amber-400 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                  Tampilan Rekap Real-Time
                </span>
                <span className="bg-emerald-950/80 text-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-700">
                  Read-Only (Data Transaksi)
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-1">
                Menampilkan rekapitulasi data pembayaran khusus yang bersumber langsung dari <strong>Tabel Transaksi Pembayaran</strong>. Seluruh kolom angsuran/jumlah otomatis kosong (<strong>-</strong>) bila belum ada data pembayaran yang masuk.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            {/* View Mode Toggle */}
            <div className="bg-emerald-950/90 p-1 rounded-xl border border-emerald-700/80 flex items-center gap-1">
              <button
                type="button"
                id="btn-mode-landscape"
                onClick={() => setViewMode('landscape')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'landscape'
                    ? 'bg-amber-400 text-emerald-950 shadow-sm'
                    : 'text-emerald-200 hover:text-white'
                }`}
                title="Tampilan Landscape 1 Layar - Pas Layar & Siap Screenshot Kirim WA"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Landscape (WA)</span>
              </button>
              <button
                type="button"
                id="btn-mode-detail"
                onClick={() => setViewMode('detail')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'detail'
                    ? 'bg-amber-400 text-emerald-950 shadow-sm'
                    : 'text-emerald-200 hover:text-white'
                }`}
                title="Tampilkan rincian vertikal santri terpilih"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Rincian Vertikal</span>
              </button>
              <button
                type="button"
                id="btn-mode-matrix"
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'matrix'
                    ? 'bg-amber-400 text-emerald-950 shadow-sm'
                    : 'text-emerald-200 hover:text-white'
                }`}
                title="Tampilkan tabel matriks seluruh santri dalam kelas"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tabel Matriks Kelas</span>
              </button>
            </div>

            {/* Tombol Fasilitas Naik / Tinggal Kelas */}
            <button
              type="button"
              id="btn-fasilitas-kenaikan-kelas-khusus"
              onClick={() => {
                setSelectedSantriForKenaikanId(activeSantri?.id || null);
                setIsKenaikanModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold transition border border-amber-300/40 shadow-sm cursor-pointer"
              title="Atur Kenaikan Kelas atau Tinggal Kelas Santri (Hingga Kelas 6)"
            >
              <GraduationCap className="w-4 h-4 text-amber-300" />
              <span>Naik/Tinggal Kelas</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-400 text-emerald-950 text-[9.5px] font-black">
                s/d Kls 6
              </span>
            </button>

            <button
              type="button"
              id="btn-export-csv-khusus"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-950 text-emerald-100 text-xs font-bold transition border border-emerald-700/80 shadow-sm"
              title="Unduh rekap data kelas dalam format CSV"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              id="btn-print-khusus"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 text-xs font-black transition shadow-sm"
              title="Cetak lembar rincian"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Form</span>
            </button>
          </div>
        </div>

        {/* TAB FILTER KELAS (Kelas 1 sampai Kelas 6 Sesuai Instruksi User) */}
        <div className="mt-6 pt-5 border-t border-emerald-700/60">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Pilih Tab Kelas:
            </span>
            <span className="text-[11px] text-emerald-200">
              Menampilkan {santriFilteredByKelas.length} santri di {selectedKelasTab} • {summaryKelas.santriWithPayments} sudah bayar, {summaryKelas.santriNoPayments} belum ada transaksi
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
            <button
              type="button"
              id="filter-kelas-all"
              onClick={() => setSelectedKelasTab('ALL')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center ${
                selectedKelasTab === 'ALL'
                  ? 'bg-amber-400 text-emerald-950 shadow-md scale-102 ring-2 ring-white/50'
                  : 'bg-emerald-950/60 hover:bg-emerald-800 text-emerald-200'
              }`}
            >
              Semua Kelas
            </button>
            {KELAS_LIST.map((k) => (
              <button
                key={k}
                type="button"
                id={`filter-tab-${k.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setSelectedKelasTab(k)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1 ${
                  selectedKelasTab === k
                    ? 'bg-amber-400 text-emerald-950 shadow-md scale-102 ring-2 ring-white/50'
                    : 'bg-emerald-950/60 hover:bg-emerald-800 text-emerald-200'
                }`}
              >
                <span>{k}</span>
                {selectedKelasTab === k && <Check className="w-3 h-3 text-emerald-950 stroke-[3]" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-Time Class Statistics Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase">Santri ({selectedKelasTab})</div>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">{summaryKelas.count} Santri</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {summaryKelas.santriWithPayments} ada transaksi / {summaryKelas.santriNoPayments} kosong
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase">Total Form Induk Masuk</div>
            <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
              {summaryKelas.totalInduk > 0 ? formatRupiah(summaryKelas.totalInduk) : '-'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Pendaftaran, Pangkal, Alat</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase">Total Form Bantu Masuk</div>
            <div className="text-lg font-extrabold text-teal-700 mt-0.5">
              {summaryKelas.totalBantu > 0 ? formatRupiah(summaryKelas.totalBantu) : '-'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Kesehatan, Yuran 12 Bln, Wisuda</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-emerald-900 p-4 rounded-2xl border border-emerald-800 text-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-amber-300 uppercase">Grand Total Masuk ({selectedKelasTab})</div>
            <div className="text-lg font-black text-white mt-0.5">
              {summaryKelas.grandTotal > 0 ? formatRupiah(summaryKelas.grandTotal) : '-'}
            </div>
            <div className="text-[10px] text-emerald-200 mt-0.5">Real-time dari transaksi pembayaran</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TABEL MATRIKS SPREADSHEET KELAS (Jika View Mode === 'matrix') */}
      {viewMode === 'matrix' ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-emerald-700" />
                <span>Tabel Matriks Rekap Pembayaran Khusus ({selectedKelasTab})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kolom kosong (<strong>-</strong>) menandakan belum ada transaksi pembayaran yang tercatat pada sistem.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari santri..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
            <table className="w-full text-left border-collapse text-[11px] whitespace-nowrap">
              <thead>
                <tr className="bg-emerald-900 text-white font-bold">
                  <th className="p-2.5 border-r border-emerald-800 text-center sticky left-0 bg-emerald-900 z-10">NO</th>
                  <th className="p-2.5 border-r border-emerald-800 sticky left-8 bg-emerald-900 z-10">NIP</th>
                  <th className="p-2.5 border-r border-emerald-800 sticky left-28 bg-emerald-900 z-10">NAMA SANTRI</th>
                  <th className="p-2.5 border-r border-emerald-800">KELAS</th>
                  {/* FORM INDUK */}
                  <th className="p-2.5 border-r border-emerald-800 text-right bg-emerald-950">PENDAFTARAN</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right bg-emerald-950">U. PANGKAL</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right bg-emerald-950">PERLENGKAPAN</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right bg-emerald-800 font-extrabold text-amber-300">SUB. INDUK</th>
                  {/* FORM BANTU */}
                  <th className="p-2.5 border-r border-emerald-800 text-right">KESEHATAN</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right">JULI</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right">AGT</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right">SEP</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right">OKT</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right">NOV</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right">DES</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right">JAN</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right">FEB</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right">MAR</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right">APR</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right">MEI</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right">JUN</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right">WALI</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right">WISUDA</th>
                  <th className="p-2.5 border-r border-emerald-800 text-right bg-teal-800 font-extrabold text-teal-200">SUB. BANTU</th>
                  <th className="p-2.5 text-right bg-amber-400 text-emerald-950 font-black">TOTAL MASUK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allSummariesInKelas.length === 0 ? (
                  <tr>
                    <td colSpan={25} className="p-8 text-center text-slate-400">
                      Tidak ada data santri ditemukan.
                    </td>
                  </tr>
                ) : (
                  allSummariesInKelas.map((item, idx) => {
                    const renderCell = (cat: CategorySummary) => {
                      if (cat.paid > 0) {
                        const dateText = cat.dates.length === 1
                          ? formatDateShortIndo(cat.dates[0])
                          : cat.dates.map(d => formatDateShortIndo(d)).join(', ');

                        return (
                          <div className="flex flex-col items-end leading-tight py-0.5">
                            <span className="font-bold text-emerald-900 font-mono text-[11px]">
                              {cat.paid.toLocaleString('id-ID')}
                            </span>
                            {dateText && (
                              <span className="text-[9px] text-slate-600 font-sans mt-0.5 flex items-center gap-0.5 whitespace-nowrap bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200/60">
                                <Calendar className="w-2.5 h-2.5 text-emerald-600 inline shrink-0" />
                                <span>{dateText}</span>
                              </span>
                            )}
                          </div>
                        );
                      }
                      return <span className="text-slate-300 font-normal block text-center">-</span>;
                    };

                    const renderSubtotal = (val: number, isInduk?: boolean) => {
                      if (val > 0) {
                        return <span className={`font-bold ${isInduk ? 'text-emerald-900' : 'text-teal-900'}`}>{val.toLocaleString('id-ID')}</span>;
                      }
                      return <span className="text-slate-300 font-normal">-</span>;
                    };

                    return (
                      <tr key={item.santri.id} className="hover:bg-slate-50 transition">
                        <td className="p-2 text-center text-slate-500 border-r border-slate-100 sticky left-0 bg-white">{idx + 1}</td>
                        <td className="p-2 font-mono font-bold text-slate-700 border-r border-slate-100 sticky left-8 bg-white">{item.santri.nip}</td>
                        <td className="p-2 font-bold text-slate-900 border-r border-slate-100 sticky left-28 bg-white">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSantriId(item.santri.id);
                              setViewMode('detail');
                            }}
                            className="text-left text-emerald-800 hover:text-emerald-600 hover:underline"
                            title="Klik untuk membuka rincian santri"
                          >
                            {item.santri.nama}
                          </button>
                        </td>
                        <td className="p-2 text-slate-600 border-r border-slate-100">{item.santri.kelas}</td>

                        {/* Form Induk */}
                        <td className="p-2 text-right border-r border-slate-100 bg-slate-50/50">{renderCell(item.pendaftaran)}</td>
                        <td className="p-2 text-right border-r border-slate-100 bg-slate-50/50">{renderCell(item.uangPangkal)}</td>
                        <td className="p-2 text-right border-r border-slate-100 bg-slate-50/50">{renderCell(item.perlengkapan)}</td>
                        <td className="p-2 text-right border-r border-slate-100 bg-emerald-50/70">{renderSubtotal(item.totalInduk, true)}</td>

                        {/* Form Bantu */}
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.uangKesehatan)}</td>
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.yuranJuli)}</td>
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.yuranAgustus)}</td>
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.yuranSeptember)}</td>
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.yuranOktober)}</td>
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.yuranNovember)}</td>
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.yuranDesember)}</td>
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.yuranJanuari)}</td>
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.yuranFebruari)}</td>
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.yuranMaret)}</td>
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.yuranApril)}</td>
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.yuranMei)}</td>
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.yuranJuni)}</td>
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.pertemuanWali)}</td>
                        <td className="p-2 text-right border-r border-slate-100">{renderCell(item.wisuda)}</td>
                        <td className="p-2 text-right border-r border-slate-100 bg-teal-50/70">{renderSubtotal(item.totalBantu, false)}</td>

                        {/* Grand Total */}
                        <td className="p-2 text-right font-black bg-amber-50 text-emerald-950 font-mono">
                          {item.grandTotal > 0 ? formatRupiah(item.grandTotal) : <span className="text-slate-300 font-normal">-</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* LANDSCAPE VIEW (PAS 1 LAYAR PENUH & SIAP SCREENSHOT KIRIM WA) */}
      {viewMode === 'landscape' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left Column: Santri Picker for Fast Switching */}
          <div className="xl:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span>Pilih Santri ({selectedKelasTab})</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {santriFilteredByKelas.length} Santri
              </span>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama, NIP, NISN..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>

            {/* Santri List */}
            <div className="space-y-1.5 overflow-y-auto max-h-[580px] pr-1">
              {santriFilteredByKelas.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Tidak ada data santri pada filter ini.
                </div>
              ) : (
                santriFilteredByKelas.map(santri => {
                  const isSelected = santri.id === selectedSantriId;
                  const classes = getSantriClasses(santri);
                  const summary = computeSantriKhususSummary(santri, pembayaranList, activeKelasSubTab || santri.kelas);
                  const hasPaid = summary.grandTotal > 0;

                  return (
                    <button
                      key={santri.id}
                      type="button"
                      onClick={() => setSelectedSantriId(santri.id)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-50/95 border-emerald-500 shadow-xs ring-2 ring-emerald-400/30'
                          : 'bg-white border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 truncate">{santri.nama}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 shrink-0">
                          {classes.length > 1 ? `${classes[0]}-${classes[classes.length - 1].replace('Kelas ', '')}` : santri.kelas}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                        <span>{santri.nip}</span>
                        {hasPaid ? (
                          <span className="text-emerald-700 font-bold text-[9px]">{formatRupiah(summary.grandTotal)}</span>
                        ) : (
                          <span className="text-slate-400 text-[9px]">-</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Landscape Display */}
          <div className="xl:col-span-9 min-w-0">
            {!activeSantri || !activeSummary ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center text-slate-400">
                Pilih santri terlebih dahulu untuk menampilkan formulir pembayaran landscape.
              </div>
            ) : (
              <LandscapePembayaranKhusus
                santri={activeSantri}
                santriClasses={activeSantriClasses}
                activeKelas={activeKelasSubTab || activeSantri.kelas}
                onSelectKelas={setActiveKelasSubTab}
                summary={activeSummary}
                classSummaries={classSummaries}
                onKirimGmail={handleOpenGmail}
                onKirimEmailApp={handleOpenEmailApp}
                onCopyWhatsApp={handleCopyWhatsApp}
                onNavigateToPembayaran={onNavigateToPembayaran}
                onOpenKenaikanModal={() => {
                  setSelectedSantriForKenaikanId(activeSantri.id);
                  setIsKenaikanModalOpen(true);
                }}
                onActivateClass={handleActivateClass}
              />
            )}
          </div>
        </div>
      )}

      {/* DETAIL VIEW: Left Santri Selector + Right Specialized Ledger Display */}
      {viewMode === 'detail' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Santri Picker within Selected Class */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4 flex flex-col">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-700" />
                  <span>Pilih Santri ({selectedKelasTab})</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {santriFilteredByKelas.length} Tersedia
                </span>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari NIP, NISN, Nama..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>
            </div>

            {/* List of Santri in Class */}
            <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1">
              {santriFilteredByKelas.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Tidak ada data santri yang terdaftar pada {selectedKelasTab}.
                </div>
              ) : (
                santriFilteredByKelas.map(santri => {
                  const isSelected = santri.id === selectedSantriId;
                  const classes = getSantriClasses(santri);
                  const summary = computeSantriKhususSummary(santri, pembayaranList, activeKelasSubTab || santri.kelas);
                  const hasPaid = summary.grandTotal > 0;

                  return (
                    <button
                      key={santri.id}
                      type="button"
                      onClick={() => setSelectedSantriId(santri.id)}
                      className={`w-full p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-400/30'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                          {santri.nama.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-bold text-xs text-slate-900 truncate">
                              {santri.nama}
                            </h4>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 shrink-0">
                              {classes.length > 1 ? `${classes[0]}-${classes[classes.length - 1].replace('Kelas ', '')}` : santri.kelas}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {santri.nip} • {santri.nisn || 'NISN -'}
                          </div>
                          <div className="text-[10px] text-emerald-800 truncate">
                            {santri.email}
                          </div>
                          
                          {/* Payment status badge */}
                          <div className="mt-1.5 flex items-center justify-between text-[9px]">
                            {hasPaid ? (
                              <span className="text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle className="w-2.5 h-2.5" />
                                {formatRupiah(summary.grandTotal)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                                Belum ada pembayaran
                              </span>
                            )}
                            <span className="text-slate-400 font-mono">
                              {summary.allTransactions.length} Kwitansi
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Display of Form Induk & Form Bantu (Read-Only from Actual Payments) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            {!activeSantri || !activeSummary ? (
              <div className="p-12 text-center text-slate-400">
                Pilih santri terlebih dahulu untuk menampilkan form pembayaran.
              </div>
            ) : (
              <>
                {/* Multi-Class Tabs for Santri (Kelas 1 s/d Kelas 6) & Quick Activation */}
                <div className="p-3 bg-emerald-900 text-white rounded-2xl flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-300" />
                    <span className="text-xs font-bold">Pilih Formulir Tingkat Kelas Santri:</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activeSantriClasses.map(cls => {
                      const isCurrent = (activeKelasSubTab || activeSantri.kelas) === cls;
                      const cSum = classSummaries.find(cs => cs.kelas === cls)?.summary;
                      const totalPaid = cSum?.grandTotal || 0;
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setActiveKelasSubTab(cls)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            isCurrent
                              ? 'bg-amber-400 text-emerald-950 shadow-md font-black ring-2 ring-amber-300/50'
                              : 'bg-emerald-800/80 text-emerald-100 hover:bg-emerald-700'
                          }`}
                        >
                          <span>{cls}</span>
                          {totalPaid > 0 && (
                            <span className="text-[9px] bg-emerald-950/60 text-emerald-200 px-1.5 py-0.2 rounded-full font-mono">
                              {formatRupiah(totalPaid)}
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* Quick Siapkan Formulir Kelas Berikutnya (s/d Kelas 6) */}
                    {ALL_KELAS_OPTIONS.filter(k => !activeSantriClasses.includes(k)).slice(0, 2).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handleActivateClass(k)}
                        className="px-2.5 py-1 rounded-xl bg-amber-400/20 hover:bg-amber-400 text-amber-200 hover:text-emerald-950 border border-amber-400/40 text-xs font-bold transition flex items-center gap-1"
                        title={`Siapkan dan buka formulir ${k} untuk santri ini`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>Siapkan {k}</span>
                      </button>
                    ))}

                    {/* Tombol Atur Naik / Tinggal Kelas */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSantriForKenaikanId(activeSantri.id);
                        setIsKenaikanModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 font-bold text-xs shadow-sm transition flex items-center gap-1 ml-1"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Naik/Tinggal Kelas</span>
                    </button>
                  </div>
                </div>

                {/* Header Information: NIP, NISN, Nama, Email, Tahun Masuk, Kelas SALING TERHUBUNG */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-800" />
                      Data Terhubung Otomatis dengan Tabel Transaksi Pembayaran
                    </span>
                    <div className="flex items-center gap-1.5">
                      {activeSantri.statusAkademik && (
                        <span className="text-xs font-bold text-emerald-900 bg-emerald-200 px-2.5 py-0.5 rounded-full">
                          {activeSantri.statusAkademik}
                        </span>
                      )}
                      <span className="text-xs font-bold text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full">
                        Formulir {activeKelasSubTab || activeSantri.kelas}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Nama Lengkap Santri:</span>
                      <span className="font-bold text-slate-900 text-sm">{activeSantri.nama}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">NIP &amp; NISN:</span>
                      <span className="font-mono font-bold text-emerald-900">{activeSantri.nip} | {activeSantri.nisn || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Tahun Ajaran / Masuk:</span>
                      <span className="font-bold text-slate-800">{activeSantri.tahunAjaranAktif || '2025/2026'} (Masuk {activeSantri.tahunMasuk})</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Status / Kelas Aktif:</span>
                      <span className="font-bold text-emerald-900">{activeSantri.kelas} {activeSantri.statusAkademik ? `(${activeSantri.statusAkademik})` : ''}</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 1: FORM INDUK SANTRI (READ ONLY) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800">
                          FORM INDUK SANTRI
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          Uang Pendaftaran, Uang Pangkal, dan Perlengkapan
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Subtotal Form Induk Masuk</span>
                      <span className="text-xs font-extrabold text-emerald-800">
                        {activeSummary.totalInduk > 0 ? formatRupiah(activeSummary.totalInduk) : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Uang Pendaftaran */}
                    <div className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      activeSummary.pendaftaran.paid > 0
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-slate-700">Uang Pendaftaran</span>
                          {activeSummary.pendaftaran.paid > 0 ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 stroke-[3]" /> Terbayar
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium text-slate-400">Kosong</span>
                          )}
                        </div>

                        <div className="text-base font-black font-mono mt-1">
                          {activeSummary.pendaftaran.paid > 0 ? (
                            <span className="text-emerald-900">{formatRupiah(activeSummary.pendaftaran.paid)}</span>
                          ) : (
                            <span className="text-slate-300 text-sm font-normal">-</span>
                          )}
                        </div>
                      </div>

                      {/* TAMPILAN TANGGAL PEMBAYARAN DI BAWAH NOMINAL */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                        {activeSummary.pendaftaran.paid > 0 ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                              <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>
                                Tgl: {activeSummary.pendaftaran.dates.length === 1
                                  ? formatDateIndo(activeSummary.pendaftaran.dates[0])
                                  : activeSummary.pendaftaran.dates.map(d => formatDateShortIndo(d)).join(', ')}
                              </span>
                            </div>
                            <div className="text-[9px] text-slate-500">
                              {activeSummary.pendaftaran.count}x Transaksi • {activeSummary.pendaftaran.latestReceipt}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">Belum ada data pembayaran masuk</div>
                        )}
                      </div>
                    </div>

                    {/* Uang Pangkal */}
                    <div className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      activeSummary.uangPangkal.paid > 0
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-slate-700">Uang Pangkal</span>
                          {activeSummary.uangPangkal.paid > 0 ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 stroke-[3]" /> Terbayar
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium text-slate-400">Kosong</span>
                          )}
                        </div>

                        <div className="text-base font-black font-mono mt-1">
                          {activeSummary.uangPangkal.paid > 0 ? (
                            <span className="text-emerald-900">{formatRupiah(activeSummary.uangPangkal.paid)}</span>
                          ) : (
                            <span className="text-slate-300 text-sm font-normal">-</span>
                          )}
                        </div>
                      </div>

                      {/* TAMPILAN TANGGAL PEMBAYARAN DI BAWAH NOMINAL */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                        {activeSummary.uangPangkal.paid > 0 ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                              <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>
                                Tgl: {activeSummary.uangPangkal.dates.length === 1
                                  ? formatDateIndo(activeSummary.uangPangkal.dates[0])
                                  : activeSummary.uangPangkal.dates.map(d => formatDateShortIndo(d)).join(', ')}
                              </span>
                            </div>
                            <div className="text-[9px] text-slate-500">
                              {activeSummary.uangPangkal.count}x Transaksi • {activeSummary.uangPangkal.latestReceipt}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">Belum ada data pembayaran masuk</div>
                        )}
                      </div>
                    </div>

                    {/* Perlengkapan */}
                    <div className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      activeSummary.perlengkapan.paid > 0
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-slate-700">Perlengkapan</span>
                          {activeSummary.perlengkapan.paid > 0 ? (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 stroke-[3]" /> Terbayar
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium text-slate-400">Kosong</span>
                          )}
                        </div>

                        <div className="text-base font-black font-mono mt-1">
                          {activeSummary.perlengkapan.paid > 0 ? (
                            <span className="text-emerald-900">{formatRupiah(activeSummary.perlengkapan.paid)}</span>
                          ) : (
                            <span className="text-slate-300 text-sm font-normal">-</span>
                          )}
                        </div>
                      </div>

                      {/* TAMPILAN TANGGAL PEMBAYARAN DI BAWAH NOMINAL */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                        {activeSummary.perlengkapan.paid > 0 ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                              <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>
                                Tgl: {activeSummary.perlengkapan.dates.length === 1
                                  ? formatDateIndo(activeSummary.perlengkapan.dates[0])
                                  : activeSummary.perlengkapan.dates.map(d => formatDateShortIndo(d)).join(', ')}
                              </span>
                            </div>
                            <div className="text-[9px] text-slate-500">
                              {activeSummary.perlengkapan.count}x Transaksi • {activeSummary.perlengkapan.latestReceipt}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">Belum ada data pembayaran masuk</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: FORM BANTU PEMBAYARAN (READ ONLY) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800">
                          FORM BANTU PEMBAYARAN
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          Uang Kesehatan, Yuran Syahriah 12 Bulan (Juli - Juni), Pertemuan Wali, dan Wisuda
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Subtotal Form Bantu Masuk</span>
                      <span className="text-xs font-extrabold text-teal-800">
                        {activeSummary.totalBantu > 0 ? formatRupiah(activeSummary.totalBantu) : '-'}
                      </span>
                    </div>
                  </div>

                  {/* 15 Item Form Bantu: Kesehatan, 12 Bulan Yuran, Wali, Wisuda */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 text-xs">
                    {[
                      { label: 'Uang Kesehatan', cat: activeSummary.uangKesehatan, isSpecial: false },
                      { label: 'Yuran Juli', cat: activeSummary.yuranJuli, isSpecial: false },
                      { label: 'Yuran Agustus', cat: activeSummary.yuranAgustus, isSpecial: false },
                      { label: 'Yuran September', cat: activeSummary.yuranSeptember, isSpecial: false },
                      { label: 'Yuran Oktober', cat: activeSummary.yuranOktober, isSpecial: false },
                      { label: 'Yuran November', cat: activeSummary.yuranNovember, isSpecial: false },
                      { label: 'Yuran Desember', cat: activeSummary.yuranDesember, isSpecial: false },
                      { label: 'Yuran Januari', cat: activeSummary.yuranJanuari, isSpecial: false },
                      { label: 'Yuran Februari', cat: activeSummary.yuranFebruari, isSpecial: false },
                      { label: 'Yuran Maret', cat: activeSummary.yuranMaret, isSpecial: false },
                      { label: 'Yuran April', cat: activeSummary.yuranApril, isSpecial: false },
                      { label: 'Yuran Mei', cat: activeSummary.yuranMei, isSpecial: false },
                      { label: 'Yuran Juni', cat: activeSummary.yuranJuni, isSpecial: false },
                      { label: 'Pertemuan Wali', cat: activeSummary.pertemuanWali, isSpecial: true },
                      { label: 'Wisuda', cat: activeSummary.wisuda, isSpecial: true }
                    ].map((item, index) => {
                      const isPaid = item.cat.paid > 0;
                      return (
                        <div
                          key={index}
                          className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between min-h-[96px] ${
                            isPaid
                              ? item.isSpecial
                                ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-200'
                                : 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-200'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                              <span className={isPaid ? (item.isSpecial ? 'text-amber-950' : 'text-emerald-950') : 'text-slate-600'}>
                                {item.label}
                              </span>
                              {isPaid ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Sudah Terbayar"></span>
                              ) : (
                                <span className="text-[9px] text-slate-400 font-normal">Kosong</span>
                              )}
                            </div>

                            {/* NOMINAL PEMBAYARAN */}
                            <div className="font-mono font-bold text-xs mt-1">
                              {isPaid ? (
                                <span className={item.isSpecial ? 'text-amber-900' : 'text-emerald-900'}>
                                  {formatRupiah(item.cat.paid)}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">-</span>
                              )}
                            </div>
                          </div>

                          {/* TAMPILAN TANGGAL PEMBAYARAN GABUNGKAN DENGAN YURAN SETIAP BULAN DI BAGIAN BAWAH NOMINAL */}
                          <div className="mt-2 pt-1.5 border-t border-slate-200/70 text-[9.5px]">
                            {isPaid ? (
                              <div className="space-y-0.5">
                                <div className={`flex items-center gap-1 font-bold ${item.isSpecial ? 'text-amber-900' : 'text-emerald-900'}`}>
                                  <Calendar className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                                  <span className="truncate">
                                    {item.cat.dates.length === 1
                                      ? formatDateIndo(item.cat.dates[0])
                                      : item.cat.dates.map(d => formatDateShortIndo(d)).join(', ')}
                                  </span>
                                </div>
                                {item.cat.count > 1 && (
                                  <div className="text-[8.5px] text-slate-500 font-medium">
                                    {item.cat.count}x Bayar • {item.cat.latestReceipt}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-slate-400 text-[9px] italic">
                                Belum ada tgl bayar
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Grand Total & Information Bar */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Grand Total Pembayaran Terinput:</span>
                    <span className="text-2xl font-black text-emerald-900">
                      {activeSummary.grandTotal > 0 ? formatRupiah(activeSummary.grandTotal) : '-'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Dihitung murni dari data tabel transaksi ({activeSummary.allTransactions.length} transaksi kwitansi)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* BUKA MODE LANDSCAPE (SIAP SCREENSHOT WA) */}
                    <button
                      type="button"
                      id="btn-detail-switch-landscape"
                      onClick={() => setViewMode('landscape')}
                      className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs shadow-md transition flex items-center gap-1.5"
                      title="Buka tampilan landscape 1 layar pas untuk screenshot WA"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>📸 Tampilan Landscape (WA)</span>
                    </button>

                    {/* Link to Payment Table */}
                    {onNavigateToPembayaran && (
                      <button
                        type="button"
                        onClick={onNavigateToPembayaran}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 border border-slate-300"
                        title="Buka menu transaksi pembayaran untuk menambah transaksi baru"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                        <span>Input di Menu Pembayaran</span>
                      </button>
                    )}

                    {/* BUKA GMAIL WEB */}
                    <button
                      type="button"
                      id="btn-detail-gmail"
                      onClick={handleOpenGmail}
                      className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                      title="Buka Gmail Web dengan isi rincian otomatis"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Buka Gmail</span>
                    </button>

                    {/* KIRIM KE EMAIL SANTRI (MODAL INFO) */}
                    <button
                      type="button"
                      id="btn-kirim-email-santri"
                      onClick={handleSendEmail}
                      className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-300" />
                      <span>Kirim ke Email Santri</span>
                    </button>

                    {/* COPY KE WHATSAPP */}
                    <button
                      type="button"
                      id="btn-copy-wa"
                      onClick={handleCopyWhatsApp}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-200" />
                      <span>Copy ke WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* DAFTAR TRANSAKSI ASLI SANTRI DARI TABEL TRANSAKSI */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-700" />
                      <span>Riwayat Transaksi Pembayaran Santri Ini (Tabel Data Pembayaran)</span>
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {activeSummary.allTransactions.length} Data Ditemukan
                    </span>
                  </div>

                  {activeSummary.allTransactions.length === 0 ? (
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-center text-xs text-amber-900 flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Belum ada transaksi pembayaran yang tercatat untuk santri ini. Semua kolom angsuran atau jumlah di atas tampil kosong (<strong>-</strong>).
                      </span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <th className="p-2">TANGGAL</th>
                            <th className="p-2">NO. KWITANSI</th>
                            <th className="p-2">JENIS PEMBAYARAN</th>
                            <th className="p-2">METODE</th>
                            <th className="p-2 text-right">JUMLAH</th>
                            <th className="p-2 text-center">EMAIL NOTIFIKASI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeSummary.allTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                              <td className="p-2 text-slate-600">{formatDateIndo(t.tanggal)}</td>
                              <td className="p-2 font-mono font-bold text-emerald-800">{t.nomorKwitansi}</td>
                              <td className="p-2 font-medium text-slate-800">{t.jenisPembayaran}</td>
                              <td className="p-2 text-slate-600">{t.metode}</td>
                              <td className="p-2 text-right font-mono font-bold text-emerald-900">{formatRupiah(t.jumlah)}</td>
                              <td className="p-2 text-center">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  <Check className="w-2.5 h-2.5" /> Terkirim
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL KWITANSI EMAIL KHUSUS */}
      {emailModalData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Pesantren */}
            <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 p-6 text-white text-center relative">
              <button
                onClick={() => setEmailModalData(null)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-emerald-800/80 text-white flex items-center justify-center hover:bg-emerald-700"
              >
                ✕
              </button>
              <div className="w-12 h-12 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center mx-auto mb-2 font-bold">
                <Mail className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="font-serif font-black text-lg text-amber-300 uppercase">
                REKAP PEMBAYARAN RESMI TERKIRIM
              </h3>
              <p className="text-xs text-emerald-200 mt-0.5">
                PP BAITUL QUR’AN BELOPA • KAB. LUWU
              </p>

              {/* Status Alert Badge */}
              <div className="mt-4 p-3 bg-emerald-800/90 rounded-2xl border border-emerald-400/50 text-left space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span className="font-bold text-amber-300 text-xs uppercase">
                    100% Berhasil Disiapkan untuk Email Santri!
                  </span>
                </div>
                <div className="text-[11px] text-emerald-100">
                  Data rincian pembayaran resmi ({emailModalData.kelas}) siap dikirimkan ke alamat email santri/wali:
                </div>
                <div className="bg-emerald-950/80 px-2.5 py-1.5 rounded-xl font-mono text-amber-200 text-xs font-bold truncate">
                  {emailModalData.santri.email}
                </div>
              </div>
            </div>

            {/* Receipt Summary */}
            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5 pb-3 border-b border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor Referensi:</span>
                  <span className="font-mono font-bold text-slate-800">{emailModalData.nomorRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Santri:</span>
                  <span className="font-bold text-slate-900">{emailModalData.santri.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NIP & NISN:</span>
                  <span className="font-mono text-slate-700">{emailModalData.santri.nip} | {emailModalData.santri.nisn || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tingkat Kelas:</span>
                  <span className="font-bold text-emerald-800">{emailModalData.kelas}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tahun Masuk:</span>
                  <span className="font-bold text-slate-700">{emailModalData.santri.tahunMasuk}</span>
                </div>
              </div>

              {/* Rincian Subtotal */}
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 font-semibold">Subtotal Form Induk Terbayar:</span>
                  <span className="font-bold text-emerald-800 font-mono">
                    {emailModalData.summary.totalInduk > 0 ? formatRupiah(emailModalData.summary.totalInduk) : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 font-semibold">Subtotal Form Bantu Terbayar:</span>
                  <span className="font-bold text-teal-800 font-mono">
                    {emailModalData.summary.totalBantu > 0 ? formatRupiah(emailModalData.summary.totalBantu) : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 px-3 bg-emerald-50 rounded-xl text-emerald-950 font-bold border border-emerald-200">
                  <span>Grand Total Pembayaran Masuk:</span>
                  <span className="text-base text-emerald-900 font-black font-mono">
                    {emailModalData.summary.grandTotal > 0 ? formatRupiah(emailModalData.summary.grandTotal) : '-'}
                  </span>
                </div>
              </div>

              {/* Action Buttons for Email & WA */}
              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="modal-btn-gmail"
                  onClick={() => {
                    handleOpenGmail();
                    setEmailModalData(null);
                  }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm text-xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Buka Gmail Web</span>
                </button>
                <button
                  type="button"
                  id="modal-btn-emailapp"
                  onClick={() => {
                    handleOpenEmailApp();
                    setEmailModalData(null);
                  }}
                  className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Aplikasi Email</span>
                </button>
                <button
                  type="button"
                  id="modal-btn-copy-wa"
                  onClick={() => {
                    handleCopyWhatsApp();
                    setEmailModalData(null);
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm text-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Salin ke WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen</span>
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setEmailModalData(null)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                >
                  Tutup Dialog
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kenaikan Kelas / Tinggal Kelas */}
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
            setToastMessage(msg);
            setTimeout(() => setToastMessage(''), 5000);
          }}
        />
      )}
    </div>
  );
};
