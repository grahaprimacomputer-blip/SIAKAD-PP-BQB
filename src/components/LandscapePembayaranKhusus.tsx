import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Santri, Pembayaran, KelasSantri } from '../types';
import { formatRupiah, formatDateIndo, formatDateShortIndo, ALL_KELAS_OPTIONS } from '../utils/formatters';
import { 
  Camera, 
  Download, 
  Mail, 
  MessageSquare, 
  Printer, 
  Check, 
  Calendar, 
  ExternalLink, 
  Layers, 
  Sparkles, 
  Copy,
  CheckCircle2,
  Send,
  ZoomIn,
  ZoomOut,
  GraduationCap,
  Plus
} from 'lucide-react';

export interface CategorySummary {
  paid: number;
  count: number;
  transactions: Pembayaran[];
  dates: string[];
  latestDate?: string;
  latestReceipt?: string;
}

export interface SantriKhususSummary {
  santri: Santri;
  allTransactions: Pembayaran[];
  pendaftaran: CategorySummary;
  uangPangkal: CategorySummary;
  perlengkapan: CategorySummary;
  uangKesehatan: CategorySummary;
  yuranJuli: CategorySummary;
  yuranAgustus: CategorySummary;
  yuranSeptember: CategorySummary;
  yuranOktober: CategorySummary;
  yuranNovember: CategorySummary;
  yuranDesember: CategorySummary;
  yuranJanuari: CategorySummary;
  yuranFebruari: CategorySummary;
  yuranMaret: CategorySummary;
  yuranApril: CategorySummary;
  yuranMei: CategorySummary;
  yuranJuni: CategorySummary;
  pertemuanWali: CategorySummary;
  wisuda: CategorySummary;
  totalInduk: number;
  totalBantu: number;
  grandTotal: number;
}

interface LandscapePembayaranKhususProps {
  santri: Santri;
  santriClasses: KelasSantri[];
  activeKelas: string;
  onSelectKelas: (kelas: string) => void;
  summary: SantriKhususSummary;
  classSummaries: { kelas: string; summary: SantriKhususSummary }[];
  onKirimGmail: () => void;
  onKirimEmailApp: () => void;
  onCopyWhatsApp: () => void;
  onNavigateToPembayaran?: () => void;
  onOpenKenaikanModal?: () => void;
  onActivateClass?: (cls: string) => void;
}

