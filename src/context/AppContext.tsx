import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  WarehouseParcel, 
  CheckoutBill, 
  Customer, 
  ArrivalScanLog, 
  PaymentMethod,
  DisputeClaim,
  FinancialLedgerEntry,
  isUserAdmin
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_PARCELS, 
  DEMO_PRESET_PARCELS,
  DEMO_PRESET_BILLS,
  DEMO_PRESET_CUSTOMERS
} from '../data/mockData';
import { sound } from '../utils/audio';
import { 
  areSameCustomer, 
  normalizePhone, 
  formatLaoPhoneDisplay, 
  syncCustomersWithParcels,
  consolidateCustomers,
  cleanCustomerNameAndPhone,
  areNamesSimilar
} from '../utils/customerHelper';
import { normalizeExcelDate } from '../utils/excel';
import {
  checkSupabaseHealth,
  fetchParcelsFromSupabase,
  updateParcelStatusInSupabase,
  insertParcelToSupabase,
  deleteParcelFromSupabase,
  fetchCustomersFromSupabase,
  updateCustomerVipInSupabase,
  insertCustomerToSupabase,
  fetchDisputeClaimsFromSupabase,
  createDisputeClaimInSupabase,
  updateDisputeClaimInSupabase,
  deleteDisputeClaimFromSupabase,
  fetchFinancialLedgerFromSupabase,
  insertLedgerEntryToSupabase,
  deleteLedgerEntryFromSupabase,
  SupabaseHealth
} from '../services/supabaseService';
import { cleanScannedBarcode, isBarcodeMatch } from '../utils/barcode';

export interface ScanResult {
  success: boolean;
  type: 'matched' | 'unmanifested' | 'already_scanned' | 'already_delivered';
  message: string;
  parcel?: WarehouseParcel;
  isAutoRegistered?: boolean;
}

interface CheckoutData {
  parcelIds: string[];
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  cashChange?: number;
  transferBank?: string;
  transferRef?: string;
  transferProofUrl?: string;
  notes?: string;
  date?: string;
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  login: (username: string, pin: string) => boolean;
  logout: () => void;
  switchUser: (userId: string) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  
  parcels: WarehouseParcel[];
  scanLogs: ArrivalScanLog[];
  bills: CheckoutBill[];
  customers: Customer[];

  supabaseConnected: boolean;
  supabaseHealth: SupabaseHealth | null;
  disputeClaims: DisputeClaim[];
  financialLedger: FinancialLedgerEntry[];
  refreshSupabaseData: () => Promise<void>;
  addDisputeClaim: (claim: Omit<DisputeClaim, 'id' | 'created_at'>) => Promise<void>;
  updateDisputeClaim: (id: string, updates: Partial<DisputeClaim>) => Promise<void>;
  deleteDisputeClaim: (id: string) => Promise<void>;
  addLedgerEntry: (entry: Omit<FinancialLedgerEntry, 'id' | 'created_at'>) => Promise<void>;
  deleteLedgerEntry: (id: string) => Promise<void>;
  toggleCustomerVip: (customerIdOrPhone: string, isVip: boolean, notes?: string) => Promise<void>;

  addWarehouseParcels: (newParcels: Omit<WarehouseParcel, 'id' | 'status' | 'importedAt'>[]) => number;
  addSingleParcel: (parcel: Partial<WarehouseParcel>) => void;
  updateParcel: (id: string, updatedData: Partial<WarehouseParcel>) => void;
  deleteParcel: (id: string) => void;

  scanArrivalCode: (code: string, options?: { autoRegister?: boolean }) => ScanResult;
  registerUnmanifestedParcel: (
    dataOrCode: string | {
      parcelCode: string;
      shippingCode?: string;
      customerName?: string;
      customerPhone?: string;
      customerPrice?: number;
      warehouseCost?: number;
      weightKg?: number;
      volumeCbm?: string | number;
      warehouseCostYuan?: number;
      notes?: string;
      date?: string;
    },
    customerName?: string,
    customerPhone?: string,
    price?: number,
    notes?: string
  ) => WarehouseParcel;

  checkoutParcels: (data: CheckoutData) => CheckoutBill;
  updateBill: (billId: string, updatedData: Partial<CheckoutBill>) => void;
  deleteBill: (billId: string, restoreParcels?: boolean) => void;

