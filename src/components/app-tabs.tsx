import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAppContext } from '@/context/AppContext';

const C = {
    bg: '#0f172a',
    surface: '#1e293b',
    accent: '#6366f1',
    textMuted: 'rgba(255,255,255,0.4)',
    border: 'rgba(255,255,255,0.08)',
};

export default function AppTabs() {
    const { cart } = useAppContext();
    const cartCount = cart.reduce((n, i) => n + i.quantity, 0);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: C.surface,
                    borderTopColor: C.border,
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 6,
                },
                tabBarActiveTintColor: C.accent,
                tabBarInactiveTintColor: C.textMuted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 0.5,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Store',
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏬</Text>,
                }}
            />
            <Tabs.Screen
                name="cart"
                options={{
                    title: cartCount > 0 ? `Cart (${cartCount})` : 'Cart',
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🛒</Text>,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
                }}
            />
        </Tabs>
    );
}
