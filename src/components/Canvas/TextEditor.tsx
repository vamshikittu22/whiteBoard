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
    const screenX = x * zoom + viewportX;
    const screenY = y * zoom + viewportY;
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
                minWidth: 100,
                minHeight: scaledFontSize + 10,
                fontSize: scaledFontSize,
                fontFamily: fontFamily,
                color: color,
                border: '2px solid #3b82f6',
                borderRadius: 4,
                padding: 4,
                background: 'rgba(255,255,255,0.95)',
                outline: 'none',
                resize: 'both',
                zIndex: 1000,
                lineHeight: 1.2,
            }}
            placeholder="Type here..."
        />
    );
};
