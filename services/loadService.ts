import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Load, DispatcherName } from '../types';

// Mock Data for Demo Mode
const MOCK_LOADS: Load[] = [
  {
    id: '1',
    company: 'RXO',
    gross: 2740,
    miles: 1158,
    gasAmount: 700,
    gasNotes: '500+100+100',
    dropDate: '2025-01-23',
    dispatcher: DispatcherName.John,
    origin: 'Miffinburg, PA',
    destination: 'Nashville, TN',
    status: 'Completed'
  },
  {
    id: '2',
    company: 'Delta Logistics',
    gross: 800,
    miles: 530,
    gasAmount: 200,
    gasNotes: '200',
    dropDate: '2025-01-27',
    dispatcher: DispatcherName.Nick,
    origin: 'Arden, NC',
    destination: 'Delta, OH',
    status: 'Completed'
  },
  {
    id: '3',
    company: 'Unicron Logistics',
    gross: 975,
    miles: 560,
    gasAmount: 250,
    gasNotes: '250',
    dropDate: '2025-01-27',
    dispatcher: DispatcherName.Nick,
    origin: 'Topeka, IN',
    destination: 'Jamesport, MO',
    status: 'Completed'
  },
  {
    id: '4',
    company: 'Landstar',
    gross: 2600,
    miles: 1600,
    gasAmount: 850,
    gasNotes: '100+500+250',
    dropDate: '2025-02-12',
    dispatcher: DispatcherName.John,
    origin: 'Montgomery, AL',
    destination: 'Tucson, AZ',
    status: 'Pending'
  }
];

export const getLoads = async (): Promise<Load[]> => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn("Supabase not configured. Using Mock Data.");
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return [...MOCK_LOADS];
  }

  const { data, error } = await supabase
    .from('loads')
    .select('*')
    .order('drop_date', { ascending: false });

  if (error) {
    console.error("Error fetching loads:", error);
    throw error;
  }

  // Map snake_case DB columns to camelCase types if necessary
  // Assuming Supabase returns columns matching our interface or we map them here
  return data.map((item: any) => ({
    id: item.id,
    company: item.company,
    gross: item.gross,
    miles: item.miles,
    gasAmount: item.gas_amount, // DB column: gas_amount
    gasNotes: item.gas_notes,   // DB column: gas_notes
    dropDate: item.drop_date,   // DB column: drop_date
    dispatcher: item.dispatcher as DispatcherName,
    origin: item.origin,
    destination: item.destination,
    status: item.status
  }));
};

export const createLoad = async (load: Omit<Load, 'id'>): Promise<Load> => {
  if (!isSupabaseConfigured || !supabase) {
    // Simulate local creation
    await new Promise(resolve => setTimeout(resolve, 500));
    const newLoad = { ...load, id: Math.random().toString(36).substr(2, 9) };
    MOCK_LOADS.unshift(newLoad); // Update local mock
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
      origin: load.origin,
      destination: load.destination,
      status: load.status
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
    origin: data.origin,
    destination: data.destination,
    status: data.status
  };
};