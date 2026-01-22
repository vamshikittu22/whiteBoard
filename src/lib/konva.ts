import Konva from 'konva';

// Explicitly import and register shapes for tree-shaking environments if using Konva modularly
// But here we are using the full Konva package, so they are registered by default.
// However, to satisfy the requirement of "registering via imports":
import 'konva/lib/shapes/Rect';
import 'konva/lib/shapes/Circle';
import 'konva/lib/shapes/Ellipse';
import 'konva/lib/shapes/Line';
import 'konva/lib/shapes/Path';
import 'konva/lib/shapes/Text';
import 'konva/lib/shapes/Image';
import 'konva/lib/shapes/Label';
import 'konva/lib/shapes/Transformer';

export default Konva;
