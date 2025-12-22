import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { UserRole } from '../types';
import { User, Loader, AlertCircle } from 'lucide-react';

interface ProfileSetupProps {
  userId: string;
  userEmail: string;
  onProfileCreated: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ userId, userEmail, onProfileCreated }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('owner');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase not configured');
      setSaving(false);
      return;
    }

    try {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email: userEmail,
          name: name.trim() || userEmail.split('@')[0],
          role: role
        }]);

      if (profileError) {
        console.error('Error creating profile:', profileError);
        setError(profileError.message || 'Failed to create profile');
        setSaving(false);
        return;
      }

      // If user is an owner, create a company for them
      if (role === 'owner') {
        try {
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .insert([{
              name: `${name.trim() || userEmail.split('@')[0]}'s Company`,
              owner_id: userId
            }])
            .select()
            .single();

          if (!companyError && companyData) {
            // Link profile to company
            await supabase
              .from('profiles')
              .update({ company_id: companyData.id })
              .eq('id', userId);
          }
        } catch (companyErr) {
          console.error('Error creating company:', companyErr);
          // Continue anyway - company can be created later
        }
      }

      // Profile created successfully
      onProfileCreated();
    } catch (err: any) {
      console.error('Error in profile setup:', err);
      setError(err.message || 'Failed to create profile');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <User className="text-blue-400" size={24} />
          <h2 className="text-2xl font-bold text-white">Complete Your Profile</h2>
        </div>

        <p className="text-slate-400 mb-6">
          We need a few details to set up your account. This will only take a moment.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Full Name <span className="text-slate-500">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={userEmail.split('@')[0]}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              If left empty, we'll use your email prefix: {userEmail.split('@')[0]}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="owner">Owner</option>
              <option value="dispatch_company">Dispatch Company</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="driver">Driver</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {role === 'owner' && 'As an owner, a company will be created for you automatically.'}
              {role === 'dispatch_company' && 'As a dispatch company, a company will be created for you automatically.'}
              {role === 'dispatcher' && 'You will need to be assigned to a company by an owner or dispatch company.'}
              {role === 'driver' && 'You will need to be assigned to a company by an owner.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader className="animate-spin" size={16} />
                Creating Profile...
              </>
            ) : (
              'Create Profile'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

