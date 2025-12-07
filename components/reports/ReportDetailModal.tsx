import React from 'react';
import { DriverReport, DispatcherReport } from '../../types/reports';
import { X, Calendar, DollarSign, MapPin, FileText, Truck, Users } from 'lucide-react';

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DriverReport | DispatcherReport | null;
  type: 'driver' | 'dispatcher';
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  onClose,
  report,
  type
}) => {
  if (!isOpen || !report) return null;

  const isDriver = type === 'driver';
  const driverReport = isDriver ? (report as DriverReport) : null;
  const dispatcherReport = !isDriver ? (report as DispatcherReport) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDriver ? (
              <Truck className="w-6 h-6 text-slate-600" />
            ) : (
              <Users className="w-6 h-6 text-slate-600" />
            )}
            <h2 className="text-2xl font-bold text-slate-800">
              {isDriver ? driverReport?.driverName : dispatcherReport?.dispatcherName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-600">Total Loads</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {isDriver ? driverReport?.totalLoads : dispatcherReport?.totalLoads}
              </p>
            </div>

            {isDriver ? (
              <>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-600">Total Pay</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    ${driverReport?.totalPay.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-600">Total Miles</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    {driverReport?.totalMiles.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-600">Avg Rate/Mile</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    ${driverReport?.avgRatePerMile.toFixed(2)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-600">Total Fees</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    ${dispatcherReport?.totalFees.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-600">Avg Fee/Load</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    ${dispatcherReport?.avgFeePerLoad.toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-600">Status</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    F: {dispatcherReport?.loadsByStatus.factored} | NF: {dispatcherReport?.loadsByStatus.notFactored}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Status Breakdown */}
          {isDriver && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-3">Load Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Factored:</span>
                    <span className="font-semibold text-slate-800">
                      {driverReport?.loadsByStatus.factored}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Not Factored:</span>
                    <span className="font-semibold text-slate-800">
                      {driverReport?.loadsByStatus.notFactored}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-3">Payout Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pending:</span>
                    <span className="font-semibold text-slate-600">
                      {driverReport?.payoutStatus.pending}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Paid:</span>
                    <span className="font-semibold text-slate-800">
                      {driverReport?.payoutStatus.paid}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Partial:</span>
                    <span className="font-semibold text-slate-800">
                      {driverReport?.payoutStatus.partial}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loads List */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-4">Load Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-slate-600">Date</th>
                    <th className="p-3 text-left text-sm font-semibold text-slate-600">Origin</th>
                    <th className="p-3 text-left text-sm font-semibold text-slate-600">Destination</th>
                    <th className="p-3 text-right text-sm font-semibold text-slate-600">Gross</th>
                    <th className="p-3 text-right text-sm font-semibold text-slate-600">Miles</th>
                    {isDriver ? (
                      <>
                        <th className="p-3 text-right text-sm font-semibold text-slate-600">Driver Pay</th>
                        <th className="p-3 text-center text-sm font-semibold text-slate-600">Status</th>
                        <th className="p-3 text-center text-sm font-semibold text-slate-600">Payout</th>
                      </>
                    ) : (
                      <>
                        <th className="p-3 text-right text-sm font-semibold text-slate-600">Dispatch Fee</th>
                        <th className="p-3 text-center text-sm font-semibold text-slate-600">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(isDriver ? driverReport?.loads : dispatcherReport?.loads)?.map((load) => (
                    <tr key={load.id} className="hover:bg-slate-50">
                      <td className="p-3 text-sm text-slate-600">
                        {new Date(load.dropDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-sm text-slate-800">{load.origin}</td>
                      <td className="p-3 text-sm text-slate-800">{load.destination}</td>
                      <td className="p-3 text-sm text-right text-slate-600">
                        ${load.gross.toFixed(2)}
                      </td>
                      <td className="p-3 text-sm text-right text-slate-600">
                        {load.miles.toLocaleString()}
                      </td>
                      {isDriver ? (
                        <>
                          <td className="p-3 text-sm text-right font-semibold text-slate-800">
                            ${load.driverPay.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              load.status === 'Factored' 
                                ? 'bg-slate-100 text-slate-800' 
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {load.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              load.driverPayoutStatus === 'paid' 
                                ? 'bg-slate-100 text-slate-800' 
                                : load.driverPayoutStatus === 'partial'
                                ? 'bg-slate-100 text-slate-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {load.driverPayoutStatus === 'paid' ? 'Paid' :
                               load.driverPayoutStatus === 'partial' ? 'Partial' : 'Pending'}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 text-sm text-right font-semibold text-slate-800">
                            ${load.dispatchFee.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              load.status === 'Factored' 
                                ? 'bg-slate-100 text-slate-800' 
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {load.status}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

