import React, { useState, useMemo, useEffect } from 'react';
import { Santri, KelasSantri, StatusAkademik, RiwayatKenaikanKelas } from '../types';
import { 
  ALL_KELAS_OPTIONS, 
  getNextKelas, 
  getSantriClasses, 
  DEFAULT_TAHUN_AJARAN_LIST, 
  getTodayDateInput,
  formatDateIndo,
  DEFAULT_SANTRI_FOTO 
} from '../utils/formatters';
import { 
  GraduationCap, 
  X, 
  Check, 
  AlertCircle, 
  Layers, 
  UserCheck, 
  Clock, 
  Sparkles, 
  Search, 
  ArrowRight, 
  RotateCcw, 
  ChevronRight, 
  HelpCircle,
  FileCheck,
  CheckCircle2,
  Calendar
} from 'lucide-react';

interface ModalKenaikanKelasProps {
  isOpen: boolean;
  onClose: () => void;
  santriList: Santri[];
  onBulkUpdate: (updates: { id: string; data: Partial<Santri> }[]) => Promise<void>;
  onSingleUpdate: (id: string, data: Partial<Santri>) => Promise<void>;
  initialSantriId?: string | null;
  currentUserName?: string;
}

export const ModalKenaikanKelas: React.FC<ModalKenaikanKelasProps> = ({
  isOpen,
  onClose,
  santriList,
  onBulkUpdate,
  onSingleUpdate,
  initialSantriId,
  currentUserName = 'Petugas TU'
}) => {
  const [activeTab, setActiveTab] = useState<'massal' | 'individual' | 'riwayat'>('massal');

  // Massal Tab State
  const [selectedOriginKelas, setSelectedOriginKelas] = useState<KelasSantri>('Kelas 1');
  const [tahunAjaran, setTahunAjaran] = useState<string>('2026/2027');
  const [tanggalProses, setTanggalProses] = useState<string>(getTodayDateInput());
  
  // Mapping of santriId -> { action: 'NAIK' | 'TINGGAL', targetKelas: string, catatan: string }
  const [bulkDecisions, setBulkDecisions] = useState<{
    [santriId: string]: {
      action: 'NAIK' | 'TINGGAL';
      targetKelas: string;
      catatan: string;
    };
  }>({});

  // Individual Tab State
  const [selectedIndividualSantriId, setSelectedIndividualSantriId] = useState<string>('');
  const [individualSearchTerm, setIndividualSearchTerm] = useState<string>('');
  const [individualAction, setIndividualAction] = useState<'NAIK' | 'TINGGAL'>('NAIK');
  const [individualTargetKelas, setIndividualTargetKelas] = useState<string>('Kelas 2');
  const [individualTahunAjaran, setIndividualTahunAjaran] = useState<string>('2026/2027');
  const [individualTanggal, setIndividualTanggal] = useState<string>(getTodayDateInput());
  const [individualCatatan, setIndividualCatatan] = useState<string>('');

  // Status & notifications
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Set initial santri if provided
  useEffect(() => {
    if (initialSantriId) {
      setSelectedIndividualSantriId(initialSantriId);
      setActiveTab('individual');
    }
  }, [initialSantriId]);

  // Santri in selected origin class for massal promotion
  const santriInOriginKelas = useMemo(() => {
    return santriList.filter(s => (s.kelas || 'Kelas 1') === selectedOriginKelas);
  }, [santriList, selectedOriginKelas]);

  // Next class calculation for origin class
  const nextTargetKelas = useMemo(() => {
    return getNextKelas(selectedOriginKelas);
  }, [selectedOriginKelas]);

  // Initialize bulk decisions when origin class changes
  useEffect(() => {
    const newDecisions: {
      [santriId: string]: {
        action: 'NAIK' | 'TINGGAL';
        targetKelas: string;
        catatan: string;
      };
    } = {};

    santriInOriginKelas.forEach(s => {
      newDecisions[s.id] = {
        action: 'NAIK',
        targetKelas: nextTargetKelas,
        catatan: `Naik ke ${nextTargetKelas} Tahun Ajaran ${tahunAjaran}`
      };
    });

    setBulkDecisions(newDecisions);
  }, [santriInOriginKelas, nextTargetKelas, tahunAjaran]);

  // Individual active santri object
  const activeIndividualSantri = useMemo(() => {
    return santriList.find(s => s.id === selectedIndividualSantriId) || null;
  }, [santriList, selectedIndividualSantriId]);

  // Sync individual target class when santri changes
  useEffect(() => {
    if (activeIndividualSantri) {
      const next = getNextKelas(activeIndividualSantri.kelas || 'Kelas 1');
      setIndividualTargetKelas(next);
      setIndividualCatatan(`Kenaikan kelas santri ${activeIndividualSantri.nama || ''}`);
    }
  }, [activeIndividualSantri]);

  // Filter individual santri dropdown
  const filteredIndividualSantri = useMemo(() => {
    const q = (individualSearchTerm || '').trim().toLowerCase();
    if (!q) return santriList;
    return santriList.filter(s => 
      !s ? false : (
        (s.nama || '').toLowerCase().includes(q) || 
        (s.nip || '').toLowerCase().includes(q) || 
        (s.nisn || s.nis || s.npm || '').toLowerCase().includes(q) ||
        (s.kelas || '').toLowerCase().includes(q)
      )
    );
  }, [santriList, individualSearchTerm]);

  // All promotion logs aggregated from all santri
  const allRiwayatKenaikan = useMemo(() => {
    const list: {
      santriId: string;
      nama: string;
      nip: string;
      riwayat: RiwayatKenaikanKelas;
    }[] = [];

    santriList.forEach(s => {
      if (Array.isArray(s.riwayatKelas) && s.riwayatKelas.length > 0) {
        s.riwayatKelas.forEach(r => {
          list.push({
            santriId: s.id,
            nama: s.nama,
            nip: s.nip,
            riwayat: r
          });
        });
      }
    });

    // Sort by date descending
    return list.sort((a, b) => new Date(b.riwayat.tanggal).getTime() - new Date(a.riwayat.tanggal).getTime());
  }, [santriList]);

  // Quick action: Set all to NAIK
  const handleSetAllNaik = () => {
    const updated = { ...bulkDecisions };
    santriInOriginKelas.forEach(s => {
      updated[s.id] = {
        action: 'NAIK',
        targetKelas: nextTargetKelas,
        catatan: `Naik ke ${nextTargetKelas} Tahun Ajaran ${tahunAjaran}`
      };
    });
    setBulkDecisions(updated);
  };

  // Quick action: Set all to TINGGAL
  const handleSetAllTinggal = () => {
    const updated = { ...bulkDecisions };
    santriInOriginKelas.forEach(s => {
      updated[s.id] = {
        action: 'TINGGAL',
        targetKelas: selectedOriginKelas,
        catatan: `Tinggal di ${selectedOriginKelas} Tahun Ajaran ${tahunAjaran}`
      };
    });
    setBulkDecisions(updated);
  };

  // Process Bulk Promotion
  const handleProcessBulk = async () => {
    if (santriInOriginKelas.length === 0) {
      alert('Tidak ada santri di kelas ini.');
      return;
    }

    try {
      setIsProcessing(true);
      const updates: { id: string; data: Partial<Santri> }[] = [];

      santriInOriginKelas.forEach(s => {
        const dec = bulkDecisions[s.id];
        if (!dec) return;

        const currentClasses = getSantriClasses(s);
        const newClasses = new Set<string>(currentClasses);

        let newKelas = s.kelas;
        let newStatus: StatusAkademik = s.statusAkademik || 'Aktif';

        if (dec.action === 'NAIK') {
          if (dec.targetKelas === 'Lulus') {
            newStatus = 'Lulus';
          } else {
            newKelas = dec.targetKelas as KelasSantri;
            newClasses.add(dec.targetKelas);
            newStatus = 'Naik Kelas';
          }
        } else {
          // Tinggal Kelas
          newStatus = 'Tinggal Kelas';
        }

        const newHistoryItem: RiwayatKenaikanKelas = {
          id: 'rw-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          tanggal: tanggalProses,
          dariKelas: s.kelas,
          keKelas: (dec.action === 'NAIK' ? dec.targetKelas : s.kelas) as any,
          status: dec.action === 'NAIK' ? (dec.targetKelas === 'Lulus' ? 'Lulus' : 'Naik Kelas') : 'Tinggal Kelas',
          tahunAjaran: tahunAjaran,
          catatan: dec.catatan,
          diprosesOleh: currentUserName
        };

        const existingHistory = Array.isArray(s.riwayatKelas) ? s.riwayatKelas : [];

        updates.push({
          id: s.id,
          data: {
            kelas: newKelas,
            kelasList: Array.from(newClasses) as KelasSantri[],
            statusAkademik: newStatus,
            tahunAjaranAktif: tahunAjaran,
            riwayatKelas: [newHistoryItem, ...existingHistory]
          }
        });
      });

      await onBulkUpdate(updates);
      setSuccessMessage(`Berhasil memproses kenaikan kelas untuk ${updates.length} santri di ${selectedOriginKelas}! Formulir pembayaran khusus untuk kelas baru telah otomatis disiapkan.`);
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (err) {
      console.error(err);
      alert('Gagal memproses kenaikan kelas massal.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process Individual Promotion
  const handleProcessIndividual = async () => {
    if (!activeIndividualSantri) {
      alert('Pilih santri terlebih dahulu.');
      return;
    }

    try {
      setIsProcessing(true);
      const s = activeIndividualSantri;
      const currentClasses = getSantriClasses(s);
      const newClasses = new Set<string>(currentClasses);

      let newKelas = s.kelas;
      let newStatus: StatusAkademik = s.statusAkademik || 'Aktif';

      if (individualAction === 'NAIK') {
        if (individualTargetKelas === 'Lulus') {
          newStatus = 'Lulus';
        } else {
          newKelas = individualTargetKelas as KelasSantri;
          newClasses.add(individualTargetKelas);
          newStatus = 'Naik Kelas';
        }
      } else {
        newStatus = 'Tinggal Kelas';
      }

      const newHistoryItem: RiwayatKenaikanKelas = {
        id: 'rw-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        tanggal: individualTanggal,
        dariKelas: s.kelas,
        keKelas: (individualAction === 'NAIK' ? individualTargetKelas : s.kelas) as any,
        status: individualAction === 'NAIK' ? (individualTargetKelas === 'Lulus' ? 'Lulus' : 'Naik Kelas') : 'Tinggal Kelas',
        tahunAjaran: individualTahunAjaran,
        catatan: individualCatatan || (individualAction === 'NAIK' ? `Naik ke ${individualTargetKelas}` : `Tinggal di ${s.kelas}`),
        diprosesOleh: currentUserName
      };

      const existingHistory = Array.isArray(s.riwayatKelas) ? s.riwayatKelas : [];

      await onSingleUpdate(s.id, {
        kelas: newKelas,
        kelasList: Array.from(newClasses) as KelasSantri[],
        statusAkademik: newStatus,
        tahunAjaranAktif: individualTahunAjaran,
        riwayatKelas: [newHistoryItem, ...existingHistory]
      });

      setSuccessMessage(`Berhasil memperbarui status akademik ${s.nama}: ${individualAction === 'NAIK' ? `Naik ke ${individualTargetKelas}` : `Tinggal di ${s.kelas}`}. Form pembayaran khusus telah siap!`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error(err);
      alert('Gagal memproses santri.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-emerald-800/30 w-full max-w-5xl my-8 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white px-6 py-4 border-b-2 border-amber-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold shadow-md shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Fasilitas Kenaikan & Tinggal Kelas Santri
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-800 text-amber-300 border border-emerald-600">
                  Hingga Kelas 6
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                Atur kenaikan kelas, penetapan tinggal kelas, dan siapkan formulir pembayaran khusus otomatis untuk tiap santri
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-emerald-900/60 hover:bg-rose-600 text-emerald-200 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="bg-emerald-900/15 border-b border-emerald-900/20 px-6 pt-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('massal')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-2 ${
                activeTab === 'massal'
                  ? 'bg-white text-emerald-950 border-t-2 border-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-emerald-900 hover:bg-emerald-50'
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Kenaikan Kolektif per Kelas</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                Massal
              </span>
            </button>

            <button
              onClick={() => setActiveTab('individual')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-2 ${
                activeTab === 'individual'
                  ? 'bg-white text-emerald-950 border-t-2 border-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-emerald-900 hover:bg-emerald-50'
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Proses Individual Santri</span>
            </button>

            <button
              onClick={() => setActiveTab('riwayat')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-2 ${
                activeTab === 'riwayat'
                  ? 'bg-white text-emerald-950 border-t-2 border-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-emerald-900 hover:bg-emerald-50'
              }`}
            >
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Riwayat & Log Kenaikan</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                {allRiwayatKenaikan.length}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 pb-2 hidden sm:block">
            Sistem Informasi Pondok Pesantren Baitul Qur'an Belopa
          </div>
        </div>

        {/* NOTIFICATION BANNER */}
        {successMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {/* TAB 1: KENAIKAN KELAS KOLEKTIF / MASSAL */}
          {activeTab === 'massal' && (
            <div className="space-y-5">
              {/* FILTER KELAS ASAL & TAHUN AJARAN */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kelas Asal Santri:
                    </label>
                    <select
                      value={selectedOriginKelas}
                      onChange={(e) => setSelectedOriginKelas(e.target.value as KelasSantri)}
                      className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-emerald-500 text-emerald-950"
                    >
                      {ALL_KELAS_OPTIONS.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tujuan Kenaikan Kelas:
                    </label>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-black text-emerald-900 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-emerald-600" />
                      <span>{nextTargetKelas === 'Lulus' ? 'Lulus / Alumni' : nextTargetKelas}</span>
                      <span className="text-[10px] text-emerald-700 font-normal ml-auto">
                        (Otomatis)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tahun Ajaran Baru:
                    </label>
                    <input
                      type="text"
                      value={tahunAjaran}
                      onChange={(e) => setTahunAjaran(e.target.value)}
                      placeholder="e.g. 2026/2027"
                      className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tanggal Penetapan:
                    </label>
                    <input
                      type="date"
                      value={tanggalProses}
                      onChange={(e) => setTanggalProses(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* HELPER INFO */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="font-semibold text-emerald-950">
                      Total Santri Terdaftar di {selectedOriginKelas}:
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                      {santriInOriginKelas.length} Santri
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSetAllNaik}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      Set Semua Naik Kelas
                    </button>
                    <button
                      type="button"
                      onClick={handleSetAllTinggal}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 transition flex items-center gap-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                      Set Semua Tinggal Kelas
                    </button>
                  </div>
                </div>
              </div>

              {/* TABLE LIST SANTRI DALAM KELAS TERPILIH */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-3.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Daftar Santri {selectedOriginKelas} ({santriInOriginKelas.length} Santri)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Pilih status per santri atau gunakan tombol set massal di atas
                  </span>
                </div>

                {santriInOriginKelas.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">Tidak ada santri yang terdaftar di {selectedOriginKelas}.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5 w-12 text-center">No</th>
                          <th className="p-2.5">Santri (NIP / Nama)</th>
                          <th className="p-2.5">Program & Jenjang</th>
                          <th className="p-2.5">Status Saat Ini</th>
                          <th className="p-2.5 text-center">Keputusan Kenaikan</th>
                          <th className="p-2.5">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {santriInOriginKelas.map((s, idx) => {
                          const dec = bulkDecisions[s.id] || { action: 'NAIK', targetKelas: nextTargetKelas, catatan: '' };
                          const isNaik = dec.action === 'NAIK';

                          return (
                            <tr key={s.id} className="hover:bg-slate-50 transition">
                              <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                              <td className="p-2.5">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={(s.fotoUrl && s.fotoUrl.trim()) ? s.fotoUrl : DEFAULT_SANTRI_FOTO}
                                    alt={s.nama || 'Santri'}
                                    className="w-7 h-7 rounded-md object-cover border border-slate-200 shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = DEFAULT_SANTRI_FOTO;
                                    }}
                                  />
                                  <div>
                                    <span className="font-bold text-slate-900 block">{s.nama}</span>
                                    <span className="text-[10px] font-mono text-slate-500 block">
                                      {s.nip} | NISN: {s.nisn || '-'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-2.5">
                                <span className="font-semibold text-slate-700 block">{s.program}</span>
                                <span className="text-[10px] text-slate-500 block">{s.jenjangPendidikan}</span>
                              </td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                  s.statusAkademik === 'Naik Kelas'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : s.statusAkademik === 'Tinggal Kelas'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {s.statusAkademik || 'Aktif'}
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBulkDecisions(prev => ({
                                        ...prev,
                                        [s.id]: {
                                          ...prev[s.id],
                                          action: 'NAIK',
                                          targetKelas: nextTargetKelas,
                                          catatan: `Naik ke ${nextTargetKelas} Tahun Ajaran ${tahunAjaran}`
                                        }
                                      }));
                                    }}
                                    className={`px-2 py-1 text-[11px] font-bold rounded-md transition flex items-center gap-1 ${
                                      isNaik
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-emerald-700'
                                    }`}
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Naik ke {nextTargetKelas === 'Lulus' ? 'Lulus' : nextTargetKelas}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBulkDecisions(prev => ({
                                        ...prev,
                                        [s.id]: {
                                          ...prev[s.id],
                                          action: 'TINGGAL',
                                          targetKelas: selectedOriginKelas,
                                          catatan: `Tinggal di ${selectedOriginKelas} Tahun Ajaran ${tahunAjaran}`
                                        }
                                      }));
                                    }}
                                    className={`px-2 py-1 text-[11px] font-bold rounded-md transition flex items-center gap-1 ${
                                      !isNaik
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-amber-700'
                                    }`}
                                  >
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Tinggal di {selectedOriginKelas}</span>
                                  </button>
                                </div>
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="text"
                                  value={dec.catatan}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setBulkDecisions(prev => ({
                                      ...prev,
                                      [s.id]: {
                                        ...prev[s.id],
                                        catatan: val
                                      }
                                    }));
                                  }}
                                  placeholder="Catatan..."
                                  className="w-full text-[11px] border border-slate-200 rounded p-1 bg-white focus:ring-1 focus:ring-emerald-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ACTION FOOTER TAB 1 */}
              <div className="bg-emerald-900/10 p-4 rounded-xl border border-emerald-900/20 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <span>Otomatisasi Pembayaran Khusus:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Setiap santri yang dinyatakan naik kelas otomatis memperoleh Formulir Pembayaran Khusus untuk kelas barunya hingga Kelas 6.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing || santriInOriginKelas.length === 0}
                    onClick={handleProcessBulk}
                    className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Memproses Kenaikan...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Simpan & Proses Kenaikan Kelas ({santriInOriginKelas.length} Santri)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KENAIKAN INDIVIDUAL */}
          {activeTab === 'individual' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                {/* SEARCH & SELECT SANTRI */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Cari & Pilih Santri:
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={individualSearchTerm}
                      onChange={(e) => setIndividualSearchTerm(e.target.value)}
                      placeholder="Ketik Nama, NIP, atau NISN santri..."
                      className="w-full pl-9 text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  
                  {individualSearchTerm && (
                    <div className="mt-1 max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-md divide-y divide-slate-100 text-xs">
                      {filteredIndividualSantri.map(s => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedIndividualSantriId(s.id);
                            setIndividualSearchTerm('');
                          }}
                          className="p-2 hover:bg-emerald-50 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{s.nama}</span>
                            <span className="text-slate-500 text-[10px] ml-2">({s.nip} - {s.kelas})</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {s.program}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* PROFIL SANTRI TERPILIH */}
                {activeIndividualSantri ? (
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={(activeIndividualSantri.fotoUrl && activeIndividualSantri.fotoUrl.trim()) ? activeIndividualSantri.fotoUrl : DEFAULT_SANTRI_FOTO}
                        alt={activeIndividualSantri.nama || 'Santri'}
                        className="w-12 h-12 rounded-lg object-cover border border-emerald-300 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_SANTRI_FOTO;
                        }}
                      />
                      <div>
                        <h4 className="font-bold text-sm text-emerald-950">{activeIndividualSantri.nama}</h4>
                        <p className="text-xs text-slate-600 font-mono">
                          NIP: {activeIndividualSantri.nip} • NISN: {activeIndividualSantri.nisn || '-'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-800 text-amber-300">
                            Kelas Saat Ini: {activeIndividualSantri.kelas}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                            Thn Masuk: {activeIndividualSantri.tahunMasuk}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* DAFTAR FORM KELAS YANG SUDAH DILALUI */}
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Riwayat Form Kelas:</span>
                      <div className="flex gap-1 justify-end mt-1">
                        {getSantriClasses(activeIndividualSantri).map(cls => (
                          <span key={cls} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white border border-emerald-300 text-emerald-900">
                            {cls}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-100 border border-dashed border-slate-300 text-center text-slate-500 text-xs">
                    Pilih santri dari pencarian di atas untuk mengatur status kenaikan kelas
                  </div>
                )}

                {/* PILIHAN KEPUTUSAN */}
                {activeIndividualSantri && (
                  <div className="space-y-4 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-2">
                        Status Kenaikan Santri:
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setIndividualAction('NAIK')}
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                            individualAction === 'NAIK'
                              ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          <span>Dinyatakan Naik Kelas</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIndividualAction('TINGGAL')}
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                            individualAction === 'TINGGAL'
                              ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <AlertCircle className="w-4 h-4" />
                          <span>Dinyatakan Tinggal Kelas</span>
                        </button>
                      </div>
                    </div>

                    {/* TARGET KELAS JIKA NAIK */}
                    {individualAction === 'NAIK' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Pilih Kelas Tujuan Kenaikan (s/d Kelas 6 atau Lulus):
                        </label>
                        <select
                          value={individualTargetKelas}
                          onChange={(e) => setIndividualTargetKelas(e.target.value)}
                          className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white text-emerald-950 focus:ring-2 focus:ring-emerald-500"
                        >
                          {ALL_KELAS_OPTIONS.map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                          <option value="Lulus">Lulus / Alumni (Tamat Pondok)</option>
                        </select>
                      </div>
                    )}

                    {/* TAHUN AJARAN & TANGGAL */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tahun Ajaran:
                        </label>
                        <input
                          type="text"
                          value={individualTahunAjaran}
                          onChange={(e) => setIndividualTahunAjaran(e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tanggal Penetapan:
                        </label>
                        <input
                          type="date"
                          value={individualTanggal}
                          onChange={(e) => setIndividualTanggal(e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded-lg p-2"
                        />
                      </div>
                    </div>

                    {/* CATATAN */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Catatan Kenaikan / Prestasi:
                      </label>
                      <textarea
                        rows={2}
                        value={individualCatatan}
                        onChange={(e) => setIndividualCatatan(e.target.value)}
                        placeholder="Contoh: Naik kelas dengan capaian hafalan juz 30 mutqin..."
                        className="w-full text-xs border border-slate-300 rounded-lg p-2"
                      />
                    </div>

                    {/* SUBMIT BUTTON */}
                    <div className="pt-2 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Tutup
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleProcessIndividual}
                        className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition flex items-center gap-2"
                      >
                        {isProcessing ? 'Menyimpan...' : 'Simpan Status Kenaikan Santri'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: RIWAYAT & LOG KENAIKAN */}
          {activeTab === 'riwayat' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Log Audit Riwayat Kenaikan & Tinggal Kelas ({allRiwayatKenaikan.length} Catatan)
                </span>
                <span className="text-[11px] text-slate-500">
                  Tercatat secara otomatis saat proses kenaikan dijalankan
                </span>
              </div>

              {allRiwayatKenaikan.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">Belum ada riwayat kenaikan kelas yang tercatat.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Gunakan tab Kenaikan Kolektif atau Individual untuk memproses status santri.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5">Tanggal</th>
                        <th className="p-2.5">Nama Santri</th>
                        <th className="p-2.5">NIP</th>
                        <th className="p-2.5">Dari Kelas</th>
                        <th className="p-2.5">Ke Kelas</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Tahun Ajaran</th>
                        <th className="p-2.5">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allRiwayatKenaikan.map((item, idx) => (
                        <tr key={item.riwayat.id || idx} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-[11px] text-slate-600">
                            {formatDateIndo(item.riwayat.tanggal)}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">{item.nama}</td>
                          <td className="p-2.5 font-mono text-slate-500 text-[11px]">{item.nip}</td>
                          <td className="p-2.5 text-slate-600">{item.riwayat.dariKelas}</td>
                          <td className="p-2.5 font-bold text-emerald-900">{item.riwayat.keKelas}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.riwayat.status === 'Naik Kelas'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.riwayat.status === 'Tinggal Kelas'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {item.riwayat.status}
                            </span>
                          </td>
                          <td className="p-2.5 font-semibold text-slate-700">{item.riwayat.tahunAjaran}</td>
                          <td className="p-2.5 text-slate-600 text-[11px]">{item.riwayat.catatan || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
