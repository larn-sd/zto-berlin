import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { WarehouseInboundView } from './components/WarehouseInboundView';
import { ParcelTrackingView } from './components/ParcelTrackingView';
import { BranchScanView } from './components/BranchScanView';
import { DiscrepancyView } from './components/DiscrepancyView';
import { CustomerCheckoutView } from './components/CustomerCheckoutView';
import { BillsHistoryView } from './components/BillsHistoryView';
import { CustomerDirectoryView } from './components/CustomerDirectoryView';
import { DisputeClaimsView } from './components/DisputeClaimsView';
import { FinancialLedgerView } from './components/FinancialLedgerView';
import { TabKey } from './types';

const MainLayout: React.FC = () => {
  const { currentUser } = useApp();
  const [currentTab, setCurrentTab] = useState<TabKey>('dashboard');

  if (!currentUser) {
    return <LoginView />;
  }

  // Enforce staff permissions: Staff can access dashboard, parcel_tracking, branch_scan, customer_checkout, bills_history, disputes, financial_ledger
  const isStaff = currentUser.role === 'staff';
  const staffAllowedTabs: TabKey[] = ['dashboard', 'parcel_tracking', 'branch_scan', 'customer_checkout', 'bills_history', 'disputes', 'financial_ledger'];
  const activeTab: TabKey = (isStaff && !staffAllowedTabs.includes(currentTab)) ? 'dashboard' : currentTab;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar currentTab={activeTab} onSelectTab={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}
        {activeTab === 'warehouse_inbound' && !isStaff && <WarehouseInboundView />}
        {activeTab === 'parcel_tracking' && <ParcelTrackingView onNavigateTab={setCurrentTab} />}
        {activeTab === 'branch_scan' && <BranchScanView onNavigateTab={setCurrentTab} />}
        {activeTab === 'discrepancy' && !isStaff && <DiscrepancyView />}
        {activeTab === 'customer_checkout' && <CustomerCheckoutView />}
        {activeTab === 'bills_history' && <BillsHistoryView />}
        {activeTab === 'customers' && !isStaff && <CustomerDirectoryView />}
        {activeTab === 'disputes' && <DisputeClaimsView />}
        {activeTab === 'financial_ledger' && <FinancialLedgerView />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ZTO Berlin • ສາຂາ ໜອງບົວທອງ (Berlin)</span>
          <span className="text-[11px] text-slate-400">ລະບົບສະແກນບາໂຄດ, ຮັບເຄື່ອງເຂົ້າສາຂາ, ຈ່າຍເຄື່ອງພ້ອມໃບບິນປ້ອງກັນພະນັກງານສໍ້ໂກງ</span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
