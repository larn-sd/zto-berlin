import React, { useState } from 'react';
import { 
  DollarSign, 
  Package, 
  TrendingUp, 
  AlertOctagon, 
  Clock, 
  CheckCircle2, 
  ScanLine, 
  ArrowUpRight, 
  ShoppingBag, 
  FileInput, 
  CreditCard, 
  Banknote,
  Calendar,
  Eye,
  Sparkles,
  Plus,
  FileSpreadsheet,
  RotateCcw,
  Receipt
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TabKey, CheckoutBill } from '../types';
import { ReceiptModal } from './ReceiptModal';

interface DashboardViewProps {
  onNavigate: (tab: TabKey) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { parcels, bills, scanLogs, loadDemoData, currentUser } = useApp();
  const [selectedBill, setSelectedBill] = useState<CheckoutBill | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');

  const isStaff = currentUser?.role === 'staff';

  const todayStr = new Date().toISOString().split('T')[0];

  // Format currency
  const formatKip = (val: number) => {
    return new Intl.NumberFormat('lo-LA').format(val) + ' ₭';
  };

  // Staff View: ONLY Quick Tasks and Recent Bills without Profit column
  if (isStaff) {
    return (
      <div className="space-y-6">
        {/* Staff Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
                <Calendar className="w-3.5 h-3.5" />
                <span>ວັນທີ: {new Date().toLocaleDateString('lo-LA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                ຍິນດີຕ້ອນຮັບ, {currentUser?.name || 'ພະນັກງານ'}
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                ZTO Berlin • ສາຂາ ໜອງບົວທອງ (Berlin) — ໂໝດພະນັກງານສາຂາ (Staff Mode)
              </p>
            </div>

            <div className="flex items-center gap-2 bg-indigo-900/60 border border-indigo-500/30 px-3.5 py-2 rounded-2xl text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-indigo-200">ລະບົບສະແກນພ້ອມໃຊ້ງານ</span>
            </div>
          </div>
        </div>

        {/* Quick Tasks */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>ເມນູດ່ວນປະຈຳວັນ (Quick Tasks)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ກົດເລືອກເມນູເພື່ອເລີ່ມຕົ້ນການເຮັດວຽກສະແກນຮັບ ຫຼື ຈ່າຍເຄື່ອງ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => onNavigate('branch_scan')}
              className="p-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-left transition shadow-lg shadow-indigo-600/30 flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                  <ScanLine className="w-6 h-6 text-white" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-indigo-200 group-hover:translate-x-1 group-hover:-translate-y-1 transition" />
              </div>
              <div>
                <div className="text-base font-bold">1. ສະແກນຮັບເຄື່ອງເຂົ້າສາຂາ</div>
                <p className="text-xs text-indigo-100 mt-1">ສະແກນບາໂຄດພັດສະດຸທີ່ມາຮອດສາຂາ</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('customer_checkout')}
              className="p-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-left transition shadow-lg shadow-emerald-600/30 flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-emerald-200 group-hover:translate-x-1 group-hover:-translate-y-1 transition" />
              </div>
              <div>
                <div className="text-base font-bold">2. ສະແກນຈ່າຍເຄື່ອງ & ອອກບິນ</div>
                <p className="text-xs text-emerald-100 mt-1">ຈ່າຍເຄື່ອງໃຫ້ລູກຄ້າ, ຮັບເງິນສົດ/ໂອນ ແລະ ອອກບິນ</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('bills_history')}
              className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-left transition shadow-md flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition" />
              </div>
              <div>
                <div className="text-base font-bold">3. ປະຫວັດໃບບິນ</div>
                <p className="text-xs text-slate-300 mt-1">ກວດເບິ່ງ ແລະ ພິມໃບບິນທີ່ໄດ້ຈ່າຍແລ້ວ</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Bills for Staff (without Profit column) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                ໃບບິນທີ່ຈ່າຍລ່າສຸດ (Recent Bills)
              </h3>
              <p className="text-xs text-slate-500">
                ລາຍການຈ່າຍເຄື່ອງໃຫ້ລູກຄ້າທີ່ສຳເລັດແລ້ວ
              </p>
            </div>
            <button
              onClick={() => onNavigate('bills_history')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
            >
              <span>ເບິ່ງທັງໝົດ</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {bills.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              ຍັງບໍ່ມີໃບບິນຈ່າຍເຄື່ອງ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">ເລກໃບບິນ</th>
                    <th className="py-3 px-4">ວັນທີ-ເວລາ</th>
                    <th className="py-3 px-4">ລູກຄ້າ</th>
                    <th className="py-3 px-4">ຈຳນວນເຄື່ອງ</th>
                    <th className="py-3 px-4">ຍອດເກັບລູກຄ້າ</th>
                    <th className="py-3 px-4">ຊໍາລະໂດຍ</th>
                    <th className="py-3 px-4 text-center">ໃບບິນ / ສະລິບ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bills.slice(0, 5).map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {bill.id}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{bill.timestamp}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{bill.customerName}</div>
                        <div className="text-[11px] text-slate-500">{bill.customerPhone}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {bill.parcelIds.length} ຊິ້ນ
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatKip(bill.totalCustomerPrice)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium text-[11px] ${
                          bill.paymentMethod === 'cash' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {bill.paymentMethod === 'cash' ? '💵 ເງິນສົດ' : '📱 ໂອນເງິນ'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedBill(bill)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-semibold transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ເບິ່ງບິນ</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedBill && (
            <ReceiptModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
          )}
        </div>
      </div>
    );
  }

  // Filtering
  const filteredBills = bills.filter(b => {
    if (dateFilter === 'today') return b.date === todayStr;
    if (dateFilter === 'week') {
      const bDate = new Date(b.date).getTime();
      const weekAgo = Date.now() - 7 * 86400000;
      return bDate >= weekAgo;
    }
    return true;
  });

  // Calculate Financials from completed bills
  const totalRevenue = filteredBills.reduce((acc, b) => acc + (b.totalCustomerPrice || 0), 0);
  const totalWarehouseCost = filteredBills.reduce((acc, b) => acc + (b.totalWarehouseCost || 0), 0);
  const netProfit = totalRevenue - totalWarehouseCost;
  const marginPercent = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Payment Breakdown
  const cashBills = filteredBills.filter(b => b.paymentMethod === 'cash');
  const transferBills = filteredBills.filter(b => b.paymentMethod === 'transfer');

  const totalCash = cashBills.reduce((acc, b) => acc + (b.totalCustomerPrice || 0), 0);
  const totalTransfer = transferBills.reduce((acc, b) => acc + (b.totalCustomerPrice || 0), 0);
  const transferPercent = totalRevenue > 0 ? Math.round((totalTransfer / totalRevenue) * 100) : 0;

  // Parcel status counts
  const totalParcelsCount = parcels.length;
  const pendingArrivalCount = parcels.filter(p => p.status === 'pending_arrival').length;
  const inBranchCount = parcels.filter(p => p.status === 'in_branch').length;
  const deliveredCount = parcels.filter(p => p.status === 'delivered').length;
  const unmanifestedCount = parcels.filter(p => p.isUnmanifested || p.status === 'unmanifested' || p.notes?.includes('ສາງໃຫຍ່ລືມສະແກນ')).length;
  const totalDiscrepancies = pendingArrivalCount + unmanifestedCount;

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Filter */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
              <Calendar className="w-3.5 h-3.5" />
              <span>ວັນທີ: {new Date().toLocaleDateString('lo-LA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ພາບລວມການດຳເນີນງານສາຂາ (Dashboard)
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              ຕິດຕາມລາຍຮັບ-ຕົ້ນທຶນສາງໃຫຍ່, ສະຖານະພັດສະດຸທຸກຊິ້ນ, ແລະ ກວດສອບຄວາມຖືກຕ້ອງຂອງເງິນສົດ ແລະ ເງິນໂອນ.
            </p>
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60 backdrop-blur-xs">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                dateFilter === 'today' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              ມື້ນີ້
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                dateFilter === 'week' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              7 ມື້ຜ່ານມາ
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                dateFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              ທັງໝົດ
            </button>
          </div>
        </div>
      </div>

      {/* When data is cleared: Welcome & Quick-start action card */}
      {totalParcelsCount === 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-dashed border-indigo-300 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900">
            ຂໍ້ມູນຖືກເຄຍວ່າງເປົ່າຮຽບຮ້ອຍແລ້ວ! (Clean State)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
            ຕອນນີ້ຍັງບໍ່ມີພັດສະດຸໃນລະບົບ. ທ່ານສາມາດເລີ່ມຕົ້ນອັບໂຫລດຟາຍ Excel ຈາກສາງໃຫຍ່ ຫຼື ຄີຂໍ້ມູນພັດສະດຸຕົວຈິງເຂົ້າດ້ວຍຕົນເອງ:
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button
              onClick={() => onNavigate('warehouse_inbound')}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-600/30 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>1. ອັບໂຫລດ Excel ຈາກສາງໃຫຍ່</span>
            </button>

            <button
              onClick={() => onNavigate('warehouse_inbound')}
              className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>2. ຄີຂໍ້ມູນພັດສະດຸເອງ (Manual Add)</span>
            </button>

            <button
              onClick={loadDemoData}
              className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-2 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ໂຫລດຂໍ້ມູນຕົວຢ່າງຄືນໃໝ່</span>
            </button>
          </div>
        </div>
      )}

      {/* 4 Main Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ຍອດເກັບລູກຄ້າ (ລາຍຮັບ)</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{formatKip(totalRevenue)}</div>
            <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{filteredBills.length} ໃບບິນທີ່ສຳເລັດ</span>
            </div>
          </div>
        </div>

        {/* Card 2: Warehouse Cost */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ຕົ້ນທຶນສາງໃຫຍ່ຕັດ</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{formatKip(totalWarehouseCost)}</div>
            <div className="text-xs text-slate-500 mt-1">
              ຈ່າຍຄືນໃຫ້ສາງໃຫຍ່
            </div>
          </div>
        </div>

        {/* Card 3: Branch Net Profit */}
        <div className="bg-white rounded-2xl p-5 border border-indigo-200 shadow-sm bg-gradient-to-b from-indigo-50/40 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">ກໍາໄລສຸດທິສາຂາ</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-indigo-700">{formatKip(netProfit)}</div>
            <div className="text-xs text-indigo-600 font-semibold mt-1">
              ອັດຕາກໍາໄລ: {marginPercent}%
            </div>
          </div>
        </div>

        {/* Card 4: Discrepancy Alert */}
        <div 
          onClick={() => onNavigate('discrepancy')}
          className={`rounded-2xl p-5 border transition cursor-pointer ${
            totalDiscrepancies > 0 
              ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">ເຄື່ອງຕົກຄ້າງ / ຜິດດ່ຽງ</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              totalDiscrepancies > 0 ? 'bg-rose-600 text-white shadow-md shadow-rose-200' : 'bg-slate-100 text-slate-500'
            }`}>
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700">{totalDiscrepancies} ລາຍການ</div>
            <div className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
              <span>ບໍ່ເຫັນ {pendingArrivalCount} • ສາງລືມ {unmanifestedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Parcel Status Counter Row */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-600" />
          <span>ສະຖານະພັດສະດຸທັງໝົດ ({totalParcelsCount} ຊິ້ນ)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div 
            onClick={() => onNavigate('discrepancy')}
            className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 cursor-pointer hover:bg-amber-100/60 transition"
          >
            <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>1. ຍັງບໍ່ຮອດສາຂາ (ເຄື່ອງບໍ່ເຫັນ)</span>
            </div>
            <div className="text-2xl font-black text-amber-900">{pendingArrivalCount}</div>
            <div className="text-[11px] text-amber-700 mt-1">ສາງໃຫຍ່ສະແກນມາ ແຕ່ຍັງບໍ່ຮອດ</div>
          </div>

          <div 
            onClick={() => onNavigate('customer_checkout')}
            className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 cursor-pointer hover:bg-blue-100/60 transition"
          >
            <div className="flex items-center gap-2 text-blue-800 text-xs font-semibold mb-1">
              <Package className="w-4 h-4 text-blue-600" />
              <span>2. ຮອດສາຂາແລ້ວ (ລໍຖ້າເອົາ)</span>
            </div>
            <div className="text-2xl font-black text-blue-900">{inBranchCount}</div>
            <div className="text-[11px] text-blue-700 mt-1">ພ້ອມຈ່າຍໃຫ້ລູກຄ້າ</div>
          </div>

          <div 
            onClick={() => onNavigate('bills_history')}
            className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 cursor-pointer hover:bg-emerald-100/60 transition"
          >
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>3. ມອບໃຫ້ລູກຄ້າແລ້ວ</span>
            </div>
            <div className="text-2xl font-black text-emerald-900">{deliveredCount}</div>
            <div className="text-[11px] text-emerald-700 mt-1">ອອກໃບບິນ ແລະ ຮັບເງິນແລ້ວ</div>
          </div>

          <div 
            onClick={() => onNavigate('discrepancy')}
            className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 cursor-pointer hover:bg-purple-100/60 transition"
          >
            <div className="flex items-center gap-2 text-purple-800 text-xs font-semibold mb-1">
              <AlertOctagon className="w-4 h-4 text-purple-600" />
              <span>4. ສາງໃຫຍ່ລືມສະແກນ</span>
            </div>
            <div className="text-2xl font-black text-purple-900">{unmanifestedCount}</div>
            <div className="text-[11px] text-purple-700 mt-1">ເຄື່ອງເກີນຢູ່ສາຂາ</div>
          </div>
        </div>
      </div>

      {/* Middle Section: Anti-Theft Payment Breakdown & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Anti-Theft Payment Audit Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>ກວດສອບຊ່ອງທາງຮັບເງິນ (Anti-Theft Audit)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ແຍກເງິນສົດ ແລະ ເງິນໂອນພ້ອມສະລິບຫຼັກຖານ ເພື່ອປ້ອງກັນພະນັກງານເກັບເງິນແລ້ວບໍ່ບັນທຶກ
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              100% ມີຫຼັກຖານ
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Transfer Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span>ເງິນໂອນ (ມີສະລິບແນບ)</span>
                </span>
                <span className="text-indigo-600 font-bold">{transferBills.length} ບິນ</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatKip(totalTransfer)}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                ກວດສອບສະລິບທຸກຄັ້ງກ່ອນມອບເຄື່ອງ
              </div>
            </div>

            {/* Cash Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>ເງິນສົດ (Cash)</span>
                </span>
                <span className="text-emerald-600 font-bold">{cashBills.length} ບິນ</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatKip(totalCash)}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                ເງິນສົດຕ້ອງມີຢູ່ໃນລີ້ນຊັກສາຂາ
              </div>
            </div>
          </div>

          {/* Ratio bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>ສັດສ່ວນເງິນໂອນ: {transferPercent}%</span>
              <span>ສັດສ່ວນເງິນສົດ: {100 - transferPercent}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-emerald-400 overflow-hidden flex">
              <div 
                className="bg-indigo-600 h-full transition-all duration-500"
                style={{ width: `${transferPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Operations Actions */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-200 mb-2">
              ເມນູດ່ວນປະຈຳວັນ (Quick Tasks)
            </h3>
            <p className="text-xs text-indigo-100/70 mb-4">
              ກົດເຂົ້າສູ່ໜ້າວຽກສະແກນໄດ້ທັນທີ
            </p>

            <div className="space-y-2">
              <button
                onClick={() => onNavigate('branch_scan')}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold flex items-center justify-between transition shadow-md shadow-indigo-700/50"
              >
                <div className="flex items-center gap-2">
                  <ScanLine className="w-4 h-4" />
                  <span>ສະແກນຮັບເຄື່ອງເຂົ້າສາຂາ</span>
                </div>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('customer_checkout')}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold flex items-center justify-between transition shadow-md shadow-emerald-700/50"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>ສະແກນຈ່າຍເຄື່ອງ & ອອກບິນ</span>
                </div>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              {!isStaff && (
                <button
                  onClick={() => onNavigate('parcel_tracking')}
                  className="w-full py-2.5 px-4 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 rounded-xl text-xs font-bold flex items-center justify-between transition text-indigo-200"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-400" />
                    <span>ຕິດຕາມເຄື່ອງທັງໝົດ</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              )}

              {!isStaff && (
                <button
                  onClick={() => onNavigate('warehouse_inbound')}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2">
                    <FileInput className="w-4 h-4" />
                    <span>1. ສາງໃຫຍ່ສົ່ງມາ (Excel)</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              )}

              {isStaff && (
                <button
                  onClick={() => onNavigate('bills_history')}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    <span>ປະຫວັດໃບບິນທີ່ຈ່າຍ</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            ສຽງສະແກນ & ລະບົບປ້ອງກັນພ້ອມໃຊ້ງານ
          </div>
        </div>
      </div>

      {/* Recent Activity Table: Recent Completed Bills */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              ໃບບິນທີ່ຈ່າຍລ່າສຸດ (Recent Bills)
            </h3>
            <p className="text-xs text-slate-500">
              ລາຍການຈ່າຍເຄື່ອງໃຫ້ລູກຄ້າ ແລະ ໃບບິນທີ່ອອກໃນລະບົບ
            </p>
          </div>
          <button
            onClick={() => onNavigate('bills_history')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
          >
            <span>ເບິ່ງທັງໝົດ</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {bills.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            ຍັງບໍ່ມີໃບບິນຈ່າຍເຄື່ອງ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">ເລກໃບບິນ</th>
                  <th className="py-3 px-4">ວັນທີ-ເວລາ</th>
                  <th className="py-3 px-4">ລູກຄ້າ</th>
                  <th className="py-3 px-4">ຈຳນວນເຄື່ອງ</th>
                  <th className="py-3 px-4">ຍອດເກັບລູກຄ້າ</th>
                  <th className="py-3 px-4">ກໍາໄລສາຂາ</th>
                  <th className="py-3 px-4">ຊໍາລະໂດຍ</th>
                  <th className="py-3 px-4 text-center">ໃບບິນ / ສະລິບ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.slice(0, 5).map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      {bill.id}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{bill.timestamp}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{bill.customerName}</div>
                      <div className="text-[11px] text-slate-500">{bill.customerPhone}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {bill.parcelIds.length} ຊິ້ນ
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatKip(bill.totalCustomerPrice)}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600">
                      +{formatKip(bill.profit)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium text-[11px] ${
                        bill.paymentMethod === 'cash' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {bill.paymentMethod === 'cash' ? '💵 ເງິນສົດ' : '📱 ໂອນເງິນ'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedBill(bill)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-semibold transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ເບິ່ງບິນ</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bill receipt modal */}
      {selectedBill && (
        <ReceiptModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
      )}
    </div>
  );
};
