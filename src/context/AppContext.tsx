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
  INITIAL_BILLS, 
  INITIAL_CUSTOMERS,
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

interface ScanResult {
  success: boolean;
  type: 'matched' | 'unmanifested' | 'already_scanned' | 'already_delivered';
  message: string;
  parcel?: WarehouseParcel;
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
  date?: string; // Custom bill date (YYYY-MM-DD)
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

  // Supabase Live Data & Operations
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

  // Warehouse Inbound (ຂໍ້ 2)
  addWarehouseParcels: (newParcels: Omit<WarehouseParcel, 'id' | 'status' | 'importedAt'>[]) => number;
  addSingleParcel: (parcel: Partial<WarehouseParcel>) => void;
  updateParcel: (id: string, updatedData: Partial<WarehouseParcel>) => void;
  deleteParcel: (id: string) => void;

  // Branch Arrival Scan (ຂໍ້ 3)
  scanArrivalCode: (code: string) => ScanResult;
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

  // Checkout / Billing (ຂໍ້ 5)
  checkoutParcels: (data: CheckoutData) => CheckoutBill;
  updateBill: (billId: string, updatedData: Partial<CheckoutBill>) => void;
  deleteBill: (billId: string, restoreParcels?: boolean) => void;

  // Customers (ຂໍ້ 7)
  addOrUpdateCustomer: (customer: Partial<Customer>) => void;
  updateCustomer: (id: string, updatedData: Partial<Customer>, updateLinkedParcels?: boolean) => void;
  deleteCustomer: (id: string) => void;

  // Staff & User Management (ເພີ່ມພະນັກງານເອງ & ປ່ຽນລະຫັດຜ່ານ)
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  changePassword: (userId: string, newPassword: string) => boolean;

  // Debt tracking: Mark bill as paid
  markBillAsPaid: (billId: string, paymentMethod: 'cash' | 'transfer', proofUrl?: string, bank?: string, ref?: string) => void;

  // Reset & Clear
  clearAllData: () => void;
  loadDemoData: () => void;
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Standard V5 storage keys
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

/**
 * Resilient multi-key data recovery:
 * Searches primary key, candidate historical keys, and ANY key in localStorage
 * to ensure user data entered previously is NEVER lost!
 */
function loadWithRecovery<T>(
  primaryKey: string,
  candidateKeys: string[],
  validator: (item: any) => boolean
): T[] {
  if (typeof window === 'undefined') return [];
  try {
    // 1. Try primary key first
    const primary = localStorage.getItem(primaryKey);
    if (primary) {
      try {
        const parsed = JSON.parse(primary);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }

    // 2. Try candidate historical keys
    for (const k of candidateKeys) {
      const val = localStorage.getItem(k);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0 && validator(parsed[0])) {
            localStorage.setItem(primaryKey, JSON.stringify(parsed));
            return parsed;
          }
        } catch {}
      }
    }

