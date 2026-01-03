import React from 'react';
import { BoardObject, ConnectorObject } from '../../types';
import { pointsToPath, getObjectCenter } from '../../utils';
import { useStore } from '../../store';
import { Lock } from 'lucide-react';

interface RendererProps {
  obj: BoardObject;
  selected: boolean;
}

export const Renderer: React.FC<RendererProps> = ({ obj, selected }) => {
  // We need access to all objects to resolve connector endpoints
  const allObjects = useStore(state => state.objects);

  const selectionStyle = selected ? {
    filter: 'drop-shadow(0 0 4px #3b82f6)',
    stroke: '#3b82f6',
    strokeWidth: (obj.strokeWidth || 0) + 2
  } : {};

  const LockIcon = () => {
    if (!obj.locked) return null;
    const center = getObjectCenter(obj);
    return (
      <g transform={`translate(${center.x - 8}, ${center.y - 8})`}>
        <rect x="-4" y="-4" width="24" height="24" rx="4" fill="white" stroke="#ef4444" strokeWidth="1" />
        <path d="M8 11V7a4 4 0 118 0v4h1a2 2 0 012 2v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4a2 2 0 012-2h1zm2 0h6V7a3 3 0 00-6 0v4z" transform="scale(0.7) translate(4,4)" fill="#ef4444"/>
      </g>
    );
  };

  const Content = () => {
    switch (obj.type) {
    case 'path':
      return (
        <g>
          {selected && (
            <path
              d={pointsToPath(obj.points)}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={(obj.strokeWidth || 2) + 4}
              opacity="0.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          <path
            d={pointsToPath(obj.points)}
            fill={obj.fill || 'none'}
            stroke={obj.stroke}
            strokeWidth={obj.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={obj.locked ? 0.8 : 1}
          />
        </g>
      );
    
    case 'rect':
      return (
        <rect
          x={obj.x}
          y={obj.y}
          width={obj.width}
          height={obj.height}
          fill={obj.fill}
          stroke={selected ? '#3b82f6' : obj.stroke}
          strokeWidth={selected ? (obj.strokeWidth || 0) + 2 : obj.strokeWidth}
          rx={4}
          opacity={obj.locked ? 0.8 : 1}
        />
      );

    case 'ellipse':
       return (
        <ellipse
          cx={obj.x + (obj.width || 0) / 2}
          cy={obj.y + (obj.height || 0) / 2}
          rx={(obj.width || 0) / 2}
          ry={(obj.height || 0) / 2}
          fill={obj.fill}
          stroke={selected ? '#3b82f6' : obj.stroke}
          strokeWidth={selected ? (obj.strokeWidth || 0) + 2 : obj.strokeWidth}
          opacity={obj.locked ? 0.8 : 1}
        />
      );

    case 'sticky':
      return (
        <g transform={`translate(${obj.x}, ${obj.y})`} opacity={obj.locked ? 0.9 : 1}>
          <rect
             width={obj.width || 200}
             height={obj.height || 200}
             fill={obj.fill}
             className="shadow-md"
             rx={2}
          />
           {selected && (
             <rect
               width={obj.width || 200}
               height={obj.height || 200}
               fill="none"
               stroke="#3b82f6"
               strokeWidth={2}
             />
           )}
          <foreignObject width={obj.width || 200} height={obj.height || 200}>
            <div className="w-full h-full p-4 font-handwriting text-slate-800 break-words leading-relaxed" style={{ fontFamily: '"Inter", sans-serif' }}>
              {obj.text}
            </div>
          </foreignObject>
        </g>
      );
      
    case 'image':
      return (
        <g opacity={obj.locked ? 0.8 : 1}>
           <image
            href={obj.src}
            x={obj.x}
            y={obj.y}
            width={obj.width}
            height={obj.height}
            preserveAspectRatio="none"
          />
          {selected && (
             <rect
               x={obj.x}
               y={obj.y}
               width={obj.width}
               height={obj.height}
               fill="none"
               stroke="#3b82f6"
               strokeWidth={2}
             />
           )}
        </g>
      );

    case 'connector':
      // Resolve endpoints
      let start = obj.start || { x: obj.x, y: obj.y };
      let end = obj.end || { x: obj.x + 100, y: obj.y + 100 };

      if (obj.startId && allObjects[obj.startId]) {
        start = getObjectCenter(allObjects[obj.startId]);
      }
      if (obj.endId && allObjects[obj.endId]) {
        end = getObjectCenter(allObjects[obj.endId]);
      }

      return (
        <g>
          <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={selected ? '#3b82f6' : '#94a3b8'}
            strokeWidth={selected ? 4 : 2}
            markerEnd={selected ? "url(#arrowhead-selected)" : "url(#arrowhead)"}
          />
        </g>
      );

    default:
      return null;
    }
  }

  return (
    <g>
      <Content />
      <LockIcon />
    </g>
  );
};