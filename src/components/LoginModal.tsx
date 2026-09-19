import React, { useState, useEffect } from 'react';
import { UserSession } from '../types';
import { 
  getStoredUserAccounts, 
  updateAccountPassword, 
  verifyCredentials,
  StoredUserAccount 
} from '../utils/authStorage';
import { 
  Shield, 
  User, 
  Lock, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  KeyRound, 
  Eye, 
  EyeOff, 
  RefreshCw,
  X
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserSession) => void;
  canDismiss?: boolean;
  initialTab?: 'login' | 'change_password';
  defaultEmail?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  canDismiss = true,
  initialTab = 'login',
  defaultEmail
}) => {
  // Tabs: 'login' or 'change_password'
  const [activeTab, setActiveTab] = useState<'login' | 'change_password'>(initialTab);

  // Login Form States (Password HARUS diketik saat akan login)
  const [email, setEmail] = useState('admin@baitulquran.sch.id');
  const [password, setPassword] = useState(''); // Password selalu kosong saat awal
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccessNotice, setLoginSuccessNotice] = useState('');

  // Change Password States
  const [selectedChangeEmail, setSelectedChangeEmail] = useState('admin@baitulquran.sch.id');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changePassError, setChangePassError] = useState('');
  const [changePassSuccess, setChangePassSuccess] = useState('');

  // User Accounts
  const [accounts, setAccounts] = useState<Record<string, StoredUserAccount>>({});

  useEffect(() => {
    if (isOpen) {
      setAccounts(getStoredUserAccounts());
      setActiveTab(initialTab);
      if (defaultEmail) {
        setSelectedChangeEmail(defaultEmail);
        setEmail(defaultEmail);
      }
      setPassword(''); // Pastikan password diketik manual
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLoginError('');
      setChangePassError('');
      setChangePassSuccess('');
    }
  }, [isOpen, initialTab, defaultEmail]);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!password.trim()) {
      setLoginError('Silakan masukkan kata sandi (password) Anda.');
      return;
    }

    const verification = verifyCredentials(email, password);
    if (verification.success && verification.user) {
      setLoginSuccessNotice(`Selamat datang, ${verification.user.name}`);
      setTimeout(() => {
        onLoginSuccess(verification.user!);
        setPassword('');
        onClose();
      }, 300);
    } else {
      setLoginError(verification.message || 'Kata sandi salah. Silakan coba lagi.');
    }
  };

  const handleSelectAccountForLogin = (accEmail: string) => {
    setEmail(accEmail);
    setPassword('');
    setLoginError('');
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError('');
    setChangePassSuccess('');

    if (!oldPassword.trim()) {
      setChangePassError('Ketik kata sandi lama Anda saat ini.');
      return;
    }
    if (!newPassword.trim()) {
      setChangePassError('Ketik kata sandi baru yang diinginkan.');
      return;
    }
    if (newPassword.length < 3) {
      setChangePassError('Kata sandi baru minimal 3 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePassError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    // Verify old password
    const checkOld = verifyCredentials(selectedChangeEmail, oldPassword);
    if (!checkOld.success) {
      setChangePassError('Kata sandi lama salah. Tidak dapat mengubah kata sandi.');
      return;
    }

    const updated = updateAccountPassword(selectedChangeEmail, newPassword);
    if (updated) {
      setChangePassSuccess(`Kata sandi untuk ${selectedChangeEmail} berhasil diperbarui! Silakan login dengan password baru.`);
      setAccounts(getStoredUserAccounts());
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setEmail(selectedChangeEmail);
      setPassword('');
      setTimeout(() => {
        setActiveTab('login');
      }, 1500);
    } else {
      setChangePassError('Gagal menyimpan kata sandi baru.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
        {/* Close Button if dismissible */}
        {canDismiss && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-emerald-950/40 hover:bg-emerald-950/60 text-white flex items-center justify-center transition"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header PP BAITUL QUR’AN BELOPA */}
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 p-6 text-white text-center relative border-b border-emerald-800/80">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg mb-3 border-2 border-amber-300/40">
            <Building2 className="w-8 h-8 text-emerald-950 stroke-[2.2]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight font-serif uppercase text-amber-200">
            PP BAITUL QUR’AN BELOPA
          </h2>
          <p className="text-xs text-emerald-200 mt-1 font-medium">
            Sistem Informasi Pengelolaan Pesantren & Pembayaran Santri
          </p>

          {/* Navigation Sub-Tabs: Login vs Ganti Password */}
          <div className="mt-5 flex items-center justify-center gap-2 bg-emerald-950/90 p-1 rounded-xl border border-emerald-700/60 max-w-xs mx-auto">
            <button
              type="button"
              id="tab-btn-login"
              onClick={() => {
                setActiveTab('login');
                setLoginError('');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-amber-400 text-emerald-950 shadow'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>1. Masuk Akun</span>
            </button>
            <button
              type="button"
              id="tab-btn-change-pass"
              onClick={() => {
                setActiveTab('change_password');
                setChangePassError('');
                setChangePassSuccess('');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'change_password'
                  ? 'bg-amber-400 text-emerald-950 shadow'
                  : 'text-emerald-300 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>2. Ganti Password</span>
            </button>
          </div>
        </div>

        {/* TAB 1: FORM LOGIN */}
        {activeTab === 'login' && (
          <div className="p-6">
            {loginSuccessNotice && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{loginSuccessNotice}</span>
              </div>
            )}

            {loginError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold animate-in shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Akun Pengguna
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan email..."
                    className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Kata Sandi (Password)
                  </label>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    Wajib Diisi
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-submit-login"
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-amber-300" />
                <span>Masuk dengan Kata Sandi</span>
              </button>
            </form>

            {/* Quick Pick Account */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
                Pilih Akun Pengguna:
              </p>

              <div className="space-y-2">
                {/* Admin */}
                <button
                  type="button"
                  id="pick-account-admin"
                  onClick={() => handleSelectAccountForLogin('admin@baitulquran.sch.id')}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    email === 'admin@baitulquran.sch.id'
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/50 shadow-sm'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-amber-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        1. Admin - Abdul Hakmin, S.Kom (Pimpinan)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        admin@baitulquran.sch.id
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    Akses Penuh
                  </span>
                </button>

                {/* User 1 */}
                <button
                  type="button"
                  id="pick-account-user1"
                  onClick={() => handleSelectAccountForLogin('user1@baitulquran.sch.id')}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    email === 'user1@baitulquran.sch.id'
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/50 shadow-sm'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-emerald-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        2. User 1 - Ka. Keuangan (Fitri)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        user1@baitulquran.sch.id
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Input Saja
                  </span>
                </button>

                {/* User 2 */}
                <button
                  type="button"
                  id="pick-account-user2"
                  onClick={() => handleSelectAccountForLogin('user2@baitulquran.sch.id')}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    email === 'user2@baitulquran.sch.id'
                      ? 'bg-teal-50 border-teal-400 ring-2 ring-teal-400/50 shadow-sm'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-teal-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        3. User 2 - Ka. Administrasi (Riska)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        user2@baitulquran.sch.id
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-300">
                    Input Saja
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FORM GANTI PASSWORD */}
        {activeTab === 'change_password' && (
          <div className="p-6">
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-900 text-xs">
              <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Fasilitas Penggantian Kata Sandi: Pilih akun dan ubah kata sandi dengan aman.
              </span>
            </div>

            {changePassSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{changePassSuccess}</span>
              </div>
            )}

            {changePassError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold animate-in shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{changePassError}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 text-xs">
              {/* Pilih Akun */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih Akun yang Ingin Diubah Kata Sandinya
                </label>
                <select
                  value={selectedChangeEmail}
                  onChange={(e) => setSelectedChangeEmail(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 font-semibold text-slate-800 text-xs"
                >
                  <option value="admin@baitulquran.sch.id">Admin - Abdul Hakmin, S.Kom (admin@baitulquran.sch.id)</option>
                  <option value="user1@baitulquran.sch.id">User 1 - Ka. Keuangan (Fitri) (user1@baitulquran.sch.id)</option>
                  <option value="user2@baitulquran.sch.id">User 2 - Ka. Administrasi (Riska) (user2@baitulquran.sch.id)</option>
                </select>
              </div>

              {/* Password Lama */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kata Sandi Lama Saat Ini*
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Ketik kata sandi lama..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Password Baru */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kata Sandi Baru*
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 3 karakter..."
                    className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title={showNewPassword ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password Baru */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Baru*
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru..."
                    className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Perubahan Kata Sandi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal / Kembali
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
