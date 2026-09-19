import React, { useState, useMemo } from 'react';
import { Pembayaran, Pengeluaran } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart2, 
  Calendar, 
  Printer, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { downloadCSV } from '../utils/excelHelper';

interface LabaRugiSectionProps {
  pembayaranList: Pembayaran[];
  pengeluaranList: Pengeluaran[];
}

export const LabaRugiSection: React.FC<LabaRugiSectionProps> = ({
  pembayaranList,
  pengeluaranList
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    pembayaranList.forEach(p => {
      if (p.tanggal) years.add(p.tanggal.substring(0, 4));
    });
    pengeluaranList.forEach(e => {
      if (e.tanggal) years.add(e.tanggal.substring(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [pembayaranList, pengeluaranList]);

  // Filtered lists
  const filteredPembayaran = useMemo(() => {
    if (selectedYear === 'ALL') return pembayaranList;
    return pembayaranList.filter(p => p.tanggal.startsWith(selectedYear));
  }, [pembayaranList, selectedYear]);

  const filteredPengeluaran = useMemo(() => {
    if (selectedYear === 'ALL') return pengeluaranList;
    return pengeluaranList.filter(e => e.tanggal.startsWith(selectedYear));
  }, [pengeluaranList, selectedYear]);

  // Totals
  const totalPendapatan = useMemo(() => {
    return filteredPembayaran.reduce((sum, p) => sum + (p.jumlah || 0), 0);
  }, [filteredPembayaran]);

  const totalPengeluaran = useMemo(() => {
    return filteredPengeluaran.reduce((sum, e) => sum + (e.jumlah || 0), 0);
  }, [filteredPengeluaran]);

  const surplusDefisit = totalPendapatan - totalPengeluaran;
  const isSurplus = surplusDefisit >= 0;

  // Breakdown Pendapatan per Jenis
  const pendapatanBreakdown = useMemo(() => {
    const map: { [key: string]: number } = {};
    filteredPembayaran.forEach(p => {
      map[p.jenisPembayaran] = (map[p.jenisPembayaran] || 0) + (p.jumlah || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredPembayaran]);

  // Breakdown Pengeluaran per Kategori
  const pengeluaranBreakdown = useMemo(() => {
    const map: { [key: string]: number } = {};
    filteredPengeluaran.forEach(e => {
      map[e.kategori] = (map[e.kategori] || 0) + (e.jumlah || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredPengeluaran]);

  // Monthly Comparison for Graph (12 Months)
  const monthlyData = useMemo(() => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return months.map((monthName, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      
      const income = filteredPembayaran
        .filter(p => {
          const parts = p.tanggal.split('-');
          return parts[1] === monthNum;
        })
        .reduce((sum, p) => sum + p.jumlah, 0);

      const expense = filteredPengeluaran
        .filter(e => {
          const parts = e.tanggal.split('-');
          return parts[1] === monthNum;
        })
        .reduce((sum, e) => sum + e.jumlah, 0);

      const net = income - expense;

      return {
        month: monthName,
        short: monthName.slice(0, 3),
        income,
        expense,
        net
      };
    });
  }, [filteredPembayaran, filteredPengeluaran]);

  // Max value for graph scaling
  const maxMonthlyVal = useMemo(() => {
    let max = 1000000;
    monthlyData.forEach(m => {
      if (m.income > max) max = m.income;
      if (m.expense > max) max = m.expense;
    });
    return max;
  }, [monthlyData]);

  // Export Laba Rugi CSV
  const handleExportCSV = () => {
    const headers = ['KATEGORI / AKUN KEUANGAN', 'TIPE', 'JUMLAH (RP)'];
    const rows: (string | number)[][] = [];

    rows.push(['--- PENDAPATAN OPERASIONAL SANTRI ---', '', '']);
    pendapatanBreakdown.forEach(([jenis, jlh]) => {
      rows.push([jenis, 'Pendapatan', jlh]);
    });
    rows.push(['TOTAL PENDAPATAN', 'TOTAL', totalPendapatan]);

    rows.push(['', '', '']);
    rows.push(['--- BEBAN PENGELUARAN PESANTREN ---', '', '']);
    pengeluaranBreakdown.forEach(([kat, jlh]) => {
      rows.push([kat, 'Beban Pengeluaran', jlh]);
    });
    rows.push(['TOTAL PENGELUARAN', 'TOTAL', totalPengeluaran]);

    rows.push(['', '', '']);
    rows.push(['SURPLUS / (DEFISIT) BERSIH', isSurplus ? 'SURPLUS' : 'DEFISIT', surplusDefisit]);

    downloadCSV(`laporan_rugi_laba_pp_bqb_${selectedYear}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Laporan Rugi Laba & Analisis Keuangan
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                PP Baitul Qur'an Belopa
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Rekapitulasi pendapatan operasional santri, beban pengeluaran pondok, dan saldo bersih kas
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">Semua Periode</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>Tahun {yr}</option>
                ))}
              </select>
            </div>

            {/* Export CSV */}
            <button
              id="btn-export-labarugi-csv"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition border border-slate-200"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>

            {/* Print */}
            <button
              id="btn-print-labarugi"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Pendapatan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Pemasukan (Pembayaran)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-700">
            {formatRupiah(totalPendapatan)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Dari {filteredPembayaran.length} transaksi penerimaan santri
          </p>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-emerald-50 rounded-full opacity-40"></div>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Pengeluaran Kas
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-rose-700">
            {formatRupiah(totalPengeluaran)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Dari {filteredPengeluaran.length} pos biaya & operasional
          </p>
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-rose-50 rounded-full opacity-40"></div>
        </div>

        {/* Surplus / Defisit Bersih */}
        <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden ${
          isSurplus 
            ? 'bg-gradient-to-br from-emerald-900 to-teal-900 text-white border-emerald-800'
            : 'bg-gradient-to-br from-rose-900 to-red-950 text-white border-rose-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
              {isSurplus ? 'Surplus Kas Pesantren' : 'Defisit Kas Pesantren'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-emerald-950 flex items-center justify-center">
              {isSurplus ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-amber-300">
            {formatRupiah(Math.abs(surplusDefisit))}
          </div>
          <p className="text-[11px] text-emerald-100 mt-1">
            {isSurplus ? 'Kondisi Kas Sehat & Surplus' : 'Perhatian: Beban melebihi penerimaan'}
          </p>
        </div>
      </div>

      {/* GRAFIK RUGI LABA (Visualisasi Batang Perbandingan Pemasukan vs Pengeluaran Per Bulan) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-emerald-700" />
              Grafik Arus Kas & Perbandingan Pemasukan vs Pengeluaran Bulanan
            </h3>
            <p className="text-xs text-slate-500">
              Evaluasi kinerja surplus kas per bulan (Januari s.d Desember)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-600"></span>
              Pemasukan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500"></span>
              Pengeluaran
            </span>
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="h-64 flex items-end justify-between gap-1 sm:gap-3 pt-6 border-b border-slate-200">
          {monthlyData.map((m) => {
            const incomeHeightPct = maxMonthlyVal > 0 ? Math.round((m.income / maxMonthlyVal) * 100) : 0;
            const expenseHeightPct = maxMonthlyVal > 0 ? Math.round((m.expense / maxMonthlyVal) * 100) : 0;

            return (
              <div key={m.month} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 text-white text-[10px] p-2 rounded-lg pointer-events-none shadow-xl whitespace-nowrap">
                  <div className="font-bold">{m.month}</div>
                  <div className="text-emerald-300">Masuk: {formatRupiah(m.income)}</div>
                  <div className="text-rose-300">Keluar: {formatRupiah(m.expense)}</div>
                  <div className="font-semibold border-t border-slate-700 mt-1 pt-0.5">
                    Net: {formatRupiah(m.net)}
                  </div>
                </div>

                {/* Bars */}
                <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1.5 h-full pb-1">
                  {/* Income bar */}
                  <div
                    className="w-1/2 bg-emerald-600 hover:bg-emerald-500 rounded-t transition-all duration-300 min-h-[4px]"
                    style={{ height: `${Math.max(incomeHeightPct, 4)}%` }}
                    title={`Pemasukan: ${formatRupiah(m.income)}`}
                  ></div>

                  {/* Expense bar */}
                  <div
                    className="w-1/2 bg-rose-500 hover:bg-rose-400 rounded-t transition-all duration-300 min-h-[4px]"
                    style={{ height: `${Math.max(expenseHeightPct, 4)}%` }}
                    title={`Pengeluaran: ${formatRupiah(m.expense)}`}
                  ></div>
                </div>

                {/* Month Label */}
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-2 truncate">
                  {m.short}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* TABEL FORMAT AKUNTANSI RESMI RUGI LABA */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-emerald-950 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-sm uppercase tracking-wide text-slate-900">
                LAPORAN RUGI LABA (SURPLUS / DEFISIT)
              </h3>
              <p className="text-xs text-slate-500">
                Pondok Pesantren Baitul Qur'an Belopa • Periode: {selectedYear === 'ALL' ? 'Semua Tahun' : `Tahun ${selectedYear}`}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            Format Resmi Pesantren
          </span>
        </div>

        <div className="p-6 space-y-6 text-xs">
          {/* I. Pendapatan Operasional */}
          <div>
            <div className="flex justify-between items-center py-2 px-3 bg-emerald-50 rounded-lg font-bold text-emerald-950 border border-emerald-200 mb-2">
              <span className="uppercase tracking-wider">I. PENDAPATAN OPERASIONAL SANTRI</span>
              <span>NOMINAL (RP)</span>
            </div>

            <div className="divide-y divide-slate-100">
              {pendapatanBreakdown.length === 0 ? (
                <div className="py-2 text-slate-400 italic">Belum ada pos pendapatan tercatat.</div>
              ) : (
                pendapatanBreakdown.map(([jenis, jlh]) => {
                  const pct = totalPendapatan > 0 ? ((jlh / totalPendapatan) * 100).toFixed(1) : '0';
                  return (
                    <div key={jenis} className="flex justify-between py-2 px-2 hover:bg-slate-50 transition">
                      <span className="text-slate-700 font-medium">
                        • {jenis} <span className="text-slate-400 text-[10px]">({pct}%)</span>
                      </span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {formatRupiah(jlh)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-between py-2 px-2 border-t-2 border-slate-300 font-bold text-emerald-800 mt-1">
              <span>TOTAL PENDAPATAN (A):</span>
              <span className="font-mono text-sm">{formatRupiah(totalPendapatan)}</span>
            </div>
          </div>

          {/* II. Beban Operasional */}
          <div>
            <div className="flex justify-between items-center py-2 px-3 bg-rose-50 rounded-lg font-bold text-rose-950 border border-rose-200 mb-2">
              <span className="uppercase tracking-wider">II. BEBAN & PENGELUARAN OPERASIONAL</span>
              <span>NOMINAL (RP)</span>
            </div>

            <div className="divide-y divide-slate-100">
              {pengeluaranBreakdown.length === 0 ? (
                <div className="py-2 text-slate-400 italic">Belum ada pos pengeluaran tercatat.</div>
              ) : (
                pengeluaranBreakdown.map(([kat, jlh]) => {
                  const pct = totalPengeluaran > 0 ? ((jlh / totalPengeluaran) * 100).toFixed(1) : '0';
                  return (
                    <div key={kat} className="flex justify-between py-2 px-2 hover:bg-slate-50 transition">
                      <span className="text-slate-700 font-medium">
                        • {kat} <span className="text-slate-400 text-[10px]">({pct}%)</span>
                      </span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {formatRupiah(jlh)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-between py-2 px-2 border-t-2 border-slate-300 font-bold text-rose-800 mt-1">
              <span>TOTAL PENGELUARAN (B):</span>
              <span className="font-mono text-sm">{formatRupiah(totalPengeluaran)}</span>
            </div>
          </div>

          {/* III. Surplus / Defisit Bersih */}
          <div className="pt-2 border-t-2 border-slate-400">
            <div className={`flex justify-between items-center p-3.5 rounded-xl font-black text-sm ${
              isSurplus 
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-rose-800 text-white shadow-sm'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-300" />
                <span className="uppercase tracking-wider">
                  SURPLUS / (DEFISIT) BERSIH TAHUN BERJALAN (A - B):
                </span>
              </div>
              <span className="text-base text-amber-300 font-mono font-extrabold">
                {formatRupiah(surplusDefisit)}
              </span>
            </div>
          </div>

          {/* Tanda Tangan Pengesahan Laporan */}
          <div className="pt-8 grid grid-cols-2 text-center text-xs text-slate-600">
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold text-slate-800">Pimpinan PP Baitul Qur'an Belopa</p>
              <div className="h-16"></div>
              <p className="font-bold underline text-slate-900">Abdul Hakmin, S.Kom</p>
              <p className="text-[10px] text-slate-400">NIP. BQB-0001</p>
            </div>
            <div>
              <p>Belopa, {formatDateIndo(new Date().toISOString().split('T')[0])}</p>
              <p className="font-bold text-slate-800">Bendahara / Bagian Keuangan</p>
              <div className="h-16"></div>
              <p className="font-bold underline text-slate-900">Fitri & Riska</p>
              <p className="text-[10px] text-slate-400">Ka. Keuangan & Ka. Administrasi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
