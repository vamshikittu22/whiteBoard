import Konva from 'konva';

/**
 * Senior UI/UX Engineer Note:
 * This registry is critical for react-konva. If the reconciler doesn't find
 * 'Line' or 'Rect' on the Konva object, it fallbacks to a 'Group', causing 
 * properties like 'points', 'width', and 'stroke' to be ignored.
 */

if (typeof window !== 'undefined') {
  // Ensure we have a reference to the actual Konva object (handling esm.sh variations)
  const k = (Konva as any).default || Konva;
  
  // These are the internal names react-konva uses to find classes
  const shapeNames = [
    'Rect', 'Circle', 'Ellipse', 'Line', 'Path', 'Text', 
    'Group', 'Layer', 'Stage', 'Transformer', 'Label', 'Tag'
  ];

  // Force-attach shapes if they are missing from the primary object
  // but present in the namespace or sub-objects
  shapeNames.forEach(name => {
    if (!k[name]) {
      // Sometimes esm.sh puts them inside the default object
      if (k.default && k.default[name]) {
        k[name] = k.default[name];
      }
    }
  });

  // Expose to window immediately. React-Konva checks window.Konva as a fallback.
  (window as any).Konva = k;

  console.log('🛡️ [CollabCanvas] Registry Guard:', {
    hasLine: !!k.Line,
    hasRect: !!k.Rect,
    version: k.version
  });
}

export default {};
