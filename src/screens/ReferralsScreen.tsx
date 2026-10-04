import React, {useEffect, useState} from 'react';
import {Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View} from 'react-native';
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
  return <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}>
    <Text style={styles.title}>Refer & earn</Text>
    <Text style={styles.subtitle}>Invite someone to discover their next journey.</Text>
    <View style={styles.hero}><Text style={styles.heroIcon}>↗</Text><Text style={styles.heroTitle}>Your invite is ready</Text><Text style={styles.heroText}>Share a private invite link. Your referral details stay hidden.</Text><Pressable style={styles.shareButton} onPress={share} disabled={!shareLink || loading}><Text style={styles.shareText}>{loading ? 'Loading...' : 'Share invite link'}</Text></Pressable></View>
    <Text style={styles.sectionTitle}>Referral activity</Text>
    {loading ? <ReferralListSkeleton count={3} /> : referrals.length === 0 ? <Text style={styles.empty}>No referral activity yet.</Text> : referrals.map(item => {
      const customer = item.referred_customer || {};
      const status = item.status || 'PENDING';
      const statusStyle = ['COMPLETED', 'SIGNED_UP', 'CONVERTED'].includes(status) ? styles.statusComplete : ['REGISTERED', 'PENDING'].includes(status) ? styles.statusPending : styles.statusOther;
      const details = [
        ['Referral code', item.referral_code],
        ['Customer code', customer.customer_code],
        ['Email', customer.email],
        ['Mobile', customer.mobile],
        ['Booking', customer.booking_code || customer.booking_id],
        ['Booking date', formatDate(customer.booking_date)],
        ['Transaction date', formatDate(item.transaction_date)],
        ['Converted at', formatDate(item.converted_at)],
        ['Payment method', item.payment_method],
      ];
      return (
        <View style={styles.row} key={item.id}>
          <View style={styles.rowHeader}>
            <View style={styles.copy}>
              <Text style={styles.name}>{customer.name || 'New traveler'}</Text>
              <Text style={styles.meta}>Referred {formatDate(item.created_at)}</Text>
            </View>
            <View style={statusStyle}><Text style={styles.statusText}>{status}</Text></View>
          </View>
          <View style={styles.details}>
            {details.map(([label, value]) => (
              <View style={styles.detail} key={label}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue} numberOfLines={2}>{value || 'Not available'}</Text>
              </View>
            ))}
          </View>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardLabel}>Reward</Text>
            <Text style={styles.reward}>{formatReward(item.reward_amount, item.currency || 'INR')}</Text>
          </View>
        </View>
      );
    })}
  </ScrollView>;
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
  sectionTitle: {fontSize: 12, fontWeight: '900', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 9},
  empty: {fontSize: 13, color: COLORS.textSecondary, paddingVertical: 25},
  row: {backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, padding: 13, marginBottom: 10},
  rowHeader: {flexDirection: 'row', alignItems: 'center', gap: 8},
  copy: {flex: 1, minWidth: 0},
  name: {fontSize: 13, fontWeight: '800', color: COLORS.text},
  meta: {fontSize: 10, color: COLORS.textMuted, marginTop: 4},
  statusPending: {borderRadius: 12, backgroundColor: COLORS.goldDark, paddingHorizontal: 8, paddingVertical: 5},
  statusComplete: {borderRadius: 12, backgroundColor: COLORS.success, paddingHorizontal: 8, paddingVertical: 5},
  statusOther: {borderRadius: 12, backgroundColor: COLORS.border, paddingHorizontal: 8, paddingVertical: 5},
  statusText: {fontSize: 9, fontWeight: '900', color: COLORS.textLight},
  details: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 12, paddingTop: 11},
  detail: {width: '47%', minWidth: 0},
  detailLabel: {fontSize: 9, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase'},
  detailValue: {fontSize: 11, fontWeight: '600', color: COLORS.text, marginTop: 3},
  rewardRow: {flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 10, paddingTop: 9},
  rewardLabel: {fontSize: 11, fontWeight: '700', color: COLORS.textMuted},
  reward: {fontSize: 12, fontWeight: '900', color: COLORS.success},
});
