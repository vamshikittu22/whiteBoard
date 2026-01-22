import React, { useEffect, useState } from 'react';
import { KonvaBoard } from './components/Canvas/KonvaBoard';
import { Toolbar } from './components/Toolbar';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { useStore } from './store';
import { ChevronLeft, Users, Share2 } from 'lucide-react';

export default function App() {
   const { view, viewport, exitBoard, peers, currentUser, items } = useStore();

   // Hydration check
   const [mounted, setMounted] = useState(false);
   useEffect(() => setMounted(true), []);
   if (!mounted) return null;

   if (view === 'login') return <Login />;
   if (view === 'dashboard') return <Dashboard />;

   return (
      <div className="relative w-screen h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">

         {/* --- UI Layer --- */}

         {/* Top Bar */}
         <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none z-50 flex items-center justify-between px-6">
            {/* Left: Back & Title */}
            <div className="pointer-events-auto flex items-center gap-4 glass px-4 py-2 rounded-xl">
               <button
                  onClick={exitBoard}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
               >
                  <ChevronLeft className="w-5 h-5" />
               </button>
               <div className="h-6 w-px bg-slate-200" />
               <h1 className="font-semibold text-slate-700">Board</h1>
               <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Live</span>
            </div>

            {/* Right: Presence & Share */}
            <div className="pointer-events-auto flex items-center gap-3">
               {/* Avatars */}
               <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700" title="You">
                     {currentUser?.name[0]}
                  </div>
                  {Object.values(peers).map(peer => (
                     <div key={peer.id} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700" style={{ backgroundColor: peer.color + '40', color: peer.color }} title={peer.name}>
                        {peer.name[0]}
                     </div>
                  ))}
                  {Object.keys(peers).length > 0 && (
                     <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-xs font-medium text-slate-500">
                        +{Object.keys(peers).length}
                     </div>
                  )}
               </div>

               <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg">
                  <Share2 className="w-4 h-4" />
                  Share
               </button>
            </div>
         </div>

         <Toolbar />

         {/* Main Canvas */}
         <KonvaBoard />

         {/* Bottom Info */}
         <div className="absolute bottom-6 right-6 flex flex-col gap-2 pointer-events-none z-40">
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 px-4 py-2 rounded-xl text-xs font-mono text-slate-500 shadow-sm text-right">
               {Object.keys(items).length} objects
            </div>
            <div className="bg-white/90 backdrop-blur-sm border border-slate-200 px-4 py-2 rounded-xl text-xs font-mono text-slate-500 shadow-sm text-right">
               Zoom: {Math.round(viewport.zoom * 100)}%
            </div>
         </div>

      </div>
   );
}
