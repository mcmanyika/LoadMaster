import React, { useState, useMemo, useEffect } from 'react';
import { DispatcherReport } from '../../types/reports';
import { ReportCard } from './ReportCard';
import { ReportDetailModal } from './ReportDetailModal';
import { exportToCSV, exportToPDF } from '../../services/reports/reportService';
import { ErrorModal } from '../ErrorModal';
import { Users, DollarSign, FileText, Download, FileDown, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DispatcherReportsProps {
  reports: DispatcherReport[];
  onSort?: (column: keyof DispatcherReport) => void;
  sortBy?: keyof DispatcherReport;
  sortDirection?: 'asc' | 'desc';
}

export const DispatcherReports: React.FC<DispatcherReportsProps> = ({
  reports,
  onSort,
  sortBy = 'totalFees',
  sortDirection = 'desc'
}) => {
  const [localSortBy, setLocalSortBy] = useState<keyof DispatcherReport>(sortBy);
  const [localSortDirection, setLocalSortDirection] = useState<'asc' | 'desc'>(sortDirection);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedReport, setSelectedReport] = useState<DispatcherReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalDispatchers = reports.length;
    const totalLoads = reports.reduce((sum, r) => sum + r.totalLoads, 0);
    const totalFees = reports.reduce((sum, r) => sum + r.totalFees, 0);
    const avgFeePerLoad = totalLoads > 0 ? totalFees / totalLoads : 0;

    return { totalDispatchers, totalLoads, totalFees, avgFeePerLoad };
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

  const handleSort = (column: keyof DispatcherReport) => {
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

  const getSortIcon = (column: keyof DispatcherReport) => {
    if (localSortBy !== column) {
      return <ArrowUpDown size={14} className="text-slate-400 ml-1" />;
    }
    return localSortDirection === 'asc' 
      ? <ArrowUp size={14} className="text-slate-600 ml-1" />
      : <ArrowDown size={14} className="text-slate-600 ml-1" />;
  };

  const handleExportCSV = () => {
    const csvData = sortedReports.map(r => ({
      'Dispatcher Name': r.dispatcherName,
      'Total Loads': r.totalLoads,
      'Total Fees': r.totalFees.toFixed(2),
      'Avg Fee/Load': r.avgFeePerLoad.toFixed(2),
      'Factored Loads': r.loadsByStatus.factored,
      'Not Factored Loads': r.loadsByStatus.notFactored
    }));
    const result = exportToCSV(csvData, `dispatcher-reports-${new Date().toISOString().split('T')[0]}`);
    if (!result.success && result.error) {
      setErrorModal({ isOpen: true, message: result.error });
    }
  };

  const handleExportPDF = () => {
    const result = exportToPDF(sortedReports, 'dispatcher', `dispatcher-reports-${new Date().toISOString().split('T')[0]}`);
    if (!result.success && result.error) {
      setErrorModal({ isOpen: true, message: result.error });
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard
          title="Total Dispatchers"
          value={summary.totalDispatchers}
          icon={<Users className="w-5 h-5 text-slate-400" />}
        />
        <ReportCard
          title="Total Loads"
          value={summary.totalLoads}
          icon={<FileText className="w-5 h-5 text-slate-400" />}
        />
        <ReportCard
          title="Total Dispatch Fees"
          value={`$${summary.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="w-5 h-5 text-slate-400" />}
        />
        <ReportCard
          title="Avg Fee/Load"
          value={`$${summary.avgFeePerLoad.toFixed(2)}`}
          subValue="Across all dispatchers"
          icon={<DollarSign className="w-5 h-5 text-slate-400" />}
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
                  onClick={() => handleSort('dispatcherName')}
                >
                  <div className="flex items-center">
                    Dispatcher Name
                    {getSortIcon('dispatcherName')}
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
                  onClick={() => handleSort('totalFees')}
                >
                  <div className="flex items-center justify-end">
                    Total Fees
                    {getSortIcon('totalFees')}
                  </div>
                </th>
                <th
                  className="p-4 font-semibold border-b border-slate-200 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  onClick={() => handleSort('avgFeePerLoad')}
                >
                  <div className="flex items-center justify-end">
                    Avg Fee/Load
                    {getSortIcon('avgFeePerLoad')}
                  </div>
                </th>
                <th className="p-4 font-semibold border-b border-slate-200 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No dispatcher data available for the selected date range
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report) => (
                  <tr 
                    key={report.dispatcherId} 
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      setSelectedReport(report);
                      setIsModalOpen(true);
                    }}
                  >
                    <td className="p-4 font-medium text-slate-800">{report.dispatcherName}</td>
                    <td className="p-4 text-right text-slate-600">{report.totalLoads}</td>
                    <td className="p-4 text-right">
                      <span className="font-semibold text-slate-800">
                        ${report.totalFees.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate-600">
                      ${report.avgFeePerLoad.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="text-slate-600">
                          F: {report.loadsByStatus.factored}
                        </span>
                        <span className="text-slate-600">
                          NF: {report.loadsByStatus.notFactored}
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
            of <span className="font-medium">{sortedReports.length}</span> dispatchers
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
                        ? 'bg-slate-600 text-white'
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
        type="dispatcher"
      />
      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />
    </div>
  );
};

