import React from 'react';
import { BoardMember } from '../types';
import { Shield, Pencil, Eye, Clock, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '../utils';

interface MemberManagerProps {
  members: BoardMember[];
  currentUserRole: string;
  onRoleChange: (userId: string, role: string) => void;
  onRemoveMember: (userId: string) => void;
}

type Role = 'OWNER' | 'EDITOR' | 'VIEWER' | 'PENDING';

const roleConfig: Record<Role, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
  OWNER: {
    icon: Shield,
    label: 'Owner',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
  EDITOR: {
    icon: Pencil,
    label: 'Editor',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
  },
  VIEWER: {
    icon: Eye,
    label: 'Viewer',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
  },
  PENDING: {
    icon: Clock,
    label: 'Pending',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
  },
};

const roleOrder: Role[] = ['OWNER', 'EDITOR', 'VIEWER', 'PENDING'];

export function MemberManager({
  members,
  currentUserRole,
  onRoleChange,
  onRemoveMember,
}: MemberManagerProps) {
  const isOwner = currentUserRole === 'OWNER';

  const groupedMembers = members.reduce((acc, member) => {
    const role = member.role as Role;
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(member);
    return acc;
  }, {} as Record<Role, BoardMember[]>);

  const pendingMembers = groupedMembers['PENDING'] || [];
  const activeMembers = roleOrder
    .filter((role) => role !== 'PENDING')
    .flatMap((role) => groupedMembers[role] || []);

  return (
    <div className="space-y-6">
      {/* Active Members Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">
          Board Members ({activeMembers.length})
        </h3>
        <div className="space-y-2">
          {activeMembers.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No active members</p>
          ) : (
            roleOrder
              .filter((role) => role !== 'PENDING')
              .map((role) => {
                const roleMembers = groupedMembers[role] || [];
                if (roleMembers.length === 0) return null;

                return roleMembers.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isOwner={isOwner}
                    onRoleChange={onRoleChange}
                    onRemoveMember={onRemoveMember}
                  />
                ));
              })
          )}
        </div>
      </div>

      {/* Pending Approvals Section */}
      {pendingMembers.length > 0 && (
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-semibold text-orange-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending Approvals ({pendingMembers.length})
          </h3>
          <div className="space-y-2">
            {pendingMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isOwner={isOwner}
                onRoleChange={onRoleChange}
                onRemoveMember={onRemoveMember}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface MemberRowProps {
  member: BoardMember;
  isOwner: boolean;
  onRoleChange: (userId: string, role: string) => void;
  onRemoveMember: (userId: string) => void;
}

function MemberRow({ member, isOwner, onRoleChange, onRemoveMember }: MemberRowProps) {
  const role = member.role as Role;
  const config = roleConfig[role];
  const RoleIcon = config.icon;

  const canChangeRole = isOwner && role !== 'OWNER';
  const canRemove = isOwner && role !== 'OWNER';

  return (
    <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold border border-indigo-200 shrink-0">
          {member.user.name[0].toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-slate-900">{member.user.name}</p>
          <p className="text-sm text-slate-500">{member.user.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canChangeRole ? (
          <div className="relative">
            <select
              value={role}
              onChange={(e) => onRoleChange(member.userId, e.target.value)}
              className={cn(
                'appearance-none pl-3 pr-8 py-1.5 text-sm font-medium rounded-md border cursor-pointer',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
                config.bgColor,
                config.color,
                'border-current/20'
              )}
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
              <option value="PENDING">Pending</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-current" />
          </div>
        ) : (
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md',
              config.bgColor,
              config.color
            )}
          >
            <RoleIcon className="w-4 h-4" />
            {config.label}
          </div>
        )}

        {canRemove && (
          <button
            onClick={() => onRemoveMember(member.userId)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Remove member"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
