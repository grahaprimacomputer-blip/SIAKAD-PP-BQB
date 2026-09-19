import { UserSession, Role } from '../types';
import { DEFAULT_USERS } from '../data/initialData';

const AUTH_STORAGE_KEY = 'pp_bqb_auth_users_v5';

export interface StoredUserAccount {
  email: string;
  name: string;
  role: Role;
  password: string;
  avatar?: string;
  lastPasswordChanged?: string;
}

// Initialize and retrieve stored accounts with updated default passwords
export function getStoredUserAccounts(): Record<string, StoredUserAccount> {
  let accounts: Record<string, StoredUserAccount> = {};
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        accounts = parsed;
      }
    }
  } catch (e) {
    console.error('Error reading auth users:', e);
  }

  let changed = false;
  // Ensure default users are present and have updated name & active passwords
  Object.keys(DEFAULT_USERS).forEach(emailKey => {
    const def = DEFAULT_USERS[emailKey];
    if (!accounts[emailKey]) {
      accounts[emailKey] = {
        email: def.user.email,
        name: def.user.name,
        role: def.user.role,
        password: def.password,
        avatar: def.user.avatar
      };
      changed = true;
    } else {
      // Sync names if needed
      if (accounts[emailKey].name !== def.user.name) {
        accounts[emailKey].name = def.user.name;
        changed = true;
      }
      // Migrate legacy passwords if found
      if (emailKey === 'admin@baitulquran.sch.id' && accounts[emailKey].password === 'admin') {
        accounts[emailKey].password = 'admin123';
        changed = true;
      }
      if (emailKey === 'user1@baitulquran.sch.id' && accounts[emailKey].password === 'user1') {
        accounts[emailKey].password = 'user123';
        changed = true;
      }
      if (emailKey === 'user2@baitulquran.sch.id' && accounts[emailKey].password === 'user2') {
        accounts[emailKey].password = 'user123';
        changed = true;
      }
    }
  });

  if (changed || !localStorage.getItem(AUTH_STORAGE_KEY)) {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Error storing initial auth accounts:', e);
    }
  }

  return accounts;
}

// Update password for a specific email
export function updateAccountPassword(email: string, newPass: string): boolean {
  const accounts = getStoredUserAccounts();
  const cleanEmail = email.trim().toLowerCase();
  
  if (accounts[cleanEmail]) {
    accounts[cleanEmail].password = newPass;
    accounts[cleanEmail].lastPasswordChanged = new Date().toISOString();
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(accounts));
      return true;
    } catch (e) {
      console.error('Error saving updated password:', e);
      return false;
    }
  }
  return false;
}

// Verify credentials with active password check
export function verifyCredentials(email: string, pass?: string): { success: boolean; user?: UserSession; message?: string } {
  const accounts = getStoredUserAccounts();
  const cleanEmail = email.trim().toLowerCase();
  const account = accounts[cleanEmail] || (DEFAULT_USERS[cleanEmail] ? {
    email: DEFAULT_USERS[cleanEmail].user.email,
    name: DEFAULT_USERS[cleanEmail].user.name,
    role: DEFAULT_USERS[cleanEmail].user.role,
    password: DEFAULT_USERS[cleanEmail].password,
    avatar: DEFAULT_USERS[cleanEmail].user.avatar
  } : null);

  if (!account) {
    return { success: false, message: 'Akun email tidak terdaftar dalam sistem.' };
  }

  if (!pass || pass.trim() === '') {
    return { success: false, message: 'Kata sandi (password) wajib dimasukkan.' };
  }

  if (account.password !== pass) {
    return { success: false, message: 'Kata sandi salah. Silakan periksa kembali kata sandi Anda.' };
  }

  return {
    success: true,
    user: {
      email: account.email,
      name: account.name,
      role: account.role,
      avatar: account.avatar
    }
  };
}
