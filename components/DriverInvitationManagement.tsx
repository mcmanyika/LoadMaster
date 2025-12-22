import React, { useState, useEffect } from 'react';
import { UserProfile, DriverCompanyAssociation, Company } from '../types';
import { 
  generateDriverInviteCode,
  joinCompanyByDriverCode,
  getDriverInviteCodeDetails,
  revokeDriverInviteCode,
  getCompanyDrivers,
  getUnusedDriverInviteCodes,
  removeDriver
} from '../services/driverAssociationService';
import { formatInviteCode, normalizeInviteCode, validateInviteCodeFormat } from '../services/inviteCodeService';
import { ErrorModal } from './ErrorModal';
import { ConfirmModal } from './ConfirmModal';
import { Mail, X, Check, Users, Clock, AlertCircle, Trash2, Copy, Key, Building2, Edit2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { updateDriver, getDrivers, getTransporters } from '../services/loadService';
import { Driver, Transporter } from '../types';
import { Truck } from 'lucide-react';

interface DriverInvitationManagementProps {
  user: UserProfile;
  companyId?: string;
  onUpdate?: () => void;
}

export const DriverInvitationManagement: React.FC<DriverInvitationManagementProps> = ({
  user,
  companyId,
  onUpdate
}) => {
  const isOwner = user.role === 'owner';
  const isDispatchCompany = user.role === 'dispatch_company';
  const canManageDrivers = isOwner || isDispatchCompany;
  const [unusedCodes, setUnusedCodes] = useState<DriverCompanyAssociation[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<DriverCompanyAssociation[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ expiresInDays: '30' });
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  
  // Driver view state
  const [codeInput, setCodeInput] = useState('');
  const [codePreview, setCodePreview] = useState<{ company?: Company; expiresAt?: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Driver edit state
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [editDriverForm, setEditDriverForm] = useState({
    payType: 'percentage_of_net' as 'percentage_of_gross' | 'percentage_of_net',
    payPercentage: '50',
    transporterId: '' as string
  });
  const [transporters, setTransporters] = useState<Transporter[]>([]);

  useEffect(() => {
    if (canManageDrivers && companyId) {
      loadOwnerData();
      loadTransporters();
    }
  }, [user, companyId]);

  const loadTransporters = async () => {
    if (!companyId) return;
    try {
      const transportersData = await getTransporters(companyId);
      setTransporters(transportersData);
    } catch (error) {
      console.error('Error loading transporters:', error);
    }
  };

  const loadOwnerData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [driversFromAssociations, codes] = await Promise.all([
        getCompanyDrivers(companyId),
        getUnusedDriverInviteCodes(companyId)
      ]);
      
      // Also fetch manually created drivers from the drivers table
      let manuallyCreatedDrivers: DriverCompanyAssociation[] = [];
      try {
        const { data: driversData, error: driversError } = await supabase
          .from('drivers')
          .select('*')
          .eq('company_id', companyId);
        
        if (!driversError && driversData) {
          // Convert manually created drivers to DriverCompanyAssociation format
          manuallyCreatedDrivers = driversData.map((d: any) => ({
            id: `manual-${d.id}`, // Use a prefix to distinguish from associations
            driverId: d.profile_id || d.id, // Use profile_id if available, otherwise driver table id
            companyId: d.company_id,
            status: 'active' as const,
            joinedAt: d.created_at || new Date().toISOString(),
            createdAt: d.created_at || new Date().toISOString(),
            updatedAt: d.updated_at || new Date().toISOString(),
            driver: {
              id: d.profile_id || d.id,
              name: d.name,
              email: d.email || '',
              phone: d.phone || '',
              role: 'driver' as const,
              status: 'active' as const
            }
          }));
        }
      } catch (error) {
        console.error('Error fetching manually created drivers:', error);
        // Continue without manually created drivers if there's an error
      }
      
      // Combine drivers from associations and manually created ones
      // Filter out duplicates (if a driver exists in both, prefer the association version)
      const associationDriverIds = new Set(
        driversFromAssociations
          .filter(d => d.status === 'active' && d.driverId)
          .map(d => d.driverId)
      );
      
      // Also create a set of association driver emails and names for additional deduplication
      const associationDriverEmails = new Set(
        driversFromAssociations
          .filter(d => d.status === 'active' && d.driver?.email)
          .map(d => d.driver!.email!.toLowerCase().trim())
      );
      
      const associationDriverNames = new Set(
        driversFromAssociations
          .filter(d => d.status === 'active' && d.driver?.name)
          .map(d => d.driver!.name!.toLowerCase().trim())
      );
      
      // Deduplicate manually created drivers first (in case there are duplicates in the table)
      const seenManualDrivers = new Map<string, DriverCompanyAssociation>();
      manuallyCreatedDrivers.forEach(driver => {
        const key = driver.driver?.email 
          ? driver.driver.email.toLowerCase().trim()
          : driver.driver?.name?.toLowerCase().trim() || driver.id;
        
        if (!seenManualDrivers.has(key)) {
          seenManualDrivers.set(key, driver);
        }
      });
      const uniqueManualDriversList = Array.from(seenManualDrivers.values());
      
      // Only include manually created drivers that don't have an association
      // Check by driverId, email, and name to catch all duplicates
      const uniqueManualDrivers = uniqueManualDriversList.filter(d => {
        // Skip if driverId matches an association
        if (d.driverId && associationDriverIds.has(d.driverId)) {
          return false;
        }
        
        // Skip if email matches an association (and email exists)
        if (d.driver?.email) {
          const emailKey = d.driver.email.toLowerCase().trim();
          if (emailKey && associationDriverEmails.has(emailKey)) {
            return false;
          }
        }
        
        // Skip if name matches an association (and name exists, and no email to distinguish)
        if (d.driver?.name && !d.driver?.email) {
          const nameKey = d.driver.name.toLowerCase().trim();
          if (nameKey && associationDriverNames.has(nameKey)) {
            return false;
          }
        }
        
        return true;
      });
      
      const allActiveDrivers = [
        ...driversFromAssociations.filter(d => d.status === 'active' && d.driverId),
        ...uniqueManualDrivers
      ];
      
      setActiveDrivers(allActiveDrivers);
      setUnusedCodes(codes);
    } catch (error: any) {
      setErrorModal({ isOpen: true, message: error.message || 'Failed to load drivers' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setLoading(true);
    try {
      const result = await generateDriverInviteCode(
        companyId,
        parseInt(inviteForm.expiresInDays)
      );

      if (result.success && result.code) {
        setGeneratedCode(result.code);
        setInviteForm({ expiresInDays: '30' });
        await loadOwnerData();
        onUpdate?.();
      } else {
        setErrorModal({ isOpen: true, message: result.error || 'Failed to generate invite code' });
      }
    } catch (error: any) {
      setErrorModal({ isOpen: true, message: error.message || 'Failed to generate invite code' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      // Could show a toast notification here
    } catch (error) {
      setErrorModal({ isOpen: true, message: 'Failed to copy code to clipboard' });
    }
  };

  const handleCodeInputChange = async (value: string) => {
    setCodeInput(value);
    setCodePreview(null);
    
    const normalized = normalizeInviteCode(value);
    if (normalized.length === 8 && validateInviteCodeFormat(normalized)) {
      setPreviewLoading(true);
      try {
        const result = await getDriverInviteCodeDetails(normalized);
        if (result.success) {
          setCodePreview({
            company: result.company,
            expiresAt: result.expiresAt
          });
        } else {
          setCodePreview(null);
        }
      } catch (error) {
        setCodePreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const handleJoinByCode = async () => {
    if (!codeInput) return;

    setLoading(true);
    try {
      const result = await joinCompanyByDriverCode(codeInput);
      if (result.success) {
        setCodeInput('');
        setCodePreview(null);
        onUpdate?.();
        // Show success message
        setErrorModal({ isOpen: true, message: `Successfully joined ${result.association?.company?.name || 'company'}!` });
      } else {
        setErrorModal({ isOpen: true, message: result.error || 'Failed to join company' });
      }
    } catch (error: any) {
      setErrorModal({ isOpen: true, message: error.message || 'Failed to join company' });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeCode = (associationId: string) => {
    setConfirmModal({
      isOpen: true,
      message: 'Are you sure you want to revoke this invite code?',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} });
        setLoading(true);
        try {
          const result = await revokeDriverInviteCode(associationId);
          if (result.success) {
            await loadOwnerData();
            onUpdate?.();
          } else {
            setErrorModal({ isOpen: true, message: result.error || 'Failed to revoke invite code' });
          }
        } catch (error: any) {
          setErrorModal({ isOpen: true, message: error.message || 'Failed to revoke invite code' });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleRemove = (associationId: string) => {
    setConfirmModal({
      isOpen: true,
      message: 'Are you sure you want to remove this driver from your company?',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} });
        setLoading(true);
        try {
          // Check if this is a manually created driver (has 'manual-' prefix)
          if (associationId.startsWith('manual-')) {
            const driverId = associationId.replace('manual-', '');
            
            // First, set driver_id to NULL in all loads that reference this driver
            // This prevents foreign key constraint violations
            const { error: updateError } = await supabase
              .from('loads')
              .update({ driver_id: null })
              .eq('driver_id', driverId);
            
            if (updateError) {
              setErrorModal({ isOpen: true, message: updateError.message || 'Failed to update related loads' });
              setLoading(false);
              return;
            }
            
            // Now delete the driver
            const { error } = await supabase
              .from('drivers')
              .delete()
              .eq('id', driverId);
            
            if (error) {
              setErrorModal({ isOpen: true, message: error.message || 'Failed to remove driver' });
            } else {
              await loadOwnerData();
              onUpdate?.();
            }
          } else {
            // Handle association-based driver
            const result = await removeDriver(associationId);
            if (result.success) {
              await loadOwnerData();
              onUpdate?.();
            } else {
              setErrorModal({ isOpen: true, message: result.error || 'Failed to remove driver' });
            }
          }
        } catch (error: any) {
          setErrorModal({ isOpen: true, message: error.message || 'Failed to remove driver' });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  if (canManageDrivers && !companyId) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <p className="text-slate-500 dark:text-slate-400">Please set up your company first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />

      {canManageDrivers ? (
        <>
          {/* Generate Invite Code Form */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-end mb-4">
              {!showInviteForm && (
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  <Key size={18} />
                  Generate Code
                </button>
              )}
            </div>
            {showInviteForm && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <Key size={20} />
                  Generate Invite Code
                </h3>
              </div>
            )}

            {showInviteForm && (
              <form onSubmit={handleGenerateCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Expires In (Days)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="365"
                    value={inviteForm.expiresInDays}
                    onChange={(e) => setInviteForm({ ...inviteForm, expiresInDays: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder="30"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Generate Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteForm(false);
                      setInviteForm({ expiresInDays: '30' });
                      setGeneratedCode(null);
                    }}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Generated Code Display */}
            {generatedCode && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Generated Invite Code</p>
                  <button
                    onClick={() => setGeneratedCode(null)}
                    className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <code className="flex-1 px-4 py-3 bg-white dark:bg-slate-700 border border-green-300 dark:border-green-900/30 rounded-lg text-2xl font-mono font-bold text-green-900 dark:text-green-300 text-center">
                    {formatInviteCode(generatedCode, 'dashed')}
                  </code>
                  <button
                    onClick={() => handleCopyCode(formatInviteCode(generatedCode, 'dashed'))}
                    className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    title="Copy to clipboard"
                  >
                    <Copy size={18} />
                    Copy
                  </button>
                </div>
                <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                  Share this code with drivers. They can use it to join your company.
                </p>
              </div>
            )}
          </div>

          {/* Unused Invite Codes */}
          {unusedCodes.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Clock size={20} className="text-amber-500" />
                Active Invite Codes ({unusedCodes.length})
              </h3>
              <div className="space-y-3">
                {unusedCodes.map((code) => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="px-3 py-1 bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-900/30 rounded text-lg font-mono font-bold text-amber-900 dark:text-amber-300">
                          {formatInviteCode(code.inviteCode || '', 'dashed')}
                        </code>
                        <button
                          onClick={() => handleCopyCode(formatInviteCode(code.inviteCode || '', 'dashed'))}
                          className="p-1 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded transition-colors"
                          title="Copy code"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                      {code.expiresAt && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Expires: {new Date(code.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRevokeCode(code.id)}
                      className="px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors text-sm font-medium"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Drivers */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Users size={20} className="text-green-500" />
              Active Drivers ({activeDrivers.length})
            </h3>
            {activeDrivers.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No active drivers</p>
            ) : (
              <div className="space-y-3">
                {activeDrivers.map((association) => (
                  <div
                    key={association.id}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {association.driver?.name || association.driver?.email || 'Unknown'}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {association.driver?.email}
                      </p>
                      {association.driver?.phone && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {association.driver.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {canManageDrivers && association.id.startsWith('manual-') && (
                        <button
                          onClick={async () => {
                            const driverId = association.id.replace('manual-', '');
                            // Fetch driver to get current pay config
                            const drivers = await getDrivers(companyId);
                            const driver = drivers.find(d => d.id === driverId);
                            if (driver) {
                              setEditingDriverId(driverId);
                              setEditDriverForm({
                                payType: driver.payType || 'percentage_of_net',
                                payPercentage: (driver.payPercentage || 50).toString(),
                                transporterId: driver.transporterId || ''
                              });
                            }
                          }}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                          title="Edit pay configuration"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(association.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Remove driver"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Edit Driver Pay Configuration Modal */}
          {editingDriverId && (
            <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Edit Driver Settings</h3>
                  <button
                    onClick={() => {
                      setEditingDriverId(null);
                      setEditDriverForm({ payType: 'percentage_of_net', payPercentage: '50', transporterId: '' });
                    }}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      <Truck size={16} className="inline mr-2" />
                      Assign to Vehicle
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      value={editDriverForm.transporterId}
                      onChange={e => setEditDriverForm({ ...editDriverForm, transporterId: e.target.value })}
                    >
                      <option value="">No Vehicle (Unassigned)</option>
                      {transporters.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.registrationNumber ? `(${t.registrationNumber})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Select a vehicle to assign this driver to, or leave unassigned.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Pay Calculation Method
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      value={editDriverForm.payType}
                      onChange={e => setEditDriverForm({ ...editDriverForm, payType: e.target.value as 'percentage_of_gross' | 'percentage_of_net' })}
                    >
                      <option value="percentage_of_net">% of (Gross - Dispatch Fee)</option>
                      <option value="percentage_of_gross">% of Gross</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Pay Percentage (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      value={editDriverForm.payPercentage}
                      onChange={e => setEditDriverForm({ ...editDriverForm, payPercentage: e.target.value })}
                      placeholder="50"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {editDriverForm.payType === 'percentage_of_gross' 
                        ? 'Percentage of total gross revenue per load. Owner covers all expenses (gas, etc.).'
                        : 'Percentage of (Gross - Dispatch Fee) per load. Gas expenses shared 50-50.'}
                    </p>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={async () => {
                        try {
                          const payPercentage = parseFloat(editDriverForm.payPercentage) || 50;
                          if (payPercentage < 0 || payPercentage > 100) {
                            setErrorModal({ isOpen: true, message: 'Pay percentage must be between 0 and 100' });
                            return;
                          }
                          
                          await updateDriver(editingDriverId, {
                            payType: editDriverForm.payType,
                            payPercentage: payPercentage,
                            transporterId: editDriverForm.transporterId || undefined
                          });
                          
                          setEditingDriverId(null);
                          setEditDriverForm({ payType: 'percentage_of_net', payPercentage: '50', transporterId: '' });
                          await loadOwnerData();
                          onUpdate?.();
                        } catch (error: any) {
                          setErrorModal({ isOpen: true, message: error.message || 'Failed to update driver pay configuration' });
                        }
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingDriverId(null);
                        setEditDriverForm({ payType: 'percentage_of_net', payPercentage: '50', transporterId: '' });
                      }}
                      className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Driver View - Enter Invite Code */
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Key size={20} className="text-blue-500" />
            Join Company with Invite Code
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Enter Invite Code
              </label>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => handleCodeInputChange(e.target.value)}
                placeholder="XXXX-XXXX"
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-xl font-mono tracking-wider uppercase bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                maxLength={9} // XXXX-XXXX format
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter the 8-character code provided by the company owner
              </p>
            </div>

            {/* Code Preview */}
            {previewLoading && (
              <div className="p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-center">
                <p className="text-slate-600 dark:text-slate-400">Checking code...</p>
              </div>
            )}

            {codePreview && !previewLoading && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={18} className="text-blue-600 dark:text-blue-400" />
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {codePreview.company?.name || 'Unknown Company'}
                  </p>
                </div>
                {codePreview.expiresAt && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Expires: {new Date(codePreview.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* Show warning if code format is valid but preview failed to load */}
            {!previewLoading && !codePreview && codeInput && validateInviteCodeFormat(normalizeInviteCode(codeInput)) && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <AlertCircle size={16} className="inline mr-1" />
                  Code format is valid, but couldn't find this code. You can still try to join - you'll get an error if the code is invalid.
                </p>
              </div>
            )}

            <button
              onClick={handleJoinByCode}
              disabled={loading || !codeInput || !validateInviteCodeFormat(normalizeInviteCode(codeInput)) || previewLoading}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>Joining...</>
              ) : (
                <>
                  <Check size={18} />
                  Join Company
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        title="Confirm Action"
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })}
      />
    </div>
  );
};

