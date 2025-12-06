import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Load, DispatcherName, Transporter, Driver, UserProfile } from '../types';

// Mock Data for Demo Mode
const MOCK_TRANSPORTERS: Transporter[] = [
  { id: 't1', name: 'Smith Transport LLC', mcNumber: 'MC123456', contactPhone: '555-0101' },
  { id: 't2', name: 'Fast Lane Logistics', mcNumber: 'MC987654', contactPhone: '555-0102' }
];

const MOCK_DRIVERS: Driver[] = [
  { id: 'd1', name: 'Mike Johnson', transporterId: 't1', phone: '555-1111' },
  { id: 'd2', name: 'Sarah Connor', transporterId: 't1', phone: '555-2222' },
  { id: 'd3', name: 'Bob Lee', transporterId: 't2', phone: '555-3333' }
];

const MOCK_DISPATCHERS: UserProfile[] = [
  { id: 'u1', name: 'John', email: 'john@demo.com', role: 'dispatcher', feePercentage: 12 },
  { id: 'u2', name: 'Nick', email: 'nick@demo.com', role: 'dispatcher', feePercentage: 12 },
  { id: 'u3', name: 'Logan', email: 'logan@demo.com', role: 'dispatcher', feePercentage: 12 }
];

const MOCK_LOADS: Load[] = [
  {
    id: '1',
    company: 'RXO',
    gross: 2740,
    miles: 1158,
    gasAmount: 700,
    gasNotes: '500+100+100',
    dropDate: '2025-01-23',
    dispatcher: 'John',
    transporterId: 't1',
    driverId: 'd1',
    origin: 'Miffinburg, PA',
    destination: 'Nashville, TN',
    status: 'Factored'
  },
  {
    id: '2',
    company: 'Delta Logistics',
    gross: 800,
    miles: 530,
    gasAmount: 200,
    gasNotes: '200',
    dropDate: '2025-01-27',
    dispatcher: 'Nick',
    transporterId: 't1',
    driverId: 'd2',
    origin: 'Arden, NC',
    destination: 'Delta, OH',
    status: 'Factored'
  },
  {
    id: '3',
    company: 'Unicron Logistics',
    gross: 975,
    miles: 560,
    gasAmount: 250,
    gasNotes: '250',
    dropDate: '2025-01-27',
    dispatcher: 'Nick',
    transporterId: 't2',
    driverId: 'd3',
    origin: 'Topeka, IN',
    destination: 'Jamesport, MO',
    status: 'Factored'
  },
  {
    id: '4',
    company: 'Landstar',
    gross: 2600,
    miles: 1600,
    gasAmount: 850,
    gasNotes: '100+500+250',
    dropDate: '2025-02-12',
    dispatcher: 'John',
    transporterId: 't2',
    driverId: 'd3',
    origin: 'Montgomery, AL',
    destination: 'Tucson, AZ',
    status: 'Not yet Factored'
  }
];

// --- LOAD OPERATIONS ---

export const getLoads = async (): Promise<Load[]> => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn("Supabase not configured. Using Mock Data.");
    await new Promise(resolve => setTimeout(resolve, 800));
    return [...MOCK_LOADS];
  }

  // We use a select query that joins transporters and drivers to get their names if needed,
  // though currently the UI might mostly use the IDs or we might want to map them.
  const { data, error } = await supabase
    .from('loads')
    .select(`
      *,
      transporters ( name ),
      drivers ( name )
    `)
    .order('drop_date', { ascending: false });

  if (error) {
    console.error("Error fetching loads:", error);
    throw error;
  }

  return data.map((item: any) => ({
    id: item.id,
    company: item.company,
    gross: item.gross,
    miles: item.miles,
    gasAmount: item.gas_amount,
    gasNotes: item.gas_notes,
    dropDate: item.drop_date,
    dispatcher: item.dispatcher,
    transporterId: item.transporter_id,
    driverId: item.driver_id,
    // Optional: You could extend the Load type to include transporterName if you wanted to display it directly
    // transporterName: item.transporters?.name, 
    // driverName: item.drivers?.name,
    origin: item.origin,
    destination: item.destination,
    status: item.status,
    rateConfirmationPdfUrl: item.rate_confirmation_pdf_url || undefined
  }));
};

