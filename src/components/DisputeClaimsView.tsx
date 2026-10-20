import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Plus, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  FileText, 
  Trash2, 
  ExternalLink,
  Package,
  User,
  Phone,
  Database
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DisputeClaim, DisputeStatus } from '../types';

export const DisputeClaimsView: React.FC = () => {
  const { 
    disputeClaims, 
    addDisputeClaim, 
    updateDisputeClaim, 
    deleteDisputeClaim, 
    refreshSupabaseData,
    supabaseConnected,
    parcels
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form state for creating a new dispute claim
  const [formData, setFormData] = useState({
    tracking_number: '',
    customer_name: '',
    customer_phone: '',
    status: 'pending' as DisputeStatus,
    notes: '',
    claim_amount: '',
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSupabaseData();
    setIsRefreshing(false);
  };

  const handleSelectParcelForDispute = (trackingCode: string) => {
    const found = parcels.find(p => p.parcelCode === trackingCode || p.shippingCode === trackingCode);
    if (found) {
      setFormData(prev => ({
        ...prev,
        tracking_number: trackingCode,
        customer_name: found.customerName || prev.customer_name,
        customer_phone: found.customerPhone || prev.customer_phone,
        claim_amount: String(found.warehouseCost || found.customerPrice || ''),
      }));
    } else {
      setFormData(prev => ({ ...prev, tracking_number: trackingCode }));
    }
  };

  const handleSubmitNewClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tracking_number.trim()) return;

    await addDisputeClaim({
      tracking_number: formData.tracking_number.trim().toUpperCase(),
      customer_name: formData.customer_name.trim() || 'ລູກຄ້າ',
      customer_phone: formData.customer_phone.trim(),
      status: formData.status,
      notes: formData.notes.trim(),
      claim_amount: formData.claim_amount ? Number(formData.claim_amount) : 0,
    });

    setFormData({
      tracking_number: '',
      customer_name: '',
      customer_phone: '',
      status: 'pending',
      notes: '',
      claim_amount: '',
    });
    setShowAddModal(false);
  };

  const formatKip = (val?: number) => {
    if (!val) return '0 ₭';
    return new Intl.NumberFormat('lo-LA').format(val) + ' ₭';
  };

  const getStatusBadge = (status: DisputeStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            ລໍຖ້າກວດສອບ (Pending)
          </span>
        );
      case 'investigating':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            ກຳລັງສືບສວນ (Investigating)
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ອະນຸມັດຊົດເຊີຍ (Approved)
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            ປະຕິເສດ (Rejected)
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ສຳເລັດແລ້ວ (Resolved)
          </span>
        );
      default:
        return null;
    }
  };

  const filteredClaims = disputeClaims.filter(claim => {
    const matchesSearch = 
      claim.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (claim.notes && claim.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = disputeClaims.filter(c => c.status === 'pending' || c.status === 'investigating').length;
  const approvedCount = disputeClaims.filter(c => c.status === 'approved').length;
  const resolvedCount = disputeClaims.filter(c => c.status === 'resolved').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Supabase: dispute_claims
            </span>
            {supabaseConnected && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Querying Live Supabase DB
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-2 flex items-center gap-2">
            ຈັດການຂໍ້ຂັດແຍ່ງ & ເຄື່ອງເສຍຫາຍ (Dispute Claims)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ບັນທຶກ ແລະ ຕິດຕາມເຄື່ອງເສຍຫາຍ, ເຄື່ອງແຕກຫັກ, ລູກຄ້າຮ້ອງຮຽນ ຜ່ານຕາຕະລາງ <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-700">dispute_claims</code> ຂອງ Supabase
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
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>ແຈ້ງຂໍ້ຂັດແຍ່ງໃໝ່</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">ຂໍ້ຂັດແຍ່ງທັງໝົດ</div>
          <div className="text-3xl font-bold text-slate-800 mt-2">{disputeClaims.length}</div>
          <div className="text-xs text-slate-400 mt-1">ລວມທຸກສະຖານະໃນ Supabase</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <div className="text-xs font-semibold text-amber-700 uppercase flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            ລໍຖ້າກວດສອບ / ກຳລັງສືບສວນ
          </div>
          <div className="text-3xl font-bold text-amber-700 mt-2">{pendingCount}</div>
          <div className="text-xs text-amber-600 mt-1">ຕ້ອງການການຕິດຕາມດ່ວນ</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <div className="text-xs font-semibold text-emerald-700 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ອະນຸມັດຊົດເຊີຍແລ້ວ
          </div>
          <div className="text-3xl font-bold text-emerald-700 mt-2">{approvedCount}</div>
          <div className="text-xs text-emerald-600 mt-1">ກຽມຈ່າຍເງິນຊົດເຊີຍ</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ສຳເລັດແລ້ວ (Resolved)
          </div>
          <div className="text-3xl font-bold text-slate-800 mt-2">{resolvedCount}</div>
          <div className="text-xs text-slate-400 mt-1">ປິດເລື່ອງຮຽບຮ້ອຍ</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ຄົ້ນຫາເລກພັດສະດຸ, ຊື່ລູກຄ້າ, ໝາຍເຫດ..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === 'all' 
                ? 'bg-slate-900 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ທັງໝົດ ({disputeClaims.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === 'pending' 
                ? 'bg-amber-600 text-white' 
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            ລໍຖ້າ ({disputeClaims.filter(c => c.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilterStatus('investigating')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === 'investigating' 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            ກຳລັງສືບສວນ ({disputeClaims.filter(c => c.status === 'investigating').length})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === 'approved' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            ອະນຸມັດ ({disputeClaims.filter(c => c.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilterStatus('resolved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === 'resolved' 
                ? 'bg-slate-700 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ສຳເລັດ ({disputeClaims.filter(c => c.status === 'resolved').length})
          </button>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredClaims.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">ບໍ່ພົບລາຍການຂໍ້ຂັດແຍ່ງ</h3>
            <p className="text-sm text-slate-400 mt-1">
              ຍັງບໍ່ມີຂໍ້ມູນໃນຕາຕະລາງ <code className="text-xs font-mono">dispute_claims</code> ຂອງ Supabase ຫຼື ບໍ່ກົງກັບເງື່ອນໄຂຄົ້ນຫາ
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              ແຈ້ງຂໍ້ຂັດແຍ່ງລາຍການທຳອິດ
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="py-3 px-4">ເລກພັດສະດຸ (Tracking)</th>
                  <th className="py-3 px-4">ລູກຄ້າ / ຜູ້ແຈ້ງ</th>
                  <th className="py-3 px-4">ສະຖານະ (Status)</th>
                  <th className="py-3 px-4">ມູນຄ່າຮ້ອງຮຽນ (₭)</th>
                  <th className="py-3 px-4">ໝາຍເຫດ / ລາຍລະອຽດ</th>
                  <th className="py-3 px-4">ວັນທີບັນທຶກ</th>
                  <th className="py-3 px-4 text-right">ຈັດການ (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-indigo-500" />
                        {claim.tracking_number}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">ID: {claim.id.slice(0, 8)}...</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {claim.customer_name || 'ບໍ່ລະບຸ'}
                      </div>
                      {claim.customer_phone && (
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {claim.customer_phone}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(claim.status)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {claim.claim_amount ? formatKip(claim.claim_amount) : '-'}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-xs text-slate-600 truncate">
                      {claim.notes || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {claim.created_at ? new Date(claim.created_at).toLocaleDateString('lo-LA') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Status Dropdown */}
                        <select
                          value={claim.status}
                          onChange={(e) => updateDisputeClaim(claim.id, { status: e.target.value as DisputeStatus })}
                          className="text-xs bg-slate-100 hover:bg-slate-200 border-none rounded-lg px-2 py-1 font-medium text-slate-700 cursor-pointer focus:ring-1 focus:ring-rose-500"
                        >
                          <option value="pending">ລໍຖ້າ (Pending)</option>
                          <option value="investigating">ສືບສວນ (Investigating)</option>
                          <option value="approved">ອະນຸມັດ (Approved)</option>
                          <option value="rejected">ປະຕິເສດ (Rejected)</option>
                          <option value="resolved">ສຳເລັດ (Resolved)</option>
                        </select>

                        <button
                          onClick={() => {
                            if (window.confirm(`ຕ້ອງການລຶບຂໍ້ຂັດແຍ່ງລະຫັດ ${claim.tracking_number} ອອກຈາກ Supabase ແທ້ບໍ່?`)) {
                              deleteDisputeClaim(claim.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="ລຶບຂໍ້ຂັດແຍ່ງ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New Dispute Claim Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-lg">
                <ShieldAlert className="w-5 h-5" />
                <span>ແຈ້ງຂໍ້ຂັດແຍ່ງ / ເຄື່ອງເສຍຫາຍ (Supabase)</span>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewClaim} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ເລກພັດສະດຸ (Tracking Number) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.tracking_number}
                    onChange={(e) => handleSelectParcelForDispute(e.target.value.trim().toUpperCase())}
                    placeholder="ປ້ອນ ຫຼື ສະແກນລະຫັດເຄື່ອງ..."
                    className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    ຊື່ລູກຄ້າ
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="ຊື່ລູກຄ້າ..."
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    ເບີໂທລູກຄ້າ
                  </label>
                  <input
                    type="text"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="20XXXXXXXX"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    ສະຖານະເລີ່ມຕົ້ນ
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as DisputeStatus })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="pending">ລໍຖ້າກວດສອບ (Pending)</option>
                    <option value="investigating">ກຳລັງສືບສວນ (Investigating)</option>
                    <option value="approved">ອະນຸມັດຊົດເຊີຍ (Approved)</option>
                    <option value="rejected">ປະຕິເສດ (Rejected)</option>
                    <option value="resolved">ສຳເລັດ (Resolved)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    ມູນຄ່າຮ້ອງຮຽນ / ຄ່າຊົດເຊີຍ (₭)
                  </label>
                  <input
                    type="number"
                    value={formData.claim_amount}
                    onChange={(e) => setFormData({ ...formData, claim_amount: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ລາຍລະອຽດ / ສາເຫດການຮ້ອງຮຽນ (Notes)
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ຕົວຢ່າງ: ເຄື່ອງແຕກຫັກລະຫວ່າງຂົນສົ່ງ, ສາງໃຫຍ່ບໍ່ສົ່ງເຄື່ອງມາ, ລູກຄ້າບໍ່ພໍໃຈ..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                ></textarea>
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
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md transition-colors flex items-center justify-center gap-1.5"
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
