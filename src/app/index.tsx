import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    FlatList, Image, StyleSheet, ActivityIndicator,
    Alert, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '@/context/AppContext';
import Chatbot from '@/components/Chatbot';
import { productAPI, MEDIA_BASE } from '@/lib/api';
import type { Product } from '@/lib/types';
import { BottomTabInset, Spacing } from '@/constants/theme';

const C = {
    bg: '#0f172a',
    surface: '#1e293b',
    card: '#0f172a',
    cardBorder: 'rgba(255,255,255,0.08)',
    accent: '#6366f1',
    accentLight: '#818cf8',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.5)',
    textDim: 'rgba(255,255,255,0.3)',
    success: '#10b981',
    border: 'rgba(255,255,255,0.1)',
};

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
    const imageUri = product.image
        ? (product.image.startsWith('http') ? product.image : `${MEDIA_BASE}${product.image}`)
        : `https://picsum.photos/seed/${product.productid}/400/300`;

    return (
        <View style={cardStyles.card}>
            <Image source={{ uri: imageUri }} style={cardStyles.image} resizeMode="cover" />
            <View style={cardStyles.body}>
                <Text style={cardStyles.name} numberOfLines={2}>{product.productname}</Text>
                <Text style={cardStyles.price}>₱{Number(product.price).toLocaleString()}</Text>
                <TouchableOpacity onPress={onAdd} style={cardStyles.btn} activeOpacity={0.7}>
                    <Text style={cardStyles.btnText}>Add to Cart</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const cardStyles = StyleSheet.create({
    card: {
        flex: 1, backgroundColor: 'rgba(15,23,42,0.9)', borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', margin: 4,
    },
    image: { width: '100%', height: 130, backgroundColor: '#0a0f1e' },
    body: { padding: 12, gap: 6 },
    name: { color: C.text, fontWeight: '700', fontSize: 13, lineHeight: 18 },
    price: { color: C.accentLight, fontWeight: '900', fontSize: 18 },
    btn: {
        backgroundColor: '#1e293b', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10, paddingVertical: 9, alignItems: 'center',
    },
    btnText: { color: '#cbd5e1', fontWeight: '700', fontSize: 12 },
});

export default function StoreScreen() {
    const { addToCart, cart } = useAppContext();
    const insets = useSafeAreaInsets();
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [addedId, setAddedId] = useState<number | null>(null);

    const loadProducts = useCallback(async () => {
        try {
            const data = await productAPI.getProducts();
            setProducts(data);
        } catch {
            Alert.alert('Error', 'Could not load products.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadProducts(); }, [loadProducts]);

    const filtered = products.filter(p =>
        p.productname.toLowerCase().includes(search.toLowerCase())
    );
    const cartCount = cart.reduce((n, i) => n + i.quantity, 0);

    const handleAdd = (product: Product) => {
        addToCart(product);
        setAddedId(product.productid ?? null);
        setTimeout(() => setAddedId(null), 900);
    };

    return (
        <View style={[storeStyles.bg, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} />

            <View style={storeStyles.header}>
                <View style={storeStyles.headerLeft}>
                    <View style={storeStyles.logoMini}>
                        <Text style={storeStyles.logoMiniText}>G</Text>
                    </View>
                    <Text style={storeStyles.headerTitle}>G-Stop</Text>
                </View>
                <View style={storeStyles.cartBadgeWrap}>
                    {cartCount > 0 && (
                        <View style={storeStyles.cartBadge}>
                            <Text style={storeStyles.cartBadgeText}>{cartCount}</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={storeStyles.hero}>
                <Text style={storeStyles.heroTitle}>Level Up Your Setup</Text>
                <Text style={storeStyles.heroSub}>Premium gaming gear, delivered fast.</Text>
            </View>

            <View style={storeStyles.searchWrap}>
                <Text style={storeStyles.searchIcon}>🔍</Text>
                <TextInput value={search} onChangeText={setSearch}
                    placeholder="Search products..." placeholderTextColor={C.textDim}
                    style={storeStyles.searchInput} />
            </View>

            <Chatbot />

            {loading ? (
                <ActivityIndicator size="large" color={C.accent} style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => String(item.productid)}
                    numColumns={2}
                    contentContainerStyle={[
                        storeStyles.grid,
                        { paddingBottom: insets.bottom + BottomTabInset + Spacing.three }
                    ]}
                    renderItem={({ item }) => (
                        <View style={{ flex: 1, maxWidth: '50%' }}>
                            <ProductCard product={item} onAdd={() => handleAdd(item)} />
                            {addedId === item.productid && (
                                <View style={storeStyles.addedBadge}>
                                    <Text style={storeStyles.addedBadgeText}>Added ✓</Text>
                                </View>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 60 }}>
                            <Text style={{ color: C.textDim, fontSize: 16 }}>No products found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const storeStyles = StyleSheet.create({
    bg: { flex: 1, backgroundColor: C.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logoMini: { width: 32, height: 32, borderRadius: 9, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
    logoMiniText: { color: '#fff', fontWeight: '900', fontSize: 16 },
    headerTitle: { color: C.text, fontWeight: '900', fontSize: 20 },
    cartBadgeWrap: { width: 32, alignItems: 'flex-end' },
    cartBadge: { backgroundColor: C.accent, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    cartBadgeText: { color: '#fff', fontWeight: '900', fontSize: 11 },
    hero: { paddingHorizontal: 20, paddingVertical: 16 },
    heroTitle: { color: C.text, fontWeight: '900', fontSize: 22 },
    heroSub: { color: C.textMuted, fontSize: 13, fontWeight: '600', marginTop: 2 },
    searchWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(15,23,42,0.8)', borderWidth: 1, borderColor: C.border,
        borderRadius: 14, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14,
    },
    searchIcon: { fontSize: 15 },
    searchInput: { flex: 1, color: C.text, fontWeight: '700', fontSize: 14, paddingVertical: 12 },
    grid: { padding: 12 },
    addedBadge: {
        position: 'absolute', bottom: 8, left: 8, right: 8,
        backgroundColor: C.success, borderRadius: 8, paddingVertical: 4, alignItems: 'center',
    },
    addedBadgeText: { color: '#fff', fontWeight: '900', fontSize: 11 },
});