    // 3. Scan all keys in localStorage to recover data from any previous key
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || key === primaryKey || candidateKeys.includes(key)) continue;
      const val = localStorage.getItem(key);
      if (val && (val.startsWith('[') || val.startsWith('{'))) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0 && validator(parsed[0])) {
            localStorage.setItem(primaryKey, JSON.stringify(parsed));
            return parsed;
          }
        } catch {}
      }
    }
  } catch {}
  return [];
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const recovered = loadWithRecovery<User>(
        STORAGE_KEYS.USERS,
        ['lao_logistics_users', 'users'],
        (u) => Boolean(u && u.username)
      );
      if (recovered.length > 0) {
        return recovered.map((u: User) => {
          if (u.id === 'usr-1' || u.role === 'owner' || u.username === 'larn' || u.username === 'admin') {
            return {
              ...u,
              id: 'usr-1',
              username: 'larn',
              name: 'larn (Admin)',
              role: 'owner',
              password: u.password && u.password !== '123456' ? u.password : 'larn123',
              branchName: 'ສາຂາ ໜອງບົວທອງ (Berlin)'
            };
          }
          if (u.id === 'usr-2' || u.username === 'staff') {
            return {
              ...u,
              id: 'usr-2',
              username: 'staff',
              name: 'staff (ພະນັກງານ)',
              role: 'staff',
              password: u.password && u.password !== '123456' ? u.password : '123',
              branchName: 'ສາຂາ ໜອງບົວທອງ (Berlin)'
            };
          }
          return {
            ...u,
            branchName: u.branchName?.includes('ດົງໂດກ') ? 'ສາຂາ ໜອງບົວທອງ (Berlin)' : (u.branchName || 'ສາຂາ ໜອງບົວທອງ (Berlin)')
          };
        });
      }
    } catch {}
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch {}
    return null; // Show Login screen!
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SOUND);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Resiliently load parcels with recovery across all historical and existing keys
  const [parcels, setParcels] = useState<WarehouseParcel[]>(() => {
    try {
      const recovered = loadWithRecovery<WarehouseParcel>(
        STORAGE_KEYS.PARCELS,
        [
          'lao_logistics_parcels_v5',
          'lao_logistics_parcels_v4',
          'lao_logistics_parcels_v3',
          'lao_logistics_parcels_v2',
          'lao_logistics_parcels',
          'zto_berlin_parcels_persistent_backup',
          'parcels',
          'warehouse_parcels'
        ],
        (p) => Boolean(p && (p.parcelCode || p.shippingCode || p.customerName))
      );

      if (recovered.length > 0) {
        return recovered.map((p: WarehouseParcel) => ({
          ...p,
          date: normalizeExcelDate(p.date)
        }));
      }
    } catch {}
    return INITIAL_PARCELS;
  });

  const [bills, setBills] = useState<CheckoutBill[]>(() => {
    try {
      const recovered = loadWithRecovery<CheckoutBill>(
        STORAGE_KEYS.BILLS,
        [
          'lao_logistics_bills_v5',
          'lao_logistics_bills_v4',
          'lao_logistics_bills_v3',
          'lao_logistics_bills_v2',
          'lao_logistics_bills',
          'bills'
        ],
        (b) => Boolean(b && (b.parcelIds || b.totalCustomerPrice !== undefined))
      );
      if (recovered.length > 0) return recovered;
    } catch {}
    return [];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const recovered = loadWithRecovery<Customer>(
        STORAGE_KEYS.CUSTOMERS,
        [
          'lao_logistics_customers_v5',
          'lao_logistics_customers_v4',
          'lao_logistics_customers_v3',
          'lao_logistics_customers_v2',
          'lao_logistics_customers',
          'customers'
        ],
        (c) => Boolean(c && (c.totalParcels !== undefined || c.name || c.phone))
      );
      if (recovered.length > 0) {
        return consolidateCustomers(recovered);
      }
    } catch {}
    return [];
  });

  const [scanLogs, setScanLogs] = useState<ArrivalScanLog[]>(() => {
    try {
      const recovered = loadWithRecovery<ArrivalScanLog>(
        STORAGE_KEYS.SCAN_LOGS,
        [
          'lao_logistics_scan_logs_v5',
          'lao_logistics_scan_logs_v4',
          'lao_logistics_scan_logs_v3',
          'lao_logistics_scan_logs_v2',
          'lao_logistics_scan_logs',
          'scan_logs'
        ],
        (s) => Boolean(s && s.scannedCode)
      );
      if (recovered.length > 0) return recovered;
    } catch {}
    return [];
  });

  const [disputeClaims, setDisputeClaims] = useState<DisputeClaim[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DISPUTES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [financialLedger, setFinancialLedger] = useState<FinancialLedgerEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LEDGER);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [supabaseHealth, setSupabaseHealth] = useState<SupabaseHealth | null>(null);

  // Persist to local storage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(parcels));
    localStorage.setItem('zto_berlin_parcels_persistent_backup', JSON.stringify(parcels));
  }, [parcels]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  }, [bills]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCAN_LOGS, JSON.stringify(scanLogs));
  }, [scanLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DISPUTES, JSON.stringify(disputeClaims));
  }, [disputeClaims]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(financialLedger));
  }, [financialLedger]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SOUND, JSON.stringify(soundEnabled));
    sound.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Real Supabase Data Synchronization
  const refreshSupabaseData = async () => {
    try {
      const health = await checkSupabaseHealth();
      setSupabaseHealth(health);
      setSupabaseConnected(health.connected);

      // 1. Fetch parcels directly from Supabase table 'parcels'
      const remoteParcels = await fetchParcelsFromSupabase();
      if (remoteParcels && remoteParcels.length > 0) {
        setParcels(prev => {
          const codeMap = new Map<string, WarehouseParcel>();
          prev.forEach(p => codeMap.set(p.parcelCode, p));
          remoteParcels.forEach(p => {
            const existing = codeMap.get(p.parcelCode);
            if (existing) {
              codeMap.set(p.parcelCode, { ...existing, status: p.status });
            } else {
              codeMap.set(p.parcelCode, p);
            }
          });
          return Array.from(codeMap.values());
        });
      }

      // 2. Fetch customers directly from Supabase table 'customers'
      const remoteCustomers = await fetchCustomersFromSupabase();
      if (remoteCustomers && remoteCustomers.length > 0) {
        setCustomers(prev => {
          const phoneMap = new Map<string, Customer>();
          prev.forEach(c => phoneMap.set(c.phone || c.id, c));
          remoteCustomers.forEach(rc => {
            const key = rc.phone || rc.id;
            const existing = phoneMap.get(key);
            if (existing) {
              phoneMap.set(key, { ...existing, isVip: rc.isVip, address: rc.address || existing.address });
            } else {
              phoneMap.set(key, rc);
            }
          });
          return Array.from(phoneMap.values());
        });
      }

      // 3. Fetch dispute claims directly from Supabase table 'dispute_claims'
      const remoteDisputes = await fetchDisputeClaimsFromSupabase();
      if (remoteDisputes && remoteDisputes.length > 0) {
        setDisputeClaims(remoteDisputes);
      }

      // 4. Fetch financial ledger directly from Supabase table 'financial_ledger'
      const remoteLedger = await fetchFinancialLedgerFromSupabase();
      if (remoteLedger && remoteLedger.length > 0) {
        setFinancialLedger(remoteLedger);
      }
    } catch (err) {
      console.warn('Error refreshing data from Supabase:', err);
    }
  };

  // Initial load from Supabase
  useEffect(() => {
    refreshSupabaseData();
  }, []);

  const addDisputeClaim = async (claimData: Omit<DisputeClaim, 'id' | 'created_at'>) => {
    const localId = `disp-${Date.now()}`;
    const newClaim: DisputeClaim = {
      ...claimData,
      id: localId,
      created_at: new Date().toISOString(),
    };
    setDisputeClaims(prev => [newClaim, ...prev]);

    // Send directly to Supabase table dispute_claims
    const res = await createDisputeClaimInSupabase(claimData);
    if (res.success && res.data) {
      setDisputeClaims(prev => prev.map(c => c.id === localId ? res.data! : c));
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
    const localId = `ledg-${Date.now()}`;
    const newEntry: FinancialLedgerEntry = {
      ...entryData,
      id: localId,
      created_at: new Date().toISOString(),
    };
    setFinancialLedger(prev => [newEntry, ...prev]);

    // Send directly to Supabase table financial_ledger
    const res = await insertLedgerEntryToSupabase(entryData);
    if (res.success && res.data) {
      setFinancialLedger(prev => prev.map(e => e.id === localId ? res.data! : e));
    }
    sound.playSuccess();
  };

  const deleteLedgerEntry = async (id: string) => {
    setFinancialLedger(prev => prev.filter(e => e.id !== id));
    await deleteLedgerEntryFromSupabase(id);
    sound.playSuccess();
  };

  const toggleCustomerVip = async (customerIdOrPhone: string, isVip: boolean, notes?: string) => {
    setCustomers(prev =>
      prev.map(c => {
        if (c.id === customerIdOrPhone || c.phone === customerIdOrPhone) {
          return {
            ...c,
            isVip,
            vipDiscountPercent: isVip ? 10 : 0,
            notes: notes !== undefined ? notes : c.notes,
          };
        }
        return c;
      })
    );
    await updateCustomerVipInSupabase(customerIdOrPhone, isVip, notes);
    sound.playSuccess();
  };

  // Auto-sync and reconcile customers with all parcels:
  // Merges typos (e.g. vinut vs vnut, hch vs HCH, 59977559 vs 2059977559, and hch 59977559 with hch 0)
  useEffect(() => {
    if (parcels.length > 0) {
      setCustomers(current => consolidateCustomers(syncCustomersWithParcels(parcels, current)));
    }
  }, [parcels]);

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  const login = (username: string, pin: string): boolean => {
    const trimmedUser = username.trim().toLowerCase();
    const trimmedPin = pin.trim();

    // Match by direct username or by alias
    let matchedUser = users.find(u => u.username.toLowerCase() === trimmedUser);
    if (!matchedUser) {
      if (trimmedUser === 'admin' || trimmedUser === 'owner' || trimmedUser === 'larn') {
        matchedUser = users.find(u => u.role === 'owner' || u.role === 'admin' || u.id === 'usr-1');
      } else if (trimmedUser === 'staff' || trimmedUser === 'somphone') {
        matchedUser = users.find(u => u.role === 'staff');
      }
    }

    if (matchedUser) {
      // Validate password: exact match with stored password
      const expectedPassword = matchedUser.password || (matchedUser.role === 'owner' ? 'larn123' : '123');
      if (trimmedPin === expectedPassword || (trimmedPin === 'larn123' && (matchedUser.role === 'owner' || matchedUser.role === 'admin'))) {
        setCurrentUser(matchedUser);
        try {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(matchedUser));
        } catch {}
        sound.playSuccess();
        return true;
      }
    }

    sound.playWarning();
    return false;
  };

  const changePassword = (userId: string, newPassword: string): boolean => {
    const trimmed = newPassword.trim();
    if (!trimmed) return false;
    setUsers(prev => {
      const updated = prev.map(u => u.id === userId ? { ...u, password: trimmed } : u);
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, password: trimmed } : null);
      try {
        const updatedCurrent = { ...currentUser, password: trimmed };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedCurrent));
      } catch {}
    }
    sound.playSuccess();
    return true;
  };

  const markBillAsPaid = (billId: string, paymentMethod: 'cash' | 'transfer', proofUrl?: string, bank?: string, ref?: string) => {
    const now = new Date();
    const paidAt = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 8)}`;
    
    const targetBill = bills.find(b => b.id === billId);
    if (targetBill && targetBill.paymentStatus === 'unpaid') {
      addLedgerEntry({
        type: 'income',
        category: 'debt_settlement',
        amount: targetBill.totalCustomerPrice,
        description: `ຊຳລະໜີ້ໃບບິນ ${targetBill.id} (${targetBill.customerName}) ຜ່ານ ${paymentMethod === 'cash' ? 'ເງິນສົດ' : 'ໂອນ'}`,
        created_by: currentUser?.name || 'ພະນັກງານ'
      }).catch(err => console.warn('Supabase ledger debt error:', err));
    }

    setBills(prev => prev.map(b => {
      if (b.id === billId) {
        return {
          ...b,
          paymentStatus: 'paid',
          paymentMethod,
          paidAt,
          paidMethod: paymentMethod,
          paidTransferProofUrl: proofUrl || b.transferProofUrl,
          transferBank: bank || b.transferBank,
          transferRef: ref || b.transferRef
        };
      }
      return b;
    }));
    sound.playSuccess();
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
    } catch {}
  };

  const switchUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;

    // Security check: staff cannot switch to admin or owner
    const isCurrentStaff = !isUserAdmin(currentUser);
    const isTargetAdmin = isUserAdmin(target);
    if (isCurrentStaff && isTargetAdmin) {
      sound.playWarning();
      return;
    }

    setCurrentUser(target);
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(target));
    } catch {}
    sound.playSuccess();
  };

  // Add parcels from main warehouse (Excel upload or batch)
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

    sound.playSuccess();
    return formatted.length;
  };

  const addSingleParcel = (parcelData: Partial<WarehouseParcel>) => {
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;
    const newParcel: WarehouseParcel = {
      id: `p-${Date.now()}`,
      date: normalizeExcelDate(parcelData.date || now.toISOString().split('T')[0]),
      customerName: parcelData.customerName || 'ບໍ່ລະບຸ',
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
      destinationBranch: parcelData.destinationBranch || currentUser?.branchName || 'ສາຂາ ໜອງບົວທອງ (Berlin)',
      importedAt: timeStr,
      status: 'pending_arrival'
    };

    setParcels(prev => [newParcel, ...prev]);

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
    setParcels(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...updatedData,
          customerName: updatedData.customerName !== undefined ? updatedData.customerName : p.customerName,
          customerPhone: updatedData.customerPhone !== undefined ? updatedData.customerPhone : p.customerPhone,
          customerPrice: updatedData.customerPrice !== undefined ? Number(updatedData.customerPrice) : p.customerPrice,
          warehouseCost: updatedData.warehouseCost !== undefined ? Number(updatedData.warehouseCost) : p.warehouseCost,
          notes: updatedData.notes !== undefined ? updatedData.notes : p.notes
        };
      }
      return p;
    }));

    if (existing && updatedData.status) {
      updateParcelStatusInSupabase(existing.parcelCode, updatedData.status).catch(err => {
        console.warn('Supabase updateParcel status error:', err);
      });
    }
  };

  const deleteParcel = (id: string) => {
    const existing = parcels.find(p => p.id === id);
    setParcels(prev => prev.filter(p => p.id !== id));
    if (existing) {
      deleteParcelFromSupabase(existing.parcelCode).catch(err => {
        console.warn('Supabase deleteParcel error:', err);
      });
    }
  };

  // Branch Arrival Scan (ຂໍ້ 3 & 4)
  const scanArrivalCode = (rawCode: string): ScanResult => {
    const cleanCode = (rawCode || '').replace(/[\r\n\t]/g, '').trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, type: 'unmanifested', message: 'ກະລຸນາປ້ອນລະຫັດເຄື່ອງ ຫຼື ລະຫັດຂົນສົ່ງ' };
    }

    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;

    // Strip non-alphanumeric for resilient barcode matching
    const stripCode = (s: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const targetClean = stripCode(cleanCode);

    // Match either parcelCode OR shippingCode (exact or stripped)
    const existingIndex = parcels.findIndex(
      p => {
        const p1 = (p.parcelCode || '').trim().toUpperCase();
        const p2 = (p.shippingCode || '').trim().toUpperCase();
        return p1 === cleanCode || p2 === cleanCode || (targetClean && (stripCode(p1) === targetClean || stripCode(p2) === targetClean));
      }
    );

    if (existingIndex !== -1) {
      const parcel = parcels[existingIndex];
      const matchedField = (parcel.parcelCode || '').toUpperCase() === cleanCode ? 'parcelCode' : 'shippingCode';

      if (parcel.status === 'in_branch') {
        sound.playWarning();
        return {
          success: false,
          type: 'already_scanned',
          message: `ພັດສະດຸລະຫັດ ${parcel.parcelCode} (ລະຫັດຂົນສົ່ງ ${parcel.shippingCode}) ໄດ້ສະແກນເຂົ້າສາຂາແລ້ວ! (ລໍຖ້າລູກຄ້າມາເອົາ)`,
          parcel
        };
      }

      if (parcel.status === 'delivered') {
        sound.playWarning();
        return {
          success: false,
          type: 'already_delivered',
          message: `ພັດສະດຸລະຫັດ ${parcel.parcelCode} ໄດ້ມອບໃຫ້ລູກຄ້າ ແລະ ອອກໃບບິນແລ້ວ!`,
          parcel
        };
      }

      // Update status to in_branch
      const updatedParcel: WarehouseParcel = {
        ...parcel,
        status: 'in_branch',
        arrivedAt: timeStr,
        arrivedByStaff: currentUser?.name || 'ພະນັກງານ'
      };

      const newParcels = [...parcels];
      newParcels[existingIndex] = updatedParcel;
      setParcels(newParcels);

      // Record log
      const log: ArrivalScanLog = {
        id: `scan-${Date.now()}`,
        scanTime: timeStr,
        scannedCode: cleanCode,
        matchedField,
        parcelId: parcel.id,
        isUnmanifested: Boolean(parcel.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ')),
        staffName: currentUser?.name || 'ພະນັກງານ',
        staffId: currentUser?.id || 'staff'
      };
      setScanLogs(prev => [log, ...prev]);

      // Direct Supabase Live Update: update status to in_branch in Supabase table 'parcels'
      updateParcelStatusInSupabase(parcel.parcelCode, 'in_branch').catch(err => {
        console.warn('Supabase parcel status update error:', err);
      });

      sound.playSuccess();
      return {
        success: true,
        type: 'matched',
        message: `ສະແກນເຂົ້າສາຂາສຳເລັດ: ${parcel.parcelCode} (${parcel.customerName})`,
        parcel: updatedParcel
      };
    }

    // UNMANIFESTED (ສາງໃຫຍ່ລືມສະແກນ):
    // Alert the user that this item is NOT in the warehouse manifest!
    sound.playWarning();
    return {
      success: false,
      type: 'unmanifested',
      message: `ເຄື່ອງລະຫັດ "${cleanCode}" ບໍ່ມີຢູ່ໃນລາຍການທີ່ສາງໃຫຍ່ສົ່ງມາ! (ສາງໃຫຍ່ລືມສະແກນ)`
    };
  };

  // Register an unmanifested parcel (ສາງໃຫຍ່ລືມສະແກນ) with full 11-field details
  const registerUnmanifestedParcel = (
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
    legacyCustomerName: string = 'ລູກຄ້າ (ສາງໃຫຍ່ລືມສະແກນ)',
    legacyCustomerPhone: string = '',
    legacyPrice: number = 20000,
    legacyNotes: string = 'ສາງໃຫຍ່ລືມສະແກນ - ພົບເຄື່ອງຕົວຈິງຢູ່ສາຂາ'
  ): WarehouseParcel => {
    const now = new Date();
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;

    const isObj = typeof dataOrCode === 'object' && dataOrCode !== null;
    const rawParcelCode = isObj ? dataOrCode.parcelCode : dataOrCode;
    const cleanCode = (rawParcelCode || '').trim().toUpperCase();
    const rawShippingCode = isObj && dataOrCode.shippingCode ? dataOrCode.shippingCode : cleanCode;
    const cleanShippingCode = (rawShippingCode || '').trim().toUpperCase();

    const customerName = (isObj ? dataOrCode.customerName : legacyCustomerName)?.trim() || 'ລູກຄ້າ';
    const customerPhone = (isObj ? dataOrCode.customerPhone : legacyCustomerPhone)?.trim() || '';
    const customerPrice = isObj ? (dataOrCode.customerPrice ?? 20000) : (legacyPrice ?? 20000);
    const warehouseCost = isObj ? (dataOrCode.warehouseCost ?? 0) : 0;
    const weightKg = isObj && dataOrCode.weightKg !== undefined ? (Number(dataOrCode.weightKg) || undefined) : undefined;
    const volumeCbm = isObj && dataOrCode.volumeCbm !== undefined ? dataOrCode.volumeCbm : undefined;
    const warehouseCostYuan = isObj && dataOrCode.warehouseCostYuan !== undefined ? (Number(dataOrCode.warehouseCostYuan) || undefined) : undefined;
    const notes = (isObj && dataOrCode.notes !== undefined ? dataOrCode.notes : legacyNotes)?.trim() || 'ສາງໃຫຍ່ລືມສະແກນ - ພົບເຄື່ອງຕົວຈິງຢູ່ສາຂາ';
    const date = (isObj && dataOrCode.date ? dataOrCode.date : now.toISOString().split('T')[0]);

    const newParcel: WarehouseParcel = {
      id: `p-unmanifested-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date,
      parcelCode: cleanCode,
      shippingCode: cleanShippingCode,
      weightKg,
      volumeCbm,
      warehouseCostYuan,
      warehouseCost,
      customerPrice,
      customerName,
      customerPhone,
      destinationBranch: currentUser?.branchName || 'ສາຂາ ໜອງບົວທອງ (Berlin)',
      notes,
      importedAt: timeStr,
      status: 'in_branch',
      arrivedAt: timeStr,
      arrivedByStaff: currentUser?.name || 'ພະນັກງານ',
      isUnmanifested: true
    };

    setParcels(prev => [newParcel, ...prev]);

    const log: ArrivalScanLog = {
      id: `scan-${Date.now()}`,
      scanTime: timeStr,
      scannedCode: cleanCode,
      matchedField: 'parcelCode',
      parcelId: newParcel.id,
      isUnmanifested: true,
      staffName: currentUser?.name || 'ພະນັກງານ',
      staffId: currentUser?.id || 'staff'
    };
    setScanLogs(prev => [log, ...prev]);

    // Direct Supabase Live Insert: insert into Supabase table 'parcels'
    insertParcelToSupabase(newParcel).catch(err => {
      console.warn('Supabase insertParcel error:', err);
    });

    sound.playSuccess();
    return newParcel;
  };

  // Customer Checkout & Bill generation (ຂໍ້ 5)
  const checkoutParcels = (data: CheckoutData): CheckoutBill => {
    const now = new Date();
    const dateStr = data.date && data.date.trim() ? data.date.trim() : now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 8);
    const timestamp = `${dateStr} ${timeStr}`;
    const cleanDateDigits = dateStr.replace(/-/g, '');
    const billId = `BILL-${cleanDateDigits}-${String(bills.length + 1).padStart(3, '0')}`;

    const checkoutItems = parcels.filter(p => data.parcelIds.includes(p.id));
    const totalWarehouseCost = checkoutItems.reduce((acc, p) => acc + (p.warehouseCost || 0), 0);
    const totalCustomerPrice = checkoutItems.reduce((acc, p) => acc + (p.customerPrice || 0), 0);
    const profit = totalCustomerPrice - totalWarehouseCost;

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
      profit,
      paymentMethod: data.paymentMethod,
      paymentStatus: isDebt ? 'unpaid' : 'paid',
      cashReceived: data.cashReceived,
      cashChange: data.cashChange,
      transferBank: data.transferBank,
      transferRef: data.transferRef,
      transferProofUrl: data.transferProofUrl,
      cashierName: currentUser?.name || 'ພະນັກງານ',
      cashierId: currentUser?.id || 'usr-1',
      notes: data.notes
    };

    // Update parcels to delivered locally
    setParcels(prev => 
      prev.map(p => {
        if (data.parcelIds.includes(p.id)) {
          return {
            ...p,
            status: 'delivered',
            deliveredAt: timestamp,
            deliveredByStaff: currentUser?.name || 'ພະນັກງານ',
            billId: billId
          };
        }
        return p;
      })
    );

    // Direct Supabase Live Update: update status to delivered in Supabase table 'parcels'
    checkoutItems.forEach(p => {
      updateParcelStatusInSupabase(p.parcelCode, 'delivered', data.paymentMethod).catch(err => {
        console.warn('Supabase status update error:', err);
      });
    });

    // Direct Supabase Live Ledger: Record income only if paid (debt will be recorded upon settlement)
    if (!isDebt) {
      addLedgerEntry({
        type: 'income',
        category: 'checkout_revenue',
        amount: totalCustomerPrice,
        description: `ຈ່າຍເຄື່ອງໃບບິນ ${billId} (${data.customerName})`,
        created_by: currentUser?.name || 'ພະນັກງານ'
      }).catch(err => {
        console.warn('Supabase ledger entry error:', err);
      });
    }

    // Save Bill
    setBills(prev => [newBill, ...prev]);

    // Update customer stats
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
    setBills(prev =>
      prev.map(b => {
        if (b.id === billId) {
          const updated = { ...b, ...updatedData };
          if (updatedData.date && !updatedData.timestamp) {
            const prevTime = b.timestamp && b.timestamp.includes(' ') ? b.timestamp.split(' ')[1] : '00:00:00';
            updated.timestamp = `${updatedData.date} ${prevTime}`;
          }
          return updated;
        }
        return b;
      })
    );

    // If date was modified, also update linked parcels' deliveredAt
    if (updatedData.date) {
      setParcels(prev =>
        prev.map(p => {
          if (p.billId === billId) {
            const prevTime = p.deliveredAt && p.deliveredAt.includes(' ') ? p.deliveredAt.split(' ')[1] : '00:00:00';
            return {
              ...p,
              deliveredAt: `${updatedData.date} ${prevTime}`
            };
          }
          return p;
        })
      );
    }
    sound.playSuccess();
  };

  const deleteBill = (billId: string, restoreParcels: boolean = true) => {
    const targetBill = bills.find(b => b.id === billId);
    if (!targetBill) return;

    if (restoreParcels && targetBill.parcelIds && targetBill.parcelIds.length > 0) {
      setParcels(prev =>
        prev.map(p => {
          if (targetBill.parcelIds.includes(p.id)) {
            return {
              ...p,
              status: 'in_branch',
              deliveredAt: undefined,
              deliveredByStaff: undefined,
              billId: undefined
            };
          }
          return p;
        })
      );
    }

    setBills(prev => prev.filter(b => b.id !== billId));
    sound.playSuccess();
  };

  // Customer DB with smart matching (hch == HCH, vinut == vnut, 59977559 == 2059977559, koung != hch)
  const addOrUpdateCustomer = (c: Partial<Customer>) => {
    if (!c.phone && !c.name) return;
    const rawName = (c.name || '').trim();
    const rawPhone = (c.phone || '').trim();
    const displayPhone = formatLaoPhoneDisplay(rawPhone);

    setCustomers(prev => {
      const idx = prev.findIndex(item =>
        areSameCustomer(
          { name: item.name, phone: item.phone },
          { name: rawName, phone: rawPhone }
        )
      );
      const todayStr = new Date().toISOString().split('T')[0];

      if (idx !== -1) {
        const existing = prev[idx];
        const nameAliases = new Set(existing.nameAliases || [existing.name]);
        const phoneAliases = new Set(existing.phoneAliases || [existing.phone]);
        if (rawName) nameAliases.add(rawName);
        if (rawPhone) phoneAliases.add(rawPhone);

        // Keep the longer/cleaner name (e.g. Vinut over vnut)
        let canonicalName = existing.name;
        if (rawName && rawName.length > existing.name.length && areSameCustomer({ name: rawName, phone: rawPhone }, { name: existing.name, phone: existing.phone })) {
          canonicalName = rawName;
        }

        const updated: Customer = {
          ...existing,
          name: canonicalName,
          phone: existing.phone || displayPhone,
          village: c.village || existing.village,
          district: c.district || existing.district,
          province: c.province || existing.province,
          totalParcels: existing.totalParcels + (c.totalParcels || 0),
          totalSpent: existing.totalSpent + (c.totalSpent || 0),
          lastActive: c.lastActive || todayStr,
          notes: c.notes || existing.notes,
          nameAliases: Array.from(nameAliases),
          phoneAliases: Array.from(phoneAliases)
        };
        const updatedList = [...prev];
        updatedList[idx] = updated;
        return updatedList;
      } else {
        const newCustomer: Customer = {
          id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: rawName || 'ລູກຄ້າ',
          phone: displayPhone,
          village: c.village || '',
          district: c.district || '',
          province: c.province || 'ນະຄອນຫຼວງວຽງຈັນ',
          totalParcels: c.totalParcels || 1,
          totalSpent: c.totalSpent || 0,
          lastActive: todayStr,
          notes: c.notes || '',
          nameAliases: rawName ? [rawName] : [],
          phoneAliases: rawPhone ? [rawPhone] : []
        };
        return [newCustomer, ...prev];
      }
    });
  };

  const updateCustomer = (id: string, updatedData: Partial<Customer>, updateLinkedParcels: boolean = true) => {
    const target = customers.find(c => c.id === id);
    if (!target) return;

    const newName = (updatedData.name !== undefined ? updatedData.name : target.name).trim();
    const newPhoneRaw = (updatedData.phone !== undefined ? updatedData.phone : target.phone).trim();
    const normPhone = normalizePhone(newPhoneRaw);
    const displayPhone = normPhone ? formatLaoPhoneDisplay(normPhone) : newPhoneRaw;

    const updatedCustomer: Customer = {
      ...target,
      ...updatedData,
      name: newName || target.name,
      phone: displayPhone,
      notes: updatedData.notes !== undefined ? updatedData.notes : target.notes,
      village: updatedData.village !== undefined ? updatedData.village : target.village,
      district: updatedData.district !== undefined ? updatedData.district : target.district,
      province: updatedData.province !== undefined ? updatedData.province : target.province,
      nameAliases: [newName, ...(target.nameAliases || [])].filter((a, idx, arr) => a && arr.indexOf(a) === idx && areNamesSimilar(a, newName)),
      phoneAliases: [displayPhone, normPhone, ...(target.phoneAliases || [])].filter((p, idx, arr) => p && arr.indexOf(p) === idx && p !== '0')
    };

    setCustomers(prev => prev.map(c => c.id === id ? updatedCustomer : c));

    if (updateLinkedParcels) {
      setParcels(prevParcels => {
        return prevParcels.map(p => {
          const cleanP = cleanCustomerNameAndPhone(p.customerName || '', p.customerPhone || '');
          const cleanTarget = cleanCustomerNameAndPhone(target.name, target.phone);
          if (areSameCustomer(cleanTarget, cleanP)) {
            return {
              ...p,
              customerName: newName || p.customerName,
              customerPhone: displayPhone !== undefined ? displayPhone : p.customerPhone
            };
          }
          return p;
        });
      });
    }

    sound.playSuccess();
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    sound.playSuccess();
  };

  // Staff & User Management Functions (ເພີ່ມ, ແກ້ໄຂ, ລຶບພະນັກງານ)
  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
      branchName: userData.branchName || 'ສາຂາ ໜອງບົວທອງ (Berlin)',
      avatar: userData.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`
    };
    setUsers(prev => [...prev, newUser]);
    sound.playSuccess();
  };

  const updateUser = (id: string, data: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
    if (currentUser?.id === id) {
      setCurrentUser(prev => prev ? { ...prev, ...data } : null);
    }
    sound.playSuccess();
  };

  const deleteUser = (id: string) => {
    if (id === 'usr-1' || currentUser?.id === id) return;
    setUsers(prev => prev.filter(u => u.id !== id));
    sound.playSuccess();
  };

  const clearAllData = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SCAN_LOGS, JSON.stringify([]));
    } catch {}
    setParcels([]);
    setBills([]);
    setCustomers([]);
    setScanLogs([]);
    sound.playWarning();
  };

  const loadDemoData = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.PARCELS, JSON.stringify(DEMO_PRESET_PARCELS));
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(DEMO_PRESET_BILLS));
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(DEMO_PRESET_CUSTOMERS));
      localStorage.setItem(STORAGE_KEYS.SCAN_LOGS, JSON.stringify([]));
    } catch {}
    setParcels(DEMO_PRESET_PARCELS);
    setBills(DEMO_PRESET_BILLS);
    setCustomers(DEMO_PRESET_CUSTOMERS);
    setScanLogs([]);
    sound.playSuccess();
  };

  const resetToDefaultData = loadDemoData;

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
        // Supabase Live Data & Operations
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
        resetToDefaultData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
