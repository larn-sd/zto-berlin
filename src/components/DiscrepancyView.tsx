import React, { useState } from 'react';
import { 
  GitCompare, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  Download, 
  Search, 
  Clock, 
  ShieldAlert, 
  DollarSign, 
  Phone,
  FileSpreadsheet,
  Edit3,
  Trash2,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportDiscrepanciesToExcel, formatDateDisplay } from '../utils/excel';
import { WarehouseParcel } from '../types';

export const DiscrepancyView: React.FC = () => {
  const { parcels, updateParcel, deleteParcel } = useApp();
  const [activeTab, setActiveTab] = useState<'missing' | 'unmanifested' | 'matched'>('missing');
  const [searchTerm, setSearchTerm] = useState('');

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

  // 1. Missing parcels: in warehouse manifest (ຂໍ້ 2), but NOT scanned into branch (ຂໍ້ 3) -> "ເຄື່ອງບໍ່ເຫັນ"
  const missingParcels = parcels.filter(p => p.status === 'pending_arrival');

  // 2. Unmanifested parcels: scanned into branch, but NOT in warehouse manifest -> "ສາງໃຫຍ່ລືມສະແກນ"
  const unmanifestedParcels = parcels.filter(
    p => p.isUnmanifested || p.status === 'unmanifested' || p.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ')
  );

  // 3. Matched & received at branch: in warehouse manifest AND arrived/delivered
  const receivedParcels = parcels.filter(
    p => !p.isUnmanifested && !p.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ') && (p.status === 'in_branch' || p.status === 'delivered')
  );

  // Total financial value of missing items (Warehouse deducted cost)
  const totalMissingCost = missingParcels.reduce((sum, p) => sum + (p.warehouseCost || 0), 0);
  const totalMissingCustomerPrice = missingParcels.reduce((sum, p) => sum + (p.customerPrice || 0), 0);

  const formatKip = (val: number) => {
    return new Intl.NumberFormat('lo-LA').format(val) + ' ₭';
  };

  const handleExport = () => {
    exportDiscrepanciesToExcel(missingParcels, unmanifestedParcels, receivedParcels);
  };

  // Filter based on active tab and search
  const currentList = 
    activeTab === 'missing' ? missingParcels :
    activeTab === 'unmanifested' ? unmanifestedParcels :
    receivedParcels;

  const filteredList = currentList.filter(p => 
    p.parcelCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.shippingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.customerPhone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold mb-2 border border-rose-200">
            <GitCompare className="w-3.5 h-3.5" />
            <span>ຂໍ້ 4: ລະບົບສົມທຽບສາງໃຫຍ່ (ຂໍ້ 2) ກັບ ສາຂາ (ຂໍ້ 3)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            ກວດສອບເຄື່ອງຕົກຄ້າງ & ຜິດດ່ຽງ (Discrepancy Audit)
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            ແຍກລະອຽດ: <strong>ເຄື່ອງບໍ່ເຫັນ</strong> (ມີໃນສາງໃຫຍ່ ແຕ່ຍັງບໍ່ຮອດສາຂາ) ແລະ <strong>ສາງໃຫຍ່ລືມສະແກນ</strong> (ເຄື່ອງເກີນຢູ່ສາຂາ)
          </p>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export ລາຍງານທຽບເຄື່ອງ (Excel)</span>
        </button>
      </div>

      {/* 3 Summary Comparison Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Missing Parcels (ເຄື່ອງບໍ່ເຫັນ) */}
        <div 
          onClick={() => setActiveTab('missing')}
          className={`p-5 rounded-2xl border-2 transition cursor-pointer ${
            activeTab === 'missing' 
              ? 'bg-rose-50/80 border-rose-500 shadow-md' 
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">1. ເຄື່ອງບໍ່ເຫັນ (Missing)</h4>
                <div className="text-[11px] text-rose-700 font-semibold">ມີໃນສາງໃຫຍ່ ແຕ່ບໍ່ສະແກນເຂົ້າສາຂາ</div>
              </div>
            </div>
            <span className="text-2xl font-black text-rose-700">{missingParcels.length}</span>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-200/60 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>ຕົ້ນທຶນທີ່ສາງຕັດໄປແລ້ວ:</span>
              <span className="font-bold text-rose-700">{formatKip(totalMissingCost)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>ຍອດເກັບລູກຄ້າທີ່ຄ້າງ:</span>
              <span className="font-semibold text-slate-800">{formatKip(totalMissingCustomerPrice)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Unmanifested Parcels (ສາງໃຫຍ່ລືມສະແກນ) */}
        <div 
          onClick={() => setActiveTab('unmanifested')}
          className={`p-5 rounded-2xl border-2 transition cursor-pointer ${
            activeTab === 'unmanifested' 
              ? 'bg-purple-50/80 border-purple-500 shadow-md' 
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">2. ສາງໃຫຍ່ລືມສະແກນ</h4>
                <div className="text-[11px] text-purple-700 font-semibold">ສະແກນເຂົ້າສາຂາ ແຕ່ສາງໃຫຍ່ບໍ່ມີ</div>
              </div>
            </div>
            <span className="text-2xl font-black text-purple-700">{unmanifestedParcels.length}</span>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-200/60 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>ສະຖານະຕົ້ນທຶນສາງ:</span>
              <span className="font-bold text-emerald-700">0 ₭ (ສາງບໍ່ໄດ້ຕັດ)</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>ພົບຕົວຈິງຢູ່ສາຂາ:</span>
              <span className="font-semibold text-slate-800">ເຄື່ອງເກີນ / ເກັບເງິນໄດ້ເຕັມ</span>
            </div>
          </div>
        </div>

        {/* Card 3: Matched & Received (ເຄື່ອງຮອດສາຂາຖືກຕ້ອງ) */}
        <div 
          onClick={() => setActiveTab('matched')}
          className={`p-5 rounded-2xl border-2 transition cursor-pointer ${
            activeTab === 'matched' 
              ? 'bg-emerald-50/80 border-emerald-500 shadow-md' 
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">3. ເຄື່ອງຮອດສາຂາຖືກຕ້ອງ</h4>
                <div className="text-[11px] text-emerald-700 font-semibold">ກົງກັນທັງສາງໃຫຍ່ ແລະ ສາຂາ</div>
              </div>
            </div>
            <span className="text-2xl font-black text-emerald-700">{receivedParcels.length}</span>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-200/60 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>ອັດຕາຄວາມຖືກຕ້ອງ:</span>
              <span className="font-bold text-emerald-700">
                {parcels.length > 0 ? Math.round((receivedParcels.length / parcels.length) * 100) : 100}%
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>ລໍຖ້າຈ່າຍ / ມອບແລ້ວ:</span>
              <span className="font-semibold text-slate-800">ພ້ອມບໍລິການ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Discrepancy Insight Banner */}
      {activeTab === 'missing' && (
        <div className="p-4 rounded-2xl bg-rose-100/70 border border-rose-300 text-rose-950 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">ຄຳແນະນຳສຳລັບເຄື່ອງບໍ່ເຫັນ:</span> ສາງໃຫຍ່ຕັດເງິນຕົ້ນທຶນທ່ານໄປແລ້ວ{' '}
              <strong className="underline">{formatKip(totalMissingCost)}</strong> ແຕ່ເຄື່ອງຕົວຈິງຍັງບໍ່ຮອດສາຂາ.
              ກະລຸນາ Export ລາຍການນີ້ໄປທວງຖາມ ຫຼື ເຄລມຄືນກັບສາງໃຫຍ່ທັນທີ.
            </div>
          </div>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0"
          >
            Export ສົ່ງໃຫ້ສາງໃຫຍ່
          </button>
        </div>
      )}

      {activeTab === 'unmanifested' && (
        <div className="p-4 rounded-2xl bg-purple-100/70 border border-purple-300 text-purple-950 text-xs flex items-center gap-2.5">
          <AlertOctagon className="w-5 h-5 text-purple-600 shrink-0" />
          <div>
            <span className="font-bold">ຄຳແນະນຳສຳລັບສາງໃຫຍ່ລືມສະແກນ:</span> ເຄື່ອງເຫຼົ່ານີ້ພົບຕົວຈິງຢູ່ສາຂາ ແຕ່ສາງໃຫຍ່ບໍ່ໄດ້ບັນທຶກມາ.
            ສາຂາສາມາດເກັບເງິນນຳລູກຄ້າໄດ້ປົກກະຕິ ແລະ ແຈ້ງສາງໃຫຍ່ໃຫ້ຮັບຮູ້.
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ຄົ້ນຫາລະຫັດເຄື່ອງ, ລະຫັດຂົນສົ່ງ, ລູກຄ້າ..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="text-xs font-bold text-slate-500">
          ສະແດງ {filteredList.length} ລາຍການ
        </div>
      </div>

      {/* Main Table for Selected Tab */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">ວັນທີ</th>
                <th className="py-3 px-4">ລະຫັດເຄື່ອງ (Tracking)</th>
                <th className="py-3 px-4">ລະຫັດຂົນສົ່ງ (Waybill)</th>
                <th className="py-3 px-4">ລາຄາສາງໃຫຍ່ຕັດ</th>
                <th className="py-3 px-4">ລາຄາເກັບລູກຄ້າ</th>
                <th className="py-3 px-4">ລູກຄ້າ & ເບີໂທ</th>
                <th className="py-3 px-4">ສະຖານະສົມທຽບ</th>
                <th className="py-3 px-4">ໝາຍເຫດ / ຂໍ້ຄວາມ</th>
                <th className="py-3 px-4 text-center">ຈັດການ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    ບໍ່ມີລາຍການໃນໝວດນີ້
                  </td>
                </tr>
              ) : (
                filteredList.map((parcel) => (
                  <tr key={parcel.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-slate-600 font-mono whitespace-nowrap">{formatDateDisplay(parcel.date)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      {parcel.parcelCode}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {parcel.shippingCode}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-700 whitespace-nowrap">
                      {formatKip(parcel.warehouseCost)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatKip(parcel.customerPrice)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{parcel.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{parcel.customerPhone}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {activeTab === 'missing' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>ເຄື່ອງບໍ່ເຫັນ (ຕົກຄ້າງ)</span>
                        </span>
                      )}
                      {activeTab === 'unmanifested' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          <AlertOctagon className="w-3 h-3 text-purple-600" />
                          <span>ສາງໃຫຍ່ລືມສະແກນ</span>
                        </span>
                      )}
                      {activeTab === 'matched' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>ຮອດສາຂາຖືກຕ້ອງ</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {parcel.notes || '-'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(parcel)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          title="ແກ້ໄຂຂໍ້ມູນພັດສະດຸ"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
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
                ))
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
