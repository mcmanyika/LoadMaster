import React, { useState, useEffect } from 'react';
import { Load, Driver, UserProfile, Dispatcher } from '../types';
import { X, Calculator, Upload, FileText, AlertCircle } from 'lucide-react';
import { getCompany, getDispatchCompanyOwnCompany } from '../services/companyService';
import { getCompanyDispatchers } from '../services/dispatcherAssociationService';
import { getCompanyDrivers } from '../services/driverAssociationService';
import { getDispatchers, getDrivers, getLoads } from '../services/loadService';
import { uploadRateConfirmationPdf } from '../services/storageService';
import { PlacesAutocomplete } from './PlacesAutocomplete';
import { calculateDistance } from '../services/distanceService';
import { supabase } from '../services/supabaseClient';

interface LoadFormProps {
  onClose: () => void;
  onSave: (load: Omit<Load, 'id'>) => void;
  currentUser: UserProfile;
  loadToEdit?: Load; // Optional load for editing
  companyId?: string; // Current company context for filtering dispatchers
}

export const LoadForm: React.FC<LoadFormProps> = ({ onClose, onSave, currentUser, loadToEdit, companyId }) => {
  const isEditMode = !!loadToEdit;
  // Data Options
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [ownerCompanyName, setOwnerCompanyName] = useState<string>(''); // For dispatchers: owner company name
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(loadToEdit?.rateConfirmationPdfUrl || null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [originPlace, setOriginPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [destinationPlace, setDestinationPlace] = useState<google.maps.places.PlaceResult | null>(null);
  const [calculatingDistance, setCalculatingDistance] = useState(false);

  const [formData, setFormData] = useState({
    company: loadToEdit?.company || '',
    gross: loadToEdit?.gross.toString() || '',
    miles: loadToEdit?.miles.toString() || '',
    dropDate: loadToEdit?.dropDate || new Date().toISOString().split('T')[0],
    dispatcher: loadToEdit?.dispatcher || '',
    transporterId: loadToEdit?.transporterId || '',
    driverId: loadToEdit?.driverId || '',
    origin: loadToEdit?.origin || '',
    destination: loadToEdit?.destination || '',
    status: loadToEdit?.status || 'Not yet Factored',
    driverPayoutStatus: loadToEdit?.driverPayoutStatus || 'pending',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use companyId prop if provided, otherwise fetch company
        let companyData;
        if (companyId) {
          companyData = await getCompany(companyId);
        } else {
          companyData = await getCompany();
        }
        
        const targetCompanyId = companyId || companyData?.id;
        
        // Fetch dispatchers and drivers only if we have companyData
        // Use getDispatchers which queries both dispatcher_company_associations and dispatchers tables
        if (companyData) {
          // For dispatch companies: get dispatchers from their own company, not the joined owner company
          let dispatcherCompanyId = companyData.id;
          let driverCompanyId = companyData.id; // For fetching drivers
          
          if (currentUser?.role === 'dispatch_company') {
            const ownCompany = await getDispatchCompanyOwnCompany();
            dispatcherCompanyId = ownCompany?.id || companyData.id;
            // For dispatch companies, drivers should always come from the owner company (companyData.id)
            // companyData is the joined owner company for dispatch companies
            driverCompanyId = companyData.id; // Always use owner company for drivers
          } else if (currentUser?.role === 'dispatcher') {
            // For dispatchers: find owner company from all their associations
            // Get all active associations for this dispatcher
            try {
              const { data: allAssociations, error: associationsError } = await supabase
                .from('dispatcher_company_associations')
                .select('company_id, company:companies(id, name, owner_id)')
                .eq('dispatcher_id', currentUser.id)
                .eq('status', 'active');
              
              if (associationsError) {
                console.error('[LoadForm] Error fetching associations:', associationsError);
              }
              
              console.log('[LoadForm] Dispatcher: Found', allAssociations?.length || 0, 'associations');
              if (allAssociations && allAssociations.length > 0) {
                // Check each association to find an owner company
                for (const assoc of allAssociations) {
                  console.log('[LoadForm] Dispatcher: Checking association with company_id', assoc.company_id);
                  // Handle company as either object or array (Supabase join might return either)
                  const company = Array.isArray(assoc.company) ? assoc.company[0] : assoc.company;
                  
                  if (company && company.owner_id) {
                    // Check if this company is owned by an owner (not a dispatch company)
                    try {
                      const { data: ownerProfile, error: profileError } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', company.owner_id)
                        .maybeSingle();
                      
                      if (profileError) {
                        console.error('[LoadForm] Error fetching owner profile:', profileError);
                        continue;
                      }
                      
                      if (ownerProfile?.role === 'owner') {
                        // Found an owner company - use it for drivers
                        driverCompanyId = assoc.company_id;
                        console.log('[LoadForm] Dispatcher: Found owner company', driverCompanyId, 'from association', assoc.company_id);
                        // Set the owner company name for display
                        if (company.name) {
                          setOwnerCompanyName(company.name);
                        }
                        break; // Use first owner company found
                      } else if (ownerProfile?.role === 'dispatch_company') {
                        // This is a dispatch company's own company - find the owner company via dispatch company's associations
                        console.log('[LoadForm] Dispatcher: Found dispatch company', company.owner_id, '- looking for owner company');
                        try {
                          const { data: dispatchCompanyAssociations } = await supabase
                            .from('dispatcher_company_associations')
                            .select('company_id, company:companies(id, name, owner_id)')
                            .eq('dispatcher_id', company.owner_id)
                            .eq('status', 'active')
                            .limit(10); // Get up to 10 associations
                          
                          if (dispatchCompanyAssociations && dispatchCompanyAssociations.length > 0) {
                            // Find the owner company
                            for (const dca of dispatchCompanyAssociations) {
                              const ownerCompany = Array.isArray(dca.company) ? dca.company[0] : dca.company;
                              if (ownerCompany && ownerCompany.owner_id) {
                                const { data: ownerCompanyOwnerProfile } = await supabase
                                  .from('profiles')
                                  .select('role')
                                  .eq('id', ownerCompany.owner_id)
                                  .maybeSingle();
                                
                                if (ownerCompanyOwnerProfile?.role === 'owner') {
                                  driverCompanyId = dca.company_id;
                                  console.log('[LoadForm] Dispatcher: Found owner company via dispatch company chain', driverCompanyId);
                                  if (ownerCompany.name) {
                                    setOwnerCompanyName(ownerCompany.name);
                                  }
                                  break;
                                }
                              }
                            }
                            if (driverCompanyId) break; // Break from outer loop if found
                          }
                        } catch (error) {
                          console.error('[LoadForm] Error finding owner company via dispatch company:', error);
                        }
                      }
                    } catch (error) {
                      console.error('[LoadForm] Error checking owner profile:', error);
                      continue;
                    }
                  }
                }
              }
            } catch (error) {
              console.error('[LoadForm] Error in dispatcher company lookup:', error);
            }
            
            // Fallback: if no owner company found, try the existing logic
            if (!driverCompanyId && companyData) {
              try {
                const { data: companyOwner, error: ownerError } = await supabase
                  .from('profiles')
                  .select('role')
                  .eq('id', companyData.ownerId)
                  .maybeSingle();
                
                if (ownerError) {
                  console.error('[LoadForm] Error fetching company owner:', ownerError);
                } else if (companyOwner?.role === 'owner') {
                  driverCompanyId = companyData.id;
                  // Set the owner company name for display
                  setOwnerCompanyName(companyData.name || '');
                } else if (companyOwner?.role === 'dispatch_company') {
                  // A dispatch company might have multiple associations, get the first one
                  const { data: ownerCompanyAssociations } = await supabase
                    .from('dispatcher_company_associations')
                    .select('company_id, company:companies(name)')
                    .eq('dispatcher_id', companyData.ownerId)
                    .eq('status', 'active')
                    .limit(1);
                  
                  const ownerCompanyAssociation = ownerCompanyAssociations && ownerCompanyAssociations.length > 0 
                    ? ownerCompanyAssociations[0] 
                    : null;
                  
                  if (ownerCompanyAssociation?.company_id) {
                    driverCompanyId = ownerCompanyAssociation.company_id;
                    // Set the owner company name for display
                    // Handle company as either object or array (Supabase join might return either)
                    const company = Array.isArray(ownerCompanyAssociation.company) 
                      ? ownerCompanyAssociation.company[0] 
                      : ownerCompanyAssociation.company;
                    if (company?.name) {
                      setOwnerCompanyName(company.name);
                    }
                  }
                }
              } catch (error) {
                console.error('[LoadForm] Error in fallback company lookup:', error);
              }
            }
          }
          
          // Fetch dispatchers from dispatch company's own company (or owner's company for others)
          const dispatchersData = await getDispatchers(dispatcherCompanyId);
          setDispatchers(dispatchersData);
          
          // Fetch drivers based on user role
          let driversData: Driver[] = [];
          
          if (currentUser?.role === 'owner') {
            // For owners: fetch ALL drivers from the drivers table for the company
            // This ensures we show all drivers, not just those with matching profile_ids
            console.log('[LoadForm] Owner: Fetching drivers for company', driverCompanyId);
            try {
              // First, try fetching without company filter to see what RLS allows
              const { data: allDriversVisible, error: allDriversError } = await supabase
                .from('drivers')
                .select('id, name, phone, email, transporter_id, company_id, pay_type, pay_percentage, profile_id');
              
              console.log('[LoadForm] Owner: Total drivers visible via RLS (all companies):', allDriversVisible?.length || 0);
              if (allDriversVisible && allDriversVisible.length > 0) {
                console.log('[LoadForm] Owner: All visible drivers:', allDriversVisible.map(d => ({ 
                  id: d.id, 
                  name: d.name, 
                  company_id: d.company_id,
                  matches_target: d.company_id === driverCompanyId
                })));
              }
              
              // Get all drivers from drivers table for this company
              const { data: allDrivers, error: driversError } = await supabase
                .from('drivers')
                .select('id, name, phone, email, transporter_id, company_id, pay_type, pay_percentage, profile_id')
                .eq('company_id', driverCompanyId);
              
              if (driversError) {
                console.error('[LoadForm] Owner: Error fetching drivers:', driversError);
                console.error('[LoadForm] Owner: Error details:', JSON.stringify(driversError, null, 2));
                driversData = [];
              } else {
                console.log('[LoadForm] Owner: Query returned', allDrivers?.length || 0, 'drivers for company_id', driverCompanyId);
                console.log('[LoadForm] Owner: Driver IDs:', allDrivers?.map(d => ({ id: d.id, name: d.name, company_id: d.company_id, profile_id: d.profile_id })));
                
                // Also get associations to enrich with profile data if available
                const invitedDrivers = await getCompanyDrivers(driverCompanyId);
                console.log('[LoadForm] Owner: Got', invitedDrivers?.length || 0, 'invited drivers from associations');
                
                // Check for missing driver records (associations without drivers table records)
                const driversTableProfileIds = new Set(
                  (allDrivers || [])
                    .filter(d => d.profile_id)
                    .map(d => d.profile_id!)
                );
                
                const missingDrivers = invitedDrivers.filter(assoc => 
                  assoc.driverId && 
                  !driversTableProfileIds.has(assoc.driverId)
                );
                
                if (missingDrivers.length > 0) {
                  console.warn('[LoadForm] Owner: Found', missingDrivers.length, 'drivers in associations without drivers table records. Creating missing records...');
                  
                  // Create missing driver records
                  for (const assoc of missingDrivers) {
                    if (!assoc.driverId || !assoc.driver) continue;
                    
                    try {
                      const { data: newDriver, error: insertError } = await supabase
                        .from('drivers')
                        .insert({
                          name: assoc.driver.name || 'Unknown Driver',
                          email: assoc.driver.email || '',
                          phone: null, // phone doesn't exist in profiles
                          transporter_id: null,
                          company_id: driverCompanyId,
                          pay_type: 'percentage_of_net',
                          pay_percentage: 50,
                          profile_id: assoc.driverId
                        })
                        .select('id, name, phone, email, transporter_id, company_id, pay_type, pay_percentage, profile_id')
                        .single();
                      
                      if (insertError) {
                        console.error('[LoadForm] Owner: Error creating driver record for', assoc.driverId, ':', insertError);
                      } else {
                        console.log('[LoadForm] Owner: Created driver record for', assoc.driver.name, ':', newDriver.id);
                        // Add to allDrivers array
                        allDrivers.push(newDriver);
                      }
                    } catch (error) {
                      console.error('[LoadForm] Owner: Error creating driver record:', error);
                    }
                  }
                  
                  // Re-fetch all drivers after creating missing records
                  const { data: refreshedDrivers } = await supabase
                    .from('drivers')
                    .select('id, name, phone, email, transporter_id, company_id, pay_type, pay_percentage, profile_id')
                    .eq('company_id', driverCompanyId);
                  
                  if (refreshedDrivers) {
                    allDrivers.length = 0;
                    allDrivers.push(...refreshedDrivers);
                    console.log('[LoadForm] Owner: After creating missing records, now have', allDrivers.length, 'drivers');
                  }
                }
                
                if (allDrivers && allDrivers.length > 0) {
                  // Deduplicate drivers by id (in case of duplicates in database)
                  const uniqueDriversMap = new Map<string, typeof allDrivers[0]>();
                  for (const driver of allDrivers) {
                    if (!uniqueDriversMap.has(driver.id)) {
                      uniqueDriversMap.set(driver.id, driver);
                    }
                  }
                  const uniqueDrivers = Array.from(uniqueDriversMap.values());
                  console.log('[LoadForm] Owner: After deduplication, have', uniqueDrivers.length, 'unique drivers (was', allDrivers.length, ')');
                  
                  // Create a map of profile_id to association for enrichment
                  const associationMap = new Map(
                    invitedDrivers
                      .filter(assoc => assoc.driverId && assoc.driver)
                      .map(assoc => [assoc.driverId!, assoc])
                  );
                  
                  // Convert all drivers to Driver format, enriching with association data if available
                  driversData = uniqueDrivers.map(driverRecord => {
                    const association = driverRecord.profile_id 
                      ? associationMap.get(driverRecord.profile_id)
                      : null;
                    
                    return {
                      id: driverRecord.id, // Always use drivers.id
                      name: association?.driver?.name || driverRecord.name || '',
                      email: association?.driver?.email || driverRecord.email || '',
                      phone: association?.driver?.phone || driverRecord.phone || '',
                      transporterId: driverRecord.transporter_id || '',
                      companyId: driverRecord.company_id,
                      payType: (driverRecord.pay_type || 'percentage_of_net') as 'percentage_of_gross' | 'percentage_of_net',
                      payPercentage: driverRecord.pay_percentage || 50
                    };
                  });
                  
                  // Final deduplication by id (in case mapping creates duplicates)
                  const finalDriversMap = new Map<string, typeof driversData[0]>();
                  for (const driver of driversData) {
                    if (!finalDriversMap.has(driver.id)) {
                      finalDriversMap.set(driver.id, driver);
                    }
                  }
                  driversData = Array.from(finalDriversMap.values());
                  
                  console.log('[LoadForm] Owner: Returning', driversData.length, 'drivers after mapping and deduplication');
                  console.log('[LoadForm] Owner: Driver names:', driversData.map(d => d.name));
                } else {
                  console.warn('[LoadForm] Owner: No drivers found in drivers table for company', driverCompanyId);
                  console.warn('[LoadForm] Owner: This might be an RLS issue or drivers have different company_id');
                  driversData = [];
                }
              }
            } catch (error) {
              console.error('[LoadForm] Owner: Error fetching drivers:', error);
              driversData = [];
            }
          } else if (currentUser?.role === 'dispatch_company') {
            // For dispatch companies: fetch all drivers from owner company
            // Use getCompanyDrivers to get invited drivers (with profile data)
            const invitedDrivers = await getCompanyDrivers(driverCompanyId);
            
            // Enrich with pay config from drivers table
            if (invitedDrivers.length > 0) {
              const driverIds = invitedDrivers
                .map(assoc => assoc.driverId)
                .filter((id): id is string => !!id);
              
              if (driverIds.length > 0) {
                // Fetch pay config from drivers table
                const { data: driversWithPayConfig, error: driversError } = await supabase
                  .from('drivers')
                  .select('id, name, phone, email, transporter_id, company_id, pay_type, pay_percentage, profile_id')
                  .eq('company_id', driverCompanyId)
                  .in('profile_id', driverIds);
                
                if (!driversError && driversWithPayConfig && driversWithPayConfig.length > 0) {
                  // Create a map of profile_id to driver record
                  const driverMap = new Map(
                    driversWithPayConfig.map(d => [d.profile_id, d])
                  );
                  
                  // Convert associations to Driver format
                  // Only include drivers that have a record in the drivers table
                  const mappedDrivers = invitedDrivers
                    .filter(assoc => {
                      if (!assoc.driverId || !assoc.driver) return false;
                      return driverMap.has(assoc.driverId);
                    })
                    .map(assoc => {
                      const driverRecord = driverMap.get(assoc.driverId!);
                      if (!driverRecord) {
                        // Should not happen due to filter above
                        return null as any;
                      }
                      
                      return {
                        id: driverRecord.id, // Always use drivers.id
                        name: assoc.driver?.name || driverRecord.name || '',
                        email: assoc.driver?.email || driverRecord.email || '',
                        phone: assoc.driver?.phone || driverRecord.phone || '',
                        transporterId: driverRecord.transporter_id || '',
                        companyId: assoc.companyId,
                        payType: (driverRecord.pay_type || 'percentage_of_net') as 'percentage_of_gross' | 'percentage_of_net',
                        payPercentage: driverRecord.pay_percentage || 50
                      };
                    })
                    .filter(Boolean);
                  
                  // Deduplicate by id to ensure each driver appears only once
                  const dispatchCompanyDriversMap = new Map<string, typeof mappedDrivers[0]>();
                  for (const driver of mappedDrivers) {
                    if (driver && !dispatchCompanyDriversMap.has(driver.id)) {
                      dispatchCompanyDriversMap.set(driver.id, driver);
                    }
                  }
                  driversData = Array.from(dispatchCompanyDriversMap.values());
                  console.log('[LoadForm] Dispatch Company: After deduplication, have', driversData.length, 'unique drivers');
                } else {
                  // No matching driver records in drivers table; leave drivers list empty
                  console.warn('[LoadForm] No matching driver records in drivers table for dispatch company; driver dropdown will be empty.');
                  driversData = [];
                }
              }
            }
          } else if (currentUser?.role === 'dispatcher') {
            // For dispatchers: fetch ALL drivers from the drivers table for the owner company
            // This ensures we show all drivers, not just those with matching profile_ids
            console.log('[LoadForm] Dispatcher: driverCompanyId =', driverCompanyId);
            if (driverCompanyId) {
              console.log('[LoadForm] Dispatcher: Fetching drivers for company', driverCompanyId);
              try {
                // Get all drivers that RLS allows this dispatcher to see (without company filter)
                // Then filter client-side to only include drivers from the target company
                // This ensures we see all drivers RLS allows, even if company_id filtering would hide some
                const { data: allDriversVisible, error: driversError } = await supabase
                  .from('drivers')
                  .select('id, name, phone, email, transporter_id, company_id, pay_type, pay_percentage, profile_id');
                
                console.log('[LoadForm] Dispatcher: Total drivers visible via RLS (all companies):', allDriversVisible?.length || 0);
                if (allDriversVisible && allDriversVisible.length > 0) {
                  console.log('[LoadForm] Dispatcher: All visible drivers:', allDriversVisible.map(d => ({ 
                    id: d.id, 
                    name: d.name, 
                    company_id: d.company_id,
                    matches_target: d.company_id === driverCompanyId
                  })));
                }
                
                // Filter to only drivers from the target company (client-side after RLS)
                const allDrivers = allDriversVisible?.filter(d => d.company_id === driverCompanyId) || [];
                console.log('[LoadForm] Dispatcher: After filtering by company_id', driverCompanyId, ':', allDrivers.length, 'drivers');
                
                if (driversError) {
                  console.error('[LoadForm] Dispatcher: Error fetching drivers:', driversError);
                  console.error('[LoadForm] Dispatcher: Error details:', JSON.stringify(driversError, null, 2));
                  driversData = [];
                } else {
                  console.log('[LoadForm] Dispatcher: Query returned', allDrivers?.length || 0, 'drivers for company_id', driverCompanyId);
                  console.log('[LoadForm] Dispatcher: Driver IDs:', allDrivers?.map(d => ({ id: d.id, name: d.name, company_id: d.company_id, profile_id: d.profile_id })));
                  
                  // Also get associations to see if there are drivers in associations that aren't in drivers table
                  const invitedDrivers = await getCompanyDrivers(driverCompanyId);
                  console.log('[LoadForm] Dispatcher: Got', invitedDrivers?.length || 0, 'invited drivers from associations');
                  
                  // Create a map of profile_id to association for enrichment
                  const associationMap = new Map(
                    invitedDrivers
                      .filter(assoc => assoc.driverId && assoc.driver)
                      .map(assoc => [assoc.driverId!, assoc])
                  );
                  
                  // Create a set of profile_ids we already have from drivers table
                  const driversTableProfileIds = new Set(
                    allDrivers
                      .filter(d => d.profile_id)
                      .map(d => d.profile_id!)
                  );
                  
                  // Check if there are drivers in associations that don't have a drivers table record
                  const missingDrivers = invitedDrivers.filter(assoc => 
                    assoc.driverId && 
                    !driversTableProfileIds.has(assoc.driverId)
                  );
                  
                  if (missingDrivers.length > 0) {
                    console.warn('[LoadForm] Dispatcher: Found', missingDrivers.length, 'drivers in associations without drivers table records:', 
                      missingDrivers.map(a => ({ driverId: a.driverId, name: a.driver?.name })));
                  }
                  
                  // Deduplicate drivers by id (in case of duplicates in database)
                  const uniqueDriversMap = new Map<string, typeof allDrivers[0]>();
                  for (const driver of allDrivers) {
                    if (!uniqueDriversMap.has(driver.id)) {
                      uniqueDriversMap.set(driver.id, driver);
                    }
                  }
                  const uniqueDrivers = Array.from(uniqueDriversMap.values());
                  console.log('[LoadForm] Dispatcher: After deduplication, have', uniqueDrivers.length, 'unique drivers (was', allDrivers.length, ')');
                  
                  // Convert all drivers from drivers table to Driver format, enriching with association data if available
                  driversData = uniqueDrivers.map(driverRecord => {
                    const association = driverRecord.profile_id 
                      ? associationMap.get(driverRecord.profile_id)
                      : null;
                    
                    return {
                      id: driverRecord.id, // Always use drivers.id
                      name: association?.driver?.name || driverRecord.name || '',
                      email: association?.driver?.email || driverRecord.email || '',
                      phone: association?.driver?.phone || driverRecord.phone || '',
                      transporterId: driverRecord.transporter_id || '',
                      companyId: driverRecord.company_id,
                      payType: (driverRecord.pay_type || 'percentage_of_net') as 'percentage_of_gross' | 'percentage_of_net',
                      payPercentage: driverRecord.pay_percentage || 50
                    };
                  });
                  
                  // Final deduplication by id (in case mapping creates duplicates)
                  const finalDriversMap = new Map<string, typeof driversData[0]>();
                  for (const driver of driversData) {
                    if (!finalDriversMap.has(driver.id)) {
                      finalDriversMap.set(driver.id, driver);
                    }
                  }
                  driversData = Array.from(finalDriversMap.values());
                  
                  console.log('[LoadForm] Dispatcher: Returning', driversData.length, 'drivers after mapping and deduplication');
                  console.log('[LoadForm] Dispatcher: Driver names:', driversData.map(d => d.name));
                }
              } catch (error) {
                console.error('[LoadForm] Dispatcher: Error fetching drivers:', error);
                driversData = [];
              }
            } else {
              console.warn('[LoadForm] No driverCompanyId found for dispatcher; cannot fetch drivers.');
              console.log('[LoadForm] Dispatcher: companyData =', companyData);
              driversData = [];
            }
          }
          
          // If in edit mode and loadToEdit has a driverId, ensure that driver is in the list
          let finalDriversData = driversData;
          if (isEditMode && loadToEdit?.driverId) {
            const existingDriverInList = finalDriversData.find(d => d.id === loadToEdit.driverId);
            
            // If the driver from loadToEdit is not in the list, fetch it
            if (!existingDriverInList) {
              try {
                const { data: loadDriver, error: driverError } = await supabase
                  .from('drivers')
                  .select('id, name, phone, email, transporter_id, company_id, pay_type, pay_percentage')
                  .eq('id', loadToEdit.driverId)
                  .maybeSingle();
                
                if (!driverError && loadDriver) {
                  // Add the driver to the list
                  finalDriversData.push({
                    id: loadDriver.id,
                    name: loadDriver.name,
                    email: loadDriver.email || '',
                    phone: loadDriver.phone || '',
                    transporterId: loadDriver.transporter_id || '',
                    companyId: loadDriver.company_id,
                    payType: loadDriver.pay_type || 'percentage_of_net',
                    payPercentage: loadDriver.pay_percentage || 50
                  });
                }
              } catch (error) {
                console.error('Error fetching driver for edit mode:', error);
                // Continue without adding the driver - the dropdown will show "Select Driver..." but that's better than crashing
              }
            }
          }
          
          setDrivers(finalDriversData);
          
          // Auto-select dispatcher only if not in edit mode
          if (!isEditMode) {
            if (currentUser.role === 'dispatcher') {
              // If logged in as dispatcher, use their name
              setFormData(prev => ({ ...prev, dispatcher: currentUser.name }));
            } else if (dispatchersData.length > 0) {
              // Otherwise default to first available
              setFormData(prev => ({ ...prev, dispatcher: dispatchersData[0].name }));
            }
          }
          
        } else {
          setDispatchers([]); // No dispatchers without company
          setDrivers([]); // No drivers without company
          console.warn('LoadForm: No company data found, cannot fetch drivers/dispatchers');
        }
      } catch (e) {
        console.error("Failed to load options", e);
        setErrorModal({ isOpen: true, message: `Failed to load drivers and dispatchers: ${e instanceof Error ? e.message : 'Unknown error'}` });
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchData();
  }, [currentUser, isEditMode, companyId]);

  // Show all drivers from the selected company (already filtered by companyId in fetch)
  const availableDrivers = drivers;

  // Calculate distance when both origin and destination are available
  useEffect(() => {
    const calculateMiles = async () => {
      // Only calculate if both fields have values
      if (!formData.origin || !formData.destination) {
        return;
      }

      // Only calculate if we have at least one place selected from autocomplete
      // This ensures we only auto-calculate when user selects from suggestions
      if (!originPlace && !destinationPlace) {
        return; // User typed manually, don't auto-calculate
      }

      setCalculatingDistance(true);
      try {
        const result = await calculateDistance(
          formData.origin,
          formData.destination,
          originPlace || undefined,
          destinationPlace || undefined
        );

        if (result.distance > 0) {
          setFormData(prev => ({ ...prev, miles: result.distance.toString() }));
        } else if (result.error) {
          console.warn('Distance calculation error:', result.error);
          // Don't show error to user, just log it
        }
      } catch (error) {
        console.error('Error calculating distance:', error);
      } finally {
        setCalculatingDistance(false);
      }
    };

    // Debounce the calculation to avoid excessive API calls
    const timeoutId = setTimeout(calculateMiles, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.origin, formData.destination, originPlace, destinationPlace]);

  // Real-time preview calculations
  const gross = parseFloat(formData.gross) || 0;
  const selectedDispatcher = dispatchers.find(d => d.name === formData.dispatcher);
  const feePercentage = selectedDispatcher?.feePercentage || 12; // Default to 12% if not set
  const dispatchFee = gross * (feePercentage / 100);
  
  // Get selected driver's pay configuration
  const selectedDriver = drivers.find(d => d.id === formData.driverId);
  const driverPayType = selectedDriver?.payType || 'percentage_of_net';
  const driverPayPercentage = selectedDriver?.payPercentage || 50;
  
  // Calculate driver pay based on driver's pay configuration
  let driverPay: number;
  if (driverPayType === 'percentage_of_gross') {
    // Percentage of gross (e.g., 30% of gross)
    driverPay = gross * (driverPayPercentage / 100);
  } else {
    // Percentage of net (gross - dispatch fee) - default behavior
    driverPay = (gross - dispatchFee) * (driverPayPercentage / 100);
  }


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setErrorModal({ isOpen: true, message: 'Please upload a PDF file' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setErrorModal({ isOpen: true, message: 'File size must be less than 10MB' });
        return;
      }
      setPdfFile(file);
      // Create preview URL
      setPdfPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePdf = () => {
    setPdfFile(null);
    if (pdfPreview && pdfPreview.startsWith('blob:')) {
      URL.revokeObjectURL(pdfPreview);
    }
    setPdfPreview(loadToEdit?.rateConfirmationPdfUrl || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let pdfUrl = loadToEdit?.rateConfirmationPdfUrl || null;

    // Upload PDF if a new file was selected
    if (pdfFile) {
      setUploadingPdf(true);
      try {
        // For new loads, we'll need to create the load first to get an ID
        // For existing loads, use the existing ID
        const tempId = loadToEdit?.id || `temp-${Date.now()}`;
        const uploadResult = await uploadRateConfirmationPdf(pdfFile, tempId);
        
        if (uploadResult.error) {
          const errorMessage = uploadResult.error.message || 'Unknown error';
          console.error('PDF upload error:', uploadResult.error);
          setErrorModal({ isOpen: true, message: `Failed to upload PDF: ${errorMessage}` });
          setUploadingPdf(false);
          return;
        }
        
        pdfUrl = uploadResult.url;
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        console.error('Error uploading PDF:', error);
        setErrorModal({ isOpen: true, message: `Failed to upload PDF: ${errorMessage}` });
        setUploadingPdf(false);
        return;
      } finally {
        setUploadingPdf(false);
      }
    }

    const loadData: Omit<Load, 'id'> = {
      company: formData.company,
      gross: gross,
      miles: parseFloat(formData.miles) || 0,
      gasAmount: 0, // Gas expenses are now managed in the Expenses module
      gasNotes: '', // Gas expenses are now managed in the Expenses module
      dropDate: formData.dropDate,
      dispatcher: formData.dispatcher,
      transporterId: formData.transporterId,
      driverId: formData.driverId,
      origin: formData.origin,
      destination: formData.destination,
      status: formData.status,
      rateConfirmationPdfUrl: pdfUrl || undefined
    };

    // Only include driverPayoutStatus for owners
    if (currentUser.role === 'owner') {
      loadData.driverPayoutStatus = formData.driverPayoutStatus || 'pending';
    }

    onSave(loadData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
          <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{isEditMode ? 'Edit Load' : 'Add New Load'}</h2>
            {ownerCompanyName && currentUser?.role === 'dispatcher' && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{ownerCompanyName}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          {loadingOptions && (
            <div className="mb-4 text-xs text-blue-500 animate-pulse">Loading fleet options...</div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Primary Details */}
            <div className="col-span-2 space-y-4">
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Load Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Broker / Customer</label>
                  <input
                    required
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. Broker Inc"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Pickup Date</label>
                  <input
                    required
                    name="dropDate"
                    type="date"
                    value={formData.dropDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Route */}
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Origin (From)</label>
                <PlacesAutocomplete
                  value={formData.origin}
                  onChange={(value) => {
                    setFormData({ ...formData, origin: value });
                    if (!value) setOriginPlace(null); // Clear place when input is cleared
                  }}
                  onPlaceSelect={(place) => {
                    setOriginPlace(place);
                  }}
                  placeholder="City, ST"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Destination (To)</label>
                <PlacesAutocomplete
                  value={formData.destination}
                  onChange={(value) => {
                    setFormData({ ...formData, destination: value });
                    if (!value) setDestinationPlace(null); // Clear place when input is cleared
                  }}
                  onPlaceSelect={(place) => {
                    setDestinationPlace(place);
                  }}
                  placeholder="City, ST"
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            {/* Financials */}
            <div className="col-span-2 space-y-4">
               <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Financials</h3>
               <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gross ($)</label>
                  <input
                    required
                    name="gross"
                    type="number"
                    step="0.01"
                    value={formData.gross}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Miles</label>
                  <div className="relative">
                    <input
                      required
                      name="miles"
                      type="number"
                      min="0"
                      value={formData.miles}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0"
                    />
                    {calculatingDistance && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>
               </div>
            </div>

            {/* Fleet & Dispatch */}
            <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dispatcher</label>
                  <select
                    name="dispatcher"
                    required
                    value={formData.dispatcher}
                    onChange={handleChange}
                    // Disable changing dispatcher if you are a dispatcher
                    disabled={currentUser.role === 'dispatcher'} 
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 dark:disabled:bg-slate-600 disabled:text-slate-500"
                  >
                    <option value="">Select...</option>
                    {dispatchers.map(d => {
                      // For owners: show "Dispatch Company Name - Dispatcher Name" if inviter is dispatch company
                      // Otherwise just show dispatcher name
                      let displayName = d.name;
                      if (currentUser.role === 'owner' && d.inviterName) {
                        displayName = `${d.inviterName} - ${d.name}`;
                      }
                      return (
                        <option key={d.id} value={d.name}>{displayName}</option>
                      );
                    })}
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Driver</label>
                  <select
                    name="driverId"
                    value={formData.driverId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Select Driver...</option>
                    {availableDrivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
               </div>
            </div>

            {/* Rate Confirmation PDF */}
            <div className="col-span-2 space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Rate Confirmation PDF
              </label>
              {pdfPreview ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {pdfFile?.name || 'Rate Confirmation PDF'}
                    </p>
                    <a
                      href={pdfPreview}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View PDF
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-slate-400 dark:text-slate-500" />
                      <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">PDF (MAX. 10MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="application/pdf"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              )}
              {uploadingPdf && (
                <p className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">Uploading PDF...</p>
              )}
            </div>

            {/* Status */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select
                name="status"
                required
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="Not yet Factored">Not yet Factored</option>
                <option value="Factored">Factored</option>
              </select>
            </div>

            {/* Driver Payout Status - Only visible to owners */}
            {currentUser.role === 'owner' && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Driver Payout Status</label>
                <select
                  name="driverPayoutStatus"
                  value={formData.driverPayoutStatus}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            )}
            
            {/* Live Preview Card - Only visible to owners */}
            {currentUser.role === 'owner' && (
              <div className="col-span-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                    <Calculator size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase">Estimated Driver Pay</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {selectedDriver 
                        ? `${driverPayPercentage}% of ${driverPayType === 'percentage_of_gross' ? 'Gross' : '(Gross - Dispatch Fee)'}`
                        : '50% of (Gross - Dispatch Fee)'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                    ${driverPay > 0 ? driverPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Dispatch Fee: ${dispatchFee.toFixed(2)}</p>
                </div>
              </div>
            )}

          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              {isEditMode ? 'Update Load' : 'Save Load'}
            </button>
          </div>
        </form>
      </div>

      {/* Error Modal */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 flex justify-between items-center border-b border-red-100 dark:border-red-800/30">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
                <AlertCircle size={20} className="text-red-600" />
                <h2 className="font-bold text-lg dark:text-red-300">Upload Error</h2>
              </div>
              <button 
                onClick={() => setErrorModal({ isOpen: false, message: '' })} 
                className="text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-slate-700 dark:text-slate-300 mb-6">{errorModal.message}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setErrorModal({ isOpen: false, message: '' })}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};