import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Load, DispatcherName, Transporter, Driver, UserProfile, Dispatcher } from '../types';
import { getCompany, createCompany } from './companyService';
import { getCompanyDispatchers } from './dispatcherAssociationService';

// Mock Data for Demo Mode
const MOCK_TRANSPORTERS: Transporter[] = [
  { id: 't1', name: 'Smith Transport LLC', mcNumber: 'MC123456', contactPhone: '555-0101', companyId: 'c1' },
  { id: 't2', name: 'Fast Lane Logistics', mcNumber: 'MC987654', contactPhone: '555-0102', companyId: 'c1' }
];

const MOCK_DRIVERS: Driver[] = [
  { id: 'd1', name: 'Mike Johnson', transporterId: 't1', phone: '555-1111', companyId: 'c1' },
  { id: 'd2', name: 'Sarah Connor', transporterId: 't1', phone: '555-2222', companyId: 'c1' },
  { id: 'd3', name: 'Bob Lee', transporterId: 't2', phone: '555-3333', companyId: 'c1' }
];

const MOCK_DISPATCHERS: Dispatcher[] = [
  { id: 'u1', name: 'John', email: 'john@demo.com', feePercentage: 12, companyId: 'c1' },
  { id: 'u2', name: 'Nick', email: 'nick@demo.com', feePercentage: 12, companyId: 'c1' },
  { id: 'u3', name: 'Logan', email: 'logan@demo.com', feePercentage: 12, companyId: 'c1' }
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
    status: 'Factored',
    companyId: 'c1'
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
    status: 'Factored',
    companyId: 'c1'
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
    status: 'Factored',
    companyId: 'c1'
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
    status: 'Not yet Factored',
    companyId: 'c1'
  }
];

// --- LOAD OPERATIONS ---

export const getLoads = async (companyId?: string, dispatcherName?: string): Promise<Load[]> => {
  if (!isSupabaseConfigured || !supabase) {
    console.warn("Supabase not configured. Using Mock Data.");
    await new Promise(resolve => setTimeout(resolve, 800));
    let mockLoads = [...MOCK_LOADS];
    // Filter mock data if filters provided
    if (companyId) {
      mockLoads = mockLoads.filter(l => l.companyId === companyId);
    }
    if (dispatcherName) {
      mockLoads = mockLoads.filter(l => l.dispatcher === dispatcherName);
    }
    return mockLoads;
  }

  // Build query with filters
  let query = supabase
    .from('loads')
    .select(`
      *,
      transporters ( name ),
      drivers ( name )
    `);

  // Filter by company_id if provided
  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  // Filter by dispatcher name if provided (for dispatchers to see only their loads)
  if (dispatcherName) {
    query = query.eq('dispatcher', dispatcherName);
  }

  // Order by drop date descending
  query = query.order('drop_date', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching loads:", error);
    throw error;
  }

  return (data || []).map((item: any) => ({
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
    rateConfirmationPdfUrl: item.rate_confirmation_pdf_url || undefined,
    driverPayoutStatus: item.driver_payout_status || 'pending',
    companyId: item.company_id
  }));
};

