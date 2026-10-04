import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { fetchAccountPoints } from '../api/tourApi';
import { AccountPoints, PointsTransaction } from '../api/types';
import { AppColors, useTheme } from '../theme/theme';

const PAGE_SIZE = 20;

function formatPoints(value: string | number): string {
  const points = Number(value);
  return Number.isFinite(points) ? points.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : String(value);
}

function formatDate(value?: string | null): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const PointsScreen: React.FC<{
  onBack: () => void;
  onOpenRanking: () => void;
}> = ({ onBack, onOpenRanking }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [account, setAccount] = useState<AccountPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const loadPoints = useCallback(async (page = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    else if (page > 1) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const response = await fetchAccountPoints(page, PAGE_SIZE);
      if (!response.data) throw new Error(response.message || 'Points could not be loaded.');
      const pageData: AccountPoints = {
        ...response.data,
        transactions: Array.isArray(response.data.transactions) ? response.data.transactions : [],
      };
      setAccount(current => {
        if (page === 1 || !current) return pageData;
        return {
          ...pageData,
          transactions: [
            ...(Array.isArray(current.transactions) ? current.transactions : []),
            ...pageData.transactions,
          ],
        };
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Points could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadPoints(); }, [loadPoints]);

  const transactions = Array.isArray(account?.transactions) ? account.transactions : [];
  const pagination = account?.transaction_pagination;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton} onPress={onBack}>
          <Feather name="arrow-left" size={21} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Travel points</Text>
          <Text style={styles.headerSubtitle}>Your rewards and points activity</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPoints(1, true)} colors={[colors.primary]} />}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>AVAILABLE POINTS</Text>
          <Text style={styles.balanceValue}>{account ? formatPoints(account.points_balance) : loading ? 'Loading…' : '—'}</Text>
          <Text style={styles.balanceCaption}>Points earned on your Gantabyaa journeys</Text>
          {account && <View style={styles.rankBadge}><Feather name="award" size={15} color={colors.gold} /><Text style={styles.rankText}>Your rank · #{account.rank}</Text></View>}
        </View>

        <Pressable style={styles.rankingButton} onPress={onOpenRanking}>
          <View style={styles.rankingIcon}><Feather name="award" size={19} color={colors.primary} /></View>
          <View style={styles.rankingCopy}><Text style={styles.rankingTitle}>Public leaderboard</Text><Text style={styles.rankingSubtitle}>See how travelers rank across Gantabyaa</Text></View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </Pressable>

        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => loadPoints()}><Text style={styles.retry}>Retry</Text></Pressable></View>}

        <View style={[styles.sectionHeading, styles.activityHeading]}>
          <View><Text style={styles.eyebrow}>POINTS ACTIVITY</Text><Text style={styles.sectionTitle}>Transactions</Text></View>
          <Text style={styles.count}>{pagination?.total_items ?? transactions.length} total</Text>
        </View>
        {loading && !account ? <Text style={styles.empty}>Loading transactions…</Text> : transactions.length ? transactions.map(transaction => (
          <TransactionRow key={transaction.id} transaction={transaction} styles={styles} colors={colors} />
        )) : !error ? <Text style={styles.empty}>No points transactions yet.</Text> : null}
        {pagination?.has_next && (
          <Pressable style={styles.loadMore} disabled={loadingMore} onPress={() => loadPoints((pagination.current_page || 1) + 1)}>
            <Text style={styles.loadMoreText}>{loadingMore ? 'Loading…' : 'Load more transactions'}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
};

const TransactionRow = ({
  transaction, styles, colors,
}: { transaction: PointsTransaction; styles: ReturnType<typeof makeStyles>; colors: AppColors }) => {
  const points = Number(transaction.points) || 0;
  return (
    <View style={styles.transactionRow}>
      <View style={[styles.transactionIcon, points >= 0 ? styles.earnedIcon : styles.spentIcon]}>
        <Feather name={points >= 0 ? 'plus' : 'minus'} size={17} color={points >= 0 ? colors.success : colors.warning} />
      </View>
      <View style={styles.transactionCopy}>
        <Text style={styles.transactionTitle} numberOfLines={2}>{transaction.tour_title || transaction.reason || transaction.transaction_type.replace(/_/g, ' ')}</Text>
        <Text style={styles.transactionMeta}>{transaction.booking_code ? `${transaction.booking_code} · ` : ''}{formatDate(transaction.created_at)}</Text>
      </View>
      <Text style={[styles.transactionPoints, points < 0 && styles.negativePoints]}>{points > 0 ? '+' : ''}{formatPoints(points)} pts</Text>
    </View>
  );
};

const makeStyles = (colors: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  backButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, marginRight: 11 },
  headerCopy: { flex: 1 },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  headerSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  balanceCard: { padding: 20, borderRadius: 18, backgroundColor: colors.primaryDark, marginBottom: 12 },
  balanceLabel: { fontSize: 10, letterSpacing: 1.4, fontWeight: '900', color: colors.textSecondary },
  balanceValue: { fontSize: 36, fontWeight: '900', color: colors.textLight, marginTop: 6 },
  balanceCaption: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  rankBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 14 },
  rankText: { color: colors.textLight, fontSize: 11, fontWeight: '800' },
  rankingButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 13, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 20 },
  rankingIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.primarySubtle, marginRight: 10 },
  rankingCopy: { flex: 1 },
  rankingTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  rankingSubtitle: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 9 },
  activityHeading: { marginTop: 22 },
  eyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 3 },
  count: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  transactionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  transactionIcon: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  earnedIcon: { backgroundColor: colors.successLight },
  spentIcon: { backgroundColor: colors.goldLight },
  transactionCopy: { flex: 1, minWidth: 0 },
  transactionTitle: { color: colors.text, fontSize: 11, fontWeight: '800' },
  transactionMeta: { color: colors.textMuted, fontSize: 9, marginTop: 4 },
  transactionPoints: { color: colors.success, fontSize: 11, fontWeight: '900', marginLeft: 8 },
  negativePoints: { color: colors.warning },
  empty: { color: colors.textMuted, fontSize: 12, paddingVertical: 17 },
  errorBox: { borderRadius: 11, padding: 12, backgroundColor: colors.dangerLight, marginBottom: 16 },
  errorText: { color: colors.danger, fontSize: 11 },
  retry: { color: colors.primary, fontSize: 11, fontWeight: '900', marginTop: 7 },
  loadMore: { padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: colors.primarySubtle, marginTop: 12 },
  loadMoreText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
});
