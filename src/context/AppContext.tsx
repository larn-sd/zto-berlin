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
    const val = localStorage.getItem
