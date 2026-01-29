import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Stage, Layer, Rect as KonvaRect, Path, Group, Label, Tag, Text, Line } from 'react-konva';
import Konva from 'konva';
import { nanoid } from 'nanoid';

import { useStore } from '../../store';
import { screenToWorld } from '../../utils';
import { CanvasObject } from './CanvasObject';
import { TextEditor } from './TextEditor';
import { CanvasItem, UserState, Point } from '../../types';

const CURSOR_PATH = "M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z";

export const KonvaBoard = () => {
  const stageRef = useRef<any>(null);
  const {
    items, itemOrder, activeTool, viewport, peers,
    setViewport, setTool,
    dispatch, selectObject, selectedIds, defaultStyle,
    updateCursor, currentBoardId, exportTrigger
  } = useStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShapeId, setCurrentShapeId] = useState<string | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [pendingTextItem, setPendingTextItem] = useState<CanvasItem | null>(null);

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

      const keyMap: Record<string, any> = {
        'v': 'select', 'h': 'hand', 'p': 'pen', 'r': 'rect',
        'o': 'ellipse', 's': 'sticky', 't': 'text', 'e': 'eraser', 'l': 'line'
      };
      if (keyMap[e.key]) setTool(keyMap[e.key]);

      // Delete selected objects
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        const state = useStore.getState();
        selectedIds.forEach(id => {
          const item = state.items[id];
          if (item) {
            state.dispatch({ type: 'delete', id, item });
          }
        });
        selectObject(null);
      }

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
        if (id && items[id]) dispatch({ type: 'delete', id, item: items[id] });
      }
      return;
    }

    if (activeTool === 'select') {
      if (clickedOnStage) selectObject(null);
      return;
    }

    setIsDrawing(true);
    const id = nanoid();
    setCurrentShapeId(id);

    let newItem: CanvasItem | null = null;
    const style = { ...defaultStyle };

    if (activeTool === 'rect') {
      newItem = { type: 'rect', id, x: pos.x, y: pos.y, width: 1, height: 1, ...style };
    } else if (activeTool === 'ellipse') {
      newItem = { type: 'ellipse', id, x: pos.x, y: pos.y, radiusX: 1, radiusY: 1, ...style };
    } else if (activeTool === 'pen') {
      // Initialize with 2 points (4 coordinates) so it's immediately visible
      newItem = { type: 'path', id, x: 0, y: 0, points: [pos.x, pos.y, pos.x, pos.y], ...style };
    } else if (activeTool === 'line') {
      // Straight line from start to end
      newItem = { type: 'line', id, x: 0, y: 0, points: [pos.x, pos.y, pos.x, pos.y], ...style };
    } else if (activeTool === 'sticky') {
      newItem = { type: 'sticky', id, x: pos.x - 75, y: pos.y - 75, width: 150, height: 150, text: 'New Note', color: 'yellow' };
      dispatch({ type: 'create', item: newItem });
      setIsDrawing(false);
      setTool('select');
      selectObject(id);
      return;
    } else if (activeTool === 'text') {
      newItem = {
        type: 'text', id, x: pos.x, y: pos.y,
        text: '', fontSize: 24, fontFamily: 'Inter',
        ...style, fill: style.stroke
      };
      dispatch({ type: 'create', item: newItem });
      setIsDrawing(false);
      setPendingTextItem(newItem); // Store for immediate editor display
      setEditingTextId(id); // Open editor immediately
      return;
    }

    if (newItem) {
      dispatch({ type: 'create', item: newItem });
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    // Safety check: if drawing but no mouse button pressed, stop drawing
    if (isDrawing && e.evt.buttons === 0) {
      setIsDrawing(false);
      setCurrentShapeId(null);
      return;
    }

    const pos = screenToWorld(stage.getPointerPosition()!, viewport);

    // Throttle cursor updates slightly? No, keeping real-time for now
    updateCursor({ x: pos.x, y: pos.y });

    if (!isDrawing || !currentShapeId) return;

    const startItem = items[currentShapeId];
    if (!startItem) return;

    if (startItem.type === 'rect') {
      dispatch({
        type: 'update',
        id: currentShapeId,
        data: { width: pos.x - startItem.x, height: pos.y - startItem.y },
        prev: { width: startItem.width, height: startItem.height }
      });
    } else if (startItem.type === 'ellipse') {
      dispatch({
        type: 'update',
        id: currentShapeId,
        data: { radiusX: Math.abs(pos.x - startItem.x), radiusY: Math.abs(pos.y - startItem.y) },
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
    } else if (startItem.type === 'line') {
      // Update end point of line
      const newPoints = [startItem.points[0], startItem.points[1], pos.x, pos.y];
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
      if (activeTool !== 'pen') setTool('select');
    }
  };

  const gridLines = useMemo(() => {
    const lines = [];
    const GRID_SIZE = 50;
    const GRID_EXTENT = 5000;
    for (let i = -GRID_EXTENT; i <= GRID_EXTENT; i += GRID_SIZE) {
      lines.push(<Line key={`v${i}`} points={[i, -GRID_EXTENT, i, GRID_EXTENT]} stroke="#f1f5f9" strokeWidth={1} listening={false} perfectDrawEnabled={false} />);
      lines.push(<Line key={`h${i}`} points={[-GRID_EXTENT, i, GRID_EXTENT, i]} stroke="#f1f5f9" strokeWidth={1} listening={false} perfectDrawEnabled={false} />);
    }
    return lines;
  }, []);

  // Handle Export to Image
  useEffect(() => {
    if (exportTrigger > 0 && stageRef.current) {
      const dataURL = stageRef.current.toDataURL({
        pixelRatio: 2, // Higher quality
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `board-${currentBoardId || 'export'}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [exportTrigger, currentBoardId]);

  // Handle text editor submit
  const handleTextSubmit = useCallback((text: string) => {
    if (editingTextId && text.trim()) {
      handleUpdate(editingTextId, { text });
    } else if (editingTextId && !text.trim()) {
      // Delete empty text items
      const item = items[editingTextId];
      if (item) {
        dispatch({ type: 'delete', id: editingTextId, item });
      }
    }
    setEditingTextId(null);
    setPendingTextItem(null);
    setTool('select');
  }, [editingTextId, handleUpdate, items, dispatch, setTool]);

  const handleTextCancel = useCallback(() => {
    if (editingTextId) {
      const item = items[editingTextId] || pendingTextItem;
      // Delete empty text items (but not sticky notes - they have default text)
      if (item && item.type === 'text' && !item.text) {
        dispatch({ type: 'delete', id: editingTextId, item });
      }
    }
    setEditingTextId(null);
    setPendingTextItem(null);
    setTool('select');
  }, [editingTextId, items, pendingTextItem, dispatch, setTool]);

  // Get editing text item for TextEditor (use pending item as fallback for newly created items)
  const editingTextItem = editingTextId ? (items[editingTextId] || pendingTextItem) : null;

  // Debug logging
  if (editingTextId) {
    console.log('[TextEditor Debug]', {
      editingTextId,
      hasItemInStore: !!items[editingTextId],
      hasPendingItem: !!pendingTextItem,
      editingTextItem,
      itemType: editingTextItem?.type
    });
  }

  // Type guard for text items
  const isTextItem = (item: CanvasItem | null): item is CanvasItem & { type: 'text'; text: string; fontSize: number; fontFamily: string; width?: number; fill?: string } => {
    return item?.type === 'text';
  };

  // Type guard for sticky items
  const isStickyItem = (item: CanvasItem | null): item is CanvasItem & { type: 'sticky'; text: string; width: number; height: number; color: string } => {
    return item?.type === 'sticky';
  };

  // Check if item is editable (text or sticky)
  const isEditableItem = (item: CanvasItem | null): boolean => {
    return isTextItem(item) || isStickyItem(item);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
        style={{ cursor: activeTool === 'hand' || isSpacePressed ? 'grab' : 'default' }}
      >
        <Layer>
          <KonvaRect id="bg-rect" x={-10000} y={-10000} width={20000} height={20000} fill="#fcfdfe" listening={true} />
          <Group listening={false}>{gridLines}</Group>

          {itemOrder.map(id => {
            const item = items[id];
            if (!item) return null;
            // Hide text item being edited
            if (id === editingTextId) return null;
            return (
              <CanvasObject
                key={id}
                item={item}
                isSelected={selectedIds.includes(id)}
                onSelect={(id, multi) => activeTool === 'select' && selectObject(id, multi)}
                onUpdate={handleUpdate}
                onDoubleClick={(id) => {
                  const clickedItem = items[id];
                  if (clickedItem && (clickedItem.type === 'text' || clickedItem.type === 'sticky')) {
                    setEditingTextId(id);
                  }
                }}
              />
            );
          })}

          {Object.values(peers).map((peer: UserState) => {
            if (!peer.cursor) return null;
            const opacity = Math.max(0, 1 - (Date.now() - peer.lastActive) / 10000);
            return (
              <Group key={peer.id} x={peer.cursor.x} y={peer.cursor.y} opacity={opacity} listening={false}>
                <Path data={CURSOR_PATH} fill={peer.color} />
                <Label x={12} y={12}>
                  <Tag fill={peer.color} cornerRadius={4} />
                  <Text text={peer.name} fontFamily="Inter" fontSize={11} padding={4} fill="white" fontStyle="bold" />
                </Label>
              </Group>
            );
          })}
        </Layer>
      </Stage>

      {/* Text Editor Overlay for Text Items */}
      {(() => {
        const shouldShowTextEditor = editingTextItem && editingTextItem.type === 'text';
        console.log('[TextEditor Render Check - Text]', { editingTextItem, shouldShowTextEditor, itemType: editingTextItem?.type });
        if (!shouldShowTextEditor) return null;

        const textItem = editingTextItem as any;
        return (
          <TextEditor
            x={textItem.x}
            y={textItem.y}
            width={textItem.width || 200}
            text={textItem.text}
            fontSize={textItem.fontSize}
            fontFamily={textItem.fontFamily}
            color={textItem.fill || '#000000'}
            zoom={viewport.zoom}
            viewportX={viewport.x}
            viewportY={viewport.y}
            onSubmit={handleTextSubmit}
            onCancel={handleTextCancel}
          />
        );
      })()}

      {/* Text Editor Overlay for Sticky Notes */}
      {editingTextItem && isStickyItem(editingTextItem) && (
        <TextEditor
          x={editingTextItem.x + 15}
          y={editingTextItem.y + 15}
          width={editingTextItem.width - 30}
          text={editingTextItem.text}
          fontSize={16}
          fontFamily="Inter"
          color="#334155"
          zoom={viewport.zoom}
          viewportX={viewport.x}
          viewportY={viewport.y}
          onSubmit={handleTextSubmit}
          onCancel={handleTextCancel}
        />
      )}
    </div>
  );
};
