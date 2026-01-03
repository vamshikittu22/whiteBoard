import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store';
import { screenToWorld, worldToScreen, pointsToPath } from '../../utils';
import { ToolType, Point, PathObject, ShapeObject, BoardObject, STICKY_COLORS, ConnectorObject } from '../../types';
import { nanoid } from 'nanoid';
import { Renderer } from './Renderer';

export const Whiteboard = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { 
    viewport, setViewport, 
    activeTool, setTool,
    objects, objectOrder, 
    createObject, updateObject, 
    strokeColor, strokeWidth, fillColor,
    peers,
    selectedIds, selectObjects,
    currentUser
  } = useStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [tempId, setTempId] = useState<string | null>(null);

  // Phase 2: Spatial Indexing (Grid System)
  // Divide world into 1000x1000 buckets.
  // Implementation: Simple filtering based on viewport.
  const visibleObjectIds = useMemo(() => {
    // Current viewport bounds in world coordinates
    const vX = -viewport.x / viewport.zoom;
    const vY = -viewport.y / viewport.zoom;
    const vW = window.innerWidth / viewport.zoom;
    const vH = window.innerHeight / viewport.zoom;
    
    // Add margin
    const margin = 500;
    
    return objectOrder.filter(id => {
      const obj = objects[id];
      if (!obj) return false;
      
      // Connectors are always visible if their connected nodes are roughly nearby, 
      // simplified: always render connectors for now
      if (obj.type === 'connector') return true;

      // Simple AABB check
      const oRight = obj.x + (obj.width || 0);
      const oBottom = obj.y + (obj.height || 0);
      
      return (
        oRight >= vX - margin &&
        obj.x <= vX + vW + margin &&
        oBottom >= vY - margin &&
        obj.y <= vY + vH + margin
      );
    });
  }, [objectOrder, objects, viewport, window.innerWidth, window.innerHeight]);


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        useStore.setState({ isSpacePressed: true });
        containerRef.current!.style.cursor = 'grab';
      }
      if (e.key === 'v') setTool(ToolType.SELECT);
      if (e.key === 'p') setTool(ToolType.PEN);
      if (e.key === 'h') setTool(ToolType.HAND);
      if (e.key === 'r') setTool(ToolType.RECTANGLE);
      if (e.key === 'o') setTool(ToolType.ELLIPSE);
      if (e.key === 'c') setTool(ToolType.CONNECTOR);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        useStore.setState({ isSpacePressed: false });
        containerRef.current!.style.cursor = 'default';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setTool]);

  // Wheel Zoom/Pan
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const newZoom = Math.min(Math.max(viewport.zoom - e.deltaY * zoomSensitivity, 0.1), 5);
      setViewport({ zoom: newZoom });
    } else {
      setViewport({ 
        x: viewport.x - e.deltaX, 
        y: viewport.y - e.deltaY 
      });
    }
  };

  // Phase 2: Drag & Drop Images
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
       const reader = new FileReader();
       reader.onload = (event) => {
         const pt = { x: e.clientX, y: e.clientY };
         const worldPt = screenToWorld(pt, viewport);
         const id = nanoid();
         
         // Create Image Object
         // Note: In real app, we upload to S3 here and get a URL.
         // For MVP, we use the Base64 data or a Blob URL.
         const imgObj: BoardObject = {
            id,
            type: 'image',
            x: worldPt.x,
            y: worldPt.y,
            width: 300, // Default width
            height: 200, // Default height
            src: event.target?.result as string,
            mimeType: file.type,
            zIndex: objectOrder.length
         };
         createObject(imgObj);
       };
       reader.readAsDataURL(file);
    }
  };


  const handlePointerDown = (e: React.PointerEvent) => {
    const pt = { x: e.clientX, y: e.clientY };
    const worldPt = screenToWorld(pt, viewport);
    const isSpace = useStore.getState().isSpacePressed;

    if (activeTool === ToolType.HAND || isSpace) {
      setIsDragging(true);
      setDragStart(pt);
      return;
    }

    if (activeTool === ToolType.PEN) {
      setIsDragging(true);
      const id = nanoid();
      setTempId(id);
      setCurrentPoints([worldPt]);
      return;
    }
    
    // Phase 2: Connector Creation
    if (activeTool === ToolType.CONNECTOR) {
       setIsDragging(true);
       setDragStart(worldPt);
       const id = nanoid();
       setTempId(id);
       
       // Detect if we clicked on an object to attach start
       // Simple logic: topmost object under cursor
       const hitId = [...objectOrder].reverse().find(id => {
          const obj = objects[id];
          return obj && 
             worldPt.x >= obj.x && worldPt.x <= obj.x + (obj.width || 0) &&
             worldPt.y >= obj.y && worldPt.y <= obj.y + (obj.height || 0);
       });

       const newConnector: ConnectorObject = {
         id,
         type: 'connector',
         x: worldPt.x, // Origin
         y: worldPt.y,
         start: worldPt,
         end: worldPt,
         startId: hitId, // Attach if hit
         zIndex: objectOrder.length
       };
       createObject(newConnector);
       return;
    }

    if (activeTool === ToolType.RECTANGLE || activeTool === ToolType.ELLIPSE) {
      setIsDragging(true);
      setDragStart(worldPt);
      const id = nanoid();
      setTempId(id);
      
      const newShape: ShapeObject = {
        id,
        type: activeTool === ToolType.RECTANGLE ? 'rect' : 'ellipse',
        x: worldPt.x,
        y: worldPt.y,
        width: 0,
        height: 0,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        zIndex: objectOrder.length,
      };
      createObject(newShape);
    }
    
    if (activeTool === ToolType.STICKY) {
       const id = nanoid();
       const newSticky: BoardObject = {
         id,
         type: 'sticky',
         x: worldPt.x - 100,
         y: worldPt.y - 100,
         width: 200,
         height: 200,
         fill: STICKY_COLORS.yellow,
         text: 'New Idea',
         color: 'yellow',
         zIndex: objectOrder.length
       };
       createObject(newSticky);
       setTool(ToolType.SELECT);
    }

    if (activeTool === ToolType.SELECT) {
      const clickedId = [...objectOrder].reverse().find(id => {
        const obj = objects[id];
        if (!obj) return false;
        
        if (obj.type === 'connector') return false; // Hard to select lines in MVP

        const right = obj.x + (obj.width || 0);
        const bottom = obj.y + (obj.height || 0);
        
        if (obj.type === 'path') {
          return worldPt.x >= obj.x - 20 && worldPt.x <= obj.x + 100 &&
                 worldPt.y >= obj.y - 20 && worldPt.y <= obj.y + 100;
        }

        return worldPt.x >= obj.x && worldPt.x <= right &&
               worldPt.y >= obj.y && worldPt.y <= bottom;
      });

      if (clickedId) {
        selectObjects([clickedId]);
        setIsDragging(true);
        setDragStart(worldPt);
      } else {
        selectObjects([]);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const pt = { x: e.clientX, y: e.clientY };
    const worldPt = screenToWorld(pt, viewport);
    
    useStore.getState().onPointerMove(worldPt);

    if (!isDragging) return;

    if (activeTool === ToolType.HAND || useStore.getState().isSpacePressed) {
      if (!dragStart) return;
      setViewport({
        x: viewport.x + (pt.x - dragStart.x),
        y: viewport.y + (pt.y - dragStart.y)
      });
      setDragStart(pt);
      return;
    }

    if (activeTool === ToolType.PEN) {
      setCurrentPoints(prev => [...prev, worldPt]);
      return;
    }
    
    // Phase 2: Updating Connector while dragging
    if (activeTool === ToolType.CONNECTOR && tempId) {
       updateObject(tempId, {
         end: worldPt
       });
       return;
    }

    if ((activeTool === ToolType.RECTANGLE || activeTool === ToolType.ELLIPSE) && tempId && dragStart) {
      const width = worldPt.x - dragStart.x;
      const height = worldPt.y - dragStart.y;
      
      updateObject(tempId, {
        width: Math.abs(width),
        height: Math.abs(height),
        x: width < 0 ? worldPt.x : dragStart.x,
        y: height < 0 ? worldPt.y : dragStart.y
      });
    }

    if (activeTool === ToolType.SELECT && selectedIds.length > 0 && dragStart) {
      const dx = worldPt.x - dragStart.x;
      const dy = worldPt.y - dragStart.y;
      
      selectedIds.forEach(id => {
        const obj = objects[id];
        updateObject(id, {
          x: obj.x + dx,
          y: obj.y + dy
        });
      });
      setDragStart(worldPt);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setDragStart(null);

    // Phase 2: Finalize Connector
    if (activeTool === ToolType.CONNECTOR && tempId) {
        // Check if we dropped on an object
        // Use last known cursor pos (hacky for MVP, getting cursor from store would be better)
        const connector = objects[tempId] as ConnectorObject;
        if (connector) {
           const endPt = connector.end!;
           const hitId = [...objectOrder].reverse().find(id => {
              const obj = objects[id];
              // Don't attach to self or other connectors
              if (id === tempId || obj.type === 'connector') return false; 
              return obj && 
                 endPt.x >= obj.x && endPt.x <= obj.x + (obj.width || 0) &&
                 endPt.y >= obj.y && endPt.y <= obj.y + (obj.height || 0);
           });
           
           if (hitId) {
             updateObject(tempId, { endId: hitId });
           }
        }
    }

    if (activeTool === ToolType.PEN && currentPoints.length > 1) {
      const id = nanoid();
      const newPath: PathObject = {
        id,
        type: 'path',
        points: currentPoints,
        x: currentPoints[0].x, // Bounding box approx
        y: currentPoints[0].y,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        fill: 'none',
        zIndex: objectOrder.length,
      };
      createObject(newPath);
      setCurrentPoints([]);
    }
    
    setTempId(null);
  };

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 bg-slate-50 touch-none overflow-hidden"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
        backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`
      }}
    >
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0'
        }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
          </marker>
          <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
          </marker>
        </defs>

        {/* Render Objects (Spatial Indexed) */}
        {visibleObjectIds.map(id => {
          const obj = objects[id];
          return (
             <Renderer 
               key={id} 
               obj={obj} 
               selected={selectedIds.includes(id)}
             />
          );
        })}

        {/* Render Current Stroke */}
        {activeTool === ToolType.PEN && currentPoints.length > 0 && (
          <path
            d={pointsToPath(currentPoints)}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.6}
          />
        )}

        {/* Render Peer Cursors */}
        {peers.map(peer => peer.cursor && (
          <g key={peer.id} style={{ transform: `translate(${peer.cursor.x}px, ${peer.cursor.y}px)` }}>
            <path d="M0,0 L12,12 L8,12 L11,18 L9,19 L6,13 L2,16 Z" fill={peer.color} stroke="white" strokeWidth="1" />
            <text x="14" y="14" fontSize="12" fill={peer.color} fontWeight="bold">{peer.name}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};