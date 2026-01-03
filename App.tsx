import React, { useState, useEffect } from 'react';
import { Whiteboard } from './components/Canvas/Whiteboard';
import { Toolbar } from './components/UI/Toolbar';
import { Header } from './components/UI/Header';
import { PropertiesPanel } from './components/UI/PropertiesPanel';
import { HistoryPanel } from './components/UI/HistoryPanel';
import { AdminPanel } from './components/UI/AdminPanel';
import { ShareModal } from './components/UI/ShareModal';
import { MainMenu } from './components/UI/MainMenu';
import { useStore } from './store';
import { nanoid } from 'nanoid';
import { COLORS } from './types';

function App() {
  const { currentUser, setCurrentUser, initBoard } = useStore();
  const [name, setName] = useState('');
  
  // Auth Simulation Screen
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-slate-100">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">CollabCanvas</h1>
            <p className="text-slate-500">Enter your name to join the session</p>
          </div>
          
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              
              const user = {
                id: nanoid(),
                name,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                isAdmin: name.toLowerCase().includes('admin') // Simple mock for Enterprise Role
              };
              
              setCurrentUser(user);
              initBoard('demo-board');
            }}
          >
            <input
              type="text"
              placeholder="Name (use 'admin' for superuser)"
              className="w-full p-3 rounded-lg border border-slate-200 mb-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-500/30"
            >
              Join Whiteboard
            </button>
          </form>
          
          <div className="mt-6 text-xs text-slate-400 text-center">
             <p>Simulating Backend: Node.js, WebSocket, Redis, PostgreSQL</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-slate-50">
      <Header />
      <Toolbar />
      <PropertiesPanel />
      <HistoryPanel />
      <AdminPanel />
      <ShareModal />
      <MainMenu />
      <Whiteboard />
    </div>
  );
}

export default App;