import React from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ScrollView } from '../components/ScrollView';
import Feather from 'react-native-vector-icons/Feather';
import { AuthUser, deleteAccount, logoutAllSessions, requestOtp } from '../api/tourApi';
import { useTheme } from '../theme/theme';
import { NavScreen } from '../types';
import { useAppDialog } from '../components/AppDialog';
import { showApiError } from '../utils/toast';

interface Props {
  user: AuthUser | null;
  onNavigate: (screen: NavScreen) => void;
  onLogout: (all?: boolean) => void;
  onRefresh?: () => Promise<void> | void;
}

const formatDate = (value?: string) => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not provided';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const DetailRow = ({
  icon,
  label,
  value,
  styles,
  colors,
}: {
  icon: string;
  label: string;
  value?: string | null;
  styles: ReturnType<typeof makeStyles>;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>
      <Feather name={icon} size={16} color={colors.primary} />
    </View>
    <View style={styles.detailCopy}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, !value && styles.mutedValue]}>
        {value || 'Not provided'}
      </Text>
    </View>
  </View>
);

const ProfileAction = ({
  icon,
  title,
  subtitle,
  onPress,
  styles,
  danger = false,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  danger?: boolean;
}) => (
  <Pressable style={styles.actionRow} onPress={onPress}>
    <View style={[styles.actionIcon, danger && styles.actionDangerIcon]}>
      <Feather name={icon} size={17} color={danger ? styles.actionDangerText.color as string : styles.actionIconText.color as string} />
    </View>
    <View style={styles.actionCopy}>
      <Text style={[styles.actionTitle, danger && styles.actionDangerText]}>{title}</Text>
      <Text style={styles.actionSubtitle} numberOfLines={2}>{subtitle}</Text>
    </View>
    <Feather name="chevron-right" size={19} color={styles.actionArrow.color as string} />
  </Pressable>
);

