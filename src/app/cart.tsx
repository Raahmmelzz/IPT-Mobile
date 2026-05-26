import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Image,
    StyleSheet, Modal, ScrollView, TextInput,
    ActivityIndicator, Alert, KeyboardAvoidingView,
    Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '@/context/AppContext';
import { invoiceAPI, MEDIA_BASE } from '@/lib/api';
import { BottomTabInset, Spacing } from '@/constants/theme';

const C = {
    bg: '#0f172a', surface: '#1e293b', card: '#0f172a',
    accent: '#6366f1', accentLight: '#818cf8',
    text: '#ffffff', textMuted: 'rgba(255,255,255,0.5)',
    textDim: 'rgba(255,255,255,0.3)',
    success: '#10b981', danger: '#ef4444', warning: '#f59e0b',
    border: 'rgba(255,255,255,0.1)', borderCard: 'rgba(255,255,255,0.08)',
};

type PaymentMethod = 'cash' | 'card' | 'ewallet' | 'bank';
const PAYMENT_LABELS: Record<PaymentMethod, string> = {
    cash: '💵 Cash', card: '💳 Card', ewallet: '📱 E-Wallet', bank: '🏦 Bank Transfer',
};

const STEPS = ['Order Summary', 'Customer Info', 'Payment'];

// ─── Order Success Screen ─────────────────────────────────────────────────────
function SuccessScreen({ invoiceNumber, total, method, amountPaid, change, onDone }: {
    invoiceNumber: string; total: number; method: string;
    amountPaid: number; change: number; onDone: () => void;
}) {
    return (
        <View style={successStyles.bg}>
            <View style={successStyles.icon}><Text style={{ fontSize: 48 }}>✅</Text></View>
            <Text style={successStyles.title}>Order Placed!</Text>
            <Text style={successStyles.inv}>{invoiceNumber}</Text>
            <View style={successStyles.card}>
                <Row label="Total" value={`₱${total.toFixed(2)}`} accent />
                <Row label="Payment" value={PAYMENT_LABELS[method as PaymentMethod] ?? method} />
                {method === 'cash' && (
                    <>
                        <Row label="Amount Paid" value={`₱${Number(amountPaid).toFixed(2)}`} />
                        <Row label="Change" value={`₱${Number(change).toFixed(2)}`} />
                    </>
                )}
            </View>
            <TouchableOpacity onPress={onDone} style={successStyles.btn}>
                <Text style={successStyles.btnText}>CONTINUE SHOPPING</Text>
            </TouchableOpacity>
        </View>
    );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <View style={rowStyles.row}>
            <Text style={rowStyles.label}>{label}</Text>
            <Text style={[rowStyles.value, accent && { color: C.accent }]}>{value}</Text>
        </View>
    );
}

const rowStyles = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    label: { color: C.textMuted, fontWeight: '700', fontSize: 13 },
    value: { color: C.text, fontWeight: '900', fontSize: 14 },
});

const successStyles = StyleSheet.create({
    bg: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
    icon: { marginBottom: 16 },
    title: { color: C.text, fontWeight: '900', fontSize: 28, marginBottom: 4 },
    inv: { color: C.textMuted, fontWeight: '700', fontSize: 14, marginBottom: 24 },
    card: { width: '100%', backgroundColor: C.surface, borderRadius: 16, padding: 20, marginBottom: 24, gap: 4 },
    btn: { backgroundColor: C.accent, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 16 },
    btnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 2 },
});

