import { User, WarehouseParcel, CheckoutBill, Customer } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    username: 'larn',
    name: 'larn (Admin)',
    role: 'owner',
    branchName: 'ສາຂາ ໜອງບົວທອງ (Berlin)',
    phone: '020 55123456',
    password: 'larn123',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
  },
  {
    id: 'usr-2',
    username: 'staff',
    name: 'staff (ພະນັກງານ)',
    role: 'staff',
    branchName: 'ສາຂາ ໜອງບົວທອງ (Berlin)',
    phone: '020 99876543',
    password: '123',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
  }
];

export const SAMPLE_TRANSFER_SLIP = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&auto=format&fit=crop&q=80';

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];

// Default initial parcels sent from central warehouse
export const INITIAL_PARCELS: WarehouseParcel[] = [
  {
    id: 'p-101',
    date: today,
    parcelCode: 'PKG-771001',
    shippingCode: 'EXP-LA-1001',
    warehouseCost: 15000,
    customerPrice: 25000,
    customerName: 'ນາງ ມາລີ ສີປະເສີດ',
    customerPhone: '02055112233',
    customerAddress: 'ບ້ານ ໜອງບົວທອງ, ສີໂຄດຕະບອງ, ນະຄອນຫຼວງ',
    destinationBranch: 'ສາຂາ ໜອງບົວທອງ (Berlin)',
    weightKg: 1.2,
    notes: 'ເຄື່ອງເສື້ອຜ້າແຟຊັນ',
    importedAt: `${today} 08:30`,
    status: 'in_branch',
    arrivedAt: `${today} 10:15`,
    arrivedByStaff: 'ທ້າວ ສົມພອນ ແກ້ວມະນີ'
  },
  {
    id: 'p-102',
    date: today,
    parcelCode: 'PKG-771002',
    shippingCode: 'EXP-LA-1002',
    warehouseCost: 20000,
    customerPrice: 35000,
    customerName: 'ນາງ ມາລີ ສີປະເສີດ',
    customerPhone: '02055112233',
    customerAddress: 'ບ້ານ ໜອງບົວທອງ, ສີໂຄດຕະບອງ, ນະຄອນຫຼວງ',
    destinationBranch: 'ສາຂາ ໜອງບົວທອງ (Berlin)',
    weightKg: 2.5,
    notes: 'ເຄື່ອງສຳອາງ',
    importedAt: `${today} 08:30`,
    status: 'in_branch',
    arrivedAt: `${today} 10:16`,
    arrivedByStaff: 'ທ້າວ ສົມພອນ ແກ້ວມະນີ'
  },
  {
    id: 'p-105',
    date: today,
    parcelCode: 'PKG-771005',
    shippingCode: 'EXP-LA-1005',
    warehouseCost: 18000,
    customerPrice: 30000,
    customerName: 'ນາງ ປານີ ສຸວັນດີ',
    customerPhone: '02055889900',
    customerAddress: 'ບ້ານ ສີໄຄ, ສີໂຄດຕະບອງ',
    destinationBranch: 'ສາຂາ ໜອງບົວທອງ (Berlin)',
    weightKg: 1.5,
    notes: 'ຍັງບໍ່ຮອດສາຂາ',
    importedAt: `${today} 08:30`,
    status: 'pending_arrival'
  },
  {
    id: 'p-77130542000249',
    date: today,
    parcelCode: '77130542000249',
    shippingCode: '77130542000249',
    warehouseCost: 15000,
    customerPrice: 25000,
    customerName: 'tom',
    customerPhone: '58381951',
    customerAddress: '万象市占武里县BERLIN公司',
    destinationBranch: 'ສາຂາ ໜອງບົວທອງ (Berlin)',
    weightKg: 0.6,
    notes: 'ເກີບ / 鞋 (WX91 BERLIN)',
    importedAt: `${today} 09:00`,
    status: 'pending_arrival'
  }
];

export const INITIAL_BILLS: CheckoutBill[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];

