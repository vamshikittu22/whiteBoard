import Konva from 'konva';

// Import the actual classes
import { Rect } from 'konva/lib/shapes/Rect';
import { Circle } from 'konva/lib/shapes/Circle';
import { Ellipse } from 'konva/lib/shapes/Ellipse';
import { Line } from 'konva/lib/shapes/Line';
import { Path } from 'konva/lib/shapes/Path';
import { Text } from 'konva/lib/shapes/Text';
import { Group } from 'konva/lib/Group';
import { Layer } from 'konva/lib/Layer';
import { Stage } from 'konva/lib/Stage';

// Manually register them on the Konva object that react-konva uses
const k = Konva as any;
k.Rect = Rect;
k.Circle = Circle;
k.Ellipse = Ellipse;
k.Line = Line;
k.Path = Path;
k.Text = Text;
k.Group = Group;
k.Layer = Layer;
k.Stage = Stage;

if (typeof window !== 'undefined') {
  (window as any).Konva = Konva;
  console.log('Konva shapes manually registered:', {
    Rect: !!k.Rect,
    Circle: !!k.Circle,
    Ellipse: !!k.Ellipse,
    Line: !!k.Line,
    Path: !!k.Path
  });
}

export {};
