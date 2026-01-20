import React from 'react';
import { Rect, Circle, Ellipse, Line, Text, Group } from 'react-konva';
import { CanvasItem } from '../../types';

interface Props {
  item: CanvasItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, data: Partial<CanvasItem>) => void;
}

const STICKY_COLORS: Record<string, string> = {
  yellow: '#fef3c7',
  blue: '#dbeafe',
  green: '#dcfce7',
  pink: '#fce7f3',
  orange: '#ffedd5'
};

export const CanvasObject: React.FC<Props> = ({ item, isSelected, onSelect, onUpdate }) => {
  const commonProps = {
    id: item.id,
    x: item.x,
    y: item.y,
    rotation: item.rotation || 0,
    opacity: item.opacity ?? 1,
    draggable: isSelected && !item.isLocked,
    onClick: (e: any) => {
      e.cancelBubble = true;
      onSelect(item.id);
    },
    onTap: (e: any) => {
      e.cancelBubble = true;
      onSelect(item.id);
    },
    onDragEnd: (e: any) => {
      onUpdate(item.id, {
        x: e.target.x(),
        y: e.target.y()
      });
    }
  };

  const shadowProps = isSelected ? {
    shadowColor: 'rgba(59, 130, 246, 0.5)',
    shadowBlur: 10,
    shadowOpacity: 0.6
  } : {};

  const defaultFill = 'rgba(241, 245, 249, 0.2)'; 

  switch (item.type) {
    case 'rect':
      return (
        <Rect
          {...commonProps}
          {...shadowProps}
          width={item.width}
          height={item.height}
          fill={item.fill && item.fill !== 'transparent' ? item.fill : defaultFill}
          stroke={item.stroke || '#1e293b'}
          strokeWidth={item.strokeWidth || 2}
          cornerRadius={item.cornerRadius || 4}
        />
      );
      
    case 'ellipse':
      return (
        <Ellipse
          {...commonProps}
          {...shadowProps}
          radiusX={item.radiusX}
          radiusY={item.radiusY}
          fill={item.fill && item.fill !== 'transparent' ? item.fill : defaultFill}
          stroke={item.stroke || '#1e293b'}
          strokeWidth={item.strokeWidth || 2}
        />
      );

    case 'path':
      return (
        <Line
          {...commonProps}
          points={item.points}
          stroke={item.stroke || '#1e293b'}
          strokeWidth={item.strokeWidth || 4}
          opacity={item.strokeOpacity ?? 1}
          tension={item.tension || 0.5}
          lineCap="round"
          lineJoin="round"
          // Crucial for selection of thin lines
          hitStrokeWidth={Math.max(25, item.strokeWidth || 4)}
        />
      );

    case 'sticky':
      return (
        <Group {...commonProps}>
          <Rect
            width={item.width}
            height={item.height}
            fill={STICKY_COLORS[item.color] || STICKY_COLORS.yellow}
            shadowColor="rgba(0,0,0,0.1)"
            shadowBlur={5}
            cornerRadius={2}
            stroke={isSelected ? '#3b82f6' : 'rgba(0,0,0,0.05)'}
            strokeWidth={isSelected ? 2 : 1}
          />
          <Text
            x={15}
            y={15}
            width={item.width - 30}
            height={item.height - 30}
            text={item.text}
            fontSize={16}
            fontFamily="Inter"
            fill="#334155"
            wrap="word"
            lineHeight={1.4}
            listening={false}
          />
        </Group>
      );

    case 'text':
      return (
        <Text
          {...commonProps}
          text={item.text}
          fontSize={item.fontSize}
          fontFamily={item.fontFamily}
          fill={item.fill || '#1e293b'}
          width={item.width}
          padding={4}
        />
      );

    default:
      return null;
  }
};
