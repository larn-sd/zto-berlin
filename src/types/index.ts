export type UserRole = 'owner' | 'staff' | 'admin';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  branchName: string;
  avatar?: string;
  phone?: string;
  password?: string;
}

export const isUserAdmin = (user: User | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'owner';
};

export const isUserStaff = (user: User | null | undefined): boolean => {
  if (!user) return false;
  return !isUserAdmin(user);
};

export type ParcelStatus = 
  | 'pending_arrival'    // ສາງໃຫຍ່ສະແກນມາ ແຕ່ຍັງບໍ່ທັນສະແກນເຂົ້າສາຂາ (ຍັງບໍ່ຮອດ)
  | 'in_branch'          // ສະແກນເຂົ້າສາຂາແລ້ວ ລໍຖ້າລູກຄ້າມາເອົາ
  | 'delivered'          // ມອບໃຫ້ລູກຄ້າແລ້ວ (ອອກໃບບິນແລ້ວ)
  | 'unmanifested';      // ສາງໃຫຍ່ລືມສະແກນ (ສາຂາສະແກນເຂົ້າ ແຕ່ບໍ່ມີໃນລາຍການສາງໃຫຍ່)

export interface WarehouseParcel {
  id: string;
  date: string;                  // 1. ວັນທີ (YYYY-MM-DD)
  customerName: string;          // 2. ຊື່ລູກຄ້າ
  customerPhone: string;         // 3. ເບີໂທ
  shippingCode: string;          // 4. ລະຫັດຂົນສົ່ງ (Waybill / Consignment No.)
  parcelCode: string;            // 5. ລະຫັດເຄື່ອງ (Tracking Code / Item Code)
  weightKg?: number;             // 6. ນໍ້າໜັກ (kg)
  customerPrice: number;         // 7. ລາຄາ (ເກັບນໍາລູກຄ້າ ₭)
  warehouseCost: number;         // 8. ຕົ້ນທຶນ (ສາງໃຫຍ່ຕັດ ₭)
  volumeCbm?: number | string;   // 9. ບໍລິມາດ (m³ / cbm) - ເປົ່າຫວ່າງໄດ້
  warehouseCostYuan?: number;    // 10. ຕົ້ນທຶນສະກຸນເງິນຢວນ (¥) - ເປົ່າຫວ່າງໄດ້
  notes?: string;                // 11. ໝາຍເຫດ
  customerAddress?: string;      // ທີ່ຢູ່ລູກຄ້າ / ບ້ານ / ເມືອງ
  destinationBranch?: string;    // ສາຂາປາຍທາງ
  importBatchId?: string;        // ລະຫັດຊຸດການນຳເຂົ້າ
  importedAt: string;            // ເວລານຳເຂົ້າ
  status: ParcelStatus;          // ສະຖານະ
  arrivedAt?: string;            // ເວລາສະແກນເຂົ້າສາຂາ
  arrivedByStaff?: string;       // ພະນັກງານທີ່ສະແກນເຂົ້າ
  deliveredAt?: string;          // ເວລາຈ່າຍເຄື່ອງໃຫ້ລູກຄ້າ
  deliveredByStaff?: string;     // ພະນັກງານທີ່ຈ່າຍເຄື່ອງ
  billId?: string;               // ລະຫັດໃບບິນທີ່ຈ່າຍ
  isUnmanifested?: boolean;      // ສາງໃຫຍ່ລືມສະແກນ (ຮັບເຂົ້າສາຂາຕົວຈິງ ແຕ່ບໍ່ມີໃນໃບບັນຊີສາງໃຫຍ່)
}

export interface ArrivalScanLog {
  id: string;
  scanTime: string;
  scannedCode: string;
  matchedField: 'parcelCode' | 'shippingCode' | 'none';
  parcelId?: string;
  isUnmanifested: boolean;
  staffName: string;
  staffId: string;
}

export type PaymentMethod = 'cash' | 'transfer' | 'debt';

export interface CheckoutBill {
  id: string;                    // ລະຫັດໃບບິນ (eg: INV-20241016-001)
  date: string;                  // ວັນທີອອກໃບບິນ
  timestamp: string;
  customerName: string;
  customerPhone: string;
  parcelIds: string[];           // ລາຍການເຄື່ອງທີ່ມາເອົາ
  parcels: WarehouseParcel[];    // ລາຍລະອຽດເຄື່ອງ
  totalWarehouseCost: number;    // ຕົ້ນທຶນລວມທີ່ສາງໃຫຍ່ຕັດ
  totalCustomerPrice: number;    // ລວມເງິນທີ່ເກັບນໍາລູກຄ້າ
  profit: number;                // ກໍາໄລສາຂາ
  paymentMethod: PaymentMethod;  // ວິທີການຊໍາລະ: ເງິນສົດ / ໂອນ / ຕິດໜີ້ (debt)
  paymentStatus?: 'paid' | 'unpaid'; // ສະຖານະການຊໍາລະ: ຊໍາລະແລ້ວ / ຕິດໜີ້
  paidAt?: string;               // ວັນທີມາຊໍາລະໜີ້ຕົວຈິງ
  paidMethod?: 'cash' | 'transfer'; // ວິທີຊໍາລະຕອນຕັດໜີ້
  paidTransferProofUrl?: string; // ຫຼັກຖານການໂອນຕອນຕັດໜີ້
  cashReceived?: number;         // ຈຳນວນເງິນສົດທີ່ຮັບ
  cashChange?: number;           // ເງິນທອນ
  transferBank?: string;         // ທະນາຄານທີ່ໂອນ (BCEL One, LDB, etc.)
  transferRef?: string;          // ເລກອ້າງອີງການໂອນ
  transferProofUrl?: string;     // ຮູບຫຼັກຖານການໂອນ (Base64) - ປ້ອງກັນພະນັກງານສໍ້ໂກງ
  cashierName: string;           // ຊື່ພະນັກງານອອກບິນ
  cashierId: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  village?: string;
  district?: string;
  province?: string;
  totalParcels: number;
  totalSpent: number;
  lastActive: string;
  notes?: string;
  isVip?: boolean;           // ສະຖານະ VIP (Supabase is_vip)
  vipDiscountPercent?: number;// ສ່ວນຫຼຸດພິເສດສຳລັບ VIP (%)
  address?: string;          // ທີ່ຢູ່ລູກຄ້າ
  nameAliases?: string[];   // ຊື່ທີ່ເຄີຍພົບເຊັ່ນ: ['vnut', 'vinut'] ທີ່ສາງໃຫຍ່ພິມຜິດ
  phoneAliases?: string[];  // ເບີໂທໃນຮູບແບບອື່ນໆ ເຊັ່ນ: ['59977559', '2059977559']
}

export interface FinancialLedgerEntry {
  id: string;
  created_at?: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  created_by?: string;
  reference_id?: string;
}

export type TabKey = 
  | 'dashboard'
  | 'warehouse_inbound'
  | 'parcel_tracking'
  | 'branch_scan'
  | 'discrepancy'
  | 'customer_checkout'
  | 'bills_history'
  | 'customers'
  | 'financial_ledger'
  | 'settings';

export type DisputeStatus = 'pending' | 'investigating' | 'approved' | 'rejected' | 'resolved';

export interface DisputeClaim {
  id: string;
  tracking_number: string;
  customer_name: string;
  status: DisputeStatus;
  notes?: string;
  claim_amount?: number;
  created_at?: string;
}

