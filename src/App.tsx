import React, { useEffect, useState } from 'react';
import { KonvaBoard } from './components/Canvas/KonvaBoard';
import { Toolbar } from './components/Toolbar';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { useStore } from './store';
import { ChevronLeft, Users, Share2, Copy, Check, X, Activity, Settings } from 'lucide-react';
import { UserState } from './types';
import { MemberManager } from './components/MemberManager';
import { ToastContainer } from './components/Toast';
import { BoardSettings } from './components/BoardSettings';
import { ActivityPanel } from './components/ActivityPanel';

export default function App() {
   const { 
      view, viewport, exitBoard, peers, currentUser, items, currentBoardId, 
      currentUserRole, boardMembers, loadBoardMembers, updateMemberRole, removeMember,
      toasts, removeToast, addToast, activityEvents, loadActivity, requestEditAccess, updateBoardSettings
   } = useStore();

    // Share modal state - MUST be before any conditional returns
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Activity panel state
    const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);

    // Share modal tabs state (includes 'settings')
    const [activeTab, setActiveTab] = useState<'share' | 'members' | 'settings'>('share');

    // Board settings state
    const [boardSettings, setBoardSettings] = useState({ requireApproval: false });

   // Hydration check
   const [mounted, setMounted] = useState(false);
   useEffect(() => setMounted(true), []);
   if (!mounted) return null;

   const handleShare = () => {
      setIsShareModalOpen(true);
      setCopied(false);
   };

   const handleCopyLink = () => {
      const url = `${window.location.origin}/board/${currentBoardId}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
   };

    const closeModal = () => {
       setIsShareModalOpen(false);
       setCopied(false);
       setActiveTab('share');
    };

    const isOwner = currentUserRole === 'OWNER';
    const isViewer = currentUserRole === 'VIEWER';

    // Handler for requesting edit access
    const handleRequestEditAccess = async () => {
       if (!currentBoardId) return;
       try {
          await requestEditAccess(currentBoardId);
       } catch (error) {
          console.error('Failed to request edit access:', error);
       }
    };

    // Handler for updating board settings
    const handleUpdateBoardSettings = async (settings: { requireApproval: boolean }) => {
       if (!currentBoardId) return;
       try {
          await updateBoardSettings(currentBoardId, settings);
          setBoardSettings(settings);
       } catch (error) {
          console.error('Failed to update board settings:', error);
       }
    };

    // Activity panel handlers
    const handleOpenActivityPanel = () => {
       setIsActivityPanelOpen(true);
       if (currentBoardId) {
          loadActivity(currentBoardId);
       }
    };

    const handleCloseActivityPanel = () => {
       setIsActivityPanelOpen(false);
    };

    // Load members when opening members tab
    const handleTabChange = (tab: 'share' | 'members' | 'settings') => {
       setActiveTab(tab);
       if (tab === 'members' && isOwner && currentBoardId) {
          loadBoardMembers(currentBoardId);
       }
    };

   // Handle role change
   const handleRoleChange = async (userId: string, newRole: string) => {
      if (!currentBoardId) return;
      try {
         await updateMemberRole(currentBoardId, userId, newRole);
      } catch (error) {
         console.error('Failed to update role:', error);
      }
   };

   // Handle member removal
   const handleRemoveMember = async (userId: string) => {
      if (!currentBoardId) return;
      if (!confirm('Are you sure you want to remove this member?')) return;
      try {
         await removeMember(currentBoardId, userId);
      } catch (error) {
         console.error('Failed to remove member:', error);
      }
   };

   if (view === 'login') return <Login />;
   if (view === 'dashboard') return <Dashboard />;

    return (
       <div className="relative w-screen h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
          {/* Toast Container */}
          <ToastContainer toasts={toasts} onRemove={removeToast} />

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
                {currentUserRole && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    currentUserRole === 'OWNER' ? 'bg-purple-100 text-purple-700' :
                    currentUserRole === 'EDITOR' ? 'bg-blue-100 text-blue-700' :
                    currentUserRole === 'VIEWER' ? 'bg-gray-100 text-gray-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {currentUserRole === 'PENDING' ? '⏳ Pending' : currentUserRole}
                  </span>
                )}
             </div>

            {/* Right: Presence & Share */}
            <div className="pointer-events-auto flex items-center gap-3">
               {/* Avatars */}
               <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700" title="You">
                     {currentUser?.name[0]}
                  </div>
                  {Object.values(peers).map((peer: UserState) => (
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

                {/* Activity Button */}
                <button
                   onClick={handleOpenActivityPanel}
                   className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                   <Activity className="w-4 h-4" />
                   Activity
                </button>

                {/* Request Edit Access Button - Only for VIEWERs */}
                {isViewer && (
                   <button
                      onClick={handleRequestEditAccess}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors"
                   >
                      Request Edit Access
                   </button>
                )}

                <button 
                   onClick={handleShare}
                   className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg"
                >
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

           {/* Share Modal */}
           {isShareModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={closeModal}>
                 <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-200">
                       <h2 className="text-xl font-semibold text-slate-800">Board Sharing</h2>
                       <button onClick={closeModal} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                          <X className="w-5 h-5 text-slate-500" />
                       </button>
                    </div>

                     {/* Tabs */}
                     <div className="flex border-b border-slate-200">
                        <button
                           onClick={() => handleTabChange('share')}
                           className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                              activeTab === 'share'
                                 ? 'text-slate-900 border-b-2 border-slate-900'
                                 : 'text-slate-500 hover:text-slate-700'
                           }`}
                        >
                           Share Link
                        </button>
                        <button
                           onClick={() => handleTabChange('members')}
                           className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                              activeTab === 'members'
                                 ? 'text-slate-900 border-b-2 border-slate-900'
                                 : 'text-slate-500 hover:text-slate-700'
                           }`}
                        >
                           Members ({boardMembers.length})
                        </button>
                        {isOwner && (
                           <button
                              onClick={() => handleTabChange('settings')}
                              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                                 activeTab === 'settings'
                                    ? 'text-slate-900 border-b-2 border-slate-900'
                                    : 'text-slate-500 hover:text-slate-700'
                              }`}
                           >
                              Settings
                           </button>
                        )}
                     </div>

                     {/* Tab Content */}
                     <div className="p-6 overflow-y-auto max-h-[50vh]">
                        {activeTab === 'share' ? (
                           <div>
                              <p className="text-slate-600 mb-4">Invite others to collaborate on this board by sharing the link below.</p>
                              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                 <input
                                    type="text"
                                    value={`${window.location.origin}/board/${currentBoardId}`}
                                    readOnly
                                    className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
                                 />
                                 <button
                                    onClick={handleCopyLink}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                                 >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                 </button>
                              </div>
                              <div className="mt-4 text-xs text-slate-500">
                                 <p>• Anyone with the link can join as a viewer</p>
                                 <p>• Only the owner can grant editing permissions</p>
                              </div>
                           </div>
                        ) : activeTab === 'members' ? (
                           <MemberManager
                              members={boardMembers}
                              currentUserRole={currentUserRole || 'VIEWER'}
                              onRoleChange={handleRoleChange}
                              onRemoveMember={handleRemoveMember}
                           />
                        ) : (
                            <BoardSettings
                               requireApproval={boardSettings.requireApproval}
                               isOwner={isOwner}
                               onUpdateSettings={handleUpdateBoardSettings}
                            />
                        )}
                     </div>
                  </div>
               </div>
            )}

             {/* Activity Panel */}
             {isActivityPanelOpen && (
                <ActivityPanel
                   onClose={handleCloseActivityPanel}
                   events={activityEvents}
                />
             )}

        </div>
     );
}
