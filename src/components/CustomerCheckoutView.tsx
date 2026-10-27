import React, { useState, useRef } from 'react';
import { 
  ShoppingBag, 
  ScanLine, 
  CreditCard, 
  Banknote, 
  Upload, 
  Trash2, 
  Plus, 
  Receipt, 
  ShieldCheck, 
  User, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { WarehouseParcel, CheckoutBill, PaymentMethod, isUserAdmin } from '../types';
import { ReceiptModal } from './ReceiptModal';
import { SAMPLE_TRANSFER_SLIP } from '../data/mockData';
import { areSameCustomer } from '../utils/customerHelper';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';
import { useBarcodeScannerGun } from '../hooks/useBarcodeScannerGun';
import { cleanScannedBarcode, isBarcodeMatch } from '../utils/barcode';
import { sound } from '../utils/audio';

export const CustomerCheckoutView: React.FC = () => {
  const { parcels, checkoutParcels, customers, scanArrivalCode, currentUser } = useApp();
  const isAdmin = isUserAdmin(currentUser);

  const [scanInput, setScanInput] = useState('');
  const [batchCodesInput, setBatchCodesInput] = useState('');
  const [showBatchBox, setShowBatchBox] = useState(false);

  // Cart of parcels currently selected for checkout
  const [cartItems, setCartItems] = useState<WarehouseParcel[]>([]);

  // Customer info for bill
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Payment configuration
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [transferBank, setTransferBank] = useState('BCEL One');
  const [transferRef, setTransferRef] = useState('');
  const [transferProofUrl, setTransferProofUrl] = useState<string>('');
  const [slipFileError, setSlipFileError] = useState('');

  // Completed bill modal state
  const [completedBill, setCompletedBill] = useState<CheckoutBill | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const slipInputRef = useRef<HTMLInputElement>(null);

  // Global Hardware Barcode Scanner Gun Listener
  useBarcodeScannerGun({
    onScan: (code) => {
      handleBarcodeScan(code);
    },
    enabled: true
  });

  // Available parcels in branch waiting for pickup
  const availableInBranch = parcels.filter(p => p.status === 'in_branch' || p.status === 'unmanifested');

  // Check if current checkout customer is VIP in Supabase
  const cleanPhoneDigits = customerPhone.replace(/[^0-9]/g, '');
  const matchedCustomer = customers.find(c => {
    const cPhoneDigits = (c.phone || '').replace(/[^0-9]/g, '');
    const phoneMatch = cleanPhoneDigits.length >= 6 && cPhoneDigits.length >= 6 && 
      (cleanPhoneDigits.endsWith(cPhoneDigits.slice(-8)) || cPhoneDigits.endsWith(cleanPhoneDigits.slice(-8)));
    const nameMatch = customerName && c.name && c.name.toLowerCase() === customerName.toLowerCase();
    return phoneMatch || nameMatch;
  });
  const isVipCustomer = Boolean(matchedCustomer?.isVip);

  // Resilient barcode scan handler for input, camera, and hardware gun
  const handleBarcodeScan = (codeToScan: string) => {
    const raw = cleanScannedBarcode(codeToScan).toUpperCase();
    if (!raw) return;

    setScanFeedback(null);

    // 1. Check if already in cart
    if (cartItems.some(p => isBarcodeMatch(p.parcelCode, raw) || isBarcodeMatch(p.shippingCode, raw))) {
      sound.playWarning();
      setScanFeedback({
        type: 'warning',
        message: `ພັດສະດຸລະຫັດ ${raw} ຢູ່ໃນລາຍການຈ່າຍເຄື່ອງແລ້ວ!`
      });
      setScanInput('');
      return;
    }

    // 2. Find parcel in branch stock
    const found = availableInBranch.find(
      p => isBarcodeMatch(p.parcelCode, raw) || isBarcodeMatch(p.shippingCode, raw)
    );

    if (found) {
      sound.playSuccess();
      addItemToCart(found);
      setScanFeedback({
        type: 'success',
        message: `✓ ເພີ່ມໃສ່ກະຕ່າຈ່າຍເຄື່ອງ: ${found.parcelCode} (${found.customerName})`
      });
      setScanInput('');
      return;
    }

    // 3. Check if it's already delivered
    const delivered = parcels.find(
      p => (isBarcodeMatch(p.parcelCode, raw) || isBarcodeMatch(p.shippingCode, raw)) && p.status === 'delivered'
    );
    if (delivered) {
      sound.playWarning();
      setScanFeedback({
        type: 'warning',
        message: `⚠️ ພັດສະດຸລະຫັດ ${raw} ໄດ້ມອບໃຫ້ລູກຄ້າ ແລະ ອອກໃບບິນແລ້ວ!`
      });
      setScanInput('');
      return;
    }

    // 4. In manifest (pending arrival) or unmanifested: auto check-in and add to cart!
    const autoRes = scanArrivalCode(raw, { autoRegister: true });
    if (autoRes.parcel) {
      sound.playSuccess();
      addItemToCart(autoRes.parcel);
      setScanFeedback({
        type: 'success',
        message: `✓ ຮັບເຂົ້າສາຂາ ແລະ ເພີ່ມໃສ່ບິນຈ່າຍເຄື່ອງທັນທີ: ${autoRes.parcel.parcelCode}`
      });
      setScanInput('');
    } else {
      sound.playWarning();
      setScanFeedback({
        type: 'error',
        message: autoRes.message || `ບໍ່ສາມາດສະແກນພັດສະດຸລະຫັດ ${raw}`
      });
    }
  };

  // Handle single scan from form submit
  const handleSingleScan = (e: React.FormEvent) => {
    e.preventDefault();
    handleBarcodeScan(scanInput);
  };

  // Add parcel to cart and auto-fill customer info if empty
  const addItemToCart = (parcel: WarehouseParcel) => {
    setCartItems(prev => [...prev, parcel]);

    // Auto set customer name/phone from the first parcel
    if (!customerName && parcel.customerName && parcel.customerName !== 'ລູກຄ້າ (ສາງໃຫຍ່ລືມສະແກນ)') {
      setCustomerName(parcel.customerName);
    }
    if (!customerPhone && parcel.customerPhone) {
      setCustomerPhone(parcel.customerPhone);
    }
  };

  // Remove parcel from cart
  const removeItemFromCart = (id: string) => {
    setCartItems(prev => prev.filter(p => p.id !== id));
  };

  // Handle Batch codes input (ປ້ອນຫຼາຍໆລະຫັດພ້ອມກັນ)
  const handleBatchAdd = () => {
    if (!batchCodesInput.trim()) return;

    // Split by newlines, commas, spaces
    const codes = batchCodesInput
      .split(/[\n,\s]+/)
      .map(c => c.trim().toUpperCase())
      .filter(Boolean);

    let addedCount = 0;
    const notFound: string[] = [];

    codes.forEach(code => {
      // Skip if already in cart
      if (cartItems.some(p => p.parcelCode.toUpperCase() === code || p.shippingCode.toUpperCase() === code)) {
        return;
      }

      let match = availableInBranch.find(
        p => p.parcelCode.toUpperCase() === code || p.shippingCode.toUpperCase() === code
      );

      if (!match) {
        const autoRes = scanArrivalCode(code);
        if (autoRes.parcel) {
          match = autoRes.parcel;
        }
      }

      if (match) {
        addItemToCart(match);
        addedCount++;
      } else {
        notFound.push(code);
      }
    });

    if (notFound.length > 0) {
      alert(`ເພີ່ມສຳເລັດ ${addedCount} ລາຍການ. ແຕ່ບໍ່ພົບອີກ ${notFound.length} ລະຫັດຢູ່ສາຂາ: ${notFound.join(', ')}`);
    } else {
      alert(`ເພີ່ມສຳເລັດທັງໝົດ ${addedCount} ລາຍການ!`);
    }

    setBatchCodesInput('');
    setShowBatchBox(false);
  };

  // Quick find other parcels belonging to this customer (matches typos like vinut/vnut and phone formats, excludes different person sharing number)
  const otherCustomerParcels = availableInBranch.filter(
    p => (customerPhone || customerName) &&
         areSameCustomer(
           { name: customerName, phone: customerPhone },
           { name: p.customerName, phone: p.customerPhone }
         ) &&
         !cartItems.some(c => c.id === p.id)
  );

  const addAllCustomerParcels = () => {
    otherCustomerParcels.forEach(p => addItemToCart(p));
  };

  // Handle Image Slip Upload
  const handleSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSlipFileError('ກະລຸນາເລືອກຟາຍຮູບພາບເທົ່ານັ້ນ (JPEG, PNG)');
      return;
    }

    setSlipFileError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      setTransferProofUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Cart financial calculations
  const totalCustomerAmount = cartItems.reduce((acc, p) => acc + (p.customerPrice || 0), 0);
  const totalWarehouseCost = cartItems.reduce((acc, p) => acc + (p.warehouseCost || 0), 0);
  const totalProfit = totalCustomerAmount - totalWarehouseCost;

  const numCashReceived = Number(cashReceived) || 0;
  const cashChange = paymentMethod === 'cash' ? Math.max(0, numCashReceived - totalCustomerAmount) : 0;

  // Process Checkout & Bill creation
  const handleFinalCheckout = () => {
    if (cartItems.length === 0) {
      alert('ກະລຸນາສະແກນ ຫຼື ເລືອກພັດສະດຸທີ່ຈະຈ່າຍກ່ອນ');
      return;
    }

    if (!customerName.trim()) {
      alert('ກະລຸນາລະບຸຊື່ລູກຄ້າ');
      return;
    }

    // Anti-theft checks:
    if (paymentMethod === 'transfer') {
      if (!transferProofUrl && !transferRef) {
        const proceedWithoutProof = window.confirm(
          'ແຈ້ງເຕືອນຄວາມປອດໄພ (Anti-Theft Warning): ຍັງບໍ່ທັນໄດ້ແນບຮູບສະລິບໂອນ ຫຼື ເລກອ້າງອີງ. ຕ້ອງການຢືນຢັນຈ່າຍໂດຍບໍ່ມີຫຼັກຖານແທ້ບໍ່?'
        );
        if (!proceedWithoutProof) return;
      }
    } else if (paymentMethod === 'cash') {
      if (numCashReceived < totalCustomerAmount) {
        alert(`ເງິນສົດທີ່ຮັບ (${formatKip(numCashReceived)}) ບໍ່ພໍດີກັບຍອດລວມ (${formatKip(totalCustomerAmount)})`);
        return;
      }
    } else if (paymentMethod === 'debt') {
      if (!customerPhone.trim()) {
        alert('ກະລຸນາປ້ອນເບີໂທລະສັບລູກຄ້າ ເພື່ອໃຊ້ໃນການບັນທຶກ ແລະ ຕິດຕາມໜີ້!');
        return;
      }
    }

    // Checkout execution with custom date support (e.g. if staff forgot to scan on the day)
    const bill = checkoutParcels({
      parcelIds: cartItems.map(p => p.id),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      paymentMethod,
      cashReceived: paymentMethod === 'cash' ? numCashReceived : undefined,
      cashChange: paymentMethod === 'cash' ? cashChange : undefined,
      transferBank: paymentMethod === 'transfer' ? transferBank : undefined,
      transferRef: paymentMethod === 'transfer' ? transferRef : undefined,
      transferProofUrl: paymentMethod === 'transfer' ? transferProofUrl : undefined,
      notes,
      date: billDate
    });

    // Reset state & show bill receipt modal
    setCompletedBill(bill);
    setCartItems([]);
    setBillDate(new Date().toISOString().split('T')[0]);
    setCustomerName('');
    setCustomerPhone('');
    setCashReceived('');
    setTransferRef('');
    setTransferProofUrl('');
    setNotes('');
  };

  const formatKip = (val: number) => {
    return new Intl.NumberFormat('lo-LA').format(val) + ' ₭';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>ຂໍ້ 5: ສະແກນເຄື່ອງອອກ & ອອກໃບບິນໃຫ້ລູກຄ້າ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            ຈ່າຍພັດສະດຸ, ຄິດໄລ່ເງິນ ແລະ ແນບຫຼັກຖານໂອນ
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            ສະແກນຫຼາຍເຄື່ອງຕໍ່ 1 ຄົນໄດ້, ອອກໃບບິນ ແລະ <strong>ແນບຮູບສະລິບໂອນເງິນ ເພື່ອປິດຊ່ອງໂຫວ່ພະນັກງານຂີ້ລັກ</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBatchBox(prev => !prev)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 transition"
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>{showBatchBox ? 'ເຊື່ອງຊ່ອງປ້ອນຫຼາຍລະຫັດ' : 'ປ້ອນຫຼາຍໆລະຫັດພ້ອມກັນ (Batch)'}</span>
          </button>
        </div>
      </div>

      {/* Batch Codes Box (ອັບໂຫລດເປັນຫຼາຍໆລະຫັດ ໂດຍການຂຽນໃສ່) */}
      {showBatchBox && (
        <div className="bg-indigo-50/70 rounded-3xl p-6 border-2 border-indigo-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>ປ້ອນລະຫັດພັດສະດຸຫຼາຍໆອັນພ້ອມກັນ (Batch Checkout Input)</span>
            </h3>
            <span className="text-xs text-indigo-600 font-semibold">
              ແຍກດ້ວຍການຍະຫວ່າງ, ຈຸດ ຫຼື ຂຶ້ນແຖວໃໝ່
            </span>
          </div>
          <textarea
            value={batchCodesInput}
            onChange={(e) => setBatchCodesInput(e.target.value)}
            rows={3}
            placeholder="ເຊັ່ນ: PKG-771001 PKG-771002 EXP-LA-1003 ..."
            className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowBatchBox(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              ຍົກເລີກ
            </button>
            <button
              onClick={handleBatchAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md"
            >
              ເພີ່ມເຂົ້າລາຍການທັງໝົດ
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Checkout Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Scanner, Cart Items & Customer Multi-pack Alert */}
        <div className="lg:col-span-7 space-y-6">
          {/* Scan Bar */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                ສະແກນບາໂຄດ ຫຼື ລະຫັດເຄື່ອງ / ລະຫັດຂົນສົ່ງ ເພື່ອຈ່າຍໃຫ້ລູກຄ້າ:
              </label>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>ພ້ອມຮັບສັນຍານເຄື່ອງຍິງ (HID Gun)</span>
              </span>
            </div>

            <form onSubmit={handleSingleScan} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="ຍິງບາໂຄດດ້ວຍເຄື່ອງຍິງ ຫຼື ພິມລະຫັດ..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                  autoFocus
                />
                <ScanLine className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>ເພີ່ມ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCameraModal(true)}
                  className="px-4 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <Camera className="w-4 h-4 text-emerald-200" />
                  <span>ເປີດກ້ອງ</span>
                </button>
              </div>
            </form>

            {/* Scan Feedback Banner */}
            {scanFeedback && (
              <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 transition ${
                scanFeedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : scanFeedback.type === 'warning'
                  ? 'bg-amber-50 border border-amber-200 text-amber-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {scanFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className="font-medium">{scanFeedback.message}</span>
              </div>
            )}

            {/* Quick Helper: Select from in-branch stock */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>ພັດສະດຸພ້ອມຈ່າຍຢູ່ສາຂາ: <strong className="text-slate-800">{availableInBranch.length} ຊິ້ນ</strong></span>
              <div className="flex gap-1 overflow-x-auto max-w-xs">
                {availableInBranch.slice(0, 3).map(p => (
                  <button
                    key={p.id}
                    onClick={() => addItemToCart(p)}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-[10px] font-mono text-slate-700 border border-slate-200"
                    title={`ຄລິກເພີ່ມ ${p.parcelCode}`}
                  >
                    + {p.parcelCode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Smart Customer Auto-Detection Banner */}
          {otherCustomerParcels.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">ພົບເຄື່ອງຂອງລູກຄ້າຄົນນີ້ອີກ {otherCustomerParcels.length} ຊິ້ນ</span> ໃນສາງສາຂາ!
                  (1 ຄົນມາເອົາຫຼາຍເຄື່ອງພ້ອມກັນ)
                </div>
              </div>
              <button
                onClick={addAllCustomerParcels}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0"
              >
                + ເພີ່ມທັງໝົດລົງບິນ
              </button>
            </div>
          )}

          {/* Cart Table of Items Being Checked Out */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>ລາຍການພັດສະດຸທີ່ຈະມອບໃຫ້ລູກຄ້າ ({cartItems.length} ຊິ້ນ)</span>
              </h3>
              {cartItems.length > 0 && (
                <button
                  onClick={() => setCartItems([])}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                >
                  ລ້າງລາຍການທັງໝົດ
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                <div className="font-bold text-slate-600">ຍັງບໍ່ມີພັດສະດຸໃນລາຍການ</div>
                <p className="mt-1">ຍິງບາໂຄດ ຫຼື ເລືອກເຄື່ອງຈາກສາງສາຂາເພື່ອອອກໃບບິນ</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {cartItems.map((item, idx) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
                            📦 {item.parcelCode}
                          </span>
                          {item.shippingCode ? (
                            <span className="font-mono text-xs text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 font-semibold">
                              🚚 {item.shippingCode}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          <span>ລູກຄ້າ: {item.customerName}</span>
                          {isAdmin && <span> • ຕົ້ນທຶນສາງ: {formatKip(item.warehouseCost)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono font-black text-slate-900 text-sm">
                          {formatKip(item.customerPrice)}
                        </div>
                        {isAdmin && (
                          <div className="text-[10px] text-emerald-600 font-semibold">
                            ກໍາໄລ: +{formatKip((item.customerPrice || 0) - (item.warehouseCost || 0))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => removeItemFromCart(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="ເອົາອອກຈາກບິນ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Cart Subtotal footer */}
                <div className="p-4 bg-slate-50 flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-700">ຍອດລວມ ({cartItems.length} ຊິ້ນ):</span>
                  <span className="text-emerald-700 font-black text-base">{formatKip(totalCustomerAmount)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Payment Security, Anti-Theft Slip Upload & Checkout Action */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-1">
                ຂໍ້ມູນລູກຄ້າ & ການຊໍາລະເງິນ
              </h3>
              <p className="text-xs text-slate-500">
                ລະບົບປ້ອງກັນພະນັກງານສໍ້ໂກງ (Anti-Theft Enforcement)
              </p>
            </div>

            {/* Bill Date Selector (Can pick any date if staff forgot to scan on the day) */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1">
              <label className="block text-xs font-bold text-indigo-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ວັນທີອອກໃບບິນ (Bill Date)</span>
                </span>
                <span className="text-[10px] text-indigo-600 font-semibold bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                  ເລືອກມື້ຍ້ອນຫຼັງໄດ້
                </span>
              </label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full p-2 bg-white border border-indigo-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
              <p className="text-[10px] text-indigo-700">
                * ຫາກພະນັກງານລືມສະແກນຈ່າຍໃນມື້ຕົວຈິງ (ເຊັ່ນ: 17/10/2026), ໃຫ້ເລືອກວັນທີນັ້ນເພື່ອໃຫ້ປະຫວັດບັນຊີຖືກຕ້ອງ.
              </p>
            </div>

            {/* Customer Name & Phone */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>ຊື່ຜູ້ຮັບ / ລູກຄ້າ</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="ເຊັ່ນ: ນາງ ມາລີ ສີປະເສີດ"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>ເບີໂທລະສັບ</span>
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="02055xxxxxx"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Supabase VIP Customer Status Alert */}
              {isVipCustomer && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 shadow-2xs animate-in fade-in duration-200">
                  <span className="text-xl">👑</span>
                  <div>
                    <div className="font-extrabold text-amber-900 flex items-center gap-1.5">
                      <span>ລູກຄ້າ VIP (Supabase Verified)</span>
                      <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.2 rounded-full">⭐ VIP</span>
                    </div>
                    <div className="text-[11px] text-amber-700 mt-0.5">
                      ລູກຄ້າປະຈຳລະດັບ VIP • ບັນທຶກໃນຖານຂໍ້ມູນ Supabase ຕາຕະລາງ <code className="font-mono text-[10px]">customers</code>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                ວິທີການຊໍາລະເງິນ (Payment Method):
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 text-xs font-bold transition ${
                    paymentMethod === 'transfer'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  <span>📱 ໂອນ / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 text-xs font-bold transition ${
                    paymentMethod === 'cash'
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-700 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  <span>💵 ເງິນສົດ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('debt')}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 text-xs font-bold transition ${
                    paymentMethod === 'debt'
                      ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <FileText className="w-5 h-5 text-amber-600" />
                  <span>📋 ຕິດໜີ້</span>
                </button>
              </div>
            </div>

            {/* If Transfer: Bank, Ref & Slip Attachment (CRITICAL FOR ANTI-THEFT) */}
            {paymentMethod === 'transfer' && (
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>ຫຼັກຖານການໂອນເງິນ (ປ້ອງກັນພະນັກງານຂີ້ລັກ)</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ທະນາຄານ</label>
                    <select
                      value={transferBank}
                      onChange={(e) => setTransferBank(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="BCEL One">BCEL One (ການຄ້າ)</option>
                      <option value="LDB Trust">LDB Trust (ພັດທະນາລາວ)</option>
                      <option value="JDB Yes">JDB Yes (ຮ່ວມພັດທະນາ)</option>
                      <option value="APB">APB (ກະສິກຳ)</option>
                      <option value="BFL">BFL (ຝຣັ່ງ-ລາວ)</option>
                      <option value="ອື່ນໆ">ອື່ນໆ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">ເລກອ້າງອີງໂອນ (Ref No)</label>
                    <input
                      type="text"
                      value={transferRef}
                      onChange={(e) => setTransferRef(e.target.value)}
                      placeholder="FT24..."
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                {/* Upload Transfer Slip / Camera Capture */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ຮູບພາບໃບສະລິບໂອນເງິນ:
                  </label>
                  
                  {transferProofUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-indigo-300 bg-white p-2">
                      <img
                        src={transferProofUrl}
                        alt="Transfer Proof"
                        className="w-full max-h-36 object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setTransferProofUrl('')}
                        className="absolute top-3 right-3 p-1 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700"
                        title="ລຶບຮູບສະລິບ"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-white transition">
                        <Upload className="w-6 h-6 text-indigo-500 mb-1" />
                        <span className="text-xs font-bold text-indigo-700">ກົດເພື່ອແນບຮູບສະລິບ / ຖ່າຍຮູບ</span>
                        <span className="text-[10px] text-slate-400">JPG, PNG (ກ້ອງມືຖື ຫຼື ແຄັບໜ້າຈໍ)</span>
                        <input
                          ref={slipInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleSlipUpload}
                          className="hidden"
                        />
                      </label>

                      {/* Quick demo slip button */}
                      <button
                        type="button"
                        onClick={() => setTransferProofUrl(SAMPLE_TRANSFER_SLIP)}
                        className="w-full py-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-100/50 rounded-lg"
                      >
                        + ໃຊ້ຕົວຢ່າງສະລິບໂອນ BCEL One (Demo Slip)
                      </button>
                    </div>
                  )}

                  {slipFileError && (
                    <div className="text-[11px] text-rose-600 mt-1 font-semibold">{slipFileError}</div>
                  )}
                </div>
              </div>
            )}

            {/* If Cash: Calculator */}
            {paymentMethod === 'cash' && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>ຄິດໄລ່ເງິນສົດ (Cash Change Calculator)</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    ຈຳນວນເງິນສົດທີ່ຮັບຈາກລູກຄ້າ (₭):
                  </label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder={String(totalCustomerAmount)}
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {numCashReceived > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-emerald-200">
                    <span className="text-slate-700">ເງິນທອນທີ່ຕ້ອງສົ່ງໃຫ້ລູກຄ້າ:</span>
                    <span className="text-base text-emerald-800 font-black">{formatKip(cashChange)}</span>
                  </div>
                )}
              </div>
            )}

            {/* If Debt (ຕິດໜີ້): Customer Due Date & Debt Notes */}
            {paymentMethod === 'debt' && (
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <span className="text-base">📋</span>
                  <span>ສະຖານະ: ຕິດໜີ້ (Customer Debt Tracking)</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  * ລູກຄ້າມາຮັບເຄື່ອງກ່ອນ ແຕ່ຍັງບໍ່ທັນໄດ້ຈ່າຍເງິນ. ລະບົບຈະບັນທຶກໃບບິນນີ້ເປັນ <strong>"ຕິດໜີ້ (ຍັງບໍ່ຊຳລະ)"</strong> ເພື່ອໃຫ້ທ່ານສາມາດຕິດຕາມໜີ້ ແລະ ກົດຕັດໜີ້ເມື່ອລູກຄ້ານຳເງິນມາຈ່າຍ.
                </p>
                <div>
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    ກຳນົດວັນທີນັດຈ່າຍ / ໝາຍເຫດການຕິດໜີ້:
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ເຊັ່ນ: ນັດຈ່າຍວັນທີ 25/10/2026, ລູກຄ້າຂໍຈ່າຍທ້າຍເດືອນ"
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
              </div>
            )}

            {/* Checkout Price Summary Box */}
            <div className="pt-4 border-t border-slate-200 space-y-2 text-xs">
              {isAdmin && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>ຕົ້ນທຶນສາງໃຫຍ່ (ຈ່າຍສາງ):</span>
                    <span className="font-mono">{formatKip(totalWarehouseCost)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>ກໍາໄລສາຂາ:</span>
                    <span className="font-mono text-emerald-600 font-bold">+{formatKip(totalProfit)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-100">
                <span>{paymentMethod === 'debt' ? 'ຍອດຕິດໜີ້ຄ້າງຊຳລະ:' : 'ຍອດເກັບລູກຄ້າຕົວຈິງ:'}</span>
                <span className={`text-lg ${paymentMethod === 'debt' ? 'text-amber-700 font-black' : 'text-emerald-700 font-black'}`}>
                  {formatKip(totalCustomerAmount)}
                </span>
              </div>
            </div>

            {/* Final Submit Button */}
            <button
              onClick={handleFinalCheckout}
              disabled={cartItems.length === 0}
              className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.99] ${
                cartItems.length > 0
                  ? paymentMethod === 'debt'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span>
                {paymentMethod === 'debt' 
                  ? `✓ ຢືນຢັນຈ່າຍເຄື່ອງ (ຕິດໜີ້ ${formatKip(totalCustomerAmount)})` 
                  : '✓ ຢືນຢັນການຈ່າຍເຄື່ອງ & ອອກໃບບິນ'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {completedBill && (
        <ReceiptModal bill={completedBill} onClose={() => setCompletedBill(null)} />
      )}

      {/* Camera Barcode Scanner Modal */}
      <CameraBarcodeScannerModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onScan={(code) => handleBarcodeScan(code)}
        title="ສະແກນຈ່າຍເຄື່ອງໃຫ້ລູກຄ້າ (Customer Checkout Scanner)"
        description="ຈໍ່ກ້ອງໃສ່ບາໂຄດ ຫຼື QR Code ເພື່ອເພີ່ມເຂົ້າໃບບິນຈ່າຍເຄື່ອງທັນທີ"
      />
    </div>
  );
};
