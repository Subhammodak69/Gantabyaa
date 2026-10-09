import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {Quotation} from '../api/types';
import {fetchEnquiryQuotations} from '../api/tourApi';
import {EnquiryData} from '../types';
import {useColors} from '../theme/theme';

interface Props {
  enquiry: EnquiryData;
  onBack: () => void;
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
};

const formatAmount = (value?: string | number | null) => {
  if (value === undefined || value === null || value === '') return '—';
  const amount = Number(value);
  return Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN')}` : String(value);
};

export const EnquiryQuotationsScreen: React.FC<Props> = ({enquiry, onBack}) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQuotations = useCallback(async () => {
    if (!enquiry.id) {
      setError('This enquiry does not have an ID, so its quotations cannot be loaded.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const results = await fetchEnquiryQuotations(enquiry.id);
      setQuotations(results);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load quotations.');
    } finally {
      setLoading(false);
    }
  }, [enquiry.id]);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>ENQUIRY QUOTATIONS</Text>
          <Text style={styles.title}>Your quotations</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {enquiry.tourTitle || enquiry.destination || 'Review the travel options shared for your enquiry.'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading quotations…</Text>
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Feather name="alert-circle" size={36} color={colors.danger} />
          <Text style={styles.stateTitle}>Could not load quotations</Text>
          <Text style={styles.stateText}>{error}</Text>
          {enquiry.id ? <Pressable style={styles.retryButton} onPress={loadQuotations}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable> : null}
        </View>
      ) : quotations.length === 0 ? (
        <View style={styles.state}>
          <Feather name="file-text" size={36} color={colors.textMuted} />
          <Text style={styles.stateTitle}>No quotations yet</Text>
          <Text style={styles.stateText}>Quotations shared for this enquiry will appear here.</Text>
        </View>
      ) : quotations.map(quotation => (
        <View key={quotation.id} style={styles.quotationCard}>
          <View style={styles.quotationHeader}>
            <View style={styles.quotationHeading}>
              <Text style={styles.quotationCode}>{quotation.quotation_code || 'Quotation'}</Text>
              <Text style={styles.tourName}>{quotation.tour_name || 'Travel quotation'}</Text>
            </View>
            <Text style={styles.status}>{String(quotation.status || 'PENDING').replace(/_/g, ' ')}</Text>
          </View>

          <View style={styles.dateRow}>
            <Feather name="calendar" size={14} color={colors.primary} />
            <Text style={styles.dateText}>
              {formatDate(quotation.travel_date)}{quotation.return_date ? ` – ${formatDate(quotation.return_date)}` : ''}
            </Text>
          </View>

          {quotation.items?.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemCopy}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.description ? <Text style={styles.itemDescription}>{item.description}</Text> : null}
                {item.quantity != null ? <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text> : null}
              </View>
              <Text style={styles.itemPrice}>{formatAmount(item.total_price ?? item.unit_price)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <View>
              <Text style={styles.validUntil}>Valid until {formatDate(quotation.valid_until)}</Text>
              {quotation.version ? <Text style={styles.version}>Version {quotation.version}</Text> : null}
            </View>
            <View style={styles.totalCopy}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{formatAmount(quotation.total_amount)}</Text>
            </View>
          </View>
          {quotation.important_notes ? <Text style={styles.notes}>{quotation.important_notes}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
};

const makeStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {padding: 16, paddingBottom: 36},
  header: {flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 16, marginBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.border},
  backButton: {width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12},
  headerCopy: {flex: 1, minWidth: 0},
  eyebrow: {fontSize: 10, fontWeight: '900', letterSpacing: 1, color: colors.primary},
  title: {fontSize: 23, fontWeight: '900', color: colors.text, marginTop: 3},
  subtitle: {fontSize: 12, color: colors.textSecondary, marginTop: 4},
  state: {minHeight: 220, alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border},
  stateTitle: {fontSize: 16, fontWeight: '900', color: colors.text, marginTop: 12, textAlign: 'center'},
  stateText: {fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 8, textAlign: 'center'},
  retryButton: {marginTop: 14, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary},
  retryText: {fontSize: 12, fontWeight: '900', color: colors.textLight},
  quotationCard: {padding: 15, marginBottom: 13, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border},
  quotationHeader: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border},
  quotationHeading: {flex: 1},
  quotationCode: {fontSize: 10, fontWeight: '900', letterSpacing: 0.7, color: colors.primary},
  tourName: {fontSize: 16, fontWeight: '900', color: colors.text, marginTop: 4},
  status: {fontSize: 9, fontWeight: '900', color: colors.primary, backgroundColor: colors.primarySubtle, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, overflow: 'hidden'},
  dateRow: {flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 12},
  dateText: {fontSize: 11, color: colors.textSecondary},
  itemRow: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border},
  itemCopy: {flex: 1},
  itemName: {fontSize: 12, fontWeight: '800', color: colors.text},
  itemDescription: {fontSize: 10, color: colors.textSecondary, marginTop: 3},
  itemQuantity: {fontSize: 10, color: colors.textMuted, marginTop: 3},
  itemPrice: {fontSize: 12, fontWeight: '800', color: colors.text},
  totalRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 3},
  validUntil: {fontSize: 10, color: colors.textMuted},
  version: {fontSize: 10, color: colors.textMuted, marginTop: 3},
  totalCopy: {alignItems: 'flex-end'},
  totalLabel: {fontSize: 9, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase'},
  totalAmount: {fontSize: 18, fontWeight: '900', color: colors.primary, marginTop: 2},
  notes: {fontSize: 11, lineHeight: 17, color: colors.textSecondary, marginTop: 12},
});