export const DEMO_PRESET_PARCELS: WarehouseParcel[] = [
  {
    id: 'p-101',
    date: today,
    parcelCode: 'PKG-771001',
    shippingCode: 'EXP-LA-1001',
    warehouseCost: 15000,
    customerPrice: 25000,
    customerName: 'ນາງ ມາລີ ສີປະເສີດ',
    customerPhone: '02055112233',
    customerAddress: 'ບ້ານ ໜອງບົວທອງ, ສີໂຄດຕະບອງ, ນະຄອນຫຼວງ',
    destinationBranch: 'ສາຂາ ໜອງບົວທອງ (Berlin)',
    weightKg: 1.2,
    notes: 'ເຄື່ອງເສື້ອຜ້າແຟຊັນ',
    importedAt: `${today} 08:30`,
    status: 'in_branch',
    arrivedAt: `${today} 10:15`,
    arrivedByStaff: 'ທ້າວ ສົມພອນ ແກ້ວມະນີ'
  },
  {
    id: 'p-102',
    date: today,
    parcelCode: 'PKG-771002',
    shippingCode: 'EXP-LA-1002',
    warehouseCost: 20000,
    customerPrice: 35000,
    customerName: 'ນາງ ມາລີ ສີປະເສີດ',
    customerPhone: '02055112233',
    customerAddress: 'ບ້ານ ໜອງບົວທອງ, ສີໂຄດຕະບອງ, ນະຄອນຫຼວງ',
    destinationBranch: 'ສາຂາ ໜອງບົວທອງ (Berlin)',
    weightKg: 2.5,
    notes: 'ເຄື່ອງສຳອາງ',
    importedAt: `${today} 08:30`,
    status: 'in_branch',
    arrivedAt: `${today} 10:16`,
    arrivedByStaff: 'ທ້າວ ສົມພອນ ແກ້ວມະນີ'
  },
  {
    id: 'p-105',
    date: today,
    parcelCode: 'PKG-771005',
    shippingCode: 'EXP-LA-1005',
    warehouseCost: 18000,
    customerPrice: 30000,
    customerName: 'ນາງ ປານີ ສຸວັນດີ',
    customerPhone: '02055889900',
    customerAddress: 'ບ້ານ ສີໄຄ, ສີໂຄດຕະບອງ',
    destinationBranch: 'ສາຂາ ໜອງບົວທອງ (Berlin)',
    weightKg: 1.5,
    notes: 'ຍັງບໍ່ຮອດສາຂາ',
    importedAt: `${today} 08:30`,
    status: 'pending_arrival'
  }
];

export const DEMO_PRESET_BILLS: CheckoutBill[] = [
  {
    id: 'BILL-20261017-001',
    date: '2026-10-17',
    timestamp: '2026-10-17 11:30:20',
    customerName: 'ທ້າວ ບຸນມີ ພົມມະວົງ',
    customerPhone: '02055667788',
    parcelIds: ['p-102'],
    parcels: [DEMO_PRESET_PARCELS[1]],
    totalWarehouseCost: 20000,
    totalCustomerPrice: 35000,
    profit: 15000,
    paymentMethod: 'cash',
    cashReceived: 40000,
    cashChange: 5000,
    cashierName: 'ທ້າວ ສົມພອນ ແກ້ວມະນີ',
    cashierId: 'usr-2',
    notes: 'ຈ່າຍເງິນສົດໜ້າຮ້ານ'
  },
  {
    id: 'BILL-20261017-002',
    date: '2026-10-17',
    timestamp: '2026-10-17 15:45:10',
    customerName: 'ນາງ ວິໄລວອນ ຈັນທະລາ',
    customerPhone: '02099334455',
    parcelIds: ['p-101', 'p-103'],
    parcels: [
      DEMO_PRESET_PARCELS[0],
      {
        id: 'p-103',
        date: '2026-10-17',
        parcelCode: 'PKG-771003',
        shippingCode: 'EXP-LA-1003',
        warehouseCost: 15000,
        customerPrice: 25000,
        customerName: 'ນາງ ວິໄລວອນ ຈັນທະລາ',
        customerPhone: '02099334455',
        destinationBranch: 'ສາຂາ ໜອງບົວທອງ (Berlin)',
        importedAt: '2026-10-17 08:30',
        status: 'delivered'
      }
    ],
    totalWarehouseCost: 30000,
    totalCustomerPrice: 50000,
    profit: 20000,
    paymentMethod: 'transfer',
    transferBank: 'BCEL One',
    transferRef: 'FT2610178899201',
    transferProofUrl: SAMPLE_TRANSFER_SLIP,
    cashierName: 'ທ້າວ ສົມພອນ ແກ້ວມະນີ',
    cashierId: 'usr-2',
    notes: 'ໂອນຜ່ານ BCEL One'
  },
  {
    id: 'BILL-20241015-001',
    date: yesterday,
    timestamp: `${yesterday} 14:20:15`,
    customerName: 'ທ່ານ ອາລຸນ ວົງໄຊ',
    customerPhone: '02077889911',
    parcelIds: ['p-101'],
    parcels: [DEMO_PRESET_PARCELS[0]],
    totalWarehouseCost: 15000,
    totalCustomerPrice: 25000,
    profit: 10000,
    paymentMethod: 'transfer',
    transferBank: 'BCEL One',
    transferRef: 'FT2410158899120',
    transferProofUrl: SAMPLE_TRANSFER_SLIP,
    cashierName: 'ທ້າວ ສົມພອນ ແກ້ວມະນີ',
    cashierId: 'usr-2',
    notes: 'ໂອນຜ່ານ BCEL One'
  }
];

export const DEMO_PRESET_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'ນາງ ມາລີ ສີປະເສີດ',
    phone: '02055112233',
    village: 'ບ້ານ ດົງໂດກ',
    district: 'ເມືອງ ໄຊທານີ',
    province: 'ນະຄອນຫຼວງວຽງຈັນ',
    totalParcels: 2,
    totalSpent: 60000,
    lastActive: today,
    notes: 'ລູກຄ້າປະຈຳ'
  }
];
