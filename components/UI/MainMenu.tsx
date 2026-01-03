import React from 'react';
import { useStore } from '../../store';
import { X, FileText, Save, Settings, LogOut, FolderOpen } from 'lucide-react';

export const MainMenu = () => {
  const { isMenuOpen, setMenuOpen, setCurrentUser, toggleAdmin } = useStore();

  if (!isMenuOpen) return null;

  return (
    <>
      {/* Backdrop to close on click outside */}
      <div 
        className="absolute inset-0 z-[90]" 
        onClick={() => setMenuOpen(false)}
      />
      
      <div className="absolute top-16 left-4 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-[100] overflow-hidden animate-in slide-in-from-top-2 duration-200">
        <div className="p-2 space-y-1">
          <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            File
          </div>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left">
            <FileText size={16} className="text-slate-400" />
            New Board
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left">
            <FolderOpen size={16} className="text-slate-400" />
            Open...
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left">
            <Save size={16} className="text-slate-400" />
            Save as Template
          </button>
          
          <div className="h-px bg-slate-100 my-2" />
          
          <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Settings
          </div>
          <button 
            onClick={() => { setMenuOpen(false); toggleAdmin(); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
          >
            <Settings size={16} className="text-slate-400" />
            Admin & Preferences
          </button>
          
          <div className="h-px bg-slate-100 my-2" />
          
          <button 
            onClick={() => window.location.reload()}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </>
  );
};