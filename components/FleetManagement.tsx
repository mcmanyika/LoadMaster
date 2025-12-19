import React, { useState, useEffect } from 'react';
import { Transporter, Driver, UserProfile, Dispatcher } from '../types';
import { getTransporters, getDrivers, createTransporter, updateTransporter, createDriver, updateDriver, getDispatchers, createDispatcher, updateDispatcher } from '../services/loadService';
import { getCompany } from '../services/companyService';
import { Truck, User, Plus, Search, Building2, Phone, Mail, FileBadge, Users as UsersIcon, AlertCircle, DollarSign, Edit2, X, Check } from 'lucide-react';
import { ErrorModal } from './ErrorModal';
import { InvitationManagement } from './InvitationManagement';
import { DriverInvitationManagement } from './DriverInvitationManagement';

interface FleetManagementProps {
  user: UserProfile;
}

export const FleetManagement: React.FC<FleetManagementProps> = ({ user }) => {
  const isOwner = user.role === 'owner';
  const [activeTab, setActiveTab] = useState<'drivers' | 'dispatchers' | 'vehicles'>(isOwner ? 'dispatchers' : 'dispatchers');
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
  const [editDriverForm, setEditDriverForm] = useState({ 
    name: '', 
    phone: '', 
    email: '',
    payType: 'percentage_of_net' as 'percentage_of_gross' | 'percentage_of_net',
    payPercentage: '50'
  });
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [editVehicleForm, setEditVehicleForm] = useState({ name: '', registrationNumber: '', mcNumber: '' });
  const [editingDispatcherId, setEditingDispatcherId] = useState<string | null>(null);
  const [editDispatcherForm, setEditDispatcherForm] = useState({ name: '', email: '', phone: '', feePercentage: '12' });

  // Form States
  const [tForm, setTForm] = useState({ name: '', mcNumber: '', registrationNumber: '', contactPhone: '', contactEmail: '' });
  const [dForm, setDForm] = useState({ 
    name: '', 
    phone: '', 
    email: '',
    payType: 'percentage_of_net' as 'percentage_of_gross' | 'percentage_of_net',
    payPercentage: '50'
  });
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
      const payPercentage = parseFloat(dForm.payPercentage) || 50;
      if (payPercentage < 0 || payPercentage > 100) {
        setErrorModal({ isOpen: true, message: 'Pay percentage must be between 0 and 100' });
        return;
      }
      
      // companyId is handled automatically by createDriver service
      // transporterId is set to null for owners since they don't manage transporters
      const newD = await createDriver({ 
        ...dForm, 
        transporterId: null as any,
        payType: dForm.payType,
        payPercentage: payPercentage
      } as any);
      // Refresh the driver list to include the new driver
      await fetchData();
      setShowAddForm(false);
      setDForm({ name: '', phone: '', email: '', payType: 'percentage_of_net', payPercentage: '50' });
    } catch (e: any) {
      console.error('Error creating driver:', e);
      setErrorModal({ isOpen: true, message: e.message || 'Failed to create driver' });
    }
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriverId(driver.id);
    setEditDriverForm({ 
      name: driver.name, 
      phone: driver.phone || '', 
      email: driver.email || '',
      payType: driver.payType || 'percentage_of_net',
      payPercentage: (driver.payPercentage || 50).toString()
    });
  };

  const handleCancelEditDriver = () => {
    setEditingDriverId(null);
    setEditDriverForm({ name: '', phone: '', email: '', payType: 'percentage_of_net', payPercentage: '50' });
  };

  const handleSaveDriver = async (driverId: string) => {
    try {
      const payPercentage = parseFloat(editDriverForm.payPercentage) || 50;
      if (payPercentage < 0 || payPercentage > 100) {
        setErrorModal({ isOpen: true, message: 'Pay percentage must be between 0 and 100' });
        return;
      }
      
      const updated = await updateDriver(driverId, {
        name: editDriverForm.name,
        phone: editDriverForm.phone || undefined,
        email: editDriverForm.email || undefined,
        payType: editDriverForm.payType,
        payPercentage: payPercentage
      });
      setDrivers(drivers.map(d => d.id === driverId ? updated : d));
      setEditingDriverId(null);
      setEditDriverForm({ name: '', phone: '', email: '', payType: 'percentage_of_net', payPercentage: '50' });
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
    let newDispatcher: Dispatcher | null = null;
    try {
      const feePercentage = parseFloat(dispForm.feePercentage) || 12;
      
      if (feePercentage < 0 || feePercentage > 100) {
        setError('Fee percentage must be between 0 and 100');
        return;
      }
      
      newDispatcher = await createDispatcher({
        name: dispForm.name,
        email: dispForm.email || undefined,
        phone: dispForm.phone || undefined,
        feePercentage,
        companyId: '' // Will be set by service
      });
      
      // Immediately add the new dispatcher to the list (optimistic update)
      setDispatchers(prev => [...prev, newDispatcher!]);
      
      // Close form and reset immediately for instant UI feedback
      setShowAddForm(false);
      setDispForm({ name: '', email: '', phone: '', feePercentage: '12' });
      setError(null);
      
      // Refetch in the background to ensure data consistency
      // Use companyId from state, or from newDispatcher, or fetch company
      const refetchCompanyId = companyId || newDispatcher.companyId;
      if (refetchCompanyId) {
        // Refetch without blocking - update state when complete
        getDispatchers(refetchCompanyId).then(dispatchersData => {
          setDispatchers(dispatchersData);
        }).catch(err => {
          console.error('Error refetching dispatchers:', err);
          // Keep the optimistic update even if refetch fails
        });
      } else {
        // Fallback: get company and then refetch
        const companyData = await getCompany();
        if (companyData) {
          setCompanyId(companyData.id);
          getDispatchers(companyData.id).then(dispatchersData => {
            setDispatchers(dispatchersData);
          }).catch(err => {
            console.error('Error refetching dispatchers:', err);
          });
        }
      }
    } catch (e: any) {
      console.error('Error creating dispatcher:', e);
      setError(e.message || 'Failed to create dispatcher');
      // Remove the optimistic update if creation failed
      if (newDispatcher) {
        setDispatchers(prev => prev.filter(d => d.id !== newDispatcher!.id));
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[600px]">
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Fleet Management</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isOwner ? 'Manage your drivers and dispatchers' : 'Manage your carriers and drivers'}
            </p>
          </div>
          {/* Add button - show for owners on all tabs */}
          {isOwner && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Plus size={18} />
              Add {
                activeTab === 'vehicles' ? 'Vehicle' : 
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
              activeTab === 'dispatchers' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {isOwner ? 'Dispatchers' : 'Join Company'}
            {activeTab === 'dispatchers' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
          </button>
          {/* Drivers tab - only for owners */}
          {isOwner && (
            <button 
              onClick={() => setActiveTab('drivers')}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === 'drivers' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Drivers
              {activeTab === 'drivers' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
            </button>
          )}
          {isOwner && (
            <button 
              onClick={() => setActiveTab('vehicles')}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === 'vehicles' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Vehicles
              {activeTab === 'vehicles' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">Loading fleet data...</div>
        ) : (
          <>
            {/* ADD FORMS */}
            {showAddForm && (
              <div className="mb-8 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Add New {
                      activeTab === 'vehicles' ? 'Vehicle' :
                      activeTab === 'drivers' ? 'Driver' : 
                      'Dispatcher'
                    }</h3>
                    <button onClick={() => setShowAddForm(false)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">Cancel</button>
                 </div>
                 
                 {activeTab === 'vehicles' ? (
                   <form onSubmit={handleAddTransporter} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input required placeholder="Vehicle Name" className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={tForm.name} onChange={e => setTForm({...tForm, name: e.target.value})} />
                      <input required placeholder="Registration Number" className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={tForm.registrationNumber} onChange={e => setTForm({...tForm, registrationNumber: e.target.value})} />
                      <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">Register Vehicle</button>
                   </form>
                 ) : activeTab === 'drivers' ? (
                   <form onSubmit={handleAddDriver} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <input 
                       required 
                       placeholder="Full Name" 
                       className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                       value={dForm.name} 
                       onChange={e => setDForm({...dForm, name: e.target.value})} 
                     />
                     <input 
                       placeholder="Phone (Optional)" 
                       className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                       value={dForm.phone} 
                       onChange={e => setDForm({...dForm, phone: e.target.value})} 
                     />
                     <input 
                       type="email"
                       placeholder="Email (Optional)" 
                       className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                       value={dForm.email} 
                       onChange={e => setDForm({...dForm, email: e.target.value})} 
                     />
                     <select
                       className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                       value={dForm.payType}
                       onChange={e => setDForm({...dForm, payType: e.target.value as 'percentage_of_gross' | 'percentage_of_net'})}
                     >
                       <option value="percentage_of_net">% of (Gross - Dispatch Fee)</option>
                       <option value="percentage_of_gross">% of Gross</option>
                     </select>
                     <input 
                       type="number"
                       min="0"
                       max="100"
                       step="0.01"
                       placeholder="Pay Percentage (%)" 
                       className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                       value={dForm.payPercentage} 
                       onChange={e => setDForm({...dForm, payPercentage: e.target.value})} 
                     />
                     <div className="md:col-span-2 text-xs text-slate-500 dark:text-slate-400">
                       {dForm.payType === 'percentage_of_gross' 
                         ? `Driver will receive ${dForm.payPercentage || 50}% of the total gross revenue per load. Owner covers all expenses (gas, etc.).`
                         : `Driver will receive ${dForm.payPercentage || 50}% of (Gross - Dispatch Fee) per load. Gas expenses shared 50-50.`}
                     </div>
                     <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">Register Driver</button>
                   </form>
                 ) : (
                   <form onSubmit={handleAddDispatcher} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {error && (
                        <div className="md:col-span-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-400 text-sm">
                          <AlertCircle size={16} />
                          <span>{error}</span>
                        </div>
                      )}
                      <input 
                        required 
                        placeholder="Full Name" 
                        className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                        value={dispForm.name} 
                        onChange={e => setDispForm({...dispForm, name: e.target.value})} 
                      />
                      <input 
                        type="email"
                        placeholder="Email Address (Optional)" 
                        className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                        value={dispForm.email} 
                        onChange={e => setDispForm({...dispForm, email: e.target.value})} 
                      />
                      <input 
                        placeholder="Phone (Optional)" 
                        className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                        value={dispForm.phone} 
                        onChange={e => setDispForm({...dispForm, phone: e.target.value})} 
                      />
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="Fee Percentage (%)" 
                        className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                        value={dispForm.feePercentage} 
                        onChange={e => setDispForm({...dispForm, feePercentage: e.target.value})} 
                      />
                      <button type="submit" className="md:col-span-2 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">Register Dispatcher</button>
                   </form>
                 )}
              </div>
            )}

            {/* LISTS */}
            {isOwner && activeTab === 'vehicles' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {transporters.map(t => {
                  const isEditing = editingVehicleId === t.id;
                  
                  return (
                    <div key={t.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow bg-white dark:bg-slate-800">
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
                                className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-sm font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700"
                                placeholder={activeTab === 'vehicles' ? 'Vehicle Name' : 'Company Name'}
                              />
                            ) : (
                              <h4 className="font-bold text-slate-800 dark:text-slate-100">{t.name}</h4>
                            )}
                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {isEditing ? (
                                activeTab === 'vehicles' ? (
                                  <input
                                    type="text"
                                    value={editVehicleForm.registrationNumber}
                                    onChange={(e) => setEditVehicleForm({...editVehicleForm, registrationNumber: e.target.value})}
                                    className="flex-1 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                    placeholder="Registration Number"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={editVehicleForm.mcNumber}
                                    onChange={(e) => setEditVehicleForm({...editVehicleForm, mcNumber: e.target.value})}
                                    className="flex-1 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
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
                              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded text-xs text-center text-slate-500 dark:text-slate-400">
                         {drivers.filter(d => d.transporterId === t.id).length} Active Drivers
                      </div>
                    </div>
                  );
                })}
                {transporters.length === 0 && <div className="col-span-3 text-center text-slate-400 dark:text-slate-500 py-10">No vehicles registered yet.</div>}
              </div>
            )}

            {activeTab === 'drivers' && (
              <div className="space-y-6">
                {/* Invitation Management Section - Show for both owners and drivers */}
                <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
                  <DriverInvitationManagement
                    user={user}
                    companyId={companyId}
                    onUpdate={fetchData}
                  />
                </div>
                
                {/* Drivers List is now handled by DriverInvitationManagement component above */}
              </div>
            )}

            {activeTab === 'dispatchers' && (
              <div className="space-y-6">
                {/* Invitation Management Section - Show for both owners and dispatchers */}
                <div className="border-b border-slate-200 dark:border-slate-700 pb-6">
                  <InvitationManagement
                    user={user}
                    companyId={companyId}
                    onUpdate={fetchData}
                  />
                </div>
                
                {/* Dispatchers List is now handled by InvitationManagement component above */}
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