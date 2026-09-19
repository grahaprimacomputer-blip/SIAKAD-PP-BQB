import React from 'react';
import { UserSession } from '../types';
import { 
  Building2, 
  LogOut, 
  Shield, 
  User, 
  Cloud, 
  CloudCheck, 
  Users, 
  CreditCard, 
  TrendingDown, 
  PieChart,
  FileSpreadsheet,
  KeyRound
} from 'lucide-react';

interface NavbarProps {
  currentUser: UserSession | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  onOpenChangePassword: () => void;
  activeTab: 'santri' | 'pembayaran' | 'pembayaran-khusus' | 'pengeluaran' | 'labarugi';
  setActiveTab: (tab: 'santri' | 'pembayaran' | 'pembayaran-khusus' | 'pengeluaran' | 'labarugi') => void;
  isFirestoreOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenLogin,
  onOpenChangePassword,
  activeTab,
  setActiveTab,
  isFirestoreOnline
}) => {
  const getRoleBadge = () => {
    if (!currentUser) return null;
    if (currentUser.role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <Shield className="w-3 h-3 text-amber-400" />
          Admin (Akses Penuh)
        </span>
      );
    }
    if (currentUser.role === 'user1') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          <User className="w-3 h-3 text-emerald-400" />
          User 1 (Ka. Keuangan)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40">
        <User className="w-3 h-3 text-teal-400" />
        User 2 (Ka. Administrasi)
      </span>
    );
  };

  return (
    <header className="bg-emerald-900 border-b border-emerald-800 text-white sticky top-0 z-40 shadow-md">
      {/* Top Main Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Top Left Banner as requested: PP BAITUL QUR’AN BELOPA */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-inner border border-amber-300/40 shrink-0">
              <Building2 className="w-7 h-7 text-emerald-950 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase drop-shadow-sm font-serif">
                  PP BAITUL QUR’AN BELOPA
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-bold bg-amber-400 text-emerald-950 rounded tracking-wider">
                  LUWU
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-200/90 font-medium">
                Sistem Informasi Terpadu Pondok Pesantren Tahfidz & Diniyah
              </p>
            </div>
          </div>

          {/* Right Section: Cloud Sync & User Info */}
          <div className="flex items-center gap-3">
            {/* Firestore Cloud Sync Status Badge */}
            <div 
              title={isFirestoreOnline ? "Firestore Cloud Database Terhubung & Tersinkronisasi" : "Tersinkronisasi ke Local Cache & Siap Sinkron Cloud"}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                isFirestoreOnline 
                  ? "bg-emerald-800/80 text-emerald-200 border-emerald-700" 
                  : "bg-amber-950/60 text-amber-200 border-amber-700/60"
              }`}
            >
              {isFirestoreOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cloud Firestore Aktif</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <Cloud className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sync Cloud Ready</span>
                </>
              )}
            </div>

            {/* User Session Info */}
            {currentUser ? (
              <div className="flex items-center gap-3 pl-2 border-l border-emerald-800">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-white leading-tight">{currentUser.name}</div>
                  <div className="flex justify-end mt-0.5">{getRoleBadge()}</div>
                </div>

                <button
                  id="btn-navbar-change-password"
                  onClick={onOpenChangePassword}
                  title="Fasilitas Penggantian Kata Sandi"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-amber-200 hover:text-amber-100 text-xs font-semibold transition-colors border border-emerald-700 shadow-sm cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                  <span className="hidden md:inline">Ganti Password</span>
                </button>

                <button
                  id="btn-logout"
                  onClick={onLogout}
                  title="Keluar / Ganti Akun"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-medium transition-colors border border-emerald-700 shadow-sm cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            ) : (
              <button
                id="btn-open-login"
                onClick={onOpenLogin}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-sm transition-all shadow-md"
              >
                <User className="w-4 h-4" />
                <span>Masuk Aplikasi</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-emerald-950/80 border-t border-emerald-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-2 py-2 overflow-x-auto no-scrollbar">
            <button
              id="tab-santri"
              onClick={() => setActiveTab('santri')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === 'santri'
                  ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                  : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-amber-300" />
              <span>1. Data Santri & Grafik</span>
            </button>

            <button
              id="tab-pembayaran"
              onClick={() => setActiveTab('pembayaran')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === 'pembayaran'
                  ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                  : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-300" />
              <span>2. Data Transaksi Pembayaran</span>
            </button>

            <button
              id="tab-pembayaran-khusus"
              onClick={() => setActiveTab('pembayaran-khusus')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === 'pembayaran-khusus'
                  ? 'bg-amber-400 text-emerald-950 shadow-sm font-bold'
                  : 'text-amber-200 hover:bg-emerald-800/60 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>3. Form Pembayaran Khusus (Induk & Bantu)</span>
            </button>

            <button
              id="tab-pengeluaran"
              onClick={() => setActiveTab('pengeluaran')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === 'pengeluaran'
                  ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                  : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
              }`}
            >
              <TrendingDown className="w-4 h-4 text-rose-300" />
              <span>4. Data Pengeluaran</span>
            </button>

            <button
              id="tab-labarugi"
              onClick={() => setActiveTab('labarugi')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === 'labarugi'
                  ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                  : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
              }`}
            >
              <PieChart className="w-4 h-4 text-amber-400" />
              <span>5. Tabel Rugi Laba & Grafik</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
