import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { fetchAccountPoints, fetchPublicRanking } from '../api/tourApi';
import { PointsCustomer, PointsPagination } from '../api/types';
import { AppColors, useTheme } from '../theme/theme';

const PAGE_SIZE = 10;

export const RankingScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [customers, setCustomers] = useState<PointsCustomer[]>([]);
  const [pagination, setPagination] = useState<PointsPagination | undefined>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [locating, setLocating] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [error, setError] = useState('');
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  const loadRanking = useCallback(async (nextPage = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    else if (nextPage > 1) setLoadingMore(true);
    else setLoading(true);
    if (nextPage === 1) setMyRank(null);
    setError('');
    try {
      const response = await fetchPublicRanking(nextPage, PAGE_SIZE);
      if (!Array.isArray(response.data)) throw new Error(response.message || 'Leaderboard could not be loaded.');
      setCustomers(current => nextPage === 1 ? response.data! : [...current, ...response.data!]);
      setPagination(response.pagination);
      setPage(nextPage);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Leaderboard could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  const showMyPosition = async () => {
    setLocating(true);
    setError('');
    try {
      const accountResponse = await fetchAccountPoints(1, 1);
      const rank = Number(accountResponse.data?.rank);
      if (!accountResponse.data || !Number.isInteger(rank) || rank < 1) {
        throw new Error(accountResponse.message || 'Your leaderboard position could not be found.');
      }

      const targetPage = Math.ceil(rank / PAGE_SIZE);
      const rankingResponse = await fetchPublicRanking(targetPage, PAGE_SIZE);
      const pageCustomers = rankingResponse.data;
      if (!Array.isArray(pageCustomers)) {
        throw new Error(rankingResponse.message || 'Your leaderboard position could not be loaded.');
      }
      if (!pageCustomers.some(customer => Number(customer.rank) === rank)) {
        throw new Error('Your position is not available on the public leaderboard yet.');
      }

      setCustomers(pageCustomers);
      setPagination(rankingResponse.pagination);
      setPage(targetPage);
      setMyRank(rank);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Your leaderboard position could not be loaded.');
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => { loadRanking(); }, [loadRanking]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton} onPress={onBack}>
          <Feather name="arrow-left" size={21} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Public leaderboard</Text>
          <Text style={styles.headerSubtitle}>Celebrating our traveling community</Text>
        </View>
      </View>
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRanking(1, true)} colors={[colors.primary]} />}>
        <View style={styles.hero}>
          <Feather name="award" size={27} color={colors.gold} />
          <Text style={styles.heroTitle}>Every journey earns a place.</Text>
          <Text style={styles.heroSubtitle}>See how Gantabyaa travelers rank by points.</Text>
          <Pressable style={styles.myPositionButton} disabled={locating || loading} onPress={showMyPosition}>
            <Feather name={locating ? 'loader' : 'crosshair'} size={15} color={colors.primaryDark} />
            <Text style={styles.myPositionButtonText}>{locating ? 'Finding your position…' : 'Show my position'}</Text>
          </Pressable>
        </View>
        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => loadRanking()}><Text style={styles.retry}>Retry</Text></Pressable></View>}
        {loading && customers.length === 0 ? <Text style={styles.empty}>Loading leaderboard…</Text> : customers.length ? customers.map((customer, index) => (
          <View
            key={`${customer.rank}-${customer.customer_name}-${index}`}
            style={[styles.row, Number(customer.rank) === myRank && styles.myPositionRow]}
            onLayout={event => {
              if (Number(customer.rank) === myRank) {
                scrollRef.current?.scrollTo({ y: Math.max(0, event.nativeEvent.layout.y - 12), animated: true });
              }
            }}
          >
            <View style={[styles.rankBadge, customer.rank <= 3 && styles.topRank]}><Text style={[styles.rankText, customer.rank <= 3 && styles.topRankText]}>{customer.rank}</Text></View>
            {customer.customer_profile_picture
              ? <Image source={{ uri: customer.customer_profile_picture }} style={styles.avatar} />
              : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.initial}>{customer.customer_name?.charAt(0)?.toUpperCase() || '?'}</Text></View>}
            <View style={styles.customerCopy}><Text style={styles.name} numberOfLines={1}>{customer.customer_name || 'Traveler'}{Number(customer.rank) === myRank ? ' · YOU' : ''}</Text><Text style={styles.joined}>Traveler since {formatDate(customer.customer_joined_at)}</Text></View>
            <View style={styles.points}><Text style={styles.pointsValue}>{Number(customer.point_balance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text><Text style={styles.pointsLabel}>POINTS</Text></View>
          </View>
        )) : !error ? <Text style={styles.empty}>No rankings to show right now.</Text> : null}
        {!!pagination?.has_next && (
          <Pressable style={styles.loadMore} disabled={loadingMore} onPress={() => loadRanking(page + 1)}>
            <Text style={styles.loadMoreText}>{loadingMore ? 'Loading…' : 'Load more travelers'}</Text>
          </Pressable>
        )}
        {pagination && <Text style={styles.paginationNote}>Showing {customers.length} of {pagination.total_items} travelers</Text>}
      </ScrollView>
    </View>
  );
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

const makeStyles = (colors: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  backButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, marginRight: 11 },
  headerCopy: { flex: 1 },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  headerSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  hero: { padding: 19, backgroundColor: colors.primaryDark, borderRadius: 17, marginBottom: 16 },
  heroTitle: { fontSize: 19, fontWeight: '900', color: colors.textLight, marginTop: 12 },
  heroSubtitle: { fontSize: 11, lineHeight: 17, color: colors.textSecondary, marginTop: 5 },
  myPositionButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.textLight, marginTop: 14 },
  myPositionButtonText: { color: colors.primaryDark, fontSize: 11, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 8 },
  myPositionRow: { backgroundColor: colors.primarySubtle, borderColor: colors.primary, borderWidth: 2 },
  rankBadge: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: colors.surface, marginRight: 9 },
  topRank: { backgroundColor: colors.goldLight },
  rankText: { fontSize: 11, fontWeight: '900', color: colors.textSecondary },
  topRankText: { color: colors.goldDark },
  avatar: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  avatarFallback: { backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  customerCopy: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 12, fontWeight: '800' },
  joined: { color: colors.textMuted, fontSize: 9, marginTop: 4 },
  points: { alignItems: 'flex-end', marginLeft: 6 },
  pointsValue: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  pointsLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '800', letterSpacing: 0.7, marginTop: 2 },
  empty: { color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 24 },
  errorBox: { borderRadius: 11, padding: 12, backgroundColor: colors.dangerLight, marginBottom: 12 },
  errorText: { color: colors.danger, fontSize: 11 },
  retry: { color: colors.primary, fontSize: 11, fontWeight: '900', marginTop: 7 },
  loadMore: { padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: colors.primarySubtle, marginTop: 12 },
  loadMoreText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  paginationNote: { color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 10 },
});