export const LandscapePembayaranKhusus: React.FC<LandscapePembayaranKhususProps> = ({
  santri,
  santriClasses,
  activeKelas,
  onSelectKelas,
  summary,
  classSummaries,
  onKirimGmail,
  onKirimEmailApp,
  onCopyWhatsApp,
  onNavigateToPembayaran,
  onOpenKenaikanModal,
  onActivateClass
}) => {
  const screenshotRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureNotice, setCaptureNotice] = useState<string>('');
  const [zoomScale, setZoomScale] = useState<number>(100);

  // Ambil screenshot PNG dengan html2canvas
  const handleCaptureScreenshot = async () => {
    if (!screenshotRef.current) return;
    try {
      setIsCapturing(true);
      setCaptureNotice('Menyiapkan gambar screenshot kualitas tinggi...');
      
      const canvas = await html2canvas(screenshotRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      // Simpan file PNG
      const link = document.createElement('a');
      const cleanName = (santri?.nama || 'Santri').trim().replace(/\s+/g, '_');
      const cleanKelas = (activeKelas || '').replace(/\s+/g, '_');
      link.download = `Rekap_Pembayaran_${cleanName}_${cleanKelas}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setCaptureNotice('Gambar Screenshot PNG berhasil diunduh! Siap dikirim ke nomor WhatsApp santri.');
      setTimeout(() => setCaptureNotice(''), 4500);
    } catch (err) {
      console.error(err);
      setCaptureNotice('Gagal mengambil screenshot otomatis. Anda dapat menekan Win+Shift+S atau tombol screenshot layar.');
      setTimeout(() => setCaptureNotice(''), 5000);
    } finally {
      setIsCapturing(false);
    }
  };

  const yuranList = [
    { label: 'Yuran Juli', cat: summary.yuranJuli, monthShort: 'Juli' },
    { label: 'Yuran Agustus', cat: summary.yuranAgustus, monthShort: 'Agustus' },
    { label: 'Yuran September', cat: summary.yuranSeptember, monthShort: 'September' },
    { label: 'Yuran Oktober', cat: summary.yuranOktober, monthShort: 'Oktober' },
    { label: 'Yuran November', cat: summary.yuranNovember, monthShort: 'November' },
    { label: 'Yuran Desember', cat: summary.yuranDesember, monthShort: 'Desember' },
    { label: 'Yuran Januari', cat: summary.yuranJanuari, monthShort: 'Januari' },
    { label: 'Yuran Februari', cat: summary.yuranFebruari, monthShort: 'Februari' },
    { label: 'Yuran Maret', cat: summary.yuranMaret, monthShort: 'Maret' },
    { label: 'Yuran April', cat: summary.yuranApril, monthShort: 'April' },
    { label: 'Yuran Mei', cat: summary.yuranMei, monthShort: 'Mei' },
    { label: 'Yuran Juni', cat: summary.yuranJuni, monthShort: 'Juni' }
  ];

  return (
    <div className="space-y-4">
      {/* Notice Banner */}
      {captureNotice && (
        <div className="p-3 bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{captureNotice}</span>
          </div>
          <button onClick={() => setCaptureNotice('')} className="text-emerald-200 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* TOP CONTROLS: MULTI-CLASS TABS & SCREENSHOT ACTION BAR */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Multi-Class Tabs Sesuai Instruksi Santri Kelas 3 Memiliki Form Kelas 1 - 3 */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mr-1">
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            Pilih Formulir Kelas:
          </span>
          {santriClasses.map((cls) => {
            const isSelected = cls === activeKelas;
            const itemSum = classSummaries.find(c => c.kelas === cls)?.summary;
            const grandTotal = itemSum ? itemSum.grandTotal : 0;
            return (
              <button
                key={cls}
                type="button"
                onClick={() => onSelectKelas(cls)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-md ring-2 ring-amber-400'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
                title={`Lihat form pembayaran khusus ${santri.nama} pada ${cls}`}
              >
                <span>Formulir {cls}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isSelected 
                    ? 'bg-amber-400 text-emerald-950 font-black' 
                    : grandTotal > 0 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {grandTotal > 0 ? formatRupiah(grandTotal) : 'Rp 0'}
                </span>
              </button>
            );
          })}

          {/* Quick Activate / Buka Form Kelas Berikutnya (s/d Kelas 6) */}
          {ALL_KELAS_OPTIONS.filter(k => !santriClasses.includes(k)).length > 0 && onActivateClass && (
            <div className="flex items-center gap-1">
              {ALL_KELAS_OPTIONS.filter(k => !santriClasses.includes(k)).slice(0, 2).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => onActivateClass(k)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1"
                  title={`Aktifkan & buka form ${k} untuk santri ini`}
                >
                  <Plus className="w-3 h-3 text-amber-700" />
                  <span>Siapkan {k}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Toolbar for Screenshot, WhatsApp, Naik Kelas & Email */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          {/* Tombol Atur Naik / Tinggal Kelas */}
          {onOpenKenaikanModal && (
            <button
              type="button"
              id="btn-naik-tinggal-kelas-landscape"
              onClick={onOpenKenaikanModal}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 border border-amber-300/40 cursor-pointer"
              title="Atur Kenaikan Kelas atau Penetapan Tinggal Kelas untuk santri ini"
            >
              <GraduationCap className="w-4 h-4 text-amber-300" />
              <span>Naik/Tinggal Kelas</span>
            </button>
          )}

          {/* Zoom scale selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-600">
            <span>Ukuran:</span>
            <button
              type="button"
              onClick={() => setZoomScale(85)}
              className={`px-2 py-0.5 rounded ${zoomScale === 85 ? 'bg-white shadow-xs text-emerald-800' : 'hover:bg-slate-200'}`}
              title="Kecilkan agar pas di layar laptop kecil"
            >
              85%
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(100)}
              className={`px-2 py-0.5 rounded ${zoomScale === 100 ? 'bg-white shadow-xs text-emerald-800' : 'hover:bg-slate-200'}`}
            >
              100%
            </button>
          </div>

          {/* Tombol Unduh Screenshot PNG */}
          <button
            type="button"
            id="btn-download-screenshot-wa"
            onClick={handleCaptureScreenshot}
            disabled={isCapturing}
            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            title="Ambil gambar screenshot form landscape untuk dikirim ke nomor WhatsApp santri"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-950" />
            <span>{isCapturing ? 'Menyimpan...' : '📸 Screenshot Siap WA'}</span>
          </button>

          {/* Tombol Salin Format WhatsApp */}
          <button
            type="button"
            id="btn-copy-format-wa-landscape"
            onClick={onCopyWhatsApp}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            title="Salin teks rincian lengkap untuk di-paste ke WhatsApp"
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-200" />
            <span>Salin Format WA</span>
          </button>

          {/* Tombol Kirim Gmail Santri */}
          <button
            type="button"
            id="btn-kirim-gmail-landscape"
            onClick={onKirimGmail}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            title="Buka Gmail Web untuk mengirim rekap ke santri"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Buka Gmail</span>
          </button>

          {/* Tombol Email App */}
          <button
            type="button"
            onClick={onKirimEmailApp}
            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer"
            title="Kirim lewat aplikasi email lokal (mailto)"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Email App</span>
          </button>

          {/* Cetak Landscape */}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition flex items-center gap-1"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* CONTAINER FORM PEMBAYARAN KHUSUS BERFORMAT LANDSCAPE */}
      {/* Muat Pada Satu Tampilan Layar & Dioptimalkan untuk Screenshot WhatsApp */}
      <div className="overflow-x-auto pb-4">
        <div 
          ref={screenshotRef}
          id="form-khusus-landscape-card"
          style={{ 
            width: '1120px', 
            maxWidth: '100%', 
            transform: zoomScale !== 100 ? `scale(${zoomScale / 100})` : undefined,
            transformOrigin: 'top left'
          }}
          className="bg-white rounded-2xl border-2 border-emerald-900 shadow-xl overflow-hidden text-slate-800 mx-auto"
        >
          {/* HEADER RESMI PONDOK PESANTREN & IDENTITAS SANTRI */}
          <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white px-5 py-3 border-b-2 border-amber-400">
            <div className="flex items-center justify-between gap-3">
              {/* Logo & Kop Pesantren */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-emerald-950 font-black flex items-center justify-center text-sm shadow-md shrink-0">
                  BQB
                </div>
                <div>
                  <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                    PONDOK PESANTREN TAHFIDZUL QUR'AN
                  </div>
                  <h2 className="text-base font-black font-serif tracking-tight text-white leading-tight">
                    PP BAITUL QUR’AN BELOPA
                  </h2>
                  <p className="text-[9.5px] text-emerald-200">
                    Lembar Rekapitulasi Pembayaran Khusus Santri • Kab. Luwu, Sulawesi Selatan
                  </p>
                </div>
              </div>

              {/* Status Badge & Tingkat Kelas */}
              <div className="text-right flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-100 border border-emerald-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    Data Real-Time Terhubung
                  </span>
                  <span className="text-xs font-black px-3 py-0.5 rounded-full bg-amber-400 text-emerald-950 shadow-xs uppercase">
                    FORM {activeKelas}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-200 font-mono">
                  Dicetak: {formatDateIndo(new Date().toISOString().slice(0, 10))}
                </div>
              </div>
            </div>

            {/* BARIS IDENTITAS SANTRI TERHUBUNG */}
            <div className="mt-2.5 pt-2 border-t border-emerald-800/80 grid grid-cols-6 gap-2 text-xs">
              <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/60">
                <span className="text-[9.5px] text-emerald-300 block">Nama Santri:</span>
                <span className="font-bold text-white text-xs truncate block">{santri.nama}</span>
              </div>
              <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/60">
                <span className="text-[9.5px] text-emerald-300 block">NIP & NISN:</span>
                <span className="font-mono font-bold text-amber-200 text-xs truncate block">
                  {santri.nip} | {santri.nisn || '-'}
                </span>
              </div>
              <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/60">
                <span className="text-[9.5px] text-emerald-300 block">Formulir Kelas:</span>
                <span className="font-bold text-white text-xs block">
                  {activeKelas}
                </span>
              </div>
              <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/60">
                <span className="text-[9.5px] text-emerald-300 block">Status Akademik:</span>
                <span className="font-bold text-amber-300 text-xs block truncate">
                  {santri.statusAkademik ? `${santri.statusAkademik} (${santri.kelas})` : `${santri.kelas} (Aktif)`}
                </span>
              </div>
              <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/60">
                <span className="text-[9.5px] text-emerald-300 block">Tahun Ajaran / Masuk:</span>
                <span className="font-medium text-emerald-100 text-[11px] truncate block">
                  {santri.tahunAjaranAktif || '2025/2026'} • Masuk {santri.tahunMasuk || 2024}
                </span>
              </div>
              <div className="bg-emerald-900/60 p-1.5 rounded-lg border border-emerald-700/60">
                <span className="text-[9.5px] text-emerald-300 block">No. HP / WA Wali:</span>
                <span className="font-bold text-amber-300 text-xs truncate block">{santri.noTlp || '-'}</span>
              </div>
            </div>
          </div>

          {/* KONTEN UTAMA: SUSUNAN LANDSCAPE 2 KOLOM BERDAMPINGAN */}
          <div className="p-4 grid grid-cols-12 gap-3.5 bg-slate-50/50">
            {/* KOLOM KIRI (3.8 COL): FORM INDUK SANTRI */}
            <div className="col-span-4 bg-white rounded-xl border border-slate-200 p-3 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-emerald-800 text-white text-[10px] font-black flex items-center justify-center">
                      1
                    </span>
                    <h3 className="font-black text-xs text-slate-800 uppercase tracking-tight">
                      FORM INDUK SANTRI
                    </h3>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">Pendaftaran & Pangkal</span>
                </div>

                {/* 3 Item Form Induk: Pendaftaran, Pangkal, Perlengkapan */}
                <div className="space-y-2">
                  {/* Uang Pendaftaran */}
                  <div className={`p-2 rounded-lg border transition-all ${
                    summary.pendaftaran.paid > 0 ? 'bg-emerald-50/80 border-emerald-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">Uang Pendaftaran</span>
                      {summary.pendaftaran.paid > 0 ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Terbayar
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-normal">Kosong</span>
                      )}
                    </div>
                    <div className="font-mono font-black text-xs text-emerald-950 mt-0.5">
                      {summary.pendaftaran.paid > 0 ? formatRupiah(summary.pendaftaran.paid) : '-'}
                    </div>
                    {/* TANGGAL PEMBAYARAN DI BAWAH NOMINAL */}
                    <div className="mt-1 pt-1 border-t border-slate-200/70 text-[9.5px]">
                      {summary.pendaftaran.paid > 0 ? (
                        <div className="flex items-center gap-1 text-emerald-800 font-semibold">
                          <Calendar className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          <span>
                            Tgl: {summary.pendaftaran.dates.map(d => formatDateShortIndo(d)).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belum ada pembayaran</span>
                      )}
                    </div>
                  </div>

                  {/* Uang Pangkal */}
                  <div className={`p-2 rounded-lg border transition-all ${
                    summary.uangPangkal.paid > 0 ? 'bg-emerald-50/80 border-emerald-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">Uang Pangkal</span>
                      {summary.uangPangkal.paid > 0 ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Terbayar
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-normal">Kosong</span>
                      )}
                    </div>
                    <div className="font-mono font-black text-xs text-emerald-950 mt-0.5">
                      {summary.uangPangkal.paid > 0 ? formatRupiah(summary.uangPangkal.paid) : '-'}
                    </div>
                    {/* TANGGAL PEMBAYARAN DI BAWAH NOMINAL */}
                    <div className="mt-1 pt-1 border-t border-slate-200/70 text-[9.5px]">
                      {summary.uangPangkal.paid > 0 ? (
                        <div className="flex items-center gap-1 text-emerald-800 font-semibold">
                          <Calendar className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          <span>
                            Tgl: {summary.uangPangkal.dates.map(d => formatDateShortIndo(d)).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belum ada pembayaran</span>
                      )}
                    </div>
                  </div>

                  {/* Perlengkapan Santri */}
                  <div className={`p-2 rounded-lg border transition-all ${
                    summary.perlengkapan.paid > 0 ? 'bg-emerald-50/80 border-emerald-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">Perlengkapan Santri</span>
                      {summary.perlengkapan.paid > 0 ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Terbayar
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 font-normal">Kosong</span>
                      )}
                    </div>
                    <div className="font-mono font-black text-xs text-emerald-950 mt-0.5">
                      {summary.perlengkapan.paid > 0 ? formatRupiah(summary.perlengkapan.paid) : '-'}
                    </div>
                    {/* TANGGAL PEMBAYARAN DI BAWAH NOMINAL */}
                    <div className="mt-1 pt-1 border-t border-slate-200/70 text-[9.5px]">
                      {summary.perlengkapan.paid > 0 ? (
                        <div className="flex items-center gap-1 text-emerald-800 font-semibold">
                          <Calendar className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          <span>
                            Tgl: {summary.perlengkapan.dates.map(d => formatDateShortIndo(d)).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belum ada pembayaran</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtotal Form Induk */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between bg-emerald-50/60 p-2 rounded-lg">
                <span className="text-[10px] font-bold text-slate-600 uppercase">Subtotal Form Induk:</span>
                <span className="font-mono font-black text-xs text-emerald-900">
                  {summary.totalInduk > 0 ? formatRupiah(summary.totalInduk) : 'Rp 0'}
                </span>
              </div>
            </div>

            {/* KOLOM KANAN (8 COL): FORM BANTU & 12 BULAN YURAN */}
            <div className="col-span-8 bg-white rounded-xl border border-slate-200 p-3 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-teal-800 text-white text-[10px] font-black flex items-center justify-center">
                      2
                    </span>
                    <h3 className="font-black text-xs text-slate-800 uppercase tracking-tight">
                      FORM BANTU PEMBAYARAN (YURAN & OPERASIONAL)
                    </h3>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">12 Bulan Yuran & Biaya Khusus</span>
                </div>

                {/* Sub-baris 1: Biaya Khusus (Kesehatan, Wali, Wisuda) */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {/* Uang Kesehatan */}
                  <div className={`p-1.5 rounded-lg border text-xs ${
                    summary.uangKesehatan.paid > 0 ? 'bg-teal-50/80 border-teal-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-700">Uang Kesehatan</span>
                      {summary.uangKesehatan.paid > 0 && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                    </div>
                    <div className="font-mono font-bold text-[11px] text-teal-950 mt-0.5">
                      {summary.uangKesehatan.paid > 0 ? formatRupiah(summary.uangKesehatan.paid) : '-'}
                    </div>
                    <div className="text-[8.5px] text-slate-500 truncate mt-0.5">
                      {summary.uangKesehatan.dates.length > 0 ? `Tgl: ${formatDateShortIndo(summary.uangKesehatan.dates[0])}` : 'Belum bayar'}
                    </div>
                  </div>

                  {/* Pertemuan Wali */}
                  <div className={`p-1.5 rounded-lg border text-xs ${
                    summary.pertemuanWali.paid > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-700">Pertemuan Wali</span>
                      {summary.pertemuanWali.paid > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    </div>
                    <div className="font-mono font-bold text-[11px] text-amber-950 mt-0.5">
                      {summary.pertemuanWali.paid > 0 ? formatRupiah(summary.pertemuanWali.paid) : '-'}
                    </div>
                    <div className="text-[8.5px] text-slate-500 truncate mt-0.5">
                      {summary.pertemuanWali.dates.length > 0 ? `Tgl: ${formatDateShortIndo(summary.pertemuanWali.dates[0])}` : 'Belum bayar'}
                    </div>
                  </div>

                  {/* Wisuda */}
                  <div className={`p-1.5 rounded-lg border text-xs ${
                    summary.wisuda.paid > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-slate-700">Wisuda Santri</span>
                      {summary.wisuda.paid > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    </div>
                    <div className="font-mono font-bold text-[11px] text-amber-950 mt-0.5">
                      {summary.wisuda.paid > 0 ? formatRupiah(summary.wisuda.paid) : '-'}
                    </div>
                    <div className="text-[8.5px] text-slate-500 truncate mt-0.5">
                      {summary.wisuda.dates.length > 0 ? `Tgl: ${formatDateShortIndo(summary.wisuda.dates[0])}` : 'Belum bayar'}
                    </div>
                  </div>
                </div>

                {/* Sub-baris 2: MATRIKS 12 BULAN YURAN (Juli s/d Juni) TERSUSUN 6 x 2 RAPAT & JELAS */}
                <div className="mt-1">
                  <div className="text-[10px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                    <span>Yuran Syahriah Bulanan (12 Bulan):</span>
                    <span className="text-[9px] text-slate-400 font-normal">Tgl bayar tertera di bawah nominal</span>
                  </div>

                  <div className="grid grid-cols-6 gap-1.5">
                    {yuranList.map((item, idx) => {
                      const isPaid = item.cat.paid > 0;
                      return (
                        <div
                          key={idx}
                          className={`p-1.5 rounded-lg border transition-all flex flex-col justify-between min-h-[58px] ${
                            isPaid
                              ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between text-[9px] font-bold">
                              <span className={isPaid ? 'text-emerald-950' : 'text-slate-600'}>
                                {item.monthShort}
                              </span>
                              {isPaid ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                              ) : (
                                <span className="text-[7.5px] text-slate-400 font-normal">-</span>
                              )}
                            </div>
                            <div className="font-mono font-bold text-[10.5px] mt-0.5 leading-tight">
                              {isPaid ? (
                                <span className="text-emerald-950">{formatRupiah(item.cat.paid)}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </div>
                          </div>

                          {/* TANGGAL PEMBAYARAN TEPAT DI BAWAH NOMINAL */}
                          <div className="pt-0.5 border-t border-slate-200/70 text-[8px] leading-tight">
                            {isPaid && item.cat.dates.length > 0 ? (
                              <div className="text-emerald-800 font-bold truncate">
                                Tgl: {formatDateShortIndo(item.cat.dates[0])}
                              </div>
                            ) : (
                              <div className="text-slate-400 italic">Belum</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Subtotal Form Bantu */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between bg-teal-50/60 p-2 rounded-lg">
                <span className="text-[10px] font-bold text-slate-600 uppercase">Subtotal Form Bantu:</span>
                <span className="font-mono font-black text-xs text-teal-900">
                  {summary.totalBantu > 0 ? formatRupiah(summary.totalBantu) : 'Rp 0'}
                </span>
              </div>
            </div>
          </div>

          {/* FOOTER RESMI: GRAND TOTAL & PENGESAHAN */}
          <div className="bg-slate-100/90 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Grand Total Pembayaran Masuk ({activeKelas}):
                </span>
                <span className="text-lg font-black text-emerald-950 font-mono">
                  {summary.grandTotal > 0 ? formatRupiah(summary.grandTotal) : 'Rp 0 (Belum Ada)'}
                </span>
              </div>
              <div className="hidden sm:block pl-4 border-l border-slate-300 text-[10px] text-slate-500">
                <div>Jumlah Kwitansi Terverifikasi: <strong>{summary.allTransactions.length} Transaksi</strong></div>
                <div>Status: <span className="text-emerald-700 font-bold">Terhubung Otomatis Sistem BQB</span></div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[9.5px] text-slate-400 italic">
                "Jazaakumullaahu Khairan Katsiiran atas pembayaran syahriah santri"
              </div>
              <div className="text-[10px] font-bold text-slate-700">
                Pengurus Keuangan PP Baitul Qur'an Belopa
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
