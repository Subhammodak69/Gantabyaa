import React, {useEffect, useState} from 'react';
import {Modal, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import {fetchReferralCode, fetchReferrals} from '../api/tourApi';
import {WEB_APP_URL} from '../api/client';
import {AppColors, useColors} from '../theme/theme';
import {encodeReferral} from '../utils/referral';
import {ReferralListSkeleton} from '../components/Skeleton';

const formatDate = (value?: string | null) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
};

const formatReward = (amount?: string | number | null, currency = 'INR') => {
  if (amount == null || amount === '') return 'Not available';
  const value = Number(amount);
  return Number.isFinite(value) ? `${currency} ${value.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'Not available';
};

export const ReferralsScreen: React.FC = () => {
  const COLORS = useColors();
  const styles = makeStyles(COLORS);
  const [shareLink, setShareLink] = useState('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => {
    try {
      setLoading(true);
      const [codeResponse, referralResponse] = await Promise.all([fetchReferralCode(), fetchReferrals()]);
      const code = codeResponse.data?.referral_code;
      if (code) setShareLink(`${WEB_APP_URL}/invite?r=${encodeURIComponent(encodeReferral(code))}`);
      setReferrals(Array.isArray(referralResponse.data) ? referralResponse.data : []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const handleRefresh = async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } };
  const share = () => { if (shareLink) Share.share({message: `Join me on Gantabyaa and plan your next journey: ${shareLink}`}); };
  return <>
  <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}>
    <Text style={styles.title}>Refer & earn</Text>
    <Text style={styles.subtitle}>Invite someone to discover their next journey.</Text>
    <View style={styles.hero}><Text style={styles.heroIcon}>↗</Text><Text style={styles.heroTitle}>Your invite is ready</Text><Text style={styles.heroText}>Share a private invite link. Your referral details stay hidden.</Text><Pressable style={styles.shareButton} onPress={share} disabled={!shareLink || loading}><Text style={styles.shareText}>{loading ? 'Loading...' : 'Share invite link'}</Text></Pressable></View>
    <View style={styles.criteria}>
      <Text style={styles.criteriaTitle}>How to earn a referral reward</Text>
      <Text style={styles.criteriaText}><Text style={styles.criteriaEmphasis}>1. Invite someone new. </Text>Share your link with someone who does not already have a Gantabyaa account.</Text>
      <Text style={styles.criteriaText}><Text style={styles.criteriaEmphasis}>2. They sign up through your link. </Text>The referral must be connected when they create their account; existing accounts cannot be added later.</Text>
      <Text style={styles.criteriaText}><Text style={styles.criteriaEmphasis}>3. They complete a booking. </Text>The referral is reviewed after booking completion. A reward is given only if it is approved; its amount and booking window follow the referral settings.</Text>
    </View>
    <Text style={styles.sectionTitle}>Referral activity</Text>
    {loading ? <ReferralListSkeleton count={3} /> : referrals.length === 0 ? <Text style={styles.empty}>No referral activity yet.</Text> : referrals.map(item => {
      const customer = item.referred_customer || {};
      const status = item.status || 'PENDING';
      const statusStyle = ['REWARD_APPROVED', 'REWARD_CREDITED', 'COMPLETED', 'SIGNED_UP', 'CONVERTED'].includes(status)
        ? styles.statusComplete
        : ['REGISTERED', 'PENDING', 'BOOKING_COMPLETED', 'REWARD_ELIGIBLE'].includes(status)
          ? styles.statusPending
          : ['EXPIRED', 'CANCELLED', 'BLOCKED'].includes(status)
            ? styles.statusRejected
            : styles.statusOther;
      return (
        <Pressable
          style={({pressed}) => [styles.row, pressed && styles.rowPressed]}
          key={item.id}
          onPress={() => setSelectedReferral(item)}
          accessibilityRole="button"
          accessibilityLabel={`View referral details for ${customer.name || 'New traveler'}`}
          accessibilityHint="Opens the full referral details"
        >
          <View style={styles.folderIcon}><Feather name="folder" size={19} color={COLORS.primary} /></View>
          <View style={styles.copy}>
            <View style={styles.rowHeader}>
              <Text style={styles.name}>{customer.name || 'New traveler'}</Text>
              <View style={statusStyle}><Text style={styles.statusText}>{status.replace(/_/g, ' ')}</Text></View>
            </View>
            <Text style={styles.meta}>Referred {formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.rowEnd}>
            <Text style={styles.rowReward}>{formatReward(item.reward_amount, item.currency || 'INR')}</Text>
            <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
          </View>
        </Pressable>
      );
    })}
  </ScrollView>
  <Modal visible={Boolean(selectedReferral)} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSelectedReferral(null)}>
    {selectedReferral && (() => {
      const customer = selectedReferral.referred_customer || {};
      const status = selectedReferral.status || 'PENDING';
      const statusStyle = ['REWARD_APPROVED', 'REWARD_CREDITED', 'COMPLETED', 'SIGNED_UP', 'CONVERTED'].includes(status)
        ? styles.statusComplete
        : ['REGISTERED', 'PENDING', 'BOOKING_COMPLETED', 'REWARD_ELIGIBLE'].includes(status)
          ? styles.statusPending
          : ['EXPIRED', 'CANCELLED', 'BLOCKED'].includes(status)
            ? styles.statusRejected
            : styles.statusOther;
      const details = [
        ['Referral code', selectedReferral.referral_code],
        ['Customer code', customer.customer_code],
        ['Email', customer.email],
        ['Mobile', customer.mobile],
        ['Booking', customer.booking_code || customer.booking_id],
        ['Booking date', formatDate(customer.booking_date)],
        ['Transaction date', formatDate(selectedReferral.transaction_date)],
        ['Converted at', formatDate(selectedReferral.converted_at)],
        ['Payment method', selectedReferral.payment_method],
      ];
      return (
        <SafeAreaView style={styles.detailScreen}>
          <View style={styles.detailHeader}>
            <Pressable style={styles.backButton} onPress={() => setSelectedReferral(null)} accessibilityRole="button" accessibilityLabel="Back to referral activity">
              <Feather name="arrow-left" size={20} color={COLORS.text} />
            </Pressable>
            <Text style={styles.detailHeaderTitle}>Referral details</Text>
            <View style={styles.headerSpacer} />
          </View>
          <ScrollView contentContainerStyle={styles.detailContent}>
            <View style={styles.detailHero}>
              <View style={styles.detailFolderIcon}><Feather name="folder" size={22} color={COLORS.primary} /></View>
              <Text style={styles.detailName}>{customer.name || 'New traveler'}</Text>
              <Text style={styles.detailMeta}>Referred {formatDate(selectedReferral.created_at)}</Text>
              <View style={statusStyle}><Text style={styles.statusText}>{status.replace(/_/g, ' ')}</Text></View>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailSectionTitle}>Referral information</Text>
              <View style={styles.details}>
                {details.map(([label, value]) => (
                  <View style={styles.detail} key={label}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={styles.detailValue}>{value || 'Not available'}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.rewardRow}>
                <Text style={styles.rewardLabel}>Reward</Text>
                <Text style={styles.reward}>{formatReward(selectedReferral.reward_amount, selectedReferral.currency || 'INR')}</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    })()}
  </Modal>
  </>;
};

const makeStyles = (COLORS: AppColors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},
  content: {padding: 16, paddingBottom: 35},
  title: {fontSize: 23, fontWeight: '900', color: COLORS.text},
  subtitle: {fontSize: 12, color: COLORS.textSecondary, marginTop: 4, marginBottom: 16},
  hero: {backgroundColor: COLORS.primaryDark, borderRadius: 15, padding: 20, marginBottom: 22},
  heroIcon: {fontSize: 30, color: COLORS.gold},
  heroTitle: {fontSize: 18, fontWeight: '900', color: COLORS.textLight, marginTop: 9},
  heroText: {fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginTop: 5},
  shareButton: {backgroundColor: COLORS.goldDark, borderRadius: 9, alignItems: 'center', paddingVertical: 12, marginTop: 17},
  shareText: {color: COLORS.textLight, fontWeight: '900', fontSize: 12},
  criteria: {backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, padding: 15, marginBottom: 22, gap: 10},
  criteriaTitle: {fontSize: 14, fontWeight: '900', color: COLORS.text},
  criteriaText: {fontSize: 11, color: COLORS.textSecondary, lineHeight: 17},
  criteriaEmphasis: {fontWeight: '800', color: COLORS.text},
  sectionTitle: {fontSize: 12, fontWeight: '900', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 9},
  empty: {fontSize: 13, color: COLORS.textSecondary, paddingVertical: 25},
  row: {backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10},
  rowPressed: {backgroundColor: COLORS.surface},
  folderIcon: {width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.primarySubtle, alignItems: 'center', justifyContent: 'center'},
  rowHeader: {flexDirection: 'row', alignItems: 'center', gap: 7},
  copy: {flex: 1, minWidth: 0},
  name: {fontSize: 13, fontWeight: '800', color: COLORS.text},
  meta: {fontSize: 10, color: COLORS.textMuted, marginTop: 4},
  rowEnd: {flexDirection: 'row', alignItems: 'center', gap: 4},
  rowReward: {fontSize: 11, fontWeight: '800', color: COLORS.text},
  statusPending: {borderRadius: 12, backgroundColor: COLORS.goldLight, paddingHorizontal: 8, paddingVertical: 5},
  statusComplete: {borderRadius: 12, backgroundColor: COLORS.successLight, paddingHorizontal: 8, paddingVertical: 5},
  statusRejected: {borderRadius: 12, backgroundColor: COLORS.dangerLight, paddingHorizontal: 8, paddingVertical: 5},
  statusOther: {borderRadius: 12, backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 5},
  statusText: {fontSize: 9, fontWeight: '900', color: COLORS.text},
  detailScreen: {flex: 1, backgroundColor: COLORS.bg},
  detailHeader: {minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.bg},
  backButton: {width: 38, height: 38, alignItems: 'flex-start', justifyContent: 'center'},
  detailHeaderTitle: {fontSize: 16, fontWeight: '900', color: COLORS.text},
  headerSpacer: {width: 38},
  detailContent: {padding: 16, paddingBottom: 32, gap: 14},
  detailHero: {alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 20},
  detailFolderIcon: {width: 50, height: 50, borderRadius: 15, backgroundColor: COLORS.primarySubtle, alignItems: 'center', justifyContent: 'center'},
  detailName: {fontSize: 18, fontWeight: '900', color: COLORS.text, textAlign: 'center', marginTop: 12},
  detailMeta: {fontSize: 11, color: COLORS.textMuted, marginTop: 4, marginBottom: 12},
  detailCard: {backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 15},
  detailSectionTitle: {fontSize: 13, fontWeight: '900', color: COLORS.text},
  details: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 12, paddingTop: 11},
  detail: {width: '47%', minWidth: 0},
  detailLabel: {fontSize: 9, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase'},
  detailValue: {fontSize: 11, fontWeight: '600', color: COLORS.text, marginTop: 3},
  rewardRow: {flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 10, paddingTop: 9},
  rewardLabel: {fontSize: 11, fontWeight: '700', color: COLORS.textMuted},
  reward: {fontSize: 12, fontWeight: '900', color: COLORS.success},
});
