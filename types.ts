export interface Company {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transporter {
  id: string;
  name: string;
  mcNumber: string;
  contactEmail?: string;
  contactPhone?: string;
  companyId: string;
}

export interface Driver {
  id: string;
  name: string;
  transporterId: string; // Link to Transporter
  phone?: string;
  email?: string;
  companyId: string;
}

export interface Dispatcher {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  feePercentage: number;
  companyId: string;
}

export interface Load {
  id: string;
  company: string; // The Broker (e.g. RXO)
  gross: number;
  miles: number;
  gasAmount: number;
  gasNotes?: string;
  dropDate: string;
  dispatcher: string; // The name of the dispatcher user
  transporterId?: string; // The trucking company carrying the load
  driverId?: string; // The specific driver
  origin: string;
  destination: string;
  status: 'Factored' | 'Not yet Factored';
  rateConfirmationPdfUrl?: string; // URL to the Rate Confirmation PDF
  driverPayoutStatus?: 'pending' | 'paid' | 'partial'; // Status of driver payout
  companyId: string; // Reference to the company that owns this load
}

export interface CalculatedLoad extends Load {
  dispatchFee: number; // 12%
  driverPay: number;   // Formula based on Excel
  netProfit: number;   // What the trucking company keeps before expenses (Gross - DriverPay - Gas - Dispatch)
  transporterName?: string;
  driverName?: string;
}

export interface SummaryStats {
  totalGross: number;
  totalMiles: number;
  avgRatePerMile: number;
  totalDriverPay: number;
  totalDispatchFee: number;
}

// Deprecated in favor of dynamic users, kept for legacy type safety if needed
export enum DispatcherName {
  John = "John",
  Nick = "Nick",
  Logan = "Logan"
}

export type UserRole = 'owner' | 'dispatcher' | 'driver';
export type UserStatus = 'active' | 'inactive';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status?: UserStatus; // User status: active or inactive
  feePercentage?: number; // Fee percentage for dispatchers (e.g., 12 for 12%)
  subscriptionPlan?: 'essential' | 'professional' | 'enterprise' | null;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | null;
  stripeCustomerId?: string;
  companyId?: string; // Reference to the company this user belongs to
}

export interface MarketingAd {
  id: string;
  weekNumber: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingPost {
  id: string;
  adId: string;
  postedAt: string;
  postedBy?: string;
  platform: string;
  notes?: string;
  createdAt: string;
}

export type MetricType = 'response' | 'call_scheduled' | 'demo_scheduled' | 'conversion' | 'not_interested';

export interface MarketingMetric {
  id: string;
  postId: string;
  metricType: MetricType;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}