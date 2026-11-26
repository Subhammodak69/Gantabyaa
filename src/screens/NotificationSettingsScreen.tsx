import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';
import { ScrollView } from '../components/ScrollView';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { AppColors, useColors } from '../theme/theme';
import { fetchNotificationPreferences, updateNotificationPreferences, NotificationPreferences } from '../api/tourApi';
import { showApiError } from '../utils/toast';
import { NotifSettingsSkeleton } from '../components/Skeleton';

interface Props {
  isLoggedIn: boolean;
}

export const NotificationSettingsScreen: React.FC<Props> = ({ isLoggedIn }) => {
  const COLORS = useColors();
  const styles = makeStyles(COLORS);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    push_notifications: true,
    newsletter: true,
    sms_alerts: false,
    email_updates: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPreferences = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchNotificationPreferences();
      setPrefs(data);
    } catch (error) {
      showApiError('Failed to load notification preferences');
      console.error(error);
    } finally { setLoading(false); }
  }, [isLoggedIn]);

  useEffect(() => { loadPreferences(); }, [loadPreferences]);
  const handleRefresh = async () => { setRefreshing(true); try { await loadPreferences(); } finally { setRefreshing(false); } };

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const oldPrefs = { ...prefs };
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);

    try {
      setSaving(true);
      await updateNotificationPreferences(newPrefs);
    } catch (error) {
      setPrefs(oldPrefs);
      showApiError('Failed to update notification preferences');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Sign in required</Text>
          <Text style={styles.emptyText}>You must sign in to manage notification preferences.</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <NotifSettingsSkeleton />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}>
      <Text style={styles.title}>Notification Preferences</Text>
      <Text style={styles.subtitle}>Choose how we contact you with travel updates</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Communication</Text>

        <NotificationRow
          icon={<Feather name="bell" size={20} color={COLORS.primary} />}
          title="Push notifications"
          subtitle="Trip reminders & booking updates"
          value={prefs.push_notifications}
          onToggle={() => handleToggle('push_notifications')}
          disabled={saving}
          COLORS={COLORS}
        />

        <NotificationRow
          icon={<Feather name="mail" size={20} color={COLORS.primary} />}
          title="Email updates"
          subtitle="Special offers & travel stories"
          value={prefs.email_updates}
          onToggle={() => handleToggle('email_updates')}
          disabled={saving}
          COLORS={COLORS}
        />

        <NotificationRow
          icon={<FontAwesome name="whatsapp" size={21} color="#25D366" />}
          title="WhatsApp alerts"
          subtitle="Trip updates & itineraries on WhatsApp"
          value={prefs.newsletter}
          onToggle={() => handleToggle('newsletter')}
          disabled={saving}
          COLORS={COLORS}
        />

        <NotificationRow
          icon={<Feather name="message-square" size={20} color={COLORS.primary} />}
          title="SMS alerts"
          subtitle="Booking confirmations via SMS"
          value={prefs.sms_alerts}
          onToggle={() => handleToggle('sms_alerts')}
          disabled={saving}
          COLORS={COLORS}
        />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          💡 Keep at least one notification method enabled to stay updated about your bookings and special travel deals.
        </Text>
      </View>
    </ScrollView>
  );
};

const NotificationRow: React.FC<{
  icon: ReactNode;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
  COLORS: AppColors;
}> = ({ icon, title, subtitle, value, onToggle, disabled, COLORS }) => {
  const styles = makeStyles(COLORS);
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrapper}>
          {typeof icon === 'string' ? <Text style={styles.rowIcon}>{icon}</Text> : icon}
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: COLORS.border, true: COLORS.primarySubtle }}
        thumbColor={value ? COLORS.primary : COLORS.textMuted}
      />
    </View>
  );
};

const makeStyles = (COLORS: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  title: {
    fontSize: 23,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    padding: 14,
    marginBottom: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconWrapper: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowIcon: {
    fontSize: 20,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  rowSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  infoBox: {
    backgroundColor: COLORS.primarySubtle,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 14,
    marginTop: 10,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
