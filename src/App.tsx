import React, { useState, useEffect } from 'react';
import { UserSession, Santri, Pembayaran, Pengeluaran } from './types';
import { DEFAULT_USERS } from './data/initialData';
import { getStoredUserAccounts } from './utils/authStorage';
import { syncService } from './firebase/firestoreService';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { SantriSection } from './components/SantriSection';
import { PembayaranSection } from './components/PembayaranSection';
import { FormPembayaranKhusus } from './components/FormPembayaranKhusus';
import { PengeluaranSection } from './components/PengeluaranSection';
import { LabaRugiSection } from './components/LabaRugiSection';
import { Shield, User, RefreshCw, CloudCheck, Building2 } from 'lucide-react';

export default function App() {
  // Current user state (Default to Admin for immediate usability, easy to switch)
  const [currentUser, setCurrentUser] = useState<UserSession | null>(
    DEFAULT_USERS['admin@baitulquran.sch.id'].user
  );
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalInitialTab, setLoginModalInitialTab] = useState<'login' | 'change_password'>('login');

  // Active tab state
  const [activeTab, setActiveTab] = useState<'santri' | 'pembayaran' | 'pembayaran-khusus' | 'pengeluaran' | 'labarugi'>('santri');

  // Firestore & Realtime data state
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [pembayaranList, setPembayaranList] = useState<Pembayaran[]>([]);
  const [pengeluaranList, setPengeluaranList] = useState<Pengeluaran[]>([]);
  const [isFirestoreOnline, setIsFirestoreOnline] = useState<boolean>(false);

  // Sync subscriptions
  useEffect(() => {
    const unsubSantri = syncService.subscribeSantri(setSantriList);
    const unsubPembayaran = syncService.subscribePembayaran(setPembayaranList);
    const unsubPengeluaran = syncService.subscribePengeluaran(setPengeluaranList);
    const unsubStatus = syncService.onStatusChange(setIsFirestoreOnline);

    return () => {
      unsubSantri();
      unsubPembayaran();
      unsubPengeluaran();
      unsubStatus();
    };
  }, []);

  // Quick switch role
  const handleSwitchUser = (emailKey: string) => {
    const stored = getStoredUserAccounts();
    const foundStored = stored[emailKey];
    if (foundStored) {
      setCurrentUser({
        email: foundStored.email,
        name: foundStored.name,
        role: foundStored.role,
        avatar: foundStored.avatar
      });
      return;
    }
    const found = DEFAULT_USERS[emailKey];
    if (found) {
      setCurrentUser(found.user);
    }
  };

  const currentRole = currentUser ? currentUser.role : 'user1';

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased selection:bg-emerald-200 selection:text-emerald-950">
      {/* Top Navigation Bar with Banner PP BAITUL QUR’AN BELOPA */}
      <Navbar
        currentUser={currentUser}
        onLogout={() => {
          setCurrentUser(null);
          setLoginModalInitialTab('login');
          setIsLoginModalOpen(true);
        }}
        onOpenLogin={() => {
          setLoginModalInitialTab('login');
          setIsLoginModalOpen(true);
        }}
        onOpenChangePassword={() => {
          setLoginModalInitialTab('change_password');
          setIsLoginModalOpen(true);
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isFirestoreOnline={isFirestoreOnline}
      />

      {/* Role Switcher Floating Helper for Easy Testing of Admin, User 1, User 2 */}
      <div className="bg-emerald-950 text-emerald-200 border-b border-emerald-900 py-1.5 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Simulasi Akun Pengguna:</span>
            <div className="flex gap-1.5">
              <button
                id="role-switch-admin"
                onClick={() => handleSwitchUser('admin@baitulquran.sch.id')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                  currentUser?.role === 'admin'
                    ? 'bg-amber-400 text-emerald-950 shadow-sm'
                    : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-200'
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>Admin (Akses Full)</span>
              </button>

              <button
                id="role-switch-user1"
                onClick={() => handleSwitchUser('user1@baitulquran.sch.id')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                  currentUser?.role === 'user1'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-200'
                }`}
              >
                <User className="w-3 h-3" />
                <span>User 1 (Ka. Keuangan)</span>
              </button>

              <button
                id="role-switch-user2"
                onClick={() => handleSwitchUser('user2@baitulquran.sch.id')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                  currentUser?.role === 'user2'
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-200'
                }`}
              >
                <User className="w-3 h-3" />
                <span>User 2 (Ka. Administrasi)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-emerald-300">
            <span className="hidden sm:inline">Hak Akses Aktif:</span>
            <span className="font-semibold text-amber-300">
              {currentUser?.role === 'admin' 
                ? 'Bisa Tambah, Edit, Hapus & Seleksi Semua' 
                : 'Bisa Tambah Data (Tak Bisa Edit & Hapus)'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'santri' && (
          <SantriSection
            santriList={santriList}
            currentRole={currentRole}
            onAddSantri={(data) => syncService.addSantri(data)}
            onUpdateSantri={(id, data) => syncService.updateSantri(id, data)}
            onBulkUpdateSantri={(updates) => syncService.bulkUpdateSantri(updates)}
            onDeleteSantri={(id) => syncService.deleteSantri(id)}
            onDeleteMultiple={(ids) => syncService.deleteMultipleSantri(ids)}
            onDeleteAll={() => syncService.deleteAllSantri()}
            onBulkAdd={(items) => syncService.bulkAddSantri(items)}
          />
        )}

        {activeTab === 'pembayaran' && (
          <PembayaranSection
            pembayaranList={pembayaranList}
            santriList={santriList}
            currentRole={currentRole}
            onAddPembayaran={(data) => syncService.addPembayaran(data)}
            onUpdatePembayaran={(id, data) => syncService.updatePembayaran(id, data)}
            onDeletePembayaran={(id) => syncService.deletePembayaran(id)}
            onDeleteMultiple={(ids) => syncService.deleteMultiplePembayaran(ids)}
            onDeleteAll={() => syncService.deleteAllPembayaran()}
            onBulkAdd={(items) => syncService.bulkAddPembayaran(items)}
          />
        )}

        {activeTab === 'pembayaran-khusus' && (
          <FormPembayaranKhusus
            santriList={santriList}
            pembayaranList={pembayaranList}
            currentRole={currentRole}
            onNavigateToPembayaran={() => setActiveTab('pembayaran')}
            onUpdateSantri={(id, data) => syncService.updateSantri(id, data)}
            onBulkUpdateSantri={(updates) => syncService.bulkUpdateSantri(updates)}
          />
        )}

        {activeTab === 'pengeluaran' && (
          <PengeluaranSection
            pengeluaranList={pengeluaranList}
            currentRole={currentRole}
            onAddPengeluaran={(data) => syncService.addPengeluaran(data)}
            onUpdatePengeluaran={(id, data) => syncService.updatePengeluaran(id, data)}
            onDeletePengeluaran={(id) => syncService.deletePengeluaran(id)}
            onDeleteMultiple={(ids) => syncService.deleteMultiplePengeluaran(ids)}
            onDeleteAll={() => syncService.deleteAllPengeluaran()}
            onBulkAdd={(items) => syncService.bulkAddPengeluaran(items)}
          />
        )}

        {activeTab === 'labarugi' && (
          <LabaRugiSection
            pembayaranList={pembayaranList}
            pengeluaranList={pengeluaranList}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-emerald-950 border-t border-emerald-900 text-emerald-300 py-6 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-emerald-950 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">
                PP BAITUL QUR’AN BELOPA
              </p>
              <p className="text-[11px] text-emerald-300">
                Kabupaten Luwu, Sulawesi Selatan • Cloud Firestore Database Terintegrasi
              </p>
            </div>
          </div>
          <div className="text-center sm:text-right text-[11px] text-emerald-400">
            <p>© {new Date().getFullYear()} Sistem Informasi Pondok Pesantren Baitul Qur'an Belopa</p>
            <p className="text-emerald-500 mt-0.5">Sinkronisasi Realtime Multi-Perangkat</p>
          </div>
        </div>
      </footer>

      {/* Login / Switch Account Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(user) => setCurrentUser(user)}
        initialTab={loginModalInitialTab}
        defaultEmail={currentUser?.email}
      />
    </div>
  );
}
