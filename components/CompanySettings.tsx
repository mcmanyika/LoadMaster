import React, { useState, useEffect } from 'react';
import { UserProfile, Company } from '../types';
import { getCompany, createCompany, updateCompany, getOwnerEmail } from '../services/companyService';
import { getCurrentUser } from '../services/authService';
import { Building2, CheckCircle, AlertCircle, Loader, Mail } from 'lucide-react';

interface CompanySettingsProps {
  user: UserProfile;
  onCompanyCreated?: () => void;
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({ user, onCompanyCreated }) => {
  const isOwner = user.role === 'owner';
  const [company, setCompany] = useState<Company | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    fetchCompany();
  }, [user?.id, user?.role]);

  const fetchCompany = async () => {
    setLoading(true);
    setError(null);
    try {
      const companyData = await getCompany();
      setCompany(companyData);
      if (companyData) {
        setCompanyName(companyData.name);
        setIsEditing(false);
        
        // Fetch owner email for dispatchers
        if (!isOwner && companyData.ownerId) {
          const email = await getOwnerEmail(companyData.ownerId);
          setOwnerEmail(email);
        }
      } else {
        // Only show create form for owners
        if (isOwner) {
          setIsEditing(true);
        } else {
          // For dispatchers, show a helpful message
          setError('You are not currently assigned to a company. Please contact your administrator to be added to a company.');
        }
      }
    } catch (err: any) {
      console.error('Error fetching company:', err);
      if (isOwner) {
        setError('Failed to load company information');
      } else {
        setError('Failed to load company information. Please ensure you are assigned to a company.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!companyName.trim()) {
        throw new Error('Company name is required');
      }

      if (company) {
        // Update existing company
        const updated = await updateCompany(company.id, { name: companyName.trim() });
        setCompany(updated);
        setSuccess('Company updated successfully!');
        setIsEditing(false);
      } else {
        // Create new company
        if (!user.id) {
          throw new Error('User ID is missing');
        }
        const newCompany = await createCompany(companyName.trim(), user.id);
        console.log('Created company:', newCompany);
        
        // Immediately set the company state to prevent showing "no company" message
        setCompany(newCompany);
        setCompanyName(newCompany.name);
        setSuccess('Company created successfully!');
        setIsEditing(false);
        setError(null); // Clear any previous errors
        
        // Notify parent component to refresh user data
        if (onCompanyCreated) {
          await onCompanyCreated();
        }
        
        // Refetch to ensure we have the latest data from the database
        // Use a longer delay to ensure profile update has propagated
        // Only refetch if we don't already have the company set
        setTimeout(async () => {
          try {
            const refreshedCompany = await getCompany();
            if (refreshedCompany) {
              setCompany(refreshedCompany);
              setCompanyName(refreshedCompany.name);
            }
            // If refetch fails but we already have company, keep the existing state
          } catch (err) {
            console.error('Error refetching company after creation:', err);
            // Keep the existing company state even if refetch fails
          }
        }, 500);
      }
    } catch (err: any) {
      console.error('Error saving company:', err);
      setError(err.message || 'Failed to save company');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-slate-900 rounded-xl p-8 border border-slate-800">
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-blue-400" size={32} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="bg-slate-900 rounded-xl p-8 border border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="text-blue-400" size={24} />
          <h2 className="text-2xl font-bold text-white">
            {isOwner ? 'Company Settings' : 'Company Information'}
          </h2>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
            <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {!company && isOwner && !success && !saving && !loading && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400 text-sm">
              You don't have a company yet. Create one to start managing your loads, transporters, and drivers.
            </p>
          </div>
        )}

        {!company && !isOwner && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400 text-sm">
              You are not currently assigned to a company. Please contact your administrator.
            </p>
          </div>
        )}

        {isOwner && (
          <form onSubmit={handleCreateOrUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Company Name
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company name"
                  className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving || (!isEditing && company !== null)}
                  required
                />
                {company && !isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {(isEditing || !company) && (
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving || !companyName.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader className="animate-spin" size={16} />
                      {company ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    company ? 'Update Company' : 'Create Company'
                  )}
                </button>
                {company && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setCompanyName(company.name);
                      setError(null);
                      setSuccess(null);
                    }}
                    className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </form>
        )}

        {company && (
          <div className="mt-8 pt-6 border-t border-slate-800">
            <h3 className="text-lg font-semibold text-slate-300 mb-4">Company Information</h3>
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="text-blue-400" size={18} />
                  <span className="text-slate-400 text-sm">Company Name</span>
                </div>
                <p className="text-white text-lg font-semibold">{company.name}</p>
              </div>
              
              {ownerEmail && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="text-blue-400" size={18} />
                    <span className="text-slate-400 text-sm">Owner Email</span>
                  </div>
                  <p className="text-white">{ownerEmail}</p>
                </div>
              )}
              
              {isOwner && (
                <div className="space-y-3 pt-4 border-t border-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Company ID:</span>
                    <span className="text-slate-300 font-mono text-sm">{company.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Created:</span>
                    <span className="text-slate-300 text-sm">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

