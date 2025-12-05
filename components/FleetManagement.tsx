import React, { useState, useEffect } from 'react';
import { Transporter, Driver, UserProfile } from '../types';
import { getTransporters, getDrivers, createTransporter, createDriver, getDispatchers } from '../services/loadService';
import { createDispatcher } from '../services/authService';
import { Truck, User, Plus, Search, Building2, Phone, Mail, FileBadge, Users as UsersIcon, AlertCircle, DollarSign } from 'lucide-react';

interface FleetManagementProps {
  user: UserProfile;
}

export const FleetManagement: React.FC<FleetManagementProps> = ({ user }) => {
  const isOwner = user.role === 'owner';
  const [activeTab, setActiveTab] = useState<'transporters' | 'drivers' | 'dispatchers'>(isOwner ? 'dispatchers' : 'transporters');
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dispatchers, setDispatchers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [tForm, setTForm] = useState({ name: '', mcNumber: '', contactPhone: '', contactEmail: '' });
  const [dForm, setDForm] = useState({ name: '', transporterId: '', phone: '', email: '' });
  const [dispForm, setDispForm] = useState({ name: '', email: '', password: '', feePercentage: '12' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transportersData, driversData] = await Promise.all([
        getTransporters(),
        getDrivers()
      ]);
      setTransporters(transportersData);
      setDrivers(driversData);
      
      if (isOwner) {
        const dispatchersData = await getDispatchers();
        setDispatchers(dispatchersData);
      }
    } catch (e) {
      console.error("Error fetching fleet data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransporter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newT = await createTransporter(tForm);
      setTransporters([...transporters, newT]);
      setShowAddForm(false);
      setTForm({ name: '', mcNumber: '', contactPhone: '', contactEmail: '' });
    } catch (e) {
      alert('Failed to create transporter');
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newD = await createDriver(dForm);
      setDrivers([...drivers, newD]);
      setShowAddForm(false);
      setDForm({ name: '', transporterId: '', phone: '', email: '' });
    } catch (e) {
      alert('Failed to create driver');
    }
  };

  const handleAddDispatcher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const feePercentage = parseFloat(dispForm.feePercentage) || 12;
      if (feePercentage < 0 || feePercentage > 100) {
        setError('Fee percentage must be between 0 and 100');
        return;
      }
      
      const { user: newDispatcher, error: createError } = await createDispatcher(
        dispForm.email,
        dispForm.password,
        dispForm.name,
        feePercentage
      );
      
      if (createError) {
        setError(createError);
        return;
      }
      
      if (newDispatcher) {
        setDispatchers([...dispatchers, newDispatcher]);
        setShowAddForm(false);
        setDispForm({ name: '', email: '', password: '', feePercentage: '12' });
        setError(null);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create dispatcher');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
      <div className="border-b border-slate-200">
        <div className="p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Fleet Management</h2>
            <p className="text-sm text-slate-500">
              {isOwner ? 'Manage your carriers, drivers, and dispatchers' : 'Manage your carriers and drivers'}
            </p>
          </div>
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus size={18} />
            Add {
              activeTab === 'transporters' ? 'Carrier' : 
              activeTab === 'drivers' ? 'Driver' : 
              'Dispatcher'
            }
          </button>
        </div>
        
        <div className="flex px-6 gap-6">
          {isOwner && (
            <button 
              onClick={() => setActiveTab('dispatchers')}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === 'dispatchers' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Dispatchers
              {activeTab === 'dispatchers' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
            </button>
          )}
          <button 
            onClick={() => setActiveTab('transporters')}
            className={`pb-4 text-sm font-medium transition-colors relative ${
              activeTab === 'transporters' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Transporters / Carriers
            {activeTab === 'transporters' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('drivers')}
            className={`pb-4 text-sm font-medium transition-colors relative ${
              activeTab === 'drivers' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Drivers
            {activeTab === 'drivers' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading fleet data...</div>
        ) : (
          <>
            {/* ADD FORMS */}
            {showAddForm && (
              <div className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in slide-in-from-top-4">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800">Add New {
                      activeTab === 'transporters' ? 'Carrier' : 
                      activeTab === 'drivers' ? 'Driver' : 
                      'Dispatcher'
                    }</h3>
                    <button onClick={() => setShowAddForm(false)} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>
                 </div>
                 
                 {activeTab === 'transporters' ? (
                   <form onSubmit={handleAddTransporter} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input required placeholder="Company Name" className="p-2 border rounded-lg" value={tForm.name} onChange={e => setTForm({...tForm, name: e.target.value})} />
                      <input required placeholder="MC Number" className="p-2 border rounded-lg" value={tForm.mcNumber} onChange={e => setTForm({...tForm, mcNumber: e.target.value})} />
                      <input placeholder="Phone" className="p-2 border rounded-lg" value={tForm.contactPhone} onChange={e => setTForm({...tForm, contactPhone: e.target.value})} />
                      <input placeholder="Email" className="p-2 border rounded-lg" value={tForm.contactEmail} onChange={e => setTForm({...tForm, contactEmail: e.target.value})} />
                      <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">Register Carrier</button>
                   </form>
                 ) : activeTab === 'drivers' ? (
                   <form onSubmit={handleAddDriver} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input required placeholder="Driver Name" className="p-2 border rounded-lg" value={dForm.name} onChange={e => setDForm({...dForm, name: e.target.value})} />
                      <select required className="p-2 border rounded-lg bg-white" value={dForm.transporterId} onChange={e => setDForm({...dForm, transporterId: e.target.value})}>
                        <option value="">Select Carrier...</option>
                        {transporters.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <input placeholder="Phone" className="p-2 border rounded-lg" value={dForm.phone} onChange={e => setDForm({...dForm, phone: e.target.value})} />
                      <input placeholder="Email" className="p-2 border rounded-lg" value={dForm.email} onChange={e => setDForm({...dForm, email: e.target.value})} />
                      <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">Register Driver</button>
                   </form>
                 ) : (
                   <form onSubmit={handleAddDispatcher} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {error && (
                        <div className="md:col-span-2 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-sm">
                          <AlertCircle size={16} />
                          <span>{error}</span>
                        </div>
                      )}
                      <input 
                        required 
                        placeholder="Full Name" 
                        className="p-2 border rounded-lg" 
                        value={dispForm.name} 
                        onChange={e => setDispForm({...dispForm, name: e.target.value})} 
                      />
                      <input 
                        required 
                        type="email"
                        placeholder="Email Address" 
                        className="p-2 border rounded-lg" 
                        value={dispForm.email} 
                        onChange={e => setDispForm({...dispForm, email: e.target.value})} 
                      />
                      <input 
                        required 
                        type="password"
                        placeholder="Password" 
                        className="p-2 border rounded-lg" 
                        value={dispForm.password} 
                        onChange={e => setDispForm({...dispForm, password: e.target.value})} 
                      />
                      <div className="relative">
                        <label className="block text-xs text-slate-600 mb-1">Fee Percentage (%)</label>
                        <input 
                          required 
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="12.0" 
                          className="p-2 border rounded-lg w-full" 
                          value={dispForm.feePercentage} 
                          onChange={e => setDispForm({...dispForm, feePercentage: e.target.value})} 
                        />
                        <span className="absolute right-3 top-8 text-slate-400 text-sm">%</span>
                      </div>
                      <div className="md:col-span-2 text-xs text-slate-500">
                        The dispatcher will receive login credentials to access the system. Fee percentage determines their commission rate.
                      </div>
                      <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">Register Dispatcher</button>
                   </form>
                 )}
              </div>
            )}

            {/* LISTS */}
            {activeTab === 'transporters' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {transporters.map(t => (
                  <div key={t.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{t.name}</h4>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <FileBadge size={12} />
                            <span>{t.mcNumber}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600 mt-4 pt-4 border-t border-slate-50">
                       {t.contactPhone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {t.contactPhone}</div>}
                       {t.contactEmail && <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {t.contactEmail}</div>}
                    </div>
                    <div className="mt-4 bg-slate-50 p-2 rounded text-xs text-center text-slate-500">
                       {drivers.filter(d => d.transporterId === t.id).length} Active Drivers
                    </div>
                  </div>
                ))}
                {transporters.length === 0 && <div className="col-span-3 text-center text-slate-400 py-10">No carriers registered yet.</div>}
              </div>
            )}

            {activeTab === 'drivers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drivers.map(d => {
                  const carrier = transporters.find(t => t.id === d.transporterId);
                  return (
                    <div key={d.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                            <User size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">{d.name}</h4>
                            <div className="text-xs text-slate-500">
                              {carrier ? carrier.name : 'Unknown Carrier'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-slate-600 mt-4 pt-4 border-t border-slate-50">
                         {d.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {d.phone}</div>}
                         {d.email && <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {d.email}</div>}
                      </div>
                    </div>
                  );
                })}
                {drivers.length === 0 && <div className="col-span-3 text-center text-slate-400 py-10">No drivers registered yet.</div>}
              </div>
            )}

            {activeTab === 'dispatchers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dispatchers.map(d => (
                  <div key={d.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                          <UsersIcon size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{d.name}</h4>
                          <div className="text-xs text-slate-500">
                            Dispatcher
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600 mt-4 pt-4 border-t border-slate-50">
                       <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {d.email}</div>
                       {d.feePercentage !== undefined && (
                         <div className="flex items-center gap-2">
                           <DollarSign size={14} className="text-slate-400"/>
                           <span>Fee: {d.feePercentage}%</span>
                         </div>
                       )}
                    </div>
                  </div>
                ))}
                {dispatchers.length === 0 && <div className="col-span-3 text-center text-slate-400 py-10">No dispatchers registered yet.</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};