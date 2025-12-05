import React, { useState, useEffect } from 'react';
import { X, Save, Database, Trash2, CheckCircle2 } from 'lucide-react';
import { saveConnectionConfig, clearConnectionConfig, getCurrentConfig } from '../services/supabaseClient';

interface ConnectionModalProps {
  onClose: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({ onClose }) => {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isUsingDefault, setIsUsingDefault] = useState(false);

  useEffect(() => {
    // Check if we have manually saved keys
    const savedUrl = localStorage.getItem('sb_project_url');
    const savedKey = localStorage.getItem('sb_anon_key');

    if (savedUrl && savedKey) {
      setUrl(savedUrl);
      setKey(savedKey);
      setIsUsingDefault(false);
    } else {
      // If not, load the active config (which might be the hardcoded defaults)
      const config = getCurrentConfig();
      if (config.url) setUrl(config.url);
      if (config.key) setKey(config.key);
      setIsUsingDefault(true);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && key) {
      saveConnectionConfig(url, key);
      onClose();
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear your custom settings? This will revert to the default configuration.')) {
      clearConnectionConfig();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-white">
            <Database size={20} className="text-emerald-400" />
            <h2 className="font-bold text-lg">Database Connection</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {isUsingDefault ? (
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex items-start gap-2 text-xs text-emerald-800 mb-2">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
              <span>
                <strong>Connected via Default Config.</strong> <br/>
                The app is currently using the pre-configured database credentials. You can override them below if needed.
              </span>
            </div>
          ) : (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs text-blue-800 mb-2">
              You are using custom connection settings saved in this browser.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project URL</label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyz.supabase.co"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Anon Public Key</label>
            <input
              type="text"
              required
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJh..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
             <button 
              type="button" 
              onClick={handleClear}
              className={`text-sm font-medium flex items-center gap-1 ${!isUsingDefault ? 'text-rose-600 hover:text-rose-700' : 'text-slate-300 cursor-not-allowed'}`}
              disabled={isUsingDefault}
              title={isUsingDefault ? "Nothing to reset" : "Reset to default"}
            >
              <Trash2 size={16} />
              Reset to Default
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2 shadow-sm"
              >
                <Save size={16} />
                Save Custom
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};