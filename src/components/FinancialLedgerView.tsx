import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Search, 
  RefreshCw, 
  FileText, 
  Trash2, 
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Wallet,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FinancialLedgerEntry } from '../types';

export const FinancialLedgerView: React.FC = () => {
  const { 
    financialLedger, 
    addLedgerEntry, 
    deleteLedgerEntry, 
    refreshSupabaseData,
    supabaseConnected,
    currentUser
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form state for creating a new ledger entry
  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    category: 'delivery_fee',
    amount: '',
    description: '',
    created_by: currentUser?.name || 'ພະນັກງານສາຂາ',
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSupabaseData();
    setIsRefreshing(false);
  };

  const handleSubmitNewEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    await addLedgerEntry({
      type: formData.type,
      category: formData.category,
      amount: parsedAmount,
      description: formData.description.trim() || (formData.type === 'income' ? 'ລາຍຮັບທົ່ວໄປ' : 'ລາຍຈ່າຍທົ່ວໄປ'),
      created_by: formData.created_by,
    });

    setFormData({
      type: 'income',
      category: 'delivery_fee',
      amount: '',
      description: '',
      created_by: currentUser?.name || 'ພະນັກງານສາຂາ',
    });
    setShowAddModal(false);
  };

  const formatKip = (val?: number) => {
    if (!val) return '0 ₭';
    return new Intl.NumberFormat('lo-LA').format(val) + ' ₭';
  };

  // Financial calculations
  const totalIncome = financialLedger
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalExpense = financialLedger
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const netBalance = totalIncome - totalExpense;

  const filteredEntries = financialLedger.filter(entry => {
    const matchesSearch = 
      (entry.description && entry.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.category && entry.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.created_by && entry.created_by.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || entry.type === filterType;
    return matchesSearch && matchesType;
  });

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      delivery_fee: 'ຄ່າສົ່ງເຄື່ອງ (Delivery)',
      parcel_charge: 'ຄ່າບໍລິການພັດສະດຸ',
      checkout_revenue: 'ລາຍຮັບຈາກການຈ່າຍເຄື່ອງ',
      warehouse_deduction: 'ຄ່າຕັດສາງໃຫຍ່ (Warehouse Cost)',
      dispute_refund: 'ເງິນຊົດເຊີຍຂໍ້ຂັດແຍ່ງ (Dispute)',
      operational_cost: 'ຄ່າໃຊ້ຈ່າຍບໍລິຫານສາຂາ',
      packaging_materials: 'ອຸປະກອນຫຸ້ມຫໍ່/ກ່ອງ',
      cash_draw: 'ຖອນເງິນສົດ',
      general: 'ທົ່ວໄປ',
    };
    return map[cat] || cat;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              Supabase: financial_ledger
            </span>
            {supabaseConnected && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Querying Live Supabase DB
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-2 flex items-center gap-2">
            ບັນຊີລາຍຮັບ-ລາຍຈ່າຍສາຂາ (Financial Ledger)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ບັນທຶກລາຍຮັບຄ່າສົ່ງ, ລາຍຈ່າຍຕົ້ນທຶນສາງ, ແລະ ຄ່າຊົດເຊີຍ ຜ່ານຕາຕະລາງ <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-700">financial_ledger</code> ຂອງ Supabase
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="ໂຫຼດຂໍ້ມູນໃໝ່ຈາກ Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>ຣີເຟຣຊ</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>ບັນທຶກລາຍການໃໝ່</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            ລາຍຮັບລວມ (Total Income)
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{formatKip(totalIncome)}</div>
          <div className="text-xs text-slate-400 mt-1">
            {financialLedger.filter(e => e.type === 'income').length} ລາຍການຮັບ
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            ລາຍຈ່າຍລວມ (Total Expenses)
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{formatKip(totalExpense)}</div>
          <div className="text-xs text-slate-400 mt-1">
            {financialLedger.filter(e => e.type === 'expense').length} ລາຍການຈ່າຍ
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-xs ${netBalance >= 0 ? 'bg-indigo-50/50 border-indigo-200' : 'bg-rose-50 border-rose-200'}`}>
          <div className="text-xs font-semibold uppercase text-indigo-900">
            ຍອດເຫຼືອສຸດທິ (Net Balance)
          </div>
          <div className={`text-2xl font-bold mt-2 ${netBalance >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
            {formatKip(netBalance)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {netBalance >= 0 ? 'ກຳໄລສາຂາ (Profit)' : 'ຂາດທຶນ (Loss)'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">
            ທຸລະກຳທັງໝົດ (Transactions)
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{financialLedger.length}</div>
          <div className="text-xs text-slate-400 mt-1">ໃນ Supabase DB</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ຄົ້ນຫາຄຳອະທິບາຍ, ປະເພດ, ຜູ້ບັນທຶກ..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'all' 
                ? 'bg-slate-900 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ທັງໝົດ ({financialLedger.length})
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
              filterType === 'income' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            ລາຍຮັບ ({financialLedger.filter(e => e.type === 'income').length})
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
              filterType === 'expense' 
                ? 'bg-rose-600 text-white' 
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            ລາຍຈ່າຍ ({financialLedger.filter(e => e.type === 'expense').length})
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">ບໍ່ພົບລາຍການບັນຊີ</h3>
            <p className="text-sm text-slate-400 mt-1">
              ຍັງບໍ່ມີຂໍ້ມູນໃນຕາຕະລາງ <code className="text-xs font-mono">financial_ledger</code> ຂອງ Supabase
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              ບັນທຶກລາຍການທຳອິດ
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">ປະເພດ (Type)</th>
                  <th className="py-3 px-4">ໝວດໝູ່ (Category)</th>
                  <th className="py-3 px-4">ຄຳອະທິບາຍ (Description)</th>
                  <th className="py-3 px-4 text-right">ຈຳນວນເງິນ (Amount)</th>
                  <th className="py-3 px-4">ຜູ້ບັນທຶກ</th>
                  <th className="py-3 px-4">ວັນທີ-ເວລາ</th>
                  <th className="py-3 px-4 text-right">ລຶບ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry) => {
                  const isIncome = entry.type === 'income';
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isIncome ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            ລາຍຮັບ (Income)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            ລາຍຈ່າຍ (Expense)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {getCategoryLabel(entry.category)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 max-w-sm truncate">
                        {entry.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                        <span className={isIncome ? 'text-emerald-600' : 'text-rose-600'}>
                          {isIncome ? '+' : '-'}{formatKip(entry.amount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {entry.created_by || 'Staff'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {entry.created_at ? new Date(entry.created_at).toLocaleDateString('lo-LA') : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (window.confirm('ຕ້ອງການລຶບລາຍການບັນຊີນີ້ອອກຈາກ Supabase ແທ້ບໍ່?')) {
                              deleteLedgerEntry(entry.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="ລຶບລາຍການ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
                <Wallet className="w-5 h-5" />
                <span>ບັນທຶກລາຍຮັບ-ລາຍຈ່າຍ (Supabase Ledger)</span>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewEntry} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    ປະເພດທຸລະກຳ *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      type: e.target.value as 'income' | 'expense',
                      category: e.target.value === 'income' ? 'delivery_fee' : 'operational_cost'
                    })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="income">🟢 ລາຍຮັບ (Income)</option>
                    <option value="expense">🔴 ລາຍຈ່າຍ (Expense)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    ໝວດໝູ່ (Category) *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {formData.type === 'income' ? (
                      <>
                        <option value="delivery_fee">ຄ່າສົ່ງເຄື່ອງ (Delivery)</option>
                        <option value="parcel_charge">ຄ່າບໍລິການພັດສະດຸ</option>
                        <option value="checkout_revenue">ລາຍຮັບຈ່າຍເຄື່ອງ</option>
                        <option value="general">ລາຍຮັບອື່ນໆ</option>
                      </>
                    ) : (
                      <>
                        <option value="warehouse_deduction">ຄ່າຕັດສາງໃຫຍ່</option>
                        <option value="dispute_refund">ເງິນຊົດເຊີຍຂໍ້ຂັດແຍ່ງ (Dispute)</option>
                        <option value="operational_cost">ຄ່າໃຊ້ຈ່າຍສາຂາ</option>
                        <option value="packaging_materials">ອຸປະກອນຫຸ້ມຫໍ່</option>
                        <option value="cash_draw">ຖອນເງິນສົດ</option>
                        <option value="general">ລາຍຈ່າຍອື່ນໆ</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ຈຳນວນເງິນ (Amount in ₭) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="15000"
                    className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold">₭</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ຄຳອະທິບາຍລາຍການ (Description) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ຕົວຢ່າງ: ຄ່າສົ່ງພັດສະດຸລະຫັດ 7713..., ຄ່າຕັດສາງໃຫຍ່ປະຈຳວັນ..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ພະນັກງານບັນທຶກ (Recorded By)
                </label>
                <input
                  type="text"
                  value={formData.created_by}
                  onChange={(e) => setFormData({ ...formData, created_by: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <Database className="w-4 h-4" />
                  <span>ບັນທຶກລົງ Supabase</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