export const createLoad = async (load: Omit<Load, 'id'>): Promise<Load> => {
  if (!isSupabaseConfigured || !supabase) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newLoad = { ...load, id: Math.random().toString(36).substr(2, 9) };
    MOCK_LOADS.unshift(newLoad);
    return newLoad;
  }

  // Get current user's company_id using getCompany() which has fallback logic
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('User not authenticated');
  }

  // Use getCompany() which includes fallback logic to find company by owner_id
  // For dispatchers, use the companyId from load if provided, or get from context
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', session.user.id)
    .single();

  let company = await getCompany(load.companyId);
  let companyId: string | undefined;
  
  if (!company) {
    // If no company exists, try to create one for owners
    if (profile?.role === 'owner') {
      try {
        const newCompany = await createCompany(
          'My Company',
          session.user.id
        );
        companyId = newCompany.id;
      } catch (error) {
        console.error('Error creating company for owner:', error);
        throw new Error('Failed to create company. Please try again.');
      }
    } else {
      throw new Error('User does not have a company assigned. Please contact support.');
    }
  } else {
    companyId = company.id;
  }

  if (!companyId) {
    throw new Error('User does not have a company assigned. Please contact support.');
  }

  // Validate dispatcher-company association if dispatcher is provided
  if (load.dispatcher) {
    // Find dispatcher profile by name
    const { data: dispatcherProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('name', load.dispatcher)
      .eq('role', 'dispatcher')
      .single();

    if (dispatcherProfile) {
      // Check if dispatcher is associated with this company
      const { data: association } = await supabase
        .from('dispatcher_company_associations')
        .select('id')
        .eq('dispatcher_id', dispatcherProfile.id)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .single();

      // If no active association, check backward compatibility (profiles.company_id)
      if (!association) {
        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', dispatcherProfile.id)
          .single();

        if (profileCheck?.company_id !== companyId) {
          console.warn(`Dispatcher ${load.dispatcher} is not associated with company ${companyId}`);
          // Don't throw error, just warn - allow for backward compatibility
        }
      }
    }
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
      rate_confirmation_pdf_url: load.rateConfirmationPdfUrl || null,
      driver_payout_status: load.driverPayoutStatus || 'pending',
      company_id: companyId
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
    status: data.status,
    rateConfirmationPdfUrl: data.rate_confirmation_pdf_url || undefined,
    driverPayoutStatus: data.driver_payout_status || 'pending',
    companyId: data.company_id
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

  // Get the existing load to get company_id
  const { data: existingLoad, error: fetchError } = await supabase
    .from('loads')
    .select('company_id')
    .eq('id', id)
    .single();

  if (fetchError || !existingLoad) {
    throw new Error('Load not found');
  }

  const companyId = existingLoad.company_id;

  // Validate dispatcher-company association if dispatcher is being updated
  if (load.dispatcher && companyId) {
    // Find dispatcher profile by name
    const { data: dispatcherProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('name', load.dispatcher)
      .eq('role', 'dispatcher')
      .single();

    if (dispatcherProfile) {
      // Check if dispatcher is associated with this company
      const { data: association } = await supabase
        .from('dispatcher_company_associations')
        .select('id')
        .eq('dispatcher_id', dispatcherProfile.id)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .single();

      // If no active association, check backward compatibility (profiles.company_id)
      if (!association) {
        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', dispatcherProfile.id)
          .single();

        if (profileCheck?.company_id !== companyId) {
          console.warn(`Dispatcher ${load.dispatcher} is not associated with company ${companyId}`);
          // Don't throw error, just warn - allow for backward compatibility
        }
      }
    }
  }

  const updateData: any = {
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
  };

  // Only update driver_payout_status if explicitly provided (owners only)
  if (load.driverPayoutStatus !== undefined) {
    updateData.driver_payout_status = load.driverPayoutStatus;
  }

  const { data, error } = await supabase
    .from('loads')
    .update(updateData)
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
    rateConfirmationPdfUrl: data.rate_confirmation_pdf_url || undefined,
    driverPayoutStatus: data.driver_payout_status || 'pending',
    companyId: data.company_id
  };
};

export const deleteLoad = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) {
    const index = MOCK_LOADS.findIndex(l => l.id === id);
    if (index === -1) {
      throw new Error('Load not found');
    }
    MOCK_LOADS.splice(index, 1);
    return;
  }

  const { error } = await supabase
    .from('loads')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting load:", error);
    throw error;
  }
};

// --- FLEET OPERATIONS ---

export const getDispatchers = async (companyId?: string): Promise<Dispatcher[]> => {
  if (!isSupabaseConfigured || !supabase) {
    return MOCK_DISPATCHERS;
  }

  // If companyId is provided, get dispatchers from associations (already filtered by active status)
  if (companyId) {
    try {
      const associations = await getCompanyDispatchers(companyId);
      // getCompanyDispatchers already filters by status='active', so no need to filter again
      const dispatcherIds = associations.map(a => a.dispatcherId);

      if (dispatcherIds.length === 0) {
        return [];
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, phone')
        .in('id', dispatcherIds)
        .eq('role', 'dispatcher');

      if (profilesError) {
        console.error('Error fetching dispatcher profiles:', profilesError);
        return []; // Return empty array instead of falling back to dispatchers table
      } else if (profiles && profiles.length > 0) {
        // Map profiles to dispatchers with fee from associations
        return profiles.map((profile: any) => {
          const association = associations.find(a => a.dispatcherId === profile.id);
          return {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            feePercentage: association?.feePercentage || 12,
            companyId: companyId
          };
        });
      }
      
      // If no profiles found, return empty array
      return [];
    } catch (error) {
      console.error('Error fetching dispatchers from associations:', error);
      return []; // Return empty array instead of falling back to dispatchers table
    }
  }

  // Fallback: Get from dispatchers table (backward compatibility - only when companyId is not provided)
  const { data, error } = await supabase.from('dispatchers').select('*');
  if (error) throw error;

  return (data || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    email: d.email,
    phone: d.phone,
    feePercentage: d.fee_percentage || 12,
    companyId: d.company_id
  }));
};

