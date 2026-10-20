import React, { useState } from 'react';
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
  Edit2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CheckoutBill } from '../types';
import { ReceiptModal } from './ReceiptModal';
import { exportBillsToExcel, formatDateDisplay } from '../utils/excel';

export const BillsHistoryView: React.FC = () => {
  const { bills, deleteBill, updateBill } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'transfer'>('all');
  
  // Date filter state
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  // Modals
  const [selectedBill, setSelectedBill] = useState<CheckoutBill | null>(null);
  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null);
  const [deleteConfirmBill, setDeleteConfirmBill] = useState<CheckoutBill | null>(null);
  const [editingDateBill, setEditingDateBill] = useState<CheckoutBill | null>(null);
  const [newBillDateInput, setNewBillDateInput] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // 1. Filter by Date first
  const dateMatchedBills = bills.filter(b => {
    if (!selectedDate) return true;
    return b.date === selectedDate || (b.timestamp && b.timestamp.startsWith(selectedDate));
  });

  // 2. Metrics calculation for the selected date (or all)
  const totalParcelsDelivered = dateMatchedBills.reduce(
    (acc, b) => acc + (b.parcels?.length || b.parcelIds.length || 0), 
    0
  );

  const cashBills = dateMatchedBills.filter(b => b.paymentMethod === 'cash');
  const cashParcelsCount = cashBills.reduce(
    (acc, b) => acc + (b.parcels?.length || b.parcelIds.length || 0), 
    0
  );
  const cashTotalAmount = cashBills.reduce((acc, b) => acc + (b.totalCustomerPrice || 0), 0);

  const transferBills = dateMatchedBills.filter(b => b.paymentMethod === 'transfer');
  const transferParcelsCount = transferBills.reduce(
    (acc, b) => acc + (b.parcels?.length || b.parcelIds.length || 0), 
    0
  );
  const transferTotalAmount = transferBills.reduce((acc, b) => acc + (b.totalCustomerPrice || 0), 0);

  const totalRevenue = dateMatchedBills.reduce((acc, b) => acc + (b.totalCustomerPrice || 0), 0);
  const totalWarehouseCost = dateMatchedBills.reduce((acc, b) => acc + (b.totalWarehouseCost || 0), 0);
  const totalProfit = totalRevenue - totalWarehouseCost;

  // 3. Search and Payment Method Filter for table
  const filteredBills = dateMatchedBills.filter(b => {
    const matchesSearch = 
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customerPhone.includes(searchTerm) ||
      (b.transferRef && b.transferRef.toLowerCase().includes(searchTerm.toLowerCase()));

    if (paymentFilter === 'all') return matchesSearch;
    return matchesSearch && b.paymentMethod === paymentFilter;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2 border border-indigo-200">
            <Receipt className="w-3.5 h-3.5" />
            <span>ປະຫວັດໃບບິນ ແລະ ຫຼັກຖານການເງິນ</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            ບັນທຶກໃບບິນ & ຫຼັກຖານໂອນ (Bills Audit Trail)
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            ກວດສອບຍອດຈ່າຍເຄື່ອງຕາມວັນທີ, ແຍກເງິນສົດ / ເງິນໂອນ, ແກ້ໄຂວັນທີຍ້ອນຫຼັງ ແລະ ພິມໃບບິນຄືນໃໝ່
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

              <button
                onClick={() => setSelectedDate('2026-10-17')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedDate === '2026-10-17' 
                    ? 'bg-amber-600 text-white shadow-xs' 
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                📅 17/10/2026 ({bills.filter(b => b.date === '2026-10-17').length})
              </button>
            </div>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">ເລືອກວັນທີເຈາະຈົງ:</span>
            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="ລ້າງວັນທີ"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {selectedDate && (
          <div className="text-xs text-indigo-700 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                ກຳລັງສະແດງສະເພາະບິນປະຈຳວັນທີ: <strong>{formatDateDisplay(selectedDate)}</strong> ({selectedDate})
              </span>
            </div>
            <button
              onClick={() => setSelectedDate('')}
              className="text-xs font-bold text-indigo-900 underline hover:text-indigo-600"
            >
              ສະແດງທຸກວັນທີ
            </button>
          </div>
        )}
      </div>

      {/* Prominent Summary Stat Cards for Selected Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Parcels Delivered */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-600" />
              <span>ເຄື່ອງທີ່ຈ່າຍອອກ</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[10px] border border-blue-200">
              {dateMatchedBills.length} ໃບບິນ
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 font-mono">
            {totalParcelsDelivered} <span className="text-sm font-semibold text-slate-500">ຊິ້ນ</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {selectedDate ? `ວັນທີ ${formatDateDisplay(selectedDate)}` : 'ລວມທຸກວັນທີໃນລະບົບ'}
          </div>
        </div>

        {/* Card 2: Cash Breakdown */}
        <div className="bg-emerald-50/60 p-5 rounded-3xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>ຮັບເງິນສົດ (Cash)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
              {cashBills.length} ບິນ
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-2 font-mono">
            {formatKip(cashTotalAmount)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">
            ຈ່າຍເຄື່ອງດ້ວຍເງິນສົດ: <strong>{cashParcelsCount} ຊິ້ນ</strong>
          </div>
        </div>

        {/* Card 3: Transfer Breakdown */}
        <div className="bg-indigo-50/60 p-5 rounded-3xl border border-indigo-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>ຮັບເງິນໂອນ (Transfer)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold text-[10px]">
              {transferBills.length} ບິນ
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-950 mt-2 font-mono">
            {formatKip(transferTotalAmount)}
          </div>
          <div className="text-[11px] text-indigo-700 mt-1 font-medium">
            ຈ່າຍເຄື່ອງດ້ວຍເງິນໂອນ: <strong>{transferParcelsCount} ຊິ້ນ</strong>
          </div>
        </div>

        {/* Card 4: Total Revenue & Profit */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>ຍອດເງິນລວມທັງໝົດ</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
              ລາຍຮັບ
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {formatKip(totalRevenue)}
          </div>
          <div className="text-[11px] text-emerald-700 font-bold mt-1">
            ກຳໄລສາຂາ: +{formatKip(totalProfit)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar for Table */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ຄົ້ນຫາ ເລກໃບບິນ, ລູກຄ້າ, ເບີໂທ, ເລກອ້າງອີງ..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
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
            <span>ເງິນໂອນ ({transferBills.length})</span>
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
                <th className="py-3 px-4">ຕົ້ນທຶນສາງໃຫຍ່</th>
                <th className="py-3 px-4">ຍອດເກັບລູກຄ້າ</th>
                <th className="py-3 px-4">ກໍາໄລສາຂາ</th>
                <th className="py-3 px-4">ຊໍາລະໂດຍ</th>
                <th className="py-3 px-4 text-center">ຫຼັກຖານໂອນ</th>
                <th className="py-3 px-4 text-center">ຈັດການ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
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
                filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/70 transition">
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
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono text-[11px]">
                        <Package className="w-3 h-3" />
                        <span>{bill.parcels?.length || bill.parcelIds.length} ຊິ້ນ</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-700 font-bold">
                      {formatKip(bill.totalWarehouseCost)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-900 font-bold">
                      {formatKip(bill.totalCustomerPrice)}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-600 font-bold">
                      +{formatKip(bill.profit)}
                    </td>
                    <td className="py-3 px-4">
                      {bill.paymentMethod === 'cash' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Banknote className="w-3 h-3" />
                          <span>ເງິນສົດ</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <CreditCard className="w-3 h-3" />
                          <span>ໂອນ ({bill.transferBank || 'ທະນາຄານ'})</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {bill.transferProofUrl ? (
                        <button
                          onClick={() => setPreviewSlipUrl(bill.transferProofUrl!)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-[11px] border border-indigo-200"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>ກວດສະລິບ</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedBill(bill)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] border border-indigo-200 transition"
                          title="ເບິ່ງ ແລະ ພິມໃບບິນ"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>ພິມບິນ</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmBill(bill)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="ລຶບໃບບິນ (ຄືນເຄື່ອງເຂົ້າສາຂາ)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Bill Receipt Modal (with date selector for reprinting) */}
      {selectedBill && (
        <ReceiptModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
      )}

      {/* Edit Bill Date Modal */}
      {editingDateBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">ແກ້ໄຂວັນທີໃບບິນ</h3>
              </div>
              <button
                onClick={() => setEditingDateBill(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBillDate} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">ເລກໃບບິນ:</label>
                <div className="font-mono font-bold text-slate-800 text-xs bg-slate-100 p-2 rounded-xl">
                  {editingDateBill.id} ({editingDateBill.customerName})
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ເລືອກວັນທີໃໝ່:
                </label>
                <input
                  type="date"
                  value={newBillDateInput}
                  onChange={(e) => setNewBillDateInput(e.target.value)}
                  className="w-full p-2.5 border border-indigo-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  * ຫາກພະນັກງານລືມສະແກນໃນມື້ຕົວຈິງ ສາມາດປ່ຽນວັນທີຍ້ອນຫຼັງໄດ້ທີ່ນີ້.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDateBill(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  ບັນທຶກວັນທີ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Bill Confirmation Modal */}
      {deleteConfirmBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              ຢືນຢັນການລຶບໃບບິນ?
            </h3>
            <p className="text-xs text-slate-500 mb-2">
              ທ່ານຕ້ອງການລຶບໃບບິນເລກທີ <strong className="font-mono text-slate-800">{deleteConfirmBill.id}</strong> ({deleteConfirmBill.customerName}) ແທ້ບໍ່?
            </p>
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 mb-4">
              ⚠ ພັດສະດຸທັງໝົດໃນໃບບິນນີ້ ({deleteConfirmBill.parcelIds.length} ຊິ້ນ) ຈະຖືກຄືນສະຖານະກັບເຂົ້າສາງສາຂາ (ຮອດສາຂາແລ້ວ) ອັດຕະໂນມັດ ເພື່ອໃຫ້ສາມາດຈ່າຍເຄື່ອງໃໝ່ໄດ້.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmBill(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                ຍົກເລີກ
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteBill(deleteConfirmBill.id, true);
                  setDeleteConfirmBill(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                ລຶບໃບບິນ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Large Slip Preview Modal */}
      {previewSlipUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>ຫຼັກຖານການໂອນເງິນຕົວຈິງ (Audit Slip)</span>
              </h3>
              <button
                onClick={() => setPreviewSlipUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="my-4 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200 p-2">
              <img
                src={previewSlipUrl}
                alt="Transfer Slip Proof"
                className="max-h-[60vh] object-contain rounded-lg"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewSlipUrl(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                ປິດ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
