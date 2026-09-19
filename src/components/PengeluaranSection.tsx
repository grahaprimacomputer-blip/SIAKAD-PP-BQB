import React, { useState, useMemo } from 'react';
import { Pengeluaran, Role, KategoriPengeluaran, MetodePembayaran } from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  Copy, 
  ClipboardPaste, 
  Trash2, 
  Edit, 
  Download, 
  Calendar, 
  DollarSign, 
  X, 
  Check, 
  CreditCard,
  Layers,
  ArrowDownCircle,
  Lock,
  Unlock
} from 'lucide-react';
import { copyTableToExcelClipboard, downloadCSV, parseExcelPastedText } from '../utils/excelHelper';
import { formatRupiah, formatDateIndo, getTodayDateInput } from '../utils/formatters';

interface PengeluaranSectionProps {
  pengeluaranList: Pengeluaran[];
  currentRole: Role;
  onAddPengeluaran: (pengeluaran: Omit<Pengeluaran, 'id'>) => Promise<Pengeluaran>;
  onUpdatePengeluaran: (id: string, updates: Partial<Pengeluaran>) => Promise<void>;
  onDeletePengeluaran: (id: string) => Promise<void>;
  onDeleteMultiple?: (ids: string[]) => Promise<void>;
  onDeleteAll?: () => Promise<void>;
  onBulkAdd: (items: Omit<Pengeluaran, 'id'>[]) => Promise<void>;
}

const KATEGORI_OPTIONS: KategoriPengeluaran[] = [
  'Operasional',
  'Konsumsi',
  'ATK',
  'Maintenance',
  'Listrik dan Air',
  'Gaji',
  'Panjar Dosen',
  'BPJS',
  'Setoran Bank',
  'Setoran Pimpinan',
  'Penarikan Bank',
  'Lain-lain'
];

const METODE_OPTIONS: MetodePembayaran[] = ['Tunai', 'Transfer', 'QRIS', 'Debit'];

