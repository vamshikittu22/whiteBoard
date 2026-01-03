import React from 'react';
import { useStore } from '../../store';
import { ToolType } from '../../types';
import { MousePointer2, Hand, Pen, Square, Circle, Type, StickyNote, Eraser, Image, Link } from 'lucide-react';

interface ToolButtonProps {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ 
  active, 
  onClick, 
  icon: Icon,
  label 
}) => (
  <button
    onClick={onClick}
    title={label}
    className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
        : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800'
    }`}
  >
    <Icon size={20} strokeWidth={2.5} />
  </button>
);

export const Toolbar = () => {
  const activeTool = useStore(s => s.activeTool);
  const setTool = useStore(s => s.setTool);

  const tools = [
    { type: ToolType.SELECT, icon: MousePointer2, label: 'Select (V)' },
    { type: ToolType.HAND, icon: Hand, label: 'Pan (H)' },
    { type: ToolType.PEN, icon: Pen, label: 'Pen (P)' },
    { type: ToolType.CONNECTOR, icon: Link, label: 'Connector (C)' },
    { type: ToolType.RECTANGLE, icon: Square, label: 'Rectangle (R)' },
    { type: ToolType.ELLIPSE, icon: Circle, label: 'Ellipse (O)' },
    { type: ToolType.TEXT, icon: Type, label: 'Text (T)' },
    { type: ToolType.STICKY, icon: StickyNote, label: 'Sticky Note (S)' },
    // Image tool is implied via Drag & Drop, but we add a button to trigger file dialog
    // For MVP Phase 2, we just use DnD, but keeping button for completeness if implemented later
    { type: ToolType.ERASER, icon: Eraser, label: 'Eraser (E)' },
  ];

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-xl border border-slate-200/50 z-50">
      {tools.map(tool => (
        <ToolButton
          key={tool.type}
          active={activeTool === tool.type}
          onClick={() => setTool(tool.type)}
          icon={tool.icon}
          label={tool.label}
        />
      ))}
      <div className="h-px bg-slate-200 my-1" />
      <div 
        className="p-3 rounded-xl bg-white text-slate-500 hover:bg-slate-50 flex items-center justify-center cursor-pointer"
        title="Drag & Drop images to upload"
      >
        <Image size={20} />
      </div>
    </div>
  );
};