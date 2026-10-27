import { supabase, SUPABASE_URL } from '../lib/supabase';
import { WarehouseParcel, Customer, DisputeClaim, FinancialLedgerEntry, DisputeStatus } from '../types';

export interface SupabaseHealth {
  connected: boolean;
  projectUrl: string;
  tableCounts: {
    parcels: number;
    customers: number;
    dispute_claims: number;
    financial_ledger: number;
  };
  lastChecked: string;
  error?: string;
}

/**
 * Health check on Supabase connection and tables
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  const result: SupabaseHealth = {
    connected: false,
    projectUrl: SUPABASE_URL,
    tableCounts: {
      parcels: 0,
      customers: 0,
      dispute_claims: 0,
      financial_ledger: 0,
    },
    lastChecked: new Date().toISOString(),
  };

  try {
    const [parcelsRes, customersRes, disputesRes, ledgerRes] = await Promise.all([
      supabase.from('parcels').select('id', { count: 'exact', head: true }),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('dispute_claims').select('id', { count: 'exact', head: true }),
      supabase.from('financial_ledger').select('id', { count: 'exact', head: true }),
    ]);

    result.tableCounts.parcels = parcelsRes.count || 0;
    result.tableCounts.customers = customersRes.count || 0;
    result.tableCounts.dispute_claims = disputesRes.count || 0;
    result.tableCounts.financial_ledger = ledgerRes.count || 0;

    result.connected = !parcelsRes.error && !customersRes.error;
    if (!result.connected) {
      result.error = parcelsRes.error?.message || customersRes.error?.message || disputesRes.error?.message || ledgerRes.error?.message;
    }
  } catch (err: any) {
    result.connected = false;
    result.error = err?.message || 'Network error connecting to Supabase';
  }

  return result;
}

// ==========================================
// 1. STATUS MAPPING HELPERS (Local <-> Supabase)
// ==========================================

export function toSupabaseStatus(status?: string): 'PENDING_SCAN' | 'IN_BRANCH' | 'DELIVERED' | 'UNMANIFESTED' {
  if (!status) return 'PENDING_SCAN';
  const s = status.toLowerCase();
  if (s === 'delivered') return 'DELIVERED';
  if (s === 'in_branch') return 'IN_BRANCH';
  if (s === 'unmanifested') return 'UNMANIFESTED';
  return 'PENDING_SCAN';
}

export function fromSupabaseStatus(status?: string): 'pending_arrival' | 'in_branch' | 'delivered' | 'unmanifested' {
  if (!status) return 'pending_arrival';
  const s = status.toLowerCase();
  if (s === 'delivered') return 'delivered';
  if (s === 'in_branch') return 'in_branch';
  if (s === 'unmanifested') return 'unmanifested';
  return 'pending_arrival';
}

/**
 * Format date safely to YYYY-MM-DD for PostgreSQL `date` column
 */