export const PengeluaranSection: React.FC<PengeluaranSectionProps> = ({
  pengeluaranList,
  currentRole,
  onAddPengeluaran,
  onUpdatePengeluaran,
  onDeletePengeluaran,
  onDeleteMultiple,
  onDeleteAll,
  onBulkAdd
}) => {
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState<string>('ALL');
  const [filterMetode, setFilterMetode] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection states (Sesuai Permintaan User: Seleksi data, seleksi semua data, hapus data)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);

  // Modals & Notifications
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPengeluaran, setEditingPengeluaran] = useState<Pengeluaran | null>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const canEditOrDelete = currentRole === 'admin';

  const todayStr = getTodayDateInput();
  const isFilterToday = startDate === todayStr && endDate === todayStr;

  const handleToggleTodayFilter = () => {
    if (isFilterToday) {
      setStartDate('');
      setEndDate('');
    } else {
      setStartDate(todayStr);
      setEndDate(todayStr);
    }
  };

  // Filtered List
  const filteredPengeluaran = useMemo(() => {
    const search = (searchTerm || '').trim().toLowerCase();
    return pengeluaranList.filter(item => {
      if (!item) return false;
      const matchSearch = !search ||
        (item.keterangan || '').toLowerCase().includes(search) ||
        (item.kategori || '').toLowerCase().includes(search) ||
        (item.metode || '').toLowerCase().includes(search);

      const matchKategori = filterKategori === 'ALL' || item.kategori === filterKategori;
      const matchMetode = filterMetode === 'ALL' || item.metode === filterMetode;

      let matchDate = true;
      if (startDate && item.tanggal && item.tanggal < startDate) matchDate = false;
      if (endDate && item.tanggal && item.tanggal > endDate) matchDate = false;

      return matchSearch && matchKategori && matchMetode && matchDate;
    });
  }, [pengeluaranList, searchTerm, filterKategori, filterMetode, startDate, endDate]);

  // Selection Handlers
  const handleSelectAllToggle = () => {
    if (selectedIds.length === filteredPengeluaran.length && filteredPengeluaran.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPengeluaran.map(p => p.id));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} data pengeluaran terpilih?`)) return;

    if (onDeleteMultiple) {
      await onDeleteMultiple(selectedIds);
    } else {
      for (const id of selectedIds) {
        await onDeletePengeluaran(id);
      }
    }
    setToastMsg(`Berhasil menghapus ${selectedIds.length} data pengeluaran.`);
    setSelectedIds([]);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleDeleteAllPengeluaran = async () => {
    if (onDeleteAll) {
      await onDeleteAll();
    } else {
      const allIds = pengeluaranList.map(p => p.id);
      if (onDeleteMultiple) {
        await onDeleteMultiple(allIds);
      }
    }
    setConfirmDeleteAllOpen(false);
    setSelectedIds([]);
    setToastMsg('Semua data pengeluaran berhasil dihapus.');
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Total Pengeluaran
  const totalNominal = useMemo(() => {
    return filteredPengeluaran.reduce((sum, item) => sum + (item.jumlah || 0), 0);
  }, [filteredPengeluaran]);

  // Copy to Excel
  const handleCopyTableToExcel = async () => {
    if (filteredPengeluaran.length === 0) {
      alert('Tidak ada data pengeluaran untuk disalin!');
      return;
    }

    const headers = ['TANGGAL', 'KATEGORI', 'KETERANGAN', 'METODE', 'JUMLAH (RP)'];
    const rows = filteredPengeluaran.map(p => [
      p.tanggal,
      p.kategori,
      p.keterangan,
      p.metode,
      p.jumlah
    ]);

    const ok = await copyTableToExcelClipboard(headers, rows);
    if (ok) {
      setToastMsg(`Berhasil menyalin ${filteredPengeluaran.length} data pengeluaran ke format Excel!`);
      setTimeout(() => setToastMsg(''), 4000);
    }
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const headers = ['TANGGAL', 'KATEGORI', 'KETERANGAN', 'METODE', 'JUMLAH (RP)'];
    const rows = filteredPengeluaran.map(p => [
      p.tanggal,
      p.kategori,
      p.keterangan,
      p.metode,
      p.jumlah
    ]);
    downloadCSV('data_pengeluaran_pp_baitul_quran_belopa', headers, rows);
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
    if (firstRowText.includes('tanggal') || firstRowText.includes('kategori') || firstRowText.includes('jumlah')) {
      dataRows = parsedRows.slice(1);
    }

    const newExpenseItems: Omit<Pengeluaran, 'id'>[] = [];

    dataRows.forEach((cols) => {
      if (!cols[0] && !cols[1] && !cols[4]) return;

      const tanggal = cols[0] || getTodayDateInput();
      const rawKategori = cols[1] || 'Operasional';
      let kategori: KategoriPengeluaran = 'Operasional';
      const found = KATEGORI_OPTIONS.find(k => k.toLowerCase() === rawKategori.toLowerCase());
      if (found) kategori = found;

      const keterangan = cols[2] || 'Pengeluaran Pesantren';
      const metode: MetodePembayaran = (cols[3] as MetodePembayaran) || 'Tunai';
      const cleanJumlah = Number(String(cols[4] || '0').replace(/[^0-9]/g, '')) || 100000;

      newExpenseItems.push({
        tanggal,
        kategori,
        keterangan,
        metode,
        jumlah: cleanJumlah
      });
    });

    if (newExpenseItems.length > 0) {
      await onBulkAdd(newExpenseItems);
      setIsPasteModalOpen(false);
      setPasteRawText('');
      setToastMsg(`Berhasil mengimpor ${newExpenseItems.length} transaksi pengeluaran dari Excel.`);
      setTimeout(() => setToastMsg(''), 4000);
    } else {
      alert('Tidak ada baris pengeluaran yang valid ditemukan.');
    }
  };

  // Form State: Sesuai Instruksi, Kolom Tanggak Terinput Otomatis Sesuai Tanggal Aktif (Hari ini)
  const [formState, setFormState] = useState<Omit<Pengeluaran, 'id'>>({
    tanggal: getTodayDateInput(),
    kategori: 'Operasional',
    keterangan: '',
    metode: 'Tunai',
    jumlah: 150000
  });

  const openAddModal = () => {
    setFormState({
      tanggal: getTodayDateInput(), // Auto-filled with active date!
      kategori: 'Operasional',
      keterangan: '',
      metode: 'Tunai',
      jumlah: 250000
    });
    setEditingPengeluaran(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: Pengeluaran) => {
    if (!canEditOrDelete) {
      alert('Perhatian: Akun Anda hanya dapat menambah pengeluaran. Edit data hanya diizinkan untuk Admin.');
      return;
    }
    setEditingPengeluaran(item);
    setFormState({ ...item });
    setIsAddModalOpen(true);
  };

  const handleSavePengeluaran = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.keterangan.trim()) {
      alert('Keterangan pengeluaran wajib diisi!');
      return;
    }

    const isDateLocked = currentRole !== 'admin';
    const effectiveTanggal = isDateLocked ? getTodayDateInput() : (formState.tanggal || getTodayDateInput());

    const dataToSave = {
      ...formState,
      tanggal: effectiveTanggal
    };

    setIsAddModalOpen(false);

    try {
      if (editingPengeluaran) {
        await onUpdatePengeluaran(editingPengeluaran.id, dataToSave);
        setToastMsg('Data pengeluaran berhasil diperbarui.');
      } else {
        await onAddPengeluaran(dataToSave);
        setToastMsg(`Pengeluaran sebesar ${formatRupiah(dataToSave.jumlah)} berhasil dicatat.`);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan pengeluaran.');
    }

    setTimeout(() => setToastMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-4 bg-emerald-800 text-white rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-amber-300 shrink-0" />
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
                Tabel & Manajemen Pengeluaran Kas Pondok
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-200">
                Total: {formatRupiah(totalNominal)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Catatan biaya operasional, gaji guru, konsumsi santri & maintenance PP Baitul Qur'an Belopa
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Input Pengeluaran Baru */}
            <button
              id="btn-tambah-pengeluaran"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Input Pengeluaran</span>
            </button>

            {/* Copy ke Excel */}
            <button
              id="btn-copy-excel-pengeluaran"
              onClick={handleCopyTableToExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold transition"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-700" />
              <span>Copy ke Excel</span>
            </button>

            {/* Tempel dari Excel */}
            <button
              id="btn-paste-excel-pengeluaran"
              onClick={() => setIsPasteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-amber-700" />
              <span>Tempel dari Excel</span>
            </button>

            {/* Download CSV */}
            <button
              id="btn-download-csv-pengeluaran"
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition border border-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>CSV</span>
            </button>

            {/* Hapus Semua Data (Admin Only) */}
            {canEditOrDelete && (
              <button
                id="btn-delete-all-pengeluaran"
                onClick={() => setConfirmDeleteAllOpen(true)}
                title="Hapus semua data pengeluaran (Khusus Admin)"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Hapus Semua Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Rows Multi-Action Bar (Seleksi Data Pengeluaran) */}
        {selectedIds.length > 0 && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-medium text-rose-900">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              <span>{selectedIds.length} data pengeluaran terpilih</span>
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

        {/* Filter Toolbar (Aktifkan Data Filter) */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="search-pengeluaran"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari keterangan, kategori..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Filter Kategori */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="filter-kategori-pengeluaran"
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">Semua Kategori</option>
              {KATEGORI_OPTIONS.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          {/* Filter Metode */}
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              id="filter-metode-pengeluaran"
              value={filterMetode}
              onChange={(e) => setFilterMetode(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">Semua Metode</option>
              {METODE_OPTIONS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Filter Tanggal Hari Ini & Rentang Tanggal */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              id="btn-filter-pengeluaran-today"
              onClick={handleToggleTodayFilter}
              title="Filter khusus pengeluaran hari ini"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                isFilterToday
                  ? 'bg-amber-500 text-emerald-950 border-amber-600 shadow-xs ring-2 ring-amber-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-800" />
              <span>Hari Ini</span>
              {isFilterToday && <Check className="w-3 h-3 text-emerald-950 stroke-[3]" />}
            </button>

            <div className="flex items-center gap-1 w-full">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Dari Tanggal"
                placeholder="Dari"
                className="w-1/2 py-1 px-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="Sampai Tanggal"
                placeholder="Sampai"
                className="w-1/2 py-1 px-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Banner Status Filter Tanggal Hari Ini */}
        {isFilterToday && (
          <div className="mt-3 p-2.5 px-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
            <div className="flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
              <span>
                Filter Aktif: <strong>Pengeluaran Hari Ini ({formatDateIndo(todayStr)})</strong> — Ditemukan <strong>{filteredPengeluaran.length} transaksi</strong> (Total: <strong>{formatRupiah(totalNominal)}</strong>)
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs font-bold text-amber-800 hover:text-amber-950 underline ml-2 shrink-0"
            >
              Tampilkan Semua Tanggal
            </button>
          </div>
        )}
      </div>

      {/* TABEL DATA PENGELUARAN */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-emerald-900 text-white font-semibold">
                {/* Checkbox Seleksi Semua */}
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    id="select-all-pengeluaran"
                    checked={selectedIds.length === filteredPengeluaran.length && filteredPengeluaran.length > 0}
                    onChange={handleSelectAllToggle}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="p-3 whitespace-nowrap">TANGGAL</th>
                <th className="p-3 whitespace-nowrap">KATEGORI</th>
                <th className="p-3 whitespace-nowrap">KETERANGAN PENGELUARAN</th>
                <th className="p-3 whitespace-nowrap">METODE</th>
                <th className="p-3 whitespace-nowrap text-right">JUMLAH BIAYA</th>
                <th className="p-3 whitespace-nowrap text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPengeluaran.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Tidak ada data pengeluaran yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredPengeluaran.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-rose-50/50' : ''}`}
                    >
                      {/* Checkbox per row */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(item.id)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                      </td>

                      {/* Tanggal (tanggak) */}
                    <td className="p-3 whitespace-nowrap text-slate-700 font-medium">
                      {formatDateIndo(item.tanggal)}
                    </td>

                    {/* Kategori */}
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        item.kategori === 'Gaji' ? 'bg-purple-100 text-purple-900' :
                        item.kategori === 'Konsumsi' ? 'bg-amber-100 text-amber-900' :
                        item.kategori === 'Listrik dan Air' ? 'bg-blue-100 text-blue-900' :
                        item.kategori === 'ATK' ? 'bg-indigo-100 text-indigo-900' :
                        item.kategori === 'Maintenance' ? 'bg-orange-100 text-orange-900' :
                        item.kategori === 'BPJS' ? 'bg-teal-100 text-teal-900' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {item.kategori}
                      </span>
                    </td>

                    {/* Keterangan */}
                    <td className="p-3 font-medium text-slate-900">
                      {item.keterangan}
                    </td>

                    {/* Metode */}
                    <td className="p-3 whitespace-nowrap font-medium text-slate-700">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {item.metode}
                      </span>
                    </td>

                    {/* Jumlah */}
                    <td className="p-3 whitespace-nowrap text-right font-bold text-rose-700">
                      {formatRupiah(item.jumlah)}
                    </td>

                    {/* Aksi (Edit dan Hapus diaktifkan, dibatasi role) */}
                    <td className="p-3 text-center whitespace-nowrap">
                      {canEditOrDelete ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit Pengeluaran (Admin Only)"
                            className="p-1 rounded hover:bg-emerald-100 text-emerald-800 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus pengeluaran "${item.keterangan}" (${formatRupiah(item.jumlah)})?`)) {
                                onDeletePengeluaran(item.id);
                              }
                            }}
                            title="Hapus Pengeluaran (Admin Only)"
                            className="p-1 rounded hover:bg-rose-100 text-rose-700 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic px-1">
                          Lihat Saja
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredPengeluaran.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                <td colSpan={5} className="p-3 text-right text-slate-700">
                  TOTAL PENGELUARAN TERFILTER:
                </td>
                <td className="p-3 text-right text-rose-700 font-extrabold text-sm">
                  {formatRupiah(totalNominal)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
          </table>
        </div>
      </div>

      {/* MENU INPUT PENGELUARAN MODAL (Tanggal otomatis tanggal aktif, list kategori & metode) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  PP BAITUL QUR’AN BELOPA
                </span>
                <h3 className="text-base font-bold">
                  {editingPengeluaran ? 'Edit Data Pengeluaran' : 'Menu Input Pengeluaran Kas'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePengeluaran} className="p-6 space-y-4 text-xs">
              {/* Tanggal Terinput Otomatis Sesuai Tanggal Aktif */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Tanggal Pengeluaran*
                  </label>
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
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
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
                    className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 ${
                      currentRole !== 'admin'
                        ? 'bg-slate-100 border-slate-300 text-slate-700 font-bold cursor-not-allowed select-none'
                        : 'border-slate-300 rounded-lg focus:ring-emerald-600 font-medium bg-white'
                    }`}
                  />
                </div>
                {currentRole !== 'admin' && (
                  <span className="text-[10px] text-amber-800 font-medium mt-1 block">
                    Khusus akun User terkunci hanya memasukkan tanggal aktif hari ini ({formatDateIndo(getTodayDateInput())}).
                  </span>
                )}
              </div>

              {/* Kategori Berisi List Lengkap Sesuai Permintaan User */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kategori Pengeluaran*
                </label>
                <select
                  required
                  value={formState.kategori}
                  onChange={(e) => setFormState({ ...formState, kategori: e.target.value as KategoriPengeluaran })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-semibold text-slate-800"
                >
                  {KATEGORI_OPTIONS.map(kat => (
                    <option key={kat} value={kat}>{kat}</option>
                  ))}
                </select>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Keterangan Lengkap Pengeluaran*
                </label>
                <textarea
                  required
                  rows={2}
                  value={formState.keterangan}
                  onChange={(e) => setFormState({ ...formState, keterangan: e.target.value })}
                  placeholder="Contoh: Belanja beras dapur santri 10 karung / bayar tagihan listrik asrama"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Jumlah Biaya: Manual Tanpa Batasan Angka */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Jumlah Biaya (Rp)*
                  </label>
                  <span className="text-[9px] font-bold text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    Manual Tanpa Batasan
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-500 text-xs">Rp</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    placeholder="Contoh: 250000"
                    value={formState.jumlah === 0 ? '' : formState.jumlah}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      setFormState({ ...formState, jumlah: isNaN(val) ? 0 : val });
                    }}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-mono font-bold text-sm text-rose-700 bg-white"
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px]">
                  <span className="font-semibold text-slate-700">
                    {formatRupiah(formState.jumlah)}
                  </span>
                  {/* Pilihan Cepat Nominal Biaya */}
                  <div className="flex items-center gap-1 shrink-0">
                    {[50000, 100000, 250000, 500000, 1000000].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFormState({ ...formState, jumlah: n })}
                        className="px-1.5 py-0.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-900 rounded border border-slate-200 text-[9px] font-semibold transition"
                      >
                        {n >= 1000000 ? `${n / 1000000}jt` : `${n / 1000}k`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Metode Berisi List: Tunai, Transfer, QRIS, Debit */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Metode Pembayaran (List: Tunai, Transfer, QRIS, Debit)*
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {METODE_OPTIONS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormState({ ...formState, metode: m })}
                      className={`py-2 rounded-lg text-xs font-bold border transition ${
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

              {/* Submit Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold shadow-sm"
                >
                  {editingPengeluaran ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}
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
                <h3 className="font-bold text-slate-900 text-base">Tempel Pengeluaran dari Excel</h3>
              </div>
              <button onClick={() => setIsPasteModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600">
                Salin kolom pengeluaran dari Ms Excel / Google Sheets lalu tempel ke bawah:
              </p>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-600">
                Format: [TANGGAL] [KATEGORI] [KETERANGAN] [METODE] [JUMLAH]
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
                  Import Pengeluaran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS SEMUA DATA PENGELUARAN */}
      {confirmDeleteAllOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-full p-6 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Hapus Seluruh Data Pengeluaran?
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Tindakan ini akan menghapus <strong>{pengeluaranList.length} data pengeluaran</strong> kas pondok secara permanen. Tindakan ini tidak dapat dibatalkan.
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
                onClick={handleDeleteAllPengeluaran}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md transition"
              >
                Ya, Hapus Semua Pengeluaran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
