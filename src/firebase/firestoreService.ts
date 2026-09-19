import { 
  db, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  onSnapshot,
  writeBatch 
} from './config';
import { Santri, Pembayaran, Pengeluaran } from '../types';
import { INITIAL_SANTRI, INITIAL_PEMBAYARAN, INITIAL_PENGELUARAN } from '../data/initialData';

const STORAGE_KEYS = {
  SANTRI: 'pp_bqb_santri_v1',
  PEMBAYARAN: 'pp_bqb_pembayaran_v1',
  PENGELUARAN: 'pp_bqb_pengeluaran_v1',
  INITIALIZED: 'pp_bqb_db_initialized'
};

// Helper: load from localStorage
export const getLocalData = <T>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
  }
  return fallback;
};

// Helper: save to localStorage
export const saveLocalData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
};

// Safe normalizer to prevent any undefined property errors (e.g. s.nama is undefined)
export const sanitizeSantri = (raw: any, idFallback?: string): Santri => {
  const data = raw || {};
  const nisnVal = data.nisn || data.nis || data.npm || '';
  return {
    ...data,
    id: String(data.id || idFallback || `santri_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    nip: String(data.nip || ''),
    nisn: String(nisnVal),
    nis: String(data.nis || nisnVal),
    npm: String(data.npm || ''),
    nama: String(data.nama || ''),
    email: String(data.email || ''),
    tempatLahir: String(data.tempatLahir || ''),
    tanggalLahir: String(data.tanggalLahir || ''),
    alamat: String(data.alamat || ''),
    program: data.program || 'TAHFIDZ',
    jenjangPendidikan: data.jenjangPendidikan || 'SMP/MTs',
    kelas: data.kelas || 'Kelas 1',
    kelasList: Array.isArray(data.kelasList) && data.kelasList.length > 0 ? data.kelasList : [data.kelas || 'Kelas 1'],
    riwayatKelas: Array.isArray(data.riwayatKelas) ? data.riwayatKelas : [],
    namaAyah: String(data.namaAyah || ''),
    pekerjaanAyah: String(data.pekerjaanAyah || ''),
    statusAyah: data.statusAyah || 'MASIH HIDUP',
    namaIbu: String(data.namaIbu || ''),
    pekerjaanIbu: String(data.pekerjaanIbu || ''),
    statusIbu: data.statusIbu || 'MASIH HIDUP',
    fotoUrl: data.fotoUrl && String(data.fotoUrl).trim() ? String(data.fotoUrl) : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    fotoBlob: String(data.fotoBlob || ''),
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  };
};

export const sanitizePembayaran = (raw: any, idFallback?: string): Pembayaran => {
  const data = raw || {};
  return {
    ...data,
    id: String(data.id || idFallback || `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    tanggal: String(data.tanggal || new Date().toISOString().split('T')[0]),
    tahun: typeof data.tahun === 'number' ? data.tahun : new Date().getFullYear(),
    nip: String(data.nip || ''),
    nisn: String(data.nisn || data.nis || ''),
    nis: String(data.nis || data.nisn || ''),
    nama: String(data.nama || ''),
    email: String(data.email || ''),
    kelas: data.kelas || 'Kelas 1',
    jenisPembayaran: data.jenisPembayaran || 'SPP Juli',
    jumlah: typeof data.jumlah === 'number' ? data.jumlah : Number(data.jumlah) || 0,
    metode: data.metode || 'Transfer',
    keterangan: String(data.keterangan || ''),
    emailStatus: data.emailStatus || 'Terkirim',
    nomorKwitansi: String(data.nomorKwitansi || `KW-${Date.now()}`)
  };
};

export const sanitizePengeluaran = (raw: any, idFallback?: string): Pengeluaran => {
  const data = raw || {};
  return {
    ...data,
    id: String(data.id || idFallback || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    tanggal: String(data.tanggal || new Date().toISOString().split('T')[0]),
    kategori: data.kategori || 'Operasional',
    jumlah: typeof data.jumlah === 'number' ? data.jumlah : Number(data.jumlah) || 0,
    keterangan: String(data.keterangan || ''),
    metode: data.metode || 'Transfer'
  };
};

class DataSyncService {
  private santriSubscribers: ((data: Santri[]) => void)[] = [];
  private pembayaranSubscribers: ((data: Pembayaran[]) => void)[] = [];
  private pengeluaranSubscribers: ((data: Pengeluaran[]) => void)[] = [];

  private santriData: Santri[] = [];
  private pembayaranData: Pembayaran[] = [];
  private pengeluaranData: Pengeluaran[] = [];

  public isFirestoreOnline: boolean = false;
  private statusListeners: ((online: boolean) => void)[] = [];

  constructor() {
    this.init();
  }

  private init() {
    // 1. First load cached data with normalization to prevent undefined field crashes
    const rawSantri = getLocalData<any[]>(STORAGE_KEYS.SANTRI, INITIAL_SANTRI);
    const rawPembayaran = getLocalData<any[]>(STORAGE_KEYS.PEMBAYARAN, INITIAL_PEMBAYARAN);
    const rawPengeluaran = getLocalData<any[]>(STORAGE_KEYS.PENGELUARAN, INITIAL_PENGELUARAN);

    this.santriData = (Array.isArray(rawSantri) ? rawSantri : INITIAL_SANTRI).map((s, i) => sanitizeSantri(s, `santri_${i}`));
    this.pembayaranData = (Array.isArray(rawPembayaran) ? rawPembayaran : INITIAL_PEMBAYARAN).map((p, i) => sanitizePembayaran(p, `pay_${i}`));
    this.pengeluaranData = (Array.isArray(rawPengeluaran) ? rawPengeluaran : INITIAL_PENGELUARAN).map((e, i) => sanitizePengeluaran(e, `exp_${i}`));

    // Save initial if empty
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      saveLocalData(STORAGE_KEYS.SANTRI, this.santriData);
      saveLocalData(STORAGE_KEYS.PEMBAYARAN, this.pembayaranData);
      saveLocalData(STORAGE_KEYS.PENGELUARAN, this.pengeluaranData);
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }

    // 2. Connect Firestore realtime listener if available
    this.connectFirestore();
  }

  private setOnlineStatus(online: boolean) {
    this.isFirestoreOnline = online;
    this.statusListeners.forEach(cb => cb(online));
  }

  public onStatusChange(callback: (online: boolean) => void) {
    this.statusListeners.push(callback);
    callback(this.isFirestoreOnline);
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  private async connectFirestore() {
    if (!db) {
      this.setOnlineStatus(false);
      return;
    }

    try {
      // Setup santri realtime listener
      const santriCol = collection(db, 'santri');
      onSnapshot(
        santriCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Santri[] = [];
            snapshot.forEach((docSnap) => {
              list.push(sanitizeSantri(docSnap.data(), docSnap.id));
            });
            this.santriData = list;
            saveLocalData(STORAGE_KEYS.SANTRI, list);
            this.notifySantri();
          } else {
            // Seed initial data if remote collection is empty
            this.seedFirestore();
          }
          this.setOnlineStatus(true);
        },
        (error) => {
          console.warn("Firestore snapshot error (using offline sync mode):", error.message);
          this.setOnlineStatus(false);
        }
      );

      // Setup pembayaran realtime listener
      const payCol = collection(db, 'pembayaran');
      onSnapshot(
        payCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Pembayaran[] = [];
            snapshot.forEach((docSnap) => {
              list.push(sanitizePembayaran(docSnap.data(), docSnap.id));
            });
            this.pembayaranData = list;
            saveLocalData(STORAGE_KEYS.PEMBAYARAN, list);
            this.notifyPembayaran();
          }
          this.setOnlineStatus(true);
        },
        () => {
          this.setOnlineStatus(false);
        }
      );

      // Setup pengeluaran realtime listener
      const expCol = collection(db, 'pengeluaran');
      onSnapshot(
        expCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Pengeluaran[] = [];
            snapshot.forEach((docSnap) => {
              list.push(sanitizePengeluaran(docSnap.data(), docSnap.id));
            });
            this.pengeluaranData = list;
            saveLocalData(STORAGE_KEYS.PENGELUARAN, list);
            this.notifyPengeluaran();
          }
          this.setOnlineStatus(true);
        },
        () => {
          this.setOnlineStatus(false);
        }
      );
    } catch (err) {
      console.warn("Could not attach firestore realtime listeners:", err);
      this.setOnlineStatus(false);
    }
  }

  private async seedFirestore() {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      this.santriData.forEach(s => {
        const ref = doc(db!, 'santri', s.id);
        batch.set(ref, s);
      });
      this.pembayaranData.forEach(p => {
        const ref = doc(db!, 'pembayaran', p.id);
        batch.set(ref, p);
      });
      this.pengeluaranData.forEach(e => {
        const ref = doc(db!, 'pengeluaran', e.id);
        batch.set(ref, e);
      });
      await batch.commit();
      this.setOnlineStatus(true);
    } catch (err) {
      console.warn("Firestore seeding notice (using local sync):", err);
    }
  }

  // --- SANTRI OPERATIONS ---
  public subscribeSantri(cb: (data: Santri[]) => void) {
    this.santriSubscribers.push(cb);
    cb(this.santriData);
    return () => {
      this.santriSubscribers = this.santriSubscribers.filter(s => s !== cb);
    };
  }

  private notifySantri() {
    this.santriSubscribers.forEach(cb => cb([...this.santriData]));
  }

  public async addSantri(santri: Omit<Santri, 'id'>): Promise<Santri> {
    const id = 's-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const newSantri = sanitizeSantri({
      ...santri,
      id,
      createdAt: new Date().toISOString()
    }, id);

    this.santriData = [newSantri, ...this.santriData];
    saveLocalData(STORAGE_KEYS.SANTRI, this.santriData);
    this.notifySantri();

    if (db) {
      try {
        await setDoc(doc(db, 'santri', id), newSantri);
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore addSantri sync error:", err);
      }
    }
    return newSantri;
  }

  public async updateSantri(id: string, updates: Partial<Santri>): Promise<void> {
    this.santriData = this.santriData.map(item => 
      item.id === id ? sanitizeSantri({ ...item, ...updates, updatedAt: new Date().toISOString() }, id) : item
    );
    saveLocalData(STORAGE_KEYS.SANTRI, this.santriData);
    this.notifySantri();

    if (db) {
      try {
        await setDoc(doc(db, 'santri', id), updates, { merge: true });
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore updateSantri sync error:", err);
      }
    }
  }

  public async bulkUpdateSantri(updates: { id: string; data: Partial<Santri> }[]): Promise<void> {
    const updateMap = new Map<string, Partial<Santri>>();
    updates.forEach(u => updateMap.set(u.id, u.data));

    this.santriData = this.santriData.map(item => {
      const up = updateMap.get(item.id);
      if (up) {
        return sanitizeSantri({ ...item, ...up, updatedAt: new Date().toISOString() }, item.id);
      }
      return item;
    });

    saveLocalData(STORAGE_KEYS.SANTRI, this.santriData);
    this.notifySantri();

    if (db) {
      try {
        const batch = writeBatch(db);
        updates.forEach(u => {
          batch.set(doc(db!, 'santri', u.id), u.data, { merge: true });
        });
        await batch.commit();
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore bulkUpdateSantri sync error:", err);
      }
    }
  }

  public async deleteSantri(id: string): Promise<void> {
    this.santriData = this.santriData.filter(item => item.id !== id);
    saveLocalData(STORAGE_KEYS.SANTRI, this.santriData);
    this.notifySantri();

    if (db) {
      try {
        await deleteDoc(doc(db, 'santri', id));
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore deleteSantri sync error:", err);
      }
    }
  }

  public async deleteMultipleSantri(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    this.santriData = this.santriData.filter(item => !idSet.has(item.id));
    saveLocalData(STORAGE_KEYS.SANTRI, this.santriData);
    this.notifySantri();

    if (db) {
      try {
        const batch = writeBatch(db);
        ids.forEach(id => {
          batch.delete(doc(db!, 'santri', id));
        });
        await batch.commit();
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore deleteMultipleSantri sync error:", err);
      }
    }
  }

  public async deleteAllSantri(): Promise<void> {
    const prevIds = this.santriData.map(s => s.id);
    this.santriData = [];
    saveLocalData(STORAGE_KEYS.SANTRI, []);
    this.notifySantri();

    if (db && prevIds.length > 0) {
      try {
        const batch = writeBatch(db);
        prevIds.forEach(id => {
          batch.delete(doc(db!, 'santri', id));
        });
        await batch.commit();
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore deleteAllSantri sync error:", err);
      }
    }
  }

  public async bulkAddSantri(items: Omit<Santri, 'id'>[]): Promise<void> {
    const newItems: Santri[] = items.map((item, idx) => {
      const id = 's-' + Date.now().toString(36) + '-' + idx + '-' + Math.random().toString(36).substr(2, 4);
      return sanitizeSantri({
        ...item,
        id,
        createdAt: new Date().toISOString()
      }, id);
    });

    this.santriData = [...newItems, ...this.santriData];
    saveLocalData(STORAGE_KEYS.SANTRI, this.santriData);
    this.notifySantri();

    if (db) {
      try {
        const batch = writeBatch(db);
        newItems.forEach(item => {
          batch.set(doc(db!, 'santri', item.id), item);
        });
        await batch.commit();
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore bulkAddSantri sync error:", err);
      }
    }
  }

  // --- PEMBAYARAN OPERATIONS ---
  public subscribePembayaran(cb: (data: Pembayaran[]) => void) {
    this.pembayaranSubscribers.push(cb);
    cb(this.pembayaranData);
    return () => {
      this.pembayaranSubscribers = this.pembayaranSubscribers.filter(s => s !== cb);
    };
  }

  private notifyPembayaran() {
    this.pembayaranSubscribers.forEach(cb => cb([...this.pembayaranData]));
  }

  public async addPembayaran(pembayaran: Omit<Pembayaran, 'id'>): Promise<Pembayaran> {
    const id = 'pay-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const newRecord = sanitizePembayaran({
      ...pembayaran,
      id,
      createdAt: new Date().toISOString()
    }, id);

    this.pembayaranData = [newRecord, ...this.pembayaranData];
    saveLocalData(STORAGE_KEYS.PEMBAYARAN, this.pembayaranData);
    this.notifyPembayaran();

    if (db) {
      try {
        await setDoc(doc(db, 'pembayaran', id), newRecord);
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore addPembayaran sync error:", err);
      }
    }
    return newRecord;
  }

  public async updatePembayaran(id: string, updates: Partial<Pembayaran>): Promise<void> {
    this.pembayaranData = this.pembayaranData.map(item => 
      item.id === id ? sanitizePembayaran({ ...item, ...updates, updatedAt: new Date().toISOString() }, id) : item
    );
    saveLocalData(STORAGE_KEYS.PEMBAYARAN, this.pembayaranData);
    this.notifyPembayaran();

    if (db) {
      try {
        await setDoc(doc(db, 'pembayaran', id), updates, { merge: true });
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore updatePembayaran sync error:", err);
      }
    }
  }

  public async deletePembayaran(id: string): Promise<void> {
    this.pembayaranData = this.pembayaranData.filter(item => item.id !== id);
    saveLocalData(STORAGE_KEYS.PEMBAYARAN, this.pembayaranData);
    this.notifyPembayaran();

    if (db) {
      try {
        await deleteDoc(doc(db, 'pembayaran', id));
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore deletePembayaran sync error:", err);
      }
    }
  }

  public async deleteMultiplePembayaran(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    this.pembayaranData = this.pembayaranData.filter(item => !idSet.has(item.id));
    saveLocalData(STORAGE_KEYS.PEMBAYARAN, this.pembayaranData);
    this.notifyPembayaran();

    if (db) {
      try {
        const batch = writeBatch(db);
        ids.forEach(id => {
          batch.delete(doc(db!, 'pembayaran', id));
        });
        await batch.commit();
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore deleteMultiplePembayaran sync error:", err);
      }
    }
  }

  public async deleteAllPembayaran(): Promise<void> {
    const prevIds = this.pembayaranData.map(p => p.id);
    this.pembayaranData = [];
    saveLocalData(STORAGE_KEYS.PEMBAYARAN, []);
    this.notifyPembayaran();

    if (db && prevIds.length > 0) {
      try {
        const batch = writeBatch(db);
        prevIds.forEach(id => {
          batch.delete(doc(db!, 'pembayaran', id));
        });
        await batch.commit();
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore deleteAllPembayaran sync error:", err);
      }
    }
  }

  public async bulkAddPembayaran(items: Omit<Pembayaran, 'id'>[]): Promise<void> {
    const newItems: Pembayaran[] = items.map((item, idx) => {
      const id = 'pay-' + Date.now().toString(36) + '-' + idx + '-' + Math.random().toString(36).substr(2, 4);
      return sanitizePembayaran({
        ...item,
        id,
        createdAt: new Date().toISOString()
      }, id);
    });

    this.pembayaranData = [...newItems, ...this.pembayaranData];
    saveLocalData(STORAGE_KEYS.PEMBAYARAN, this.pembayaranData);
    this.notifyPembayaran();

    if (db) {
      try {
        const batch = writeBatch(db);
        newItems.forEach(item => {
          batch.set(doc(db!, 'pembayaran', item.id), item);
        });
        await batch.commit();
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore bulkAddPembayaran sync error:", err);
      }
    }
  }

  // --- PENGELUARAN OPERATIONS ---
  public subscribePengeluaran(cb: (data: Pengeluaran[]) => void) {
    this.pengeluaranSubscribers.push(cb);
    cb(this.pengeluaranData);
    return () => {
      this.pengeluaranSubscribers = this.pengeluaranSubscribers.filter(s => s !== cb);
    };
  }

  private notifyPengeluaran() {
    this.pengeluaranSubscribers.forEach(cb => cb([...this.pengeluaranData]));
  }

  public async addPengeluaran(pengeluaran: Omit<Pengeluaran, 'id'>): Promise<Pengeluaran> {
    const id = 'peng-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const newRecord = sanitizePengeluaran({
      ...pengeluaran,
      id,
      createdAt: new Date().toISOString()
    }, id);

    this.pengeluaranData = [newRecord, ...this.pengeluaranData];
    saveLocalData(STORAGE_KEYS.PENGELUARAN, this.pengeluaranData);
    this.notifyPengeluaran();

    if (db) {
      try {
        await setDoc(doc(db, 'pengeluaran', id), newRecord);
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore addPengeluaran sync error:", err);
      }
    }
    return newRecord;
  }

  public async updatePengeluaran(id: string, updates: Partial<Pengeluaran>): Promise<void> {
    this.pengeluaranData = this.pengeluaranData.map(item => 
      item.id === id ? sanitizePengeluaran({ ...item, ...updates, updatedAt: new Date().toISOString() }, id) : item
    );
    saveLocalData(STORAGE_KEYS.PENGELUARAN, this.pengeluaranData);
    this.notifyPengeluaran();

    if (db) {
      try {
        await setDoc(doc(db, 'pengeluaran', id), updates, { merge: true });
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore updatePengeluaran sync error:", err);
      }
    }
  }

  public async deletePengeluaran(id: string): Promise<void> {
    this.pengeluaranData = this.pengeluaranData.filter(item => item.id !== id);
    saveLocalData(STORAGE_KEYS.PENGELUARAN, this.pengeluaranData);
    this.notifyPengeluaran();

    if (db) {
      try {
        await deleteDoc(doc(db, 'pengeluaran', id));
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore deletePengeluaran sync error:", err);
      }
    }
  }

  public async deleteMultiplePengeluaran(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    this.pengeluaranData = this.pengeluaranData.filter(item => !idSet.has(item.id));
    saveLocalData(STORAGE_KEYS.PENGELUARAN, this.pengeluaranData);
    this.notifyPengeluaran();

    if (db) {
      try {
        const batch = writeBatch(db);
        ids.forEach(id => {
          batch.delete(doc(db!, 'pengeluaran', id));
        });
        await batch.commit();
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore deleteMultiplePengeluaran sync error:", err);
      }
    }
  }

  public async deleteAllPengeluaran(): Promise<void> {
    const prevIds = this.pengeluaranData.map(p => p.id);
    this.pengeluaranData = [];
    saveLocalData(STORAGE_KEYS.PENGELUARAN, []);
    this.notifyPengeluaran();

    if (db && prevIds.length > 0) {
      try {
        const batch = writeBatch(db);
        prevIds.forEach(id => {
          batch.delete(doc(db!, 'pengeluaran', id));
        });
        await batch.commit();
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore deleteAllPengeluaran sync error:", err);
      }
    }
  }

  public async bulkAddPengeluaran(items: Omit<Pengeluaran, 'id'>[]): Promise<void> {
    const newItems: Pengeluaran[] = items.map((item, idx) => {
      const id = 'peng-' + Date.now().toString(36) + '-' + idx + '-' + Math.random().toString(36).substr(2, 4);
      return sanitizePengeluaran({
        ...item,
        id,
        createdAt: new Date().toISOString()
      }, id);
    });

    this.pengeluaranData = [...newItems, ...this.pengeluaranData];
    saveLocalData(STORAGE_KEYS.PENGELUARAN, this.pengeluaranData);
    this.notifyPengeluaran();

    if (db) {
      try {
        const batch = writeBatch(db);
        newItems.forEach(item => {
          batch.set(doc(db!, 'pengeluaran', item.id), item);
        });
        await batch.commit();
        this.setOnlineStatus(true);
      } catch (err) {
        console.warn("Firestore bulkAddPengeluaran sync error:", err);
      }
    }
  }
}

export const syncService = new DataSyncService();
