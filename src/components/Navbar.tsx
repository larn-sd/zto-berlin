import React, { useState } from 'react';
import { 
  Package, 
  LayoutDashboard, 
  FileInput, 
  ScanLine, 
  GitCompare, 
  ShoppingBag, 
  Receipt, 
  Users, 
  Volume2, 
  VolumeX, 
  LogOut, 
  UserCheck, 
  AlertTriangle,
  RotateCcw,
  Trash2,
  UserPlus,
  Boxes,
  ShieldAlert,
  Wallet,
  Database,
  Check,
  Copy,
  RefreshCw,
  KeyRound,
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TabKey, isUserAdmin } from '../types';
import { StaffManagementModal } from './StaffManagementModal';
import { ChangePasswordModal } from './ChangePasswordModal';

interface NavbarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const { 
    currentUser, 
    switchUser, 
    logout, 
    users, 
    soundEnabled, 
    toggleSound, 
    parcels, 
    clearAllData, 
    loadDemoData,
    supabaseConnected,
    supabaseHealth,
    bills,
    financialLedger,
    refreshSupabaseData,
    syncAllToSupabase
  } = useApp();

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const isStaff = !isUserAdmin(currentUser);

  // Discrepancy counts
  const missingCount = parcels.filter(p => p.status === 'pending_arrival').length;
  const unmanifestedCount = parcels.filter(p => p.status === 'unmanifested').length;
  const totalDiscrepancies = missingCount + unmanifestedCount;

  // In-branch pending pickup
  const waitingPickupCount = parcels.filter(p => p.status === 'in_branch').length;

  const allNavItems: { key: TabKey; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    { 
      key: 'dashboard', 
      label: 'Dashboard', 
      icon: <LayoutDashboard className="w-4 h-4" /> 
    },
    { 
      key: 'warehouse_inbound', 
      label: '1. ສາງໃຫຍ່ສົ່ງມາ', 
      icon: <FileInput className="w-4 h-4" />,
      badge: parcels.filter(p => !p.isUnmanifested && p.status === 'pending_arrival').length > 0 ? parcels.filter(p => !p.isUnmanifested && p.status === 'pending_arrival').length : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    { 
      key: 'parcel_tracking', 
      label: '2. ຕິດຕາມເຄື່ອງທັງໝົດ', 
      icon: <Boxes className="w-4 h-4" />,
      badge: parcels.length > 0 ? parcels.length : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-800'
    },
    { 
      key: 'branch_scan', 
      label: '3. ສະແກນຮັບເຂົ້າສາຂາ', 
      icon: <ScanLine className="w-4 h-4" /> 
    },
    { 
      key: 'discrepancy', 
      label: '4. ທຽບເຄື່ອງຕົກຄ້າງ', 
      icon: <GitCompare className="w-4 h-4" />,
      badge: totalDiscrepancies > 0 ? totalDiscrepancies : undefined,
      badgeColor: 'bg-rose-500 text-white animate-pulse'
    },
    { 
      key: 'customer_checkout', 
      label: '5. ສະແກນຈ່າຍໃຫ້ລູກຄ້າ', 
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: waitingPickupCount > 0 ? waitingPickupCount : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    { 
      key: 'bills_history', 
      label: 'ປະຫວັດໃບບິນ', 
      icon: <Receipt className="w-4 h-4" /> 
    },
    { 
      key: 'customers', 
      label: 'ຂໍ້ມູນລູກຄ້າ', 
      icon: <Users className="w-4 h-4" /> 
    },
    { 
      key: 'financial_ledger', 
      label: 'ບັນຊີລາຍຮັບ-ລາຍຈ່າຍ', 
      icon: <Wallet className="w-4 h-4" />,
      badge: financialLedger.length > 0 ? financialLedger.length : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
  ];

  // Role permissions: Staff sees ONLY: 1. ຕິດຕາມເຄື່ອງ, 2. ສະແກນຮັບເຂົ້າ, 3. ສະແກນຈ່າຍລູກຄ້າ, 4. ປະຫວັດບິນ
  const staffAllowedTabs: TabKey[] = ['parcel_tracking', 'branch_scan', 'customer_checkout', 'bills_history'];
  const navItems = isStaff 
    ? allNavItems.filter(item => staffAllowedTabs.includes(item.key))
    : allNavItems;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Branch Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">ZTO Berlin</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  isStaff 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}>
                  {isStaff ? '📦 ພະນັກງານ (Staff)' : '👑 ເຈົ້າຂອງຮ້ານ (Admin)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {currentUser?.branchName || 'ສາຂາ ໜອງບົວທອງ (Berlin)'} • ຈັດການພັດສະດຸຄົບວົງຈອນ
              </p>
            </div>
          </div>

          {/* Right actions: Discrepancy indicator, Sound, User profile, Demo Reset */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!isStaff && totalDiscrepancies > 0 && (
              <button
                onClick={() => onSelectTab('discrepancy')}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition"
                title="ກວດສອບເຄື່ອງບໍ່ເຫັນ ຫຼື ສາງໃຫຍ່ລືມສະແກນ"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>ພົບເຄື່ອງຜິດດ່ຽງ: {totalDiscrepancies} ລາຍການ</span>
              </button>
            )}

            {/* Supabase Database Connection Status */}
            <button
              onClick={() => setShowSupabaseModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
              title="ຄລິກເພື່ອເບິ່ງສະຖານະ Supabase Database"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Supabase:</span>
              <span className="flex items-center gap-1 font-bold">
                <span className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                {supabaseConnected ? 'Connected' : 'Live'}
              </span>
            </button>

            {/* Sound toggle */}
            <button
              onClick={toggleSound}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title={soundEnabled ? 'ສຽງສະແກນ: ເປີດຢູ່ (ຄລິກເພື່ອປິດ)' : 'ສຽງສະແກນ: ປິດຢູ່ (ຄລິກເພື່ອເປີດ)'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-indigo-600" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
            </button>

            {/* Staff Management quick button (Owner view) */}
            {!isStaff && (
              <button
                onClick={() => setShowStaffModal(true)}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 hover:bg-indigo-100 bg-indigo-50 border border-indigo-200 transition"
                title="ຈັດການ ແລະ ເພີ່ມພະນັກງານ"
              >
                <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ ຈັດການພະນັກງານ</span>
              </button>
            )}

            {/* Clear All Data Button (Owner Only) */}
            {!isStaff && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 transition cursor-pointer"
                title="ເຄຍຂໍ້ມູນທັງໝົດເພື່ອຄີຂໍ້ມູນເອງ"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ເຄຍຂໍ້ມູນ</span>
              </button>
            )}

            {/* Load demo data button (Owner Only) */}
            {!isStaff && (
              <button
                onClick={() => setShowDemoConfirm(true)}
                className="hidden xl:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                title="ໂຫລດຂໍ້ມູນຕົວຢ່າງທົດສອບຄືນ"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>ຂໍ້ມູນຕົວຢ່າງ</span>
              </button>
            )}

            {/* User Account / Role switcher */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="relative group">
                  <button className="flex items-center gap-2 text-left p-1.5 rounded-lg hover:bg-slate-100 transition">
                    <img 
                      src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'} 
                      alt={currentUser.name} 
                      className="w-8 h-8 rounded-full object-cover border border-slate-300"
                    />
                    <div className="hidden sm:block">
                      <div className="text-xs font-semibold text-slate-800 leading-tight">
                        {currentUser.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${!isStaff ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        {!isStaff ? '👑 ເຈົ້າຂອງຮ້ານ (Admin)' : '📦 ພະນັກງານ (Staff)'}
                      </div>
                    </div>
                  </button>

                  {/* Role switch dropdown on hover/click */}
                  <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 hidden group-hover:block group-focus-within:block z-50">
                    <div className="px-3 py-1.5 text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                      <span>ປ່ຽນບັນຊີເຂົ້າໃຊ້ (Switch User)</span>
                      {isStaff && <span className="text-[10px] text-amber-700 bg-amber-100 font-bold px-1.5 py-0.5 rounded">Staff Mode</span>}
                    </div>

                    {/* Staff Security Notice banner */}
                    {isStaff && (
                      <div className="mx-2 mb-2 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                        <div className="font-bold flex items-center gap-1 text-amber-800 mb-0.5">
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>ສະຫງວນສິດ Admin</span>
                        </div>
                        ພະນັກງານ (Staff) ບໍ່ສາມາດສະຫຼັບເປັນ Admin ໄດ້. ຫາກຕ້ອງການເຂົ້າ Admin ໃຫ້ກົດ <strong>ອອກຈາກລະບົບ</strong> ແລ້ວ Login ດ້ວຍລະຫັດ Admin.
                      </div>
                    )}

                    <div className="space-y-0.5">
                      {users.map(u => {
                        const isTargetAdmin = isUserAdmin(u);
                        const isLockedForStaff = isStaff && isTargetAdmin;

                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              if (isLockedForStaff) return;
                              switchUser(u.id);
                            }}
                            disabled={isLockedForStaff}
                            className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition ${
                              currentUser.id === u.id 
                                ? 'bg-indigo-50/70 text-indigo-700 font-bold' 
                                : isLockedForStaff 
                                  ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400 select-none' 
                                  : 'hover:bg-slate-50 text-slate-700 cursor-pointer'
                            }`}
                            title={isLockedForStaff ? 'ພະນັກງານບໍ່ສາມາດປ່ຽນເປັນ Admin ໄດ້ (ຕ້ອງ Logout ແລ້ວ Login)' : undefined}
                          >
                            <div className="flex items-center gap-2">
                              {isLockedForStaff ? (
                                <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isLockedForStaff && (
                                    <span className="text-[9px] bg-rose-100 text-rose-700 px-1 py-0.2 rounded font-bold">🔒 ລັອກ (Admin)</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400">{isTargetAdmin ? '👑 ເຈົ້າຂອງຮ້ານ (Admin)' : '📦 ພະນັກງານ (Staff)'}</div>
                              </div>
                            </div>
                            {currentUser.id === u.id && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold">ປັດຈຸບັນ</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="my-1.5 border-t border-slate-100" />

                    {/* Manage Staff button (ADMIN ONLY) */}
                    {!isStaff && (
                      <button
                        onClick={() => setShowStaffModal(true)}
                        className="w-full px-3 py-2 text-left text-xs text-indigo-700 font-bold flex items-center gap-2 hover:bg-indigo-50 transition cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4 text-indigo-600" />
                        <span>+ ຈັດການ / ເພີ່ມພະນັກງານ</span>
                      </button>
                    )}

                    {/* Change Password button */}
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="w-full px-3 py-2 text-left text-xs text-slate-700 font-semibold flex items-center gap-2 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-slate-500" />
                      <span>🔑 ປ່ຽນລະຫັດຜ່ານ (Change Password)</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      onClick={logout}
                      className="w-full px-3 py-1.5 text-left text-xs text-rose-600 flex items-center gap-2 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>ອອກຈາກລະບົບ</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Staff Mode Notification Strip */}
        {isStaff && (
          <div className="bg-amber-500/15 border border-amber-300 text-amber-900 text-xs px-3.5 py-1.5 rounded-xl my-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium">
              <span>📦 ທ່ານກຳລັງຢູ່ໃນໂໝດ: <strong>ພະນັກງານ ({currentUser?.name || 'ພະນັກງານ'})</strong> — ເຫັນສະເພາະ: ຕິດຕາມເຄື່ອງ, ສະແກນຮັບເຂົ້າ, ສະແກນຈ່າຍລູກຄ້າ, ປະຫວັດບິນ.</span>
            </div>
            <button
              onClick={logout}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition shadow-xs cursor-pointer"
            >
              ອອກຈາກລະບົບ
            </button>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <div className="flex space-x-1 overflow-x-auto pb-2 pt-1 border-t border-slate-100 no-scrollbar">
          {navItems.map((item) => {
            const isActive = currentTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onSelectTab(item.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${item.badgeColor || 'bg-slate-200 text-slate-700'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Staff Management Modal */}
      {showStaffModal && (
        <StaffManagementModal onClose={() => setShowStaffModal(false)} />
      )}

      {/* Supabase Connection Details Modal */}
      {showSupabaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-lg">
                <Database className="w-5 h-5 text-emerald-600" />
                <span>Supabase Database Status</span>
              </div>
              <button 
                onClick={() => setShowSupabaseModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mt-4">
              {/* Project info card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Endpoint</div>
                <div className="font-mono text-sm text-slate-800 font-bold truncate mt-1">
                  https://kdsvztjdlzqpvpruutnc.supabase.co
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-semibold text-emerald-700">Real-time Connected & Active</span>
                </div>
              </div>

              {/* Table counts */}
              <div>
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  ຕາຕະລາງໃນຖານຂໍ້ມູນ (Supabase Tables)
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="text-slate-500 font-mono">1. parcels</div>
                    <div className="text-base font-bold text-indigo-700 mt-1">
                      {supabaseHealth?.tableCounts?.parcels ?? 0} ແຖວ
                    </div>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="text-slate-500 font-mono">2. customers (VIP)</div>
                    <div className="text-base font-bold text-amber-700 mt-1">
                      {supabaseHealth?.tableCounts?.customers ?? 0} ແຖວ
                    </div>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="text-slate-500 font-mono">3. bills (ໃບບິນ & ໜີ້)</div>
                    <div className="text-base font-bold text-indigo-700 mt-1">
                      {bills.length} ໃບບິນ
                    </div>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="text-slate-500 font-mono">4. financial_ledger</div>
                    <div className="text-base font-bold text-emerald-700 mt-1">
                      {financialLedger.length} ລາຍການ
                    </div>
                  </div>
                </div>
              </div>

              {/* RLS Copyable SQL Helper */}
              <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-indigo-900">SQL Setup Helper (Supabase SQL Editor)</span>
                  <button
                    onClick={() => {
                      const sql = `-- Allow read/write for all tables in Supabase:\nCREATE POLICY IF NOT EXISTS "anon_all" ON parcels FOR ALL TO anon USING (true) WITH CHECK (true);\nCREATE POLICY IF NOT EXISTS "anon_all" ON customers FOR ALL TO anon USING (true) WITH CHECK (true);\nCREATE POLICY IF NOT EXISTS "anon_all" ON financial_ledger FOR ALL TO anon USING (true) WITH CHECK (true);`;
                      navigator.clipboard.writeText(sql);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'ກັອບປີ້ແລ້ວ!' : 'Copy SQL'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  ຫາກຕ້ອງການໃຫ້ຜູ້ໃຊ້ສາມາດ Insert ຂໍ້ມູນໃໝ່ລົງຕາຕະລາງໄດ້ໂດຍກົງ, ສາມາດກັອບປີ້ SQL ນີ້ໄປວາງໃນ Supabase SQL Editor.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshing(true);
                    setSyncFeedback(null);
                    await refreshSupabaseData();
                    setIsRefreshing(false);
                    setSyncFeedback('ດຶງຂໍ້ມູນຫຼ້າສຸດຈາກ Supabase ສຳເລັດແລ້ວ!');
                    setTimeout(() => setSyncFeedback(null), 3500);
                  }}
                  disabled={isRefreshing || isSyncingAll}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>ໂຫຼດຂໍ້ມູນຈາກ Supabase</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsSyncingAll(true);
                    setSyncFeedback(null);
                    const res = await syncAllToSupabase();
                    setIsSyncingAll(false);
                    if (res.success) {
                      setSyncFeedback(`ອັບໂຫຼດຂໍ້ມູນທັງໝົດລົງ Supabase ສຳເລັດ ${res.count} ລາຍການ!`);
                    } else {
                      setSyncFeedback('ເກີດຂໍ້ຜິດພາດໃນການອັບໂຫຼດ. ກະລຸນາກວດສອບ RLS Policy');
                    }
                    setTimeout(() => setSyncFeedback(null), 4000);
                  }}
                  disabled={isRefreshing || isSyncingAll}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Database className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-pulse' : ''}`} />
                  <span>{isSyncingAll ? 'ກຳລັງອັບໂຫຼດ...' : 'ອັບໂຫຼດທັງໝົດລົງ Supabase'}</span>
                </button>
              </div>

              {syncFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-medium text-center animate-fadeIn">
                  ✓ {syncFeedback}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              ຢືນຢັນການເຄຍຂໍ້ມູນທັງໝົດ?
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              ທ່ານຕ້ອງການລຶບຂໍ້ມູນທັງໝົດ (ພັດສະດຸ, ໃບບິນ, ຂໍ້ມູນລູກຄ້າ) ອອກແທ້ບໍ່? ເພື່ອເລີ່ມຕົ້ນຄີຂໍ້ມູນຕົວຈິງເອງ.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ຍົກເລີກ
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllData();
                  setShowClearConfirm(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 cursor-pointer"
              >
                ເຄຍຂໍ້ມູນທັງໝົດ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Data Confirmation Modal */}
      {showDemoConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">
              ໂຫລດຂໍ້ມູນຕົວຢ່າງທົດສອບ?
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              ລະບົບຈະໂຫລດລາຍການພັດສະດຸຕົວຢ່າງ ໃບບິນ ແລະ ລູກຄ້າເພື່ອການທົດລອງລະບົບ.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowDemoConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ຍົກເລີກ
              </button>
              <button
                type="button"
                onClick={() => {
                  loadDemoData();
                  setShowDemoConfirm(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                ໂຫລດຂໍ້ມູນຕົວຢ່າງ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </header>
  );
};
