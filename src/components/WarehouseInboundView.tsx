import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Download, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FileCheck, 
  X, 
  Scale, 
  Coins,
  ArrowRight,
  Eye,
  Boxes,
  Truck,
  TrendingUp,
  PackageCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { parseExcelFile, downloadWarehouseExcelTemplate, ParsedRow, formatDateDisplay, exportToExcel } from '../utils/excel';
import { WarehouseParcel, TabKey } from '../types';

interface WarehouseInboundViewProps {
  onNavigateTab?: (tab: TabKey) => void;
}

interface DailyShipmentSummary {
  date: string;
  totalParcels: number;
  totalWeight: number;
  totalWarehouseCost: number;
  totalCustomerPrice: number;
  arrivedCount: number;
  pendingCount: number;
  deliveredCount: number;
  parcels: WarehouseParcel[];
}

export const WarehouseInboundView: React.FC<WarehouseInboundViewProps> = ({ onNavigateTab }) => {
  const { parcels, addWarehouseParcels, addSingleParcel } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateDetails, setSelectedDateDetails] = useState<DailyShipmentSummary | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewRows, setPreviewRows] = useState<ParsedRow[] | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for single parcel matching the 11 standard fields
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // 1. ວັນທີ
    customerName: '',                             // 2. ຊື່ລູກຄ້າ
    customerPhone: '',                            // 3. ເບີໂທ
    shippingCode: '',                             // 4. ລະຫັດຂົນສົ່ງ
    parcelCode: '',                               // 5. ລະຫັດເຄື່ອງ
    weightKg: '',                                 // 6. ນໍ້າໜັກ (kg)
    customerPrice: '',                            // 7. ລາຄາ (₭)
    warehouseCost: '',                            // 8. ຕົ້ນທຶນ (₭)
    volumeCbm: '',                                // 9. ບໍລິມາດ (m³)
    warehouseCostYuan: '',                        // 10. ຕົ້ນທຶນສະກຸນເງິນຢວນ (¥)
    notes: ''                                     // 11. ໝາຍເຫດ
  });

  // Only consider parcels originating from the warehouse (manifested)
  const warehouseParcels = parcels.filter(p => !p.isUnmanifested && !p.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ'));

  // Group by date to show daily summary: "ວັນທີໃດ ສາງໃຫຍ່ສະແກນມາຈໍານວນເທົາໃດ"
  const dateGroups: { [date: string]: WarehouseParcel[] } = {};
  warehouseParcels.forEach(p => {
    const d = p.date || p.importedAt.split(' ')[0] || 'ບໍ່ລະບຸ';
    if (!dateGroups[d]) {
      dateGroups[d] = [];
    }
    dateGroups[d].push(p);
  });

  const dailySummaries: DailyShipmentSummary[] = Object.keys(dateGroups)
    .sort((a, b) => b.localeCompare(a))
    .map(date => {
      const items = dateGroups[date];
      const totalWeight = items.reduce((sum, p) => sum + (p.weightKg || 0), 0);
      const totalWarehouseCost = items.reduce((sum, p) => sum + (p.warehouseCost || 0), 0);
      const totalCustomerPrice = items.reduce((sum, p) => sum + (p.customerPrice || 0), 0);
      const arrivedCount = items.filter(p => p.status === 'in_branch' || p.status === 'delivered').length;
      const pendingCount = items.filter(p => p.status === 'pending_arrival').length;
      const deliveredCount = items.filter(p => p.status === 'delivered').length;

      return {
        date,
        totalParcels: items.length,
        totalWeight,
        totalWarehouseCost,
        totalCustomerPrice,
        arrivedCount,
        pendingCount,
        deliveredCount,
        parcels: items
      };
    });

  const filteredSummaries = dailySummaries.filter(summary => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      summary.date.includes(term) ||
      summary.parcels.some(p => 
        p.parcelCode.toLowerCase().includes(term) ||
        p.shippingCode.toLowerCase().includes(term) ||
        p.customerName.toLowerCase().includes(term) ||
        p.customerPhone.includes(term)
      )
    );
  });

  const totalAllShipmentParcels = warehouseParcels.length;
  const totalArrivedParcels = warehouseParcels.filter(p => p.status === 'in_branch' || p.status === 'delivered').length;
  const totalPendingParcels = warehouseParcels.filter(p => p.status === 'pending_arrival').length;
  const totalWarehouseCostSum = warehouseParcels.reduce((sum, p) => sum + (p.warehouseCost || 0), 0);

  const formatKip = (val: number) => {
    return new Intl.NumberFormat('lo-LA').format(val) + ' ₭';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const rows = await parseExcelFile(file);
      if (rows.length === 0) {
        setNotification({
          type: 'error',
          message: 'ບໍ່ພົບຂໍ້ມູນໃນໄຟລ໌ Excel ກະລຸນາກວດສອບວ່າໃຊ້ຮູບແບບ 11 ຖັນຕາມແບບຟອມ.'
        });
        setTimeout(() => setNotification(null), 5000);
        return;
      }
      setPreviewRows(rows);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `ເກີດຂໍ້ຜິດພາດໃນການອ່ານໄຟລ໌ Excel: ${err.message || 'ຮູບແບບໄຟລ໌ບໍ່ຖືກຕ້ອງ'}`
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const confirmImportPreview = () => {
    if (!previewRows || previewRows.length === 0) return;
    const mappedRows = previewRows.map(r => ({
      ...r,
      date: r.date || new Date().toISOString().split('T')[0],
      customerName: r.customerName || 'ລູກຄ້າ',
      customerPhone: r.customerPhone || '',
      shippingCode: r.shippingCode || '',
      parcelCode: r.parcelCode || '',
      customerPrice: r.customerPrice || 0,
      warehouseCost: r.warehouseCost || 0
    }));
    const count = addWarehouseParcels(mappedRows);
    setNotification({
      type: 'success',
      message: `ນຳເຂົ້າພັດສະດຸຈາກສາງໃຫຍ່ສຳເລັດ ${count} ລາຍການ! ບັນທຶກລົງ Supabase ແລະ ຕິດຕາມເຄື່ອງທັງໝົດແລ້ວ.`
    });
    setTimeout(() => setNotification(null), 5000);
    setPreviewRows(null);
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parcelCode.trim()) {
      setNotification({
        type: 'error',
        message: 'ກະລຸນາປ້ອນລະຫັດເຄື່ອງ (5. ລະຫັດເຄື່ອງ)'
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    addSingleParcel({
      date: formData.date,
      customerName: formData.customerName.trim() || 'ລູກຄ້າ',
      customerPhone: formData.customerPhone.trim(),
      shippingCode: formData.shippingCode.trim().toUpperCase(),
      parcelCode: formData.parcelCode.trim().toUpperCase(),
      weightKg: formData.weightKg ? Number(formData.weightKg) : undefined,
      customerPrice: Number(formData.customerPrice) || 0,
      warehouseCost: Number(formData.warehouseCost) || 0,
      volumeCbm: formData.volumeCbm ? String(formData.volumeCbm) : undefined,
      warehouseCostYuan: formData.warehouseCostYuan ? Number(formData.warehouseCostYuan) : undefined,
      notes: formData.notes.trim()
    });

    setFormData({
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerPhone: '',
      shippingCode: '',
      parcelCode: '',
      weightKg: '',
      customerPrice: '',
      warehouseCost: '',
      volumeCbm: '',
      warehouseCostYuan: '',
      notes: ''
    });

    setShowAddModal(false);
    setNotification({
      type: 'success',
      message: 'ເພີ່ມພັດສະດຸໃໝ່ສຳເລັດ! ຂໍ້ມູນຖືກສົ່ງເຂົ້າໜ້າ "ຕິດຕາມເຄື່ອງທັງໝົດ" ແລະ Supabase ແລ້ວ.'
    });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleExportBatchExcel = (summary: DailyShipmentSummary) => {
    const exportData = summary.parcels.map((p, idx) => ({
      'ລຳດັບ': idx + 1,
      'ວັນທີ': p.date,
      'ຊື່ລູກຄ້າ': p.customerName,
      'ເບີໂທ': p.customerPhone,
      'ລະຫັດຂົນສົ່ງ': p.shippingCode,
      'ລະຫັດເຄື່ອງ': p.parcelCode,
      'ນໍ້າໜັກ (kg)': p.weightKg || '',
      'ລາຄາ (₭)': p.customerPrice,
      'ຕົ້ນທຶນ (₭)': p.warehouseCost,
      'ສະຖານະ': p.status === 'pending_arrival' ? 'ຍັງບໍ່ຮອດສາຂາ' : (p.status === 'in_branch' ? 'ຮອດສາຂາແລ້ວ' : 'ມອບລູກຄ້າແລ້ວ'),
      'ໝາຍເຫດ': p.notes || ''
    }));

    exportToExcel(exportData, `ສາງໃຫຍ່ສົ່ງມາ_${summary.date}`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold shadow-md ${
          notification.type === 'success' 
            ? 'bg-emerald-500 text-white' 
            : 'bg-rose-500 text-white'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-80 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Code Clarification Banner: Shipping Code vs Parcel Code */}
      <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 border border-indigo-200/80 rounded-2xl p-4 text-xs text-indigo-950 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <span className="font-bold text-sm text-indigo-950">📌 ຂໍ້ແນະນຳຄວາມແຕກຕ່າງລະຫວ່າງ 2 ລະຫັດ (Code Guide)</span>
          </div>
          <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
            ລະບົບແຍກເກັບຕ່າງຫາກ ບໍ່ລວມກັນ
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white/80 p-3 rounded-xl border border-indigo-100 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
              4
            </div>
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>🚚 ລະຫັດຂົນສົ່ງ (Shipping Code / Waybill)</span>
              </div>
              <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                ລະຫັດໃບສົ່ງເຄື່ອງ ຫຼື ໃບກຳກັບສິນຄ້າຈາກສາງໃຫຍ່ (ເຊັ່ນ: <span className="font-mono font-bold text-indigo-700">79040744923446</span> ຫຼື <span className="font-mono font-bold text-indigo-700">EXP-LA-1001</span>)
              </p>
            </div>
          </div>

          <div className="bg-white/80 p-3 rounded-xl border border-emerald-100 flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-xs">
              5
            </div>
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>📦 ລະຫັດເຄື່ອງ (Parcel Code / Barcode)</span>
              </div>
              <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                ບາໂຄດຕິດຢູ່ໜ້າກ່ອງພັດສະດຸຕົວຈິງທີ່ໃຊ້ສະແກນ (ເຊັ່ນ: <span className="font-mono font-bold text-emerald-700">77130543129348</span> ຫຼື <span className="font-mono font-bold text-emerald-700">77130542000249</span>)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-7 h-7 text-indigo-600" />
            <span>ສາງໃຫຍ່ສົ່ງມາ (Warehouse Inbound)</span>
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            ສະຫຼຸບການສົ່ງເຄື່ອງຈາກສາງໃຫຍ່ຕາມວັນທີ: ກວດສອບວັນທີໃດ ສາງໃຫຍ່ສະແກນມາຈຳນວນເທົ່າໃດ ແລະ ຄວາມຄືບໜ້າການຮັບເຂົ້າສາຂາ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download 11-column template */}
          <button
            onClick={downloadWarehouseExcelTemplate}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
            title="ດາວໂຫລດໄຟລ໌ແບບຟອມ Excel ມາດຕະຖານ 11 ຖັນ"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>ແບບຟອມ Excel (11 ຖັນ)</span>
          </button>

          {/* Import Excel */}
          <label className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 cursor-pointer transition">
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'ກຳລັງອ່ານໄຟລ໌...' : 'ນຳເຂົ້າ Excel'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>

          {/* Add single manual */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ ເພີ່ມເຄື່ອງເອງ</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ວັນທີສົ່ງມາທັງໝົດ</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {dailySummaries.length} <span className="text-sm font-medium text-slate-500">ຮອບ/ວັນ</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">ແບ່ງຕາມວັນທີທີ່ສາງໃຫຍ່ສະແກນ</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ຈຳນວນເຄື່ອງສາງໃຫຍ່ສົ່ງ</span>
            <Boxes className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-indigo-700 mt-2 font-mono">
            {totalAllShipmentParcels} <span className="text-sm font-medium text-slate-500">ຊິ້ນ</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">ພັດສະດຸທັງໝົດທີ່ບັນທຶກມາ</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ຮັບເຂົ້າສາຂາແລ້ວ</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2 font-mono">
            {totalArrivedParcels} <span className="text-sm font-medium text-slate-500">ຊິ້ນ</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {totalAllShipmentParcels > 0 ? Math.round((totalArrivedParcels / totalAllShipmentParcels) * 100) : 0}% ຂອງເຄື່ອງທັງໝົດ
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ຍັງລໍຖ້າຮອດສາຂາ</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2 font-mono">
            {totalPendingParcels} <span className="text-sm font-medium text-slate-500">ຊິ້ນ</span>
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">
            ລໍຖ້າສະແກນຮັບເຂົ້າສາຂາ
          </div>
        </div>
      </div>

      {/* Info Notice: No duplication principle */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <PackageCheck className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <strong className="font-bold">ການຈັດການຂໍ້ມູນແບບບໍ່ຊ້ຳກັນ:</strong> ເມື່ອນຳເຂົ້າ Excel ຫຼື ເພີ່ມພັດສະດຸໃໝ່, ລະຫັດທຸກລາຍການຈະຖືກເກັບໄວ້ທີ່ <strong>"ຕິດຕາມເຄື່ອງທັງໝົດ"</strong> ໂດຍອັດຕະໂນມັດ. ໜ້ານີ້ຈະສະແດງສະຫຼຸບວ່າ <strong>ແຕ່ລະວັນທີ ສາງໃຫຍ່ສະແກນມາຈຳນວນເທົ່າໃດ</strong>.
          </div>
        </div>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('parcel_tracking')}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition"
          >
            <span>ໄປໜ້າຕິດຕາມເຄື່ອງທັງໝົດ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ຄົ້ນຫາ ວັນທີ, ລະຫັດ, ຊື່ລູກຄ້າ..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          ພົບທັງໝົດ <strong>{filteredSummaries.length}</strong> ວັນທີສົ່ງເຄື່ອງ
        </div>
      </div>

      {/* Main Daily Shipments Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">ວັນທີສາງໃຫຍ່ສົ່ງ</th>
                <th className="py-3.5 px-4 text-center">ຈຳນວນສາງໃຫຍ່ສະແກນ</th>
                <th className="py-3.5 px-4 text-center">ຮອດສາຂາແລ້ວ</th>
                <th className="py-3.5 px-4 text-center">ຍັງບໍ່ຮອດ</th>
                <th className="py-3.5 px-4 text-center">ມອບລູກຄ້າແລ້ວ</th>
                <th className="py-3.5 px-4">ຄວາມຄືບໜ້າການຮັບເຂົ້າ</th>
                <th className="py-3.5 px-4 text-right">ນໍ້າໜັກລວມ</th>
                <th className="py-3.5 px-4 text-right">ຕົ້ນທຶນສາງລວມ</th>
                <th className="py-3.5 px-4 text-right">ຍອດເກັບລູກຄ້າ</th>
                <th className="py-3.5 px-4 text-center">ການດຳເນີນການ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                    <div className="font-bold text-slate-700 text-sm">ບໍ່ພົບຂໍ້ມູນການສົ່ງເຄື່ອງຈາກສາງໃຫຍ່</div>
                    <p className="text-xs text-slate-400 mt-1">ທ່ານສາມາດກົດ "ນຳເຂົ້າ Excel" ຫຼື "+ ເພີ່ມເຄື່ອງເອງ" ຂ້າງເທິງ</p>
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((summary) => {
                  const percentArrived = summary.totalParcels > 0 
                    ? Math.round((summary.arrivedCount / summary.totalParcels) * 100) 
                    : 0;

                  return (
                    <tr key={summary.date} className="hover:bg-slate-50/80 transition">
                      {/* Date */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-slate-900 text-sm">
                              {formatDateDisplay(summary.date)}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{summary.date}</div>
                          </div>
                        </div>
                      </td>

                      {/* Total parcels sent by warehouse on this date */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Boxes className="w-3.5 h-3.5" />
                          <span>{summary.totalParcels} ຊິ້ນ</span>
                        </span>
                      </td>

                      {/* Arrived at branch */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          <span>{summary.arrivedCount} ຊິ້ນ</span>
                        </span>
                      </td>

                      {/* Pending arrival */}
                      <td className="py-4 px-4 text-center">
                        {summary.pendingCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>{summary.pendingCount} ຊິ້ນ</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">0</span>
                        )}
                      </td>

                      {/* Delivered */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span>{summary.deliveredCount} ຊິ້ນ</span>
                        </span>
                      </td>

                      {/* Progress bar */}
                      <td className="py-4 px-4 min-w-36">
                        <div className="w-full">
                          <div className="flex justify-between text-[11px] font-bold mb-1">
                            <span className="text-slate-600">ຮອດສາຂາ</span>
                            <span className="text-indigo-600 font-mono">{percentArrived}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                percentArrived === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${percentArrived}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Total weight */}
                      <td className="py-4 px-4 font-mono font-semibold text-slate-700 text-right">
                        {summary.totalWeight > 0 ? `${summary.totalWeight.toFixed(1)} kg` : '-'}
                      </td>

                      {/* Warehouse Cost */}
                      <td className="py-4 px-4 font-mono font-bold text-amber-700 text-right">
                        {formatKip(summary.totalWarehouseCost)}
                      </td>

                      {/* Customer Price */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-900 text-right">
                        {formatKip(summary.totalCustomerPrice)}
                      </td>

                      {/* Action buttons */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Quick view batch drawer */}
                          <button
                            onClick={() => setSelectedDateDetails(summary)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition"
                            title="ເບິ່ງລາຍການເຄື່ອງວັນທີນີ້"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>ລາຍລະອຽດ</span>
                          </button>

                          {/* Export batch to Excel */}
                          <button
                            onClick={() => handleExportBatchExcel(summary)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="ດາວໂຫລດ Excel ຊຸດວັນທີນີ້"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Jump to Tracking view with filter */}
                          {onNavigateTab && (
                            <button
                              onClick={() => onNavigateTab('parcel_tracking')}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 transition"
                              title="ໄປກວດສອບໃນໜ້າຕິດຕາມເຄື່ອງ"
                            >
                              <span>ຕິດຕາມເຄື່ອງ</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: View Details for a Specific Date */}
      {selectedDateDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    ລາຍລະອຽດການສົ່ງວັນທີ {formatDateDisplay(selectedDateDetails.date)} ({selectedDateDetails.date})
                  </h3>
                  <p className="text-xs text-slate-500">
                    ສາງໃຫຍ່ສະແກນມາທັງໝົດ: <strong className="text-indigo-600 font-mono">{selectedDateDetails.totalParcels}</strong> ຊິ້ນ • ຮັບເຂົ້າສາຂາແລ້ວ: <strong className="text-emerald-600 font-mono">{selectedDateDetails.arrivedCount}</strong> ຊິ້ນ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDateDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 my-3 border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">1. ວັນທີ</th>
                    <th className="py-2.5 px-3">2. ຊື່ລູກຄ້າ</th>
                    <th className="py-2.5 px-3">3. ເບີໂທ</th>
                    <th className="py-2.5 px-3">4. ລະຫັດຂົນສົ່ງ</th>
                    <th className="py-2.5 px-3">5. ລະຫັດເຄື່ອງ</th>
                    <th className="py-2.5 px-3 text-right">6. ນໍ້າໜັກ</th>
                    <th className="py-2.5 px-3 text-right">7. ລາຄາລູກຄ້າ</th>
                    <th className="py-2.5 px-3 text-right">8. ຕົ້ນທຶນສາງ</th>
                    <th className="py-2.5 px-3">ສະຖານະ</th>
                    <th className="py-2.5 px-3">ເວລາສະແກນ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedDateDetails.parcels.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{formatDateDisplay(p.date)}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{p.customerName}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{p.customerPhone || '-'}</td>
                      <td className="py-2 px-3 font-mono text-xs">
                        {p.shippingCode ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                            <span>🚚</span>
                            <span>{p.shippingCode}</span>
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-xs">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                          <span>📦</span>
                          <span>{p.parcelCode}</span>
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">{p.weightKg ? `${p.weightKg} kg` : '-'}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 text-right">{formatKip(p.customerPrice)}</td>
                      <td className="py-2 px-3 font-mono font-bold text-amber-700 text-right">{formatKip(p.warehouseCost)}</td>
                      <td className="py-2 px-3">
                        {p.status === 'pending_arrival' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            ຍັງບໍ່ຮອດສາຂາ
                          </span>
                        )}
                        {p.status === 'in_branch' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            ຮອດສາຂາແລ້ວ
                          </span>
                        )}
                        {p.status === 'delivered' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ມອບແລ້ວ
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500">{p.arrivedAt || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => handleExportBatchExcel(selectedDateDetails)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel ວັນທີນີ້</span>
              </button>

              <button
                onClick={() => setSelectedDateDetails(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
              >
                ປິດ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Preview Modal when a file is uploaded */}
      {previewRows && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-6xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  ກວດສອບຂໍ້ມູນຈາກ Excel ({previewRows.length} ລາຍການ) — ຮູບແບບ 11 ຖັນ
                </h3>
              </div>
              <button
                onClick={() => setPreviewRows(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500 py-2">
              ກວດພົບຖັນ: 1.ວັນທີ, 2.ຊື່ລູກຄ້າ, 3.ເບີໂທ, 4.ລະຫັດຂົນສົ່ງ, 5.ລະຫັດເຄື່ອງ, 6.ນໍ້າໜັກ, 7.ລາຄາ, 8.ຕົ້ນທຶນ, 9.ບໍລິມາດ, 10.ຕົ້ນທຶນຢວນ, 11.ໝາຍເຫດ
            </div>

            <div className="overflow-y-auto flex-1 my-2 border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">1. ວັນທີ</th>
                    <th className="py-2.5 px-3">2. ຊື່ລູກຄ້າ</th>
                    <th className="py-2.5 px-3">3. ເບີໂທ</th>
                    <th className="py-2.5 px-3">4. ລະຫັດຂົນສົ່ງ</th>
                    <th className="py-2.5 px-3">5. ລະຫັດເຄື່ອງ</th>
                    <th className="py-2.5 px-3">6. ນໍ້າໜັກ (kg)</th>
                    <th className="py-2.5 px-3">7. ລາຄາ (₭)</th>
                    <th className="py-2.5 px-3">8. ຕົ້ນທຶນ (₭)</th>
                    <th className="py-2.5 px-3">9. ບໍລິມາດ (m³)</th>
                    <th className="py-2.5 px-3">10. ຕົ້ນທຶນຢວນ (¥)</th>
                    <th className="py-2.5 px-3">11. ໝາຍເຫດ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 text-slate-600 font-mono">{formatDateDisplay(row.date)}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{row.customerName}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{row.customerPhone}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">{row.shippingCode}</td>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-700">{row.parcelCode}</td>
                      <td className="py-2 px-3 text-slate-700">{row.weightKg ? `${row.weightKg} kg` : '-'}</td>
                      <td className="py-2 px-3 text-emerald-700 font-bold">{formatKip(row.customerPrice || 0)}</td>
                      <td className="py-2 px-3 text-amber-700 font-bold">{formatKip(row.warehouseCost || 0)}</td>
                      <td className="py-2 px-3 text-slate-600">{row.volumeCbm ? `${row.volumeCbm} m³` : '-'}</td>
                      <td className="py-2 px-3 text-purple-700 font-bold">{row.warehouseCostYuan ? `¥${row.warehouseCostYuan}` : '-'}</td>
                      <td className="py-2 px-3 text-slate-500 max-w-xs truncate">{row.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setPreviewRows(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                ຍົກເລີກ
              </button>
              <button
                onClick={confirmImportPreview}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ຢືນຢັນນຳເຂົ້າ {previewRows.length} ລາຍການ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Single Parcel Modal (11 fields in order) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-base">ເພີ່ມພັດສະດຸຈາກສາງໃຫຍ່ (ຄີຂໍ້ມູນ 11 ຫົວຂໍ້)</h3>
                <p className="text-xs text-slate-500 mt-0.5">ປ້ອນຂໍ້ມູນຕາມລຳດັບມາດຕະຖານ 11 ຖັນ (ສົ່ງເຂົ້າໜ້າຕິດຕາມເຄື່ອງອັດຕະໂນມັດ)</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSingleSubmit} className="space-y-4 pt-4">
              {/* 1. ວັນທີ, 2. ຊື່ລູກຄ້າ, 3. ເບີໂທ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">1. ວັນທີ</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">2. ຊື່ລູກຄ້າ</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="ຊື່ລູກຄ້າ"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">3. ເບີໂທ</label>
                  <input
                    type="text"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="0205xxxxxxx"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* 4. ລະຫັດຂົນສົ່ງ, 5. ລະຫັດເຄື່ອງ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">4. ລະຫັດຂົນສົ່ງ</label>
                  <input
                    type="text"
                    value={formData.shippingCode}
                    onChange={(e) => setFormData({ ...formData, shippingCode: e.target.value })}
                    placeholder="EXP-LA-..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">5. ລະຫັດເຄື່ອງ (Tracking Code)</label>
                  <input
                    type="text"
                    value={formData.parcelCode}
                    onChange={(e) => setFormData({ ...formData, parcelCode: e.target.value })}
                    placeholder="PKG-..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono uppercase font-bold text-indigo-700"
                    required
                  />
                </div>
              </div>

              {/* 6. ນໍ້າໜັກ, 7. ລາຄາ, 8. ຕົ້ນທຶນ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">6. ນໍ້າໜັກ (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weightKg}
                    onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                    placeholder="0.0"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">7. ລາຄາ (₭)</label>
                  <input
                    type="number"
                    value={formData.customerPrice}
                    onChange={(e) => setFormData({ ...formData, customerPrice: e.target.value })}
                    placeholder="25000"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">8. ຕົ້ນທຶນ (₭)</label>
                  <input
                    type="number"
                    value={formData.warehouseCost}
                    onChange={(e) => setFormData({ ...formData, warehouseCost: e.target.value })}
                    placeholder="15000"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono font-bold text-amber-700"
                    required
                  />
                </div>
              </div>

              {/* 9. ບໍລິມາດ, 10. ຕົ້ນທຶນຢວນ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">9. ບໍລິມາດ (m³ / cbm)</label>
                  <input
                    type="text"
                    value={formData.volumeCbm}
                    onChange={(e) => setFormData({ ...formData, volumeCbm: e.target.value })}
                    placeholder="0.015"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">10. ຕົ້ນທຶນສະກຸນເງິນຢວນ (¥)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.warehouseCostYuan}
                    onChange={(e) => setFormData({ ...formData, warehouseCostYuan: e.target.value })}
                    placeholder="5.5"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono text-purple-700 font-bold"
                  />
                </div>
              </div>

              {/* 11. ໝາຍເຫດ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">11. ໝາຍເຫດ</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ເຊັ່ນ: ເຄື່ອງໃຫຍ່, ເຄື່ອງແຕກງ່າຍ, ຝາກດ່ວນ"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  ບັນທຶກພັດສະດຸ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
