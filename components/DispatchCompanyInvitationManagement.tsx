import React, { useState, useEffect } from 'react';
import { UserProfile, DispatcherCompanyAssociation, Company } from '../types';
import { 
  generateInviteCode,
  getUnusedInviteCodes,
  revokeInviteCode,
  joinCompanyByCode,
  getInviteCodeDetails
} from '../services/dispatcherAssociationService';
import { formatInviteCode, normalizeInviteCode, validateInviteCodeFormat } from '../services/inviteCodeService';
import { ErrorModal } from './ErrorModal';
import { ConfirmModal } from './ConfirmModal';
import { Key, Copy, Clock, X, Building2, Check, AlertCircle } from 'lucide-react';

interface DispatchCompanyInvitationManagementProps {
  user: UserProfile;
  companyId?: string;
  onUpdate?: () => void;
}

export const DispatchCompanyInvitationManagement: React.FC<DispatchCompanyInvitationManagementProps> = ({
  user,
  companyId,
  onUpdate
}) => {
  const isOwner = user.role === 'owner';
  const isDispatchCompany = user.role === 'dispatch_company';
  const [unusedCodes, setUnusedCodes] = useState<DispatcherCompanyAssociation[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({ isOpen: false, message: '', onConfirm: () => {} });
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ expiresInDays: '30' });
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  
  // Dispatch company view state - for entering invite codes
  const [codeInput, setCodeInput] = useState('');
  const [codePreview, setCodePreview] = useState<{ company?: Company; feePercentage?: number; expiresAt?: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (isOwner && companyId) {
      loadCodes();
    }
  }, [user, companyId, isOwner]);

  const loadCodes = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const codes = await getUnusedInviteCodes(companyId);
      setUnusedCodes(codes);
    } catch (error: any) {
      setErrorModal({ isOpen: true, message: error.message || 'Failed to load invite codes' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setLoading(true);
    try {
      // Generate code with 0% fee for dispatch companies (they set their own fees)
      const result = await generateInviteCode(
        companyId,
        0, // Fee percentage - dispatch companies set their own
        parseInt(inviteForm.expiresInDays)
      );

      if (result.success && result.code) {
        setGeneratedCode(result.code);
        setInviteForm({ expiresInDays: '30' });
        await loadCodes();
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
    } catch (error) {
      setErrorModal({ isOpen: true, message: 'Failed to copy code to clipboard' });
    }
  };

  const handleRevokeCode = (codeId: string) => {
    setConfirmModal({
      isOpen: true,
      message: 'Are you sure you want to revoke this invite code?',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, message: '', onConfirm: () => {} });
        setLoading(true);
        try {
          const result = await revokeInviteCode(codeId);
          if (result.success) {
            await loadCodes();
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

  // Only show for owners and dispatch companies
  if (!isOwner && !isDispatchCompany) {
    return null;
  }

  // Handle code input change for dispatch companies
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

  if (isOwner && !companyId) {
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

      {isOwner ? (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Building2 size={20} />
                Invite Dispatch Company
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
                  Share this code with dispatch companies. They can use it to join your network.
                </p>
              </div>
            )}
          </div>

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
        </>
      ) : (
        /* Dispatch Company View - Enter Invite Code */
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Key size={20} className="text-blue-500" />
            Join Owner Company with Invite Code
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
                Enter the 8-character code provided by the company owner
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
                {codePreview.feePercentage !== undefined && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Fee: {codePreview.feePercentage}%
                  </p>
                )}
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
      )}
    </div>
  );
};

