import type { Customer } from './types';

const BASE = 'https://rammel29.pythonanywhere.com';
export const API_URL = `${BASE}/api/`;
export const MEDIA_BASE = BASE;

let authToken: string | null = null;
export const setToken = (token: string | null) => { authToken = token; };

const headers = (): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    return h;
};

const get = async (path: string) => {
    const res = await fetch(`${API_URL}${path}`, { headers: headers() });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
};

const post = async (path: string, body: any) => {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err: any = new Error(`${res.status}`);
        err.response = { data };
        throw err;
    }
    return res.json();
};

const patch = async (path: string, body: any) => {
    const res = await fetch(`${API_URL}${path}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
};

const patchForm = async (path: string, body: FormData) => {
    const h: Record<string, string> = {};
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_URL}${path}`, { method: 'PATCH', headers: h, body });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err: any = new Error(`${res.status}`);
        err.response = { data };
        throw err;
    }
    return res.json();
};

export const customerAPI = {
    getCustomers: () => get('customers/'),
    getCustomer: (id: number) => get(`customers/${id}/`),
    addCustomer: (data: Customer) => post('customers/', data),
    loginCustomer: (data: any) => post('customers/login/', data),
    sendOtp: (email: string) => post('customers/send-otp/', { email }),
    signupWithOtp: (data: any) => post('customers/signup/', data),
    verifyAccount: (data: any) => post('customers/verify-account/', data),
    updateCustomer: (id: number, data: any) => patch(`customers/${id}/`, data),
    uploadAvatar: (id: number, formData: FormData) => patchForm(`customers/${id}/`, formData),
};

export const productAPI = {
    getProducts: () => get('products/'),
    getProduct: (id: number) => get(`products/${id}/`),
};

export const invoiceAPI = {
    getInvoices: () => get('invoices/'),
    getInvoice: (id: number) => get(`invoices/${id}/`),
    createInvoice: (data: any) => post('invoices/', data),
};
