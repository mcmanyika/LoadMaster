export interface Transporter {
  id: string;
  name: string;
  mcNumber: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface Driver {
  id: string;
  name: string;
  transporterId: string; // Link to Transporter
  phone?: string;
  email?: string;
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

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  feePercentage?: number; // Fee percentage for dispatchers (e.g., 12 for 12%)
  subscriptionPlan?: 'essential' | 'professional' | 'enterprise' | null;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | null;
  stripeCustomerId?: string;
}