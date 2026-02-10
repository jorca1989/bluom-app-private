import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { User, Mail, LogOut, Settings, Sparkles, RefreshCcw, TrendingDown, MessageSquare, Clock, LayoutGrid, BookOpen, Calendar, Zap, Bug, Scale, Link } from 'lucide-react-native';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getBottomContentPadding } from '@/utils/layout';
import { getCustomerInfoSafe } from '@/utils/revenuecat';

export default function ProfileScreen() {
  const { user: clerkUser } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : 'skip'
  );

  const resetOnboarding = useMutation(api.users.resetOnboarding);
  const [rcInfo, setRcInfo] = React.useState<any>(null);
  const [rcLoading, setRcLoading] = React.useState(false);

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset/Restart Goal',
      'This will reset your fitness goals and biometric data. You will need to complete the assessment again. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            if (convexUser) {
              await resetOnboarding({ userId: convexUser._id });
              router.replace('/onboarding');
            }
          }
        }
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/login');
            } catch (error) {
              console.error('Sign out error:', error);
            }
          },
        },
      ],
    );
  };

  const refreshRevenueCat = async () => {
    setRcLoading(true);
    try {
      const info = await getCustomerInfoSafe();
      setRcInfo(info);
    } finally {
      setRcLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12) + 12,
          },
        ]}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 12 }]}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#60A5FA', '#2563EB']}
              style={styles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <User size={48} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={styles.name}>{convexUser?.name ?? clerkUser?.fullName ?? 'Guest'}</Text>

          <View style={styles.emailContainer}>
            <Mail size={16} color="#64748b" />
            <Text style={styles.email}>
              {convexUser?.email ?? clerkUser?.primaryEmailAddress?.emailAddress ?? 'No email'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          {!convexUser?.isPremium && (
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: '#fffbeb', borderColor: '#fef3c7', borderWidth: 1 }]}
              activeOpacity={0.7}
              onPress={() => router.push('/premium')}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#fef3c7' }]}>
                  <Sparkles size={20} color="#f59e0b" />
                </View>
                <View>
                  <Text style={[styles.menuItemText, { color: '#92400e' }]}>Go Premium</Text>
                  <Text style={{ fontSize: 12, color: '#b45309' }}>Unlock all features</Text>
                </View>
              </View>
              <Text style={[styles.menuItemChevron, { color: '#f59e0b' }]}>›</Text>
            </TouchableOpacity>
          )}

          {!convexUser?.isPremium && <View style={{ height: 12 }} />}

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/personalized-plan')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#eef2ff' }]}>
                <Sparkles size={20} color="#6366f1" />
              </View>
              <Text style={styles.menuItemText}>My Personalized Plan</Text>
            </View>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/sugar-dashboard')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#fee2e2' }]}>
                <TrendingDown size={20} color="#ef4444" />
              </View>
              <View>
                <Text style={styles.menuItemText}>Sugar Control</Text>
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
                  90‑day reset + daily check‑ins
                </Text>
              </View>
            </View>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>



          <View style={{ height: 12 }} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/integrations')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#f0fdf4' }]}>
                <Link size={20} color="#16a34a" />
              </View>
              <Text style={styles.menuItemText}>Integrations</Text>
            </View>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={handleResetOnboarding}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#fff7ed' }]}>
                <RefreshCcw size={20} color="#f97316" />
              </View>
              <Text style={styles.menuItemText}>Reset/Restart Goal</Text>
            </View>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Life Management</Text>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/weight-management')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#f0f9ff' }]}>
                <Scale size={20} color="#0ea5e9" />
              </View>
              <Text style={styles.menuItemText}>Weight Journey</Text>
            </View>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/ai-coach')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#eff6ff' }]}>
                <MessageSquare size={20} color="#2563eb" />
              </View>
              <Text style={styles.menuItemText}>AI Coach</Text>
            </View>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push(convexUser?.biologicalSex === 'female' ? '/womens-health' : '/mens-health')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: convexUser?.biologicalSex === 'female' ? '#fdf2f8' : '#eff6ff' }]}>
                {convexUser?.biologicalSex === 'female' ? <Calendar size={20} color="#db2777" /> : <Zap size={20} color="#3b82f6" />}
              </View>
              <Text style={styles.menuItemText}>{convexUser?.biologicalSex === 'female' ? 'Women’s Health' : 'Men’s Health'}</Text>
            </View>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/fasting')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#fffbeb' }]}>
                <Clock size={20} color="#f59e0b" />
              </View>
              <Text style={styles.menuItemText}>Fasting Tracker</Text>
            </View>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/todo-list')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#f5f3ff' }]}>
                <LayoutGrid size={20} color="#8b5cf6" />
              </View>
              <Text style={styles.menuItemText}>Productivity Hub</Text>
            </View>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/library')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#ecfdf5' }]}>
                <BookOpen size={20} color="#10b981" />
              </View>
              <Text style={styles.menuItemText}>Bluom Library</Text>
            </View>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/support')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#f1f5f9' }]}>
                <Bug size={20} color="#64748b" />
              </View>
              <Text style={styles.menuItemText}>Help & Feedback</Text>
            </View>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>

          <View style={{ height: 12 }} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/settings')}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconContainer}>
                <Settings size={20} color="#2563eb" />
              </View>
              <Text style={styles.menuItemText}>Settings</Text>
            </View>
            <Text style={styles.menuItemChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {convexUser?.isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Debug (Admin)</Text>
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' }]}
              activeOpacity={0.8}
              onPress={refreshRevenueCat}
              disabled={rcLoading}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: '#e0f2fe' }]}>
                  <Sparkles size={20} color="#0284c7" />
                </View>
                <View>
                  <Text style={styles.menuItemText}>{rcLoading ? 'Loading RevenueCat…' : 'Refresh RevenueCat customerInfo'}</Text>
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
                    Verifies subscription is active on device
                  </Text>
                </View>
              </View>
              <Text style={styles.menuItemChevron}>›</Text>
            </TouchableOpacity>

            {rcInfo ? (
              <View style={[styles.menuItem, { backgroundColor: '#ffffff' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemText, { marginBottom: 6 }]}>customerInfo</Text>
                  <Text style={{ color: '#475569', fontWeight: '600', fontSize: 12, lineHeight: 16 }}>
                    {JSON.stringify(rcInfo, null, 2)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <LogOut size={20} color="#dc2626" />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>


      </ScrollView>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ebf2fe',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  email: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  menuItemChevron: {
    fontSize: 24,
    color: '#cbd5e1',
    fontWeight: '300',
  },
  signOutButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  statsSection: {
    paddingHorizontal: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});
