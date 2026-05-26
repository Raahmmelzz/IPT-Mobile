import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    StyleSheet, TextInput, Alert, ActivityIndicator, StatusBar, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAppContext } from '@/context/AppContext';
import { customerAPI, invoiceAPI } from '@/lib/api';
import type { Invoice } from '@/lib/types';
import { BottomTabInset, Spacing } from '@/constants/theme';

const C = {
    bg: '#0f172a', surface: '#1e293b', card: '#0f172a',
    accent: '#6366f1', accentLight: '#818cf8',
    text: '#ffffff', textMuted: 'rgba(255,255,255,0.5)',
    textDim: 'rgba(255,255,255,0.2)',
    success: '#10b981', danger: '#ef4444', warning: '#f59e0b',
    border: 'rgba(255,255,255,0.1)', borderCard: 'rgba(255,255,255,0.06)',
};

type Tab = 'overview' | 'orders' | 'settings';

function getInitials(name: string) {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
}

const AVATAR_COLORS = ['#4f46e5', '#059669', '#dc2626'];

export default function ProfileScreen() {
    const { customer, logout, setCustomer } = useAppContext();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ name: '', email: '', number: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    useEffect(() => {
        if (customer) {
            setEditData({ name: customer.name, email: customer.email, number: customer.number });
        }
    }, [customer?.customerid]);

    useEffect(() => {
        if (!customer?.customerid) return;
        setLoadingOrders(true);
        invoiceAPI.getInvoices()
            .then((data: Invoice[]) => {
                const mine = data.filter(inv => Number(inv.customer) === Number(customer.customerid));
                setInvoices(mine);
            })
            .catch(() => {})
            .finally(() => setLoadingOrders(false));
    }, [customer?.customerid]);

    const totalSpent = invoices.reduce((s, inv) => s + Number(inv.total || 0), 0);
    const avatarColor = AVATAR_COLORS[(customer?.customerid || 0) % 3];

    const pickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photo library.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (result.canceled || !result.assets?.[0] || !customer?.customerid) return;
        const asset = result.assets[0];
        const formData = new FormData();
        formData.append('profile_picture', { uri: asset.uri, name: 'avatar.jpg', type: asset.mimeType || 'image/jpeg' } as any);
        setIsUploadingAvatar(true);
        try {
            const res = await customerAPI.uploadAvatar(customer.customerid, formData);
            setCustomer(res);
        } catch {
            Alert.alert('Error', 'Could not upload profile picture.');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleSave = async () => {
        if (!customer?.customerid) return;
        setIsSaving(true);
        try {
            const res = await customerAPI.updateCustomer(customer.customerid, editData);
            setCustomer(res);
            setIsEditing(false);
            Alert.alert('Saved', 'Profile updated successfully.');
        } catch {
            Alert.alert('Error', 'Could not save changes.');
        } finally {
            setIsSaving(false);
        }
    };


    if (!customer) {
        return (
            <View style={[styles.bg, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: C.textMuted, fontSize: 16 }}>Not logged in.</Text>
            </View>
        );
    }

    return (
        <View style={[styles.bg, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} />

            <ScrollView
                contentContainerStyle={[
                    styles.scroll,
                    { paddingBottom: insets.bottom + BottomTabInset + Spacing.three },
                ]}
            >
                <Text style={styles.pageTitle}>Profile</Text>

                {/* Avatar + Name */}
                <View style={styles.heroSection}>
                    <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrapper} activeOpacity={0.8}>
                        {customer.profile_picture ? (
                            <Image source={{ uri: customer.profile_picture! }} style={styles.avatarImg} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                                <Text style={styles.avatarText}>{getInitials(customer.name)}</Text>
                            </View>
                        )}
                        {isUploadingAvatar ? (
                            <View style={styles.avatarOverlay}>
                                <ActivityIndicator color="#fff" />
                            </View>
                        ) : (
                            <View style={styles.avatarEditBadge}>
                                <Text style={{ fontSize: 14 }}>📷</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center', gap: 4 }}>
                        <Text style={styles.displayName}>{customer.name}</Text>
                        <View style={styles.memberBadge}>
                            <Text style={styles.memberBadgeText}>VERIFIED MEMBER</Text>
                        </View>
                        <Text style={styles.username}>@{customer.username}</Text>
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{invoices.length}</Text>
                        <Text style={styles.statLabel}>Orders</Text>
                        <Text style={{ fontSize: 20 }}>📦</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: '#c084fc' }]}>
                            ₱{totalSpent >= 1000 ? (totalSpent / 1000).toFixed(1) + 'k' : totalSpent.toLocaleString()}
                        </Text>
                        <Text style={styles.statLabel}>Spent</Text>
                        <Text style={{ fontSize: 20 }}>💳</Text>
                    </View>
                </View>

                {/* Tab Navigation */}
                <View style={styles.tabRow}>
                    {(['overview', 'orders', 'settings'] as Tab[]).map(t => (
                        <TouchableOpacity key={t} onPress={() => setActiveTab(t)}
                            style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}>
                            <Text style={[styles.tabBtnText, activeTab === t && styles.tabBtnTextActive]}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Overview ── */}
                {activeTab === 'overview' && (
                    <View style={styles.section}>
                        <DetailCard icon="📧" label="Email" value={customer.email} />
                        <DetailCard icon="📞" label="Phone" value={`+63 ${customer.number}`} />
                        <DetailCard icon="🚚" label="Active Orders" value={String(invoices.length)} />
                        <DetailCard icon="👑" label="Account Status" value="Gold Member" />
                    </View>
                )}

                {/* ── Orders ── */}
                {activeTab === 'orders' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Purchase History</Text>
                        {loadingOrders ? (
                            <ActivityIndicator color={C.accent} style={{ marginTop: 20 }} />
                        ) : invoices.length === 0 ? (
                            <Text style={{ color: C.textMuted, fontSize: 14, marginTop: 10 }}>No orders found.</Text>
                        ) : (
                            invoices.map(inv => (
                                <View key={inv.invoiceid} style={styles.orderCard}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.orderInv}>Invoice #{inv.invoiceid}</Text>
                                        <Text style={styles.orderTotal}>₱{Number(inv.total).toLocaleString()}</Text>
                                        <Text style={styles.orderDate}>
                                            {inv.date ? new Date(inv.date).toLocaleDateString() : '—'}
                                        </Text>
                                    </View>
                                    <View style={[styles.orderStatus, inv.is_paid ? styles.orderPaid : styles.orderPending]}>
                                        <Text style={[styles.orderStatusText, inv.is_paid ? { color: '#34d399' } : { color: '#fbbf24' }]}>
                                            {inv.is_paid ? 'SUCCESS' : 'PENDING'}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* ── Settings ── */}
                {activeTab === 'settings' && (
                    <View style={styles.section}>
                        <View style={styles.settingsHeader}>
                            <Text style={styles.sectionTitle}>Edit Credentials</Text>
                            {!isEditing && (
                                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editBtn}>
                                    <Text style={styles.editBtnText}>Edit Mode</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {(['name', 'email', 'number'] as const).map(key => (
                            <View key={key} style={styles.fieldBlock}>
                                <Text style={styles.fieldLabel}>{key.toUpperCase()}</Text>
                                {isEditing ? (
                                    <TextInput
                                        value={editData[key]}
                                        onChangeText={v => setEditData(p => ({ ...p, [key]: v }))}
                                        style={styles.fieldInput}
                                        placeholderTextColor={C.textDim}
                                        autoCapitalize="none"
                                        keyboardType={key === 'email' ? 'email-address' : key === 'number' ? 'number-pad' : 'default'}
                                    />
                                ) : (
                                    <Text style={styles.fieldValue}>{editData[key] || '—'}</Text>
                                )}
                            </View>
                        ))}

                        {isEditing && (
                            <View style={styles.editActions}>
                                <TouchableOpacity onPress={handleSave} disabled={isSaving}
                                    style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}>
                                    {isSaving
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={styles.saveBtnText}>Apply Changes</Text>
                                    }
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { setIsEditing(false); setEditData({ name: customer.name, email: customer.email, number: customer.number }); }}
                                    style={styles.cancelBtn}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Sign Out */}
                <TouchableOpacity onPress={logout} style={styles.signOutBtn} activeOpacity={0.8}>
                    <Text style={styles.signOutBtnText}>Sign Out</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

function DetailCard({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View style={detailStyles.card}>
            <View style={detailStyles.iconBox}><Text style={{ fontSize: 20 }}>{icon}</Text></View>
            <View style={{ flex: 1 }}>
                <Text style={detailStyles.label}>{label}</Text>
                <Text style={detailStyles.value}>{value}</Text>
            </View>
        </View>
    );
}

const detailStyles = StyleSheet.create({
    card: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: 'rgba(15,23,42,0.4)', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: C.borderCard,
    },
    iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
    label: { color: C.textDim, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 2 },
    value: { color: C.text, fontWeight: '700', fontSize: 15 },
});

const styles = StyleSheet.create({
    bg: { flex: 1, backgroundColor: C.bg },
    pageTitle: { color: C.text, fontWeight: '900', fontSize: 26, marginBottom: 4 },
    signOutBtn: {
        marginTop: 8,
        borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
        borderRadius: 16, paddingVertical: 16, alignItems: 'center',
        backgroundColor: 'rgba(239,68,68,0.08)',
    },
    signOutBtnText: { color: '#f87171', fontWeight: '900', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' },
    scroll: { padding: 20, gap: 16 },
    heroSection: { alignItems: 'center', gap: 12, paddingVertical: 8 },
    avatarWrapper: { position: 'relative', width: 84, height: 84 },
    avatar: { width: 84, height: 84, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    avatarImg: { width: 84, height: 84, borderRadius: 24 },
    avatarOverlay: { position: 'absolute', inset: 0, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
    avatarEditBadge: { position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: 8, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
    avatarText: { color: '#fff', fontWeight: '900', fontSize: 32 },
    displayName: { color: C.text, fontWeight: '900', fontSize: 24 },
    memberBadge: { backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
    memberBadgeText: { color: C.accentLight, fontWeight: '900', fontSize: 10, letterSpacing: 2 },
    username: { color: C.textMuted, fontWeight: '700', fontSize: 15 },
    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: {
        flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: C.borderCard, gap: 4,
    },
    statValue: { color: C.accentLight, fontWeight: '900', fontSize: 22 },
    statLabel: { color: C.textDim, fontWeight: '700', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
    tabRow: {
        flexDirection: 'row', backgroundColor: 'rgba(30,41,59,0.4)',
        borderRadius: 16, padding: 4, gap: 4,
    },
    tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
    tabBtnActive: { backgroundColor: C.accent },
    tabBtnText: { color: C.textMuted, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
    tabBtnTextActive: { color: '#fff' },
    section: { gap: 10 },
    sectionTitle: { color: C.text, fontWeight: '900', fontSize: 18, marginBottom: 4 },
    orderCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: C.borderCard,
    },
    orderInv: { color: C.accentLight, fontWeight: '900', fontSize: 10, letterSpacing: 2, marginBottom: 2 },
    orderTotal: { color: C.text, fontWeight: '900', fontSize: 20 },
    orderDate: { color: C.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
    orderStatus: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
    orderPaid: { backgroundColor: 'rgba(16,185,129,0.1)' },
    orderPending: { backgroundColor: 'rgba(245,158,11,0.1)' },
    orderStatusText: { fontWeight: '900', fontSize: 10, letterSpacing: 1 },
    settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    editBtn: { backgroundColor: C.text, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
    editBtnText: { color: C.bg, fontWeight: '900', fontSize: 12 },
    fieldBlock: { gap: 6 },
    fieldLabel: { color: C.textDim, fontWeight: '900', fontSize: 10, letterSpacing: 3 },
    fieldInput: {
        backgroundColor: 'rgba(15,23,42,0.5)', borderWidth: 1, borderColor: C.border,
        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
        color: C.text, fontWeight: '700', fontSize: 16,
    },
    fieldValue: { color: C.text, fontWeight: '900', fontSize: 20 },
    editActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
    saveBtn: { flex: 1, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
    cancelBtn: { paddingHorizontal: 20, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    cancelBtnText: { color: C.textMuted, fontWeight: '900', fontSize: 14 },
});