// ─── Checkout Modal ───────────────────────────────────────────────────────────
function CheckoutModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { cart, customer, clearCart } = useAppContext();
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [amountPaid, setAmountPaid] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [promoApplied, setPromoApplied] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [finalTotal, setFinalTotal] = useState(0);
    const [finalAmountPaid, setFinalAmountPaid] = useState(0);
    const [finalChange, setFinalChange] = useState(0);

    const subtotal = cart.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
    const discountAmt = subtotal * (discount / 100);
    const taxable = subtotal - discountAmt;
    const tax = taxable * 0.12;
    const total = taxable + tax;
    const change = Number(amountPaid) - total;

    const reset = () => {
        setStep(0); setPaymentMethod('cash'); setAmountPaid('');
        setPromoCode(''); setPromoApplied(false); setDiscount(0);
        setIsLoading(false); setIsSuccess(false); setInvoiceNumber('');
    };

    const handleClose = () => { reset(); onClose(); };

    const applyPromo = () => {
        const code = promoCode.toLowerCase();
        if (code === 'save10') { setDiscount(10); setPromoApplied(true); }
        else if (code === 'save20') { setDiscount(20); setPromoApplied(true); }
        else Alert.alert('Invalid Code', 'Promo code not recognized.');
    };

    const canProceed = () => {
        if (step === 1 && !customer) return false;
        if (step === 2 && paymentMethod === 'cash') {
            if (!amountPaid || Number(amountPaid) < total) return false;
        }
        return true;
    };

    const placeOrder = async () => {
        if (!customer?.customerid) return;
        setIsLoading(true);
        try {
            const invoiceData = {
                customer: customer.customerid,
                totalamount: Number(total.toFixed(2)),
                amount_paid: Number(Number(amountPaid || total).toFixed(2)),
                change: Number(Number(change >= 0 ? change : 0).toFixed(2)),
                payment_method: paymentMethod,
                is_paid: true,
                items: cart.map(i => ({
                    product: i.product.productid,
                    quantity: i.quantity,
                    unitprice: Number(Number(i.product.price).toFixed(2)),
                })),
            };
            const res = await invoiceAPI.createInvoice(invoiceData);
            setInvoiceNumber(res.id ? `INV-${res.id}` : `INV-${Date.now().toString().slice(-6)}`);
            setFinalTotal(total);
            setFinalAmountPaid(Number(amountPaid || total));
            setFinalChange(change >= 0 ? change : 0);
            setIsSuccess(true);
        } catch (err: any) {
            Alert.alert('Order Failed', 'Could not save order. Please try again.');
            console.error(err?.response?.data || err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
            <View style={[checkoutStyles.bg, { paddingTop: insets.top }]}>
                <StatusBar barStyle="light-content" backgroundColor={C.bg} />

                {isSuccess ? (
                    <SuccessScreen
                        invoiceNumber={invoiceNumber} total={finalTotal}
                        method={paymentMethod} amountPaid={finalAmountPaid} change={finalChange}
                        onDone={() => { clearCart(); handleClose(); }}
                    />
                ) : (
                    <>
                        {/* Header */}
                        <View style={checkoutStyles.header}>
                            <View style={checkoutStyles.headerLeft}>
                                <View style={checkoutStyles.logoBox}><Text style={checkoutStyles.logoText}>G</Text></View>
                                <View>
                                    <Text style={checkoutStyles.headerTitle}>Checkout</Text>
                                    {invoiceNumber ? <Text style={checkoutStyles.invNum}>{invoiceNumber}</Text> : null}
                                </View>
                            </View>
                            <TouchableOpacity onPress={handleClose} style={checkoutStyles.closeBtn}>
                                <Text style={checkoutStyles.closeBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Step Indicators */}
                        <View style={checkoutStyles.steps}>
                            {STEPS.map((s, i) => (
                                <React.Fragment key={s}>
                                    <TouchableOpacity
                                        onPress={() => i < step && setStep(i)}
                                        style={checkoutStyles.stepItem}
                                    >
                                        <View style={[
                                            checkoutStyles.stepCircle,
                                            i === step && checkoutStyles.stepCircleActive,
                                            i < step && checkoutStyles.stepCircleDone,
                                        ]}>
                                            <Text style={[checkoutStyles.stepNum, (i === step || i < step) && { color: '#fff' }]}>
                                                {i < step ? '✓' : i + 1}
                                            </Text>
                                        </View>
                                        <Text style={[checkoutStyles.stepLabel, i === step && { color: C.accentLight }]} numberOfLines={1}>
                                            {s}
                                        </Text>
                                    </TouchableOpacity>
                                    {i < STEPS.length - 1 && (
                                        <View style={[checkoutStyles.stepLine, i < step && { backgroundColor: C.success }]} />
                                    )}
                                </React.Fragment>
                            ))}
                        </View>

                        {/* Content */}
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                            <ScrollView style={{ flex: 1 }} contentContainerStyle={checkoutStyles.content} keyboardShouldPersistTaps="handled">

                                {/* Step 0: Order Summary */}
                                {step === 0 && (
                                    <View style={{ gap: 12 }}>
                                        <Text style={checkoutStyles.sectionTitle}>Items</Text>
                                        {cart.map(item => {
                                            const uri = item.product.image
                                                ? (item.product.image.startsWith('http') ? item.product.image : `${MEDIA_BASE}${item.product.image}`)
                                                : `https://picsum.photos/seed/${item.product.productid}/80/80`;
                                            return (
                                                <View key={item.product.productid} style={checkoutStyles.itemRow}>
                                                    <Image source={{ uri }} style={checkoutStyles.itemImg} />
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={checkoutStyles.itemName} numberOfLines={1}>{item.product.productname}</Text>
                                                        <Text style={checkoutStyles.itemPrice}>₱{Number(item.product.price).toLocaleString()} × {item.quantity}</Text>
                                                    </View>
                                                    <Text style={checkoutStyles.itemTotal}>
                                                        ₱{(Number(item.product.price) * item.quantity).toFixed(2)}
                                                    </Text>
                                                </View>
                                            );
                                        })}

                                        {/* Promo */}
                                        <View style={checkoutStyles.promoRow}>
                                            <TextInput
                                                value={promoCode} onChangeText={setPromoCode}
                                                placeholder="Promo code (SAVE10, SAVE20)"
                                                placeholderTextColor={C.textDim}
                                                style={checkoutStyles.promoInput}
                                                autoCapitalize="characters"
                                                editable={!promoApplied}
                                            />
                                            <TouchableOpacity onPress={applyPromo} disabled={promoApplied} style={checkoutStyles.promoBtn}>
                                                <Text style={checkoutStyles.promoBtnText}>{promoApplied ? '✓' : 'Apply'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                        {promoApplied && (
                                            <Text style={{ color: C.success, fontWeight: '700', fontSize: 12 }}>
                                                {discount}% discount applied!
                                            </Text>
                                        )}

                                        {/* Totals */}
                                        <View style={checkoutStyles.totalsCard}>
                                            <Row label="Subtotal" value={`₱${subtotal.toFixed(2)}`} />
                                            {discountAmt > 0 && <Row label={`Discount (${discount}%)`} value={`-₱${discountAmt.toFixed(2)}`} />}
                                            <Row label="Tax (12%)" value={`₱${tax.toFixed(2)}`} />
                                            <View style={checkoutStyles.divider} />
                                            <Row label="Total" value={`₱${total.toFixed(2)}`} accent />
                                        </View>
                                    </View>
                                )}

                                {/* Step 1: Customer Info */}
                                {step === 1 && (
                                    <View style={{ gap: 12 }}>
                                        <Text style={checkoutStyles.sectionTitle}>Customer Info</Text>
                                        {customer ? (
                                            <View style={checkoutStyles.customerCard}>
                                                <View style={checkoutStyles.customerAvatar}>
                                                    <Text style={checkoutStyles.customerInitial}>
                                                        {customer.name ? customer.name[0].toUpperCase() : '?'}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1, gap: 4 }}>
                                                    <Text style={checkoutStyles.customerName}>{customer.name}</Text>
                                                    <Text style={checkoutStyles.customerDetail}>@{customer.username}</Text>
                                                    <Text style={checkoutStyles.customerDetail}>{customer.email}</Text>
                                                    <Text style={checkoutStyles.customerDetail}>+63 {customer.number}</Text>
                                                </View>
                                            </View>
                                        ) : (
                                            <View style={checkoutStyles.noCustomer}>
                                                <Text style={{ color: C.danger, fontWeight: '700' }}>
                                                    No customer logged in. Please go back and log in first.
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Step 2: Payment */}
                                {step === 2 && (
                                    <View style={{ gap: 16 }}>
                                        <Text style={checkoutStyles.sectionTitle}>Payment Method</Text>
                                        <View style={{ gap: 10 }}>
                                            {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map(m => (
                                                <TouchableOpacity key={m} onPress={() => setPaymentMethod(m)}
                                                    style={[checkoutStyles.payOption, paymentMethod === m && checkoutStyles.payOptionActive]}>
                                                    <Text style={checkoutStyles.payOptionText}>{PAYMENT_LABELS[m]}</Text>
                                                    {paymentMethod === m && <View style={checkoutStyles.payCheck}><Text style={{ color: '#fff', fontSize: 10 }}>✓</Text></View>}
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        {paymentMethod === 'cash' && (
                                            <View style={{ gap: 8 }}>
                                                <Text style={checkoutStyles.label}>Amount Paid</Text>
                                                <TextInput
                                                    value={amountPaid} onChangeText={setAmountPaid}
                                                    keyboardType="decimal-pad"
                                                    placeholder={`Min: ₱${total.toFixed(2)}`}
                                                    placeholderTextColor={C.textDim}
                                                    style={checkoutStyles.cashInput}
                                                />
                                                {Number(amountPaid) >= total && (
                                                    <View style={checkoutStyles.changeBox}>
                                                        <Text style={checkoutStyles.changeLabel}>Change</Text>
                                                        <Text style={checkoutStyles.changeAmt}>₱{change.toFixed(2)}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}

                                        <View style={checkoutStyles.totalsCard}>
                                            <Row label="Total Due" value={`₱${total.toFixed(2)}`} accent />
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        </KeyboardAvoidingView>

                        {/* Footer */}
                        <View style={[checkoutStyles.footer, { paddingBottom: insets.bottom + Spacing.two }]}>
                            <TouchableOpacity
                                onPress={() => step === 0 ? handleClose() : setStep(s => s - 1)}
                                style={checkoutStyles.backBtn}
                            >
                                <Text style={checkoutStyles.backBtnText}>{step === 0 ? 'Cancel' : '← Back'}</Text>
                            </TouchableOpacity>

                            {step < STEPS.length - 1 ? (
                                <TouchableOpacity
                                    onPress={() => setStep(s => s + 1)}
                                    disabled={!canProceed()}
                                    style={[checkoutStyles.nextBtn, !canProceed() && { opacity: 0.4 }]}
                                >
                                    <Text style={checkoutStyles.nextBtnText}>Continue →</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={placeOrder}
                                    disabled={isLoading || !canProceed()}
                                    style={[checkoutStyles.placeBtn, (isLoading || !canProceed()) && { opacity: 0.4 }]}
                                >
                                    {isLoading
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <Text style={checkoutStyles.nextBtnText}>✓ Place Order — ₱{total.toFixed(2)}</Text>
                                    }
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
}

const checkoutStyles = StyleSheet.create({
    bg: { flex: 1, backgroundColor: '#ffffff' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#1e1b4b', paddingHorizontal: 20, paddingVertical: 14,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logoBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    logoText: { color: '#fff', fontWeight: '900', fontSize: 18 },
    headerTitle: { color: '#fff', fontWeight: '900', fontSize: 18 },
    invNum: { color: '#a5b4fc', fontSize: 11, fontWeight: '600' },
    closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    closeBtnText: { color: '#a5b4fc', fontSize: 20, fontWeight: '700' },
    steps: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    },
    stepItem: { alignItems: 'center', gap: 4 },
    stepCircle: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: '#e2e8f0',
        alignItems: 'center', justifyContent: 'center',
    },
    stepCircleActive: { backgroundColor: '#4f46e5' },
    stepCircleDone: { backgroundColor: '#22c55e' },
    stepNum: { color: '#94a3b8', fontWeight: '900', fontSize: 12 },
    stepLabel: { color: '#94a3b8', fontWeight: '700', fontSize: 10, maxWidth: 70, textAlign: 'center' },
    stepLine: { flex: 1, height: 2, backgroundColor: '#e2e8f0', marginBottom: 16, marginHorizontal: 4 },
    content: { padding: 20, gap: 12, paddingBottom: 40 },
    sectionTitle: { color: '#1e293b', fontWeight: '900', fontSize: 18, marginBottom: 4 },
    itemRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#f8fafc', borderRadius: 12, padding: 10,
    },
    itemImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#e2e8f0' },
    itemName: { color: '#1e293b', fontWeight: '700', fontSize: 13 },
    itemPrice: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: 2 },
    itemTotal: { color: '#4f46e5', fontWeight: '900', fontSize: 14 },
    promoRow: { flexDirection: 'row', gap: 8 },
    promoInput: {
        flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 14,
        paddingVertical: 10, color: '#1e293b', fontWeight: '700', fontSize: 13,
    },
    promoBtn: { backgroundColor: '#4f46e5', borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
    promoBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
    totalsCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, gap: 4 },
    divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 6 },
    customerCard: {
        flexDirection: 'row', gap: 14, backgroundColor: '#f8fafc',
        borderRadius: 16, padding: 16, alignItems: 'flex-start',
    },
    customerAvatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
    customerInitial: { color: '#fff', fontWeight: '900', fontSize: 22 },
    customerName: { color: '#1e293b', fontWeight: '900', fontSize: 16 },
    customerDetail: { color: '#64748b', fontWeight: '600', fontSize: 13 },
    noCustomer: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 14 },
    payOption: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#f8fafc', borderRadius: 12, padding: 14,
        borderWidth: 2, borderColor: 'transparent',
    },
    payOptionActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
    payOptionText: { color: '#1e293b', fontWeight: '700', fontSize: 14 },
    payCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
    label: { color: '#64748b', fontWeight: '700', fontSize: 12, letterSpacing: 1 },
    cashInput: {
        backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 16,
        paddingVertical: 12, color: '#1e293b', fontWeight: '700', fontSize: 16,
    },
    changeBox: {
        flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f0fdf4',
        borderRadius: 10, padding: 12,
    },
    changeLabel: { color: '#166534', fontWeight: '700', fontSize: 14 },
    changeAmt: { color: '#15803d', fontWeight: '900', fontSize: 18 },
    footer: {
        flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff',
    },
    backBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    backBtnText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
    nextBtn: { flex: 2, backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    placeBtn: { flex: 2, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    nextBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});

// ─── Cart Screen ──────────────────────────────────────────────────────────────
export default function CartScreen() {
    const { cart, removeFromCart, updateQuantity } = useAppContext();
    const insets = useSafeAreaInsets();
    const [checkoutOpen, setCheckoutOpen] = useState(false);

    const total = cart.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);

    return (
        <View style={[cartStyles.bg, { paddingTop: insets.top }]}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} />

            <View style={cartStyles.header}>
                <Text style={cartStyles.title}>Your Cart</Text>
                <View style={cartStyles.badge}>
                    <Text style={cartStyles.badgeText}>{cart.length} item{cart.length !== 1 ? 's' : ''}</Text>
                </View>
            </View>

            {cart.length === 0 ? (
                <View style={cartStyles.empty}>
                    <Text style={{ fontSize: 48, marginBottom: 16 }}>🛒</Text>
                    <Text style={cartStyles.emptyText}>Your cart is empty.</Text>
                    <Text style={cartStyles.emptySubtext}>Head to the Store tab to add items.</Text>
                </View>
            ) : (
                <>
                    <FlatList
                        data={cart}
                        keyExtractor={item => String(item.product.productid)}
                        contentContainerStyle={[
                            cartStyles.list,
                            { paddingBottom: insets.bottom + BottomTabInset + Spacing.three + 140 },
                        ]}
                        renderItem={({ item }) => {
                            const uri = item.product.image
                                ? (item.product.image.startsWith('http') ? item.product.image : `${MEDIA_BASE}${item.product.image}`)
                                : `https://picsum.photos/seed/${item.product.productid}/80/80`;
                            return (
                                <View style={cartStyles.item}>
                                    <Image source={{ uri }} style={cartStyles.itemImg} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={cartStyles.itemName} numberOfLines={2}>{item.product.productname}</Text>
                                        <Text style={cartStyles.itemPrice}>₱{Number(item.product.price).toLocaleString()}</Text>
                                    </View>

                                    <View style={cartStyles.qtyRow}>
                                        <TouchableOpacity
                                            onPress={() => updateQuantity(item.product.productid!, item.quantity - 1)}
                                            style={cartStyles.qtyBtn}
                                        >
                                            <Text style={cartStyles.qtyBtnText}>−</Text>
                                        </TouchableOpacity>
                                        <Text style={cartStyles.qtyText}>{item.quantity}</Text>
                                        <TouchableOpacity
                                            onPress={() => updateQuantity(item.product.productid!, item.quantity + 1)}
                                            style={cartStyles.qtyBtn}
                                        >
                                            <Text style={cartStyles.qtyBtnText}>+</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => removeFromCart(item.product.productid!)}
                                        style={cartStyles.deleteBtn}
                                    >
                                        <Text style={{ fontSize: 16 }}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        }}
                    />

                    <View style={[cartStyles.footer, { paddingBottom: insets.bottom + BottomTabInset + Spacing.two }]}>
                        <View style={cartStyles.totalRow}>
                            <Text style={cartStyles.totalLabel}>Total</Text>
                            <Text style={cartStyles.totalAmt}>₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setCheckoutOpen(true)} style={cartStyles.checkoutBtn}>
                            <Text style={cartStyles.checkoutBtnText}>Proceed to Checkout →</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            <CheckoutModal visible={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
        </View>
    );
}

const cartStyles = StyleSheet.create({
    bg: { flex: 1, backgroundColor: C.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    title: { color: C.text, fontWeight: '900', fontSize: 24, flex: 1 },
    badge: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: C.text, fontWeight: '900', fontSize: 20 },
    emptySubtext: { color: C.textMuted, fontSize: 14, fontWeight: '600', marginTop: 4 },
    list: { padding: 16, gap: 12 },
    item: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: C.surface, borderRadius: 14, padding: 12,
        borderWidth: 1, borderColor: C.borderCard,
    },
    itemImg: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#0a0f1e' },
    itemName: { color: C.text, fontWeight: '700', fontSize: 14, marginBottom: 4 },
    itemPrice: { color: C.accentLight, fontWeight: '900', fontSize: 16 },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qtyBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    qtyBtnText: { color: C.text, fontWeight: '900', fontSize: 16 },
    qtyText: { color: C.text, fontWeight: '900', fontSize: 16, minWidth: 20, textAlign: 'center' },
    deleteBtn: { padding: 6 },
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
        paddingHorizontal: 20, paddingTop: 16, gap: 12,
    },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { color: C.textMuted, fontWeight: '700', fontSize: 16 },
    totalAmt: { color: C.accentLight, fontWeight: '900', fontSize: 28 },
    checkoutBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    checkoutBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
