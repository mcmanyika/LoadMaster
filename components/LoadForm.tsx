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
          }
          
          // Fetch dispatchers from dispatch company's own company (or owner's company for others)
          const dispatchersData = await getDispatchers(dispatcherCompanyId);
          setDispatchers(dispatchersData);
          
          // Fetch drivers from owner's company (for dispatch companies) or regular company
          let driversData = await getDrivers(driverCompanyId);
          
          // For dispatch companies: filter drivers to only those assigned to loads dispatched by their dispatchers
          if (currentUser?.role === 'dispatch_company' && dispatchersData.length > 0) {
            const dispatcherNames = dispatchersData.map(d => d.name).filter(Boolean);
            if (dispatcherNames.length > 0) {
              // Get loads dispatched by this dispatch company's dispatchers
              const loadsDispatchedByCompany = await getLoads(driverCompanyId, undefined, dispatcherNames);
              
              // Get unique driver IDs from those loads
              const assignedDriverIds = new Set<string>();
              loadsDispatchedByCompany.forEach(load => {
                if (load.driverId) {
                  assignedDriverIds.add(load.driverId);
                }
              });
              
              // Filter drivers to only those assigned to loads
              driversData = driversData.filter(driver => assignedDriverIds.has(driver.id));
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
                  .select('id, name, phone, email, transporter_id, company_id, profile_id')
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
                    companyId: loadDriver.company_id
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
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{isEditMode ? 'Edit Load' : 'Add New Load'}</h2>
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
                    {dispatchers.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
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