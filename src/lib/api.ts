const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000';

class ApiClient {
    private accessToken: string | null = null;

    setToken(token: string | null) {
        this.accessToken = token;
    }

    private async request(path: string, options: RequestInit = {}) {
        const headers = new Headers(options.headers);
        if (this.accessToken) {
            headers.set('Authorization', `Bearer ${this.accessToken}`);
        }
        if (!(options.body instanceof FormData)) {
            headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers,
        });

        if (response.status === 401 && path !== '/api/auth/login') {
            // Handle token expiration/unauthorized access
            // In a full implementation, we could trigger a refresh token flow here
            window.dispatchEvent(new CustomEvent('api-unauthorized'));
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
            throw new Error(error.error || `Request failed with status ${response.status}`);
        }

        return response.json();
    }

    get(path: string) {
        return this.request(path, { method: 'GET' });
    }

    post(path: string, body: any) {
        return this.request(path, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    put(path: string, body: any) {
        return this.request(path, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    delete(path: string) {
        return this.request(path, { method: 'DELETE' });
    }
}

export const api = new ApiClient();
