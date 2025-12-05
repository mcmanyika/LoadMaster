export interface Load {
  id: string;
  company: string;
  gross: number;
  miles: number;
  gasAmount: number;
  gasNotes?: string; // For the "500+100+100" details
  dropDate: string;
  dispatcher: string;
  origin: string;
  destination: string;
  status: 'Completed' | 'Pending' | 'Invoiced';
}

export interface CalculatedLoad extends Load {
  dispatchFee: number; // 12%
  driverPay: number;   // Formula based on Excel
  netProfit: number;   // What the trucking company keeps before expenses (Gross - DriverPay - Gas - Dispatch) ?? 
                       // Actually, looking at the sheet, the "Company" likely keeps Dispatch Fee + Residual.
                       // For simplicity in this app, we will calculate based on the user's excel formulas.
}

export interface SummaryStats {
  totalGross: number;
  totalMiles: number;
  avgRatePerMile: number;
  totalDriverPay: number;
  totalDispatchFee: number;
}

export enum DispatcherName {
  John = "John",
  Nick = "Nick",
  Logan = "Logan"
}