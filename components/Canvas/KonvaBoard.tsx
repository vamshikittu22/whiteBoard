import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Stage, Layer, Rect as KonvaRect, Path, Group, Label, Tag, Text, Line } from 'react-konva';
import Konva from 'konva';
import { nanoid } from 'nanoid';

import { useStore } from '../../store';
import { screenToWorld } from '../../utils';
import { CanvasObject } from './CanvasObject';
import { CanvasItem, UserState } from '../../types';

const CURSOR_PATH = "M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z";

export const KonvaBoard = () => {
  const stageRef = useRef<any>(null);
  const { 
    items, itemOrder, activeTool, viewport, peers,
    setViewport, setTool, 
    dispatch, selectObject, selectedIds, defaultStyle,
    updateCursor
  } = useStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShapeId, setCurrentShapeId] = useState<string | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  const handleUpdate = useCallback((id: string, data: Partial<CanvasItem>) => {
    const item = items[id];
    if (!item) return;

    const prev = Object.keys(data).reduce((acc, key) => {
      (acc as any)[key] = (item as any)[key];
      return acc;
    }, {} as Partial<CanvasItem>);

    dispatch({
      type: 'update',
      id,
      data,
      prev
    });
  }, [items, dispatch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) setIsSpacePressed(true);
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'v') setTool('select');
      if (e.key === 'h') setTool('hand');
      if (e.key === 'p') setTool('pen');
      if (e.key === 'r') setTool('rect');
      if (e.key === 'o') setTool('ellipse');
      if (e.key === 's') setTool('sticky');
      if (e.key === 't') setTool('text');
      if (e.key === 'e') setTool('eraser');
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        useStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        useStore.getState().redo();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed, setTool]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    if (e.evt.ctrlKey || e.evt.metaKey) {
      const scaleBy = 1.1;
      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.min(Math.max(newScale, 0.05), 20);

      setViewport({
        zoom: clampedScale,
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      });
    } else {
      setViewport({
        ...viewport,
        x: viewport.x - e.evt.deltaX,
        y: viewport.y - e.evt.deltaY,
      });
    }
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    if (e.evt.button === 1 || isSpacePressed || activeTool === 'hand') return;

    const pos = screenToWorld(stage.getPointerPosition()!, viewport);
    const clickedOnStage = e.target === stage || e.target.attrs.id === 'bg-rect';

    if (activeTool === 'eraser') {
      if (!clickedOnStage) {
        const id = e.target.attrs.id;
        if (id && items[id]) {
           dispatch({ type: 'delete', id, item: items[id] });
        }
      }
      return;
    }

    if (activeTool === 'select') {
      if (clickedOnStage) {
        selectObject(null);
      }
      return;
    }

    setIsDrawing(true);
    const id = nanoid();
    setCurrentShapeId(id);

    let newItem: CanvasItem | null = null;

    if (activeTool === 'rect') {
      newItem = { type: 'rect', id, x: pos.x, y: pos.y, width: 1, height: 1, ...defaultStyle };
    } else if (activeTool === 'ellipse') {
      newItem = { type: 'ellipse', id, x: pos.x, y: pos.y, radiusX: 1, radiusY: 1, ...defaultStyle };
    } else if (activeTool === 'pen') {
      newItem = { type: 'path', id, x: 0, y: 0, points: [pos.x, pos.y], ...defaultStyle };
    } else if (activeTool === 'sticky') {
      newItem = { type: 'sticky', id, x: pos.x - 75, y: pos.y - 75, width: 150, height: 150, text: 'New Note', color: 'yellow' };
      dispatch({ type: 'create', item: newItem });
      setIsDrawing(false);
      setCurrentShapeId(null);
      setTool('select');
      selectObject(id);
      return; 
    } else if (activeTool === 'text') {
      newItem = { 
        type: 'text', id, x: pos.x, y: pos.y, 
        text: 'Type here', fontSize: 24, fontFamily: 'Inter',
        ...defaultStyle, fill: defaultStyle.stroke
      };
      dispatch({ type: 'create', item: newItem });
      setIsDrawing(false);
      setCurrentShapeId(null);
      setTool('select');
      selectObject(id);
      return;
    }

    if (newItem) {
      dispatch({ type: 'create', item: newItem });
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pos = screenToWorld(stage.getPointerPosition()!, viewport);
    updateCursor(pos);

    if (!isDrawing || !currentShapeId) return;
    
    const startItem = items[currentShapeId];
    if (!startItem) return;

    if (startItem.type === 'rect') {
       const width = pos.x - startItem.x;
       const height = pos.y - startItem.y;
       dispatch({ 
         type: 'update', 
         id: currentShapeId, 
         data: { width, height }, 
         prev: { width: startItem.width, height: startItem.height } 
       });
    } else if (startItem.type === 'ellipse') {
        const rx = Math.abs(pos.x - startItem.x);
        const ry = Math.abs(pos.y - startItem.y);
        dispatch({
          type: 'update', 
          id: currentShapeId, 
          data: { radiusX: rx, radiusY: ry },
          prev: { radiusX: startItem.radiusX, radiusY: startItem.radiusY }
        });
    } else if (startItem.type === 'path') {
        const newPoints = [...startItem.points, pos.x, pos.y];
        dispatch({
          type: 'update',
          id: currentShapeId,
          data: { points: newPoints },
          prev: { points: startItem.points }
        });
    }
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setCurrentShapeId(null);
      if (activeTool !== 'pen') {
          setTool('select');
      }
    }
  };

  const gridLines = useMemo(() => {
    const lines = [];
    const GRID_SIZE = 50;
    const GRID_EXTENT = 5000;
    
    for (let i = -GRID_EXTENT; i <= GRID_EXTENT; i += GRID_SIZE) {
       lines.push(<Line key={`v${i}`} points={[i, -GRID_EXTENT, i, GRID_EXTENT]} stroke="#e2e8f0" strokeWidth={1} listening={false} perfectDrawEnabled={false} />);
       lines.push(<Line key={`h${i}`} points={[-GRID_EXTENT, i, GRID_EXTENT, i]} stroke="#e2e8f0" strokeWidth={1} listening={false} perfectDrawEnabled={false} />);
    }
    return lines;
  }, []);

  const getCursorStyle = () => {
    if (activeTool === 'hand' || isSpacePressed) return 'grab';
    if (activeTool === 'select') return 'default';
    if (activeTool === 'text') return 'text';
    if (activeTool === 'eraser') return 'cell';
    return 'crosshair';
  };

  return (
    <Stage
      ref={stageRef}
      width={window.innerWidth}
      height={window.innerHeight}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      x={viewport.x}
      y={viewport.y}
      scaleX={viewport.zoom}
      scaleY={viewport.zoom}
      draggable={activeTool === 'hand' || isSpacePressed}
      style={{ cursor: getCursorStyle() }}
    >
      <Layer>
        <KonvaRect id="bg-rect" x={-10000} y={-10000} width={20000} height={20000} fill="#f8fafc" listening={true} />
        <Group listening={false}>{gridLines}</Group>
        
        {itemOrder.map(id => {
          const item = items[id];
          if (!item) return null;
          return (
            <CanvasObject
              key={id}
              item={item}
              isSelected={selectedIds.includes(id)}
              onSelect={(id) => activeTool === 'select' && selectObject(id)}
              onUpdate={handleUpdate}
            />
          );
        })}

        {Object.values(peers).map((peer: UserState) => {
          if (!peer.cursor) return null;
          const timeSinceActive = Date.now() - peer.lastActive;
          if (timeSinceActive > 10000) return null;
          const opacity = Math.max(0, 1 - timeSinceActive / 10000);

          return (
             <Group key={peer.id} x={peer.cursor.x} y={peer.cursor.y} opacity={opacity} listening={false}>
                <Path data={CURSOR_PATH} fill={peer.color} shadowColor="rgba(0,0,0,0.1)" shadowBlur={4} />
                <Label x={12} y={12}>
                   <Tag fill={peer.color} cornerRadius={4} />
                   <Text text={peer.name} fontFamily="Inter" fontSize={11} padding={4} fill="white" fontStyle="bold" />
                </Label>
             </Group>
          );
        })}
      </Layer>
    </Stage>
  );
};
