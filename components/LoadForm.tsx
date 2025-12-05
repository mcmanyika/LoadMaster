import React, { useState, useEffect } from 'react';
import { Load, Transporter, Driver, UserProfile } from '../types';
import { X, Calculator } from 'lucide-react';
import { getDispatchers, getTransporters, getDrivers } from '../services/loadService';

interface LoadFormProps {
  onClose: () => void;
  onSave: (load: Omit<Load, 'id'>) => void;
  currentUser: UserProfile;
}

export const LoadForm: React.FC<LoadFormProps> = ({ onClose, onSave, currentUser }) => {
  // Data Options
  const [dispatchers, setDispatchers] = useState<UserProfile[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [formData, setFormData] = useState({
    company: '',
    gross: '',
    miles: '',
    gasAmount: '',
    gasNotes: '',
    dropDate: new Date().toISOString().split('T')[0],
    dispatcher: '',
    transporterId: '',
    driverId: '',
    origin: '',
    destination: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [d, t, dr] = await Promise.all([getDispatchers(), getTransporters(), getDrivers()]);
        setDispatchers(d);
        setTransporters(t);
        setDrivers(dr);
        
        // Auto-select dispatcher
        if (currentUser.role === 'dispatcher') {
          // If logged in as dispatcher, use their name
          setFormData(prev => ({ ...prev, dispatcher: currentUser.name }));
        } else if (d.length > 0) {
          // Otherwise default to first available
          setFormData(prev => ({ ...prev, dispatcher: d[0].name }));
        }
      } catch (e) {
        console.error("Failed to load options", e);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchData();
  }, [currentUser]);

  // Filter drivers based on selected transporter
  const availableDrivers = formData.transporterId 
    ? drivers.filter(d => d.transporterId === formData.transporterId)
    : [];

  // Real-time preview calculations
  const gross = parseFloat(formData.gross) || 0;
  const gas = parseFloat(formData.gasAmount) || 0;
  const dispatchFee = gross * 0.12;
  const driverPay = (gross - dispatchFee - gas) * 0.5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      company: formData.company,
      gross: gross,
      miles: parseFloat(formData.miles) || 0,
      gasAmount: gas,
      gasNotes: formData.gasNotes,
      dropDate: formData.dropDate,
      dispatcher: formData.dispatcher,
      transporterId: formData.transporterId,
      driverId: formData.driverId,
      origin: formData.origin,
      destination: formData.destination,
      status: 'Pending'
    });
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Add New Load</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
          {loadingOptions && (
            <div className="mb-4 text-xs text-blue-500 animate-pulse">Loading fleet options...</div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Primary Details */}
            <div className="col-span-2 space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Load Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Broker / Customer</label>
                  <input
                    required
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g. RXO"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Drop Date</label>
                  <input
                    required
                    name="dropDate"
                    type="date"
                    value={formData.dropDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Fleet & Dispatch */}
            <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dispatcher</label>
                  <select
                    name="dispatcher"
                    required
                    value={formData.dispatcher}
                    onChange={handleChange}
                    // Disable changing dispatcher if you are a dispatcher
                    disabled={currentUser.role === 'dispatcher'} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">Select...</option>
                    {dispatchers.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Carrier</label>
                  <select
                    name="transporterId"
                    value={formData.transporterId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Select Carrier...</option>
                    {transporters.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Driver</label>
                  <select
                    name="driverId"
                    value={formData.driverId}
                    onChange={handleChange}
                    disabled={!formData.transporterId}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">{formData.transporterId ? 'Select Driver...' : 'Select Carrier First'}</option>
                    {availableDrivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
               </div>
            </div>

            {/* Financials */}
            <div className="col-span-2 space-y-4">
               <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Financials</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gross ($)</label>
                  <input
                    required
                    name="gross"
                    type="number"
                    step="0.01"
                    value={formData.gross}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Miles</label>
                  <input
                    required
                    name="miles"
                    type="number"
                    value={formData.miles}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
                 <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gas Advance ($)</label>
                  <input
                    required
                    name="gasAmount"
                    type="number"
                    step="0.01"
                    value={formData.gasAmount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gas Notes</label>
                  <input
                    name="gasNotes"
                    type="text"
                    value={formData.gasNotes}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. 500+100"
                  />
                </div>
               </div>
            </div>

            {/* Route */}
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Origin (From)</label>
                <input
                  required
                  name="origin"
                  type="text"
                  value={formData.origin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="City, ST"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Destination (To)</label>
                <input
                  required
                  name="destination"
                  type="text"
                  value={formData.destination}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="City, ST"
                />
              </div>
            </div>
            
            {/* Live Preview Card */}
            <div className="col-span-2 bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <Calculator size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-800 uppercase">Estimated Driver Pay</p>
                  <p className="text-xs text-blue-600">50% of (Gross - Dispatch 12% - Gas)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-900">
                  ${driverPay > 0 ? driverPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </p>
                <p className="text-xs text-blue-600">Dispatch Fee: ${dispatchFee.toFixed(2)}</p>
              </div>
            </div>

          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              Save Load
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};