export const createLoad = async (load: Omit<Load, 'id'>): Promise<Load> => {
  if (!isSupabaseConfigured || !supabase) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newLoad = { ...load, id: Math.random().toString(36).substr(2, 9) };
    MOCK_LOADS.unshift(newLoad);
    return newLoad;
  }

  const { data, error } = await supabase
    .from('loads')
    .insert([{
      company: load.company,
      gross: load.gross,
      miles: load.miles,
      gas_amount: load.gasAmount,
      gas_notes: load.gasNotes,
      drop_date: load.dropDate,
      dispatcher: load.dispatcher,
      transporter_id: load.transporterId || null,
      driver_id: load.driverId || null,
      origin: load.origin,
      destination: load.destination,
      status: load.status,
      rate_confirmation_pdf_url: load.rateConfirmationPdfUrl || null
    }])
    .select()
    .single();

  if (error) {
    console.error("Error creating load:", error);
    throw error;
  }

  return {
    id: data.id,
    company: data.company,
    gross: data.gross,
    miles: data.miles,
    gasAmount: data.gas_amount,
    gasNotes: data.gas_notes,
    dropDate: data.drop_date,
    dispatcher: data.dispatcher,
    transporterId: data.transporter_id,
    driverId: data.driver_id,
    origin: data.origin,
    destination: data.destination,
    status: data.status
  };
};

export const updateLoad = async (id: string, load: Omit<Load, 'id'>): Promise<Load> => {
  if (!isSupabaseConfigured || !supabase) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = MOCK_LOADS.findIndex(l => l.id === id);
    if (index === -1) {
      throw new Error('Load not found');
    }
    const updatedLoad = { ...load, id };
    MOCK_LOADS[index] = updatedLoad;
    return updatedLoad;
  }

  const { data, error } = await supabase
    .from('loads')
    .update({
      company: load.company,
      gross: load.gross,
      miles: load.miles,
      gas_amount: load.gasAmount,
      gas_notes: load.gasNotes,
      drop_date: load.dropDate,
      dispatcher: load.dispatcher,
      transporter_id: load.transporterId || null,
      driver_id: load.driverId || null,
      origin: load.origin,
      destination: load.destination,
      status: load.status,
      rate_confirmation_pdf_url: load.rateConfirmationPdfUrl || null
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error("Error updating load:", error);
    throw error;
  }

  return {
    id: data.id,
    company: data.company,
    gross: data.gross,
    miles: data.miles,
    gasAmount: data.gas_amount,
    gasNotes: data.gas_notes,
    dropDate: data.drop_date,
    dispatcher: data.dispatcher,
    transporterId: data.transporter_id,
    driverId: data.driver_id,
    origin: data.origin,
    destination: data.destination,
    status: data.status,
    rateConfirmationPdfUrl: data.rate_confirmation_pdf_url || undefined
  };
};

// --- FLEET OPERATIONS ---

export const getDispatchers = async (): Promise<UserProfile[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return MOCK_DISPATCHERS;
  }
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'dispatcher');
    
  if (error) throw error;
  
  return (data || []).map((profile: any) => ({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    feePercentage: profile.fee_percentage || 12 // Default to 12% if not set
  }));
};

export const getTransporters = async (): Promise<Transporter[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return MOCK_TRANSPORTERS;
  }
  
  const { data, error } = await supabase.from('transporters').select('*');
  if (error) throw error;
  
  return data.map((t: any) => ({
    id: t.id,
    name: t.name,
    mcNumber: t.mc_number,
    contactEmail: t.contact_email,
    contactPhone: t.contact_phone
  }));
};

export const createTransporter = async (t: Omit<Transporter, 'id'>): Promise<Transporter> => {
  if (!isSupabaseConfigured || !supabase) {
    const newT = { ...t, id: Math.random().toString(36).substr(2, 9) };
    MOCK_TRANSPORTERS.push(newT);
    return newT;
  }

  const { data, error } = await supabase
    .from('transporters')
    .insert([{
      name: t.name,
      mc_number: t.mcNumber,
      contact_email: t.contactEmail,
      contact_phone: t.contactPhone
    }])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    mcNumber: data.mc_number,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone
  };
};

export const getDrivers = async (): Promise<Driver[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return MOCK_DRIVERS;
  }

  const { data, error } = await supabase.from('drivers').select('*');
  if (error) throw error;

  return data.map((d: any) => ({
    id: d.id,
    name: d.name,
    transporterId: d.transporter_id,
    phone: d.phone,
    email: d.email
  }));
};

export const createDriver = async (d: Omit<Driver, 'id'>): Promise<Driver> => {
  if (!isSupabaseConfigured || !supabase) {
    const newD = { ...d, id: Math.random().toString(36).substr(2, 9) };
    MOCK_DRIVERS.push(newD);
    return newD;
  }

  const { data, error } = await supabase
    .from('drivers')
    .insert([{
      name: d.name,
      transporter_id: d.transporterId,
      phone: d.phone,
      email: d.email
    }])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    transporterId: data.transporter_id,
    phone: data.phone,
    email: data.email
  };
};