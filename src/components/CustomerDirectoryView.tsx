import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  MapPin, 
  Package, 
  DollarSign, 
  Plus, 
  Calendar, 
  ExternalLink, 
  MessageSquare, 
  Edit3, 
  X, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Share2, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Download,
  Filter,
  Check,
  Trash2,
  FileText,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { Customer, WarehouseParcel } from '../types';
import { 
  areSameCustomer, 
  formatLaoPhoneDisplay, 
  normalizePhone, 
  cleanCustomerNameAndPhone,
  areNamesSimilar,
  isShopOrderPhone 
} from '../utils/customerHelper';
import { formatDateDisplay } from '../utils/excel';

type ViewMode = 'table' | 'cards';
type SortField = 'name' | 'phone' | 'village' | 'notes' | 'totalParcels' | 'waitingParcels' | 'totalSpent' | 'lastActive';
type SortOrder = 'asc' | 'desc';
type FilterTag = 'all' | 'vip' | 'in_branch' | 'no_phone' | 'delivered';

export const CustomerDirectoryView: React.FC = () => {
  const { customers, parcels, addOrUpdateCustomer, updateCustomer, deleteCustomer, toggleCustomerVip } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table'); // Default to Table List View
  const [sortField, setSortField] = useState<SortField>('totalParcels');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterTag, setFilterTag] = useState<FilterTag>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit customer modal state
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    village: '',
    district: '',
    province: 'ນະຄອນຫຼວງວຽງຈັນ',
    notes: '',
    syncParcels: true
  });

  // Form state for new customer modal
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    village: '',
    district: '',
    province: 'ນະຄອນຫຼວງວຽງຈັນ',
    notes: ''
  });

  const formatKip = (val: number) => {
    return new Intl.NumberFormat('lo-LA').format(val) + ' ₭';
  };

  // Get parcels belonging to selected customer using smart matching
  const getCustomerParcels = (cust: { name?: string | null; phone?: string | null }): WarehouseParcel[] => {
    const cleanCust = cleanCustomerNameAndPhone(cust.name, cust.phone);
    return parcels.filter(p => {
      const cleanP = cleanCustomerNameAndPhone(p.customerName || '', p.customerPhone || '');
      return areSameCustomer(cleanCust, cleanP);
    });
  };

  // 1. Strict & Accurate Filter based on user query
  const filteredCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return customers.filter(c => {
      const cleanC = cleanCustomerNameAndPhone(c.name, c.phone);
      const cName = (c.name || '').toLowerCase();
      const cleanCName = cleanC.name.toLowerCase();
      const cPhoneRaw = (c.phone || '').toLowerCase();
      const cPhoneNorm = normalizePhone(c.phone) || normalizePhone(cleanC.phone);
      const cPhoneDigits = cPhoneRaw.replace(/[^0-9]/g, '');
      const cAliases = (c.nameAliases || []).map(a => a.toLowerCase());
      const cPhoneAliases = (c.phoneAliases || []).map(p => p.replace(/[^0-9]/g, ''));
      const cVillage = (c.village || '').toLowerCase();
      const cDistrict = (c.district || '').toLowerCase();

      // Filter by tag first (if applicable)
      if (filterTag === 'vip') {
        if (!c.isVip) return false;
      } else if (filterTag === 'in_branch') {
        const custParcels = getCustomerParcels(c);
        const inBranch = custParcels.filter(p => p.status === 'in_branch' || p.status === 'unmanifested').length;
        if (inBranch === 0) return false;
      } else if (filterTag === 'no_phone') {
        if (cPhoneNorm) return false;
      } else if (filterTag === 'delivered') {
        const custParcels = getCustomerParcels(c);
        const delivered = custParcels.filter(p => p.status === 'delivered').length;
        if (delivered === 0) return false;
      }

      // If no search query, keep item
      if (!query) return true;

      const tokens = query.split(/\s+/).filter(Boolean);

      // Check if ALL search tokens match some aspect of this customer
      return tokens.every(token => {
        const tokenDigits = token.replace(/[^0-9]/g, '');
        const isPureDigits = tokenDigits.length > 0 && tokenDigits === token;

        // If user typed dummy phone "0" or "00" (like searching "hch 0"):
        if (token === '0' || token === '00') {
          return !cPhoneNorm || cPhoneAliases.includes('0') || cAliases.some(a => a.includes('0'));
        }

        // 1. Direct Name or recorded aliases match
        if (cName.includes(token) || cleanCName.includes(token) || cAliases.some(a => a.includes(token))) {
          return true;
        }

        // 2. Name similarity / skeleton match (e.g. searching 'vnut' finds 'vinut', or 'HCH' finds 'hch')
        if (areNamesSimilar(token, cleanCName) || areNamesSimilar(token, cName)) {
          return true;
        }

        // 3. Phone matching: ONLY IF user typed 3 or more digits!
        // This ensures typing "0" or "20" doesn't accidentally match every Lao 020 number
        if (tokenDigits.length >= 3) {
          if (cPhoneNorm.includes(tokenDigits) || cPhoneDigits.includes(tokenDigits)) {
            return true;
          }
          if (cPhoneAliases.some(p => p.includes(tokenDigits))) {
            return true;
          }
        } else if (isPureDigits && tokenDigits.length > 0 && tokenDigits !== '20') {
          // If 1-2 distinctive digits, match exact normalized phone ending
          if (cPhoneNorm.endsWith(tokenDigits)) {
            return true;
          }
        }

        // 4. Village/District address match
        if (cVillage.includes(token) || cDistrict.includes(token)) {
          return true;
        }

        // 5. Match parcelCode or shippingCode
        const custParcels = getCustomerParcels(c);
        const matchesParcel = custParcels.some(p =>
          (p.parcelCode && p.parcelCode.toLowerCase().includes(token)) ||
          (p.shippingCode && p.shippingCode.toLowerCase().includes(token))
        );
        if (matchesParcel) {
          return true;
        }

        // 6. Match notes
        if (c.notes && c.notes.toLowerCase().includes(token)) {
          return true;
        }

        return false;
      });
    });
  }, [customers, searchTerm, parcels, filterTag]);

  // 2. Sort customers
  const sortedCustomers = useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, 'lo');
      } else if (sortField === 'phone') {
        comparison = (a.phone || '').localeCompare(b.phone || '');
      } else if (sortField === 'village') {
        comparison = (a.village || '').localeCompare(b.village || '', 'lo');
      } else if (sortField === 'notes') {
        comparison = (a.notes || '').localeCompare(b.notes || '', 'lo');
      } else if (sortField === 'totalParcels') {
        const countA = getCustomerParcels(a).length;
        const countB = getCustomerParcels(b).length;
        comparison = countA - countB;
      } else if (sortField === 'waitingParcels') {
        const waitA = getCustomerParcels(a).filter(p => p.status === 'in_branch' || p.status === 'unmanifested').length;
        const waitB = getCustomerParcels(b).filter(p => p.status === 'in_branch' || p.status === 'unmanifested').length;
        comparison = waitA - waitB;
      } else if (sortField === 'totalSpent') {
        const spentA = getCustomerParcels(a).filter(p => p.status === 'delivered').reduce((s, p) => s + (p.customerPrice || 0), 0);
        const spentB = getCustomerParcels(b).filter(p => p.status === 'delivered').reduce((s, p) => s + (p.customerPrice || 0), 0);
        comparison = (spentA || a.totalSpent || 0) - (spentB || b.totalSpent || 0);
      } else if (sortField === 'lastActive') {
        comparison = (a.lastActive || '').localeCompare(b.lastActive || '');
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredCustomers, sortField, sortOrder, parcels]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'name' || field === 'village' || field === 'notes' ? 'asc' : 'desc');
    }
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditFormData({
      name: cust.name || '',
      phone: cust.phone || '',
      village: cust.village || '',
      district: cust.district || '',
      province: cust.province || 'ນະຄອນຫຼວງວຽງຈັນ',
      notes: cust.notes || '',
      syncParcels: true
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    if (!editFormData.name.trim() && !editFormData.phone.trim()) {
      alert('ກະລຸນາປ້ອນຊື່ ຫຼື ເບີໂທລະສັບ');
      return;
    }

    updateCustomer(
      editingCustomer.id,
      {
        name: editFormData.name.trim(),
        phone: editFormData.phone.trim(),
        village: editFormData.village.trim(),
        district: editFormData.district.trim(),
        province: editFormData.province.trim(),
        notes: editFormData.notes.trim()
      },
      editFormData.syncParcels
    );

    if (selectedCustomer && selectedCustomer.id === editingCustomer.id) {
      setSelectedCustomer(prev => prev ? {
        ...prev,
        name: editFormData.name.trim(),
        phone: editFormData.phone.trim(),
        village: editFormData.village.trim(),
        district: editFormData.district.trim(),
        province: editFormData.province.trim(),
        notes: editFormData.notes.trim()
      } : null);
    }

    setEditingCustomer(null);
  };

  const handleDeleteCustomer = (cust: Customer) => {
    if (window.confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບລູກຄ້າ "${cust.name}" ອອກຈາກລະບົບ?`)) {
      deleteCustomer(cust.id);
      if (selectedCustomer?.id === cust.id) {
        setSelectedCustomer(null);
      }
      if (editingCustomer?.id === cust.id) {
        setEditingCustomer(null);
      }
    }
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() && !formData.phone.trim()) {
      alert('ກະລຸນາປ້ອນຊື່ ຫຼື ເບີໂທລະສັບ');
      return;
    }

    addOrUpdateCustomer({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      village: formData.village.trim(),
      district: formData.district.trim(),
      province: formData.province.trim(),
      notes: formData.notes.trim()
    });

    setFormData({
      name: '',
      phone: '',
      village: '',
      district: '',
      province: 'ນະຄອນຫຼວງວຽງຈັນ',
      notes: ''
    });
    setShowAddModal(false);
  };

  // Export Customer List to Excel
  const exportCustomersToExcel = () => {
    if (sortedCustomers.length === 0) {
      alert('ບໍ່ມີຂໍ້ມູນລູກຄ້າທີ່ຈະ Export');
      return;
    }

    const exportData = sortedCustomers.map((cust, idx) => {
      const custParcels = getCustomerParcels(cust);
      const waiting = custParcels.filter(p => p.status === 'in_branch' || p.status === 'unmanifested').length;
      const delivered = custParcels.filter(p => p.status === 'delivered').length;
      const totalSpent = custParcels.filter(p => p.status === 'delivered').reduce((s, p) => s + (p.customerPrice || 0), 0);

      return {
        'ລຳດັບ': idx + 1,
        'ຊື່ລູກຄ້າ': cust.name,
        'ເບີໂທລະສັບ': cust.phone ? formatLaoPhoneDisplay(cust.phone) : '0 (ບໍ່ມີເບີ)',
        'ບ້ານ / ທີ່ຢູ່': cust.village || '',
        'ເມືອງ': cust.district || '',
        'ແຂວງ': cust.province || '',
        'ໝາຍເຫດ': cust.notes || '',
        'ພັດສະດຸທັງໝົດ': custParcels.length,
        'ເຄື່ອງຢູ່ສາງ': waiting,
        'ຮັບເຄື່ອງແລ້ວ': delivered,
        'ຍອດເງິນທີ່ຊຳລະ (ກີບ)': totalSpent || cust.totalSpent || 0,
        'ເຄື່ອນໄຫວລ່າສຸດ': formatDateDisplay(cust.lastActive),
        'ຊື່ສາງທີ່ເຄີຍພິມຜິດ': (cust.nameAliases || []).filter(a => a.toLowerCase() !== cust.name.toLowerCase()).join(', ')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ລາຍຊື່ລູກຄ້າ');
    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `ລາຍຊື່ລູກຄ້າ_ສາຂາ_${todayStr}.xlsx`);
  };

  // WhatsApp link helper for Laos (+856 20...)
  const getWhatsAppUrl = (phone: string) => {
    const clean8 = normalizePhone(phone);
    if (!clean8) return '#';
    return `https://wa.me/85620${clean8}`;
  };

  // Summary Metrics
  const totalWaitingCount = useMemo(() => {
    return parcels.filter(p => p.status === 'in_branch' || p.status === 'unmanifested').length;
  }, [parcels]);

  const totalSpentAll = useMemo(() => {
    return parcels.filter(p => p.status === 'delivered').reduce((sum, p) => sum + (p.customerPrice || 0), 0);
  }, [parcels]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2 border border-indigo-200">
            <Users className="w-3.5 h-3.5" />
            <span>ຂໍ້ 7: ຖານຂໍ້ມູນລູກຄ້າອັດສະລິຍະ (Smart Customer CRM)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            ຂໍ້ມູນລູກຄ້າ & ປະຫວັດຮັບເຄື່ອງ (Customer Directory)
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={exportCustomersToExcel}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 transition border border-slate-200"
            title="ດາວໂຫລດລາຍຊື່ລູກຄ້າເປັນ Excel"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ ເພີ່ມລູກຄ້າໃໝ່</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400">ລູກຄ້າທັງໝົດ</div>
            <div className="text-lg font-black text-slate-900">{customers.length} ຄົນ</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400">ເຄື່ອງລໍຖ້າຮັບຢູ່ສາງ</div>
            <div className="text-lg font-black text-blue-600">{totalWaitingCount} ຊິ້ນ</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400">ຍອດເກັບເງິນລວມ</div>
            <div className="text-lg font-black text-emerald-600">{formatKip(totalSpentAll)}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400">ພັດສະດຸທັງໝົດໃນລະບົບ</div>
            <div className="text-lg font-black text-slate-900">{parcels.length} ຊິ້ນ</div>
          </div>
        </div>
      </div>

      {/* Search Bar, Filters & View Mode Toggle */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ຄົ້ນຫາຊື່ (ເຊັ່ນ: hch, vinut, koung), ເບີໂທ, ຫຼື ລະຫັດເຄື່ອງ..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs px-1"
                title="ລ້າງຄຳຄົ້ນຫາ"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Toggle (Table List View vs Cards View) */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-xs font-bold text-slate-500">
              {searchTerm ? (
                <span className="text-indigo-600 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                  ພົບ {sortedCustomers.length} ຄົນ ຈາກ "{searchTerm}"
                </span>
              ) : (
                <span>ສະແດງ {sortedCustomers.length} ຄົນ</span>
              )}
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="ມຸມມອງຕາຕະລາງ (Table View) - ຄລິກຫົວຖັນເພື່ອ Sort ໄດ້"
              >
                <List className="w-3.5 h-3.5" />
                <span>ຕາຕະລາງ (List)</span>
              </button>

              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'cards' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="ມຸມມອງກາດ (Cards View)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>ກາດ (Cards)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Chips & Active Sort Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" />
              <span>Filter:</span>
            </span>

            <button
              onClick={() => setFilterTag('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                filterTag === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ທັງໝົດ ({customers.length})
            </button>

            <button
              onClick={() => setFilterTag('vip')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                filterTag === 'vip'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
              }`}
            >
              ⭐ ລູກຄ້າ VIP ({customers.filter(c => c.isVip).length})
            </button>

            <button
              onClick={() => setFilterTag('in_branch')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                filterTag === 'in_branch'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              ມີເຄື່ອງຢູ່ສາງ ({customers.filter(c => getCustomerParcels(c).some(p => p.status === 'in_branch' || p.status === 'unmanifested')).length})
            </button>

            <button
              onClick={() => setFilterTag('no_phone')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                filterTag === 'no_phone'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              ບໍ່ມີເບີ / ເບີ 0 ({customers.filter(c => !normalizePhone(c.phone)).length})
            </button>

            <button
              onClick={() => setFilterTag('delivered')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                filterTag === 'delivered'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              ເຄີຍຮັບເຄື່ອງແລ້ວ ({customers.filter(c => getCustomerParcels(c).some(p => p.status === 'delivered')).length})
            </button>
          </div>

          {/* Active Sort Label */}
          <div className="text-[11px] text-slate-500 font-medium">
            <span>ຈັດລຽງຕາມ: </span>
            <span className="font-bold text-indigo-700">
              {sortField === 'name' && 'ຊື່ລູກຄ້າ'}
              {sortField === 'phone' && 'ເບີໂທລະສັບ'}
              {sortField === 'village' && 'ທີ່ຢູ່ / ບ້ານ'}
              {sortField === 'totalParcels' && 'ພັດສະດຸທັງໝົດ'}
              {sortField === 'waitingParcels' && 'ເຄື່ອງຢູ່ສາງ'}
              {sortField === 'totalSpent' && 'ຍອດຊຳລະລວມ'}
              {sortField === 'lastActive' && 'ເຄື່ອນໄຫວລ່າສຸດ'}
            </span>
            <span className="ml-1 text-slate-400">
              ({sortOrder === 'asc' ? 'ນ້ອຍ → ຫຼາຍ / A → Z' : 'ຫຼາຍ → ນ້ອຍ / Z → A'})
            </span>
          </div>
        </div>
      </div>

      {/* VIEW 1: TABLE / LIST VIEW (WITH CLICK-TO-SORT HEADERS) */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3 px-4 text-center w-12 text-slate-400">#</th>

                  {/* Sortable: Name */}
                  <th 
                    onClick={() => handleSort('name')}
                    className={`py-3 px-4 cursor-pointer hover:bg-slate-100 transition group ${
                      sortField === 'name' ? 'bg-indigo-50/50 text-indigo-900' : ''
                    }`}
                    title="ກົດເພື່ອຈັດລຽງຕາມຊື່"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ຊື່ລູກຄ້າ (Customer)</span>
                      {sortField === 'name' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  {/* Sortable: Phone */}
                  <th 
                    onClick={() => handleSort('phone')}
                    className={`py-3 px-4 cursor-pointer hover:bg-slate-100 transition group ${
                      sortField === 'phone' ? 'bg-indigo-50/50 text-indigo-900' : ''
                    }`}
                    title="ກົດເພື່ອຈັດລຽງຕາມເບີໂທ"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ເບີໂທລະສັບ (Phone)</span>
                      {sortField === 'phone' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  {/* Sortable: Village */}
                  <th 
                    onClick={() => handleSort('village')}
                    className={`py-3 px-4 cursor-pointer hover:bg-slate-100 transition group ${
                      sortField === 'village' ? 'bg-indigo-50/50 text-indigo-900' : ''
                    }`}
                    title="ກົດເພື່ອຈັດລຽງຕາມບ້ານ/ທີ່ຢູ່"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ທີ່ຢູ່ / ບ້ານ</span>
                      {sortField === 'village' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  {/* Sortable: Notes */}
                  <th 
                    onClick={() => handleSort('notes')}
                    className={`py-3 px-4 cursor-pointer hover:bg-slate-100 transition group ${
                      sortField === 'notes' ? 'bg-indigo-50/50 text-indigo-900' : ''
                    }`}
                    title="ກົດເພື່ອຈັດລຽງຕາມໝາຍເຫດ"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ໝາຍເຫດ (Note)</span>
                      {sortField === 'notes' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  {/* Sortable: Total Parcels */}
                  <th 
                    onClick={() => handleSort('totalParcels')}
                    className={`py-3 px-4 cursor-pointer hover:bg-slate-100 transition group text-center ${
                      sortField === 'totalParcels' ? 'bg-indigo-50/50 text-indigo-900' : ''
                    }`}
                    title="ກົດເພື່ອຈັດລຽງຕາມຈຳນວນພັດສະດຸທັງໝົດ"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>ພັດສະດຸທັງໝົດ</span>
                      {sortField === 'totalParcels' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  {/* Sortable: Waiting in Branch */}
                  <th 
                    onClick={() => handleSort('waitingParcels')}
                    className={`py-3 px-4 cursor-pointer hover:bg-slate-100 transition group text-center ${
                      sortField === 'waitingParcels' ? 'bg-indigo-50/50 text-indigo-900' : ''
                    }`}
                    title="ກົດເພື່ອຈັດລຽງຕາມເຄື່ອງທີ່ຢູ່ສາງ"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>ເຄື່ອງຢູ່ສາງ</span>
                      {sortField === 'waitingParcels' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  {/* Sortable: Total Spent */}
                  <th 
                    onClick={() => handleSort('totalSpent')}
                    className={`py-3 px-4 cursor-pointer hover:bg-slate-100 transition group ${
                      sortField === 'totalSpent' ? 'bg-indigo-50/50 text-indigo-900' : ''
                    }`}
                    title="ກົດເພື່ອຈັດລຽງຕາມຍອດຊຳລະລວມ"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ຍອດຊຳລະລວມ</span>
                      {sortField === 'totalSpent' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  {/* Sortable: Last Active */}
                  <th 
                    onClick={() => handleSort('lastActive')}
                    className={`py-3 px-4 cursor-pointer hover:bg-slate-100 transition group ${
                      sortField === 'lastActive' ? 'bg-indigo-50/50 text-indigo-900' : ''
                    }`}
                    title="ກົດເພື່ອຈັດລຽງຕາມວັນທີເຄື່ອນໄຫວລ່າສຸດ"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>ເຄື່ອນໄຫວລ່າສຸດ</span>
                      {sortField === 'lastActive' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  <th className="py-3 px-4 text-center">ຈັດການ & ປະຫວັດ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-slate-400">
                      {searchTerm ? (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-600">
                            ບໍ່ພົບຂໍ້ມູນລູກຄ້າທີ່ກົງກັບ "{searchTerm}"
                          </p>
                          <p className="text-xs text-slate-400">
                            ລອງກວດສອບຄຳຄົ້ນຫາ ຫຼື ກົດປຸ່ມ ✕ ເພື່ອລ້າງການຄົ້ນຫາ
                          </p>
                          <button
                            onClick={() => setSearchTerm('')}
                            className="mt-2 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                          >
                            ລ້າງຄຳຄົ້ນຫາ
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-600">ຍັງບໍ່ມີຂໍ້ມູນລູກຄ້າໃນລະບົບ</p>
                          <p className="text-xs text-slate-400">ເມື່ອນຳເຂົ້າ Excel ຫຼື ສະແກນພັດສະດຸ ລະບົບຈະສ້າງຖານຂໍ້ມູນລູກຄ້າໃຫ້ອັດຕະໂນມັດ</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  sortedCustomers.map((cust, idx) => {
                    const customerParcels = getCustomerParcels(cust);
                    const inBranchCount = customerParcels.filter(p => p.status === 'in_branch' || p.status === 'unmanifested').length;
                    const deliveredSpent = customerParcels
                      .filter(p => p.status === 'delivered')
                      .reduce((sum, p) => sum + (p.customerPrice || 0), 0);
                    
                    // Other names/typos recorded from warehouse
                    const otherNameAliases = (cust.nameAliases || []).filter(
                      a => a.toLowerCase() !== cust.name.toLowerCase()
                    );

                    // Check if another customer shares this same phone number
                    const otherShared = customers.filter(
                      other => other.id !== cust.id && normalizePhone(other.phone) && normalizePhone(other.phone) === normalizePhone(cust.phone)
                    );

                    return (
                      <tr key={cust.id} className="hover:bg-slate-50/80 transition">
                        {/* Index */}
                        <td className="py-3 px-4 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>

                        {/* Customer Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{cust.name}</span>
                            {cust.isVip && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-white font-extrabold shadow-2xs">
                                ⭐ VIP
                              </span>
                            )}
                            {otherNameAliases.length > 0 && (
                              <span 
                                className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium"
                                title={`ຊື່ທີ່ສາງໃຫຍ່ເຄີຍພິມຜິດ: ${otherNameAliases.join(', ')}`}
                              >
                                ຊື່ສາງ: {otherNameAliases.join(', ')}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-3 px-4">
                          {cust.phone && normalizePhone(cust.phone) ? (
                            <div>
                              <span className="font-mono font-bold text-slate-800">
                                {formatLaoPhoneDisplay(cust.phone)}
                              </span>
                              {isShopOrderPhone(cust.phone) ? (
                                <div className="mt-0.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                                    🏷️ ເບີສັ່ງເຄື່ອງຮ້ານ
                                  </span>
                                </div>
                              ) : otherShared.length > 0 ? (
                                <div className="text-[10px] text-purple-700 font-medium flex items-center gap-1 mt-0.5">
                                  <Share2 className="w-2.5 h-2.5" />
                                  <span>ໃຊ້ເບີດຽວກັບ: {otherShared.map(o => o.name).join(', ')}</span>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium">
                              0 (ບໍ່ມີເບີ)
                            </span>
                          )}
                        </td>

                        {/* Village / Address */}
                        <td className="py-3 px-4 text-slate-600">
                          {cust.village || cust.district ? `${cust.village} ${cust.district}` : '-'}
                        </td>

                        {/* Notes / Remark */}
                        <td className="py-3 px-4 max-w-[200px]">
                          {cust.notes ? (
                            <div
                              onClick={() => handleOpenEdit(cust)}
                              className="flex items-center gap-1.5 text-xs text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg cursor-pointer transition"
                              title="ກົດເພື່ອແກ້ໄຂໝາຍເຫດ"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="truncate">{cust.notes}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenEdit(cust)}
                              className="text-[11px] text-slate-400 hover:text-indigo-600 hover:bg-slate-100 px-2 py-0.5 rounded transition flex items-center gap-1"
                              title="ກົດເພື່ອເພີ່ມໝາຍເຫດ"
                            >
                              <Plus className="w-3 h-3" />
                              <span>ເພີ່ມໝາຍເຫດ</span>
                            </button>
                          )}
                        </td>

                        {/* Total Parcels */}
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {customerParcels.length} ຊິ້ນ
                          </span>
                        </td>

                        {/* Waiting in Branch */}
                        <td className="py-3 px-4 text-center">
                          {inBranchCount > 0 ? (
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full text-xs">
                              {inBranchCount} ຊິ້ນ
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">0</span>
                          )}
                        </td>

                        {/* Total Spent */}
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                          {formatKip(deliveredSpent || cust.totalSpent || 0)}
                        </td>

                        {/* Last Active */}
                        <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                          {formatDateDisplay(cust.lastActive)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Quick VIP Toggle (Supabase is_vip) */}
                            <button
                              onClick={() => toggleCustomerVip(cust.id, !cust.isVip)}
                              className={`px-2 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition border cursor-pointer ${
                                cust.isVip
                                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                                  : 'bg-slate-100 hover:bg-amber-50 text-slate-500 hover:text-amber-700 border-slate-200 hover:border-amber-200'
                              }`}
                              title={cust.isVip ? 'ຄລິກເພື່ອຍົກເລີກ VIP ໃນ Supabase' : 'ຄລິກເພື່ອຕັ້ງເປັນ VIP ໃນ Supabase (is_vip = true)'}
                            >
                              <span>{cust.isVip ? '⭐ VIP' : '☆ ຕັ້ງ VIP'}</span>
                            </button>

                            {/* Edit Customer Button */}
                            <button
                              onClick={() => handleOpenEdit(cust)}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center gap-1 transition border border-amber-200"
                              title="ແກ້ໄຂຂໍ້ມູນລູກຄ້າ (ຊື່, ເບີໂທ, ໝາຍເຫດ)"
                            >
                              <Edit3 className="w-3 h-3 text-amber-700" />
                              <span>ແກ້ໄຂ</span>
                            </button>

                            {/* Parcels history */}
                            <button
                              onClick={() => setSelectedCustomer(cust)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 transition"
                              title="ເບິ່ງປະຫວັດພັດສະດຸທັງໝົດ"
                            >
                              <span>ປະຫວັດ ({customerParcels.length})</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>

                            {cust.phone && normalizePhone(cust.phone) && (
                              <>
                                <a
                                  href={`tel:${normalizePhone(cust.phone)}`}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition"
                                  title="ໂທອອກ"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={getWhatsAppUrl(cust.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition"
                                  title="ສົ່ງ WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              </>
                            )}

                            {/* Delete customer */}
                            <button
                              onClick={() => handleDeleteCustomer(cust)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                              title="ລຶບລູກຄ້ານີ້"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* VIEW 2: CARDS VIEW */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCustomers.length === 0 ? (
            <div className="col-span-3 py-16 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
              ບໍ່ພົບຂໍ້ມູນລູກຄ້າທີ່ກົງກັບຄຳຄົ້ນຫາ "{searchTerm}"
            </div>
          ) : (
            sortedCustomers.map((cust) => {
              const customerParcels = getCustomerParcels(cust);
              const inBranchCount = customerParcels.filter(p => p.status === 'in_branch' || p.status === 'unmanifested').length;
              const deliveredCount = customerParcels.filter(p => p.status === 'delivered').length;
              const deliveredSpent = customerParcels
                .filter(p => p.status === 'delivered')
                .reduce((sum, p) => sum + (p.customerPrice || 0), 0);

              const otherShared = customers.filter(
                other => other.id !== cust.id && normalizePhone(other.phone) && normalizePhone(other.phone) === normalizePhone(cust.phone)
              );

              const otherNameAliases = (cust.nameAliases || []).filter(
                a => a.toLowerCase() !== cust.name.toLowerCase()
              );

              return (
                <div
                  key={cust.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition truncate">
                            {cust.name}
                          </h4>
                          {otherNameAliases.length > 0 && (
                            <span 
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium"
                              title={`ຊື່ທີ່ສາງໃຫຍ່ເຄີຍພິມຜິດ: ${otherNameAliases.join(', ')}`}
                            >
                              ຊື່ສາງ: {otherNameAliases.join(', ')}
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-mono text-slate-600 flex items-center gap-1 mt-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-bold text-slate-800">
                            {cust.phone && normalizePhone(cust.phone) ? formatLaoPhoneDisplay(cust.phone) : '0 (ບໍ່ມີເບີ)'}
                          </span>
                        </div>

                        {isShopOrderPhone(cust.phone) ? (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                            🏷️ ເບີສັ່ງເຄື່ອງຮ້ານ
                          </div>
                        ) : otherShared.length > 0 ? (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                            <Share2 className="w-3 h-3 text-purple-500" />
                            <span>ໃຊ້ເບີດຽວກັບ: {otherShared.map(o => o.name).join(', ')}</span>
                          </div>
                        ) : null}
                      </div>

                      {inBranchCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0 animate-pulse">
                          ມີ {inBranchCount} ເຄື່ອງຢູ່ສາງ
                        </span>
                      )}
                    </div>

                    {(cust.village || cust.district) && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-2.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{cust.village} {cust.district} {cust.province}</span>
                      </div>
                    )}

                    {cust.notes && (
                      <div 
                        onClick={() => handleOpenEdit(cust)}
                        className="text-[11px] text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl flex items-start gap-1.5 mt-2.5 cursor-pointer transition"
                        title="ກົດເພື່ອແກ້ໄຂໝາຍເຫດ"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-2"><strong>ໝາຍເຫດ:</strong> {cust.notes}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-semibold block">ພັດສະດຸທັງໝົດ</span>
                        <span className="font-bold text-slate-900 text-sm">{customerParcels.length} ຊິ້ນ</span>
                        <span className="text-[10px] text-slate-500 block">
                          (ຮັບແລ້ວ: {deliveredCount} • ຄ້າງ: {inBranchCount})
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-semibold block">ຍອດເງິນທີ່ເຄີຍຈ່າຍ</span>
                        <span className="font-bold text-emerald-700 text-sm">{formatKip(deliveredSpent || cust.totalSpent || 0)}</span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          ລ່າສຸດ: {formatDateDisplay(cust.lastActive)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {cust.phone && normalizePhone(cust.phone) && (
                        <>
                          <a
                            href={`tel:${normalizePhone(cust.phone)}`}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition"
                            title="ໂທອອກ"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={getWhatsAppUrl(cust.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition"
                            title="ສົ່ງຂໍ້ຄວາມ WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteCustomer(cust)}
                        className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                        title="ລຶບລູກຄ້ານີ້"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(cust)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition flex items-center gap-1 border border-amber-200"
                        title="ແກ້ໄຂຂໍ້ມູນລູກຄ້າ"
                      >
                        <Edit3 className="w-3 h-3 text-amber-700" />
                        <span>ແກ້ໄຂ</span>
                      </button>

                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1"
                      >
                        <span>ປະຫວັດ ({customerParcels.length})</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Customer Detail & Parcel History Drawer/Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{selectedCustomer.name}</h3>
                  {selectedCustomer.nameAliases && selectedCustomer.nameAliases.length > 1 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-medium">
                      ຊື່ສາງ: {selectedCustomer.nameAliases.filter(a => a.toLowerCase() !== selectedCustomer.name.toLowerCase()).join(', ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-mono mt-0.5">
                  {selectedCustomer.phone && normalizePhone(selectedCustomer.phone) ? formatLaoPhoneDisplay(selectedCustomer.phone) : '0 (ບໍ່ມີເບີ)'}
                  {(selectedCustomer.village || selectedCustomer.district) && ` • ${selectedCustomer.village || ''} ${selectedCustomer.district || ''}`}
                </p>
                {selectedCustomer.notes && (
                  <div className="mt-2 text-xs bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span><strong>ໝາຍເຫດ:</strong> {selectedCustomer.notes}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 text-xs font-semibold text-slate-700 flex justify-between items-center">
              <span>ລາຍການພັດສະດຸທັງໝົດຂອງລູກຄ້າຄົນນີ້ ({getCustomerParcels(selectedCustomer).length} ຊິ້ນ):</span>
              <span className="text-indigo-600 font-mono font-bold">
                ຍອດລວມ: {formatKip(getCustomerParcels(selectedCustomer).reduce((acc, p) => acc + (p.customerPrice || 0), 0))}
              </span>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {getCustomerParcels(selectedCustomer).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  ຍັງບໍ່ມີປະຫວັດພັດສະດຸໃນລະບົບ
                </div>
              ) : (
                getCustomerParcels(selectedCustomer).map((p) => (
                  <div key={p.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-700">{p.parcelCode}</span>
                        <span className="font-mono text-slate-500">({p.shippingCode})</span>
                        {p.customerName && p.customerName.toLowerCase() !== selectedCustomer.name.toLowerCase() && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            ຊື່ໃນໃບບິນ: {p.customerName}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        ວັນທີ: {formatDateDisplay(p.date)} • ຕົ້ນທຶນສາງ: {formatKip(p.warehouseCost)}
                        {p.weightKg ? ` • ${p.weightKg}kg` : ''}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-900">{formatKip(p.customerPrice)}</div>
                      <div>
                        {p.status === 'delivered' && (
                          <span className="text-[10px] text-emerald-600 font-semibold">✓ ຮັບເຄື່ອງແລ້ວ</span>
                        )}
                        {(p.status === 'in_branch' || p.status === 'unmanifested') && (
                          <span className="text-[10px] text-blue-600 font-semibold">● ຮອດສາຂາແລ້ວ</span>
                        )}
                        {p.status === 'pending_arrival' && (
                          <span className="text-[10px] text-amber-600 font-semibold">⏱ ຍັງບໍ່ຮອດ</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => {
                  handleOpenEdit(selectedCustomer);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>ແກ້ໄຂຂໍ້ມູນລູກຄ້ານີ້</span>
              </button>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                ປິດ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">ເພີ່ມຂໍ້ມູນລູກຄ້າໃໝ່</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 pt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ຊື່ ແລະ ນາມສະກຸນ</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ເຊັ່ນ: hch ຫຼື ທ້າວ ຄຳຫຼ້າ"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ເບີໂທລະສັບ (ຖ້າບໍ່ມີໃສ່ 0 ໄດ້)</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="020 5xxxxxxx ຫຼື 0"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ບ້ານ</label>
                  <input
                    type="text"
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    placeholder="ບ້ານ ດົງໂດກ"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ເມືອງ</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    placeholder="ໄຊທານີ"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ໝາຍເຫດ</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ໝາຍເຫດເພີ່ມເຕີມ..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  ບັນທຶກລູກຄ້າ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">ແກ້ໄຂຂໍ້ມູນລູກຄ້າ</h3>
                  <p className="text-[11px] text-slate-500">ປັບປຸງຊື່, ເບີໂທ, ທີ່ຢູ່, ໝາຍເຫດ ແລະ ແກ້ໄຂຂໍ້ມູນລູກຄ້າ</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 pt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ຊື່ລູກຄ້າ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="ເຊັ່ນ: ying, sing, ving, hch..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-900 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ເບີໂທລະສັບ
                  <span className="text-slate-400 font-normal ml-2">(ຖ້າບໍ່ມີເບີ ໃຫ້ໃສ່ 0)</span>
                </label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="020 5xxxxxxx ຫຼື 0"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-900 font-medium"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  * ຖ້າລູກຄ້າໃຊ້ເບີສັ່ງເຄື່ອງຮ້ານ (59977559) ລະບົບຈະແຍກເປັນຄົນລະຄົນກັບລູກຄ້າອື່ນໃຫ້ອັດຕະໂນມັດ
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ບ້ານ / ທີ່ຢູ່</label>
                  <input
                    type="text"
                    value={editFormData.village}
                    onChange={(e) => setEditFormData({ ...editFormData, village: e.target.value })}
                    placeholder="ເຊັ່ນ: ບ້ານ ດົງໂດກ"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ເມືອງ</label>
                  <input
                    type="text"
                    value={editFormData.district}
                    onChange={(e) => setEditFormData({ ...editFormData, district: e.target.value })}
                    placeholder="ເຊັ່ນ: ໄຊທານີ"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ໝາຍເຫດ (Remarks / Notes)
                </label>
                <textarea
                  rows={3}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="ເຊັ່ນ: ລູກຄ້າປະຈຳ, ຢ່າລວມເບີກັບຄົນອື່ນ, ໂທຫາຕອນແລງ..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.syncParcels}
                    onChange={(e) => setEditFormData({ ...editFormData, syncParcels: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 mt-0.5"
                  />
                  <div className="text-[11px] text-amber-900 leading-tight">
                    <span className="font-bold">ອັບເດດຊື່ ແລະ ເບີໂທ ໃນພັດສະດຸທັງໝົດຂອງລູກຄ້ານີ້ໄປພ້ອມ</span>
                    <p className="text-amber-700 mt-0.5 text-[10px]">
                      ແນະນຳໃຫ້ເລືອກ ເພື່ອໃຫ້ພັດສະດຸທັງໝົດຂອງລູກຄ້ານີ້ປ່ຽນມາໃຊ້ຊື່ ແລະ ເບີໂທທີ່ຖືກຕ້ອງ
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteCustomer(editingCustomer)}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold flex items-center gap-1.5 transition text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ລຶບລູກຄ້າ</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    ຍົກເລີກ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition"
                  >
                    ບັນທຶກການແກ້ໄຂ
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