export const createDispatcher = async (d: Omit<Dispatcher, 'id'>): Promise<Dispatcher> => {
  if (!isSupabaseConfigured || !supabase) {
    const newD = { ...d, id: Math.random().toString(36).substr(2, 9) };
    MOCK_DISPATCHERS.push(newD);
    return newD;
  }

  // Get current user's company_id
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('User not authenticated');
  }

  // Use getCompany() which has fallback logic to find company by owner_id
  let company = await getCompany();
  
  // If no company found, check if user is an owner and create one
  if (!company) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('id', session.user.id)
      .single();

    if (profile?.role === 'owner') {
      try {
        company = await createCompany(
          profile?.name ? `${profile.name}'s Company` : 'My Company',
          session.user.id
        );
      } catch (error) {
        console.error('Error creating company for owner:', error);
        throw new Error('Failed to create company. Please try again.');
      }
    }
  }

  if (!company) {
    throw new Error('User does not have a company assigned. Please create a company in Settings first.');
  }

  const companyId = company.id;

  const { data: dispatcherData, error } = await supabase
    .from('dispatchers')
    .insert([{
      name: d.name,
      email: d.email,
      phone: d.phone,
      fee_percentage: d.feePercentage || 12,
      company_id: companyId
    }])
    .select()
    .single();

  if (error) throw error;

  return {
    id: dispatcherData.id,
    name: dispatcherData.name,
    email: dispatcherData.email,
    phone: dispatcherData.phone,
    feePercentage: dispatcherData.fee_percentage || 12,
    companyId: dispatcherData.company_id
  };
};

export const updateDispatcher = async (id: string, d: Partial<Omit<Dispatcher, 'id' | 'companyId'>>): Promise<Dispatcher> => {
  if (!isSupabaseConfigured || !supabase) {
    const dispatcher = MOCK_DISPATCHERS.find(d => d.id === id);
    if (!dispatcher) throw new Error('Dispatcher not found');
    Object.assign(dispatcher, d);
    return dispatcher;
  }

  const updateData: any = {};
  if (d.name !== undefined) updateData.name = d.name;
  if (d.email !== undefined) updateData.email = d.email;
  if (d.phone !== undefined) updateData.phone = d.phone;
  if (d.feePercentage !== undefined) updateData.fee_percentage = d.feePercentage;

  const { data, error } = await supabase
    .from('dispatchers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    feePercentage: data.fee_percentage || 12,
    companyId: data.company_id
  };
};

export const getTransporters = async (companyId?: string): Promise<Transporter[]> => {
  if (!isSupabaseConfigured || !supabase) {
    let mockTransporters = MOCK_TRANSPORTERS;
    if (companyId) {
      mockTransporters = mockTransporters.filter(t => t.companyId === companyId);
    }
    return mockTransporters;
  }
  
  let query = supabase.from('transporters').select('*');
  
  // Filter by company_id if provided
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  return (data || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    mcNumber: t.mc_number,
    registrationNumber: t.registration_number,
    contactEmail: t.contact_email,
    contactPhone: t.contact_phone,
    companyId: t.company_id
  }));
};

