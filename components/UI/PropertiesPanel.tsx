import React from 'react';
import { useStore } from '../../store';
import { COLORS } from '../../types';
import { Lock, Unlock } from 'lucide-react';

export const PropertiesPanel = () => {
  const { strokeColor, strokeWidth, fillColor, selectedIds, objects, toggleLock, currentUser } = useStore();
  
  // Logic to determine if we show properties or selection specific info
  const selectionCount = selectedIds.length;
  const singleSelection = selectionCount === 1 ? objects[selectedIds[0]] : null;

  return (
    <div className="absolute top-20 right-4 w-60 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 p-4 z-50">
      
      {singleSelection && (
         <div className="mb-4 pb-4 border-b border-slate-100">
           <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selected</h3>
              <button 
                onClick={() => toggleLock(singleSelection.id)}
                className={`p-1.5 rounded transition-colors ${singleSelection.locked ? 'bg-red-100 text-red-600' : 'text-slate-400 hover:bg-slate-100'}`}
                title={singleSelection.locked ? "Unlock Object" : "Lock Object"}
              >
                {singleSelection.locked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
           </div>
           {singleSelection.locked && (
             <p className="text-[10px] text-red-500 mt-1">
               Locked by {singleSelection.lockedBy === currentUser?.id ? 'You' : 'Admin'}
             </p>
           )}
         </div>
      )}

      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Styles</h3>
      
      <div className="mb-4">
        <label className="text-xs text-slate-500 mb-2 block">Stroke</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.slice(0, 8).map(c => (
            <button
              key={c}
              className={`w-6 h-6 rounded-full border border-slate-200 transition-transform ${strokeColor === c ? 'scale-110 ring-2 ring-blue-500 ring-offset-2' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => useStore.setState({ strokeColor: c })}
            />
          ))}
        </div>
      </div>

      <div className="mb-4">
         <label className="text-xs text-slate-500 mb-2 block">Width</label>
         <input 
           type="range" 
           min="1" 
           max="20" 
           value={strokeWidth}
           onChange={(e) => useStore.setState({ strokeWidth: parseInt(e.target.value) })}
           className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
         />
      </div>

      <div>
        <label className="text-xs text-slate-500 mb-2 block">Fill</label>
        <div className="flex gap-2">
            <button
              className={`w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center ${fillColor === 'transparent' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
              onClick={() => useStore.setState({ fillColor: 'transparent' })}
            >
              <div className="w-full h-px bg-red-500 rotate-45" />
            </button>
             {COLORS.slice(0, 5).map(c => (
            <button
              key={c + 'fill'}
              className={`w-6 h-6 rounded-full border border-slate-200 transition-transform ${fillColor === c ? 'scale-110 ring-2 ring-blue-500 ring-offset-2' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => useStore.setState({ fillColor: c })}
            />
          ))}
        </div>
      </div>
    </div>
  );
};