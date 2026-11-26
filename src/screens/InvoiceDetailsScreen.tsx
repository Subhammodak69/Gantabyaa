import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from '../components/ScrollView';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Invoice } from '../api/tourApi';
import { useColors, AppColors } from '../theme/theme';

interface Props {
  invoice: Invoice;
  onBack: () => void;
}

const formatDate = (value?: string) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getTransaction = (invoice: Invoice): any => invoice.transaction || invoice;

const DetailItem = ({ label, value, styles }: { label: string; value?: string | number | null; styles: ReturnType<typeof makeStyles> }) => (
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, !value && styles.mutedValue]} numberOfLines={3}>{value || 'Not available'}</Text>
  </View>
);

export const InvoiceDetailsScreen: React.FC<Props> = ({ invoice, onBack }) => {
  const COLORS = useColors();
  const styles = makeStyles(COLORS);
  const transaction = getTransaction(invoice);
  const bookingCode = invoice.booking_code || transaction.booking_code || invoice.invoice_code || 'Booking payment';
  const amount = Number(invoice.amount ?? transaction.amount ?? 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack} hitSlop={8}>
          <Feather name="arrow-left" size={20} color={COLORS.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>PAYMENT DETAILS</Text>
          <Text style={styles.title}>Invoice details</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{bookingCode}</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}><MaterialCommunityIcons name="receipt-text-outline" size={28} color={COLORS.primary} /></View>
        <Text style={styles.bookingCode}>{bookingCode}</Text>
        <Text style={styles.description}>{invoice.destination || transaction.description || 'Travel booking payment'}</Text>
        <Text style={styles.amount}>₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
        <View style={[styles.statusPill, String(invoice.status || transaction.status || '').toUpperCase() === 'COMPLETED' && styles.statusPaid]}>
          <Text style={styles.statusText}>{invoice.status || transaction.status || 'PENDING'}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Payment summary</Text>
      <View style={styles.card}>
        <DetailItem label="Transaction type" value={transaction.transaction_type} styles={styles} />
        <DetailItem label="Category" value={transaction.category} styles={styles} />
        <DetailItem label="Payment method" value={transaction.payment_method} styles={styles} />
        <DetailItem label="Currency" value={transaction.currency || invoice.currency || 'INR'} styles={styles} />
        <DetailItem label="Transaction date" value={formatDateTime(transaction.transaction_date)} styles={styles} />
        <DetailItem label="Booking date" value={formatDate(invoice.booking_date || transaction.created_at)} styles={styles} />
      </View>

    </ScrollView>
  );
};

const makeStyles = (COLORS: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: COLORS.text, fontSize: 23, fontWeight: '900', marginTop: 3 },
  subtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  heroCard: { alignItems: 'center', backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 20, borderWidth: 1, marginBottom: 22, padding: 22 },
  heroIcon: { alignItems: 'center', backgroundColor: COLORS.primarySubtle, borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 12, width: 56 },
  bookingCode: { color: COLORS.text, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  description: { color: COLORS.textSecondary, fontSize: 12, marginTop: 5, textAlign: 'center' },
  amount: { color: COLORS.primary, fontSize: 26, fontWeight: '900', marginTop: 15 },
  statusPill: { backgroundColor: COLORS.surface, borderRadius: 20, marginTop: 10, paddingHorizontal: 12, paddingVertical: 6 },
  statusPaid: { backgroundColor: COLORS.successLight },
  statusText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '900', marginBottom: 9, marginLeft: 2, marginTop: 4 },
  card: { backgroundColor: COLORS.card, borderColor: COLORS.border, borderRadius: 16, borderWidth: 1, marginBottom: 20, padding: 14 },
  detailItem: { borderBottomColor: COLORS.border, borderBottomWidth: 1, paddingVertical: 10 },
  detailLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  detailValue: { color: COLORS.text, fontSize: 14, fontWeight: '600', marginTop: 4 },
  mutedValue: { color: COLORS.textMuted, fontWeight: '500' },
});
