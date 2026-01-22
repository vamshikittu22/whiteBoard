import { describe, it, expect, vi } from 'vitest';
import { applyOpToState, getInverseOp } from '../store';
import { CanvasItem, Op } from '../types';

describe('Store Core Logic', () => {
    it('should apply create operation correctly', () => {
        const set = vi.fn();
        const item: CanvasItem = {
            type: 'rect',
            id: 'test-1',
            x: 10,
            y: 10,
            width: 100,
            height: 100,
            stroke: '#000',
            fill: 'transparent',
            strokeWidth: 2,
        };

        const op: Op = { type: 'create', item };

        applyOpToState(set, op);

        const updater = set.mock.calls[0][0];
        const initialState = { items: {}, itemOrder: [] };
        const newState = updater(initialState);

        expect(newState.items['test-1']).toEqual(item);
        expect(newState.itemOrder).toContain('test-1');
    });

    it('should generate inverse operation for delete', () => {
        const item: CanvasItem = {
            type: 'rect',
            id: 'test-1',
            x: 10,
            y: 10,
            width: 100,
            height: 100,
        } as any;

        const op: Op = { type: 'delete', id: 'test-1', item };
        const inverse = getInverseOp(op);

        expect(inverse.type).toBe('create');
        if (inverse.type === 'create') {
            expect(inverse.item.id).toBe('test-1');
        }
    });
});
