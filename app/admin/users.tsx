import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Alert
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
    Search,
    Filter,
    MoreVertical,
    User as UserIcon,
    Crown,
    ShieldCheck,
    Check,
    Trash2
} from 'lucide-react-native';

const RoleBadge = ({ role }: { role: string }) => {
    const isSuper = role === 'super_admin';
    const isAdmin = role === 'admin';

    return (
        <View style={[
            styles.roleBadge,
            isSuper ? styles.roleSuper : isAdmin ? styles.roleAdmin : styles.roleUser
        ]}>
            <Text style={[
                styles.roleText,
                isSuper ? styles.roleSuperText : isAdmin ? styles.roleAdminText : styles.roleUserText
            ]}>
                {role?.replace('_', ' ')?.toUpperCase() || 'USER'}
            </Text>
        </View>
    );
};

export default function UsersCRM() {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);

    const users = useQuery(api.admin.getUsers, { search, role: roleFilter });
    const updateRole = useMutation(api.admin.updateUserRole);
    const deleteUser = useMutation(api.admin.deleteUser);

    const handleUpdateRole = (userId: any, name: string, currentRole: string) => {
        Alert.alert(
            'Update User Role',
            `Change role for ${name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Set as Admin', onPress: () => updateRole({ userId, role: 'admin' }) },
                { text: 'Set as User', onPress: () => updateRole({ userId, role: 'user' }) },
                { text: 'Set as Super Admin', style: 'destructive', onPress: () => updateRole({ userId, role: 'super_admin' }) },
            ]
        );
    };

    const handleDeleteUser = (userId: any, email: string) => {
        Alert.alert(
            'Delete user (Convex only)',
            `This removes the user record from Convex.\n\nUser: ${email}\n\nThis does NOT delete the Clerk user.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteUser({ userId });
                        } catch (e: any) {
                            Alert.alert('Delete failed', e?.message ?? 'Could not delete user.');
                        }
                    }
                },
            ]
        );
    };

    const renderUser = ({ item }: { item: any }) => (
        <View style={styles.userCard}>
            <View style={styles.userInfo}>
                <View style={styles.avatar}>
                    <UserIcon size={24} color="#64748b" />
                    {item.isPremium && (
                        <View style={styles.premiumIndicator}>
                            <Crown size={10} color="#ffffff" fill="#f59e0b" />
                        </View>
                    )}
                </View>
                <View style={styles.userDetails}>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                    <Text style={styles.userMeta}>clerkId: {item.clerkId}</Text>
                </View>
            </View>

            <View style={styles.userActions}>
                <RoleBadge role={item.role ?? 'user'} />
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleUpdateRole(item._id, item.name, item.role ?? 'user')}
                >
                    <ShieldCheck size={18} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#fef2f2' }]}
                    onPress={() => handleDeleteUser(item._id, item.email)}
                >
                    <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Users & CRM</Text>
                <Text style={styles.subtitle}>Manage platform users and their permissions</Text>
            </View>

            <View style={styles.controls}>
                <View style={styles.searchContainer}>
                    <Search size={20} color="#94a3b8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or email..."
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
                <View style={styles.filterRow}>
                    {['all', 'user', 'admin', 'super_admin'].map((r) => (
                        <TouchableOpacity
                            key={r}
                            onPress={() => setRoleFilter(r === 'all' ? undefined : r)}
                            style={[styles.filterChip, (roleFilter === r || (r === 'all' && !roleFilter)) && styles.filterChipActive]}
                        >
                            <Text style={[styles.filterChipText, (roleFilter === r || (r === 'all' && !roleFilter)) && styles.filterChipTextActive]}>
                                {r.toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {!users ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderUser}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No users found matching your criteria.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
        marginTop: 4,
    },
    controls: {
        paddingHorizontal: 24,
        marginBottom: 24,
        gap: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        height: 52,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
    },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
    },
    filterChipActive: {
        backgroundColor: '#2563eb',
    },
    filterChipText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748b',
    },
    filterChipTextActive: {
        color: '#ffffff',
    },
    listContent: {
        padding: 24,
        paddingTop: 0,
        gap: 12,
    },
    userCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    premiumIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#f59e0b',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
    },
    userEmail: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    userMeta: {
        marginTop: 2,
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: '600',
    },
    userActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    roleUser: { backgroundColor: '#f1f5f9' },
    roleAdmin: { backgroundColor: '#eff6ff' },
    roleSuper: { backgroundColor: '#fef2f2' },
    roleText: { fontSize: 10, fontWeight: '800' },
    roleUserText: { color: '#64748b' },
    roleAdminText: { color: '#2563eb' },
    roleSuperText: { color: '#ef4444' },
    actionButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 18,
        backgroundColor: '#f8fafc',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#94a3b8',
        fontWeight: '600',
    },
});
