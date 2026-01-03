// This shim bridges the global Konva object (from the script tag)
// to the ES module import system. This ensures we use the full bundle
// which includes all shapes (Rect, Line, etc.), fixing "missing node" errors.
const Konva = window.Konva;
export default Konva;