export const createTransporter = async (t: Omit<Transporter, 'id'>): Promise<Transporter> => {
  if (!isSupabaseConfigured || !supabase) {
    const newT = { ...t, id: Math.random().toString(36).substr(2, 9) };
    MOCK_TRANSPORTERS.push(newT);
    return newT;
  }

  // Get current user's company_id
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('User not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role, name')
    .eq('id', session.user.id)
    .single();

  let companyId = profile?.company_id;

  // If user is an owner and doesn't have a company, create one
  if (!companyId && profile?.role === 'owner') {
    try {
      const company = await createCompany(
        profile?.name ? `${profile.name}'s Company` : 'My Company',
        session.user.id
      );
      companyId = company.id;
    } catch (error) {
      console.error('Error creating company for owner:', error);
      throw new Error('Failed to create company. Please try again.');
    }
  }

  if (!companyId) {
    throw new Error('User does not have a company assigned. Please contact support.');
  }

  const { data, error } = await supabase
    .from('transporters')
    .insert([{
      name: t.name,
      mc_number: t.mcNumber || null,
      registration_number: t.registrationNumber || null,
      contact_email: t.contactEmail,
      contact_phone: t.contactPhone,
      company_id: companyId
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating transporter:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    mcNumber: data.mc_number,
    registrationNumber: data.registration_number,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    companyId: data.company_id
  };
};

export const updateTransporter = async (id: string, t: Partial<Omit<Transporter, 'id' | 'companyId'>>): Promise<Transporter> => {
  if (!isSupabaseConfigured || !supabase) {
    const index = MOCK_TRANSPORTERS.findIndex(transporter => transporter.id === id);
    if (index === -1) {
      throw new Error('Transporter not found');
    }
    const updatedTransporter = { ...MOCK_TRANSPORTERS[index], ...t };
    MOCK_TRANSPORTERS[index] = updatedTransporter;
    return updatedTransporter;
  }

  const updateData: any = {};
  if (t.name !== undefined) updateData.name = t.name;
  if (t.mcNumber !== undefined) updateData.mc_number = t.mcNumber || null;
  if (t.registrationNumber !== undefined) updateData.registration_number = t.registrationNumber || null;
  if (t.contactEmail !== undefined) updateData.contact_email = t.contactEmail || null;
  if (t.contactPhone !== undefined) updateData.contact_phone = t.contactPhone || null;

  const { data, error } = await supabase
    .from('transporters')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating transporter:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    mcNumber: data.mc_number,
    registrationNumber: data.registration_number,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    companyId: data.company_id
  };
};

export const getDrivers = async (companyId?: string): Promise<Driver[]> => {
  if (!isSupabaseConfigured || !supabase) {
    let mockDrivers = MOCK_DRIVERS;
    if (companyId) {
      mockDrivers = mockDrivers.filter(d => d.companyId === companyId);
    }
    return mockDrivers;
  }

  let query = supabase.from('drivers').select('*');
  
  // Filter by company_id if provided
  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    transporterId: d.transporter_id,
    phone: d.phone,
    email: d.email,
    companyId: d.company_id
  }));
};

export const createDriver = async (d: Omit<Driver, 'id'>): Promise<Driver> => {
  if (!isSupabaseConfigured || !supabase) {
    const newD = { ...d, id: Math.random().toString(36).substr(2, 9) };
    MOCK_DRIVERS.push(newD);
    return newD;
  }

  // Get current user's company_id
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('User not authenticated');
  }

  // Use getCompany() which has fallback logic to find company by owner_id
  let company = await getCompany();
  
  // If no company found, check if user is an owner and create one
  if (!company) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('id', session.user.id)
      .single();

    if (profile?.role === 'owner') {
      try {
        company = await createCompany(
          profile?.name ? `${profile.name}'s Company` : 'My Company',
          session.user.id
        );
      } catch (error) {
        console.error('Error creating company for owner:', error);
        throw new Error('Failed to create company. Please try again.');
      }
    }
  }

  if (!company) {
    throw new Error('User does not have a company assigned. Please create a company in Settings first.');
  }

  const companyId = company.id;

  const { data, error } = await supabase
    .from('drivers')
    .insert([{
      name: d.name,
      transporter_id: d.transporterId || null,
      phone: d.phone,
      email: d.email,
      company_id: companyId
    }])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    transporterId: data.transporter_id,
    phone: data.phone,
    email: data.email,
    companyId: data.company_id
  };
};

export const updateDriver = async (id: string, d: Partial<Omit<Driver, 'id' | 'companyId'>>): Promise<Driver> => {
  if (!isSupabaseConfigured || !supabase) {
    const index = MOCK_DRIVERS.findIndex(driver => driver.id === id);
    if (index === -1) {
      throw new Error('Driver not found');
    }
    const updatedDriver = { ...MOCK_DRIVERS[index], ...d };
    MOCK_DRIVERS[index] = updatedDriver;
    return updatedDriver;
  }

  const updateData: any = {};
  if (d.name !== undefined) updateData.name = d.name;
  if (d.phone !== undefined) updateData.phone = d.phone;
  if (d.email !== undefined) updateData.email = d.email;
  if (d.transporterId !== undefined) updateData.transporter_id = d.transporterId || null;

  const { data, error } = await supabase
    .from('drivers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating driver:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    transporterId: data.transporter_id,
    phone: data.phone,
    email: data.email,
    companyId: data.company_id
  };
};