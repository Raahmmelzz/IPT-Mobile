import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { useAppContext } from '@/context/AppContext';
import { customerAPI } from '@/lib/api';

const C = {
    bg: '#0f172a',
    accent: '#6366f1',
    accentLight: '#818cf8',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.5)',
    textDim: 'rgba(255,255,255,0.3)',
    success: '#10b981',
    border: 'rgba(255,255,255,0.1)',
};

function getStrength(pw: string) {
    return [pw.length >= 8, /[A-Z]/.test(pw), /[a-z]/.test(pw), /[0-9]/.test(pw), /[!@#$%^&*]/.test(pw)].filter(Boolean).length;
}

const blank6 = () => ['', '', '', '', '', ''];

function OtpInput({ otp, onChange }: { otp: string[]; onChange: (otp: string[]) => void }) {
    const refs = useRef<(TextInput | null)[]>([]);
    return (
        <View style={s.otpRow}>
            {otp.map((digit, i) => (
                <TextInput key={i} ref={el => { refs.current[i] = el; }} value={digit}
                    onChangeText={val => {
                        if (!/^\d?$/.test(val)) return;
                        const next = [...otp]; next[i] = val; onChange(next);
                        if (val && i < 5) refs.current[i + 1]?.focus();
                    }}
                    onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus();
                    }}
                    keyboardType="number-pad" maxLength={1} style={s.otpBox}
                    placeholderTextColor={C.textDim} />
            ))}
        </View>
    );
}

