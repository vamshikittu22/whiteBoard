import Konva from 'konva';

// Explicitly register shapes to avoid "Konva has no node with the type..." warnings
// when using tree-shakable ES modules.
import "konva/lib/shapes/Rect";
import "konva/lib/shapes/Circle";
import "konva/lib/shapes/Line";
import "konva/lib/shapes/Path";
import "konva/lib/shapes/Text";
import "konva/lib/shapes/Label";
import "konva/lib/shapes/Tag";
import "konva/lib/shapes/Ellipse";

// Verify registration
if (typeof window !== 'undefined') {
  console.log('Konva shapes registered:', {
    Rect: !!Konva.Rect,
    Line: !!Konva.Line,
    Circle: !!Konva.Circle
  });
}
