import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Customer, Product } from '@/lib/types';
import { setToken } from '@/lib/api';

export interface CartItem {
    product: Product;
    quantity: number;
}

interface AppContextType {
    customer: Customer | null;
    isAuthenticated: boolean;
    cart: CartItem[];
    login: (customer: Customer, token: string) => void;
    logout: () => void;
    setCustomer: (customer: Customer) => void;
    addToCart: (product: Product) => void;
    removeFromCart: (productId: number) => void;
    updateQuantity: (productId: number, qty: number) => void;
    clearCart: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
    const [customer, setCustomerState] = useState<Customer | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);

    // Restore session on app start
    useEffect(() => {
        AsyncStorage.getItem('customer').then(raw => {
            if (!raw) return;
            try {
                const cust = JSON.parse(raw);
                setCustomerState(cust);
                setIsAuthenticated(true);
            } catch {}
        });
    }, []);

    const login = useCallback((cust: Customer, token: string) => {
        setToken(token);
        setCustomerState(cust);
        setIsAuthenticated(true);
        AsyncStorage.setItem('customer', JSON.stringify(cust));
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setCustomerState(null);
        setIsAuthenticated(false);
        setCart([]);
        AsyncStorage.removeItem('customer');
    }, []);

    const setCustomer = useCallback((cust: Customer) => {
        setCustomerState(cust);
        AsyncStorage.setItem('customer', JSON.stringify(cust));
    }, []);

    const addToCart = useCallback((product: Product) => {
        setCart(prev => {
            const existing = prev.find(i => i.product.productid === product.productid);
            if (existing) {
                return prev.map(i =>
                    i.product.productid === product.productid
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    }, []);

    const removeFromCart = useCallback((productId: number) => {
        setCart(prev => prev.filter(i => i.product.productid !== productId));
    }, []);

    const updateQuantity = useCallback((productId: number, qty: number) => {
        if (qty <= 0) {
            setCart(prev => prev.filter(i => i.product.productid !== productId));
        } else {
            setCart(prev =>
                prev.map(i =>
                    i.product.productid === productId ? { ...i, quantity: qty } : i
                )
            );
        }
    }, []);

    const clearCart = useCallback(() => setCart([]), []);

    return (
        <AppContext.Provider
            value={{
                customer,
                isAuthenticated,
                cart,
                login,
                logout,
                setCustomer,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useAppContext must be used within AppContextProvider');
    return ctx;
}
