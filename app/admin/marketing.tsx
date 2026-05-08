import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Switch,
    Alert
} from 'react-native';
import {
    Megaphone,
    Users,
    Send,
    Bell,
    Target,
    Share2,
    CheckCircle2
} from 'lucide-react-native';

export default function MarketingHub() {
    const [notificationTitle, setNotificationTitle] = useState('');
    const [notificationBody, setNotificationBody] = useState('');
    const [isScheduled, setIsScheduled] = useState(false);

    const handleSendNotification = () => {
        if (!notificationTitle || !notificationBody) {
            Alert.alert('Error', 'Notification must have a title and body');
            return;
        }

        Alert.alert(
            'Confirm Push',
            'This will broadcast a notification to all active users. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send Now',
                    onPress: () => {
                        Alert.alert('Success', 'Push broadcast initiated via backend action.');
                        setNotificationTitle('');
                        setNotificationBody('');
                    }
                }
            ]
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.title}>Marketing Hub</Text>
                <Text style={styles.subtitle}>Broadcast notifications and manage referrals</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.sectionHeader}>
                    <View style={styles.iconBox}>
                        <Bell size={20} color="#2563eb" />
                    </View>
                    <Text style={styles.sectionTitle}>Global Push Notification</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Title</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. New Workout Released!"
                        value={notificationTitle}
                        onChangeText={setNotificationTitle}
                    />

                    <Text style={styles.label}>Message Body</Text>
                    <TextInput
                        style={[styles.input, { height: 80 }]}
                        placeholder="Write your announcement..."
                        multiline
                        value={notificationBody}
                        onChangeText={setNotificationBody}
                    />

                    <View style={styles.switchRow}>
                        <View>
                            <Text style={styles.switchLabel}>Schedule for later</Text>
                            <Text style={styles.switchSub}>Optionally set a future broadcast time</Text>
                        </View>
                        <Switch
                            value={isScheduled}
                            onValueChange={setIsScheduled}
                            trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
                        />
                    </View>

                    <TouchableOpacity style={styles.sendButton} onPress={handleSendNotification}>
                        <Send size={18} color="#ffffff" />
                        <Text style={styles.sendButtonText}>Broadcast Now</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.grid}>
                <View style={[styles.card, { flex: 1 }]}>
                    <View style={styles.sectionHeader}>
                        <Target size={20} color="#8b5cf6" />
                        <Text style={styles.sectionTitle}>User Segments</Text>
                    </View>
                    <View style={styles.segmentItem}>
                        <Text style={styles.segmentName}>Inactive 7+ Days</Text>
                        <Text style={styles.segmentCount}>1,240 users</Text>
                    </View>
                    <View style={styles.segmentItem}>
                        <Text style={styles.segmentName}>Premium Trialing</Text>
                        <Text style={styles.segmentCount}>342 users</Text>
                    </View>
                    <TouchableOpacity style={styles.outlineButton}>
                        <Text style={styles.outlineButtonText}>Manage Segments</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.card, { flex: 1 }]}>
                    <View style={styles.sectionHeader}>
                        <Share2 size={20} color="#f59e0b" />
                        <Text style={styles.sectionTitle}>Referrals</Text>
                    </View>
                    <View style={styles.referralStat}>
                        <Text style={styles.refVal}>128</Text>
                        <Text style={styles.refLabel}>Invites this week</Text>
                    </View>
                    <View style={styles.referralStat}>
                        <Text style={styles.refVal}>18%</Text>
                        <Text style={styles.refLabel}>Conversion rate</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 24,
        gap: 24,
    },
    header: {
        marginBottom: 8,
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
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
    },
    form: {
        gap: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '800',
        color: '#64748b',
        textTransform: 'uppercase',
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    switchLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1e293b',
    },
    switchSub: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563eb',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        marginTop: 8,
    },
    sendButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '800',
    },
    grid: {
        flexDirection: 'row',
        gap: 20,
        flexWrap: 'wrap',
    },
    segmentItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    segmentName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    segmentCount: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1e293b',
    },
    outlineButton: {
        marginTop: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
    },
    outlineButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748b',
    },
    referralStat: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    refVal: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1e293b',
    },
    refLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
});
