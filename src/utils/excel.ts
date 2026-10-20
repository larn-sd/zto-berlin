import * as XLSX from 'xlsx';
import { WarehouseParcel, CheckoutBill } from '../types';

export interface ParsedRow {
  date?: string;                  // 1. ວັນທີ
  customerName?: string;          // 2. ຊື່ລູກຄ້າ
  customerPhone?: string;         // 3. ເບີໂທ
  shippingCode?: string;          // 4. ລະຫັດຂົນສົ່ງ
  parcelCode?: string;            // 5. ລະຫັດເຄື່ອງ
  weightKg?: number;             // 6. ນໍ້າໜັກ (kg)
  customerPrice?: number;         // 7. ລາຄາ (₭)
  warehouseCost?: number;         // 8. ຕົ້ນທຶນ (₭)
  volumeCbm?: string | number;    // 9. ບໍລິມາດ (m³) - ເປົ່າຫວ່າງໄດ້
  warehouseCostYuan?: number;    // 10. ຕົ້ນທຶນສະກຸນເງິນຢວນ (¥) - ເປົ່າຫວ່າງໄດ້
  notes?: string;                // 11. ໝາຍເຫດ
}

// Helper to normalize column keys with intelligent Lao and English matching
function normalizeKey(header: string): string {
  const h = (header || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  
  // 10. ຕົ້ນທຶນສະກຸນເງິນຢວນ (Check first before generic ຕົ້ນທຶນ)
  if (h.includes('ຢວນ') || h.includes('yuan') || h.includes('rmb') || h.includes('cny')) return 'warehouseCostYuan';
  
  // 9. ບໍລິມາດ (m³ / cbm)
  if (h.includes('ບໍລິມາດ') || h.includes('ບໍລີມາດ') || h.includes('volume') || h.includes('cbm') || h.includes('m3') || h.includes('m³')) return 'volumeCbm';
  
  // 6. ນໍ້າໜັກ (kg)
  if (h.includes('ນໍ້າໜັກ') || h.includes('ນໍ່າໜັກ') || h.includes('weight') || h.includes('kg')) return 'weightKg';
  
  // 8. ຕົ້ນທຶນ (LAK)
  if (h.includes('ຕົ້ນທຶນ') || h.includes('ຕົ້ນທືນ') || h.includes('ສາງໃຫຍ່') || h.includes('cost') || h.includes('whcost')) return 'warehouseCost';
  
  // 7. ລາຄາ (LAK)
  if (h.includes('ລາຄາ') || h.includes('price') || h.includes('amount')) return 'customerPrice';
  
  // 4. ລະຫັດຂົນສົ່ງ
  if (h.includes('ລະຫັດຂົນສົ່ງ') || h.includes('shipping') || h.includes('waybill') || h.includes('consignment')) return 'shippingCode';
  
  // 5. ລະຫັດເຄື່ອງ / ລະຫັດເຄືອງ
  if (h.includes('ລະຫັດເຄື່ອງ') || h.includes('ລະຫັດເຄືອງ') || h.includes('ລະຫັດພັດສະດຸ') || h.includes('parcel') || h.includes('item') || h.includes('tracking')) return 'parcelCode';
  
  // 2. ຊື່ລູກຄ້າ
  if (h.includes('ຊື່') || h.includes('name') || h.includes('customer')) return 'customerName';
  
  // 3. ເບີໂທ
  if (h.includes('ເບີ') || h.includes('phone') || h.includes('tel') || h.includes('mobile')) return 'customerPhone';
  
  // 1. ວັນທີ
  if (h.includes('ວັນທີ') || h.includes('date') || h.includes('ວັນ')) return 'date';
  
  // 11. ໝາຍເຫດ
  if (h.includes('ໝາຍເຫດ') || h.includes('note') || h.includes('remark')) return 'notes';
  
  return h;
}

/**
 * Normalizes any Excel date input into standard YYYY-MM-DD format.
 * Accurately handles:
 * - Excel numeric serial numbers (e.g. 45620, 45581)
 * - Numeric strings (e.g. "45620")
 * - DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (very common in Lao/Thai spreadsheets)
 * - YYYY/MM/DD, YYYY-MM-DD
 * - JavaScript Date objects
 */
export function normalizeExcelDate(val: any): string {
  if (val === undefined || val === null || val === '') {
    return new Date().toISOString().split('T')[0];
  }

  // 1. If it's already a Date object
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // 2. If it's an Excel numeric serial date (e.g. 45620 or 45581)
  if (typeof val === 'number') {
    if (val > 10000 && val < 90000) {
      try {
        const dateObj = XLSX.SSF.parse_date_code(val);
        if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
          const y = dateObj.y;
          const m = String(dateObj.m).padStart(2, '0');
          const d = String(dateObj.d).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      } catch {}
    }
  }

  const str = String(val).trim();
  if (!str) return new Date().toISOString().split('T')[0];

  // 3. If it's a numeric string representing Excel serial date (e.g. "45620" or "45581.5")
  const numericSerial = parseFloat(str);
  if (!isNaN(numericSerial) && /^\d{5}(?:\.\d+)?$/.test(str) && numericSerial > 10000 && numericSerial < 90000) {
    try {
      const dateObj = XLSX.SSF.parse_date_code(numericSerial);
      if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
        const y = dateObj.y;
        const m = String(dateObj.m).padStart(2, '0');
        const d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {}
  }

  // 4. If formatted as DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (e.g. "16/10/2024", "16-10-2024", "16/10/24")
  const matchDMY = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})(?:\s+.*)?$/);
  if (matchDMY) {
    const day = matchDMY[1].padStart(2, '0');
    const month = matchDMY[2].padStart(2, '0');
    let year = matchDMY[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    const mNum = parseInt(month, 10);
    const dNum = parseInt(day, 10);
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // 5. If formatted as YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
  const matchYMD = str.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})(?:\s+.*)?$/);
  if (matchYMD) {
    const year = matchYMD[1];
    const month = matchYMD[2].padStart(2, '0');
    const day = matchYMD[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 6. If ISO string (e.g. 2024-10-16T12:00:00.000Z)
  if (str.includes('T')) {
    const isoDate = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      return isoDate;
    }
  }

  // 7. Try JS Date constructor fallback
  const parsedTs = Date.parse(str);
  if (!isNaN(parsedTs)) {
    const d = new Date(parsedTs);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return str;
}

/**
 * Formats any date string for clean UI display (DD/MM/YYYY).
 * Examples:
 * "2024-10-16" -> "16/10/2024"
 * "45581" -> "16/10/2024"
 */
export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const normalized = normalizeExcelDate(dateStr);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

export async function parseExcelFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Read first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to json with raw header array
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (!rawJson || rawJson.length === 0) {
          resolve([]);
          return;
        }

        const parsedRows: ParsedRow[] = rawJson.map((row) => {
          const item: ParsedRow = {};
          
          Object.keys(row).forEach((header) => {
            const mappedKey = normalizeKey(header);
            const val = row[header];
            
            if (mappedKey === 'date') {
              item.date = normalizeExcelDate(val);
            } else if (mappedKey === 'customerName') {
              item.customerName = String(val).trim();
            } else if (mappedKey === 'customerPhone') {
              item.customerPhone = String(val).trim();
            } else if (mappedKey === 'shippingCode') {
              item.shippingCode = String(val).trim();
            } else if (mappedKey === 'parcelCode') {
              item.parcelCode = String(val).trim();
            } else if (mappedKey === 'weightKg') {
              const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
              item.weightKg = isNaN(num) ? undefined : num;
            } else if (mappedKey === 'customerPrice') {
              const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
              item.customerPrice = isNaN(num) ? 0 : num;
            } else if (mappedKey === 'warehouseCost') {
              const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
              item.warehouseCost = isNaN(num) ? 0 : num;
            } else if (mappedKey === 'volumeCbm') {
              item.volumeCbm = String(val).trim() || undefined;
            } else if (mappedKey === 'warehouseCostYuan') {
              const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
              item.warehouseCostYuan = isNaN(num) ? undefined : num;
            } else if (mappedKey === 'notes') {
              item.notes = String(val).trim();
            }
          });

          return item;
        });

        // Filter out empty rows
        const validRows = parsedRows.filter(r => (r.parcelCode || r.shippingCode || r.customerName));
        resolve(validRows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Generate Excel Template for Warehouse Inbound matching the exact 11 columns in order:
// 1. ວັນທີ, 2. ຊື່ລູກຄ້າ, 3. ເບີໂທ, 4. ລະຫັດຂົນສົ່ງ, 5. ລະຫັດເຄື່ອງ, 6. ນໍ້າໜັກ, 7. ລາຄາ, 8. ຕົ້ນທຶນ, 9. ບໍລິມາດ, 10. ຕົ້ນທຶນສະກຸນເງິນຢວນ, 11. ໝາຍເຫດ
export function downloadWarehouseExcelTemplate() {
  const todayStr = formatDateDisplay(new Date().toISOString().split('T')[0]);

  const templateData = [
    {
      '1. ວັນທີ': todayStr,
      '2. ຊື່ລູກຄ້າ': 'ສົມສັກ ໄຊຍະວົງ',
      '3. ເບີໂທ': '020 55667788',
      '4. ລະຫັດຂົນສົ່ງ': 'EXP-LA-8812',
      '5. ລະຫັດເຄື່ອງ': 'PKG-2024-9001',
      '6. ນໍ້າໜັກ (kg)': 1.5,
      '7. ລາຄາ (₭)': 25000,
      '8. ຕົ້ນທຶນ (₭)': 15000,
      '9. ບໍລິມາດ (m³)': '', // ເປົ່າຫວ່າງໄດ້
      '10. ຕົ້ນທຶນສະກຸນເງິນຢວນ (¥)': '', // ເປົ່າຫວ່າງໄດ້
      '11. ໝາຍເຫດ': 'ເຄື່ອງດ່ວນ'
    },
    {
      '1. ວັນທີ': todayStr,
      '2. ຊື່ລູກຄ້າ': 'ນາງ ຈັນທາ ວິລະວົງ',
      '3. ເບີໂທ': '020 99887766',
      '4. ລະຫັດຂົນສົ່ງ': 'EXP-LA-8813',
      '5. ລະຫັດເຄື່ອງ': 'PKG-2024-9002',
      '6. ນໍ້າໜັກ (kg)': 3.2,
      '7. ລາຄາ (₭)': 45000,
      '8. ຕົ້ນທຶນ (₭)': 28000,
      '9. ບໍລິມາດ (m³)': '0.04',
      '10. ຕົ້ນທຶນສະກຸນເງິນຢວນ (¥)': '',
      '11. ໝາຍເຫດ': 'ເຄື່ອງເສື້ອຜ້າ'
    },
    {
      '1. ວັນທີ': todayStr,
      '2. ຊື່ລູກຄ້າ': 'ອາລຸນ ສີວິໄລ',
      '3. ເບີໂທ': '020 77112233',
      '4. ລະຫັດຂົນສົ່ງ': 'EXP-LA-8814',
      '5. ລະຫັດເຄື່ອງ': 'PKG-2024-9003',
      '6. ນໍ້າໜັກ (kg)': 18.5,
      '7. ລາຄາ (₭)': 250000,
      '8. ຕົ້ນທຶນ (₭)': 160000,
      '9. ບໍລິມາດ (m³)': '0.25',
      '10. ຕົ້ນທຶນສະກຸນເງິນຢວນ (¥)': 55.0, // ກໍລະນີສາງໃຫຍ່ໄລ່ເປັນເງິນຢວນ
      '11. ໝາຍເຫດ': 'ເຄື່ອງໃຫຍ່ ຄິດໄລ່ຕາມບໍລິມາດ'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Set column widths matching the 11 columns
  worksheet['!cols'] = [
    { wch: 14 }, // 1. ວັນທີ
    { wch: 22 }, // 2. ຊື່ລູກຄ້າ
    { wch: 18 }, // 3. ເບີໂທ
    { wch: 20 }, // 4. ລະຫັດຂົນສົ່ງ
    { wch: 20 }, // 5. ລະຫັດເຄື່ອງ
    { wch: 14 }, // 6. ນໍ້າໜັກ
    { wch: 16 }, // 7. ລາຄາ
    { wch: 16 }, // 8. ຕົ້ນທຶນ
    { wch: 16 }, // 9. ບໍລິມາດ
    { wch: 24 }, // 10. ຕົ້ນທຶນສະກຸນເງິນຢວນ
    { wch: 24 }  // 11. ໝາຍເຫດ
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_ສາງໃຫຍ່');
  XLSX.writeFile(workbook, 'Template_ສາງໃຫຍ່ສົ່ງມາ_11ຖັນ.xlsx');
}

// Export Discrepancy comparison report
export function exportDiscrepanciesToExcel(
  missingParcels: WarehouseParcel[],
  unmanifestedParcels: WarehouseParcel[],
  receivedParcels: WarehouseParcel[]
) {
  const wb = XLSX.utils.book_new();

  // 1. Missing Parcels (ເຄື່ອງບໍ່ເຫັນ)
  const missingData = missingParcels.map((p, idx) => ({
    'ລໍາດັບ': idx + 1,
    'ວັນທີ': formatDateDisplay(p.date),
    'ຊື່ລູກຄ້າ': p.customerName,
    'ເບີໂທ': p.customerPhone,
    'ລະຫັດຂົນສົ່ງ': p.shippingCode,
    'ລະຫັດເຄື່ອງ': p.parcelCode,
    'ນໍ້າໜັກ (kg)': p.weightKg || '',
    'ລາຄາ (₭)': p.customerPrice,
    'ຕົ້ນທຶນ (₭)': p.warehouseCost,
    'ບໍລິມາດ': p.volumeCbm || '',
    'ຕົ້ນທຶນຢວນ (¥)': p.warehouseCostYuan || '',
    'ສະຖານະ': 'ເຄື່ອງບໍ່ເຫັນ / ຍັງບໍ່ຮອດສາຂາ',
    'ໝາຍເຫດ': p.notes || ''
  }));
  const wsMissing = XLSX.utils.json_to_sheet(missingData);
  XLSX.utils.book_append_sheet(wb, wsMissing, '1.ເຄື່ອງບໍ່ເຫັນ (Missing)');

  // 2. Unmanifested Parcels (ສາງໃຫຍ່ລືມສະແກນ)
  const unmanifestedData = unmanifestedParcels.map((p, idx) => ({
    'ລໍາດັບ': idx + 1,
    'ວັນທີ': formatDateDisplay(p.date),
    'ຊື່ລູກຄ້າ': p.customerName || 'ບໍ່ລະບຸ',
    'ເບີໂທ': p.customerPhone || 'ບໍ່ລະບຸ',
    'ລະຫັດຂົນສົ່ງ': p.shippingCode,
    'ລະຫັດເຄື່ອງ': p.parcelCode,
    'ນໍ້າໜັກ (kg)': p.weightKg || '',
    'ລາຄາ (₭)': p.customerPrice,
    'ຕົ້ນທຶນ (₭)': p.warehouseCost,
    'ບໍລິມາດ': p.volumeCbm || '',
    'ຕົ້ນທຶນຢວນ (¥)': p.warehouseCostYuan || '',
    'ສະຖານະ': 'ສາງໃຫຍ່ລືມສະແກນ (Unmanifested)',
    'ພະນັກງານທີ່ສະແກນ': p.arrivedByStaff || ''
  }));
  const wsUnmanifested = XLSX.utils.json_to_sheet(unmanifestedData);
  XLSX.utils.book_append_sheet(wb, wsUnmanifested, '2.ສາງໃຫຍ່ລືມສະແກນ');

  // 3. Matched & In Branch
  const receivedData = receivedParcels.map((p, idx) => ({
    'ລໍາດັບ': idx + 1,
    'ວັນທີ': formatDateDisplay(p.date),
    'ຊື່ລູກຄ້າ': p.customerName,
    'ເບີໂທ': p.customerPhone,
    'ລະຫັດຂົນສົ່ງ': p.shippingCode,
    'ລະຫັດເຄື່ອງ': p.parcelCode,
    'ນໍ້າໜັກ (kg)': p.weightKg || '',
    'ລາຄາ (₭)': p.customerPrice,
    'ຕົ້ນທຶນ (₭)': p.warehouseCost,
    'ບໍລິມາດ': p.volumeCbm || '',
    'ຕົ້ນທຶນຢວນ (¥)': p.warehouseCostYuan || '',
    'ສະຖານະ': p.status === 'delivered' ? 'ມອບໃຫ້ລູກຄ້າແລ້ວ' : 'ຮອດສາຂາແລ້ວ'
  }));
  const wsReceived = XLSX.utils.json_to_sheet(receivedData);
  XLSX.utils.book_append_sheet(wb, wsReceived, '3.ເຄື່ອງຮອດສາຂາຖືກຕ້ອງ');

  XLSX.writeFile(wb, `ລາຍງານສົມທຽບພັດສະດຸ_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Export Billing History
export function exportBillsToExcel(bills: CheckoutBill[]) {
  const data = bills.map((b, idx) => ({
    'ລໍາດັບ': idx + 1,
    'ເລກໃບບິນ': b.id,
    'ວັນທີ-ເວລາ': b.timestamp,
    'ຊື່ລູກຄ້າ': b.customerName,
    'ເບີໂທ': b.customerPhone,
    'ຈຳນວນພັດສະດຸ': b.parcelIds.length,
    'ຕົ້ນທຶນ (₭)': b.totalWarehouseCost,
    'ຍອດເກັບລູກຄ້າ (₭)': b.totalCustomerPrice,
    'ກໍາໄລສາຂາ (₭)': b.profit,
    'ວິທີຊໍາລະ': b.paymentMethod === 'cash' ? 'ເງິນສົດ' : `ໂອນ (${b.transferBank || 'ທະນາຄານ'})`,
    'ເລກອ້າງອີງໂອນ': b.transferRef || '-',
    'ມີສະລິບໂອນ': b.transferProofUrl ? 'ມີຫຼັກຖານ' : '-',
    'ພະນັກງານອອກບິນ': b.cashierName
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ປະຫວັດໃບບິນ');
  XLSX.writeFile(wb, `ລາຍງານໃບບິນ_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Generic Excel exporter
export function exportToExcel(data: Record<string, any>[], filename: string, sheetName: string = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
