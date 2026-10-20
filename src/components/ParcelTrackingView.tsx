import React, { useState } from 'react';
import { 
  Boxes, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ShoppingBag, 
  Download, 
  Filter, 
  Scale, 
  Box, 
  Coins, 
  Tag, 
  User, 
  Phone,
  ScanLine,
  ArrowRight,
  Edit3,
  Trash2,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateDisplay, exportToExcel } from '../utils/excel';
import { WarehouseParcel, TabKey } from '../types';

interface ParcelTrackingViewProps {
  onNavigateTab?: (tab: TabKey) => void;
}

export const ParcelTrackingView: React.FC<ParcelTrackingViewProps> = ({ onNavigateTab }) => {
  const { parcels, updateParcel, deleteParcel } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_arrival' | 'in_branch' | 'unmanifested' | 'delivered'>('all');

  // Edit parcel state
  const [editingParcel, setEditingParcel] = useState<WarehouseParcel | null>(null);
  const [editFormData, setEditFormData] = useState({
    date: '',
    customerName: '',
    customerPhone: '',
    shippingCode: '',
    parcelCode: '',
    weightKg: '',
    customerPrice: '',
    warehouseCost: '',
    volumeCbm: '',
    warehouseCostYuan: '',
    notes: '',
    status: 'pending_arrival' as WarehouseParcel['status']
  });

  // Delete confirm modal state
  const [deleteConfirmParcel, setDeleteConfirmParcel] = useState<WarehouseParcel | null>(null);

  const openEditModal = (p: WarehouseParcel) => {
    setEditingParcel(p);
    setEditFormData({
      date: p.date || new Date().toISOString().split('T')[0],
      customerName: p.customerName || '',
      customerPhone: p.customerPhone || '',
      shippingCode: p.shippingCode || '',
      parcelCode: p.parcelCode || '',
      weightKg: p.weightKg !== undefined ? String(p.weightKg) : '',
      customerPrice: String(p.customerPrice || 0),
      warehouseCost: String(p.warehouseCost || 0),
      volumeCbm: p.volumeCbm !== undefined ? String(p.volumeCbm) : '',
      warehouseCostYuan: p.warehouseCostYuan !== undefined ? String(p.warehouseCostYuan) : '',
      notes: p.notes || '',
      status: p.status
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParcel) return;

    updateParcel(editingParcel.id, {
      date: editFormData.date,
      customerName: editFormData.customerName.trim() || 'ລູກຄ້າ',
      customerPhone: editFormData.customerPhone.trim(),
      shippingCode: (editFormData.shippingCode || '').trim().toUpperCase(),
      parcelCode: (editFormData.parcelCode || '').trim().toUpperCase(),
      weightKg: editFormData.weightKg ? Number(editFormData.weightKg) : undefined,
      customerPrice: Number(editFormData.customerPrice) || 0,
      warehouseCost: Number(editFormData.warehouseCost) || 0,
      volumeCbm: editFormData.volumeCbm ? String(editFormData.volumeCbm) : undefined,
      warehouseCostYuan: editFormData.warehouseCostYuan ? Number(editFormData.warehouseCostYuan) : undefined,
      notes: editFormData.notes.trim(),
      status: editFormData.status
    });

    setEditingParcel(null);
  };

  const pendingCount = parcels.filter(p => p.status === 'pending_arrival').length;
  const inBranchCount = parcels.filter(p => p.status === 'in_branch').length;
  const unmanifestedCount = parcels.filter(p => p.isUnmanifested || p.status === 'unmanifested' || p.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ')).length;
  const deliveredCount = parcels.filter(p => p.status === 'delivered').length;

  const formatKip = (val: number) => {
    return new Intl.NumberFormat('lo-LA').format(val) + ' ₭';
  };

  const filteredParcels = parcels.filter(p => {
    // Status filter
    if (statusFilter === 'pending_arrival' && p.status !== 'pending_arrival') return false;
    if (statusFilter === 'in_branch' && p.status !== 'in_branch') return false;
    if (statusFilter === 'delivered' && p.status !== 'delivered') return false;
    if (statusFilter === 'unmanifested' && !(p.isUnmanifested || p.status === 'unmanifested' || p.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ'))) return false;

    // Search filter
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      p.parcelCode.toLowerCase().includes(term) ||
      p.shippingCode.toLowerCase().includes(term) ||
      p.customerName.toLowerCase().includes(term) ||
      p.customerPhone.includes(term) ||
      (p.notes && p.notes.toLowerCase().includes(term))
    );
  });

  const handleExportExcel = () => {
    const exportData = filteredParcels.map((p, idx) => ({
      'ລຳດັບ': idx + 1,
      'ວັນທີ': p.date,
      'ຊື່ລູກຄ້າ': p.customerName,
      'ເບີໂທ': p.customerPhone,
      'ລະຫັດຂົນສົ່ງ': p.shippingCode,
      'ລະຫັດເຄື່ອງ': p.parcelCode,
      'ນໍ້າໜັກ (kg)': p.weightKg || '',
      'ລາຄາເກັບລູກຄ້າ (₭)': p.customerPrice,
      'ຕົ້ນທຶນສາງ (₭)': p.warehouseCost,
      'ສະຖານະ': p.status === 'pending_arrival' ? 'ຍັງບໍ່ຮອດສາຂາ' :
                p.status === 'in_branch' ? (p.isUnmanifested ? 'ສາງໃຫຍ່ລືມສະແກນ (ຮອດສາຂາແລ້ວ)' : 'ຮອດສາຂາແລ້ວ') :
                p.status === 'delivered' ? 'ມອບໃຫ້ລູກຄ້າແລ້ວ' : 'ສາງໃຫຍ່ລືມສະແກນ',
      'ເວລາຮອດສາຂາ': p.arrivedAt || '',
      'ພະນັກງານສະແກນ': p.arrivedByStaff || '',
      'ໝາຍເຫດ': p.notes || ''
    }));

    exportToExcel(exportData, `ZTO_Berlin_Parcel_Tracking_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2 border border-indigo-200">
            <Boxes className="w-3.5 h-3.5" />
            <span>ໜ້າຕິດຕາມເຄື່ອງ & ສະຖານະສາງສາຂາທັງໝົດ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            ຕິດຕາມເຄື່ອງທັງໝົດ (All Parcels Tracking & Inventory)
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            ລາຍການພັດສະດຸທັງໝົດໃນລະບົບ: ກວດສອບສະຖານະຈາກ <strong>"ຍັງບໍ່ຮອດສາຂາ"</strong> ເປັນ <strong>"ຮອດສາຂາແລ້ວ"</strong>, ເຄື່ອງທີ່ <strong>"ສາງໃຫຍ່ລືມສະແກນ"</strong> ແລະ <strong>"ມອບໃຫ້ລູກຄ້າແລ້ວ"</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Export ລາຍການ (Excel)</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
            statusFilter === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-bold opacity-80">ພັດສະດຸທັງໝົດ</div>
          <div className="text-2xl font-black mt-1">{parcels.length}</div>
          <div className="text-[11px] opacity-70 mt-0.5">ລວມທຸກສະຖານະ</div>
        </div>

        <div 
          onClick={() => setStatusFilter('pending_arrival')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
            statusFilter === 'pending_arrival' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="text-xs font-bold opacity-80 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>1. ຍັງບໍ່ຮອດສາຂາ</span>
          </div>
          <div className="text-2xl font-black mt-1">{pendingCount}</div>
          <div className="text-[11px] opacity-70 mt-0.5">ສາງໃຫຍ່ສົ່ງມາ ລໍຖ້າສະແກນ</div>
        </div>

        <div 
          onClick={() => setStatusFilter('in_branch')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
            statusFilter === 'in_branch' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="text-xs font-bold opacity-80 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>2. ຮອດສາຂາແລ້ວ</span>
          </div>
          <div className="text-2xl font-black mt-1">{inBranchCount}</div>
          <div className="text-[11px] opacity-70 mt-0.5">ພ້ອມໃຫ້ລູກຄ້າມາຮັບ</div>
        </div>

        <div 
          onClick={() => setStatusFilter('unmanifested')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
            statusFilter === 'unmanifested' ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="text-xs font-bold opacity-80 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>ສາງໃຫຍ່ລືມສະແກນ</span>
          </div>
          <div className="text-2xl font-black mt-1">{unmanifestedCount}</div>
          <div className="text-[11px] opacity-70 mt-0.5">ສາຂາຮັບເຂົ້າອັດຕະໂນມັດ</div>
        </div>

        <div 
          onClick={() => setStatusFilter('delivered')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
            statusFilter === 'delivered' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="text-xs font-bold opacity-80 flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>3. ມອບແລ້ວ</span>
          </div>
          <div className="text-2xl font-black mt-1">{deliveredCount}</div>
          <div className="text-[11px] opacity-70 mt-0.5">ຈ່າຍເງິນ & ອອກບິນແລ້ວ</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ຄົ້ນຫາ ລະຫັດເຄື່ອງ, ລະຫັດຂົນສົ່ງ, ຊື່, ເບີໂທ..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ທັງໝົດ ({parcels.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending_arrival')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'pending_arrival' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ຍັງບໍ່ຮອດສາຂາ ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('in_branch')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'in_branch' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ຮອດສາຂາແລ້ວ ({inBranchCount})
          </button>
          <button
            onClick={() => setStatusFilter('unmanifested')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'unmanifested' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ສາງໃຫຍ່ລືມ ({unmanifestedCount})
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'delivered' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ມອບແລ້ວ ({deliveredCount})
          </button>
        </div>
      </div>

      {/* Main All Parcels Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">ວັນທີ</th>
                <th className="py-3 px-4">ຊື່ລູກຄ້າ</th>
                <th className="py-3 px-4">ເບີໂທ</th>
                <th className="py-3 px-4">ລະຫັດຂົນສົ່ງ</th>
                <th className="py-3 px-4">ລະຫັດເຄື່ອງ</th>
                <th className="py-3 px-4">ນໍ້າໜັກ / ບໍລິມາດ</th>
                <th className="py-3 px-4">ລາຄາລູກຄ້າ</th>
                <th className="py-3 px-4">ຕົ້ນທຶນສາງ</th>
                <th className="py-3 px-4">ສະຖານະຕິດຕາມ</th>
                <th className="py-3 px-4">ເວລາສະແກນ / ພະນັກງານ</th>
                <th className="py-3 px-4">ໝາຍເຫດ</th>
                <th className="py-3 px-4 text-center">ຈັດການ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParcels.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400">
                    <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                    <div className="font-bold text-slate-700 text-sm">ບໍ່ພົບລາຍການພັດສະດຸ</div>
                    <p className="text-xs text-slate-400 mt-1">ລອງຄົ້ນຫາດ້ວຍຄຳສັບອື່ນ ຫຼື ປ່ຽນແທັບສະຖານະ</p>
                  </td>
                </tr>
              ) : (
                filteredParcels.map((parcel) => {
                  const isUnman = parcel.isUnmanifested || parcel.status === 'unmanifested' || parcel.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ');
                  return (
                    <tr key={parcel.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-slate-600 font-mono">{formatDateDisplay(parcel.date)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{parcel.customerName}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{parcel.customerPhone || '-'}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{parcel.shippingCode}</td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{parcel.parcelCode}</td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {parcel.weightKg ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px]">
                              <Scale className="w-3 h-3 text-slate-400" />
                              <span>{parcel.weightKg} kg</span>
                            </span>
                          ) : '-'}
                          {parcel.volumeCbm && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[11px]">
                              <Box className="w-3 h-3" />
                              <span>{parcel.volumeCbm} m³</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{formatKip(parcel.customerPrice)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-700">{formatKip(parcel.warehouseCost)}</td>

                      {/* Live Tracking Status Badge */}
                      <td className="py-3 px-4">
                        {parcel.status === 'pending_arrival' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>ຍັງບໍ່ຮອດສາຂາ</span>
                          </span>
                        )}
                        {parcel.status === 'in_branch' && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            isUnman ? 'bg-purple-50 text-purple-700 border-purple-300' : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{isUnman ? 'ສາງໃຫຍ່ລືມ (ຮອດສາຂາແລ້ວ)' : 'ຮອດສາຂາແລ້ວ'}</span>
                          </span>
                        )}
                        {parcel.status === 'delivered' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ມອບໃຫ້ລູກຄ້າແລ້ວ</span>
                          </span>
                        )}
                        {parcel.status === 'unmanifested' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <AlertCircle className="w-3 h-3" />
                            <span>ສາງໃຫຍ່ລືມສະແກນ</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-500">
                        {parcel.arrivedAt ? (
                          <div>
                            <span className="font-mono text-slate-700">{parcel.arrivedAt}</span>
                            {parcel.arrivedByStaff && (
                              <div className="text-[10px] text-slate-400">ໂດຍ: {parcel.arrivedByStaff}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">ລໍຖ້າສະແກນ</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{parcel.notes || '-'}</td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(parcel)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="ແກ້ໄຂຂໍ້ມູນພັດສະດຸ"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {parcel.status === 'in_branch' && onNavigateTab && (
                            <button
                              onClick={() => onNavigateTab('customer_checkout')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1 transition"
                              title="ໄປໜ້າຈ່າຍເຄື່ອງໃຫ້ລູກຄ້າ"
                            >
                              <span>ຈ່າຍເຄື່ອງ</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirmParcel(parcel)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="ລຶບລາຍການ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Edit Parcel Modal */}
      {editingParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  ແກ້ໄຂຂໍ້ມູນພັດສະດຸ: {editingParcel.parcelCode}
                </h3>
              </div>
              <button
                onClick={() => setEditingParcel(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. ວັນທີ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">1. ວັນທີ</label>
                  <input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* 2. ຊື່ລູກຄ້າ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">2. ຊື່ລູກຄ້າ</label>
                  <input
                    type="text"
                    value={editFormData.customerName}
                    onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                    required
                  />
                </div>

                {/* 3. ເບີໂທ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">3. ເບີໂທ</label>
                  <input
                    type="text"
                    value={editFormData.customerPhone}
                    onChange={(e) => setEditFormData({ ...editFormData, customerPhone: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 4. ລະຫັດຂົນສົ່ງ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">4. ລະຫັດຂົນສົ່ງ</label>
                  <input
                    type="text"
                    value={editFormData.shippingCode}
                    onChange={(e) => setEditFormData({ ...editFormData, shippingCode: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono uppercase"
                    required
                  />
                </div>

                {/* 5. ລະຫັດເຄື່ອງ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">5. ລະຫັດເຄື່ອງ</label>
                  <input
                    type="text"
                    value={editFormData.parcelCode}
                    onChange={(e) => setEditFormData({ ...editFormData, parcelCode: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono uppercase font-bold text-indigo-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 6. ນໍ້າໜັກ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">6. ນໍ້າໜັກ (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.weightKg}
                    onChange={(e) => setEditFormData({ ...editFormData, weightKg: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono"
                  />
                </div>

                {/* 9. ບໍລິມາດ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">9. ບໍລິມາດ (m³)</label>
                  <input
                    type="text"
                    value={editFormData.volumeCbm}
                    onChange={(e) => setEditFormData({ ...editFormData, volumeCbm: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono"
                  />
                </div>

                {/* 7. ລາຄາ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">7. ລາຄາເກັບລູກຄ້າ (₭)</label>
                  <input
                    type="number"
                    value={editFormData.customerPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, customerPrice: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono font-bold text-slate-900"
                    required
                  />
                </div>

                {/* 8. ຕົ້ນທຶນ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">8. ຕົ້ນທຶນສາງ (₭)</label>
                  <input
                    type="number"
                    value={editFormData.warehouseCost}
                    onChange={(e) => setEditFormData({ ...editFormData, warehouseCost: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono font-bold text-amber-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 10. ຕົ້ນທຶນຢວນ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">10. ຕົ້ນທຶນສະກຸນເງິນຢວນ (¥)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editFormData.warehouseCostYuan}
                    onChange={(e) => setEditFormData({ ...editFormData, warehouseCostYuan: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono text-purple-700"
                  />
                </div>

                {/* ສະຖານະ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ສະຖານະພັດສະດຸ</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-bold"
                  >
                    <option value="pending_arrival">ຍັງບໍ່ຮອດສາຂາ (Pending)</option>
                    <option value="in_branch">ຮອດສາຂາແລ້ວ (In Branch)</option>
                    <option value="delivered">ມອບໃຫ້ລູກຄ້າແລ້ວ (Delivered)</option>
                  </select>
                </div>
              </div>

              {/* 11. ໝາຍເຫດ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">11. ໝາຍເຫດ</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingParcel(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  ບັນທຶກການແກ້ໄຂ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              ຢືນຢັນການລຶບພັດສະດຸ?
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              ທ່ານຕ້ອງການລຶບພັດສະດຸລະຫັດ <strong className="font-mono text-slate-800">{deleteConfirmParcel.parcelCode}</strong> ({deleteConfirmParcel.customerName}) ແທ້ບໍ່?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmParcel(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                ຍົກເລີກ
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteParcel(deleteConfirmParcel.id);
                  setDeleteConfirmParcel(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                ລຶບລາຍການ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