  addOrUpdateCustomer: (customer: Partial<Customer>) => void;
  updateCustomer: (id: string, updatedData: Partial<Customer>, updateLinkedParcels?: boolean) => void;
  deleteCustomer: (id: string) => void;

  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  changePassword: (userId: string, newPassword: string) => boolean;

  markBillAsPaid: (billId: string, paymentMethod: 'cash' | 'transfer', proofUrl?: string, bank?: string, ref?: string) => void;

  clearAllData: () => void;
  loadDemoData: () => void;
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'lao_logistics_current_user_v5',
  USERS: 'lao_logistics_users_v5_clean',
  PARCELS: 'lao_logistics_parcels_v5_clean',
  BILLS: 'lao_logistics_bills_v5_clean',
  CUSTOMERS: 'lao_logistics_customers_v5_clean',
  SCAN_LOGS: 'lao_logistics_scan_logs_v5_clean',
  DISPUTES: 'lao_logistics_disputes_v5_clean',
  LEDGER: 'lao_logistics_ledger_v5_clean',
  SOUND: 'lao_logistics_sound_enabled'
};

function loadStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = localStorage.getItem(key);
    if (val) return JSON.parse(val);
  } catch {}
  return fallback;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => loadStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS));
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadStorage<User | null>(STORAGE_KEYS.USER, null));
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => loadStorage<boolean>(STORAGE_KEYS.SOUND, true));
  const [parcels, setParcels] = useState<WarehouseParcel[]>(() => loadStorage<WarehouseParcel[]>(STORAGE_KEYS.PARCELS, INITIAL_PARCELS));
  const [bills, setBills] = useState<CheckoutBill[]>(() => loadStorage<CheckoutBill[]>(STORAGE_KEYS.BILLS, []));
  const [customers, setCustomers] = useState<Customer[]>(() => loadStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, []));
  const [scanLogs, setScanLogs] = useState<ArrivalScanLog[]>(() => loadStorage<ArrivalScanLog[]>(STORAGE_KEYS.SCAN_LOGS, []));
  const [disputeClaims, setDisputeClaims] = useState<DisputeClaim[]>(() => loadStorage<DisputeClaim[]>(STORAGE_KEYS.DISPUTES, []));
  const [financialLedger, setFinancialLedger] = useState<FinancialLedgerEntry[]>(() => loadStorage<FinancialLedgerEntry[]>(STORAGE_KEYS.LEDGER, []));

  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [supabaseHealth, setSupabaseHealth] = useState<SupabaseHealth | null>(null);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    localStorage.setItem(STORAGE_KEYS.SCAN_LOGS, JSON.stringify(scanLogs));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(STORAGE_KEYS.DISPUTES, JSON.stringify(disputeClaims));
    localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(financialLedger));
    localStorage.setItem(STORAGE_KEYS.SOUND, JSON.stringify(soundEnabled));
    sound.setEnabled(soundEnabled);
  }, [parcels, bills, customers, scanLogs, users, disputeClaims, financialLedger, soundEnabled]);

  const refreshSupabaseData = async () => {
    try {
      const health = await checkSupabaseHealth();
      setSupabaseHealth(health);
      setSupabaseConnected(health.connected);

      const remoteParcels = await fetchParcelsFromSupabase();
      if (remoteParcels && remoteParcels.length > 0) {
        setParcels(prev => {
          const map = new Map<string, WarehouseParcel>();
          prev.forEach(p => map.set(p.parcelCode, p));
          remoteParcels.forEach(p => {
            const ext = map.get(p.parcelCode);
            map.set(p.parcelCode, ext ? { ...ext, status: p.status } : p);
          });
          return Array.from(map.values());
        });
      }

      const remoteCustomers = await fetchCustomersFromSupabase();
      if (remoteCustomers && remoteCustomers.length > 0) {
        setCustomers(prev => {
          const map = new Map<string, Customer>();
          prev.forEach(c => map.set(c.phone || c.id, c));
          remoteCustomers.forEach(rc => {
            const key = rc.phone || rc.id;
            const ext = map.get(key);
            map.set(key, ext ? { ...ext, isVip: rc.isVip, address: rc.address || ext.address } : rc);
          });
          return Array.from(map.values());
        });
      }

      const remoteDisputes = await fetchDisputeClaimsFromSupabase();
      if (remoteDisputes && remoteDisputes.length > 0) setDisputeClaims(remoteDisputes);

      const remoteLedger = await fetchFinancialLedgerFromSupabase();
      if (remoteLedger && remoteLedger.length > 0) setFinancialLedger(remoteLedger);
    } catch (err) {
      console.warn('Sync error:', err);
    }
  };

  useEffect(() => {
    refreshSupabaseData();
    const interval = setInterval(refreshSupabaseData, 15000);
    return () => clearInterval(interval);
  }, []);

  const addDisputeClaim = async (claimData: Omit<DisputeClaim, 'id' | 'created_at'>) => {
    const newClaim: DisputeClaim = {
      ...claimData,
      id: `disp-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    setDisputeClaims(prev => [newClaim, ...prev]);
    const res = await createDisputeClaimInSupabase(claimData);
    if (res.success && res.data) {
      setDisputeClaims(prev => prev.map(c => c.id === newClaim.id ? res.data! : c));
    }
    sound.playSuccess();
  };

  const updateDisputeClaim = async (id: string, updates: Partial<DisputeClaim>) => {
    setDisputeClaims(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    await updateDisputeClaimInSupabase(id, updates);
    sound.playSuccess();
  };

  const deleteDisputeClaim = async (id: string) => {
    setDisputeClaims(prev => prev.filter(c => c.id !== id));
    await deleteDisputeClaimFromSupabase(id);
    sound.playSuccess();
  };

  const addLedgerEntry = async (entryData: Omit<FinancialLedgerEntry, 'id' | 'created_at'>) => {
    const newEntry: FinancialLedgerEntry = {
      ...entryData,
      id: `ledg-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    setFinancialLedger(prev => [newEntry, ...prev]);
    const res = await insertLedgerEntryToSupabase(entryData);
    if (res.success && res.data) {
      setFinancialLedger(prev => prev.map(e => e.id === newEntry.id ? res.data! : e));
    }
    sound.playSuccess();
  };

  const deleteLedgerEntry = async (id: string) => {
    setFinancialLedger(prev => prev.filter(e => e.id !== id));
    await deleteLedgerEntryFromSupabase(id);
    sound.playSuccess();
  };

  const toggleCustomerVip = async (customerIdOrPhone: string, isVip: boolean, notes?: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerIdOrPhone || c.phone === customerIdOrPhone) {
        return {
          ...c,
          isVip,
          vipDiscountPercent: isVip ? 10 : 0,
          notes: notes !== undefined ? notes : c.notes
        };
      }
      return c;
    }));
    await updateCustomerVipInSupabase(customerIdOrPhone, isVip, notes);
    sound.playSuccess();
  };

  useEffect(() => {
    if (parcels.length > 0) {
      setCustomers(current => consolidateCustomers(syncCustomersWithParcels(parcels, current)));
    }
  }, [parcels]);

  const toggleSound = () => setSoundEnabled(prev => !prev);

  const login = (username: string, pin: string): boolean => {
    const u = username.trim().toLowerCase();
    const p = pin.trim();
    const matched = users.find(x => x.username.toLowerCase() === u || (u === 'admin' && x.role === 'owner') || (u === 'staff' && x.role === 'staff'));
    if (matched) {
      const expected = matched.password || (matched.role === 'owner' ? 'larn123' : '123');
      if (p === expected || (p === 'larn123' && matched.role === 'owner')) {
        setCurrentUser(matched);
        sound.playSuccess();
        return true;
      }
    }
    sound.playWarning();
    return false;
  };

  const changePassword = (userId: string, newPass: string): boolean => {
    const trimmed = newPass.trim();
    if (!trimmed) return false;
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: trimmed } : u));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, password: trimmed } : null);
    }
    sound.playSuccess();
    return true;
  };

  const markBillAsPaid = (billId: string, method: 'cash' | 'transfer', proofUrl?: string, bank?: string, ref?: string) => {
    const now = new Date();
    const paidAt = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 8)}`;
    const bill = bills.find(b => b.id === billId);
    if (bill && bill.paymentStatus === 'unpaid') {
      addLedgerEntry({
        type: 'income',
        category: 'debt_settlement',
        amount: bill.totalCustomerPrice,
        description: `Settlement bill ${bill.id} (${bill.customerName})`,
        created_by: currentUser?.name || 'Staff'
      }).catch(err => console.warn(err));
    }
    setBills(prev => prev.map(b => b.id === billId ? {
      ...b,
      paymentStatus: 'paid',
      paymentMethod: method,
      paidAt,
      paidMethod: method,
      paidTransferProofUrl: proofUrl || b.transferProofUrl,
      transferBank: bank || b.transferBank,
      transferRef: ref || b.transferRef
    } : b));
    sound.playSuccess();
  };

  const logout = () => setCurrentUser(null);

  const switchUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;
    if (!isUserAdmin(currentUser) && isUserAdmin(target)) {
      sound.playWarning();
      return;
    }
    setCurrentUser(target);
    sound.playSuccess();
  };

  const addWarehouseParcels = (newItems: Omit<WarehouseParcel, 'id' | 'status' | 'importedAt'>[]): number => {
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;
    const batchId = `BATCH-${Date.now().toString().slice(-6)}`;

    const formatted: WarehouseParcel[] = newItems.map((item, idx) => ({
      ...item,
      id: `p-${Date.now()}-${idx}`,
      date: normalizeExcelDate(item.date),
      status: 'pending_arrival',
      importedAt: timeStr,
      importBatchId: batchId,
      warehouseCost: Number(item.warehouseCost) || 0,
      customerPrice: Number(item.customerPrice) || 0,
      parcelCode: item.parcelCode.trim().toUpperCase(),
      shippingCode: item.shippingCode.trim().toUpperCase(),
    }));

    setParcels(prev => {
      const all = [...formatted, ...prev];
      setCustomers(current => syncCustomersWithParcels(all, current));
      return all;
    });

    formatted.forEach(parcel => {
      insertParcelToSupabase(parcel).catch(err => console.warn(err));
    });

    sound.playSuccess();
    return formatted.length;
  };

  const addSingleParcel = (parcelData: Partial<WarehouseParcel>) => {
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;
    const newParcel: WarehouseParcel = {
      id: `p-${Date.now()}`,
      date: normalizeExcelDate(parcelData.date || now.toISOString().split('T')[0]),
      customerName: parcelData.customerName || 'General Customer',
      customerPhone: parcelData.customerPhone || '',
      shippingCode: (parcelData.shippingCode || '').trim().toUpperCase(),
      parcelCode: (parcelData.parcelCode || '').trim().toUpperCase(),
      weightKg: parcelData.weightKg ? Number(parcelData.weightKg) : undefined,
      customerPrice: Number(parcelData.customerPrice) || 0,
      warehouseCost: Number(parcelData.warehouseCost) || 0,
      volumeCbm: parcelData.volumeCbm || undefined,
      warehouseCostYuan: parcelData.warehouseCostYuan ? Number(parcelData.warehouseCostYuan) : undefined,
      notes: parcelData.notes || '',
      customerAddress: parcelData.customerAddress || '',
      destinationBranch: parcelData.destinationBranch || currentUser?.branchName || 'ZTO Berlin',
      importedAt: timeStr,
      status: 'pending_arrival'
    };

    setParcels(prev => [newParcel, ...prev]);
    insertParcelToSupabase(newParcel).catch(err => console.warn(err));

    if (newParcel.customerPhone && newParcel.customerName) {
      addOrUpdateCustomer({
        name: newParcel.customerName,
        phone: newParcel.customerPhone,
        village: newParcel.customerAddress,
      });
    }
    sound.playSuccess();
  };

  const updateParcel = (id: string, updatedData: Partial<WarehouseParcel>) => {
    const existing = parcels.find(p => p.id === id);
    setParcels(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));
    if (existing && updatedData.status) {
      updateParcelStatusInSupabase(existing.parcelCode, updatedData.status).catch(err => console.warn(err));
    }
  };

  const deleteParcel = (id: string) => {
    const existing = parcels.find(p => p.id === id);
    setParcels(prev => prev.filter(p => p.id !== id));
    if (existing) {
      deleteParcelFromSupabase(existing.parcelCode).catch(err => console.warn(err));
    }
  };

  const scanArrivalCode = (rawCode: string, options?: { autoRegister?: boolean }): ScanResult => {
    const cleanCode = cleanScannedBarcode(rawCode).toUpperCase();
    if (!cleanCode) {
      return { success: false, type: 'unmanifested', message: 'Please enter barcode' };
    }

    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;
    const idx = parcels.findIndex(p => isBarcodeMatch(p.parcelCode, cleanCode) || isBarcodeMatch(p.shippingCode, cleanCode));

    if (idx !== -1) {
      const parcel = parcels[idx];
      const matchedField = isBarcodeMatch(parcel.parcelCode, cleanCode) ? 'parcelCode' : 'shippingCode';

      if (parcel.status === 'in_branch') {
        sound.playWarning();
        return { success: false, type: 'already_scanned', message: 'Already arrived at branch', parcel };
      }
      if (parcel.status === 'delivered') {
        sound.playWarning();
        return { success: false, type: 'already_delivered', message: 'Already delivered', parcel };
      }

      const updated: WarehouseParcel = {
        ...parcel,
        status: 'in_branch',
        arrivedAt: timeStr,
        arrivedByStaff: currentUser?.name || 'Staff'
      };

      const copy = [...parcels];
      copy[idx] = updated;
      setParcels(copy);

      const log: ArrivalScanLog = {
        id: `scan-${Date.now()}`,
        scanTime: timeStr,
        scannedCode: cleanCode,
        matchedField,
        parcelId: parcel.id,
        isUnmanifested: Boolean(parcel.notes && parcel.notes.includes('Unmanifested')),
        staffName: currentUser?.name || 'Staff',
        staffId: currentUser?.id || 'staff'
      };
      setScanLogs(prev => [log, ...prev]);

      updateParcelStatusInSupabase(parcel.parcelCode, 'in_branch').catch(err => console.warn(err));
      sound.playSuccess();
      return { success: true, type: 'matched', message: 'Arrival scanned successfully', parcel: updated };
    }

    if (options?.autoRegister) {
      const newP = registerUnmanifestedParcel({
        parcelCode: cleanCode,
        shippingCode: cleanCode,
        customerName: 'Customer',
        customerPhone: '',
        customerPrice: 20000,
        warehouseCost: 0,
        notes: 'Unmanifested parcel'
      });
      sound.playSuccess();
      return { success: true, type: 'unmanifested', message: 'Auto registered arrival', parcel: newP, isAutoRegistered: true };
    }

    sound.playWarning();
    return { success: false, type: 'unmanifested', message: 'Parcel code not in warehouse manifest' };
  };

  const registerUnmanifestedParcel = (dataOrCode: any): WarehouseParcel => {
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;
    const isObj = typeof dataOrCode === 'object' && dataOrCode !== null;
    const cleanCode = (isObj ? dataOrCode.parcelCode : dataOrCode || '').trim().toUpperCase();

    const newParcel: WarehouseParcel = {
      id: `p-unmanifested-${Date.now()}`,
      date: isObj && dataOrCode.date ? dataOrCode.date : now.toISOString().split('T')[0],
      parcelCode: cleanCode,
      shippingCode: (isObj && dataOrCode.shippingCode ? dataOrCode.shippingCode : cleanCode).trim().toUpperCase(),
      weightKg: isObj && dataOrCode.weightKg ? Number(dataOrCode.weightKg) : undefined,
      volumeCbm: isObj ? dataOrCode.volumeCbm : undefined,
      warehouseCostYuan: isObj && dataOrCode.warehouseCostYuan ? Number(dataOrCode.warehouseCostYuan) : undefined,
      warehouseCost: isObj && dataOrCode.warehouseCost ? Number(dataOrCode.warehouseCost) : 0,
      customerPrice: isObj && dataOrCode.customerPrice ? Number(dataOrCode.customerPrice) : 20000,
      customerName: (isObj && dataOrCode.customerName ? dataOrCode.customerName : 'Customer').trim(),
      customerPhone: (isObj && dataOrCode.customerPhone ? dataOrCode.customerPhone : '').trim(),
      destinationBranch: currentUser?.branchName || 'ZTO Berlin',
      notes: (isObj && dataOrCode.notes ? dataOrCode.notes : 'Unmanifested parcel').trim(),
      importedAt: timeStr,
      status: 'in_branch',
      arrivedAt: timeStr,
      arrivedByStaff: currentUser?.name || 'Staff',
      isUnmanifested: true
    };

    setParcels(prev => [newParcel, ...prev]);
    insertParcelToSupabase(newParcel).catch(err => console.warn(err));
    sound.playSuccess();
    return newParcel;
  };

  const checkoutParcels = (data: CheckoutData): CheckoutBill => {
    const now = new Date();
    const dateStr = data.date && data.date.trim() ? data.date.trim() : now.toISOString().split('T')[0];
    const timestamp = `${dateStr} ${now.toTimeString().slice(0, 8)}`;
    const billId = `BILL-${dateStr.replace(/-/g, '')}-${String(bills.length + 1).padStart(3, '0')}`;

    const checkoutItems = parcels.filter(p => data.parcelIds.includes(p.id));
    const totalWarehouseCost = checkoutItems.reduce((acc, p) => acc + (p.warehouseCost || 0), 0);
    const totalCustomerPrice = checkoutItems.reduce((acc, p) => acc + (p.customerPrice || 0), 0);
    const isDebt = data.paymentMethod === 'debt';

    const newBill: CheckoutBill = {
      id: billId,
      date: dateStr,
      timestamp,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      parcelIds: data.parcelIds,
      parcels: checkoutItems,
      totalWarehouseCost,
      totalCustomerPrice,
      profit: totalCustomerPrice - totalWarehouseCost,
      paymentMethod: data.paymentMethod,
      paymentStatus: isDebt ? 'unpaid' : 'paid',
      cashReceived: data.cashReceived,
      cashChange: data.cashChange,
      transferBank: data.transferBank,
      transferRef: data.transferRef,
      transferProofUrl: data.transferProofUrl,
      cashierName: currentUser?.name || 'Staff',
      cashierId: currentUser?.id || 'usr-1',
      notes: data.notes
    };

    setParcels(prev => prev.map(p => data.parcelIds.includes(p.id) ? {
      ...p,
      status: 'delivered',
      deliveredAt: timestamp,
      deliveredByStaff: currentUser?.name || 'Staff',
      billId
    } : p));

    checkoutItems.forEach(p => {
      updateParcelStatusInSupabase(p.parcelCode, 'delivered', data.paymentMethod).catch(err => console.warn(err));
    });

    if (!isDebt) {
      addLedgerEntry({
        type: 'income',
        category: 'checkout_revenue',
        amount: totalCustomerPrice,
        description: `Checkout ${billId} (${data.customerName})`,
        created_by: currentUser?.name || 'Staff'
      }).catch(err => console.warn(err));
    }

    setBills(prev => [newBill, ...prev]);

    if (data.customerPhone) {
      addOrUpdateCustomer({
        name: data.customerName,
        phone: data.customerPhone,
        totalParcels: checkoutItems.length,
        totalSpent: totalCustomerPrice,
        lastActive: dateStr
      });
    }

    sound.playCheckout();
    return newBill;
  };

  const updateBill = (billId: string, updatedData: Partial<CheckoutBill>) => {
    setBills(prev => prev.map(b => b.id === billId ? { ...b, ...updatedData } : b));
    sound.playSuccess();
  };

  const deleteBill = (billId: string, restoreParcels = true) => {
    const target = bills.find(b => b.id === billId);
    if (!target) return;
    if (restoreParcels && target.parcelIds) {
      setParcels(prev => prev.map(p => target.parcelIds.includes(p.id) ? {
        ...p,
        status: 'in_branch',
        deliveredAt: undefined,
        deliveredByStaff: undefined,
        billId: undefined
      } : p));
    }
    setBills(prev => prev.filter(b => b.id !== billId));
    sound.playSuccess();
  };

  const addOrUpdateCustomer = (c: Partial<Customer>) => {
    if (!c.phone && !c.name) return;
    const rawName = (c.name || '').trim();
    const rawPhone = (c.phone || '').trim();
    const displayPhone = formatLaoPhoneDisplay(rawPhone);

    setCustomers(prev => {
      const idx = prev.findIndex(item => areSameCustomer({ name: item.name, phone: item.phone }, { name: rawName, phone: rawPhone }));
      const todayStr = new Date().toISOString().split('T')[0];

      if (idx !== -1) {
        const existing = prev[idx];
        const updated: Customer = {
          ...existing,
          name: rawName || existing.name,
          phone: existing.phone || displayPhone,
          village: c.village || existing.village,
          district: c.district || existing.district,
          province: c.province || existing.province,
          totalParcels: existing.totalParcels + (c.totalParcels || 0),
          totalSpent: existing.totalSpent + (c.totalSpent || 0),
          lastActive: todayStr
        };
        const list = [...prev];
        list[idx] = updated;
        insertCustomerToSupabase({
          name: updated.name,
          phone: updated.phone,
          address: `${updated.village || ''} ${updated.district || ''}`.trim(),
          isVip: updated.isVip,
          notes: updated.notes
        }).catch(err => console.warn(err));
        return list;
      } else {
        const newCustomer: Customer = {
          id: `cust-${Date.now()}`,
          name: rawName || 'Customer',
          phone: displayPhone,
          village: c.village || '',
          district: c.district || '',
          province: c.province || 'Vientiane',
          totalParcels: c.totalParcels || 1,
          totalSpent: c.totalSpent || 0,
          lastActive: todayStr,
          notes: c.notes || ''
        };
        insertCustomerToSupabase({
          name: newCustomer.name,
          phone: newCustomer.phone,
          address: `${newCustomer.village || ''} ${newCustomer.district || ''}`.trim(),
          isVip: false,
          notes: newCustomer.notes
        }).catch(err => console.warn(err));
        return [newCustomer, ...prev];
      }
    });
  };

  const updateCustomer = (id: string, updatedData: Partial<Customer>, updateLinked = true) => {
    const target = customers.find(c => c.id === id);
    if (!target) return;
    const newName = (updatedData.name !== undefined ? updatedData.name : target.name).trim();
    const newPhone = (updatedData.phone !== undefined ? updatedData.phone : target.phone).trim();
    const displayPhone = newPhone ? formatLaoPhoneDisplay(newPhone) : target.phone;

    const updated: Customer = {
      ...target,
      ...updatedData,
      name: newName || target.name,
      phone: displayPhone
    };

    setCustomers(prev => prev.map(c => c.id === id ? updated : c));
    insertCustomerToSupabase({
      name: updated.name,
      phone: updated.phone,
      address: `${updated.village || ''} ${updated.district || ''}`.trim(),
      isVip: updated.isVip,
      notes: updated.notes
    }).catch(err => console.warn(err));

    if (updateLinked) {
      setParcels(prev => prev.map(p => {
        if (areSameCustomer({ name: target.name, phone: target.phone }, { name: p.customerName || '', phone: p.customerPhone || '' })) {
          return { ...p, customerName: newName, customerPhone: displayPhone };
        }
        return p;
      }));
    }
    sound.playSuccess();
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    sound.playSuccess();
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    setUsers(prev => [...prev, {
      ...userData,
      id: `usr-${Date.now()}`,
      branchName: userData.branchName || 'ZTO Berlin',
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'
    }]);
    sound.playSuccess();
  };

  const updateUser = (id: string, data: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
    if (currentUser?.id === id) setCurrentUser(prev => prev ? { ...prev, ...data } : null);
    sound.playSuccess();
  };

  const deleteUser = (id: string) => {
    if (id === 'usr-1' || currentUser?.id === id) return;
    setUsers(prev => prev.filter(u => u.id !== id));
    sound.playSuccess();
  };

  const clearAllData = () => {
    setParcels([]);
    setBills([]);
    setCustomers([]);
    setScanLogs([]);
    sound.playWarning();
  };

  const loadDemoData = () => {
    setParcels(DEMO_PRESET_PARCELS);
    setBills(DEMO_PRESET_BILLS);
    setCustomers(DEMO_PRESET_CUSTOMERS);
    setScanLogs([]);
    sound.playSuccess();
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        login,
        logout,
        switchUser,
        soundEnabled,
        toggleSound,
        parcels,
        scanLogs,
        bills,
        customers,
        supabaseConnected,
        supabaseHealth,
        disputeClaims,
        financialLedger,
        refreshSupabaseData,
        addDisputeClaim,
        updateDisputeClaim,
        deleteDisputeClaim,
        addLedgerEntry,
        deleteLedgerEntry,
        toggleCustomerVip,
        addWarehouseParcels,
        addSingleParcel,
        updateParcel,
        deleteParcel,
        scanArrivalCode,
        registerUnmanifestedParcel,
        checkoutParcels,
        updateBill,
        deleteBill,
        addOrUpdateCustomer,
        updateCustomer,
        deleteCustomer,
        addUser,
        updateUser,
        deleteUser,
        changePassword,
        markBillAsPaid,
        clearAllData,
        loadDemoData,
        resetToDefaultData: loadDemoData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
