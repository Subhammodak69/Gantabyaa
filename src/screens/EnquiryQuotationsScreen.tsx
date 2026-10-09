import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {BookingTravellerInput, Quotation} from '../api/types';
import {acceptQuotation, fetchEnquiryQuotations, rejectQuotation} from '../api/tourApi';
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
  const [action, setAction] = useState<{type: 'accept' | 'reject'; quotation: Quotation} | null>(null);
  const [travellers, setTravellers] = useState<BookingTravellerInput[]>([{full_name: '', gender: '', date_of_birth: '', mobile: '', email: '', relationship_to_customer: '', is_primary: true}]);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  const resetActionForm = () => {
    setAction(null);
    setTravellers([{full_name: '', gender: '', date_of_birth: '', mobile: '', email: '', relationship_to_customer: '', is_primary: true}]);
    setRejectReason('');
    setActionError('');
  };

  const closeAction = () => {
    if (actionLoading) return;
    resetActionForm();
  };

  const openAccept = (quotation: Quotation) => {
    setTravellers([{full_name: '', gender: '', date_of_birth: '', mobile: '', email: '', relationship_to_customer: 'Self', is_primary: true}]);
    setActionError('');
    setAction({type: 'accept', quotation});
  };

  const openReject = (quotation: Quotation) => {
    setRejectReason('');
    setActionError('');
    setAction({type: 'reject', quotation});
  };

  const updateTraveller = (index: number, field: keyof BookingTravellerInput, value: string) => {
    setTravellers(current => current.map((traveller, travellerIndex) => travellerIndex === index ? {...traveller, [field]: value} : traveller));
  };

  const addTraveller = () => {
    setTravellers(current => [...current, {full_name: '', gender: '', date_of_birth: '', mobile: '', email: '', relationship_to_customer: '', is_primary: false}]);
  };

  const removeTraveller = (index: number) => {
    setTravellers(current => current.length === 1 ? current : current.filter((_, travellerIndex) => travellerIndex !== index).map((traveller, travellerIndex) => ({...traveller, is_primary: travellerIndex === 0})));
  };

  const submitAction = async () => {
    if (!action) return;
    setActionError('');
    if (action.type === 'accept') {
      const cleanedTravellers = travellers.map((traveller, index) => ({
        ...traveller,
        full_name: traveller.full_name.trim(),
        gender: traveller.gender?.trim() || undefined,
        date_of_birth: traveller.date_of_birth || undefined,
        mobile: traveller.mobile?.trim() || undefined,
        email: traveller.email?.trim() || undefined,
        relationship_to_customer: traveller.relationship_to_customer?.trim() || undefined,
        is_primary: index === 0,
      }));
      if (cleanedTravellers.some(traveller => !traveller.full_name)) {
        setActionError('Enter the full name for every traveller.');
        return;
      }
      setActionLoading(true);
      try {
        await acceptQuotation(action.quotation.id, cleanedTravellers);
        setActionLoading(false);
        resetActionForm();
        Alert.alert('Quotation accepted', 'Your booking has been created successfully.');
        await loadQuotations();
      } catch (submitError) {
        setActionError(submitError instanceof Error ? submitError.message : 'Could not accept this quotation.');
      } finally {
        setActionLoading(false);
      }
      return;
    }

    const reason = rejectReason.trim();
    if (!reason) {
      setActionError('Please tell us why you are declining this quotation.');
      return;
    }
    setActionLoading(true);
    try {
      await rejectQuotation(action.quotation.id, reason);
      setActionLoading(false);
      resetActionForm();
      Alert.alert('Quotation declined', 'The travel team has been notified.');
      await loadQuotations();
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : 'Could not reject this quotation.');
    } finally {
      setActionLoading(false);
    }
  };

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
          {['SENT', 'VIEWED'].includes(String(quotation.status || '').toUpperCase()) ? (
            <View style={styles.actionButtons}>
              <Pressable style={styles.rejectButton} onPress={() => openReject(quotation)} disabled={actionLoading}><Feather name="x-circle" size={16} color={colors.danger} /><Text style={styles.rejectButtonText}>Decline</Text></Pressable>
              <Pressable style={styles.acceptButton} onPress={() => openAccept(quotation)} disabled={actionLoading}><Feather name="check-circle" size={16} color={colors.textLight} /><Text style={styles.acceptButtonText}>Accept quotation</Text></Pressable>
            </View>
          ) : null}
          {quotation.important_notes ? <Text style={styles.notes}>{quotation.important_notes}</Text> : null}
        </View>
      ))}

      <Modal visible={Boolean(action)} transparent animationType="slide" onRequestClose={closeAction}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeading}>
                <Text style={styles.modalEyebrow}>{action?.quotation.quotation_code || 'QUOTATION'}</Text>
                <Text style={styles.modalTitle}>{action?.type === 'accept' ? 'Accept quotation' : 'Decline quotation'}</Text>
                <Text style={styles.modalSubtitle}>{action?.type === 'accept' ? 'Add the traveller names needed to create your booking.' : 'Your feedback will be shared with the travel team.'}</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={closeAction} disabled={actionLoading}><Feather name="x" size={19} color={colors.textSecondary} /></Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {action?.type === 'accept' ? (
                <>
                  {travellers.map((traveller, index) => (
                    <View key={`traveller-${index}`} style={styles.travellerCard}>
                      <View style={styles.travellerHeader}><Text style={styles.travellerTitle}>Traveller {index + 1}{index === 0 ? ' · Primary' : ''}</Text>{travellers.length > 1 ? <Pressable onPress={() => removeTraveller(index)}><Text style={styles.removeText}>Remove</Text></Pressable> : null}</View>
                      <TextInput value={traveller.full_name} onChangeText={value => updateTraveller(index, 'full_name', value)} placeholder="Full name *" placeholderTextColor={colors.textMuted} style={styles.input} autoCapitalize="words" />
                      <View style={styles.inputRow}><TextInput value={traveller.gender} onChangeText={value => updateTraveller(index, 'gender', value)} placeholder="Gender" placeholderTextColor={colors.textMuted} style={[styles.input, styles.halfInput]} /><TextInput value={traveller.date_of_birth} onChangeText={value => updateTraveller(index, 'date_of_birth', value)} placeholder="Date of birth (YYYY-MM-DD)" placeholderTextColor={colors.textMuted} style={[styles.input, styles.halfInput]} /></View>
                      <View style={styles.inputRow}><TextInput value={traveller.mobile} onChangeText={value => updateTraveller(index, 'mobile', value)} placeholder="Mobile" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" style={[styles.input, styles.halfInput]} /><TextInput value={traveller.email} onChangeText={value => updateTraveller(index, 'email', value)} placeholder="Email" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" style={[styles.input, styles.halfInput]} /></View>
                      <TextInput value={traveller.relationship_to_customer} onChangeText={value => updateTraveller(index, 'relationship_to_customer', value)} placeholder={index === 0 ? 'Relationship (e.g. Self)' : 'Relationship'} placeholderTextColor={colors.textMuted} style={styles.input} />
                    </View>
                  ))}
                  <Pressable style={styles.addTravellerButton} onPress={addTraveller}><Feather name="plus" size={16} color={colors.primary} /><Text style={styles.addTravellerText}>Add another traveller</Text></Pressable>
                </>
              ) : (
                <View><Text style={styles.fieldLabel}>Reason for declining *</Text><TextInput value={rejectReason} onChangeText={setRejectReason} placeholder="Tell us what needs to change..." placeholderTextColor={colors.textMuted} style={[styles.input, styles.reasonInput]} multiline textAlignVertical="top" maxLength={2000} /><Text style={styles.characterCount}>{rejectReason.length}/2000</Text></View>
              )}
              {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}
            </ScrollView>
            <View style={styles.modalActions}><Pressable style={styles.cancelButton} onPress={closeAction} disabled={actionLoading}><Text style={styles.cancelButtonText}>Cancel</Text></Pressable><Pressable style={[styles.submitButton, action?.type === 'reject' && styles.submitRejectButton]} onPress={submitAction} disabled={actionLoading}><Text style={styles.submitButtonText}>{actionLoading ? 'Submitting…' : action?.type === 'accept' ? 'Accept & create booking' : 'Decline quotation'}</Text></Pressable></View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  actionButtons: {flexDirection: 'row', gap: 9, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 12},
  rejectButton: {flex: 1, minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 10},
  rejectButtonText: {fontSize: 12, fontWeight: '900', color: colors.danger},
  acceptButton: {flex: 1, minHeight: 44, borderRadius: 11, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 10},
  acceptButtonText: {fontSize: 12, fontWeight: '900', color: colors.textLight},
  modalOverlay: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.58)'},
  modalCard: {maxHeight: '92%', backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18},
  modalHeader: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 15},
  modalHeading: {flex: 1},
  modalEyebrow: {fontSize: 10, fontWeight: '900', letterSpacing: 0.8, color: colors.primary},
  modalTitle: {fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 3},
  modalSubtitle: {fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 5},
  modalClose: {width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center'},
  travellerCard: {borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, marginBottom: 11, backgroundColor: colors.surface},
  travellerHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9},
  travellerTitle: {fontSize: 13, fontWeight: '900', color: colors.text},
  removeText: {fontSize: 11, fontWeight: '900', color: colors.danger},
  input: {minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, color: colors.text, backgroundColor: colors.card, fontSize: 12, marginBottom: 9},
  inputRow: {flexDirection: 'row', gap: 9},
  halfInput: {flex: 1},
  addTravellerButton: {flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, marginBottom: 7},
  addTravellerText: {fontSize: 12, fontWeight: '900', color: colors.primary},
  fieldLabel: {fontSize: 11, fontWeight: '900', color: colors.textSecondary, marginBottom: 7},
  reasonInput: {minHeight: 125, paddingTop: 12, marginBottom: 2},
  characterCount: {fontSize: 10, color: colors.textMuted, textAlign: 'right', marginBottom: 8},
  actionError: {fontSize: 12, lineHeight: 18, color: colors.danger, backgroundColor: colors.dangerLight, borderRadius: 10, padding: 10, marginTop: 4},
  modalActions: {flexDirection: 'row', gap: 9, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 13, marginTop: 10},
  cancelButton: {flex: 1, minHeight: 46, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'},
  cancelButtonText: {fontSize: 12, fontWeight: '900', color: colors.textSecondary},
  submitButton: {flex: 1.35, minHeight: 46, borderRadius: 11, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8},
  submitRejectButton: {backgroundColor: colors.danger},
  submitButtonText: {fontSize: 12, fontWeight: '900', color: colors.textLight, textAlign: 'center'},
  notes: {fontSize: 11, lineHeight: 17, color: colors.textSecondary, marginTop: 12},
});
