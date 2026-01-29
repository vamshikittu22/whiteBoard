import React, { useState, useRef, useEffect } from 'react';

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

    // Calculate screen position from world coordinates
    let screenX = x * zoom + viewportX;
    let screenY = y * zoom + viewportY;

    // Clamp to visible screen bounds
    screenX = Math.max(10, Math.min(screenX, window.innerWidth - 200));
    screenY = Math.max(10, Math.min(screenY, window.innerHeight - 100));

    const scaledFontSize = fontSize * zoom;

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onCancel();
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit(value);
        }
    };

    const handleBlur = () => {
        if (value.trim()) {
            onSubmit(value);
        } else {
            onCancel();
        }
    };

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            style={{
                position: 'absolute',
                left: screenX,
                top: screenY,
                width: width ? width * zoom : 'auto',
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
                zIndex: 9999,
                lineHeight: 1.4,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            }}
            placeholder="Type here..."
        />
    );
};
