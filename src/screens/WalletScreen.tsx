import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from '../components/ScrollView';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchTransactions, fetchWalletBalance } from '../api/tourApi';
import { FinancialTransaction, WalletBalance } from '../api/types';
import { AppColors, useTheme } from '../theme/theme';

const PAGE_SIZE = 20;
type TransactionFilter = 'ALL' | 'CREDIT' | 'DEBIT';

function formatDate(value?: string | null): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatAmount(value: string | number, currency = 'INR'): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${currency} ${value || '0'}`;
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
}

function isIncoming(transaction: FinancialTransaction): boolean {
  const type = String(transaction.transaction_type || '').toUpperCase();
  return ['CREDIT', 'REFUND', 'REWARD', 'DEPOSIT', 'CASHBACK'].some(value => type.includes(value));
}

function statusTone(status?: string): 'success' | 'pending' | 'failed' {
  const value = String(status || 'PENDING').toUpperCase();
  if (['SUCCESS', 'COMPLETED', 'PAID', 'SETTLED'].includes(value)) return 'success';
  if (['FAILED', 'CANCELLED', 'REJECTED'].includes(value)) return 'failed';
  return 'pending';
}

export const WalletScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<TransactionFilter>('ALL');
  const [query, setQuery] = useState('');

  const loadWallet = useCallback(async (nextPage = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    else if (nextPage > 1) setLoadingMore(true);
    else setLoading(true);
    setError('');

    const [balanceResult, transactionResult] = await Promise.allSettled([
      fetchWalletBalance(),
      fetchTransactions(nextPage, PAGE_SIZE),
    ]);

    if (balanceResult.status === 'fulfilled') setBalance(balanceResult.value);
    if (transactionResult.status === 'fulfilled') {
      const result = transactionResult.value;
      setTransactions(current => nextPage === 1 ? result.items : [...current, ...result.items]);
      setPage(nextPage);
      setHasNext(result.pagination?.has_next ?? result.items.length === PAGE_SIZE);
    } else {
      setError(transactionResult.reason instanceof Error ? transactionResult.reason.message : 'Could not load wallet transactions.');
      if (nextPage === 1) setTransactions([]);
    }
    if (balanceResult.status === 'rejected') {
      setError(balanceResult.reason instanceof Error ? balanceResult.reason.message : 'Could not load wallet balance.');
    }
    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadWallet(); }, [loadWallet]);

  const visibleTransactions = useMemo(() => {
    const search = query.trim().toLowerCase();
    return transactions.filter(transaction => {
      const incoming = isIncoming(transaction);
      const matchesType = filter === 'ALL' || (filter === 'CREDIT' ? incoming : !incoming);
      const searchable = [transaction.description, transaction.category, transaction.transaction_type, transaction.reference, transaction.booking_code, transaction.payment_method, transaction.status].filter(Boolean).join(' ').toLowerCase();
      return matchesType && (!search || searchable.includes(search));
    });
  }, [transactions, filter, query]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton} onPress={onBack}><Feather name="arrow-left" size={21} color={colors.text} /></Pressable>
        <View style={styles.headerCopy}><Text style={styles.headerTitle}>Wallet</Text><Text style={styles.headerSubtitle}>Balance &amp; transaction history</Text></View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadWallet(1, true)} colors={[colors.primary]} />}
      >
        <View style={styles.balanceCard}>
          <View style={styles.balanceTop}><View><Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text><Text style={styles.balanceValue}>{balance ? formatAmount(balance.balance, balance.currency) : loading ? 'Loading…' : 'Not available'}</Text></View><View style={styles.balanceIcon}><MaterialCommunityIcons name="wallet-outline" size={24} color="#FFFFFF" /></View></View>
          {!!balance?.account_id && <Text style={styles.accountId}>Account · {balance.account_id.slice(0, 8)}</Text>}
          <View style={styles.balanceFoot}><Feather name="shield" size={12} color="rgba(255,255,255,0.7)" /><Text style={styles.balanceFootText}>Secure wallet ledger</Text></View>
        </View>

        <View style={styles.ledgerHeading}><View><Text style={styles.eyebrow}>ACCOUNT ACTIVITY</Text><Text style={styles.sectionTitle}>Payment history</Text></View><Text style={styles.transactionCount}>{transactions.length} shown</Text></View>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search transactions" placeholderTextColor={colors.textMuted} style={styles.search} />
        <View style={styles.filters}>
          {([{ value: 'ALL', label: 'All' }, { value: 'CREDIT', label: 'Credits' }, { value: 'DEBIT', label: 'Debits' }] as const).map(option => (
            <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: filter === option.value }} onPress={() => setFilter(option.value)} style={[styles.filterButton, filter === option.value && styles.filterButtonActive]}>
              <Text style={[styles.filterText, filter === option.value && styles.filterTextActive]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => loadWallet()}><Text style={styles.retry}>Retry</Text></Pressable></View>}
        {loading ? <View style={styles.loadingBox}><Text style={styles.muted}>Loading transactions...</Text></View> : visibleTransactions.length ? visibleTransactions.map((transaction, index) => {
          const incoming = isIncoming(transaction);
          const tone = statusTone(transaction.status);
          const amount = Math.abs(Number(transaction.amount) || 0);
          return (
            <View style={styles.transactionRow} key={transaction.id || `${transaction.reference}-${index}`}>
              <View style={[styles.transactionIcon, incoming ? styles.creditIcon : styles.debitIcon]}><Feather name={incoming ? 'arrow-down-left' : 'arrow-up-right'} size={18} color={incoming ? colors.success : colors.primary} /></View>
              <View style={styles.transactionCopy}>
                <Text style={styles.transactionTitle} numberOfLines={2}>{transaction.description || transaction.category || transaction.transaction_type || 'Wallet transaction'}</Text>
                <Text style={styles.transactionMeta} numberOfLines={2}>{formatDate(transaction.transaction_date || transaction.created_at)}</Text>
                <View style={styles.metaLine}><Text style={styles.transactionType}>{[transaction.transaction_type, transaction.category].filter(Boolean).join(' · ') || 'Transaction'}</Text><Text style={[styles.status, tone === 'success' ? styles.statusSuccess : tone === 'failed' ? styles.statusFailed : styles.statusPending]}>{transaction.status || 'PENDING'}</Text></View>
                {!!transaction.payment_method && <Text style={styles.transactionMeta}>{String(transaction.payment_method).replace(/[_-]+/g, ' ')}{transaction.booking_code ? ` · ${transaction.booking_code}` : ''}</Text>}
              </View>
              <Text style={[styles.amount, incoming ? styles.amountCredit : styles.amountDebit]}>{incoming ? '+' : '−'}{formatAmount(amount, transaction.currency || 'INR')}</Text>
            </View>
          );
        }) : <View style={styles.empty}><Feather name="activity" size={26} color={colors.textMuted} /><Text style={styles.emptyTitle}>{transactions.length ? 'No matching transactions' : 'No transactions yet'}</Text><Text style={styles.muted}>Wallet payments and adjustments will appear here.</Text></View>}

        {hasNext && !loading && <Pressable style={styles.loadMore} onPress={() => loadWallet(page + 1)} disabled={loadingMore}><Text style={styles.loadMoreText}>{loadingMore ? 'Loading...' : 'Load more transactions'}</Text><Feather name="chevron-down" size={16} color={colors.primary} /></Pressable>}
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: AppColors) => StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.bg},
  header: {minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg},
  backButton: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center'},
  headerCopy: {flex: 1, justifyContent: 'center', marginLeft: 6},
  headerTitle: {color: colors.text, fontSize: 15, fontWeight: '800'},
  headerSubtitle: {color: colors.textMuted, fontSize: 11, marginTop: 2},
  headerSpacer: {width: 40},
  scroll: {flex: 1},
  content: {padding: 16, paddingBottom: 30},
  balanceCard: {padding: 18, borderRadius: 15, backgroundColor: colors.primaryDark},
  balanceTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  balanceLabel: {color: 'rgba(255,255,255,0.68)', fontSize: 9, fontWeight: '900', letterSpacing: 1},
  balanceValue: {color: '#FFFFFF', fontSize: 27, fontWeight: '900', marginTop: 6},
  balanceIcon: {width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.13)'},
  accountId: {color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 8},
  balanceFoot: {flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 15, paddingTop: 11, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)'},
  balanceFootText: {color: 'rgba(255,255,255,0.7)', fontSize: 10},
  ledgerHeading: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 25, marginBottom: 12},
  eyebrow: {color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1},
  sectionTitle: {color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 3},
  transactionCount: {color: colors.textMuted, fontSize: 10, fontWeight: '700'},
  search: {height: 43, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, color: colors.text, fontSize: 13},
  filters: {flexDirection: 'row', gap: 8, marginVertical: 12},
  filterButton: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card},
  filterButtonActive: {borderColor: colors.primary, backgroundColor: colors.primary},
  filterText: {color: colors.textMuted, fontSize: 11, fontWeight: '700'},
  filterTextActive: {color: '#FFFFFF'},
  transactionRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 14, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card},
  transactionIcon: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
  creditIcon: {backgroundColor: colors.primarySubtle},
  debitIcon: {backgroundColor: colors.surface},
  transactionCopy: {flex: 1, minWidth: 0},
  transactionTitle: {color: colors.text, fontSize: 12, fontWeight: '800'},
  transactionMeta: {color: colors.textMuted, fontSize: 9, marginTop: 4},
  metaLine: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap'},
  transactionType: {color: colors.textMuted, fontSize: 9, fontWeight: '700'},
  status: {overflow: 'hidden', borderRadius: 9, paddingHorizontal: 6, paddingVertical: 2, fontSize: 8, fontWeight: '900'},
  statusSuccess: {color: colors.success, backgroundColor: colors.primarySubtle},
  statusFailed: {color: colors.danger || '#B42318', backgroundColor: colors.surface},
  statusPending: {color: colors.goldDark, backgroundColor: colors.surface},
  amount: {maxWidth: 105, textAlign: 'right', fontSize: 11, fontWeight: '900'},
  amountCredit: {color: colors.success},
  amountDebit: {color: colors.text},
  errorBox: {flexDirection: 'row', justifyContent: 'space-between', gap: 10, padding: 12, borderRadius: 9, backgroundColor: colors.surface},
  errorText: {flex: 1, color: colors.danger || '#B42318', fontSize: 11},
  retry: {color: colors.primary, fontSize: 11, fontWeight: '900'},
  loadingBox: {paddingVertical: 30, alignItems: 'center'},
  muted: {color: colors.textMuted, fontSize: 11, textAlign: 'center'},
  empty: {paddingVertical: 28, alignItems: 'center', gap: 8},
  emptyTitle: {color: colors.text, fontSize: 14, fontWeight: '800'},
  loadMore: {height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14, borderRadius: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card},
  loadMoreText: {color: colors.primary, fontSize: 11, fontWeight: '800'},
});