export const ProfileDetailsScreen: React.FC<Props> = ({ user, onNavigate, onLogout, onRefresh }) => {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS, isDark);
  const { showDialog } = useAppDialog();
  const [refreshing, setRefreshing] = React.useState(false);
  const [deleteOtpModalVisible, setDeleteOtpModalVisible] = React.useState(false);
  const [deleteOtp, setDeleteOtp] = React.useState('');
  const [deletingAccount, setDeletingAccount] = React.useState(false);
  const [sendingOtp, setSendingOtp] = React.useState(false);
  const handleRefresh = async () => { setRefreshing(true); try { await onRefresh?.(); } finally { setRefreshing(false); } };
  const displayName = user?.name || 'Traveller';
  const accountStatus = user?.is_active === false ? 'Inactive' : 'Active';
  const identifier = user?.mobile || user?.email || '';

  const handleLogout = async () => {
    const confirmed = await showDialog({
      title: 'Log out?',
      message: 'You will be signed out from this device.',
      variant: 'warning',
      confirmText: 'Log out',
      cancelText: 'Cancel',
    });
    if (confirmed) onLogout();
  };

  const handleLogoutOtherDevices = async () => {
    const confirmed = await showDialog({
      title: 'Log out other devices?',
      message: 'All other active devices will be signed out. You will remain logged in on this device.',
      variant: 'warning',
      confirmText: 'Log out others',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;
    try {
      await logoutAllSessions();
      await showDialog({
        title: 'Sessions ended',
        message: 'All other active devices have been signed out.',
        variant: 'success',
      });
    } catch (error) {
      showApiError(error, 'Could not log out other devices.');
    }
  };

  const handleDeleteAccountPress = async () => {
    const confirmed = await showDialog({
      title: 'Delete account permanently?',
      message: 'This will permanently erase your profile, trips, documents and enquiries. This cannot be undone.',
      variant: 'warning',
      confirmText: 'Continue',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;
    if (!identifier) {
      showApiError(new Error('No account identifier is available.'), 'Could not start account deletion.');
      return;
    }
    setSendingOtp(true);
    try {
      await requestOtp(identifier, 'DELETE_ACCOUNT');
      setDeleteOtp('');
      setDeleteOtpModalVisible(true);
    } catch (error) {
      showApiError(error, 'Could not send verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleCancelDeleteOtp = () => {
    setDeleteOtpModalVisible(false);
    setDeleteOtp('');
  };

  const confirmDeleteAccount = async () => {
    if (!deleteOtp.trim() || !identifier) return;
    setDeletingAccount(true);
    try {
      await deleteAccount({ identifier, otp: deleteOtp.trim() });
      setDeleteOtpModalVisible(false);
      setDeleteOtp('');
      await showDialog({
        title: 'Account deleted',
        message: 'Your account and all associated data have been permanently removed.',
        variant: 'success',
      });
      onLogout(true);
    } catch (error) {
      showApiError(error, 'We could not verify that code. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
    >
      <View style={styles.pageHeading}>
        <Text style={styles.pageTitle}>Profile details</Text>
        <Text style={styles.pageSubtitle}>Your personal and emergency contact information.</Text>
      </View>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          {user?.profile_pic ? (
            <Image
              source={{ uri: user.profile_pic }}
              style={styles.avatarImage}
              resizeMode="cover"
              accessibilityLabel="Profile picture"
            />
          ) : (
            <Text style={styles.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.identifier}>{user?.email || user?.mobile || 'Customer account'}</Text>
        <View style={[styles.statusPill, user?.is_active === false && styles.inactivePill]}>
          <View style={[styles.statusDot, user?.is_active === false && styles.inactiveDot]} />
          <Text style={[styles.statusText, user?.is_active === false && styles.inactiveText]}>
            {accountStatus} account
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Manage account</Text>
      <View style={styles.actionsCard}>
        <ProfileAction icon="edit-2" title="Edit profile" subtitle="Update your personal and emergency contact details" onPress={() => onNavigate('edit_profile')} styles={styles} />
        <ProfileAction icon="bell" title="Notification settings" subtitle="Manage how we keep you informed" onPress={() => onNavigate('notification_settings')} styles={styles} />
        <ProfileAction icon="smartphone" title="Active sessions" subtitle="Review devices signed in to your account" onPress={() => onNavigate('sessions')} styles={styles} />
        <ProfileAction icon="log-out" title="Log out" subtitle="Sign out from this device" onPress={handleLogout} styles={styles} danger />
        <ProfileAction icon="power" title="Log out other devices" subtitle="Sign out everywhere else" onPress={handleLogoutOtherDevices} styles={styles} danger />
      </View>

      <Text style={styles.sectionTitle}>Contact information</Text>
      <View style={styles.sectionCard}>
        <DetailRow icon="user" label="Full name" value={user?.name} styles={styles} colors={COLORS} />
        <DetailRow icon="phone" label="Mobile number" value={user?.mobile} styles={styles} colors={COLORS} />
        <DetailRow icon="mail" label="Email address" value={user?.email} styles={styles} colors={COLORS} />
        <DetailRow icon="map-pin" label="Address" value={user?.address} styles={styles} colors={COLORS} />
      </View>

      <Text style={styles.sectionTitle}>Danger zone</Text>
      <View style={styles.actionsCard}>
        <ProfileAction
          icon="trash-2"
          title={sendingOtp ? 'Sending verification code…' : 'Delete account'}
          subtitle="Permanently erase your account and data"
          onPress={sendingOtp ? () => {} : handleDeleteAccountPress}
          styles={styles}
          danger
        />
      </View>

      <Modal visible={deleteOtpModalVisible} transparent animationType="fade" onRequestClose={handleCancelDeleteOtp}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={handleCancelDeleteOtp} />
          <View style={styles.otpModalCard}>
            <View style={styles.otpDangerIcon}>
              <Feather name="alert-triangle" size={22} color={COLORS.danger} />
            </View>
            <Text style={styles.otpModalTitle}>Verify account deletion</Text>
            <Text style={styles.otpModalSubtitle}>Enter the verification code sent to {identifier}.</Text>
            <TextInput
              style={styles.otpInput}
              keyboardType="number-pad"
              value={deleteOtp}
              onChangeText={setDeleteOtp}
              placeholder="Enter 6-digit code"
              placeholderTextColor={COLORS.textMuted}
              maxLength={6}
              editable={!deletingAccount}
              autoFocus
              textAlign="center"
            />
            <View style={styles.otpActions}>
              <Pressable style={styles.otpCancelButton} onPress={handleCancelDeleteOtp} disabled={deletingAccount}>
                <Text style={styles.otpCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.otpConfirmButton, (!deleteOtp.trim() || deletingAccount) && styles.buttonDisabled]}
                onPress={confirmDeleteAccount}
                disabled={!deleteOtp.trim() || deletingAccount}
              >
                {deletingAccount ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.otpConfirmText}>Confirm delete</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Text style={styles.sectionTitle}>Emergency contact</Text>
      <View style={styles.sectionCard}>
        <DetailRow
          icon="user-plus"
          label="Contact name"
          value={user?.emergency_contact_name}
          styles={styles}
          colors={COLORS}
        />
        <DetailRow
          icon="phone-call"
          label="Contact number"
          value={user?.emergency_contact_mobile}
          styles={styles}
          colors={COLORS}
        />
      </View>

      <Text style={styles.sectionTitle}>Account information</Text>
      <View style={styles.sectionCard}>
        <DetailRow icon="hash" label="Customer code" value={user?.customer_code} styles={styles} colors={COLORS} />
        <DetailRow icon="globe" label="Account source" value={user?.source} styles={styles} colors={COLORS} />
        <DetailRow icon="calendar" label="Member since" value={formatDate(user?.created_at)} styles={styles} colors={COLORS} />
        <DetailRow icon="refresh-cw" label="Last updated" value={formatDate(user?.updated_at)} styles={styles} colors={COLORS} />
      </View>
    </ScrollView>
  );
};

const makeStyles = (COLORS: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    content: { padding: 16, paddingBottom: 36 },
    pageHeading: { marginBottom: 16 },
    pageTitle: { color: COLORS.text, fontSize: 23, fontWeight: '900' },
    pageSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
    profileCard: {
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderColor: COLORS.border,
      borderRadius: 20,
      borderWidth: 1,
      marginBottom: 24,
      paddingHorizontal: 20,
      paddingVertical: 24,
    },
    avatar: {
      alignItems: 'center',
      backgroundColor: COLORS.primarySubtle,
      borderColor: isDark ? COLORS.primaryLight : COLORS.primary,
      borderRadius: 52,
      borderWidth: 3,
      height: 104,
      justifyContent: 'center',
      marginBottom: 12,
      overflow: 'hidden',
      width: 104,
    },
    avatarImage: { height: '100%', width: '100%' },
    avatarInitial: { color: COLORS.primary, fontSize: 40, fontWeight: '900' },
    name: { color: COLORS.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
    identifier: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' },
    statusPill: {
      alignItems: 'center',
      backgroundColor: COLORS.successLight,
      borderRadius: 20,
      flexDirection: 'row',
      marginTop: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    inactivePill: { backgroundColor: COLORS.dangerLight },
    statusDot: { backgroundColor: COLORS.success, borderRadius: 4, height: 8, marginRight: 6, width: 8 },
    inactiveDot: { backgroundColor: COLORS.danger },
    statusText: { color: COLORS.success, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    inactiveText: { color: COLORS.danger },
    sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '900', marginBottom: 9, marginLeft: 2 },
    actionsCard: {
      backgroundColor: COLORS.card,
      borderColor: COLORS.border,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 20,
      overflow: 'hidden',
      paddingHorizontal: 14,
    },
    actionRow: {
      alignItems: 'center',
      borderBottomColor: COLORS.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      minHeight: 67,
      paddingVertical: 10,
    },
    actionIcon: {
      alignItems: 'center',
      backgroundColor: COLORS.primarySubtle,
      borderRadius: 10,
      height: 34,
      justifyContent: 'center',
      marginRight: 12,
      width: 34,
    },
    actionIconText: { color: COLORS.primary },
    actionDangerIcon: { backgroundColor: COLORS.dangerLight },
    actionCopy: { flex: 1, minWidth: 0 },
    actionTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
    actionSubtitle: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
    actionArrow: { color: COLORS.textMuted },
    actionDangerText: { color: COLORS.danger },
    sectionCard: {
      backgroundColor: COLORS.card,
      borderColor: COLORS.border,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 20,
      paddingHorizontal: 14,
    },
    detailRow: {
      alignItems: 'center',
      borderBottomColor: COLORS.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      minHeight: 68,
      paddingVertical: 10,
    },
    detailIcon: {
      alignItems: 'center',
      backgroundColor: COLORS.primarySubtle,
      borderRadius: 10,
      height: 34,
      justifyContent: 'center',
      marginRight: 12,
      width: 34,
    },
    detailCopy: { flex: 1 },
    detailLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
    detailValue: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginTop: 4 },
    mutedValue: { color: COLORS.textMuted, fontWeight: '500' },
    modalOverlay: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
    modalBackdrop: { backgroundColor: 'rgba(0, 0, 0, 0.65)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
    otpModalCard: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 18, borderWidth: 1, maxWidth: 380, padding: 22, width: '100%' },
    otpDangerIcon: { alignItems: 'center', alignSelf: 'center', backgroundColor: COLORS.dangerLight, borderRadius: 24, height: 48, justifyContent: 'center', marginBottom: 12, width: 48 },
    otpModalTitle: { color: COLORS.text, fontSize: 17, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
    otpModalSubtitle: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 16, textAlign: 'center' },
    otpInput: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 10, borderWidth: 1, color: COLORS.text, fontSize: 20, fontWeight: '800', height: 52, letterSpacing: 4, marginBottom: 16, paddingHorizontal: 14 },
    otpActions: { flexDirection: 'row', gap: 10 },
    otpCancelButton: { alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 10, borderWidth: 1, flex: 1, height: 46, justifyContent: 'center' },
    otpCancelText: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
    otpConfirmButton: { alignItems: 'center', backgroundColor: COLORS.danger, borderRadius: 10, flex: 1, height: 46, justifyContent: 'center' },
    otpConfirmText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    buttonDisabled: { opacity: 0.5 },
  });
