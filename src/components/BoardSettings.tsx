import React from 'react';
import { Settings, Users, Lock } from 'lucide-react';

interface BoardSettingsProps {
  requireApproval: boolean;
  isOwner: boolean;
  onUpdateSettings: (settings: { requireApproval?: boolean }) => void;
}

export const BoardSettings: React.FC<BoardSettingsProps> = ({
  requireApproval,
  isOwner,
  onUpdateSettings
}) => {
  if (!isOwner) {
    return (
      <div className="text-center py-8">
        <Lock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">Only board owners can change settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <Settings className="w-5 h-5 text-slate-500" />
        <h3 className="font-semibold text-slate-800">Board Settings</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-slate-600" />
              <span className="font-medium text-slate-800">Require Approval for New Members</span>
            </div>
            <p className="text-sm text-slate-500">
              When enabled, new users will be added as "Pending" and require your approval before accessing the board.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => onUpdateSettings({ requireApproval: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>Current Setting:</strong> {requireApproval 
            ? 'New members require approval before accessing this board.' 
            : 'New members can join immediately as viewers.'}
        </p>
      </div>
    </div>
  );
};
