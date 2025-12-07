import React from 'react';
import { X, AlertCircle } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  message: string;
  title?: string;
  onClose: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, message, title = 'Error', onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-red-50 px-6 py-4 flex justify-between items-center border-b border-red-100">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle size={20} className="text-red-600" />
            <h2 className="font-bold text-lg">{title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-slate-700 mb-6">{message}</p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

