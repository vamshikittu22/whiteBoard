import { BroadcastTransport } from './broadcast';
import { SocketIoTransport } from './socket-io';
import { TransportLayer } from './types';

export * from './types';
export * from './broadcast';
export * from './socket-io';

export const createTransport = (
    mode: 'broadcast' | 'socketio' = 'broadcast',
    accessToken?: string,
    clientId?: string
): TransportLayer => {
    if (mode === 'socketio') {
        if (!accessToken || !clientId) {
            console.warn('[Transport] Socket.IO mode requires accessToken and clientId, falling back to broadcast');
            return new BroadcastTransport();
        }
        return new SocketIoTransport(accessToken, clientId);
    }
    return new BroadcastTransport();
};
