import React, { useState, useEffect } from 'react';
import { UserProfile, DispatcherCompanyAssociation, Company } from '../types';
import { 
  generateInviteCode,
  joinCompanyByCode,
  getInviteCodeDetails,
  revokeInviteCode,
  getCompanyDispatchers,
  getUnusedInviteCodes,
  updateAssociationFee,
  removeDispatcher
} from '../services/dispatcherAssociationService';
import { formatInviteCode, normalizeInviteCode, validateInviteCodeFormat } from '../services/inviteCodeService';
import { ErrorModal } from './ErrorModal';
import { ConfirmModal } from './ConfirmModal';
import { Mail, X, Check, DollarSign, Users, Clock, AlertCircle, Edit2, Trash2, Copy, Key, Building2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface InvitationManagementProps {
  user: UserProfile;
  companyId?: string;
  onUpdate?: () => void;
}

export const InvitationManagement: React.FC<InvitationManagementProps> = ({
  user,
  companyId,
  onUpdate
}) => {
  const isOwner = user.role === 'owner';
  const isDispatchCompany = user.role === 'dispatch_company';
  const isDispatcher = user.role === 'dispatcher';
  // Only dispatch companies can invite dispatchers (not owners)
  const canInviteDispatchers = isDispatchCompany;
  // Owners and dispatch companies can view dispatchers list
  const canViewDispatchers = isOwner || isDispatchCompany;
  const [unusedCodes, setUnusedCodes] = useState<DispatcherCompanyAssociation[]>([]);
  const [activeDispatchers, setActiveDispatchers] = useState<DispatcherCompanyAssociation[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ feePercentage: '12', expiresInDays: '30' });
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [editingFee, setEditingFee] = useState<string | null>(null);
  const [editFeeValue, setEditFeeValue] = useState('');
  
  // Dispatcher view state
  const [codeInput, setCodeInput] = useState('');
  const [codePreview, setCodePreview] = useState<{ company?: Company; feePercentage?: number; expiresAt?: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (canViewDispatchers && companyId) {
      loadOwnerData();
    }
  }, [user, companyId, canViewDispatchers]);

  const loadOwnerData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [dispatchersFromAssociations, codes] = await Promise.all([
        getCompanyDispatchers(companyId),
        getUnusedInviteCodes(companyId)
      ]);
      
      // Also fetch manually created dispatchers from the dispatchers table
      let manuallyCreatedDispatchers: DispatcherCompanyAssociation[] = [];
      try {
        const { data: dispatchersData, error: dispatchersError } = await supabase
          .from('dispatchers')
          .select('*')
          .eq('company_id', companyId);
        
        if (!dispatchersError && dispatchersData) {
          // Convert manually created dispatchers to DispatcherCompanyAssociation format
          manuallyCreatedDispatchers = dispatchersData.map((d: any) => ({
            id: `manual-${d.id}`, // Use a prefix to distinguish from associations
            dispatcherId: d.profile_id || d.id, // Use profile_id if available, otherwise dispatcher table id
            companyId: d.company_id,
            feePercentage: d.fee_percentage || 12,
            status: 'active' as const,
            joinedAt: d.created_at || new Date().toISOString(),
            createdAt: d.created_at || new Date().toISOString(),
            updatedAt: d.updated_at || new Date().toISOString(),
            dispatcher: {
              id: d.profile_id || d.id,
              name: d.name,
              email: d.email || '',
              phone: d.phone || '',
              role: 'dispatcher' as const,
              status: 'active' as const
            }
          }));
        }
      } catch (error) {
        console.error('Error fetching manually created dispatchers:', error);
        // Continue without manually created dispatchers if there's an error
      }
      
      // Combine dispatchers from associations and manually created ones
      // Filter out duplicates (if a dispatcher exists in both, prefer the association version)
      const associationDispatcherIds = new Set(
        dispatchersFromAssociations
          .filter(d => d.status === 'active' && d.dispatcherId)
          .map(d => d.dispatcherId)
      );
      
      // Also create a set of association dispatcher emails and names for additional deduplication
      const associationDispatcherEmails = new Set(
        dispatchersFromAssociations
          .filter(d => d.status === 'active' && d.dispatcher?.email)
          .map(d => d.dispatcher!.email!.toLowerCase().trim())
      );
      
      const associationDispatcherNames = new Set(
        dispatchersFromAssociations
          .filter(d => d.status === 'active' && d.dispatcher?.name)
          .map(d => d.dispatcher!.name!.toLowerCase().trim())
      );
      
      // Deduplicate manually created dispatchers first (in case there are duplicates in the table)
      const seenManualDispatchers = new Map<string, DispatcherCompanyAssociation>();
      manuallyCreatedDispatchers.forEach(dispatcher => {
        const key = dispatcher.dispatcher?.email 
          ? dispatcher.dispatcher.email.toLowerCase().trim()
          : dispatcher.dispatcher?.name?.toLowerCase().trim() || dispatcher.id;
        
        if (!seenManualDispatchers.has(key)) {
          seenManualDispatchers.set(key, dispatcher);
        }
      });
      const uniqueManualDispatchersList = Array.from(seenManualDispatchers.values());
      
      // Only include manually created dispatchers that don't have an association
      // Check by dispatcherId, email, and name to catch all duplicates
      const uniqueManualDispatchers = uniqueManualDispatchersList.filter(d => {
        // Skip if dispatcherId matches an association
        if (d.dispatcherId && associationDispatcherIds.has(d.dispatcherId)) {
          return false;
        }
        
        // Skip if email matches an association (and email exists)
        if (d.dispatcher?.email) {
          const emailKey = d.dispatcher.email.toLowerCase().trim();
          if (emailKey && associationDispatcherEmails.has(emailKey)) {
            return false;
          }
        }
        
        // Skip if name matches an association (and name exists, and no email to distinguish)
        if (d.dispatcher?.name && !d.dispatcher?.email) {
          const nameKey = d.dispatcher.name.toLowerCase().trim();
          if (nameKey && associationDispatcherNames.has(nameKey)) {
            return false;
          }
        }
        
        return true;
      });
      
      const allActiveDispatchers = [
        ...dispatchersFromAssociations.filter(d => d.status === 'active' && d.dispatcherId),
        ...uniqueManualDispatchers
      ];
      
      setActiveDispatchers(allActiveDispatchers);
      setUnusedCodes(codes);
    } catch (error: any) {
      setErrorModal({ isOpen: true, message: error.message || 'Failed to load dispatchers' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setLoading(true);
    try {
      const result = await generateInviteCode(
        companyId,
        parseFloat(inviteForm.feePercentage),
        parseInt(inviteForm.expiresInDays)
      );

      if (result.success && result.code) {
        setGeneratedCode(result.code);
        setInviteForm({ feePercentage: '12', expiresInDays: '30' });
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
        const result = await getInviteCodeDetails(normalized);
        if (result.success) {
          setCodePreview({
            company: result.company,
            feePercentage: result.feePercentage,
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
      const result = await joinCompanyByCode(codeInput);
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
          const result = await revokeInviteCode(associationId);
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


  const handleUpdateFee = async (associationId: string) => {
    setLoading(true);
    try {
      // Check if this is a manually created dispatcher (has 'manual-' prefix)
      if (associationId.startsWith('manual-')) {
        const dispatcherId = associationId.replace('manual-', '');
        const { error } = await supabase
          .from('dispatchers')
          .update({ fee_percentage: parseFloat(editFeeValue) })
          .eq('id', dispatcherId);
        
        if (error) {
          setErrorModal({ isOpen: true, message: error.message || 'Failed to update fee' });
        } else {
          setEditingFee(null);
          setEditFeeValue('');
          await loadOwnerData();
          onUpdate?.();
        }
      } else {
        // Handle association-based dispatcher
        const result = await updateAssociationFee(associationId, parseFloat(editFeeValue));
        if (result.success) {
          setEditingFee(null);
          setEditFeeValue('');
          await loadOwnerData();
          onUpdate?.();
        } else {
          setErrorModal({ isOpen: true, message: result.error || 'Failed to update fee' });
        }
      }
    } catch (error: any) {
      setErrorModal({ isOpen: true, message: error.message || 'Failed to update fee' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (associationId: string) => {
    setConfirmModal({
      isOpen: true,
      message: 'Are you sure you want to remove this dispatcher from your company?',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} });
        setLoading(true);
        try {
          // Check if this is a manually created dispatcher (has 'manual-' prefix)
          if (associationId.startsWith('manual-')) {
            const dispatcherId = associationId.replace('manual-', '');
            const { error } = await supabase
              .from('dispatchers')
              .delete()
              .eq('id', dispatcherId);
            
            if (error) {
              setErrorModal({ isOpen: true, message: error.message || 'Failed to remove dispatcher' });
            } else {
              await loadOwnerData();
              onUpdate?.();
            }
          } else {
            // Handle association-based dispatcher
            const result = await removeDispatcher(associationId);
            if (result.success) {
              await loadOwnerData();
              onUpdate?.();
            } else {
              setErrorModal({ isOpen: true, message: result.error || 'Failed to remove dispatcher' });
            }
          }
        } catch (error: any) {
          setErrorModal({ isOpen: true, message: error.message || 'Failed to remove dispatcher' });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  if (canViewDispatchers && !companyId) {
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        title="Confirm Action"
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} })}
      />

      {canViewDispatchers ? (
        <>
          {/* Generate Invite Code Form - Only for dispatch companies */}
          {canInviteDispatchers && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Key size={20} />
                Generate Invite Code
              </h3>
              {!showInviteForm && (
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Key size={16} />
                  Generate Code
                </button>
              )}
            </div>

            {showInviteForm && (
              <form onSubmit={handleGenerateCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fee Percentage
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.01"
                    value={inviteForm.feePercentage}
                    onChange={(e) => setInviteForm({ ...inviteForm, feePercentage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="12.00"
                  />
                </div>
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
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
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
                      setInviteForm({ feePercentage: '12', expiresInDays: '30' });
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
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-lg">
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
                  <code className="flex-1 px-4 py-3 bg-white dark:bg-slate-700 border border-green-300 dark:border-green-700 rounded-lg text-2xl font-mono font-bold text-green-900 dark:text-green-300 text-center">
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
                  Share this code with dispatchers. They can use it to join your company.
                </p>
              </div>
            )}
          </div>
          )}

          {/* Unused Invite Codes - Only for dispatch companies */}
          {canInviteDispatchers && unusedCodes.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Clock size={20} className="text-amber-500" />
                Active Invite Codes ({unusedCodes.length})
              </h3>
              <div className="space-y-3">
                {unusedCodes.map((code) => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="px-3 py-1 bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-700 rounded text-lg font-mono font-bold text-amber-900 dark:text-amber-300">
                          {formatInviteCode(code.inviteCode || '', 'dashed')}
                        </code>
                        <button
                          onClick={() => handleCopyCode(formatInviteCode(code.inviteCode || '', 'dashed'))}
                          className="p-1 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded transition-colors"
                          title="Copy code"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Fee: {code.feePercentage}%
                      </p>
                      {code.expiresAt && (
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                          Expires: {new Date(code.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRevokeCode(code.id)}
                      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-sm font-medium"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Dispatchers */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Users size={20} className="text-green-500" />
              Active Dispatchers ({activeDispatchers.length})
            </h3>
            {activeDispatchers.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">No active dispatchers</p>
            ) : (
              <div className="space-y-3">
                {activeDispatchers.map((association) => (
                  <div
                    key={association.id}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {association.dispatcher?.name || association.dispatcher?.email || 'Unknown'}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {association.dispatcher?.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Only dispatch companies can edit fees and remove dispatchers */}
                      {canInviteDispatchers && editingFee === association.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={editFeeValue}
                            onChange={(e) => setEditFeeValue(e.target.value)}
                            className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            placeholder="12.00"
                          />
                          <button
                            onClick={() => handleUpdateFee(association.id)}
                            disabled={loading}
                            className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingFee(null);
                              setEditFeeValue('');
                            }}
                            className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {association.feePercentage}%
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Fee</p>
                          </div>
                          {canInviteDispatchers && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingFee(association.id);
                                  setEditFeeValue(association.feePercentage.toString());
                                }}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                title="Edit fee"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleRemove(association.id)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                title="Remove dispatcher"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : isDispatcher ? (
        /* Dispatcher View - Enter Invite Code */
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
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-center text-xl font-mono tracking-wider uppercase"
                maxLength={9} // XXXX-XXXX format
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter the 8-character code provided by the dispatch company
              </p>
            </div>

            {/* Code Preview */}
            {previewLoading && (
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-center">
                <p className="text-slate-600 dark:text-slate-400">Checking code...</p>
              </div>
            )}

            {codePreview && !previewLoading && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={18} className="text-blue-600 dark:text-blue-400" />
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {codePreview.company?.name || 'Unknown Company'}
                  </p>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Fee: {codePreview.feePercentage}%
                </p>
                {codePreview.expiresAt && (
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    Expires: {new Date(codePreview.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* Show warning if code format is valid but preview failed to load */}
            {!previewLoading && !codePreview && codeInput && validateInviteCodeFormat(normalizeInviteCode(codeInput)) && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
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
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <p className="text-slate-500 dark:text-slate-400">You don't have permission to view this section.</p>
        </div>
      )}
    </div>
  );
};

