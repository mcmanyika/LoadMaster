import React, { useState, useEffect } from 'react';
import { UserProfile, Company } from '../types';
import { getCompany, createCompany, updateCompany, getOwnerEmail } from '../services/companyService';
import { getCurrentUser } from '../services/authService';
import { Building2, CheckCircle, AlertCircle, Loader, Mail, Pencil } from 'lucide-react';
import { DispatchCompanyInvitationManagement } from './DispatchCompanyInvitationManagement';

interface CompanySettingsProps {
  user: UserProfile;
  onCompanyCreated?: () => void;
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({ user, onCompanyCreated }) => {
  const isOwner = user.role === 'owner';
  const isDispatchCompany = user.role === 'dispatch_company';
  const canManageCompany = isOwner || isDispatchCompany;
  const [company, setCompany] = useState<Company | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [numberOfTrucks, setNumberOfTrucks] = useState('');

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
        setAddress(companyData.address || '');
        setWebsite(companyData.website || '');
        setPhone(companyData.phone || '');
        setEmail(companyData.email || '');
        setContactPerson(companyData.contactPerson || '');
        setNumberOfTrucks(companyData.numberOfTrucks?.toString() || '');
        setIsEditing(false);
        
        // Fetch owner email for dispatchers
        if (!canManageCompany && companyData.ownerId) {
          const email = await getOwnerEmail(companyData.ownerId);
          setOwnerEmail(email);
        }
      } else {
        // Show create form for owners and dispatch companies
        if (canManageCompany) {
          setIsEditing(true);
        } else {
          // For dispatchers, show a helpful message
          setError('You are not currently assigned to a company. Please contact your administrator to be added to a company.');
        }
      }
    } catch (err: any) {
      console.error('Error fetching company:', err);
      if (canManageCompany) {
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

      const companyData = {
        name: companyName.trim(),
        address: address.trim() || undefined,
        website: website.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        numberOfTrucks: numberOfTrucks ? parseInt(numberOfTrucks, 10) : undefined,
      };

      if (company) {
        // Update existing company
        const updated = await updateCompany(company.id, companyData);
        setCompany(updated);
        setSuccess('Company updated successfully!');
        setIsEditing(false);
      } else {
        // Create new company
        if (!user.id) {
          throw new Error('User ID is missing');
        }
        const newCompany = await createCompany(companyName.trim(), user.id, companyData);
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
        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-blue-400" size={32} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="text-blue-400" size={24} />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {canManageCompany ? 'Company Settings' : 'Company Information'}
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

        {!company && canManageCompany && !success && !saving && !loading && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400 text-sm">
              You don't have a company yet. Create one to start managing your loads, transporters, and drivers.
            </p>
          </div>
        )}

        {!company && !canManageCompany && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400 text-sm">
              You are not currently assigned to a company. Please contact your administrator.
            </p>
          </div>
        )}

        {canManageCompany && (
          <form onSubmit={handleCreateOrUpdate} className="space-y-6">
            {/* Company Name - visible when editing or creating */}
            {(isEditing || !company) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter your company name"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving}
                  required
                />
              </div>
            )}

            {/* Additional Company Details - visible when editing or creating */}
            {(isEditing || !company) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter company address"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving || (!isEditing && company !== null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving || (!isEditing && company !== null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving || (!isEditing && company !== null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="company@example.com"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving || (!isEditing && company !== null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving || (!isEditing && company !== null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Number of Trucks
                </label>
                <input
                  type="number"
                  min="0"
                  value={numberOfTrucks}
                  onChange={(e) => setNumberOfTrucks(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving || (!isEditing && company !== null)}
                />
              </div>
            </div>
            )}

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
                      setAddress(company.address || '');
                      setWebsite(company.website || '');
                      setPhone(company.phone || '');
                      setEmail(company.email || '');
                      setContactPerson(company.contactPerson || '');
                      setNumberOfTrucks(company.numberOfTrucks?.toString() || '');
                      setError(null);
                      setSuccess(null);
                    }}
                    className="px-6 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </form>
        )}

        {company && !isEditing && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">Company Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="text-blue-400" size={18} />
                  <span className="text-slate-600 dark:text-slate-400 text-sm">Company Name</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-slate-900 dark:text-white text-lg font-semibold">{company.name}</p>
                  {canManageCompany && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                      title="Edit company"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              {company.address && (
                <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-600 dark:text-slate-400 text-sm">Address</span>
                  </div>
                  <p className="text-slate-900 dark:text-white">{company.address}</p>
                </div>
              )}
              
              {company.website && (
                <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-600 dark:text-slate-400 text-sm">Website</span>
                  </div>
                  <a 
                    href={company.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {company.website}
                  </a>
                </div>
              )}
              
              {company.phone && (
                <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-600 dark:text-slate-400 text-sm">Phone</span>
                  </div>
                  <p className="text-slate-900 dark:text-white">{company.phone}</p>
                </div>
              )}
              
              {company.email && (
                <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="text-blue-400" size={18} />
                    <span className="text-slate-600 dark:text-slate-400 text-sm">Email</span>
                  </div>
                  <a 
                    href={`mailto:${company.email}`}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {company.email}
                  </a>
                </div>
              )}
              
              {company.contactPerson && (
                <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-600 dark:text-slate-400 text-sm">Contact Person</span>
                  </div>
                  <p className="text-slate-900 dark:text-white">{company.contactPerson}</p>
                </div>
              )}
              
              {company.numberOfTrucks !== undefined && (
                <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-600 dark:text-slate-400 text-sm">Number of Trucks</span>
                  </div>
                  <p className="text-slate-900 dark:text-white">{company.numberOfTrucks}</p>
                </div>
              )}
              
              {ownerEmail && (
                <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="text-blue-400" size={18} />
                    <span className="text-slate-600 dark:text-slate-400 text-sm">Owner Email</span>
                  </div>
                  <p className="text-slate-900 dark:text-white">{ownerEmail}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dispatch Company Invitation Management - Only for owners */}
        {isOwner && company && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <DispatchCompanyInvitationManagement
              user={user}
              companyId={company.id}
              onUpdate={fetchCompany}
            />
          </div>
        )}
      </div>
    </div>
  );
};

