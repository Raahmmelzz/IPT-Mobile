import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, Modal, KeyboardAvoidingView, Platform,
    ActivityIndicator, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '@/lib/api';

const CHAT_URL = `${API_URL}chat/`;

interface Message {
    role: 'user' | 'assistant';
    text: string;
}

const C = {
    bg: '#0a0d1a',
    surface: '#1e293b',
    accent: '#6366f1',
    accentDark: '#1e1b4b',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.5)',
    textDim: 'rgba(255,255,255,0.25)',
    border: 'rgba(255,255,255,0.08)',
    userBubble: '#6366f1',
    botBubble: '#1e293b',
};

// ─── Chat Modal ───────────────────────────────────────────────────────────────
function ChatModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const insets = useSafeAreaInsets();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', text: "Hi! I'm your G-Stop AI assistant. Ask me anything about gaming gear, orders, or our store!" },
    ]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (messages.length) {
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages, loading]);

    const sendMessage = async () => {
        const text = message.trim();
        if (!text || loading) return;

        setMessages(prev => [...prev, { role: 'user', text }]);
        setMessage('');
        setLoading(true);

        try {
            const res = await fetch(CHAT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            });
            const data = await res.json();
            const reply = data?.assistant?.message || 'Sorry, no response.';
            setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', text: 'AI service is unavailable right now.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={[modalStyles.bg, { paddingTop: insets.top }]}>
                <StatusBar barStyle="light-content" backgroundColor={C.bg} />

                {/* Header */}
                <View style={modalStyles.header}>
                    <View style={modalStyles.headerLeft}>
                        <View style={modalStyles.logoBox}>
                            <Text style={modalStyles.logoText}>G</Text>
                        </View>
                        <View>
                            <Text style={modalStyles.title}>AI Assistant</Text>
                            <View style={modalStyles.onlineRow}>
                                <View style={modalStyles.onlineDot} />
                                <Text style={modalStyles.onlineText}>Powered by Qwen 2.5</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                        <Text style={modalStyles.closeBtnText}>✕</Text>
                    </TouchableOpacity>
                </View>

                {/* Messages */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={insets.top}
                >
                    <ScrollView
                        ref={scrollRef}
                        style={{ flex: 1 }}
                        contentContainerStyle={[modalStyles.messageList, { paddingBottom: insets.bottom + 16 }]}
                        keyboardShouldPersistTaps="handled"
                    >
                        {messages.map((msg, i) => (
                            <View key={i} style={[
                                modalStyles.bubbleWrap,
                                msg.role === 'user' ? modalStyles.bubbleRight : modalStyles.bubbleLeft,
                            ]}>
                                <View style={[
                                    modalStyles.bubble,
                                    msg.role === 'user' ? modalStyles.userBubble : modalStyles.botBubble,
                                ]}>
                                    <Text style={[
                                        modalStyles.bubbleText,
                                        msg.role === 'user' && { color: '#fff' },
                                    ]}>
                                        {msg.text}
                                    </Text>
                                </View>
                            </View>
                        ))}

                        {loading && (
                            <View style={[modalStyles.bubbleWrap, modalStyles.bubbleLeft]}>
                                <View style={[modalStyles.bubble, modalStyles.botBubble, modalStyles.typingBubble]}>
                                    <View style={modalStyles.dotsRow}>
                                        {[0, 1, 2].map(i => (
                                            <View key={i} style={modalStyles.dot} />
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Input */}
                    <View style={[modalStyles.inputRow, { paddingBottom: insets.bottom + 12 }]}>
                        <TextInput
                            value={message}
                            onChangeText={setMessage}
                            onSubmitEditing={sendMessage}
                            returnKeyType="send"
                            placeholder="Ask about gaming gear..."
                            placeholderTextColor={C.textDim}
                            style={modalStyles.input}
                            editable={!loading}
                            multiline={false}
                        />
                        <TouchableOpacity
                            onPress={sendMessage}
                            disabled={loading || !message.trim()}
                            style={[modalStyles.sendBtn, (loading || !message.trim()) && { opacity: 0.4 }]}
                            activeOpacity={0.7}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <Text style={modalStyles.sendIcon}>➤</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const modalStyles = StyleSheet.create({
    bg: { flex: 1, backgroundColor: C.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: C.accentDark, paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logoBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
    logoText: { color: '#fff', fontWeight: '900', fontSize: 18 },
    title: { color: '#fff', fontWeight: '900', fontSize: 16 },
    onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' },
    onlineText: { color: '#a5b4fc', fontSize: 11, fontWeight: '600' },
    closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    closeBtnText: { color: '#a5b4fc', fontSize: 18, fontWeight: '700' },
    messageList: { padding: 16, gap: 10 },
    bubbleWrap: { flexDirection: 'row' },
    bubbleLeft: { justifyContent: 'flex-start' },
    bubbleRight: { justifyContent: 'flex-end' },
    bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    userBubble: { backgroundColor: C.userBubble, borderBottomRightRadius: 4 },
    botBubble: { backgroundColor: C.botBubble, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
    typingBubble: { paddingVertical: 14 },
    bubbleText: { color: '#cbd5e1', fontSize: 14, lineHeight: 20, fontWeight: '500' },
    dotsRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
    inputRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 16, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: C.border,
        backgroundColor: 'rgba(15,13,26,0.95)',
    },
    input: {
        flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
        color: C.text, fontSize: 14, fontWeight: '500',
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 13, backgroundColor: C.accent,
        alignItems: 'center', justifyContent: 'center',
    },
    sendIcon: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

// ─── Floating Button (exported for use in screens) ────────────────────────────
export default function Chatbot() {
    const [open, setOpen] = useState(false);
    const insets = useSafeAreaInsets();

    return (
        <>
            <TouchableOpacity
                onPress={() => setOpen(true)}
                style={[fabStyles.fab, { bottom: insets.bottom + 100 }]}
                activeOpacity={0.85}
            >
                <Text style={fabStyles.fabIcon}>💬</Text>
            </TouchableOpacity>
            <ChatModal visible={open} onClose={() => setOpen(false)} />
        </>
    );
}

const fabStyles = StyleSheet.create({
    fab: {
        position: 'absolute', right: 20, zIndex: 100,
        width: 54, height: 54, borderRadius: 16,
        backgroundColor: C.accent,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: C.accent, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
    },
    fabIcon: { fontSize: 22 },
});
