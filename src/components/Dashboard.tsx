import React, { useState } from 'react';
import { useStore } from '../store';
import { Plus, LayoutGrid, MoreVertical, Trash2, LogOut } from 'lucide-react';
import { cn } from '../utils';

export const Dashboard = () => {
  const { boards, createBoard, openBoard, deleteBoard, currentUser, login } = useStore();
  const [newBoardName, setNewBoardName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBoardName.trim()) {
      createBoard(newBoardName);
      setNewBoardName('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">C</div>
          <h1 className="font-semibold text-slate-700 text-lg">CollabCanvas</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold border border-indigo-200">
                {currentUser?.name[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700">{currentUser?.name}</span>
           </div>
           <button 
             onClick={() => { localStorage.removeItem('cc_user'); window.location.reload(); }}
             className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
           >
             <LogOut className="w-5 h-5" />
           </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="flex justify-between items-end mb-8">
           <div>
             <h2 className="text-3xl font-bold text-slate-900 mb-2">Your Boards</h2>
             <p className="text-slate-500">Manage your drawings and collaborations.</p>
           </div>
           
           <form onSubmit={handleCreate} className="flex gap-2">
             <input 
               type="text" 
               value={newBoardName}
               onChange={e => setNewBoardName(e.target.value)}
               placeholder="New board name..."
               className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 w-64"
             />
             <button 
               type="submit"
               disabled={!newBoardName.trim()}
               className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm font-medium"
             >
               <Plus className="w-4 h-4" />
               Create
             </button>
           </form>
        </div>

        {boards.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
            <LayoutGrid className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-900 mb-2">No boards yet</h3>
            <p className="text-slate-500">Create your first board to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map(board => (
              <div key={board.id} className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-indigo-100 transition-all duration-300 cursor-pointer relative" onClick={() => openBoard(board.id)}>
                <div className="aspect-video bg-slate-50 rounded-lg mb-4 border border-slate-100 flex items-center justify-center overflow-hidden">
                   {/* Thumbnail placeholder */}
                   <div className="opacity-10 grid grid-cols-4 gap-4 rotate-12 scale-150">
                      {[...Array(12)].map((_, i) => (
                        <div key={i} className="w-12 h-12 bg-slate-400 rounded-md" />
                      ))}
                   </div>
                </div>
                <div className="flex justify-between items-start">
                   <div>
                     <h3 className="font-semibold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{board.name}</h3>
                     <p className="text-xs text-slate-400 mt-1">Last edited {new Date(board.updatedAt).toLocaleDateString()}</p>
                   </div>
                   <button 
                     onClick={(e) => { e.stopPropagation(); deleteBoard(board.id); }}
                     className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
