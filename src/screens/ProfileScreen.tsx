import React, { useState, useEffect, useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/theme';
import {
  AuthUser,
  fetchUserStats,
  UserStats,
} from '../api/tourApi';
import { NavScreen } from '../types';
import { ProfileStatsSkeleton } from '../components/Skeleton';

interface Props {
  isLoggedIn: boolean;
  userPhone: string;
  user: AuthUser | null;
  enquiries: any[];
  savedTours?: string[];
  onNavigate: (screen: NavScreen) => void;
}

type IconSet = 'feather' | 'mci';

const RowIcon = ({ set, name, size, color }: { set: IconSet; name: string; size: number; color: string }) =>
  set === 'mci'
    ? <MaterialCommunityIcons name={name} size={size} color={color} />
    : <Feather name={name} size={size} color={color} />;

export const ProfileScreen: React.FC<Props> = ({
  isLoggedIn,
  userPhone,
  user,
  enquiries,
  onNavigate,
}) => {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!isLoggedIn) return;
      try {
        setStatsLoading(true);
        setStats(await fetchUserStats());
      } catch (error) {
        console.error('Failed to load profile data:', error);
      } finally {
        setStatsLoading(false);
      }
  }, [isLoggedIn]);

  useEffect(() => { loadData(); }, [loadData]);
  const handleRefresh = async () => { setRefreshing(true); try { await loadData(); } finally { setRefreshing(false); } };

  if (!isLoggedIn) {
    return (
      <View style={styles.empty}>
        <Feather name="user" size={44} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
        <Text style={styles.emptyTitle}>Guest Traveler</Text>
        <Text style={styles.emptyText}>Sign in to manage your profile, sessions and travel details.</Text>
        <Pressable style={styles.primaryButton} onPress={() => onNavigate('auth')}>
          <Text style={styles.primaryText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  const displayName = user?.name || user?.mobile || `+91 ${userPhone}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {user?.profile_pic ? (
            <Image
              source={{ uri: user.profile_pic }}
              style={styles.avatarImage}
              resizeMode="cover"
              accessibilityLabel="Profile picture"
            />
          ) : (
            <Feather name="user" size={28} color={COLORS.primary} />
          )}
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{displayName}</Text>
          <Text style={styles.sub} numberOfLines={1} ellipsizeMode="tail">
            {user?.email || user?.mobile || 'Registered member'}
          </Text>
        </View>
      </View>

      {statsLoading ? (
        <ProfileStatsSkeleton />
      ) : stats ? (
        <View style={styles.statsGrid}>
          <StatCard iconSet="mci" iconName="airplane" label="Journeys" value={stats.journeys_taken} styles={styles} color={COLORS.text} />
          <StatCard iconSet="mci" iconName="earth" label="Countries" value={stats.countries_visited} styles={styles} color={COLORS.text} />
          <StatCard iconSet="feather" iconName="calendar" label="Travel days" value={stats.total_travel_days} styles={styles} color={COLORS.text} />
          <StatCard iconSet="feather" iconName="star" label="Member since" value={new Date(stats.member_since || '').getFullYear() || '2024'} styles={styles} color={COLORS.text} />
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Account</Text>
      <ProfileRow styles={styles} iconSet="feather" iconName="user" title="Profile details" subtitle="Personal information, security and account settings" onPress={() => onNavigate('profile_details')} />
      <ProfileRow styles={styles} iconSet="mci" iconName="airplane-takeoff" title="My trips" subtitle="View your upcoming and completed trips" onPress={() => onNavigate('my_trips')} />
      <ProfileRow styles={styles} iconSet="feather" iconName="message-square" title="My enquiries" subtitle={`${enquiries.length} travel enquiries submitted`} onPress={() => onNavigate('my_enquiries')} />
      <ProfileRow styles={styles} iconSet="mci" iconName="currency-inr" title="Bills & invoices" subtitle="View your booking bills and invoices" onPress={() => onNavigate('bills_invoices')} />
      <ProfileRow styles={styles} iconSet="mci" iconName="wallet-outline" title="Wallet & transactions" subtitle="Balance and payment history" onPress={() => onNavigate('wallet')} />
      <ProfileRow styles={styles} iconSet="feather" iconName="award" title="Travel points" subtitle="Points balance, rewards and your rank" onPress={() => onNavigate('points')} />
      <ProfileRow styles={styles} iconSet="feather" iconName="file-text" title="My documents" subtitle="Upload and manage incoming and outgoing files" onPress={() => onNavigate('documents')} />
      <ProfileRow styles={styles} iconSet="feather" iconName="heart" title="My wishlist" subtitle="Your saved travel packages" onPress={() => onNavigate('wishlist')} />
      <ProfileRow styles={styles} iconSet="feather" iconName="gift" title="Refer & earn" subtitle="Share your travel network" onPress={() => onNavigate('referrals')} />

    </ScrollView>
  );
};

type Styles = ReturnType<typeof makeStyles>;

const ProfileRow = ({
  iconSet, iconName, title, subtitle, onPress, danger = false, styles,
}: { iconSet: IconSet; iconName: string; title: string; subtitle: string; onPress: () => void; danger?: boolean; styles: Styles }) => {
  const iconColor = danger ? styles.dangerText.color as string : styles.rowIconText.color as string;
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.rowIcon, danger && styles.dangerIcon]}>
        <RowIcon set={iconSet} name={iconName} size={19} color={iconColor} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, danger && styles.dangerText]} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowSubtitle} numberOfLines={2}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={22} color={styles.arrow.color as string} />
    </Pressable>
  );
};

const StatCard = ({
  iconSet, iconName, label, value, styles, color,
}: { iconSet: IconSet; iconName: string; label: string; value: string | number; styles: Styles; color: string }) => (
  <View style={styles.statCard}>
    <RowIcon set={iconSet} name={iconName} size={24} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
  </View>
);

const makeStyles = (COLORS: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    content: { padding: 16, paddingBottom: 35 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: 16,
      padding: 18,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: 14,
    },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: COLORS.primarySubtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    headerCopy: { flex: 1, minWidth: 0 },
    name: { fontSize: 18, fontWeight: '900', color: COLORS.text },
    sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '900',
      color: COLORS.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
      marginTop: 7,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 13,
      padding: 13,
      marginBottom: 9,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: COLORS.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rowIconText: { color: COLORS.primary },
    rowCopy: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
    rowSubtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
    arrow: { color: COLORS.textMuted },
    dangerIcon: { backgroundColor: COLORS.dangerLight },
    dangerText: { color: COLORS.danger },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: COLORS.bg },
    emptyTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
    emptyText: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 8, marginBottom: 20 },
    primaryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 13, borderRadius: 10 },
    primaryText: { color: '#fff', fontWeight: '800' },
    statsLoading: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
    statCard: {
      flexBasis: '47%',
      flexGrow: 1,
      backgroundColor: COLORS.card,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingVertical: 16,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: { fontSize: 18, fontWeight: '900', color: COLORS.primary, marginTop: 6 },
    statLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },

    // Delete-account OTP modal
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalBackdrop: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    otpModalCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: COLORS.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 22,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    otpHeader: {
      alignItems: 'center',
      marginBottom: 16,
    },
    otpDangerIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: COLORS.dangerLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    otpModalTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: COLORS.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    otpModalSubtitle: {
      fontSize: 12,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    input: {
      height: 48,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      color: COLORS.text,
      backgroundColor: COLORS.surface,
      fontSize: 14,
    },
    otpInput: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: 6,
      height: 52,
      marginBottom: 16,
    },
    otpActions: {
      flexDirection: 'row',
      gap: 10,
    },
    otpCancelBtn: {
      flex: 1,
      height: 46,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.surface,
    },
    otpCancelBtnText: {
      color: COLORS.text,
      fontWeight: '800',
      fontSize: 13,
    },
    otpConfirmBtn: {
      flex: 1,
      height: 46,
      borderRadius: 10,
      backgroundColor: COLORS.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    otpConfirmBtnText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 13,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });
