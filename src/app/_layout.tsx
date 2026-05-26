import { Tabs } from 'expo-router';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AuthScreen from '@/components/AuthScreen';
import { AppContextProvider, useAppContext } from '@/context/AppContext';

const C = {
    surface: '#1e293b',
    accent: '#6366f1',
    textMuted: 'rgba(255,255,255,0.4)',
    border: 'rgba(255,255,255,0.08)',
};

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
    return <Text style={{ fontSize: 20, opacity: color === C.accent ? 1 : 0.4 }}>{emoji}</Text>;
}

function AuthOverlay() {
    const { isAuthenticated } = useAppContext();
    if (isAuthenticated) return null;
    return (
        <View style={styles.overlay}>
            <AuthScreen />
        </View>
    );
}

function CartTabTitle() {
    const { cart } = useAppContext();
    const count = cart.reduce((n, i) => n + i.quantity, 0);
    return count > 0 ? `Cart (${count})` : 'Cart';
}

export default function RootLayout() {
    return (
        <AppContextProvider>
            <ThemeProvider value={DarkTheme}>
                <AnimatedSplashOverlay />
                <Tabs
                    screenOptions={{
                        headerShown: false,
                        tabBarStyle: {
                            backgroundColor: C.surface,
                            borderTopColor: C.border,
                            borderTopWidth: 1,
                            height: 64,
                            paddingBottom: 10,
                            paddingTop: 8,
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
                            tabBarIcon: ({ color }) => <TabIcon emoji="🏬" color={color} />,
                        }}
                    />
                    <Tabs.Screen
                        name="cart"
                        options={{
                            title: 'Cart',
                            tabBarIcon: ({ color }) => <TabIcon emoji="🛒" color={color} />,
                        }}
                    />
                    <Tabs.Screen
                        name="profile"
                        options={{
                            title: 'Profile',
                            tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
                        }}
                    />
                    <Tabs.Screen
                        name="explore"
                        options={{ href: null }}
                    />
                </Tabs>
                <AuthOverlay />
            </ThemeProvider>
        </AppContextProvider>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 999,
    },
});
