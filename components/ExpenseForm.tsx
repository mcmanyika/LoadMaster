import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, UserProfile, Transporter, Driver, Load, PaymentMethod, PaymentStatus, RecurringFrequency } from '../types';
import { X, Upload, FileText, AlertCircle, Receipt } from 'lucide-react';
import { getExpenseCategories } from '../services/expenseService';
import { getTransporters, getLoads } from '../services/loadService';
import { getCompanyDrivers } from '../services/driverAssociationService';
import { supabase } from '../services/supabaseClient';
import { uploadExpenseReceipt } from '../services/storageService';

interface ExpenseFormProps {
  onClose: () => void;
  onSave: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'category' | 'vehicleName' | 'driverName' | 'loadCompany'>) => void;
  currentUser: UserProfile;
  expenseToEdit?: Expense;
  companyId: string;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onClose, onSave, currentUser, expenseToEdit, companyId }) => {
  const isEditMode = !!expenseToEdit;
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(expenseToEdit?.receiptUrl || null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

  const [formData, setFormData] = useState({
    categoryId: expenseToEdit?.categoryId || '',
    amount: expenseToEdit?.amount.toString() || '',
    description: expenseToEdit?.description || '',
    expenseDate: expenseToEdit?.expenseDate || new Date().toISOString().split('T')[0],
    vendor: expenseToEdit?.vendor || '',
    vehicleId: expenseToEdit?.vehicleId || '',
    driverId: expenseToEdit?.driverId || '',
    loadId: expenseToEdit?.loadId || '',
    paymentMethod: expenseToEdit?.paymentMethod || 'credit_card' as PaymentMethod,
    paymentStatus: expenseToEdit?.paymentStatus || 'paid' as PaymentStatus,
    recurringFrequency: expenseToEdit?.recurringFrequency || '' as RecurringFrequency | '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // For dispatchers, filter loads by their name and company
        // For owners, filter by company only
        const dispatcherName = currentUser?.role === 'dispatcher' ? currentUser.name : undefined;
        const [cats, trans, lds] = await Promise.all([
          getExpenseCategories(),
          getTransporters(),
          getLoads(companyId, dispatcherName)
        ]);
        
        // Fetch drivers from associations to avoid duplicates
        const driverAssociations = await getCompanyDrivers(companyId);
        const activeDriverAssociations = driverAssociations.filter(a => a.status === 'active' && a.driverId && a.driver);
        
        // Get unique drivers by profile_id and fetch/create driver records
        const profileIdSet = new Set<string>();
        const driversData: Driver[] = [];
        
        for (const association of activeDriverAssociations) {
          if (!association.driverId || !association.driver) continue;
          
          const profileId = association.driverId;
          // Skip if we've already processed this profile
          if (profileIdSet.has(profileId)) continue;
          profileIdSet.add(profileId);
          
          // Check if driver record exists
          const { data: existingDriver } = await supabase
            .from('drivers')
            .select('id, name, phone, email, transporter_id, company_id')
            .eq('profile_id', profileId)
            .eq('company_id', companyId)
            .maybeSingle();
          
          if (existingDriver) {
            driversData.push({
              id: existingDriver.id,
              name: existingDriver.name,
              email: existingDriver.email || association.driver.email || '',
              phone: existingDriver.phone || association.driver.phone || '',
              transporterId: existingDriver.transporter_id || '',
              companyId: existingDriver.company_id
            });
          } else {
            // Create driver record if it doesn't exist
            const { data: newDriver } = await supabase
              .from('drivers')
              .insert([{
                name: association.driver.name || association.driver.email || 'Unknown',
                phone: association.driver.phone || null,
                email: association.driver.email || null,
                profile_id: profileId,
                company_id: companyId,
                transporter_id: null
              }])
              .select('id, name, phone, email, transporter_id, company_id')
              .single();
            
            if (newDriver) {
              driversData.push({
                id: newDriver.id,
                name: newDriver.name,
                email: newDriver.email || association.driver.email || '',
                phone: newDriver.phone || association.driver.phone || '',
                transporterId: newDriver.transporter_id || '',
                companyId: newDriver.company_id
              });
            }
          }
        }
        
        // Deduplicate by name as well (in case of any remaining duplicates)
        const driversByName = new Map<string, Driver>();
        driversData.forEach(driver => {
          const key = driver.name.toLowerCase().trim();
          if (!driversByName.has(key)) {
            driversByName.set(key, driver);
          }
        });
        const finalDrivers = Array.from(driversByName.values());
        
        setCategories(cats);
        setTransporters(trans);
        setDrivers(finalDrivers);
        setLoads(lds);
      } catch (error) {
        console.error('Error fetching form data:', error);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchData();
  }, [companyId, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Accept PDF and images
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setErrorModal({ isOpen: true, message: 'Please upload a PDF or image file (JPG, PNG, WebP)' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setErrorModal({ isOpen: true, message: 'File size must be less than 10MB' });
        return;
      }
      setReceiptFile(file);
      // Create preview URL
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    if (receiptPreview && receiptPreview.startsWith('blob:')) {
      URL.revokeObjectURL(receiptPreview);
    }
    setReceiptPreview(expenseToEdit?.receiptUrl || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let receiptUrl = expenseToEdit?.receiptUrl || null;

    // Upload receipt if a new file was selected
    if (receiptFile) {
      setUploadingReceipt(true);
      try {
        const tempId = expenseToEdit?.id || `temp-${Date.now()}`;
        const uploadResult = await uploadExpenseReceipt(receiptFile, tempId);
        
        if (uploadResult.error) {
          const errorMessage = uploadResult.error.message || 'Unknown error';
          console.error('Receipt upload error:', uploadResult.error);
          setErrorModal({ isOpen: true, message: `Failed to upload receipt: ${errorMessage}` });
          setUploadingReceipt(false);
          return;
        }
        
        receiptUrl = uploadResult.url;
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        console.error('Error uploading receipt:', error);
        setErrorModal({ isOpen: true, message: `Failed to upload receipt: ${errorMessage}` });
        setUploadingReceipt(false);
        return;
      } finally {
        setUploadingReceipt(false);
      }
    }

    const expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'category' | 'vehicleName' | 'driverName' | 'loadCompany'> = {
      companyId,
      categoryId: formData.categoryId,
      amount: parseFloat(formData.amount) || 0,
      description: formData.description,
      expenseDate: formData.expenseDate,
      vendor: formData.vendor,
      receiptUrl: receiptUrl || undefined,
      vehicleId: formData.vehicleId || undefined,
      driverId: formData.driverId || undefined,
      loadId: formData.loadId || undefined,
      paymentMethod: formData.paymentMethod,
      paymentStatus: formData.paymentStatus,
      recurringFrequency: formData.recurringFrequency || undefined,
      createdBy: currentUser.id,
    };

    onSave(expenseData);
  };

  if (loadingOptions) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl p-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const selectedCategory = categories.find(c => c.id === formData.categoryId);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {isEditMode ? 'Edit Expense' : 'Add New Expense'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Track your operational expenses</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="categoryId"
                required
                value={formData.categoryId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Select Category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {selectedCategory && selectedCategory.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{selectedCategory.description}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Amount ($) <span className="text-red-500">*</span>
              </label>
              <input
                required
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="0.00"
              />
            </div>

            {/* Expense Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Expense Date <span className="text-red-500">*</span>
              </label>
              <input
                required
                name="expenseDate"
                type="date"
                value={formData.expenseDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vendor</label>
              <input
                name="vendor"
                type="text"
                value={formData.vendor}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Vendor name"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                placeholder="Additional details about this expense..."
              />
            </div>

            {/* Vehicle/Transporter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vehicle (Optional)</label>
              <select
                name="vehicleId"
                value={formData.vehicleId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Select Vehicle...</option>
                {transporters.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Driver */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Driver (Optional)</label>
              <select
                name="driverId"
                value={formData.driverId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Select Driver...</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Load */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Load (Optional)</label>
              <select
                name="loadId"
                value={formData.loadId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="">Select Load...</option>
                {loads.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.company} - {l.origin} to {l.destination} ({new Date(l.dropDate).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="credit_card">Credit Card</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="ach">ACH</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Status</label>
              <select
                name="paymentStatus"
                value={formData.paymentStatus}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="recurring">Recurring</option>
              </select>
            </div>

            {/* Recurring Frequency */}
            {formData.paymentStatus === 'recurring' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Recurring Frequency</label>
                <select
                  name="recurringFrequency"
                  value={formData.recurringFrequency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="">Select Frequency...</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}

            {/* Receipt Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Receipt (Optional)</label>
              {receiptPreview ? (
                <div className="border border-slate-300 dark:border-slate-600 rounded-lg p-4 bg-white dark:bg-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <FileText size={16} />
                      <span>Receipt uploaded</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={receiptPreview}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        onClick={handleRemoveReceipt}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-white dark:bg-slate-700">
                  <input
                    type="file"
                    id="receipt-upload"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="receipt-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">PDF, JPG, PNG, WebP (max 10MB)</span>
                  </label>
                </div>
              )}
              {uploadingReceipt && (
                <p className="text-xs text-blue-600 dark:text-blue-400 animate-pulse mt-2">Uploading receipt...</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadingReceipt}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditMode ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
        </div>

        {/* Error Modal */}
        {errorModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 flex justify-between items-center border-b border-red-100 dark:border-red-900/30">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
                  <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                  <h2 className="font-bold text-lg">Error</h2>
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
    </div>
  );
};

