import React, { useState, useMemo, useEffect } from 'react';
import { DriverReport } from '../../types/reports';
import { ReportCard } from './ReportCard';
import { ReportDetailModal } from './ReportDetailModal';
import { exportToCSV, exportToPDF } from '../../services/reports/reportService';
import { Truck, DollarSign, MapPin, FileText, Download, FileDown, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DriverReportsProps {
  reports: DriverReport[];
  onSort?: (column: keyof DriverReport) => void;
  sortBy?: keyof DriverReport;
  sortDirection?: 'asc' | 'desc';
}

export const DriverReports: React.FC<DriverReportsProps> = ({
  reports,
  onSort,
  sortBy = 'totalPay',
  sortDirection = 'desc'
}) => {
  const [localSortBy, setLocalSortBy] = useState<keyof DriverReport>(sortBy);
  const [localSortDirection, setLocalSortDirection] = useState<'asc' | 'desc'>(sortDirection);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedReport, setSelectedReport] = useState<DriverReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalDrivers = reports.length;
    const totalLoads = reports.reduce((sum, r) => sum + r.totalLoads, 0);
    const totalPay = reports.reduce((sum, r) => sum + r.totalPay, 0);
    const totalMiles = reports.reduce((sum, r) => sum + r.totalMiles, 0);
    const avgRPM = totalMiles > 0 ? totalPay / totalMiles : 0;

    return { totalDrivers, totalLoads, totalPay, totalMiles, avgRPM };
  }, [reports]);

  // Sort reports
  const sortedReports = useMemo(() => {
    const sorted = [...reports];
    sorted.sort((a, b) => {
      const aVal = a[localSortBy];
      const bVal = b[localSortBy];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return localSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return localSortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return 0;
    });
    return sorted;
  }, [reports, localSortBy, localSortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedReports.length / itemsPerPage);
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedReports.slice(startIndex, endIndex);
  }, [sortedReports, currentPage, itemsPerPage]);

  // Reset to page 1 when reports change
  useEffect(() => {
    setCurrentPage(1);
  }, [reports.length]);

  const handleSort = (column: keyof DriverReport) => {
    if (localSortBy === column) {
      setLocalSortDirection(localSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setLocalSortBy(column);
      setLocalSortDirection('desc');
    }
    if (onSort) {
      onSort(column);
    }
  };

  const getSortIcon = (column: keyof DriverReport) => {
    if (localSortBy !== column) {
      return <ArrowUpDown size={14} className="text-slate-400 ml-1" />;
    }
    return localSortDirection === 'asc' 
      ? <ArrowUp size={14} className="text-blue-600 ml-1" />
      : <ArrowDown size={14} className="text-blue-600 ml-1" />;
  };

  const handleExportCSV = () => {
    const csvData = sortedReports.map(r => ({
      'Driver Name': r.driverName,
      'Total Loads': r.totalLoads,
      'Total Pay': r.totalPay.toFixed(2),
      'Total Miles': r.totalMiles,
      'Avg Rate/Mile': r.avgRatePerMile.toFixed(2),
      'Factored Loads': r.loadsByStatus.factored,
      'Not Factored Loads': r.loadsByStatus.notFactored,
      'Pending Payouts': r.payoutStatus.pending,
      'Paid Payouts': r.payoutStatus.paid,
      'Partial Payouts': r.payoutStatus.partial
    }));
    exportToCSV(csvData, `driver-reports-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
    exportToPDF(sortedReports, 'driver', `driver-reports-${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <ReportCard
          title="Total Drivers"
          value={summary.totalDrivers}
          icon={<Truck className="w-5 h-5 text-slate-400" />}
        />
        <ReportCard
          title="Total Loads"
          value={summary.totalLoads}
          icon={<FileText className="w-5 h-5 text-slate-400" />}
        />
        <ReportCard
          title="Total Driver Pay"
          value={`$${summary.totalPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          colorClass="bg-emerald-50"
        />
        <ReportCard
          title="Total Miles"
          value={summary.totalMiles.toLocaleString()}
          icon={<MapPin className="w-5 h-5 text-blue-400" />}
          colorClass="bg-blue-50"
        />
        <ReportCard
          title="Avg Rate/Mile"
          value={`$${summary.avgRPM.toFixed(2)}`}
          subValue="Across all drivers"
          icon={<DollarSign className="w-5 h-5 text-purple-400" />}
          colorClass="bg-purple-50"
        />
      </div>

      {/* Export Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          <Download size={16} />
          Export CSV
        </button>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          <FileDown size={16} />
          Export PDF
        </button>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th
                  className="p-4 font-semibold border-b border-slate-200 text-left cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  onClick={() => handleSort('driverName')}
                >
                  <div className="flex items-center">
                    Driver Name
                    {getSortIcon('driverName')}
                  </div>
                </th>
                <th
                  className="p-4 font-semibold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  onClick={() => handleSort('totalLoads')}
                >
                  <div className="flex items-center justify-end">
                    Total Loads
                    {getSortIcon('totalLoads')}
                  </div>
                </th>
                <th
                  className="p-4 font-semibold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  onClick={() => handleSort('totalPay')}
                >
                  <div className="flex items-center justify-end">
                    Total Pay
                    {getSortIcon('totalPay')}
                  </div>
                </th>
                <th
                  className="p-4 font-semibold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  onClick={() => handleSort('totalMiles')}
                >
                  <div className="flex items-center justify-end">
                    Total Miles
                    {getSortIcon('totalMiles')}
                  </div>
                </th>
                <th
                  className="p-4 font-semibold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  onClick={() => handleSort('avgRatePerMile')}
                >
                  <div className="flex items-center justify-end">
                    Avg Rate/Mile
                    {getSortIcon('avgRatePerMile')}
                  </div>
                </th>
                <th className="p-4 font-semibold border-b border-slate-200 text-center">Status</th>
                <th className="p-4 font-semibold border-b border-slate-200 text-center">Payout</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No driver data available for the selected date range
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report) => (
                  <tr 
                    key={report.driverId} 
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      setSelectedReport(report);
                      setIsModalOpen(true);
                    }}
                  >
                    <td className="p-4 font-medium text-slate-800">{report.driverName}</td>
                    <td className="p-4 text-right text-slate-600">{report.totalLoads}</td>
                    <td className="p-4 text-right">
                      <span className="font-semibold text-emerald-600">
                        ${report.totalPay.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate-600">
                      {report.totalMiles.toLocaleString()}
                    </td>
                    <td className="p-4 text-right text-slate-600">
                      ${report.avgRatePerMile.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="text-emerald-600">
                          F: {report.loadsByStatus.factored}
                        </span>
                        <span className="text-amber-600">
                          NF: {report.loadsByStatus.notFactored}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="text-slate-600">
                          P: {report.payoutStatus.pending}
                        </span>
                        <span className="text-green-600">
                          Paid: {report.payoutStatus.paid}
                        </span>
                        <span className="text-yellow-600">
                          Part: {report.payoutStatus.partial}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {sortedReports.length > itemsPerPage && (
        <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, sortedReports.length)}
            </span>{' '}
            of <span className="font-medium">{sortedReports.length}</span> drivers
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <ChevronLeft size={16} className="text-slate-600" />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <ChevronRight size={16} className="text-slate-600" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <ReportDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        report={selectedReport}
        type="driver"
      />
    </div>
  );
};

