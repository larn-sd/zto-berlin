import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Download, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Calendar, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileCheck, 
  X, 
  Scale, 
  Box, 
  Coins,
  Edit3 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { parseExcelFile, downloadWarehouseExcelTemplate, ParsedRow, formatDateDisplay } from '../utils/excel';
import { WarehouseParcel } from '../types';

export const WarehouseInboundView: React.FC = () => {
  const { parcels, addWarehouseParcels, addSingleParcel, updateParcel, deleteParcel } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_arrival' | 'in_branch' | 'delivered'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [previewRows, setPreviewRows] = useState<ParsedRow[] | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for single parcel matching the 11 fields
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const rows = await parseExcelFile(file);
      if (rows.length === 0) {
        alert('ບໍ່ພົບຂໍ້ມູນພັດສະດຸໃນຟາຍ Excel ຫຼື ຫົວຖັນບໍ່ກົງກັບຮູບແບບທີ່ກຳນົດ. ກະລຸນາດາວໂຫລດ Template ຕົວຢ່າງ 11 ຖັນ.');
      } else {
        setPreviewRows(rows);
      }
    } catch (err: any) {
      alert('ເກີດຂໍ້ຜິດພາດໃນການອ່ານຟາຍ Excel: ' + (err?.message || 'Invalid format'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmImportPreview = () => {
    if (!previewRows) return;
    const itemsToAdd = previewRows.map(r => ({
      date: r.date || new Date().toISOString().split('T')[0],
      customerName: r.customerName || 'ລູກຄ້າບໍ່ລະບຸ',
      customerPhone: r.customerPhone || '',
      shippingCode: r.shippingCode || `EXP-${Date.now().toString().slice(-4)}`,
      parcelCode: r.parcelCode || `PKG-${Date.now().toString().slice(-4)}`,
      weightKg: r.weightKg !== undefined ? Number(r.weightKg) : undefined,
      customerPrice: Number(r.customerPrice) || 0,
      warehouseCost: Number(r.warehouseCost) || 0,
      volumeCbm: r.volumeCbm || undefined,
      warehouseCostYuan: r.warehouseCostYuan !== undefined ? Number(r.warehouseCostYuan) : undefined,
      notes: r.notes || ''
    }));

    const count = addWarehouseParcels(itemsToAdd);
    alert(`ນຳເຂົ້າສຳເລັດ ${count} ລາຍການຈາກ Excel ຕາມ 11 ຖັນ!`);
    setPreviewRows(null);
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parcelCode && !formData.shippingCode) {
      alert('ກະລຸນາປ້ອນລະຫັດເຄື່ອງ ຫຼື ລະຫັດຂົນສົ່ງ');
      return;
    }

    const pCode = (formData.parcelCode || '').trim().toUpperCase();
    const sCode = (formData.shippingCode || '').trim().toUpperCase();
    const finalParcelCode = pCode || sCode;
    const finalShippingCode = sCode || pCode;

    addSingleParcel({
      date: formData.date,
      customerName: formData.customerName || 'ລູກຄ້າ',
      customerPhone: formData.customerPhone,
      shippingCode: finalShippingCode,
      parcelCode: finalParcelCode,
      weightKg: formData.weightKg ? Number(formData.weightKg) : undefined,
      customerPrice: Number(formData.customerPrice) || 0,
      warehouseCost: Number(formData.warehouseCost) || 0,
      volumeCbm: formData.volumeCbm || undefined,
      warehouseCostYuan: formData.warehouseCostYuan ? Number(formData.warehouseCostYuan) : undefined,
      notes: formData.notes
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
  };

  // Only parcels sent by central warehouse (exclude unmanifested ones that central warehouse never scanned)
  const warehouseParcels = parcels.filter(p => !p.isUnmanifested && !p.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ'));

  // Filter parcels
  const filteredParcels = warehouseParcels.filter(p => {
    const matchesSearch = 
      p.parcelCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.shippingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customerPhone.includes(searchTerm);
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  });

  const formatKip = (val: number) => {
    return new Intl.NumberFormat('lo-LA').format(val) + ' ₭';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2 border border-indigo-200">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>ຂໍ້ 2: ເກັບກຳເຄື່ອງສາງໃຫຍ່ສະແກນມາ (11 ຖັນມາດຕະຖານ)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            ລາຍການພັດສະດຸຈາກສາງໃຫຍ່ (Warehouse Inbound)
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            ຈັດລຽງ 11 ຖັນ: <strong>ວັນທີ, ຊື່ລູກຄ້າ, ເບີໂທ, ລະຫັດຂົນສົ່ງ, ລະຫັດເຄື່ອງ, ນໍ້າໜັກ, ລາຄາ, ຕົ້ນທຶນ, ບໍລິມາດ, ຕົ້ນທຶນສະກຸນເງິນຢວນ, ໝາຍເຫດ</strong>
          </p>
        </div>

        {/* Action Buttons: Upload Excel, Template, Manual Add */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Template */}
          <button
            onClick={downloadWarehouseExcelTemplate}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition shadow-xs"
            title="ດາວໂຫລດຮູບແບບຟາຍ Excel 11 ຖັນ"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>ດາວໂຫລດ Template Excel (11 ຖັນ)</span>
          </button>

          {/* Upload Excel Button */}
          <label className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/30 transition">
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'ກຳລັງອ່ານ...' : 'ອັບໂຫລດ Excel ສາງໃຫຍ່'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
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
                <p className="text-xs text-slate-500 mt-0.5">ປ້ອນຂໍ້ມູນຕາມລຳດັບມາດຕະຖານ 11 ຖັນ</p>
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
                    placeholder="ສົມສັກ ໄຊຍະວົງ"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">3. ເບີໂທ</label>
                  <input
                    type="text"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="02055112233"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* 4. ລະຫັດຂົນສົ່ງ, 5. ລະຫັດເຄື່ອງ, 6. ນໍ້າໜັກ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">4. ລະຫັດຂົນສົ່ງ</label>
                  <input
                    type="text"
                    value={formData.shippingCode}
                    onChange={(e) => setFormData({ ...formData, shippingCode: e.target.value })}
                    placeholder="EXP-LA-102"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">5. ລະຫັດເຄື່ອງ (Tracking)</label>
                  <input
                    type="text"
                    value={formData.parcelCode}
                    onChange={(e) => setFormData({ ...formData, parcelCode: e.target.value })}
                    placeholder="PKG-88102"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white uppercase font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">6. ນໍ້າໜັກ (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weightKg}
                    onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                    placeholder="1.5"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* 7. ລາຄາ, 8. ຕົ້ນທຶນ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">7. ລາຄາເກັບນໍາລູກຄ້າ (₭)</label>
                  <input
                    type="number"
                    value={formData.customerPrice}
                    onChange={(e) => setFormData({ ...formData, customerPrice: e.target.value })}
                    placeholder="25000"
                    className="w-full p-2.5 border border-emerald-200 rounded-xl text-xs bg-emerald-50/40 focus:bg-white font-mono font-bold text-emerald-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-800 mb-1">8. ຕົ້ນທຶນທີ່ສາງໃຫຍ່ຕັດ (₭)</label>
                  <input
                    type="number"
                    value={formData.warehouseCost}
                    onChange={(e) => setFormData({ ...formData, warehouseCost: e.target.value })}
                    placeholder="15000"
                    className="w-full p-2.5 border border-amber-200 rounded-xl text-xs bg-amber-50/40 focus:bg-white font-mono font-bold text-amber-900"
                    required
                  />
                </div>
              </div>

              {/* 9. ບໍລິມາດ (ເປົ່າຫວ່າງໄດ້), 10. ຕົ້ນທຶນສະກຸນເງິນຢວນ (ເປົ່າຫວ່າງໄດ້) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Box className="w-3.5 h-3.5 text-slate-500" />
                    <span>9. ບໍລິມາດ (m³) (ເປົ່າຫວ່າງໄດ້)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.volumeCbm}
                    onChange={(e) => setFormData({ ...formData, volumeCbm: e.target.value })}
                    placeholder="ເຊັ່ນ: 0.05"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-purple-600" />
                    <span>10. ຕົ້ນທຶນສະກຸນເງິນຢວນ (¥) (ເປົ່າຫວ່າງໄດ້)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.warehouseCostYuan}
                    onChange={(e) => setFormData({ ...formData, warehouseCostYuan: e.target.value })}
                    placeholder="ເຊັ່ນ: 12.50"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-purple-800"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    ກໍລະນີເຄື່ອງໃຫຍ່ສາງໃຫຍ່ໄລ່ທຶນເປັນເງິນຢວນ
                  </span>
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

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
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
            ທັງໝົດ ({warehouseParcels.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending_arrival')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'pending_arrival' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ຍັງບໍ່ຮອດສາຂາ ({warehouseParcels.filter(p => p.status === 'pending_arrival').length})
          </button>
          <button
            onClick={() => setStatusFilter('in_branch')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'in_branch' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ຮອດສາຂາແລ້ວ ({warehouseParcels.filter(p => p.status === 'in_branch').length})
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'delivered' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ມອບແລ້ວ ({warehouseParcels.filter(p => p.status === 'delivered').length})
          </button>
        </div>
      </div>

      {/* Main Parcels Table - arranged according to the 11 columns */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">1. ວັນທີ</th>
                <th className="py-3 px-4">2. ຊື່ລູກຄ້າ</th>
                <th className="py-3 px-4">3. ເບີໂທ</th>
                <th className="py-3 px-4">4. ລະຫັດຂົນສົ່ງ</th>
                <th className="py-3 px-4">5. ລະຫັດເຄື່ອງ</th>
                <th className="py-3 px-4">6. ນໍ້າໜັກ / 9. ບໍລິມາດ</th>
                <th className="py-3 px-4">7. ລາຄາ (₭)</th>
                <th className="py-3 px-4">8. ຕົ້ນທຶນ (₭ / ¥)</th>
                <th className="py-3 px-4">ສ່ວນຕ່າງກໍາໄລ</th>
                <th className="py-3 px-4">ສະຖານະ</th>
                <th className="py-3 px-4">11. ໝາຍເຫດ</th>
                <th className="py-3 px-4 text-center">ຈັດການ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParcels.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-800 text-sm">
                        {parcels.length === 0 ? 'ຍັງບໍ່ມີພັດສະດຸໃນລະບົບ (ຂໍ້ມູນຖືກເຄຍແລ້ວ)' : 'ບໍ່ພົບລາຍການພັດສະດຸຕາມເງື່ອນໄຂ'}
                      </div>
                      <p className="text-xs text-slate-500">
                        ທ່ານສາມາດເລີ່ມຕົ້ນໂດຍການອັບໂຫລດຟາຍ Excel ຈາກສາງໃຫຍ່ ຫຼື ກົດປຸ່ມ "+ ເພີ່ມເຄື່ອງເອງ" ເພື່ອທົດລອງຄີຂໍ້ມູນຕາມ 11 ຖັນ
                      </p>
                      {parcels.length === 0 && (
                        <div className="flex justify-center gap-2 pt-2">
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ ຄີຂໍ້ມູນເຄື່ອງດຽວນີ້</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredParcels.map((parcel) => {
                  const profit = (parcel.customerPrice || 0) - (parcel.warehouseCost || 0);
                  return (
                    <tr key={parcel.id} className="hover:bg-slate-50/70 transition">
                      {/* 1. ວັນທີ */}
                      <td className="py-3 px-4 text-slate-600 font-mono">{formatDateDisplay(parcel.date)}</td>

                      {/* 2. ຊື່ລູກຄ້າ */}
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {parcel.customerName}
                      </td>

                      {/* 3. ເບີໂທ */}
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {parcel.customerPhone}
                      </td>

                      {/* 4. ລະຫັດຂົນສົ່ງ */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {parcel.shippingCode}
                      </td>

                      {/* 5. ລະຫັດເຄື່ອງ */}
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {parcel.parcelCode}
                      </td>

                      {/* 6. ນໍ້າໜັກ / 9. ບໍລິມາດ */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {parcel.weightKg ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px]">
                              <Scale className="w-3 h-3 text-slate-400" />
                              <span>{parcel.weightKg} kg</span>
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                          {parcel.volumeCbm && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[11px] border border-blue-200">
                              <Box className="w-3 h-3" />
                              <span>{parcel.volumeCbm} m³</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. ລາຄາ */}
                      <td className="py-3 px-4 font-mono text-slate-900 font-bold">
                        {formatKip(parcel.customerPrice)}
                      </td>

                      {/* 8. ຕົ້ນທຶນ (₭ / ¥) */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-amber-700 font-bold">
                          {formatKip(parcel.warehouseCost)}
                        </div>
                        {parcel.warehouseCostYuan !== undefined && (
                          <div className="text-[11px] font-mono font-bold text-purple-700 flex items-center gap-0.5 mt-0.5">
                            <Coins className="w-3 h-3" />
                            <span>¥{parcel.warehouseCostYuan} (ຢວນ)</span>
                          </div>
                        )}
                      </td>

                      {/* ສ່ວນຕ່າງກໍາໄລ */}
                      <td className="py-3 px-4 font-mono text-emerald-600 font-bold">
                        +{formatKip(profit)}
                      </td>

                      {/* ສະຖານະ */}
                      <td className="py-3 px-4">
                        {parcel.status === 'pending_arrival' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>ຍັງບໍ່ຮອດສາຂາ</span>
                          </span>
                        )}
                        {parcel.status === 'in_branch' && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            parcel.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ')
                              ? 'bg-purple-50 text-purple-700 border-purple-300'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{parcel.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ') ? 'ສາງໃຫຍ່ລືມສະແກນ (ຮອດສາຂາແລ້ວ)' : 'ຮອດສາຂາແລ້ວ'}</span>
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

                      {/* 11. ໝາຍເຫດ */}
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {parcel.notes || '-'}
                      </td>

                      {/* ຈັດການ: ແກ້ໄຂ & ລຶບ */}
                      <td className="py-3 px-4 text-center">
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Parcel Modal (11 ຖັນຄົບຖ້ວນ) */}
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
