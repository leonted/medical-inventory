export type UserRole = 'admin' | 'honbu' | 'shozokucho' | 'rmg' | 'mg' | 'user';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
}

export interface IncidentBase {
  id: number;
  name: string;
  is_active: boolean;
}

export type IncidentStatus = 'submitted' | 'rmg_checked' | 'shozokucho_checked' | 'approved';
export type ReportType = 'incident' | 'near_miss' | 'complaint';

export interface IncidentReport {
  id: number;
  reportType: ReportType;
  occurrenceDate: string;
  occurrenceTime?: string;
  baseId?: number;
  baseName: string;
  department: string;
  patientName: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  severity?: string;
  status: IncidentStatus;
  createdAt: string;
  updatedAt?: string;
  approvals?: IncidentApproval[];
}

export interface IncidentApproval {
  id: number;
  reportId: number;
  step: 'rmg' | 'shozokucho' | 'honbu';
  action: 'approved' | 'returned';
  approverId?: number;
  approverName: string;
  comment?: string;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
}

export interface Location {
  id: number;
  name: string;
  description?: string;
}

export interface Item {
  id: number;
  name: string;
  categoryId: number;
  locationId: number;
  stock: number;
  minStock: number;
  unit: string;
  lotNumber?: string;
  expiryDate?: string;
  manufacturer?: string;
  price?: number;
  image?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ItemLot {
  id: number;
  itemId: number;
  lotNumber: string;
  expiryDate?: string;
  stock: number;
}

export interface Transaction {
  id: number;
  itemId: number;
  itemName?: string;
  itemUnit?: string;
  type: 'in' | 'out';
  quantity: number;
  userId: number;
  userName: string;
  reason: string;
  notes?: string;
  destination?: string;
  lotId?: number;
  lotNumber?: string;
  createdAt: string;
}

export interface StocktakeEntry {
  itemId: number;
  itemName: string;
  systemStock: number;
  actualStock: number | null;
  difference: number | null;
  adjusted: boolean;
}

export interface Stocktake {
  id: number;
  title: string;
  status: 'open' | 'closed';
  entries: StocktakeEntry[];
  userId: number;
  userName: string;
  createdAt: string;
  closedAt?: string;
}

export interface DashboardData {
  totalItems: number;
  totalCategories: number;
  lowStock: Item[];
  categoryBreakdown: (Category & { count: number; totalStock: number })[];
  expiryWarnings: Item[];
  recentTxs: Transaction[];
  monthlyStats: { month: string; in: number; out: number }[];
}
