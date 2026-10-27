import React, { useState, useRef, useEffect } from 'react';
import { 
  ScanLine, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Package, 
  Sparkles, 
  Search, 
  RotateCcw, 
  ShieldAlert, 
  Barcode, 
  User, 
  DollarSign,
  Plus,
  Boxes,
  FileSpreadsheet,
  Scale,
  Box,
  Download,
  Edit3,
  ShoppingBag,
  ArrowRight,
  Filter,
  Check,
  X,
  Trash2,
  Camera,
  Zap,
  QrCode
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { WarehouseParcel, TabKey } from '../types';
import { formatDateDisplay, exportToExcel } from '../utils/excel';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';
import { useBarcodeScannerGun } from '../hooks/useBarcodeScannerGun';
import { cleanScannedBarcode, isBarcodeMatch } from '../utils/barcode';

interface BranchScanViewProps {
  onNavigateTab?: (tab: TabKey) => void;
}

export const BranchScanView: React.FC<BranchScanViewProps> = ({ onNavigateTab }) => {
  const { 
    parcels, 
    scanArrivalCode, 
    registerUnmanifestedParcel, 
    updateParcel,
    deleteParcel,
    scanLogs,
    currentUser 
  } = useApp();

  const [inputCode, setInputCode] = useState('');
  const [inBranchSearch, setInBranchSearch] = useState('');
  const [inBranchFilter, setInBranchFilter] = useState<'all' | 'manifested' | 'unmanifested'>('all');
  const [viewMode, setViewMode] = useState<'split' | 'scanner' | 'list'>('split');
  const [deleteConfirmParcel, setDeleteConfirmParcel] = useState<WarehouseParcel | null>(null);

  const [lastResult, setLastResult] = useState<{
    status: 'idle' | 'success' | 'unmanifested' | 'already' | 'delivered';
    message: string;
    parcel?: WarehouseParcel;
    scannedCode?: string;
  }>({ status: 'idle', message: '' });

  // Modal for registering unmanifested item with ALL details
  const [showUnmanifestedModal, setShowUnmanifestedModal] = useState(false);
  const [unmanifestedError, setUnmanifestedError] = useState<string | null>(null);
  const [unmanifestedForm, setUnmanifestedForm] = useState({
    date: new Date().toISOString().split('T')[0],
    parcelCode: '',
    shippingCode: '',
    customerName: '',
    customerPhone: '',
    customerPrice: '20000',
    warehouseCost: '0',
    weightKg: '',
    volumeCbm: '',
    warehouseCostYuan: '',
    notes: 'ສາງໃຫຍ່ລືມສະແກນ - ພົບເຄື່ອງຕົວຈິງຢູ່ສາຂາ'
  });

  // Modal for editing existing in-branch parcel
  const [editingParcel, setEditingParcel] = useState<WarehouseParcel | null>(null);
  const [editFormData, setEditFormData] = useState({
    parcelCode: '',
    shippingCode: '',
    customerName: '',
    customerPhone: '',
    customerPrice: '',
    warehouseCost: '',
    notes: ''
  });

  // Camera Modal & Auto-register settings
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [autoRegisterMode, setAutoRegisterMode] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  // Global Hardware Barcode Scanner Gun Listener
  useBarcodeScannerGun({
    onScan: (scannedCode) => {
      triggerScan(scannedCode);
    },
    enabled: true
  });

  // Keep input focused for physical scanner
  useEffect(() => {
    inputRef.current?.focus();
  }, [lastResult, viewMode]);

  // Unified scan handler for both input submit and test buttons
  const triggerScan = (codeToScan: string) => {
    const raw = cleanScannedBarcode(codeToScan).toUpperCase();
    if (!raw) return;

    const result = scanArrivalCode(raw, { autoRegister: autoRegisterMode });

    if (result.success && result.parcel) {
      setLastResult({
        status: 'success',
        message: result.message,
        parcel: result.parcel,
        scannedCode: raw
      });
    } else if (result.type === 'unmanifested') {
      if (!autoRegisterMode) {
        // ⚠️ ALERT: Item is NOT in warehouse manifest!
        setLastResult({
          status: 'unmanifested',
          message: result.message,
          scannedCode: raw
        });
        setUnmanifestedForm({
          date: new Date().toISOString().split('T')[0],
          parcelCode: raw,
          shippingCode: raw,
          customerName: '',
          customerPhone: '',
          customerPrice: '20000',
          warehouseCost: '0',
          weightKg: '',
          volumeCbm: '',
          warehouseCostYuan: '',
          notes: 'ສາງໃຫຍ່ລືມສະແກນ - ພົບເຄື່ອງຕົວຈິງຢູ່ສາຂາ'
        });
        setShowUnmanifestedModal(true);
      }
    } else if (result.type === 'already_scanned') {
      setLastResult({
        status: 'already',
        message: result.message,
        parcel: result.parcel,
        scannedCode: raw
      });
    } else if (result.type === 'already_delivered') {
      setLastResult({
        status: 'delivered',
        message: result.message,
        parcel: result.parcel,
        scannedCode: raw
      });
    }

    setInputCode('');
    inputRef.current?.focus();
  };

  const handleScanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    triggerScan(inputCode);
  };

  // Quick save for unmanifested with standard defaults
  const handleQuickRegisterUnmanifested = (codeToRegister: string) => {
    const p = registerUnmanifestedParcel({
      date: new Date().toISOString().split('T')[0],
      parcelCode: codeToRegister,
      shippingCode: codeToRegister,
      customerName: 'ລູກຄ້າ',
      customerPhone: '',
      customerPrice: 20000,
      warehouseCost: 0,
      notes: 'ສາງໃຫຍ່ລືມສະແກນ - ພົບເຄື່ອງຕົວຈິງຢູ່ສາຂາ'
    });

    setLastResult({
      status: 'success',
      message: `ບັນທຶກດ່ວນເຂົ້າສາຂາສຳເລັດ: ${p.parcelCode} (ສາງໃຫຍ່ລືມສະແກນ)`,
      parcel: p,
      scannedCode: codeToRegister
    });

    setShowUnmanifestedModal(false);
  };

  // Full detailed save for unmanifested item
  const handleRegisterUnmanifested = (e: React.FormEvent) => {
    e.preventDefault();
    const pCode = unmanifestedForm.parcelCode.trim().toUpperCase() || unmanifestedForm.shippingCode.trim().toUpperCase();
    const sCode = unmanifestedForm.shippingCode.trim().toUpperCase() || unmanifestedForm.parcelCode.trim().toUpperCase();

    if (!pCode && !sCode) {
      setUnmanifestedError('ກະລຸນາປ້ອນລະຫັດເຄື່ອງ ຫຼື ລະຫັດຂົນສົ່ງ');
      return;
    }
    setUnmanifestedError(null);

    const p = registerUnmanifestedParcel({
      date: unmanifestedForm.date || new Date().toISOString().split('T')[0],
      parcelCode: pCode,
      shippingCode: sCode,
      customerName: unmanifestedForm.customerName.trim() || 'ລູກຄ້າ',
      customerPhone: unmanifestedForm.customerPhone.trim(),
      customerPrice: Number(unmanifestedForm.customerPrice) || 20000,
      warehouseCost: Number(unmanifestedForm.warehouseCost) || 0,
      weightKg: unmanifestedForm.weightKg ? Number(unmanifestedForm.weightKg) : undefined,
      volumeCbm: unmanifestedForm.volumeCbm.trim() || undefined,
      warehouseCostYuan: unmanifestedForm.warehouseCostYuan ? Number(unmanifestedForm.warehouseCostYuan) : undefined,
      notes: unmanifestedForm.notes.trim() || 'ສາງໃຫຍ່ລືມສະແກນ - ພົບເຄື່ອງຕົວຈິງຢູ່ສາຂາ'
    });

    setLastResult({
      status: 'success',
      message: `ບັນທຶກຂໍ້ມູນຄົບຖ້ວນ: ${p.parcelCode} (${p.customerName}) ເຂົ້າສາຂາຮຽບຮ້ອຍແລ້ວ!`,
      parcel: p,
      scannedCode: p.parcelCode
    });

    setShowUnmanifestedModal(false);
  };

  // Open Edit Parcel Modal
  const openEditModal = (parcel: WarehouseParcel) => {
    setEditingParcel(parcel);
    setEditFormData({
      parcelCode: parcel.parcelCode || '',
      shippingCode: parcel.shippingCode || '',
      customerName: parcel.customerName === 'ລູກຄ້າ (ສາງໃຫຍ່ລືມສະແກນ)' ? '' : (parcel.customerName || ''),
      customerPhone: parcel.customerPhone || '',
      customerPrice: String(parcel.customerPrice || 0),
      warehouseCost: String(parcel.warehouseCost || 0),
      notes: parcel.notes || ''
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParcel) return;

    const pCode = (editFormData.parcelCode || '').trim().toUpperCase();
    const sCode = (editFormData.shippingCode || '').trim().toUpperCase();

    updateParcel(editingParcel.id, {
      parcelCode: pCode || editingParcel.parcelCode,
      shippingCode: sCode || editingParcel.shippingCode,
      customerName: editFormData.customerName.trim() || 'ລູກຄ້າ',
      customerPhone: editFormData.customerPhone.trim(),
      customerPrice: Number(editFormData.customerPrice) || 0,
      warehouseCost: Number(editFormData.warehouseCost) || 0,
      notes: editFormData.notes.trim()
    });

    if (lastResult.parcel?.id === editingParcel.id) {
      setLastResult(prev => ({
        ...prev,
        parcel: {
          ...prev.parcel!,
          parcelCode: pCode || editingParcel.parcelCode,
          shippingCode: sCode || editingParcel.shippingCode,
          customerName: editFormData.customerName.trim() || 'ລູກຄ້າ',
          customerPhone: editFormData.customerPhone.trim(),
          customerPrice: Number(editFormData.customerPrice) || 0,
          warehouseCost: Number(editFormData.warehouseCost) || 0,
          notes: editFormData.notes.trim()
        }
      }));
    }

    setEditingParcel(null);
  };

  // Quick scan test cases
  const pendingParcels = parcels.filter(p => p.status === 'pending_arrival');
  const samplePendingParcelCode = pendingParcels[0]?.parcelCode;
  const samplePendingShippingCode = pendingParcels[1]?.shippingCode;

  // In-Branch inventory
  const inBranchParcels = parcels.filter(p => p.status === 'in_branch');
  const manifestedInBranch = inBranchParcels.filter(p => !p.isUnmanifested && !p.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ'));
  const unmanifestedInBranch = inBranchParcels.filter(p => p.isUnmanifested || p.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ'));

  const totalRevenueInBranch = inBranchParcels.reduce((sum, p) => sum + (p.customerPrice || 0), 0);
  const totalCostInBranch = inBranchParcels.reduce((sum, p) => sum + (p.warehouseCost || 0), 0);

  const filteredInBranch = inBranchParcels.filter(p => {
    // Type filter
    if (inBranchFilter === 'manifested' && (p.isUnmanifested || p.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ'))) return false;
    if (inBranchFilter === 'unmanifested' && !(p.isUnmanifested || p.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ'))) return false;

    // Search filter
    if (!inBranchSearch.trim()) return true;
    const q = inBranchSearch.toLowerCase().trim();
    return (
      p.parcelCode.toLowerCase().includes(q) ||
      p.shippingCode.toLowerCase().includes(q) ||
      p.customerName.toLowerCase().includes(q) ||
      p.customerPhone.includes(q) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  const formatKip = (val: number) => {
    return new Intl.NumberFormat('lo-LA').format(val) + ' ₭';
  };

  // Export in-branch parcels to Excel
  const handleExportInBranch = () => {
    const data = filteredInBranch.map((p, idx) => ({
      'ລຳດັບ': idx + 1,
      'ວັນທີຮັບເຂົ້າ': formatDateDisplay(p.date),
      'ລະຫັດເຄື່ອງ': p.parcelCode,
      'ລະຫັດຂົນສົ່ງ': p.shippingCode,
      'ຊື່ລູກຄ້າ': p.customerName,
      'ເບີໂທ': p.customerPhone,
      'ລາຄາເກັບລູກຄ້າ (₭)': p.customerPrice,
      'ຕົ້ນທຶນສາງ (₭)': p.warehouseCost,
      'ເວລາສະແກນເຂົ້າ': p.arrivedAt || '',
      'ພະນັກງານສະແກນ': p.arrivedByStaff || '',
      'ປະເພດ': p.isUnmanifested || p.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ') ? 'ສາງໃຫຍ່ລືມສະແກນ (ຮັບເຂົ້າອັດຕະໂນມັດ)' : 'ມີໃນສາງໃຫຍ່',
      'ໝາຍເຫດ': p.notes || ''
    }));

    exportToExcel(data, `ລາຍການເຄື່ອງຢູ່ສາຂາ_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2 border border-blue-200">
            <ScanLine className="w-3.5 h-3.5" />
            <span>ຂໍ້ 3: ສະແກນເຄື່ອງເຂົ້າສາຂາ & ລາຍການເຄື່ອງຢູ່ສາຂາທັງໝົດ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            ສະແກນຮັບພັດສະດຸເຂົ້າສາຂາ (Branch Arrival & Inventory)
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            ສະແກນຮັບເຄື່ອງເຂົ້າສາຂາ: ລະບົບປ່ຽນສະຖານະເປັນ <strong>"ຮອດສາຂາແລ້ວ"</strong> ອັດຕະໂນມັດ, ຖ້າ <strong>"ສາງໃຫຍ່ລືມສະແກນ"</strong> ຈະເຂົ້າສາຂາທັນທີ ພ້ອມໃຫ້ລູກຄ້າມາຮັບ
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('parcel_tracking')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
              title="ໄປເບິ່ງລາຍການເຄື່ອງທັງໝົດ"
            >
              <Boxes className="w-4 h-4 text-indigo-600" />
              <span>ຕິດຕາມເຄື່ອງທັງໝົດ</span>
            </button>
          )}

          <div className="text-right sm:pl-3 sm:border-l border-slate-200">
            <div className="text-[11px] text-slate-400">ພະນັກງານປະຈຳ:</div>
            <div className="font-bold text-slate-800 text-xs sm:text-sm">{currentUser?.name}</div>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards for Branch Inventory */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => { setViewMode('list'); setInBranchFilter('all'); }}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 transition cursor-pointer shadow-xs"
        >
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Boxes className="w-4 h-4 text-indigo-600" />
            <span>ເຄື່ອງຢູ່ສາຂາທັງໝົດ</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{inBranchParcels.length} <span className="text-xs font-normal text-slate-400">ຊິ້ນ</span></div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">ພ້ອມຈ່າຍລູກຄ້າ</div>
        </div>

        <div 
          onClick={() => { setViewMode('list'); setInBranchFilter('manifested'); }}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition cursor-pointer shadow-xs"
        >
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>ມີໃນສາງໃຫຍ່</span>
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{manifestedInBranch.length} <span className="text-xs font-normal text-slate-400">ຊິ້ນ</span></div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">ຖືກຕ້ອງຕາມໃບບິນ</div>
        </div>

        <div 
          onClick={() => { setViewMode('list'); setInBranchFilter('unmanifested'); }}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-purple-300 transition cursor-pointer shadow-xs"
        >
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-purple-600" />
            <span>ສາງໃຫຍ່ລືມສະແກນ</span>
          </div>
          <div className="text-2xl font-black text-purple-700 mt-1">{unmanifestedInBranch.length} <span className="text-xs font-normal text-slate-400">ຊິ້ນ</span></div>
          <div className="text-[11px] text-purple-600 font-semibold mt-0.5">ເຄື່ອງເກີນຢູ່ສາຂາ</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>ຍອດເກັບລູກຄ້າລວມ</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{formatKip(totalRevenueInBranch)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">ຕົ້ນທຶນ: {formatKip(totalCostInBranch)}</div>
        </div>
      </div>

      {/* Main Scanner Console (visible in 'split' or 'scanner' mode) */}
      {(viewMode === 'split' || viewMode === 'scanner') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Input & Result Card */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <span className="text-xs uppercase font-bold text-indigo-300 tracking-wider flex items-center gap-2">
                    <Barcode className="w-4 h-4" />
                    <span>ຊ່ອງສະແກນບາໂຄດ (Barcode Scanner Ready)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>ພ້ອມຮັບສັນຍານເຄື່ອງຍິງ (HID Gun)</span>
                    </span>
                  </div>
                </div>

                {/* Form Input + Camera Button */}
                <form onSubmit={handleScanSubmit} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value)}
                        placeholder="ຍິງບາໂຄດດ້ວຍເຄື່ອງຍິງ ຫຼື ພິມລະຫັດ..."
                        className="w-full pl-5 pr-28 py-4 bg-slate-800/90 border-2 border-indigo-500/60 focus:border-indigo-400 rounded-2xl text-base sm:text-lg font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition shadow-inner"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="absolute right-2 top-2 bottom-2 px-5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <ScanLine className="w-4 h-4" />
                        <span>ສະແກນ</span>
                      </button>
                    </div>

                    {/* Camera Scanner Button */}
                    <button
                      type="button"
                      onClick={() => setShowCameraModal(true)}
                      className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl transition shadow-lg flex items-center justify-center gap-2 border border-emerald-400/30 cursor-pointer shrink-0"
                    >
                      <Camera className="w-5 h-5 text-emerald-200" />
                      <span>ເປີດກ້ອງສະແກນ (Camera)</span>
                    </button>
                  </div>

                  {/* Auto-Register Toggle Option */}
                  <div className="flex items-center justify-between bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-700/80 text-xs">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>ຮັບເຂົ້າສາຂາອັດຕະໂນມັດ (Auto Check-In)</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">ແນະນຳ</span>
                        </div>
                        <p className="text-[11px] text-slate-400">ເຖິງສາງໃຫຍ່ຈະລືມສະແກນ ລະບົບຈະຮັບເຂົ້າສາຂາໃຫ້ທັນທີ ສະແກນຕໍ່ເນື່ອງບໍ່ສະດຸດ</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                      <input
                        type="checkbox"
                        checked={autoRegisterMode}
                        onChange={(e) => setAutoRegisterMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </form>

                {/* Helper Quick-Test buttons for easy preview */}
                <div className="mt-5 pt-4 border-t border-slate-800">
                  <div className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>ກົດປຸ່ມທົດສອບສະແກນຕົວຢ່າງ (One-Click Test):</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {samplePendingParcelCode && (
                      <button
                        onClick={() => triggerScan(samplePendingParcelCode)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-900/60 border border-slate-700 text-xs font-mono text-indigo-300 hover:text-white transition"
                      >
                        ✓ ທຽບລະຫັດເຄື່ອງ: {samplePendingParcelCode}
                      </button>
                    )}

                    {samplePendingShippingCode && (
                      <button
                        onClick={() => triggerScan(samplePendingShippingCode)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-900/60 border border-slate-700 text-xs font-mono text-cyan-300 hover:text-white transition"
                      >
                        ✓ ທຽບລະຫັດຂົນສົ່ງ: {samplePendingShippingCode}
                      </button>
                    )}

                    <button
                      onClick={() => triggerScan('77130496046222')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-500/60 text-xs font-mono font-bold text-amber-300 hover:text-white transition flex items-center gap-1.5 shadow-sm"
                    >
                      <span>⚡ ທົດສອບ: 77130496046222 (ສາງໃຫຍ່ລືມ)</span>
                    </button>

                    <button
                      onClick={() => triggerScan(`PKG-NEW-${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-xs font-mono text-purple-300 hover:text-white transition"
                    >
                      + ທົດສອບລະຫັດອື່ນ (ສາງໃຫຍ່ລືມ)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Scan Result Card */}
            {lastResult.status === 'idle' && (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400">
                <ScanLine className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-1 animate-pulse" />
                <div className="font-bold text-slate-700 text-sm">ກະລຸນາເລີ່ມສະແກນພັດສະດຸ</div>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  ເມື່ອຍິງບາໂຄດ ລະບົບຈະກວດສອບທັນທີ. ຖ້າສາງໃຫຍ່ລືມສະແກນ ລະບົບຈະບັນທຶກເຂົ້າສາຂາ ແລະ ສາມາດສະແກນຈ່າຍລູກຄ້າໄດ້ທັນທີ
                </p>
              </div>
            )}

            {/* Result 1: SUCCESS MATCHED */}
            {lastResult.status === 'success' && lastResult.parcel && (
              <div className="bg-emerald-50 rounded-3xl p-6 sm:p-8 border-2 border-emerald-400 shadow-md">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {lastResult.parcel.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ') || lastResult.parcel.isUnmanifested ? (
                        <>
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-700 text-white text-[11px] font-bold uppercase tracking-wider">
                            ⚠ ສາງໃຫຍ່ລືມສະແກນ
                          </span>
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider">
                            ✓ ຮັບເຂົ້າສາຂາອັດຕະໂນມັດ (In Branch)
                          </span>
                        </>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider">
                          ✓ ຮອດສາຂາແລ້ວ (In Branch)
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-emerald-950">
                      {lastResult.message}
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-emerald-200/80 text-xs">
                      <div>
                        <span className="text-emerald-700 font-medium">ລະຫັດເຄື່ອງ:</span>
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {lastResult.parcel.parcelCode}
                        </div>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-medium">ລະຫັດຂົນສົ່ງ:</span>
                        <div className="font-mono text-slate-900 font-semibold">
                          {lastResult.parcel.shippingCode}
                        </div>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-medium">ລູກຄ້າ:</span>
                        <div className="font-bold text-slate-900">
                          {lastResult.parcel.customerName}
                        </div>
                        <div className="font-mono text-slate-600 text-[11px]">
                          {lastResult.parcel.customerPhone || 'ບໍ່ມີເບີໂທ'}
                        </div>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-medium">ຕົ້ນທຶນສາງໃຫຍ່:</span>
                        <div className="font-bold text-amber-800">
                          {formatKip(lastResult.parcel.warehouseCost)}
                        </div>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-medium">ລາຄາເກັບລູກຄ້າ:</span>
                        <div className="font-bold text-emerald-900 text-sm">
                          {formatKip(lastResult.parcel.customerPrice)}
                        </div>
                      </div>
                      <div>
                        <span className="text-emerald-700 font-medium">ເວລາສະແກນເຂົ້າ:</span>
                        <div className="text-slate-800">
                          {lastResult.parcel.arrivedAt || 'ມື້ນີ້'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-emerald-200/80 flex flex-wrap gap-2 items-center justify-between">
                      <span className="text-xs text-emerald-800 font-medium">
                        ✓ ເຄື່ອງຢູ່ໃນສາງສາຂາແລ້ວ ສາມາດສະແກນຈ່າຍລູກຄ້າໄດ້ທັນທີ
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(lastResult.parcel!)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-emerald-300 shadow-xs flex items-center gap-1 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                          <span>ແກ້ໄຂຊື່ລູກຄ້າ / ລາຄາ</span>
                        </button>
                        {onNavigateTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateTab('customer_checkout')}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-700/30 flex items-center gap-1.5 transition"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>ໄປໜ້າຈ່າຍເຄື່ອງ</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Result 2: UNMANIFESTED (ສາງໃຫຍ່ລືມສະແກນ) - Prominent Warning Alert */}
            {lastResult.status === 'unmanifested' && (
              <div className="bg-amber-50 rounded-3xl p-6 sm:p-8 border-2 border-amber-400 shadow-md">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-600 text-white text-[11px] font-bold uppercase tracking-wider">
                        ⚠️ ແຈ້ງເຕືອນ: ເຄື່ອງບໍ່ມີຢູ່ໃນສາງໃຫຍ່
                      </span>
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-[11px] font-bold">
                        ສາງໃຫຍ່ລືມສະແກນ
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-amber-950">
                      {lastResult.message}
                    </h3>
                    <p className="text-amber-900 text-xs mt-1.5 leading-relaxed">
                      ພັດສະດຸລະຫັດ <span className="font-mono font-bold bg-amber-200/70 px-1.5 py-0.5 rounded text-amber-950">{lastResult.scannedCode}</span> ບໍ່ພົບໃນໃບບັນຊີທີ່ສາງໃຫຍ່ສົ່ງມາ (ຂໍ້ 2). ສາຂາສາມາດປ້ອນລາຍລະອຽດຂໍ້ມູນ (ຊື່, ເບີໂທ, ລາຄາ, ນໍ້າໜັກ) ເພື່ອຮັບເຂົ້າສາງສາຂາ ແລະ ສະແກນຈ່າຍລູກຄ້າໄດ້ທັນທີ!
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2.5 items-center">
                      <button
                        onClick={() => setShowUnmanifestedModal(true)}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>ປ້ອນລາຍລະອຽດຂໍ້ມູນຄົບຖ້ວນ & ບັນທຶກ</span>
                      </button>

                      {lastResult.scannedCode && (
                        <button
                          onClick={() => handleQuickRegisterUnmanifested(lastResult.scannedCode!)}
                          className="px-4 py-2.5 bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-xl border border-amber-300 transition"
                        >
                          ⚡ ບັນທຶກດ່ວນ (20,000 ₭)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Result 3: ALREADY SCANNED */}
            {lastResult.status === 'already' && (
              <div className="bg-amber-50 rounded-3xl p-6 border border-amber-300">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">ສະແກນຊໍ້າ (Already In Branch)</h4>
                    <p className="text-amber-800 text-xs mt-0.5">{lastResult.message}</p>
                    {lastResult.parcel && (
                      <div className="text-xs text-amber-700 mt-2 font-mono flex items-center gap-3">
                        <span>ລູກຄ້າ: {lastResult.parcel.customerName} ({lastResult.parcel.customerPhone || 'ບໍ່ມີເບີ'})</span>
                        {onNavigateTab && (
                          <button
                            onClick={() => onNavigateTab('customer_checkout')}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition"
                          >
                            ໄປໜ້າຈ່າຍເຄື່ອງ &rarr;
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Result 4: DELIVERED */}
            {lastResult.status === 'delivered' && (
              <div className="bg-blue-50 rounded-3xl p-6 border border-blue-300">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm">ເຄື່ອງມອບໃຫ້ລູກຄ້າແລ້ວ (Delivered)</h4>
                    <p className="text-blue-800 text-xs mt-0.5">{lastResult.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Recent Scans Stream */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-slate-800 text-sm">
                  ປະຫວັດການສະແກນລ່າສຸດ ({scanLogs.length})
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">ມື້ນີ້</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 mt-2 space-y-1">
              {scanLogs.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  ຍັງບໍ່ມີປະຫວັດການສະແກນໃນຮອບນີ້
                </div>
              ) : (
                scanLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{log.scannedCode}</span>
                        {log.isUnmanifested ? (
                          <span className="px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-800 text-[10px] font-bold">
                            ສາງໃຫຍ່ລືມ
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            ກົງກັບ: {log.matchedField === 'parcelCode' ? 'ລະຫັດເຄື່ອງ' : 'ລະຫັດຂົນສົ່ງ'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {log.scanTime} • ໂດຍ: {log.staffName}
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick link to All Parcels Tracking (duplicate table removed as requested) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm sm:text-base">
              ລາຍການພັດສະດຸທັງໝົດ (ເກັບໄວ້ທີ່ໜ້າ "ຕິດຕາມເຄື່ອງທັງໝົດ")
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ເຄື່ອງທັງໝົດທີ່ສະແກນເຂົ້າສາຂາແລ້ວ: <strong className="text-indigo-600 font-mono font-bold">{inBranchParcels.length}</strong> ຊິ້ນ (ລວມສາງໃຫຍ່ລືມ: <span className="font-mono font-bold text-purple-700">{unmanifestedInBranch.length}</span> ຊິ້ນ)
            </p>
          </div>
        </div>

        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('parcel_tracking')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
          >
            <span>ເບິ່ງລາຍການໃນໜ້າຕິດຕາມເຄື່ອງ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Modal to Register Unmanifested Parcel with Complete 11 Details */}
      {showUnmanifestedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    ເພີ່ມເຄື່ອງທີ່ສາງໃຫຍ່ລືມສະແກນ (ປ້ອນຂໍ້ມູນຄົບຖ້ວນ)
                  </h3>
                  <p className="text-[11px] text-amber-700 font-medium">
                    ⚠️ ລະຫັດນີ້ບໍ່ມີໃນລາຍການທີ່ສາງໃຫຍ່ສົ່ງມາ — ສາຂາຮັບເຂົ້າ ແລະ ປ້ອນລາຍລະອຽດ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUnmanifestedModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Alert Notice inside Modal */}
            <div className="my-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong>ແຈ້ງເຕືອນ:</strong> ພົບເຄື່ອງຕົວຈິງຢູ່ສາຂາ ແຕ່ສາງໃຫຍ່ບໍ່ໄດ້ສະແກນສົ່ງມາ. ທ່ານສາມາດປ້ອນລາຍລະອຽດທັງໝົດດ້ານລຸ່ມນີ້ ເພື່ອບັນທຶກເຂົ້າສາຂາ ແລະ ສະແກນຈ່າຍເງິນໃຫ້ລູກຄ້າໄດ້ທັນທີ.
              </div>
            </div>

            {unmanifestedError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                ⚠️ {unmanifestedError}
              </div>
            )}

            <form onSubmit={handleRegisterUnmanifested} className="space-y-4">
              {/* Row 1: ວັນທີ, ລະຫັດເຄື່ອງ, ລະຫັດຂົນສົ່ງ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">1. ວັນທີຮັບເຂົ້າ</label>
                  <input
                    type="date"
                    value={unmanifestedForm.date}
                    onChange={(e) => setUnmanifestedForm({ ...unmanifestedForm, date: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-indigo-700 mb-1">2. ລະຫັດເຄື່ອງ (Tracking)</label>
                  <input
                    type="text"
                    value={unmanifestedForm.parcelCode}
                    onChange={(e) => setUnmanifestedForm({ ...unmanifestedForm, parcelCode: e.target.value })}
                    placeholder="PKG-88102"
                    className="w-full p-2.5 border-2 border-indigo-200 rounded-xl text-xs bg-indigo-50/30 focus:bg-white font-mono font-bold text-indigo-900 uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">3. ລະຫັດຂົນສົ່ງ (Waybill)</label>
                  <input
                    type="text"
                    value={unmanifestedForm.shippingCode}
                    onChange={(e) => setUnmanifestedForm({ ...unmanifestedForm, shippingCode: e.target.value })}
                    placeholder="EXP-LA-102"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono uppercase text-slate-800"
                  />
                </div>
              </div>

              {/* Row 2: ຊື່ລູກຄ້າ & ເບີໂທ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">4. ຊື່ລູກຄ້າ (ປ້ອນຊື່ ຫຼື ຊື່ເທິງກ່ອງ)</label>
                  <input
                    type="text"
                    value={unmanifestedForm.customerName}
                    onChange={(e) => setUnmanifestedForm({ ...unmanifestedForm, customerName: e.target.value })}
                    placeholder="ເຊັ່ນ: ນາງ ມຸກດາ, ທ້າວ ສົມພອນ..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">5. ເບີໂທລູກຄ້າ</label>
                  <input
                    type="text"
                    value={unmanifestedForm.customerPhone}
                    onChange={(e) => setUnmanifestedForm({ ...unmanifestedForm, customerPhone: e.target.value })}
                    placeholder="0205xxxxxxx ຫຼື 0207xxxxxxx"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono"
                  />
                </div>
              </div>

              {/* Row 3: ລາຄາເກັບລູກຄ້າ & ຕົ້ນທຶນສາງ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 mb-1">6. ລາຄາເກັບນໍາລູກຄ້າ (₭)</label>
                  <input
                    type="number"
                    value={unmanifestedForm.customerPrice}
                    onChange={(e) => setUnmanifestedForm({ ...unmanifestedForm, customerPrice: e.target.value })}
                    placeholder="20000"
                    className="w-full p-2.5 border border-emerald-200 rounded-xl text-xs bg-emerald-50/40 focus:bg-white font-mono font-bold text-emerald-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 mb-1">7. ຕົ້ນທຶນທີ່ສາງໃຫຍ່ຕັດ (₭)</label>
                  <input
                    type="number"
                    value={unmanifestedForm.warehouseCost}
                    onChange={(e) => setUnmanifestedForm({ ...unmanifestedForm, warehouseCost: e.target.value })}
                    placeholder="0 (ສາງໃຫຍ່ບໍ່ໄດ້ຕັດ)"
                    className="w-full p-2.5 border border-amber-200 rounded-xl text-xs bg-amber-50/40 focus:bg-white font-mono font-bold text-amber-900"
                  />
                </div>
              </div>

              {/* Row 4: ນໍ້າໜັກ, ບໍລິມາດ, ຕົ້ນທຶນຢວນ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-slate-500" />
                    <span>8. ນໍ້າໜັກ (kg)</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={unmanifestedForm.weightKg}
                    onChange={(e) => setUnmanifestedForm({ ...unmanifestedForm, weightKg: e.target.value })}
                    placeholder="ເຊັ່ນ: 1.2"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Box className="w-3.5 h-3.5 text-slate-500" />
                    <span>9. ບໍລິມາດ (m³)</span>
                  </label>
                  <input
                    type="text"
                    value={unmanifestedForm.volumeCbm}
                    onChange={(e) => setUnmanifestedForm({ ...unmanifestedForm, volumeCbm: e.target.value })}
                    placeholder="ເຊັ່ນ: 0.05"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">10. ຕົ້ນທຶນຢວນ (¥)</label>
                  <input
                    type="number"
                    value={unmanifestedForm.warehouseCostYuan}
                    onChange={(e) => setUnmanifestedForm({ ...unmanifestedForm, warehouseCostYuan: e.target.value })}
                    placeholder="0"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Row 5: ໝາຍເຫດ */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">11. ໝາຍເຫດ</label>
                <input
                  type="text"
                  value={unmanifestedForm.notes}
                  onChange={(e) => setUnmanifestedForm({ ...unmanifestedForm, notes: e.target.value })}
                  placeholder="ໝາຍເຫດເພີ່ມເຕີມ..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleQuickRegisterUnmanifested(unmanifestedForm.parcelCode || unmanifestedForm.shippingCode)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition"
                >
                  ⚡ ບັນທຶກດ່ວນ (ຄ່າເລີ່ມຕົ້ນ 20,000 ₭)
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setShowUnmanifestedModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    ຍົກເລີກ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ບັນທຶກຂໍ້ມູນຄົບຖ້ວນ & ຮັບເຂົ້າສາຂາ</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Editing Parcel Information */}
      {editingParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">ແກ້ໄຂຂໍ້ມູນພັດສະດຸ</h3>
              </div>
              <button
                onClick={() => setEditingParcel(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ລະຫັດເຄື່ອງ</label>
                  <input
                    type="text"
                    value={editFormData.parcelCode}
                    onChange={(e) => setEditFormData({ ...editFormData, parcelCode: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono uppercase font-bold text-indigo-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ລະຫັດຂົນສົ່ງ</label>
                  <input
                    type="text"
                    value={editFormData.shippingCode}
                    onChange={(e) => setEditFormData({ ...editFormData, shippingCode: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono uppercase text-slate-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ຊື່ລູກຄ້າ</label>
                <input
                  type="text"
                  value={editFormData.customerName}
                  onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                  placeholder="ປ້ອນຊື່ລູກຄ້າ..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ເບີໂທລູກຄ້າ</label>
                <input
                  type="text"
                  value={editFormData.customerPhone}
                  onChange={(e) => setEditFormData({ ...editFormData, customerPhone: e.target.value })}
                  placeholder="0205xxxxxxx"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ລາຄາເກັບລູກຄ້າ (₭)</label>
                  <input
                    type="number"
                    value={editFormData.customerPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, customerPrice: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ຕົ້ນທຶນສາງ (₭)</label>
                  <input
                    type="number"
                    value={editFormData.warehouseCost}
                    onChange={(e) => setEditFormData({ ...editFormData, warehouseCost: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ໝາຍເຫດ</label>
                <input
                  type="text"
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

      {/* Camera Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onScan={(code) => triggerScan(code)}
        title="ສະແກນຮັບເຄື່ອງເຂົ້າສາຂາ (Branch Inbound Scanner)"
        description="ຈໍ່ກ້ອງໃສ່ບາໂຄດ ຫຼື QR Code ເພື່ອຮັບເຄື່ອງເຂົ້າສາຂາທັນທີ"
      />
    </div>
  );
};
