import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Modal,
    TextInput,
    Alert,
    Platform,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { getSoundSettings, setSoundSettings, triggerSound, SoundEffect } from '@/utils/soundEffects';
import { getBottomContentPadding } from '@/utils/layout';
import { useTranslation } from 'react-i18next';
import { saveLanguagePreference } from '@/i18n';


export default function SettingsScreen() {

    const router = useRouter();
    const { i18n, t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { user: clerkUser } = useUser();
    const { signOut } = useAuth();
    const convexUser = useQuery(api.users.getUserByClerkId, clerkUser ? { clerkId: clerkUser.id } : "skip");
    const updateUser = useMutation(api.users.updateUser);
    const deleteAccount = useMutation(api.users.deleteAccount);
    const deleteClerkUserAction = useAction(api.deleteClerkUser.deleteClerkUser);

    // Local state for modals
    const [showUnitsModal, setShowUnitsModal] = useState(false);
    const [showGoalsModal, setShowGoalsModal] = useState(false);

    // Sound settings state
    const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
    const [hapticsEnabled, setHapticsEnabled] = useState(true);
    const [volume, setVolume] = useState(0.7);

    // Unit preferences (persisted via `convexUser.preferredUnits`)
    const [tempUnits, setTempUnits] = useState({
        weight: 'lbs',
        height: 'ft',
        volume: 'oz',
        distance: 'miles',
        temperature: 'fahrenheit'
    });

    // Goal state
    const [tempGoals, setTempGoals] = useState({
        dailyCalories: 2000,
        dailyProtein: 150,
        dailyCarbs: 225,
        dailyFat: 67
    });

    useEffect(() => {
        // Load sound settings
        const s = getSoundSettings();
        setSoundEffectsEnabled(s.soundEffectsEnabled);
        setHapticsEnabled(s.hapticsEnabled);
        setVolume(s.volume);

        // Sync goals + units from Convex if available
        if (convexUser) {
            setTempGoals({
                dailyCalories: Math.round(convexUser.dailyCalories || 2000),
                dailyProtein: Math.round(convexUser.dailyProtein || 150),
                dailyCarbs: Math.round(convexUser.dailyCarbs || 225),
                dailyFat: Math.round(convexUser.dailyFat || 67),
            });

            setTempUnits((prev) => ({
                ...prev,
                weight: convexUser.preferredUnits?.weight ?? prev.weight,
                height: convexUser.preferredUnits?.height ?? prev.height,
                volume: convexUser.preferredUnits?.volume ?? prev.volume,
            }));
        }
    }, [convexUser]);

    const saveUnits = async () => {
        if (!convexUser) return;
        try {
            await updateUser({
                userId: convexUser._id,
                updates: {
                    preferredUnits: {
                        weight: tempUnits.weight,
                        height: tempUnits.height,
                        volume: tempUnits.volume,
                    },
                },
            });
            setShowUnitsModal(false);
            triggerSound(SoundEffect.WELLNESS_LOG);
            Alert.alert(t('settings.success', 'Sucesso'), t('settings.unitsUpdated', 'Unidades atualizadas com sucesso'));
        } catch (err) {
            Alert.alert(t('settings.error', 'Erro'), t('settings.unitsFailed', 'Failed to update units'));
        }
    };

    const commitSoundSettings = (next: Partial<{ soundEffectsEnabled: boolean; hapticsEnabled: boolean; volume: number }>) => {
        setSoundSettings(next as any);
    };

    const saveGoals = async () => {
        if (!convexUser) return;
        try {
            await updateUser({
                userId: convexUser._id,
                updates: {
                    dailyCalories: tempGoals.dailyCalories,
                    dailyProtein: tempGoals.dailyProtein,
                    dailyCarbs: tempGoals.dailyCarbs,
                    dailyFat: tempGoals.dailyFat,
                }
            });
            setShowGoalsModal(false);
            triggerSound(SoundEffect.WELLNESS_LOG);
            Alert.alert(t('settings.success', 'Sucesso'), t('settings.goalsUpdated', 'Objetivos atualizados com sucesso'));
        } catch (err) {
            Alert.alert(t('settings.error', 'Erro'), t('settings.goalsFailed', 'Failed to update goals'));
        }
    };

    const handleSignOut = () => {
        Alert.alert(t('settings.signOut', 'Terminar Sessão'), t('settings.signOutConfirm', 'Are you sure you want to sign out?'), [
            { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
            { text: t('settings.signOut', 'Terminar Sessão'), style: 'destructive', onPress: () => signOut() },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to completely delete your account? This will permanently erase your data and cannot be undone.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: t('settings.deletePermanently', 'Apagar Permanentemente'),
                    style: 'destructive',
                    onPress: async () => {
                        if (convexUser && clerkUser?.id) {
                            try {
                                // 1. Delete user from Clerk (server-side action)
                                await deleteClerkUserAction({ clerkId: clerkUser.id });
                                // 2. Delete all user data from Convex
                                await deleteAccount({ userId: convexUser._id });
                                // 3. Sign out locally and redirect
                                await signOut();
                                router.replace('/login');
                            } catch (e) {
                                console.error('Delete account error:', e);
                                Alert.alert(t('common.error', 'Erro'), "Could not delete account. Please try again.");
                            }
                        }
                    }
                },
            ]
        );
    };

    const openExternalUrl = async (url: string) => {
        try {
            const can = await Linking.canOpenURL(url);
            if (!can) {
                Alert.alert('Unable to open link', url);
                return;
            }
            await Linking.openURL(url);
        } catch {
            Alert.alert('Unable to open link', url);
        }
    };

    if (!convexUser) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.title}>{t('settings.title', 'Definições')}</Text>
                    <Text style={styles.subtitle}>{t('settings.subtitle', 'Personalize a sua experiência')}</Text>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, 20) }}
                showsVerticalScrollIndicator={false}
            >
                {/* Account Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: '#eff6ff' }]}>
                            <Feather name="user" size={18} color="#2563eb" />
                        </View>
                        <Text style={styles.sectionTitle}>{t('settings.account', 'Conta')}</Text>
                    </View>
                    <View style={styles.itemsList}>
                        {/* Integrations — Commented out for App Store submission (no HealthKit/Strava entitlements)
                        <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={() => router.push('/integrations' as any)}>
                            <View style={styles.itemLeft}>
                                <Text style={styles.itemLabel}>Connected Apps & Devices</Text>
                                <Text style={styles.itemValue}>Strava, Apple Health, etc.</Text>
                            </View>
                            <Ionicons name="apps-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
                            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        */}

                        <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={() => { }}>
                            <View style={styles.itemLeft}>
                                <Text style={styles.itemLabel}>{t('settings.email', 'E-mail')}</Text>
                                <Text style={styles.itemValue}>{convexUser.email}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={() => router.push('/premium')}>
                            <View style={styles.itemLeft}>
                                <Text style={styles.itemLabel}>{t('settings.subscription', 'Assinatura')}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={[styles.itemValue, convexUser.isPremium && { color: '#f59e0b', fontWeight: 'bold' }]}>
                                        {convexUser.isPremium ? t('settings.premium', 'Premium') : t('settings.free', 'Gratuita')}
                                    </Text>
                                    {convexUser.isPremium && <Ionicons name="diamond" size={12} color="#f59e0b" />}
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                </View>



                {/* Preferences Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: '#fef3c7' }]}>
                            <Feather name="settings" size={18} color="#d97706" />
                        </View>
                        <Text style={styles.sectionTitle}>{t('settings.preferences', 'Preferências')}</Text>
                    </View>
                    <View style={styles.itemsList}>
                        <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={() => {
                            Alert.alert(t('settings.language', 'Idioma'), t('settings.selectLanguage', 'Selecione o seu idioma preferido'), [
                                { text: 'English', onPress: async () => {
                                    i18n.changeLanguage('en');
                                    saveLanguagePreference('en');
                                    if (convexUser) {
                                        await updateUser({ userId: convexUser._id, updates: { preferredLanguage: 'en' } });
                                    }
                                }},
                                { text: 'Português', onPress: async () => {
                                    i18n.changeLanguage('pt');
                                    saveLanguagePreference('pt');
                                    if (convexUser) {
                                        await updateUser({ userId: convexUser._id, updates: { preferredLanguage: 'pt' } });
                                    }
                                }},
                                { text: 'Cancelar', style: 'cancel' }
                            ]);
                        }}>
                            <View style={styles.itemLeft}>
                                <Text style={styles.itemLabel}>{t('settings.language', 'Idioma')}</Text>
                                <Text style={styles.itemValue}>{convexUser.preferredLanguage ? convexUser.preferredLanguage.toUpperCase() : 'EN'}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={() => setShowUnitsModal(true)}>
                            <View style={styles.itemLeft}>
                                <Text style={styles.itemLabel}>{t('settings.units', 'Unidades e Medidas')}</Text>
                                <Text style={styles.itemValue}>
                                    {tempUnits.weight}, {tempUnits.height}, {tempUnits.volume}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.item} activeOpacity={0.7} onPress={() => setShowGoalsModal(true)}>
                            <View style={styles.itemLeft}>
                                <Text style={styles.itemLabel}>{t('settings.dailyGoals', 'Objetivos Diários')}</Text>
                                <Text style={styles.itemValue}>{tempGoals.dailyCalories} cal, {tempGoals.dailyProtein}g P</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Sound & Haptics Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: '#ecfdf5' }]}>
                            <Ionicons name="volume-high-outline" size={18} color="#059669" />
                        </View>
                        <Text style={styles.sectionTitle}>{t('settings.soundHaptics', 'Som e Háptica')}</Text>
                    </View>
                    <View style={styles.itemsList}>
                        <View style={styles.itemWithSwitch}>
                            <View style={styles.itemLeft}>
                                <Text style={styles.itemLabel}>{t('settings.soundEffects', 'Efeitos Sonoros')}</Text>
                                <Text style={styles.itemValue}>{t('settings.soundEffectsDesc', 'Ativar feedback sonoro')}</Text>
                            </View>
                            <Switch
                                value={soundEffectsEnabled}
                                onValueChange={(v) => {
                                    setSoundEffectsEnabled(v);
                                    commitSoundSettings({ soundEffectsEnabled: v });
                                    if (v) triggerSound(SoundEffect.UI_TAP);
                                }}
                                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                                thumbColor="#ffffff"
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.itemWithSwitch}>
                            <View style={styles.itemLeft}>
                                <Text style={styles.itemLabel}>{t('settings.haptics', 'Háptica')}</Text>
                                <Text style={styles.itemValue}>{t('settings.hapticsDesc', 'Feedback de vibração física')}</Text>
                            </View>
                            <Switch
                                value={hapticsEnabled}
                                onValueChange={(v) => {
                                    setHapticsEnabled(v);
                                    commitSoundSettings({ hapticsEnabled: v });
                                    if (v) triggerSound(SoundEffect.UI_TAP);
                                }}
                                trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                                thumbColor="#ffffff"
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.volumeControl}>
                            <Text style={styles.volumeLabel}>{t('settings.volume', 'Volume')}: {Math.round(volume * 100)}%</Text>
                            <View style={styles.volumeDotsRow}>
                                {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                                    <TouchableOpacity
                                        key={v}
                                        style={[styles.volumeDot, volume >= v && styles.volumeDotActive]}
                                        onPress={() => {
                                            setVolume(v);
                                            commitSoundSettings({ volume: v });
                                            triggerSound(SoundEffect.UI_TAP);
                                        }}
                                        activeOpacity={0.8}
                                    />
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Support Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: '#fdf2f8' }]}>
                            <Feather name="globe" size={18} color="#db2777" />
                        </View>
                        <Text style={styles.sectionTitle}>{t('settings.support', 'Suporte')}</Text>
                    </View>
                    <View style={styles.itemsList}>
                        <TouchableOpacity
                            style={styles.item}
                            activeOpacity={0.7}
                            onPress={() => openExternalUrl('https://www.bluom.app/about')}
                        >
                            <View style={styles.itemLeft}>
                                <Text style={styles.itemLabel}>{t('settings.aboutUs', 'Sobre nós')}</Text>
                                <Text style={styles.itemValue}>{t('settings.aboutUsDesc', 'Saiba mais sobre a Bluom')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.item}
                            activeOpacity={0.7}
                            onPress={() => openExternalUrl('https://www.bluom.app/support')}
                        >
                            <View style={styles.itemLeft}>
                                <Text style={styles.itemLabel}>{t('settings.helpCenter', 'Centro de Ajuda')}</Text>
                                <Text style={styles.itemValue}>{t('settings.helpCenterDesc', 'Obter assistência')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity
                            style={styles.item}
                            activeOpacity={0.7}
                            onPress={() => {
                                Alert.alert('Legal', 'Open in browser', [
                                    { text: 'Cancelar', style: 'cancel' },
                                    { text: 'Termos', onPress: () => openExternalUrl('https://www.bluom.app/legal/terms') },
                                    { text: 'Privacidade', onPress: () => openExternalUrl('https://www.bluom.app/legal/privacy') },
                                ]);
                            }}
                        >
                            <View style={styles.itemLeft}>
                                <Text style={styles.itemLabel}>{t('settings.legal', 'Legal')}</Text>
                                <Text style={styles.itemValue}>{t('settings.legalDesc', 'Termos e Privacidade')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={[styles.item, { paddingVertical: 16 }]} activeOpacity={0.7} onPress={handleSignOut}>
                            <View style={styles.itemLeft}>
                                <Text style={[styles.itemLabel, { color: '#64748b' }]}>{t('settings.signOut', 'Terminar Sessão')}</Text>
                            </View>
                            <Ionicons name="log-out-outline" size={18} color="#64748b" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={[styles.item, { paddingVertical: 16 }]} activeOpacity={0.7} onPress={handleDeleteAccount}>
                            <View style={styles.itemLeft}>
                                <Text style={[styles.itemLabel, { color: '#ef4444' }]}>{t('settings.deleteAccount', 'Apagar Conta')}</Text>
                            </View>
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* App Info Footer */}
                <View style={[styles.footer, { paddingBottom: 60 }]}>
                    <View style={[styles.appLogo, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' }]}>
                        <Image source={require('../assets/images/icon.png')} style={{ width: 40, height: 40, borderRadius: 10 }} contentFit="cover" />
                    </View>
                    <Text style={styles.appName}>Bluom</Text>
                </View>
            </ScrollView>

            {/* Units Modal */}
            <Modal visible={showUnitsModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('settings.units', 'Unidades e Medidas')}</Text>
                            <TouchableOpacity onPress={() => setShowUnitsModal(false)}>
                                <Ionicons name="close" size={24} color="#1e293b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={styles.unitGroup}>
                                <Text style={styles.unitLabel}>{t('settings.weight', 'Peso')}</Text>
                                <View style={styles.unitButtons}>
                                    {['lbs', 'kg'].map((u) => (
                                        <TouchableOpacity
                                            key={u}
                                            style={[styles.unitButton, tempUnits.weight === u && styles.unitButtonActive]}
                                            onPress={() => setTempUnits({ ...tempUnits, weight: u })}
                                        >
                                            <Text style={[styles.unitButtonText, tempUnits.weight === u && styles.unitButtonTextActive]}>
                                                {u.toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.unitGroup}>
                                <Text style={styles.unitLabel}>{t('settings.height', 'Altura')}</Text>
                                <View style={styles.unitButtons}>
                                    {['ft', 'cm'].map((u) => (
                                        <TouchableOpacity
                                            key={u}
                                            style={[styles.unitButton, tempUnits.height === u && styles.unitButtonActive]}
                                            onPress={() => setTempUnits({ ...tempUnits, height: u })}
                                        >
                                            <Text style={[styles.unitButtonText, tempUnits.height === u && styles.unitButtonTextActive]}>
                                                {u === 'ft' ? t('settings.feetInches', 'Feet & In') : t('settings.cm', 'CM')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.unitGroup}>
                                <Text style={styles.unitLabel}>{t('settings.distance', 'Distância')}</Text>
                                <View style={styles.unitButtons}>
                                    {['miles', 'km'].map((u) => (
                                        <TouchableOpacity
                                            key={u}
                                            style={[styles.unitButton, tempUnits.distance === u && styles.unitButtonActive]}
                                            onPress={() => setTempUnits({ ...tempUnits, distance: u })}
                                        >
                                            <Text style={[styles.unitButtonText, tempUnits.distance === u && styles.unitButtonTextActive]}>
                                                {u === 'miles' ? t('settings.miles', 'Milhas') : t('settings.km', 'KM')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.unitGroup}>
                                <Text style={styles.unitLabel}>{t('settings.water', 'Água')}</Text>
                                <View style={styles.unitButtons}>
                                    {['oz', 'ml'].map((u) => (
                                        <TouchableOpacity
                                            key={u}
                                            style={[styles.unitButton, tempUnits.volume === u && styles.unitButtonActive]}
                                            onPress={() => setTempUnits({ ...tempUnits, volume: u })}
                                        >
                                            <Text style={[styles.unitButtonText, tempUnits.volume === u && styles.unitButtonTextActive]}>
                                                {u.toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <TouchableOpacity style={styles.saveButton} onPress={saveUnits}>
                                <Text style={styles.saveButtonText}>{t('settings.saveChanges', 'Guardar Alterações')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Goals Modal */}
            <Modal visible={showGoalsModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.modalScrollContent}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('settings.dailyGoals', 'Objetivos Diários')}</Text>
                                <TouchableOpacity onPress={() => setShowGoalsModal(false)}>
                                    <Ionicons name="close" size={24} color="#1e293b" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalBody}>
                                <View style={styles.goalField}>
                                    <Text style={styles.goalLabel}>{t('settings.calKcal', 'Daily Calories (kcal)')}</Text>
                                    <TextInput
                                        style={styles.goalInput}
                                        keyboardType="numeric"
                                        value={String(tempGoals.dailyCalories)}
                                        onChangeText={(v) => setTempGoals({ ...tempGoals, dailyCalories: parseInt(v) || 0 })}
                                    />
                                </View>

                                <View style={styles.goalField}>
                                    <Text style={styles.goalLabel}>{t('settings.proteinG', 'Daily Protein (g)')}</Text>
                                    <TextInput
                                        style={styles.goalInput}
                                        keyboardType="numeric"
                                        value={String(tempGoals.dailyProtein)}
                                        onChangeText={(v) => setTempGoals({ ...tempGoals, dailyProtein: parseInt(v) || 0 })}
                                    />
                                </View>

                                <View style={styles.goalField}>
                                    <Text style={styles.goalLabel}>{t('settings.carbsG', 'Daily Carbs (g)')}</Text>
                                    <TextInput
                                        style={styles.goalInput}
                                        keyboardType="numeric"
                                        value={String(tempGoals.dailyCarbs)}
                                        onChangeText={(v) => setTempGoals({ ...tempGoals, dailyCarbs: parseInt(v) || 0 })}
                                    />
                                </View>

                                <View style={styles.goalField}>
                                    <Text style={styles.goalLabel}>{t('settings.fatG', 'Daily Fat (g)')}</Text>
                                    <TextInput
                                        style={styles.goalInput}
                                        keyboardType="numeric"
                                        value={String(tempGoals.dailyFat)}
                                        onChangeText={(v) => setTempGoals({ ...tempGoals, dailyFat: parseInt(v) || 0 })}
                                    />
                                </View>

                                <TouchableOpacity style={styles.saveButton} onPress={saveGoals}>
                                    <Text style={styles.saveButtonText}>{t('settings.updateGoals', 'Atualizar Objetivos')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F4F0',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 2,
    },
    scrollView: {
        flex: 1,
    },
    section: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    itemsList: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    itemWithSwitch: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        justifyContent: 'space-between',
    },
    itemLeft: {
        flex: 1,
    },
    itemLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 2,
    },
    itemValue: {
        fontSize: 13,
        color: '#64748b',
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginHorizontal: 16,
    },
    footer: {
        padding: 40,
        alignItems: 'center',
    },
    appLogo: {
        width: 60,
        height: 60,
        borderRadius: 18,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    logoText: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    appName: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
    },
    versionText: {
        fontSize: 14,
        color: '#94a3b8',
        marginTop: 4,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1e293b',
    },
    modalBody: {
        gap: 20,
    },
    unitGroup: {
        gap: 12,
    },
    unitLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },
    unitButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    unitButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#f1f5f9',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    unitButtonActive: {
        borderColor: '#2563eb',
        backgroundColor: '#eff6ff',
    },
    unitButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },
    unitButtonTextActive: {
        color: '#2563eb',
    },
    saveButton: {
        backgroundColor: '#2563eb',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    goalField: {
        gap: 8,
    },
    goalLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748b',
    },
    goalInput: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        color: '#1e293b',
        fontWeight: '600',
    },
    volumeControl: {
        padding: 16,
    },
    volumeLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 12,
    },
    volumeDotsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    volumeDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        borderWidth: 2,
        borderColor: '#e2e8f0',
    },
    volumeDotActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
});