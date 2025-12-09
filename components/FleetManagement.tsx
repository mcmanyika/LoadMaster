import React, { useState, useEffect } from 'react';
import { Transporter, Driver, UserProfile, Dispatcher } from '../types';
import { getTransporters, getDrivers, createTransporter, updateTransporter, createDriver, updateDriver, getDispatchers, createDispatcher, updateDispatcher } from '../services/loadService';
import { getCompany } from '../services/companyService';
import { Truck, User, Plus, Search, Building2, Phone, Mail, FileBadge, Users as UsersIcon, AlertCircle, DollarSign, Edit2, X, Check } from 'lucide-react';
import { ErrorModal } from './ErrorModal';
import { InvitationManagement } from './InvitationManagement';

interface FleetManagementProps {
  user: UserProfile;
}

export const FleetManagement: React.FC<FleetManagementProps> = ({ user }) => {
  const isOwner = user.role === 'owner';
  const [activeTab, setActiveTab] = useState<'transporters' | 'drivers' | 'dispatchers' | 'vehicles'>(isOwner ? 'dispatchers' : 'dispatchers');
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [companyName, setCompanyName] = useState<string>('');
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [editDriverForm, setEditDriverForm] = useState({ name: '', phone: '', email: '' });
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editVehicleForm, setEditVehicleForm] = useState({ name: '', registrationNumber: '', mcNumber: '' });
  const [editingDispatcherId, setEditingDispatcherId] = useState<string | null>(null);
  const [editDispatcherForm, setEditDispatcherForm] = useState({ name: '', email: '', phone: '', feePercentage: '12' });

  // Form States
  const [tForm, setTForm] = useState({ name: '', mcNumber: '', registrationNumber: '', contactPhone: '', contactEmail: '' });
  const [dForm, setDForm] = useState({ name: '', phone: '', email: '' });
  const [dispForm, setDispForm] = useState({ name: '', email: '', phone: '', feePercentage: '12' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const companyData = await getCompany();
      const [transportersData, driversData] = await Promise.all([
        getTransporters(),
        getDrivers()
      ]);
      setTransporters(transportersData);
      setDrivers(driversData);
      if (companyData) {
        setCompanyName(companyData.name);
        setCompanyId(companyData.id);
      }
      
      if (isOwner && companyData) {
        const dispatchersData = await getDispatchers(companyData.id);
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
      // For vehicles, use registrationNumber; for transporters, use mcNumber
      const transporterData: any = {
        name: tForm.name,
      };
      
      if (activeTab === 'vehicles') {
        transporterData.registrationNumber = tForm.registrationNumber;
      } else {
        transporterData.mcNumber = tForm.mcNumber;
        transporterData.contactPhone = tForm.contactPhone;
        transporterData.contactEmail = tForm.contactEmail;
      }
      
      // companyId is added automatically by createTransporter service
      const newT = await createTransporter(transporterData);
      setTransporters([...transporters, newT]);
      setShowAddForm(false);
      setTForm({ name: '', mcNumber: '', registrationNumber: '', contactPhone: '', contactEmail: '' });
    } catch (e: any) {
      setErrorModal({ isOpen: true, message: e.message || 'Failed to create ' + (activeTab === 'vehicles' ? 'vehicle' : 'transporter') });
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // companyId is handled automatically by createDriver service
      // transporterId is set to null for owners since they don't manage transporters
      const newD = await createDriver({ ...dForm, transporterId: null as any } as any);
      setDrivers([...drivers, newD]);
      setShowAddForm(false);
      setDForm({ name: '', phone: '', email: '' });
    } catch (e: any) {
      console.error('Error creating driver:', e);
      setErrorModal({ isOpen: true, message: e.message || 'Failed to create driver' });
    }
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriverId(driver.id);
    setEditDriverForm({ name: driver.name, phone: driver.phone || '', email: driver.email || '' });
  };

  const handleCancelEditDriver = () => {
    setEditingDriverId(null);
    setEditDriverForm({ name: '', phone: '', email: '' });
  };

  const handleSaveDriver = async (driverId: string) => {
    try {
      const updated = await updateDriver(driverId, editDriverForm);
      setDrivers(drivers.map(d => d.id === driverId ? updated : d));
      setEditingDriverId(null);
      setEditDriverForm({ name: '', phone: '', email: '' });
    } catch (e: any) {
      console.error('Error updating driver:', e);
      setErrorModal({ isOpen: true, message: e.message || 'Failed to update driver' });
    }
  };

  const handleEditVehicle = (vehicle: Transporter) => {
    setEditingVehicleId(vehicle.id);
    setEditVehicleForm({ 
      name: vehicle.name, 
      registrationNumber: vehicle.registrationNumber || '', 
      mcNumber: vehicle.mcNumber || ''
    });
  };

  const handleCancelEditVehicle = () => {
    setEditingVehicleId(null);
    setEditVehicleForm({ name: '', registrationNumber: '', mcNumber: '' });
  };

  const handleSaveVehicle = async (vehicleId: string) => {
    try {
      const updateData: any = {
        name: editVehicleForm.name,
      };
      
      if (activeTab === 'vehicles') {
        updateData.registrationNumber = editVehicleForm.registrationNumber;
      } else {
        updateData.mcNumber = editVehicleForm.mcNumber;
      }
      
      const updated = await updateTransporter(vehicleId, updateData);
      setTransporters(transporters.map(t => t.id === vehicleId ? updated : t));
      setEditingVehicleId(null);
      setEditVehicleForm({ name: '', registrationNumber: '', mcNumber: '' });
    } catch (e: any) {
      console.error('Error updating vehicle:', e);
      setErrorModal({ isOpen: true, message: e.message || 'Failed to update vehicle' });
    }
  };

  const handleEditDispatcher = (dispatcher: Dispatcher) => {
    setEditingDispatcherId(dispatcher.id);
    setEditDispatcherForm({ 
      name: dispatcher.name, 
      email: dispatcher.email || '', 
      phone: dispatcher.phone || '',
      feePercentage: dispatcher.feePercentage?.toString() || '12' 
    });
  };

  const handleCancelEditDispatcher = () => {
    setEditingDispatcherId(null);
    setEditDispatcherForm({ name: '', email: '', phone: '', feePercentage: '12' });
  };

  const handleSaveDispatcher = async (dispatcherId: string) => {
    try {
      const feePercentage = parseFloat(editDispatcherForm.feePercentage) || 12;
      if (feePercentage < 0 || feePercentage > 100) {
        setErrorModal({ isOpen: true, message: 'Fee percentage must be between 0 and 100' });
        return;
      }

      const updated = await updateDispatcher(dispatcherId, {
        name: editDispatcherForm.name,
        email: editDispatcherForm.email || undefined,
        phone: editDispatcherForm.phone || undefined,
        feePercentage
      });

      setDispatchers(dispatchers.map(d => d.id === dispatcherId ? updated : d));
      setEditingDispatcherId(null);
      setEditDispatcherForm({ name: '', email: '', phone: '', feePercentage: '12' });
    } catch (e: any) {
      console.error('Error updating dispatcher:', e);
      setErrorModal({ isOpen: true, message: e.message || 'Failed to update dispatcher' });
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
      
      const newDispatcher = await createDispatcher({
        name: dispForm.name,
        email: dispForm.email || undefined,
        phone: dispForm.phone || undefined,
        feePercentage,
        companyId: '' // Will be set by service
      });
      
      // Refetch dispatchers to ensure we have the latest data from the database
      const dispatchersData = await getDispatchers();
      setDispatchers(dispatchersData);
      setShowAddForm(false);
      setDispForm({ name: '', email: '', phone: '', feePercentage: '12' });
      setError(null);
    } catch (e: any) {
      console.error('Error creating dispatcher:', e);
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
              {isOwner ? 'Manage your drivers and dispatchers' : 'Manage your carriers and drivers'}
            </p>
          </div>
          {/* Add button - only show for owners, and not for dispatchers tab */}
          {isOwner && activeTab !== 'dispatchers' && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus size={18} />
              Add {
                activeTab === 'vehicles' ? 'Vehicle' :
                activeTab === 'transporters' ? 'Carrier' : 
                activeTab === 'drivers' ? 'Driver' : 
                'Dispatcher'
              }
            </button>
          )}
        </div>
        
        <div className="flex px-6 gap-6">
          {/* Show dispatchers tab for both owners and dispatchers */}
          <button 
            onClick={() => setActiveTab('dispatchers')}
            className={`pb-4 text-sm font-medium transition-colors relative ${
              activeTab === 'dispatchers' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isOwner ? 'Dispatchers' : 'Join Company'}
            {activeTab === 'dispatchers' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
          </button>
          {/* Transporters / Carriers tab - only for owners */}
          {isOwner && (
            <>
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
            </>
          )}
          {isOwner && (
            <button 
              onClick={() => setActiveTab('vehicles')}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === 'vehicles' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Vehicles
              {activeTab === 'vehicles' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
            </button>
          )}
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
                      activeTab === 'vehicles' ? 'Vehicle' :
                      activeTab === 'transporters' ? 'Carrier' : 
                      activeTab === 'drivers' ? 'Driver' : 
                      'Dispatcher'
                    }</h3>
                    <button onClick={() => setShowAddForm(false)} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>
                 </div>
                 
                 {(activeTab === 'transporters' || activeTab === 'vehicles') ? (
                   <form onSubmit={handleAddTransporter} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeTab === 'vehicles' ? (
                        <>
                          <input required placeholder="Vehicle Name" className="p-2 border rounded-lg" value={tForm.name} onChange={e => setTForm({...tForm, name: e.target.value})} />
                          <input required placeholder="Registration Number" className="p-2 border rounded-lg" value={tForm.registrationNumber} onChange={e => setTForm({...tForm, registrationNumber: e.target.value})} />
                        </>
                      ) : (
                        <>
                          <input required placeholder="Company Name" className="p-2 border rounded-lg" value={tForm.name} onChange={e => setTForm({...tForm, name: e.target.value})} />
                          <input required placeholder="MC Number" className="p-2 border rounded-lg" value={tForm.mcNumber} onChange={e => setTForm({...tForm, mcNumber: e.target.value})} />
                          <input placeholder="Phone" className="p-2 border rounded-lg" value={tForm.contactPhone} onChange={e => setTForm({...tForm, contactPhone: e.target.value})} />
                          <input placeholder="Email" className="p-2 border rounded-lg" value={tForm.contactEmail} onChange={e => setTForm({...tForm, contactEmail: e.target.value})} />
                        </>
                      )}
                      <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">Register {activeTab === 'vehicles' ? 'Vehicle' : 'Carrier'}</button>
                   </form>
                 ) : activeTab === 'drivers' ? (
                   <form onSubmit={handleAddDriver} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input required placeholder="Driver Name" className="p-2 border rounded-lg" value={dForm.name} onChange={e => setDForm({...dForm, name: e.target.value})} />
                      <input 
                        disabled 
                        placeholder="Carrier" 
                        className="p-2 border rounded-lg bg-slate-100 text-slate-600 cursor-not-allowed" 
                        value={companyName || 'Company Name'} 
                      />
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
                        type="email"
                        placeholder="Email Address (Optional)" 
                        className="p-2 border rounded-lg" 
                        value={dispForm.email} 
                        onChange={e => setDispForm({...dispForm, email: e.target.value})} 
                      />
                      <input 
                        placeholder="Phone (Optional)" 
                        className="p-2 border rounded-lg" 
                        value={dispForm.phone} 
                        onChange={e => setDispForm({...dispForm, phone: e.target.value})} 
                      />
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="Fee Percentage (%)" 
                        className="p-2 border rounded-lg" 
                        value={dispForm.feePercentage} 
                        onChange={e => setDispForm({...dispForm, feePercentage: e.target.value})} 
                      />
                      <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">Register Dispatcher</button>
                   </form>
                 )}
              </div>
            )}

            {/* LISTS */}
            {((!isOwner && activeTab === 'transporters') || (isOwner && activeTab === 'vehicles')) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {transporters.map(t => {
                  const isEditing = editingVehicleId === t.id;
                  
                  return (
                    <div key={t.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                            <Truck size={20} />
                          </div>
                          <div className="flex-1">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editVehicleForm.name}
                                onChange={(e) => setEditVehicleForm({...editVehicleForm, name: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-bold text-slate-800"
                                placeholder={activeTab === 'vehicles' ? 'Vehicle Name' : 'Company Name'}
                              />
                            ) : (
                              <h4 className="font-bold text-slate-800">{t.name}</h4>
                            )}
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                              {isEditing ? (
                                activeTab === 'vehicles' ? (
                                  <input
                                    type="text"
                                    value={editVehicleForm.registrationNumber}
                                    onChange={(e) => setEditVehicleForm({...editVehicleForm, registrationNumber: e.target.value})}
                                    className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
                                    placeholder="Registration Number"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={editVehicleForm.mcNumber}
                                    onChange={(e) => setEditVehicleForm({...editVehicleForm, mcNumber: e.target.value})}
                                    className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs"
                                    placeholder="MC Number"
                                  />
                                )
                              ) : (
                                <>
                                  <FileBadge size={12} />
                                  <span>{activeTab === 'vehicles' ? (t.registrationNumber || 'No registration') : (t.mcNumber || 'No MC Number')}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveVehicle(t.id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Save"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={handleCancelEditVehicle}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Cancel"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleEditVehicle(t)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 bg-slate-50 p-2 rounded text-xs text-center text-slate-500">
                         {drivers.filter(d => d.transporterId === t.id).length} Active Drivers
                      </div>
                    </div>
                  );
                })}
                {transporters.length === 0 && <div className="col-span-3 text-center text-slate-400 py-10">No {activeTab === 'vehicles' ? 'vehicles' : 'carriers'} registered yet.</div>}
              </div>
            )}

            {activeTab === 'drivers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {drivers.map(d => {
                  const carrier = transporters.find(t => t.id === d.transporterId);
                  // For owners, show company name instead of carrier
                  const displayCarrier = isOwner 
                    ? (companyName || 'Company')
                    : (carrier ? carrier.name : 'Unknown Carrier');
                  const isEditing = editingDriverId === d.id;
                  
                  return (
                    <div key={d.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                            <User size={20} />
                          </div>
                          <div className="flex-1">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editDriverForm.name}
                                onChange={(e) => setEditDriverForm({...editDriverForm, name: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-bold text-slate-800"
                                placeholder="Driver Name"
                              />
                            ) : (
                              <h4 className="font-bold text-slate-800">{d.name}</h4>
                            )}
                            <div className="text-xs text-slate-500 mt-1">
                              {displayCarrier}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveDriver(d.id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Save"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={handleCancelEditDriver}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Cancel"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleEditDriver(d)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-slate-600 mt-4 pt-4 border-t border-slate-50">
                        {isEditing ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Phone size={14} className="text-slate-400"/>
                              <input
                                type="text"
                                value={editDriverForm.phone}
                                onChange={(e) => setEditDriverForm({...editDriverForm, phone: e.target.value})}
                                className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                                placeholder="Phone"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail size={14} className="text-slate-400"/>
                              <input
                                type="email"
                                value={editDriverForm.email}
                                onChange={(e) => setEditDriverForm({...editDriverForm, email: e.target.value})}
                                className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                                placeholder="Email"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            {d.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {d.phone}</div>}
                            {d.email && <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {d.email}</div>}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {drivers.length === 0 && <div className="col-span-3 text-center text-slate-400 py-10">No drivers registered yet.</div>}
              </div>
            )}

            {activeTab === 'dispatchers' && (
              <div className="space-y-6">
                {/* Invitation Management Section - Show for both owners and dispatchers */}
                <div className="border-b border-slate-200 pb-6">
                  <InvitationManagement
                    user={user}
                    companyId={companyId}
                    onUpdate={fetchData}
                  />
                </div>
                
                {/* Dispatchers List - Only show for owners */}
                {isOwner && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Active Dispatchers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dispatchers.map(d => {
                  const isEditing = editingDispatcherId === d.id;
                  
                  return (
                    <div key={d.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <UsersIcon size={20} />
                          </div>
                          <div className="flex-1">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editDispatcherForm.name}
                                onChange={(e) => setEditDispatcherForm({...editDispatcherForm, name: e.target.value})}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm font-bold text-slate-800"
                                placeholder="Full Name"
                              />
                            ) : (
                              <h4 className="font-bold text-slate-800">{d.name}</h4>
                            )}
                            <div className="text-xs text-slate-500 mt-1">
                              Dispatcher
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveDispatcher(d.id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Save"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={handleCancelEditDispatcher}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Cancel"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleEditDispatcher(d)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-slate-600 mt-4 pt-4 border-t border-slate-50">
                        {isEditing ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Mail size={14} className="text-slate-400"/>
                              <input
                                type="email"
                                value={editDispatcherForm.email}
                                onChange={(e) => setEditDispatcherForm({...editDispatcherForm, email: e.target.value})}
                                className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                                placeholder="Email"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone size={14} className="text-slate-400"/>
                              <input
                                type="tel"
                                value={editDispatcherForm.phone}
                                onChange={(e) => setEditDispatcherForm({...editDispatcherForm, phone: e.target.value})}
                                className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                                placeholder="Phone"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign size={14} className="text-slate-400"/>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={editDispatcherForm.feePercentage}
                                onChange={(e) => setEditDispatcherForm({...editDispatcherForm, feePercentage: e.target.value})}
                                className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                                placeholder="Fee %"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            {d.email && <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {d.email}</div>}
                            {d.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {d.phone}</div>}
                            {d.feePercentage !== undefined && (
                              <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-slate-400"/>
                                <span>Fee: {d.feePercentage}%</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                    })}
                    {dispatchers.length === 0 && <div className="col-span-3 text-center text-slate-400 py-10">No dispatchers registered yet.</div>}
                  </div>
                </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />
    </div>
  );
};