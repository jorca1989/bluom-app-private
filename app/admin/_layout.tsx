import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser, useClerk } from '@clerk/clerk-expo';
import {
    Users,
    LayoutDashboard,
    BookOpen,
    CreditCard,
    Megaphone,
    BarChart3,
    Utensils,
    Dumbbell,
    Sparkles,
    Menu,
    X,
    LogOut,
    Play,
    Layers
} from 'lucide-react-native';
import { MASTER_ADMINS } from '../../convex/permissions';
import { getBottomContentPadding } from '@/utils/layout';

const SIDEBAR_WIDTH = 260;

const NAV_ITEMS = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { label: 'Users & CRM', icon: Users, href: '/admin/users' },
    { label: 'Test Users', icon: Users, href: '/admin/test-users' },
    { label: 'Content CMS', icon: BookOpen, href: '/admin/content' },
    { label: 'Financial', icon: CreditCard, href: '/admin/financial' },
    { label: 'Marketing', icon: Megaphone, href: '/admin/marketing' },
    { label: 'Analytics', icon: BarChart3, href: '/admin/analytics' },
    { label: 'Recipes Manager', icon: Utensils, href: '/admin/recipes' },
    { label: 'Video Workouts', icon: Play, href: '/admin/workouts' },
    { label: 'Exercises Lib', icon: Dumbbell, href: '/admin/exercises' },
    { label: 'Programs Manager', icon: Layers, href: '/admin/programs' },
    { label: 'Meditations', icon: Sparkles, href: '/admin/meditations' },
];

export default function AdminLayout() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const router = useRouter();
    const pathname = usePathname();
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const isDesktop = width > 1024;

    useEffect(() => {
        if (isLoaded) {
            const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
            console.log('Admin Auth Check:', {
                email,
                isMasterAdmin: email ? MASTER_ADMINS.map(e => e.toLowerCase()).includes(email) : false,
                masterList: MASTER_ADMINS
            });

            if (!email || !MASTER_ADMINS.map(e => e.toLowerCase()).includes(email)) {
                console.warn(`Unauthorized access attempt to admin by ${email}`);
                // Instead of immediate redirect which can cause hydration issues or unstyled flashes, 
                // we'll show the Access Denied state below.
            }
        }
    }, [isLoaded, user, router]);

    if (!isLoaded) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ebf1fe' }}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    const currentEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
    const role = (user?.publicMetadata as any)?.role;
    const isRoleAdmin = role === 'admin';
    const isMasterAdmin = isRoleAdmin || (currentEmail && MASTER_ADMINS.map(e => e.toLowerCase()).includes(currentEmail));

    if (!isMasterAdmin) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ebf1fe', padding: 20 }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#1e293b', marginBottom: 12 }}>
                    {!user ? 'Login Required' : 'Access Denied'}
                </Text>
                <Text style={{ fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 32, maxWidth: 300, lineHeight: 24 }}>
                    {!user
                        ? 'You must be signed in with an authorized admin account to access this dashboard.'
                        : `Your account (${currentEmail}) does not have administrative privileges.`
                    }
                </Text>
                <View style={{ gap: 12, width: '100%', maxWidth: 240 }}>
                    <TouchableOpacity
                        onPress={() => router.push(user ? '/' : '/login' as any)}
                        style={{ backgroundColor: '#2563eb', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
                    >
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>
                            {user ? 'Back to Home' : 'Sign In Now'}
                        </Text>
                    </TouchableOpacity>

                    {user && (
                        <TouchableOpacity
                            onPress={() => router.replace('/login' as any)}
                            style={{ padding: 16, alignItems: 'center' }}
                        >
                            <Text style={{ color: '#64748b', fontWeight: '700' }}>Switch Account</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    const Sidebar = () => (
        <View style={[styles.sidebar, !isDesktop && styles.mobileSidebar, (!isDesktop && !isSidebarOpen) && { display: 'none' }]}>
            <View style={[styles.sidebarHeader, { paddingTop: Math.max(insets.top, 20) }]}>
                <View style={styles.logo}>
                    <Text style={styles.logoText}>AiFit Admin</Text>
                </View>
                {!isDesktop && (
                    <TouchableOpacity onPress={() => setIsSidebarOpen(false)}>
                        <X color="#64748b" size={24} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.sidebarContent}>
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <TouchableOpacity
                            key={item.href}
                            style={[styles.navItem, isActive && styles.navItemActive]}
                            onPress={() => {
                                router.push(item.href as any);
                                if (!isDesktop) setIsSidebarOpen(false);
                            }}
                        >
                            <item.icon size={20} color={isActive ? '#2563eb' : '#64748b'} strokeWidth={isActive ? 2.5 : 2} />
                            <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <View style={[styles.sidebarFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={async () => {
                        await signOut();
                    }}
                >
                    <LogOut size={20} color="#dc2626" />
                    <Text style={styles.signOutText}>Exit Admin</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Mobile Header */}
            {!isDesktop && (
                <View style={[styles.mobileHeader, { paddingTop: Math.max(insets.top, 12) }]}>
                    <TouchableOpacity onPress={() => setIsSidebarOpen(true)}>
                        <Menu color="#1e293b" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.mobileTitle}>Dashboard</Text>
                    <View style={{ width: 24 }} />
                </View>
            )}

            <View style={styles.mainLayout}>
                <Sidebar />
                <View style={styles.content}>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: '#ebf1fe' },
                        }}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ebf1fe',
    },
    mainLayout: {
        flex: 1,
        flexDirection: 'row',
    },
    sidebar: {
        width: SIDEBAR_WIDTH,
        backgroundColor: '#ffffff',
        borderRightWidth: 1,
        borderRightColor: '#e2e8f0',
        height: '100%',
    },
    mobileSidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    sidebarHeader: {
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    logo: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    logoText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '900',
    },
    sidebarContent: {
        flex: 1,
        paddingHorizontal: 12,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 4,
        gap: 12,
    },
    navItemActive: {
        backgroundColor: '#eff6ff',
    },
    navItemText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748b',
    },
    navItemTextActive: {
        color: '#2563eb',
        fontWeight: '700',
    },
    sidebarFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 8,
    },
    signOutText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#dc2626',
    },
    mobileHeader: {
        height: 64,
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        zIndex: 50,
    },
    mobileTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
    },
    content: {
        flex: 1,
    },
});
