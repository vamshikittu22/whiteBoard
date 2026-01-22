import React from 'react';
import { useStore } from '../store';
import { 
  MousePointer2, Hand, Square, Circle, PenTool, 
  Type, StickyNote, Eraser, Undo2, Redo2, Minus,
  Highlighter, Pen, Pencil
} from 'lucide-react';
import { ToolType } from '../types';
import { cn } from '../utils';

const tools: { id: ToolType; icon: React.FC<any>; label: string; shortcut: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'hand', icon: Hand, label: 'Pan', shortcut: 'H' },
  { id: 'pen', icon: PenTool, label: 'Pen', shortcut: 'P' },
  { id: 'rect', icon: Square, label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', icon: Circle, label: 'Circle', shortcut: 'O' },
  { id: 'sticky', icon: StickyNote, label: 'Sticky', shortcut: 'S' },
  { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
];

const COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#ef4444', label: 'Red' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Yellow' },
];

const STROKE_WIDTHS = [
  { value: 2, label: 'Thin' },
  { value: 4, label: 'Medium' },
  { value: 8, label: 'Thick' },
  { value: 16, label: 'Extra Thick' },
];

export const Toolbar = () => {
  const { 
    activeTool, setTool, undo, redo, past, future,
    defaultStyle, setStrokeColor, setStrokeWidth, setBrushPreset
  } = useStore();

  const showProperties = ['pen', 'rect', 'ellipse', 'text', 'select'].includes(activeTool);
  const isPen = activeTool === 'pen';

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex gap-4 z-50 items-start">
      
      <div className="flex flex-col gap-4">
        {/* Main Tools */}
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200 shadow-xl rounded-2xl p-2 flex flex-col gap-2">
          {tools.map((item) => (
            <button
              key={item.id}
              onClick={() => setTool(item.id)}
              className={cn(
                "p-3 rounded-xl transition-all duration-200 group relative flex items-center justify-center",
                activeTool === item.id 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-300" 
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon className="w-5 h-5" strokeWidth={2.5} />
              
              {/* Tooltip */}
              <span className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {item.label} <span className="opacity-50 ml-1">({item.shortcut})</span>
              </span>
            </button>
          ))}
        </div>

        {/* History Controls */}
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200 shadow-xl rounded-2xl p-2 flex flex-col gap-2">
          <button
            onClick={undo}
            disabled={past.length === 0}
            className="p-3 rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className="p-3 rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Properties Panel (Side) */}
      {showProperties && (
         <div className="bg-white/90 backdrop-blur-sm border border-slate-200 shadow-xl rounded-2xl p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-200">
            
            {/* Brush Presets (Only for Pen) */}
            {isPen && (
              <div className="space-y-2">
                 <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Brush Type</span>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => setBrushPreset('pencil')}
                      className={cn("p-2 rounded-lg hover:bg-slate-100", defaultStyle.strokeWidth === 2 && "bg-slate-100 ring-1 ring-slate-900")}
                      title="Pencil"
                    >
                      <Pencil className="w-5 h-5 text-slate-700" />
                    </button>
                    <button 
                      onClick={() => setBrushPreset('marker')}
                      className={cn("p-2 rounded-lg hover:bg-slate-100", defaultStyle.strokeWidth === 5 && "bg-slate-100 ring-1 ring-slate-900")}
                      title="Marker"
                    >
                      <Pen className="w-5 h-5 text-slate-700" />
                    </button>
                    <button 
                      onClick={() => setBrushPreset('highlighter')}
                      className={cn("p-2 rounded-lg hover:bg-slate-100", defaultStyle.strokeWidth === 20 && "bg-slate-100 ring-1 ring-slate-900")}
                      title="Highlighter"
                    >
                      <Highlighter className="w-5 h-5 text-slate-700" />
                    </button>
                 </div>
                 <div className="h-px bg-slate-100 w-full" />
              </div>
            )}

            {/* Colors */}
            <div className="space-y-2">
               <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Color</span>
               <div className="flex flex-col gap-2">
                  {COLORS.map(c => (
                     <button
                        key={c.value}
                        onClick={() => setStrokeColor(c.value)}
                        className={cn(
                           "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                           defaultStyle.stroke === c.value ? "border-slate-900 scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                     />
                  ))}
               </div>
            </div>

            {/* Separator */}
            <div className="h-px bg-slate-100 w-full" />

            {/* Sizes */}
            <div className="space-y-2">
               <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Thickness</span>
               <div className="flex flex-col gap-2 items-center">
                  {STROKE_WIDTHS.map(s => (
                     <button
                        key={s.value}
                        onClick={() => setStrokeWidth(s.value)}
                        className={cn(
                           "w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors",
                           defaultStyle.strokeWidth === s.value && "bg-slate-100 ring-1 ring-slate-900"
                        )}
                        title={s.label}
                     >
                        <div 
                           className="bg-slate-900 rounded-full" 
                           style={{ width: s.value, height: s.value }} 
                        />
                     </button>
                  ))}
               </div>
            </div>
         </div>
      )}

    </div>
  );
};