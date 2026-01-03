import React, { useState } from 'react';
import { useStore } from '../../store';
import { Search, History, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { BoardObject } from '../../types';

export const HistoryPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Simulated Search Results
  const objects = useStore(s => s.objects);
  
  const searchResults = (Object.values(objects) as BoardObject[]).filter(obj => {
    if (!searchQuery) return false;
    if (obj.type === 'text' || obj.type === 'sticky') {
      return obj.text.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return false;
  });

  return (
    <div className={`absolute top-20 left-4 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 transition-all z-50 overflow-hidden flex flex-col ${isOpen ? 'w-80 h-96' : 'w-12 h-12'}`}>
      
      {/* Toggle Button */}
      <button 
        className="absolute top-0 left-0 w-12 h-12 flex items-center justify-center text-slate-500 hover:text-slate-800"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Search size={20} />
      </button>

      {/* Content */}
      <div className={`pt-14 px-4 pb-4 flex flex-col h-full ${!isOpen && 'opacity-0 pointer-events-none'}`}>
        
        {/* Search Bar */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Search Board</h3>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Find text..." 
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          </div>
          {/* Results List */}
          {searchQuery && (
            <div className="mt-2 max-h-32 overflow-y-auto bg-slate-50 rounded-lg border border-slate-100 p-2">
              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-400 p-2">No results found.</p>
              ) : (
                searchResults.map(obj => (
                  <div 
                    key={obj.id} 
                    className="p-2 hover:bg-white rounded cursor-pointer text-xs text-slate-700 truncate border-b border-transparent hover:border-slate-100"
                    onClick={() => {
                      // Pan to object
                      useStore.getState().setViewport({ x: -obj.x * useStore.getState().viewport.zoom + 200, y: -obj.y * useStore.getState().viewport.zoom + 200 });
                      useStore.getState().selectObjects([obj.id]);
                    }}
                  >
                    {(obj.type === 'text' || obj.type === 'sticky') ? obj.text : 'Object'}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* History / Timeline */}
        <div className="mt-auto border-t border-slate-100 pt-4">
           <div className="flex items-center justify-between mb-2">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">History</h3>
             <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">SEQ: 142</span>
           </div>
           
           <div className="flex items-center gap-2 mb-2 justify-center">
             <button className="p-1 hover:bg-slate-100 rounded"><SkipBack size={16} className="text-slate-600"/></button>
             <button 
               className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-500/30"
               onClick={() => setIsPlaying(!isPlaying)}
             >
               {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
             </button>
             <button className="p-1 hover:bg-slate-100 rounded"><SkipForward size={16} className="text-slate-600"/></button>
           </div>

           <input type="range" className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
           <p className="text-[10px] text-center text-slate-400 mt-2">Time Travel (Preview)</p>
        </div>

      </div>
    </div>
  );
};