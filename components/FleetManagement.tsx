import React, { useState, useEffect } from 'react';
import { Transporter, Driver } from '../types';
import { getTransporters, getDrivers, createTransporter, createDriver } from '../services/loadService';
import { Truck, User, Plus, Search, Building2, Phone, Mail, FileBadge } from 'lucide-react';

export const FleetManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transporters' | 'drivers'>('transporters');
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form States
  const [tForm, setTForm] = useState({ name: '', mcNumber: '', contactPhone: '', contactEmail: '' });
  const [dForm, setDForm] = useState({ name: '', transporterId: '', phone: '', email: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tData, dData] = await Promise.all([getTransporters(), getDrivers()]);
      setTransporters(tData);
      setDrivers(dData);
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
      <div className="border-b border-slate-200">
        <div className="p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Fleet Management</h2>
            <p className="text-sm text-slate-500">Manage your carriers and drivers</p>
          </div>
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus size={18} />
            Add {activeTab === 'transporters' ? 'Carrier' : 'Driver'}
          </button>
        </div>
        
        <div className="flex px-6 gap-6">
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
                    <h3 className="font-bold text-slate-800">Add New {activeTab === 'transporters' ? 'Carrier' : 'Driver'}</h3>
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
                 ) : (
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
          </>
        )}
      </div>
    </div>
  );
};