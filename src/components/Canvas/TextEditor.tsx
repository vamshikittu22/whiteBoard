import React, { useState, useRef, useEffect, useCallback } from 'react';

interface TextEditorProps {
    x: number;
    y: number;
    width: number;
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    zoom: number;
    viewportX: number;
    viewportY: number;
    onSubmit: (text: string) => void;
    onCancel: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
    x, y, width, text, fontSize, fontFamily, color, zoom, viewportX, viewportY,
    onSubmit, onCancel
}) => {
    const [value, setValue] = useState(text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate screen position from world coordinates
    let screenX = x * zoom + viewportX;
    let screenY = y * zoom + viewportY;

    // Clamp to visible screen bounds
    screenX = Math.max(10, Math.min(screenX, window.innerWidth - 200));
    screenY = Math.max(10, Math.min(screenY, window.innerHeight - 100));

    const scaledFontSize = fontSize * zoom;

    useEffect(() => {
        // Focus and select after a short delay to ensure rendering is complete
        const timer = setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.select();
            }
        }, 50);
        return () => clearTimeout(timer);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Stop propagation to prevent canvas keyboard shortcuts from triggering
        e.stopPropagation();

        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit(value);
        }
    };

    // Handle click on the overlay background (outside the textarea)
    const handleOverlayClick = useCallback((e: React.MouseEvent) => {
        // Only submit if clicking the overlay background, not the textarea itself
        if (e.target === containerRef.current) {
            if (value.trim()) {
                onSubmit(value);
            } else {
                onCancel();
            }
        }
    }, [value, onSubmit, onCancel]);

    // Prevent mouse events from bubbling to canvas when clicking the textarea
    const stopPropagation = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div
            ref={containerRef}
            onClick={handleOverlayClick}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 9999,
            }}
        >
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={stopPropagation}
                onMouseDown={stopPropagation}
                autoFocus
                style={{
                    position: 'absolute',
                    left: screenX,
                    top: screenY,
                    width: Math.max(width * zoom, 150),
                    minWidth: 150,
                    minHeight: Math.max(scaledFontSize + 20, 40),
                    fontSize: Math.max(scaledFontSize, 14),
                    fontFamily: fontFamily,
                    color: color,
                    border: '3px solid #3b82f6',
                    borderRadius: 6,
                    padding: 8,
                    background: 'white',
                    outline: 'none',
                    resize: 'both',
                    zIndex: 10000,
                    lineHeight: 1.4,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}
                placeholder="Type here..."
            />
        </div>
    );
};