function toDateString(d?: string): string {
  if (!d) return new Date().toISOString().split('T')[0];
  const trimmed = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // If DD/MM/YYYY
  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Maps a frontend WarehouseParcel into the exact PostgreSQL schema of `parcels` table.
 * Crucial constraints:
 * - tracking_number: UNIQUE
 * - zto_weight: NOT NULL (default 1.0)
 * - zto_cost: NOT NULL (default 0)
 * - status: 'PENDING_SCAN' | 'IN_BRANCH' | 'DELIVERED' | 'UNMANIFESTED'
 */
export function mapParcelToSupabaseRow(p: Partial<WarehouseParcel>) {
  const trackingNumber = (p.parcelCode || p.shippingCode || `TRK-${Date.now()}`).trim().toUpperCase();
  const supaStatus = toSupabaseStatus(p.status || (p.isUnmanifested ? 'unmanifested' : 'pending_arrival'));
  const isDelivered = supaStatus === 'DELIVERED';

  return {
    tracking_number: trackingNumber,
    batch_date: toDateString(p.date),
    customer_name: (p.customerName || 'ລູກຄ້າ').trim(),
    customer_phone: (p.customerPhone || '').trim(),
    zto_weight: Number(p.weightKg) > 0 ? Number(p.weightKg) : 1.0, // NOT NULL constraint
    actual_weight: p.weightKg ? Number(p.weightKg) : null,
    zto_cost: Number(p.warehouseCost) >= 0 ? Number(p.warehouseCost) : 0, // NOT NULL constraint
    customer_charge: Number(p.customerPrice) >= 0 ? Number(p.customerPrice) : 0,
    status: supaStatus,
    payment_status: isDelivered ? 'PAID' : 'PENDING',
    payment_method: isDelivered ? (p.notes || 'cash') : null,
    paid_at: isDelivered ? new Date().toISOString() : null,
  };
}

// ==========================================
// 2. PARCELS CRUD OPERATIONS (Supabase table: parcels)
// ==========================================

export async function fetchParcelsFromSupabase(): Promise<WarehouseParcel[]> {
  try {
    const { data, error } = await supabase
      .from('parcels')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchParcels warning:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => {
      const localStatus = fromSupabaseStatus(row.status);
      const isUn = row.status === 'UNMANIFESTED' || localStatus === 'unmanifested';
      return {
        id: row.id || `sp-${Date.now()}-${Math.random()}`,
        date: row.batch_date || (row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
        customerName: row.customer_name || 'ລູກຄ້າ',
        customerPhone: row.customer_phone || '',
        shippingCode: row.tracking_number || '',
        parcelCode: row.tracking_number || '',
        customerPrice: Number(row.customer_charge) || 15000,
        warehouseCost: Number(row.zto_cost) || 0,
        weightKg: Number(row.zto_weight) || 1.0,
        importedAt: row.created_at || new Date().toISOString(),
        status: localStatus,
        notes: row.payment_method ? `ຊໍາລະ: ${row.payment_method}` : (isUn ? 'ສາງໃຫຍ່ລືມສະແກນ - ພົບເຄື່ອງຕົວຈິງຢູ່ສາຂາ' : ''),
        isUnmanifested: isUn,
        destinationBranch: 'ZTO Berlin',
      };
    });
  } catch (err) {
    console.warn('Error fetching parcels from Supabase:', err);
    return [];
  }
}

/**
 * Insert or Upsert a single parcel to Supabase with all schema constraints satisfied
 */
export async function insertParcelToSupabase(parcel: Partial<WarehouseParcel>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const payload = mapParcelToSupabaseRow(parcel);

    const { data, error } = await supabase
      .from('parcels')
      .upsert([payload], { onConflict: 'tracking_number' })
      .select();

    if (error) {
      console.warn('Supabase insertParcel warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data: data?.[0] };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Batch insert/upsert parcels to Supabase in chunks (prevents HTTP payload size or rate issues)
 */
export async function insertParcelsBatchToSupabase(parcels: Partial<WarehouseParcel>[]): Promise<{ success: boolean; insertedCount: number; error?: string }> {
  if (!parcels || parcels.length === 0) return { success: true, insertedCount: 0 };

  try {
    const rows = parcels.map(p => mapParcelToSupabaseRow(p));
    const CHUNK_SIZE = 40;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabase
        .from('parcels')
        .upsert(chunk, { onConflict: 'tracking_number' })
        .select('tracking_number');

      if (error) {
        console.warn(`Supabase batch chunk ${i} warning:`, error.message);
        return { success: false, insertedCount: inserted, error: error.message };
      }
      inserted += (data?.length || chunk.length);
    }

    return { success: true, insertedCount: inserted };
  } catch (err: any) {
    return { success: false, insertedCount: 0, error: err?.message };
  }
}

/**
 * Update parcel status in Supabase (e.g. IN_BRANCH, DELIVERED)
 */
export async function updateParcelStatusInSupabase(
  trackingNumber: string,
  newStatus: string,
  paymentMethod?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanTracking = trackingNumber.trim().toUpperCase();
    const supaStatus = toSupabaseStatus(newStatus);
    const isDelivered = supaStatus === 'DELIVERED';

    const updatePayload: any = {
      status: supaStatus,
    };

    if (isDelivered) {
      updatePayload.payment_status = paymentMethod === 'debt' ? 'PENDING' : 'PAID';
      updatePayload.payment_method = paymentMethod || 'cash';
      updatePayload.paid_at = paymentMethod === 'debt' ? null : new Date().toISOString();
    }

    const { error } = await supabase
      .from('parcels')
      .update(updatePayload)
      .eq('tracking_number', cleanTracking);

    if (error) {
      console.warn('Supabase updateParcelStatus warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function deleteParcelFromSupabase(trackingNumberOrId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const clean = trackingNumberOrId.trim().toUpperCase();
    const { error } = await supabase
      .from('parcels')
      .delete()
      .or(`tracking_number.eq.${clean},tracking_number.eq.${trackingNumberOrId}`);

    if (error) {
      console.warn('Supabase deleteParcel warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ==========================================
// 3. VIP & CUSTOMERS (Supabase table: customers)
// ==========================================

export async function fetchCustomersFromSupabase(): Promise<Customer[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchCustomers warning:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id || `sc-${Date.now()}-${Math.random()}`,
      name: row.name || 'ລູກຄ້າ',
      phone: row.phone || '',
      address: row.address || '',
      village: row.address || '',
      notes: row.notes || '',
      isVip: Boolean(row.is_vip),
      vipDiscountPercent: row.is_vip ? 10 : 0,
      totalParcels: 0,
      totalSpent: 0,
      lastActive: row.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Error fetching customers from Supabase:', err);
    return [];
  }
}

export async function updateCustomerVipInSupabase(
  customerIdOrPhone: string,
  isVip: boolean,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updatePayload: any = { is_vip: isVip };
    if (notes !== undefined) {
      updatePayload.notes = notes;
    }

    let res = await supabase.from('customers').update(updatePayload).eq('phone', customerIdOrPhone);
    if (res.error && customerIdOrPhone.includes('-')) {
      res = await supabase.from('customers').update(updatePayload).eq('id', customerIdOrPhone);
    }

    if (res.error) {
      console.warn('Supabase updateCustomerVip warning:', res.error.message);
      return { success: false, error: res.error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function insertCustomerToSupabase(customer: Partial<Customer>): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const payload = {
      name: customer.name || 'ລູກຄ້າ',
      phone: customer.phone || '',
      address: customer.address || customer.village || '',
      notes: customer.notes || '',
      is_vip: Boolean(customer.isVip),
    };

    const { data, error } = await supabase
      .from('customers')
      .insert([payload])
      .select();

    if (error) {
      console.warn('Supabase insertCustomer warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data: data?.[0] };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ==========================================
// 4. DISPUTE CLAIMS (Supabase table: dispute_claims)
// ==========================================

export async function fetchDisputeClaimsFromSupabase(): Promise<DisputeClaim[]> {
  try {
    const { data, error } = await supabase
      .from('dispute_claims')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchDisputeClaims warning:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      created_at: row.created_at,
      tracking_number: row.tracking_number || '',
      customer_name: row.customer_name || '',
      status: (row.status as DisputeStatus) || 'pending',
      notes: row.notes || '',
      claim_amount: row.claim_amount || 0,
      created_by: row.created_by || 'Staff',
    }));
  } catch (err) {
    console.warn('Error fetching dispute claims from Supabase:', err);
    return [];
  }
}

export async function createDisputeClaimInSupabase(claim: {
  tracking_number: string;
  customer_name: string;
  status: DisputeStatus;
  notes?: string;
  claim_amount?: number;
}): Promise<{ success: boolean; data?: DisputeClaim; error?: string }> {
  try {
    const payload = {
      tracking_number: claim.tracking_number,
      customer_name: claim.customer_name,
      status: claim.status || 'pending',
      notes: claim.notes || '',
    };

    const { data, error } = await supabase
      .from('dispute_claims')
      .insert([payload])
      .select();

    if (error) {
      console.warn('Supabase createDisputeClaim warning:', error.message);
      return { success: false, error: error.message };
    }

    const created = data?.[0];
    return {
      success: true,
      data: created ? {
        id: created.id,
        created_at: created.created_at,
        tracking_number: created.tracking_number,
        customer_name: created.customer_name,
        status: created.status,
        notes: created.notes,
        claim_amount: claim.claim_amount || 0,
      } : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function updateDisputeClaimInSupabase(
  id: string,
  updates: Partial<DisputeClaim>
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: any = {};
    if (updates.status) payload.status = updates.status;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.customer_name) payload.customer_name = updates.customer_name;
    if (updates.tracking_number) payload.tracking_number = updates.tracking_number;

    const { error } = await supabase
      .from('dispute_claims')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.warn('Supabase updateDisputeClaim warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function deleteDisputeClaimFromSupabase(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('dispute_claims')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Supabase deleteDisputeClaim warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ==========================================
// 5. FINANCIAL LEDGER (Supabase table: financial_ledger)
// ==========================================

export async function fetchFinancialLedgerFromSupabase(): Promise<FinancialLedgerEntry[]> {
  try {
    const { data, error } = await supabase
      .from('financial_ledger')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchFinancialLedger warning:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      created_at: row.created_at,
      type: (row.type as 'income' | 'expense') || 'income',
      category: row.category || 'general',
      amount: Number(row.amount) || 0,
      description: row.description || '',
      created_by: row.created_by || 'Staff',
    }));
  } catch (err) {
    console.warn('Error fetching financial ledger from Supabase:', err);
    return [];
  }
}

export async function insertLedgerEntryToSupabase(entry: {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  created_by?: string;
}): Promise<{ success: boolean; data?: FinancialLedgerEntry; error?: string }> {
  try {
    const payload = {
      type: entry.type,
      category: entry.category,
      amount: entry.amount,
      description: entry.description,
      created_by: entry.created_by || 'Staff',
    };

    const { data, error } = await supabase
      .from('financial_ledger')
      .insert([payload])
      .select();

    if (error) {
      console.warn('Supabase insertLedgerEntry warning:', error.message);
      return { success: false, error: error.message };
    }

    const created = data?.[0];
    return {
      success: true,
      data: created ? {
        id: created.id,
        created_at: created.created_at,
        type: created.type,
        category: created.category,
        amount: Number(created.amount) || 0,
        description: created.description,
        created_by: created.created_by,
      } : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function deleteLedgerEntryFromSupabase(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('financial_ledger')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Supabase deleteLedgerEntry warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
