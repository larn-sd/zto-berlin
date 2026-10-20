import React, { useState, useRef } from 'react';
import { 
  Receipt, 
  Search, 
  Download, 
  Eye, 
  ShieldCheck, 
  CreditCard, 
  Banknote, 
  Calendar, 
  Printer, 
  ExternalLink,
  Trash2,
  Filter,
  CheckCircle2,
  Package,
  TrendingUp,
  X,
  Edit2,
  AlertCircle,
  FileText,
  Upload,
  Clock,
  User,
  Phone
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CheckoutBill, isUserAdmin } from '../types';
import { ReceiptModal } from './ReceiptModal';
import { exportBillsToExcel, formatDateDisplay } from '../utils/excel';
import { SAMPLE_TRANSFER_SLIP } from '../data/mockData';

export const BillsHistoryView: React.FC = () => {
  const { bills, deleteBill, updateBill, markBillAsPaid, currentUser } = useApp();
  const isAdmin = isUserAdmin(currentUser);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'transfer' | 'debt_unpaid' | 'debt_paid'>('all');
  
  // Date filter state
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  // Modals
  const [selectedBill, setSelectedBill] = useState<CheckoutBill | null>(null);
  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null);
  const [deleteConfirmBill, setDeleteConfirmBill] = useState<CheckoutBill | null>(null);
  const [editingDateBill, setEditingDateBill] = useState<CheckoutBill | null>(null);
  const [newBillDateInput, setNewBillDateInput] = useState<string>('');

  // Settle Debt Modal state
  const [settleDebtBill, setSettleDebtBill] = useState<CheckoutBill | null>(null);
  const [settleMethod, setSettleMethod] = useState<'cash' | 'transfer'>('cash');
  const [settleBank, setSettleBank] = useState('BCEL One');
  const [settleRef, setSettleRef] = useState('');
  const [settleProofUrl, setSettleProofUrl] = useState('');
  const slipInputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // 1. Filter by Date first
  const dateMatchedBills = bills.filter(b => {
    if (!selectedDate) return true;
    return b.date === selectedDate || (b.timestamp && b.timestamp.startsWith(selectedDate));
  });

  // 2. Metrics calculation
  const totalParcelsDelivered = dateMatchedBills.reduce(
    (acc, b) => acc + (b.parcels?.length || b.parcelIds.length || 0), 
    0
  );

  const cashBills = dateMatchedBills.filter(b => b.paymentMethod === 'cash');
  const cashTotalAmount = cashBills.reduce((acc, b) => acc + (b.totalCustomerPrice || 0), 0);

  const transferBills = dateMatchedBills.filter(b => b.paymentMethod === 'transfer');
  const transferTotalAmount = transferBills.reduce((acc, b) => acc + (b.totalCustomerPrice || 0), 0);

  // Debt metrics (all unpaid across system for prominent alert)
  const allUnpaidDebtBills = bills.filter(b => b.paymentMethod === 'debt' && b.paymentStatus === 'unpaid');
  const allUnpaidDebtAmount = allUnpaidDebtBills.reduce((acc, b) => acc + (b.totalCustomerPrice || 0), 0);

  const dateUnpaidDebtBills = dateMatchedBills.filter(b => b.paymentMethod === 'debt' && b.paymentStatus === 'unpaid');
  const datePaidDebtBills = dateMatchedBills.filter(b => b.paymentMethod === 'debt' && b.paymentStatus === 'paid');

  const totalRevenue = dateMatchedBills.reduce((acc, b) => acc + (b.totalCustomerPrice || 0), 0);
  const totalWarehouseCost = dateMatchedBills.reduce((acc, b) => acc + (b.totalWarehouseCost || 0), 0);
  const totalProfit = totalRevenue - totalWarehouseCost;

  // 3. Search and Payment Method Filter for table
  const filteredBills = dateMatchedBills.filter(b => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = 
      !term ||
      b.id.toLowerCase().includes(term) ||
      b.customerName.toLowerCase().includes(term) ||
      b.customerPhone.includes(term) ||
      (b.transferRef && b.transferRef.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (paymentFilter === 'all') return true;
    if (paymentFilter === 'cash') return b.paymentMethod === 'cash';
    if (paymentFilter === 'transfer') return b.paymentMethod === 'transfer';
    if (paymentFilter === 'debt_unpaid') return b.paymentMethod === 'debt' && b.paymentStatus === 'unpaid';
    if (paymentFilter === 'debt_paid') return b.paymentMethod === 'debt' && b.paymentStatus === 'paid';
    return true;
  });

  const formatKip = (val: number) => {
    return new Intl.NumberFormat('lo-LA').format(val) + ' ₭';
  };

  const handleExport = () => {
    exportBillsToExcel(filteredBills);
  };

  const handleOpenEditDate = (b: CheckoutBill) => {
    setEditingDateBill(b);
    setNewBillDateInput(b.date || (b.timestamp ? b.timestamp.split(' ')[0] : todayStr));
  };

  const handleSaveBillDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDateBill || !newBillDateInput) return;

    updateBill(editingDateBill.id, {
      date: newBillDateInput
    });
    setEditingDateBill(null);
  };

  // Open Settle Debt Modal
  const openSettleModal = (b: CheckoutBill) => {
    setSettleDebtBill(b);
    setSettleMethod('cash');
    setSettleBank('BCEL One');
    setSettleRef('');
    setSettleProofUrl('');
  };

  const handleConfirmSettleDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleDebtBill) return;

    markBillAsPaid(
      settleDebtBill.id,
      settleMethod,
      settleMethod === 'transfer' ? settleProofUrl : undefined,
      settleMethod === 'transfer' ? settleBank : undefined,
      settleMethod === 'transfer' ? settleRef : undefined
    );

    alert(`ຕັດໜີ້ໃບບິນ ${settleDebtBill.id} (${settleDebtBill.customerName}) ສຳເລັດ!\nຍອດເງິນ ${formatKip(settleDebtBill.totalCustomerPrice)} ໄດ້ຖືກບັນທຶກເຂົ້າບັນຊີລາຍຮັບແລ້ວ.`);
    setSettleDebtBill(null);
  };

  const handleSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ຂະໜາດໄຟລ໌ໃຫຍ່ເກີນໄປ (ສູງສຸດ 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSettleProofUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2 border border-indigo-200">
            <Receipt className="w-3.5 h-3.5" />
            <span>ປະຫວັດໃບບິນ & ຕິດຕາມໜີ້ລູກຄ້າ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            ບັນທຶກໃບບິນ, ຫຼັກຖານໂອນ & ຕິດຕາມໜີ້ (Bills & Debt Tracking)
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            ກວດສອບຍອດຈ່າຍເຄື່ອງ, ແຍກເງິນສົດ / ເງິນໂອນ, <strong>ຕິດຕາມລູກຄ້າຕິດໜີ້ ແລະ ກົດຕັດໜີ້ເມື່ອຊຳລະ</strong>
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export ໃບບິນ (Excel)</span>
        </button>
      </div>

      {/* Prominent Debt Alert Banner if any outstanding debts exist */}
      {allUnpaidDebtBills.length > 0 && (
        <div className="p-4 rounded-3xl bg-amber-500/15 border-2 border-amber-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-amber-950 text-sm">
                ລູກຄ້າຕິດໜີ້ຄ້າງຊຳລະ: {allUnpaidDebtBills.length} ໃບບິນ • ຍອດໜີ້ລວມ: <span className="font-mono text-base font-black text-rose-600">{formatKip(allUnpaidDebtAmount)}</span>
              </div>
              <div className="text-xs text-amber-800 mt-0.5">
                ລູກຄ້າເອົາເຄື່ອງໄປແລ້ວແຕ່ຍັງບໍ່ທັນຊຳລະ. ທ່ານສາມາດກັ່ນຕອງເບິ່ງລາຍການຕິດໜີ້ ແລະ ກົດຕັດໜີ້ໄດ້ທັນທີ.
              </div>
            </div>
          </div>

          <button
            onClick={() => { setSelectedDate(''); setPaymentFilter('debt_unpaid'); }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition shrink-0"
          >
            ເບິ່ງລາຍການຕິດໜີ້ທັງໝົດ
          </button>
        </div>
      )}

      {/* Date Filter & Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>ເລືອກວັນທີເບິ່ງຍອດ:</span>
            </span>

            {/* Quick Date Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedDate('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedDate === '' 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ທຸກວັນທີ ({bills.length} ບິນ)
              </button>

              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedDate === todayStr 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ມື້ນີ້ ({bills.filter(b => b.date === todayStr).length})
              </button>

              <button
                onClick={() => setSelectedDate(yesterdayStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedDate === yesterdayStr 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ມື້ວານ ({bills.filter(b => b.date === yesterdayStr).length})
              </button>
            </div>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">ລະບຸວັນທີ:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                ລ້າງວັນທີ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Financial Metrics Cards for Selected Date */}
      <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        {/* Total Deliveries */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ຈຳນວນພັດສະດຸທີ່ຈ່າຍ</span>
            <Package className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {totalParcelsDelivered} <span className="text-sm font-medium text-slate-500">ຊິ້ນ</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ຈາກທັງໝົດ {dateMatchedBills.length} ໃບບິນ
          </div>
        </div>

        {/* Transfer payments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ຍອດໂອນ / QR</span>
            <CreditCard className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-700 mt-2 font-mono">
            {formatKip(transferTotalAmount)}
          </div>
          <div className="text-[11px] text-indigo-600 font-semibold mt-1">
            {transferBills.length} ໃບບິນ (ມີຫຼັກຖານໂອນ)
          </div>
        </div>

        {/* Cash payments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ຍອດເງິນສົດ</span>
            <Banknote className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-2 font-mono">
            {formatKip(cashTotalAmount)}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {cashBills.length} ໃບບິນ
          </div>
        </div>

        {/* Profit (ADMIN ONLY - strictly hidden from staff) */}
        {isAdmin && (
          <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-5 rounded-2xl shadow-md">
            <div className="flex items-center justify-between text-emerald-100 text-xs font-semibold">
              <span>ກໍາໄລສາຂາ (Admin)</span>
              <TrendingUp className="w-4 h-4 text-emerald-200" />
            </div>
            <div className="text-2xl font-black mt-2 font-mono">
              +{formatKip(totalProfit)}
            </div>
            <div className="text-[11px] text-emerald-100 mt-1">
              ຍອດລວມ {formatKip(totalRevenue)} - ຕົ້ນທຶນ {formatKip(totalWarehouseCost)}
            </div>
          </div>
        )}
      </div>

      {/* Search and Payment Filter Tabs */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ຄົ້ນຫາ ເລກໃບບິນ, ລູກຄ້າ, ເບີໂທ, ເລກອ້າງອີງ..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Payment Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          <button
            onClick={() => setPaymentFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              paymentFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ທັງໝົດ ({dateMatchedBills.length})
          </button>
          <button
            onClick={() => setPaymentFilter('transfer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              paymentFilter === 'transfer' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>ໂອນ ({transferBills.length})</span>
          </button>
          <button
            onClick={() => setPaymentFilter('cash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              paymentFilter === 'cash' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>ເງິນສົດ ({cashBills.length})</span>
          </button>
          <button
            onClick={() => setPaymentFilter('debt_unpaid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              paymentFilter === 'debt_unpaid' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>🚨 ຕິດໜີ້ (ຍັງບໍ່ຈ່າຍ) ({dateUnpaidDebtBills.length})</span>
          </button>
          <button
            onClick={() => setPaymentFilter('debt_paid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              paymentFilter === 'debt_paid' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>✅ ຊຳລະໜີ້ແລ້ວ ({datePaidDebtBills.length})</span>
          </button>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">ເລກໃບບິນ</th>
                <th className="py-3 px-4">ວັນທີ-ເວລາ</th>
                <th className="py-3 px-4">ລູກຄ້າ</th>
                <th className="py-3 px-4">ຈຳນວນເຄື່ອງ</th>
                {isAdmin && <th className="py-3 px-4">ຕົ້ນທຶນສາງໃຫຍ່</th>}
                <th className="py-3 px-4">ຍອດເກັບລູກຄ້າ</th>
                {isAdmin && <th className="py-3 px-4">ກໍາໄລສາຂາ</th>}
                <th className="py-3 px-4">ວິທີການຊຳລະ / ສະຖານະໜີ້</th>
                <th className="py-3 px-4 text-center">ຫຼັກຖານໂອນ</th>
                <th className="py-3 px-4 text-center">ຈັດການ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 8} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <div className="font-bold text-slate-600">ບໍ່ພົບລາຍການໃບບິນ</div>
                    {selectedDate && (
                      <p className="text-xs text-slate-400 mt-1">
                        ບໍ່ມີໃບບິນໃນວັນທີ {formatDateDisplay(selectedDate)}
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const isDebtUnpaid = bill.paymentMethod === 'debt' && bill.paymentStatus === 'unpaid';
                  const isDebtPaid = bill.paymentMethod === 'debt' && bill.paymentStatus === 'paid';

                  return (
                    <tr key={bill.id} className={`transition ${isDebtUnpaid ? 'bg-amber-50/40 hover:bg-amber-50/80' : 'hover:bg-slate-50/70'}`}>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {bill.id}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold">{bill.date || bill.timestamp.split(' ')[0]}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {bill.timestamp && bill.timestamp.includes(' ') ? bill.timestamp.split(' ')[1] : ''}
                          </span>
                          <button
                            onClick={() => handleOpenEditDate(bill)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="ແກ້ໄຂວັນທີໃບບິນ"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{bill.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{bill.customerPhone}</div>
                        {bill.notes && (
                          <div className="text-[10px] text-amber-700 italic max-w-xs truncate">{bill.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[11px]">
                          <Package className="w-3 h-3" />
                          <span>{bill.parcels?.length || bill.parcelIds.length} ຊິ້ນ</span>
                        </span>
                      </td>

                      {/* Warehouse Cost is ADMIN ONLY */}
                      {isAdmin && (
                        <td className="py-3 px-4 font-mono text-amber-700 font-bold">
                          {formatKip(bill.totalWarehouseCost)}
                        </td>
                      )}

                      <td className="py-3 px-4 font-mono text-slate-900 font-bold">
                        {formatKip(bill.totalCustomerPrice)}
                      </td>

                      {/* Profit is ADMIN ONLY */}
                      {isAdmin && (
                        <td className="py-3 px-4 font-mono text-emerald-600 font-bold">
                          +{formatKip(bill.profit)}
                        </td>
                      )}

                      {/* Payment Method & Debt Status Badge */}
                      <td className="py-3 px-4">
                        {bill.paymentMethod === 'cash' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Banknote className="w-3 h-3" />
                            <span>ເງິນສົດ</span>
                          </span>
                        ) : bill.paymentMethod === 'transfer' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <CreditCard className="w-3 h-3" />
                            <span>ໂອນ ({bill.transferBank || 'ທະນາຄານ'})</span>
                          </span>
                        ) : isDebtUnpaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>🚨 ຕິດໜີ້ (ຍັງບໍ່ຊຳລະ)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                            <span>✅ ຊຳລະໜີ້ແລ້ວ</span>
                          </span>
                        )}
                      </td>

                      {/* Transfer slip preview button */}
                      <td className="py-3 px-4 text-center">
                        {bill.transferProofUrl || bill.paidTransferProofUrl ? (
                          <button
                            onClick={() => setPreviewSlipUrl(bill.transferProofUrl || bill.paidTransferProofUrl!)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-[11px] border border-indigo-200"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                            <span>ກວດສະລິບ</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Settle Debt Button if debt is unpaid */}
                          {isDebtUnpaid && (
                            <button
                              onClick={() => openSettleModal(bill)}
                              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition"
                              title="ກົດເພື່ອຕັດໜີ້ / ຮັບຊຳລະເງິນ"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>ຊຳລະໜີ້</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedBill(bill)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] border border-indigo-200 transition"
                            title="ເບິ່ງ ແລະ ພິມໃບບິນ"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>ພິມບິນ</span>
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => setDeleteConfirmBill(bill)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="ລຶບໃບບິນ (ຄືນເຄື່ອງເຂົ້າສາຂາ - ສະເພາະເຈົ້າຂອງຮ້ານ)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Settle Debt Modal (ຕັດໜີ້ / ຮັບຊຳລະເງິນ) */}
      {settleDebtBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    ຊຳລະໜີ້ / ຕັດໜີ້ໃບບິນ
                  </h3>
                  <p className="text-xs text-slate-500">
                    ໃບບິນເລກທີ: <span className="font-mono font-bold text-indigo-700">{settleDebtBill.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettleDebtBill(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Debtor Details Card */}
            <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ລູກຄ້າ:</span>
                <span className="font-bold text-slate-900 text-sm">{settleDebtBill.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ເບີໂທ:</span>
                <span className="font-mono font-bold text-slate-700">{settleDebtBill.customerPhone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ຈຳນວນເຄື່ອງ:</span>
                <span className="font-bold text-slate-800">{settleDebtBill.parcels?.length || settleDebtBill.parcelIds.length} ຊິ້ນ</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-700">ຍອດເງິນທີ່ຕ້ອງຊຳລະ:</span>
                <span className="font-mono font-black text-amber-700 text-base">
                  {formatKip(settleDebtBill.totalCustomerPrice)}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmSettleDebt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  ເລືອກວິທີການຊຳລະເງິນ:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettleMethod('cash')}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 text-xs font-bold transition ${
                      settleMethod === 'cash' 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>💵 ເງິນສົດ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettleMethod('transfer')}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 text-xs font-bold transition ${
                      settleMethod === 'transfer' 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs' 
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span>📱 ໂອນເງິນ / QR</span>
                  </button>
                </div>
              </div>

              {/* If Transfer: Bank, Ref, Slip */}
              {settleMethod === 'transfer' && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">ທະນາຄານ</label>
                      <select
                        value={settleBank}
                        onChange={(e) => setSettleBank(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="BCEL One">BCEL One (ການຄ້າ)</option>
                        <option value="LDB Trust">LDB Trust (ພັດທະນາລາວ)</option>
                        <option value="JDB Yes">JDB Yes (ຮ່ວມພັດທະນາ)</option>
                        <option value="APB">APB (ກະສິກຳ)</option>
                        <option value="ອື່ນໆ">ອື່ນໆ</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">ເລກອ້າງອີງໂອນ</label>
                      <input
                        type="text"
                        value={settleRef}
                        onChange={(e) => setSettleRef(e.target.value)}
                        placeholder="FT24..."
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ຮູບໃບສະລິບໂອນເງິນ:
                    </label>
                    {settleProofUrl ? (
                      <div className="relative rounded-xl overflow-hidden border border-indigo-300 bg-white p-2">
                        <img
                          src={settleProofUrl}
                          alt="Transfer Proof"
                          className="w-full max-h-32 object-contain rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setSettleProofUrl('')}
                          className="absolute top-2 right-2 p-1 rounded-full bg-rose-600 text-white shadow-md"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="border-2 border-dashed border-indigo-300 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer bg-white transition hover:border-indigo-500">
                          <Upload className="w-5 h-5 text-indigo-500 mb-1" />
                          <span className="text-xs font-bold text-indigo-700">ແນບຮູບສະລິບໂອນ</span>
                          <input
                            ref={slipInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleSlipUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setSettleProofUrl(SAMPLE_TRANSFER_SLIP)}
                          className="w-full py-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-100/50 rounded-lg"
                        >
                          + ໃຊ້ຕົວຢ່າງສະລິບ BCEL One
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSettleDebtBill(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ຢືນຢັນການຕັດໜີ້ & ຮັບເງິນ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bill Date Modal */}
      {editingDateBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>ແກ້ໄຂວັນທີໃບບິນ: {editingDateBill.id}</span>
              </h3>
              <button
                onClick={() => setEditingDateBill(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBillDate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ເລືອກວັນທີອອກໃບບິນໃໝ່:
                </label>
                <input
                  type="date"
                  value={newBillDateInput}
                  onChange={(e) => setNewBillDateInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDateBill(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                >
                  ບັນທຶກ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Slip Modal */}
      {previewSlipUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>ຫຼັກຖານການໂອນເງິນ (Transfer Slip Attached)</span>
              </div>
              <button
                onClick={() => setPreviewSlipUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-2">
              <img
                src={previewSlipUrl}
                alt="Transfer Proof Slip"
                className="max-h-[55vh] object-contain rounded-lg"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewSlipUrl(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                ປິດໜ້າຕ່າງ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal (ADMIN ONLY) */}
      {deleteConfirmBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base">
                ຢືນຢັນການລຶບໃບບິນ?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ເລກບິນ: <strong className="font-mono text-indigo-600">{deleteConfirmBill.id}</strong> • ລູກຄ້າ: {deleteConfirmBill.customerName}
              </p>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs mt-3 text-left">
                ⚠️ ການລຶບໃບບິນຈະປ່ຽນສະຖານະພັດສະດຸທັງໝົດໃນບິນນີ້ ({deleteConfirmBill.parcels?.length || deleteConfirmBill.parcelIds.length} ຊິ້ນ) ກັບຄືນສູ່ <strong>"ຮອດສາຂາແລ້ວ" (In Branch)</strong> ເພື່ອໃຫ້ສາມາດສະແກນຈ່າຍໃໝ່ໄດ້.
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmBill(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                ຍົກເລີກ
              </button>
              <button
                onClick={() => {
                  deleteBill(deleteConfirmBill.id, true);
                  setDeleteConfirmBill(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                ຢືນຢັນລຶບ & ຄືນເຄື່ອງ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Receipt Preview Modal */}
      {selectedBill && (
        <ReceiptModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
      )}
    </div>
  );
};
