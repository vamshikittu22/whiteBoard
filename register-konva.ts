import Konva from 'konva';

/**
 * Senior UI/UX Engineer Note:
 * The 'konva' ESM build often packages everything into a default export.
 * Named imports like { Circle } can fail if the module isn't strictly ESM-compliant.
 * We access these via the default object to ensure compatibility across environments.
 */

if (typeof window !== 'undefined') {
  const k = Konva as any;
  
  // Determine the primary Konva object (handling default export wrapping)
  const konvaInstance = k.default || k;

  // Ensure all standard shapes are attached to the main object
  // react-konva looks for these keys (e.g. Konva['Rect']) to create canvas nodes.
  const coreNodes = [
    'Rect', 'Circle', 'Ellipse', 'Line', 'Path', 'Text', 
    'Group', 'Layer', 'Stage', 'Transformer', 'Label', 'Tag'
  ];

  // If we are dealing with a 'default' wrapper, flatten it to the top level
  if (k.default) {
    coreNodes.forEach(node => {
      if (!k[node] && k.default[node]) {
        k[node] = k.default[node];
      }
    });
  }

  // Expose to window for react-konva's internal detection logic
  (window as any).Konva = konvaInstance;
  
  console.log('🏗️ [CollabCanvas] Konva Registry Initialized', {
    version: konvaInstance.version,
    ready: !!konvaInstance.Rect
  });
}

export {};
