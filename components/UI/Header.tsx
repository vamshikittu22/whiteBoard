import React from 'react';
import { useStore } from '../../store';
import { Users, Share2, Menu, Download, Loader2, Shield, Wifi, WifiOff } from 'lucide-react';
import { COLORS } from '../../types';

export const Header = () => {
  const peers = useStore(s => s.peers);
  const currentUser = useStore(s => s.currentUser);
  const objects = useStore(s => s.objects);
  const isExporting = useStore(s => s.isExporting);
  const triggerExport = useStore(s => s.triggerExport);
  const toggleAdmin = useStore(s => s.toggleAdmin);
  const offlineMode = useStore(s => s.offlineMode);
  const setOfflineMode = useStore(s => s.setOfflineMode);
  
  const setShareOpen = useStore(s => s.setShareOpen);
  const setMenuOpen = useStore(s => s.setMenuOpen);
  const isMenuOpen = useStore(s => s.isMenuOpen);
  
  const handleExport = () => {
    triggerExport();
  };

  return (
    <div className="absolute top-4 left-4 right-4 h-14 bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-4">
        <div 
          onClick={() => setMenuOpen(!isMenuOpen)}
          className={`p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors ${isMenuOpen ? 'bg-slate-100 text-blue-600' : 'text-slate-600'}`}
        >
          <Menu size={20} />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-sm">Product Roadmap Q3</h1>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${offlineMode ? 'bg-orange-400' : 'bg-green-500'}`} />
            <p className="text-xs text-slate-500">{offlineMode ? 'Offline Mode' : 'Connected'}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex -space-x-2">
           {currentUser && (
             <div 
               className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm"
               style={{ backgroundColor: currentUser.color }}
               title={`${currentUser.name} (You)`}
             >
               {currentUser.name[0]}
             </div>
           )}
           {peers.map(p => (
             <div 
               key={p.id}
               className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm"
               style={{ backgroundColor: p.color }}
               title={p.name}
             >
               {p.name[0]}
             </div>
           ))}
           <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs text-slate-500 hover:bg-slate-200 cursor-pointer">
             <Users size={14} />
           </div>
        </div>

        <div className="h-6 w-px bg-slate-200" />
        
        {/* Offline Toggle */}
        <button
          onClick={() => setOfflineMode(!offlineMode)}
          className={`p-2 rounded-lg transition-colors ${offlineMode ? 'text-orange-500 bg-orange-50' : 'text-slate-400 hover:bg-slate-100'}`}
          title={offlineMode ? "Go Online" : "Go Offline (Simulate)"}
        >
          {offlineMode ? <WifiOff size={18} /> : <Wifi size={18} />}
        </button>

        {/* Admin Trigger */}
        <button 
          onClick={toggleAdmin}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Admin Settings"
        >
          <Shield size={18} />
        </button>

        <button 
          onClick={handleExport}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
          title="Export PNG (Async)"
          disabled={isExporting}
        >
          {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        </button>

        <button 
          onClick={() => setShareOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
        >
          <Share2 size={16} />
          Share
        </button>
      </div>
    </div>
  );
};