export default function AuthScreen() {
    const { login } = useAppContext();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [step, setStep] = useState<'form' | 'otp'>('form');
    const [isLoading, setIsLoading] = useState(false);

    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPw, setShowLoginPw] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Login verify step (for unverified accounts)
    const [loginStep, setLoginStep] = useState<'form' | 'verify'>('form');
    const [pendingEmail, setPendingEmail] = useState('');
    const [loginOtp, setLoginOtp] = useState<string[]>(blank6());
    const [loginOtpError, setLoginOtpError] = useState('');
    const [isVerifyingLogin, setIsVerifyingLogin] = useState(false);
    const [isSendingLoginOtp, setIsSendingLoginOtp] = useState(false);
    const [loginResendCooldown, setLoginResendCooldown] = useState(0);

    const [signup, setSignup] = useState({ name: '', username: '', email: '', number: '', password: '' });
    const [showPw, setShowPw] = useState(false);
    const [signupError, setSignupError] = useState('');
    const [isSigningUp, setIsSigningUp] = useState(false);

    useEffect(() => {
        if (loginResendCooldown <= 0) return;
        const t = setTimeout(() => setLoginResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [loginResendCooldown]);

    const strength = getStrength(signup.password);

    const handleLogin = async () => {
        if (!loginUsername || !loginPassword) return;
        setIsLoading(true);
        setLoginError('');
        try {
            const res = await customerAPI.loginCustomer({ username: loginUsername, password: loginPassword });
            const token = res.access || res.token || '';
            const userData = res.user || res;
            login(userData, token);
        } catch (err: any) {
            const data = err?.response?.data;
            if (data?.requires_verification && data?.email) {
                setPendingEmail(data.email);
                setLoginOtp(blank6());
                setLoginOtpError('');
                setLoginStep('verify');
                setLoginResendCooldown(60);
            } else {
                setLoginError(data?.error || data?.detail || 'Invalid username or password.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const verifyAndLogin = async () => {
        const entered = loginOtp.join('');
        if (entered.length < 6) { setLoginOtpError('Enter the full 6-digit code.'); return; }
        setIsVerifyingLogin(true);
        try {
            const res = await customerAPI.verifyAccount({ email: pendingEmail, otp: entered });
            login(res.user || res, res.access || res.token || '');
        } catch (err: any) {
            setLoginOtpError(err?.response?.data?.error || 'Invalid or expired code.');
        } finally {
            setIsVerifyingLogin(false);
        }
    };

    const resendLoginOtp = async () => {
        setIsSendingLoginOtp(true);
        try {
            await customerAPI.sendOtp(pendingEmail);
            setLoginResendCooldown(60);
        } catch {}
        finally { setIsSendingLoginOtp(false); }
    };

    const resetLoginToForm = () => {
        setLoginStep('form');
        setLoginOtp(blank6());
        setLoginOtpError('');
        setPendingEmail('');
        setLoginError('');
    };

    const doSignup = async () => {
        if (!signup.name || !signup.username || !signup.email || !signup.number || !signup.password) {
            setSignupError('Please fill all fields.');
            return;
        }
        setIsSigningUp(true);
        setSignupError('');
        try {
            await customerAPI.signupWithOtp(signup);
            setSignup({ name: '', username: '', email: '', number: '', password: '' });
            setMode('login');
            Alert.alert('Account Created', 'Check your email for a verification code, then log in.');
        } catch (err: any) {
            setSignupError(err?.response?.data?.error || 'Failed to create account.');
        } finally {
            setIsSigningUp(false);
        }
    };

    return (
        <View style={s.bg}>
            <StatusBar barStyle="light-content" backgroundColor={C.bg} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
                    <View style={s.logo}>
                        <View style={s.logoBox}><Text style={s.logoLetter}>G</Text></View>
                        <Text style={s.logoText}>G-Stop</Text>
                    </View>
                    <Text style={s.tagline}>THE ONE-STOP SHOP FOR GAMERS</Text>

                    <View style={s.card}>
                        <View style={s.tabs}>
                            {(['login', 'signup'] as const).map(t => (
                                <TouchableOpacity key={t} onPress={() => { setMode(t); resetToForm(); resetLoginToForm(); }}
                                    style={[s.tab, mode === t && s.tabActive]}>
                                    <Text style={[s.tabText, mode === t && s.tabTextActive]}>{t.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {mode === 'login' && loginStep === 'form' && (
                            <View style={s.form}>
                                <View>
                                    <Text style={s.label}>USERNAME</Text>
                                    <TextInput value={loginUsername} onChangeText={setLoginUsername} style={s.input}
                                        placeholder="Enter username" placeholderTextColor={C.textDim}
                                        autoCapitalize="none" returnKeyType="next" />
                                </View>
                                <View>
                                    <Text style={s.label}>PASSWORD</Text>
                                    <View>
                                        <TextInput value={loginPassword} onChangeText={setLoginPassword}
                                            style={s.input} placeholder="••••••••" placeholderTextColor={C.textDim}
                                            secureTextEntry={!showLoginPw} returnKeyType="done"
                                            onSubmitEditing={handleLogin} />
                                        <TouchableOpacity onPress={() => setShowLoginPw(p => !p)} style={s.showBtn}>
                                            <Text style={s.showBtnText}>{showLoginPw ? 'HIDE' : 'SHOW'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                {loginError ? <Text style={s.otpError}>{loginError}</Text> : null}
                                <TouchableOpacity onPress={handleLogin} disabled={isLoading} style={s.btnPrimary}>
                                    <Text style={s.btnText}>{isLoading ? 'AUTHENTICATING...' : 'SECURE LOGIN'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {mode === 'login' && loginStep === 'verify' && (
                            <View style={s.form}>
                                <TouchableOpacity onPress={resetLoginToForm}>
                                    <Text style={s.backBtn}>← BACK</Text>
                                </TouchableOpacity>
                                <View style={s.verifyBadge}>
                                    <Text style={s.verifyBadgeText}>ACCOUNT NOT VERIFIED</Text>
                                </View>
                                <View style={{ alignItems: 'center', gap: 6 }}>
                                    <Text style={s.otpTitle}>Verify Your Email</Text>
                                    <Text style={s.otpSub}>Code sent to <Text style={{ color: C.accentLight }}>{pendingEmail}</Text></Text>
                                </View>
                                <OtpInput otp={loginOtp} onChange={setLoginOtp} />
                                {loginOtpError ? <Text style={s.otpError}>{loginOtpError}</Text> : null}
                                <View style={{ alignItems: 'center' }}>
                                    {loginResendCooldown > 0 ? (
                                        <Text style={s.resendTimer}>Resend in {loginResendCooldown}s</Text>
                                    ) : (
                                        <TouchableOpacity onPress={resendLoginOtp} disabled={isSendingLoginOtp}>
                                            <Text style={s.resendBtn}>{isSendingLoginOtp ? 'Sending...' : 'Resend Code'}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <TouchableOpacity onPress={verifyAndLogin} disabled={isVerifyingLogin} style={s.btnPrimary}>
                                    <Text style={s.btnText}>{isVerifyingLogin ? 'VERIFYING...' : 'VERIFY & LOGIN'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {mode === 'signup' && (
                            <View style={s.form}>
                                {(['Full Name', 'Username', 'Email'] as const).map(label => {
                                    const key = label === 'Full Name' ? 'name' : label.toLowerCase() as 'username' | 'email';
                                    return (
                                        <View key={label}>
                                            <Text style={s.label}>{label.toUpperCase()}</Text>
                                            <TextInput value={signup[key]} onChangeText={v => setSignup(p => ({ ...p, [key]: v }))}
                                                style={s.input} placeholderTextColor={C.textDim}
                                                autoCapitalize="none" keyboardType={key === 'email' ? 'email-address' : 'default'} />
                                        </View>
                                    );
                                })}
                                <View>
                                    <Text style={s.label}>PHONE NUMBER</Text>
                                    <View style={s.phoneRow}>
                                        <View style={s.phonePrefix}><Text style={s.phonePrefixText}>+63</Text></View>
                                        <TextInput value={signup.number} onChangeText={v => setSignup(p => ({ ...p, number: v.replace(/\D/g, '') }))}
                                            style={[s.input, { flex: 1 }]} placeholder="9XXXXXXXXX"
                                            placeholderTextColor={C.textDim} keyboardType="number-pad" />
                                    </View>
                                </View>
                                <View>
                                    <Text style={s.label}>PASSWORD</Text>
                                    <View>
                                        <TextInput value={signup.password} onChangeText={v => setSignup(p => ({ ...p, password: v }))}
                                            style={s.input} placeholderTextColor={C.textDim} secureTextEntry={!showPw} />
                                        <TouchableOpacity onPress={() => setShowPw(p => !p)} style={s.showBtn}>
                                            <Text style={s.showBtnText}>{showPw ? 'HIDE' : 'SHOW'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    {signup.password.length > 0 && (
                                        <View style={s.strengthRow}>
                                            {[1,2,3,4,5].map(i => (
                                                <View key={i} style={[s.strengthBar, { backgroundColor: i <= strength ? (strength <= 2 ? '#ef4444' : strength <= 3 ? '#f97316' : '#10b981') : C.border }]} />
                                            ))}
                                        </View>
                                    )}
                                </View>
                                {signupError ? <Text style={s.otpError}>{signupError}</Text> : null}
                                <TouchableOpacity onPress={doSignup} disabled={isSigningUp} style={s.btnSuccess}>
                                    <Text style={s.btnText}>{isSigningUp ? 'CREATING...' : 'CREATE ACCOUNT'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const s = StyleSheet.create({
    bg: { flex: 1, backgroundColor: C.bg },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingVertical: 40 },
    logo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 },
    logoBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
    logoLetter: { color: '#fff', fontWeight: '900', fontSize: 24 },
    logoText: { color: '#fff', fontWeight: '900', fontSize: 28 },
    tagline: { color: C.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 3, textAlign: 'center', marginBottom: 28 },
    card: { backgroundColor: 'rgba(30,31,58,0.6)', borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 20 },
    tabs: { flexDirection: 'row', backgroundColor: 'rgba(15,23,42,0.5)', borderRadius: 12, padding: 4, marginBottom: 24 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    tabActive: { backgroundColor: C.accent },
    tabText: { color: C.textDim, fontWeight: '900', fontSize: 12, letterSpacing: 2 },
    tabTextActive: { color: '#fff' },
    form: { gap: 16 },
    label: { color: C.textDim, fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
    input: {
        backgroundColor: 'rgba(15,23,42,0.5)', borderWidth: 1, borderColor: C.border,
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
        color: C.text, fontWeight: '700', fontSize: 15,
    },
    showBtn: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
    showBtnText: { color: C.accentLight, fontWeight: '900', fontSize: 10, letterSpacing: 1 },
    phoneRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    phonePrefix: { backgroundColor: 'rgba(15,23,42,0.5)', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    phonePrefixText: { color: C.textMuted, fontWeight: '900', fontSize: 13 },
    strengthRow: { flexDirection: 'row', gap: 4, marginTop: 8 },
    strengthBar: { flex: 1, height: 4, borderRadius: 4 },
    btnPrimary: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    btnSuccess: { backgroundColor: C.success, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    btnText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 2 },
    backBtn: { color: C.accentLight, fontWeight: '900', fontSize: 11, letterSpacing: 2 },
    otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
    otpBox: {
        width: 44, height: 52, borderRadius: 12,
        backgroundColor: 'rgba(15,23,42,0.5)', borderWidth: 2,
        borderColor: C.border, color: C.text, textAlign: 'center',
        fontSize: 20, fontWeight: '900',
    },
    resendBtn: { color: C.accentLight, fontWeight: '900', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
    resendTimer: { color: 'rgba(255,255,255,0.25)', fontWeight: '900', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
    otpTitle: { color: C.text, fontWeight: '900', fontSize: 20 },
    otpSub: { color: C.textMuted, fontWeight: '700', fontSize: 13 },
    otpError: { color: '#f87171', fontWeight: '900', fontSize: 12, textAlign: 'center', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: 8 },
    verifyBadge: { alignSelf: 'center', backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    verifyBadgeText: { color: '#fbbf24', fontWeight: '900', fontSize: 10, letterSpacing: 2 },
});
