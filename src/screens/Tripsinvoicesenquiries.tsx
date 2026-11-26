import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppColors, useColors } from '../theme/theme';
import { EnquiryData } from '../types';
import { addCustomerTourTraveller, deleteCustomerTourTraveller, fetchCustomerTour, fetchCustomerTours, fetchInvoices, updateCustomerTourTraveller, BookingTraveller, BookingTravellerInput, CustomerTour, Invoice } from '../api/tourApi';
import { TripListSkeleton, InvoiceListSkeleton, EnquiryListSkeleton } from '../components/Skeleton';
import { CustomDateField } from '../components/CustomDatePicker';
import { OverflowButton } from '../components/OverflowMenu';

type IconSet = 'feather' | 'mci';

const RowIcon = ({ set, name, size, color }: { set: IconSet; name: string; size: number; color: string }) =>
  set === 'mci'
    ? <MaterialCommunityIcons name={name} size={size} color={color} />
    : <Feather name={name} size={size} color={color} />;

// Format date helper
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return 'Date to be confirmed';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'Date to be confirmed';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return 'Date to be confirmed';
  }
};

const getPaymentStatus = (trip: CustomerTour): string => {
  const explicitStatus = trip.payment_status || trip.paymentStatus;
  if (explicitStatus) {
    return String(explicitStatus)
      .replace(/_/g, '-')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .replace(/(^|-)([a-z])/g, (_, separator, letter) => `${separator}${letter.toUpperCase()}`);
  }

  const total = Number(trip.total_amount || 0);
  const paid = Number(trip.paid_amount || 0);
  const due = Number(trip.due_amount || 0);
  if (paid > 0 && due > 0) return 'Partially-paid';
  if ((total > 0 || paid > 0) && due <= 0) return 'Paid';
  return 'Payment pending';
};

// Small helper for an icon + label + value meta row (used by trips & invoices)
const MetaRow = ({ iconSet, iconName, label, value, COLORS }: { iconSet: IconSet; iconName: string; label: string; value: string; COLORS: AppColors }) => {
  const styles = makeStyles(COLORS);
  return (
    <View style={styles.metaRow}>
      <RowIcon set={iconSet} name={iconName} size={13} color={COLORS.textSecondary} />
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
};

export const MyTripsScreen: React.FC<{ onOpenBooking?: (tour: CustomerTour) => void }> = ({onOpenBooking}) => {
  const COLORS = useColors();
  const styles = makeStyles(COLORS);
  const [trips, setTrips] = useState<CustomerTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTour, setSelectedTour] = useState<CustomerTour | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [travellerModalVisible, setTravellerModalVisible] = useState(false);
  const [editingTraveller, setEditingTraveller] = useState<BookingTraveller | null>(null);
  const [savingTraveller, setSavingTraveller] = useState(false);
  const [travellerForm, setTravellerForm] = useState<BookingTravellerInput>({
    full_name: '', gender: '', date_of_birth: '', mobile: '', email: '', relationship_to_customer: '', is_primary: false,
  });

  const loadTrips = async () => {
    try {
      setLoading(true);
      const result = await fetchCustomerTours();
      setTrips(result.items);
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const openTour = async (tour: CustomerTour) => {
    if (onOpenBooking) { onOpenBooking(tour); return; }
    setSelectedTour(tour);
    setDetailLoading(true);
    try {
      const detail = await fetchCustomerTour(tour.id);
      if (detail) setSelectedTour(detail);
    } catch (error) {
      Alert.alert('Unable to load booking', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setDetailLoading(false);
    }
  };

  const openTravellerForm = (traveller?: BookingTraveller) => {
    setEditingTraveller(traveller || null);
    setTravellerForm({
      full_name: traveller?.full_name || '',
      gender: traveller?.gender || '',
      date_of_birth: traveller?.date_of_birth || '',
      mobile: traveller?.mobile || '',
      email: traveller?.email || '',
      relationship_to_customer: traveller?.relationship_to_customer || '',
      is_primary: Boolean(traveller?.is_primary),
    });
    setTravellerModalVisible(true);
  };

  const saveTraveller = async () => {
    if (!selectedTour || !travellerForm.full_name.trim()) {
      Alert.alert('Name required', 'Enter the traveller’s full name.');
      return;
    }
    setSavingTraveller(true);
    const payload = {
      ...travellerForm,
      full_name: travellerForm.full_name.trim(),
      gender: travellerForm.gender?.trim() || undefined,
      date_of_birth: travellerForm.date_of_birth?.trim() || undefined,
      mobile: travellerForm.mobile?.trim() || undefined,
      email: travellerForm.email?.trim() || undefined,
      relationship_to_customer: travellerForm.relationship_to_customer?.trim() || undefined,
    };
    try {
      if (editingTraveller) {
        await updateCustomerTourTraveller(selectedTour.id, editingTraveller.id, payload);
      } else {
        await addCustomerTourTraveller(selectedTour.id, payload);
      }
      const detail = await fetchCustomerTour(selectedTour.id);
      if (detail) setSelectedTour(detail);
      setTravellerModalVisible(false);
    } catch (error) {
      Alert.alert('Could not save traveller', error instanceof Error ? error.message : 'Please check the details and try again.');
    } finally {
      setSavingTraveller(false);
    }
  };

  const removeTraveller = (traveller: BookingTraveller) => {
    if (!selectedTour) return;
    Alert.alert('Remove traveller?', `Remove ${traveller.full_name} from this booking?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await deleteCustomerTourTraveller(selectedTour.id, traveller.id);
            const detail = await fetchCustomerTour(selectedTour.id);
            if (detail) setSelectedTour(detail);
          } catch (error) {
            Alert.alert('Could not remove traveller', error instanceof Error ? error.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <>
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={trips}
      keyExtractor={(trip, index) => trip.id || String(index)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      ListHeaderComponent={<View><View style={styles.pageTitleRow}><Text style={styles.pageTitle}>My trips</Text><Text style={styles.countPill}>{trips.length}</Text></View><Text style={styles.pageSubtitle}>Your confirmed and upcoming journeys</Text></View>}
      ListEmptyComponent={loading ? <TripListSkeleton /> : <View style={styles.emptyBox}>
        <View style={styles.emptyIconWrap}><MaterialCommunityIcons name="airplane" size={28} color={COLORS.primary} /></View>
        <Text style={styles.emptyTitle}>No trips yet</Text>
        <Text style={styles.message}>Your confirmed and upcoming trips will appear here once a booking is confirmed.</Text>
      </View>}
      renderItem={({ item: trip, index }) => (
        <Pressable style={styles.tripCard} onPress={() => openTour(trip)}>
          <View style={styles.listIndex}><Text style={styles.listIndexText}>{String(index + 1).padStart(2, '0')}</Text></View>
          <View style={styles.listCardBody}>
            <View style={styles.compactTripTop}>
              <View style={styles.tripIdentity}>
                <Text style={styles.tripCode} numberOfLines={1}>{trip.booking_code || 'TRIP-' + String(index + 1)}</Text>
                <Text style={styles.tripDestination} numberOfLines={1}>{trip.destination_name || trip.package?.name || 'Your journey'}</Text>
              </View>
              <Text style={[styles.paymentStatus, getPaymentStatus(trip) === 'Paid' ? styles.paymentPaid : getPaymentStatus(trip).includes('Partially') ? styles.paymentPartial : styles.paymentPending]} numberOfLines={1}>
                {getPaymentStatus(trip)}
              </Text>
            </View>
            <View style={styles.tripDates}>
              <View style={styles.tripDateItem}>
                <Text style={styles.tripDateLabel}>Departure:</Text>
                <Text style={styles.tripDateValue} numberOfLines={1}>{formatDate(trip.departure_date || undefined)}</Text>
              </View>
              <View style={styles.tripDateItem}>
                <Text style={styles.tripDateLabel}>Return:</Text>
                <Text style={styles.tripDateValue} numberOfLines={1}>{formatDate(trip.return_date || undefined)}</Text>
              </View>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color={COLORS.textSecondary} style={styles.tripChevron} />
        </Pressable>
      )}
    />

      <Modal visible={Boolean(selectedTour)} transparent animationType="slide" onRequestClose={() => setSelectedTour(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailModal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}><Text style={styles.modalEyebrow}>BOOKING DETAILS</Text><Text style={styles.modalTitle}>{selectedTour?.booking_code || 'Your booking'}</Text></View>
              <Pressable onPress={() => setSelectedTour(null)} style={styles.closeButton}><Feather name="x" size={20} color={COLORS.text} /></Pressable>
            </View>
            {detailLoading ? <View style={styles.modalLoading}><ActivityIndicator color={COLORS.primary} /><Text style={styles.meta}>Loading booking...</Text></View> : selectedTour ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
                <Text style={styles.detailDestination}>{selectedTour.destination_name || selectedTour.package?.name || 'Your journey'}</Text>
                <Text style={styles.detailSub}>{selectedTour.package?.name || ''}{selectedTour.variant?.name ? ` • ${selectedTour.variant.name}` : ''}</Text>
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}><Text style={styles.detailLabel}>Departure</Text><Text style={styles.detailValue}>{formatDate(selectedTour.departure_date || undefined)}</Text></View>
                  <View style={styles.detailItem}><Text style={styles.detailLabel}>Return</Text><Text style={styles.detailValue}>{formatDate(selectedTour.return_date || undefined)}</Text></View>
                  <View style={styles.detailItem}><Text style={styles.detailLabel}>Total</Text><Text style={styles.detailValue}>₹{selectedTour.total_amount ?? '0'}</Text></View>
                  <View style={styles.detailItem}><Text style={styles.detailLabel}>Due</Text><Text style={styles.detailValue}>₹{selectedTour.due_amount ?? '0'}</Text></View>
                </View>
                <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Travellers</Text><Pressable onPress={() => openTravellerForm()}><Text style={styles.addText}>+ Add traveller</Text></Pressable></View>
                {(selectedTour.travellers || []).length === 0 ? <Text style={styles.meta}>No travellers added yet.</Text> : (selectedTour.travellers || []).map((traveller) => (
                  <View style={styles.travellerRow} key={traveller.id}>
                    <View style={styles.travellerAvatar}><Feather name="user" size={15} color={COLORS.primary} /></View>
                    <View style={{ flex: 1 }}><Text style={styles.travellerName}>{traveller.full_name}{traveller.is_primary ? ' · Primary' : ''}</Text><Text style={styles.meta}>{traveller.email || traveller.mobile || traveller.relationship_to_customer || 'Traveller details'}</Text></View>
                    <Pressable onPress={() => openTravellerForm(traveller)} hitSlop={8}><Feather name="edit-2" size={16} color={COLORS.primary} /></Pressable>
                    <Pressable onPress={() => removeTraveller(traveller)} hitSlop={8} style={{ marginLeft: 14 }}><Feather name="trash-2" size={16} color={COLORS.danger} /></Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={travellerModalVisible} transparent animationType="fade" onRequestClose={() => setTravellerModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <View style={styles.travellerModal}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>{editingTraveller ? 'Edit traveller' : 'Add traveller'}</Text><Pressable onPress={() => setTravellerModalVisible(false)} style={styles.closeButton}><Feather name="x" size={20} color={COLORS.text} /></Pressable></View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {([
                ['full_name', 'Full name', 'Enter full name'],
                ['gender', 'Gender', 'e.g. Male'],
                ['date_of_birth', 'Date of birth', 'YYYY-MM-DD'],
                ['mobile', 'Mobile', 'Mobile number'],
                ['email', 'Email', 'Email address'],
                ['relationship_to_customer', 'Relationship', 'e.g. Spouse'],
              ] as const).map(([key, label, placeholder]) => (
                <View key={key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  {key === 'date_of_birth' ? (
                    <CustomDateField
                      value={travellerForm.date_of_birth}
                      onChange={value => setTravellerForm(current => ({ ...current, date_of_birth: value }))}
                      placeholder="Select date of birth"
                      title="Select date of birth"
                    />
                  ) : (
                    <TextInput value={travellerForm[key]} onChangeText={(value) => setTravellerForm((current) => ({ ...current, [key]: value }))} placeholder={placeholder} placeholderTextColor={COLORS.textMuted} style={styles.input} autoCapitalize={key === 'email' ? 'none' : 'words'} />
                  )}
                </View>
              ))}
              <Pressable style={styles.primaryToggle} onPress={() => setTravellerForm((current) => ({ ...current, is_primary: !current.is_primary }))}><View style={[styles.checkbox, travellerForm.is_primary && styles.checkboxChecked]}>{travellerForm.is_primary ? <Feather name="check" size={13} color={COLORS.textLight} /> : null}</View><Text style={styles.toggleText}>Primary traveller</Text></Pressable>
              <Pressable style={styles.saveButton} onPress={saveTraveller} disabled={savingTraveller}>{savingTraveller ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.saveButtonText}>{editingTraveller ? 'Save changes' : 'Add traveller'}</Text>}</Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

export const BillsInvoicesScreen: React.FC<{ onOpenInvoice?: (invoice: Invoice) => void }> = ({ onOpenInvoice }) => {
  const COLORS = useColors();
  const styles = makeStyles(COLORS);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await fetchInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const visibleInvoices = invoices.filter(invoice => {
    const haystack = `${invoice.invoice_code || ''} ${invoice.destination || ''} ${invoice.status || ''}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={visibleInvoices}
        keyExtractor={(invoice, index) => invoice.id || String(index)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListHeaderComponent={<View>
          <View style={styles.pageTitleRow}><Text style={styles.pageTitle}>Bills & invoices</Text><Text style={styles.countPill}>{invoices.length}</Text></View>
          <Text style={styles.pageSubtitle}>Track payments and booking documents</Text>
          <View style={styles.searchBox}><Feather name="search" size={17} color={COLORS.textMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search invoices..." placeholderTextColor={COLORS.textMuted} style={styles.searchInput} /></View>
        </View>}
        ListEmptyComponent={loading ? <InvoiceListSkeleton /> : <View style={styles.emptyBox}>
          <View style={styles.emptyIconWrap}><MaterialCommunityIcons name="currency-inr" size={28} color={COLORS.primary} /></View>
          <Text style={styles.emptyTitle}>{query ? 'No matching invoices' : 'No invoices yet'}</Text>
          <Text style={styles.message}>Your booking bills and invoices will appear here once a booking is confirmed.</Text>
        </View>}
        renderItem={({ item: invoice, index }) => (
          <Pressable style={styles.invoiceCard} onPress={() => onOpenInvoice?.(invoice)}>
            <View style={styles.listIndex}><Text style={styles.listIndexText}>{String(index + 1).padStart(2, '0')}</Text></View>
            <View style={styles.listCardBody}>
              <View style={styles.invoiceHeader}>
                <Text style={styles.invoiceCode} numberOfLines={1}>{invoice.invoice_code || 'INV-' + String(index + 1)}</Text>
                <Text style={[styles.status, invoice.status?.toUpperCase() === 'PAID' ? styles.statusConfirmed : styles.statusNew]}>{invoice.status || 'PENDING'}</Text>
              </View>
              <Text style={styles.invoiceDestination} numberOfLines={1}>{invoice.destination || 'Travel booking'}</Text>
              <View style={styles.invoiceMeta}>
                <MetaRow iconSet="feather" iconName="calendar" label="Booked:" value={formatDate(invoice.booking_date)} COLORS={COLORS} />
                <MetaRow iconSet="mci" iconName="airplane" label="Travel:" value={formatDate(invoice.travel_date)} COLORS={COLORS} />
              </View>
              <Text style={styles.invoiceAmount}>₹{invoice.amount || 0}</Text>
            </View>
            <OverflowButton colors={COLORS} onPress={() => onOpenInvoice?.(invoice)} />
          </Pressable>
        )}
      />
    </>
  );
};

export const MyEnquiriesScreen: React.FC<{ enquiries: EnquiryData[]; loading?: boolean; onRefresh?: () => void; onViewEnquiry?: (item: EnquiryData) => void }> = ({ enquiries, loading = false, onRefresh, onViewEnquiry }) => {
  const COLORS = useColors();
  const styles = makeStyles(COLORS);
  const [query, setQuery] = useState('');

  const copyReference = (reference: string) => {
    Clipboard.setString(reference);
    Toast.show({ type: 'success', text1: 'Reference copied', text2: 'The enquiry reference ID is ready to paste.', position: 'top' });
  };

  const visibleEnquiries = enquiries.filter(item => `${item.tourTitle || ''} ${item.destination || ''} ${item.fullName || ''} ${item.status || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <>
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={visibleEnquiries}
      keyExtractor={(item, index) => item.id || String(index)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      ListHeaderComponent={<View>
        <View style={styles.pageTitleRow}><Text style={styles.pageTitle}>My enquiries</Text><Text style={styles.countPill}>{enquiries.length}</Text></View>
        <Text style={styles.pageSubtitle}>Follow up on your travel requests</Text>
        <View style={styles.searchBox}><Feather name="search" size={17} color={COLORS.textMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search enquiries..." placeholderTextColor={COLORS.textMuted} style={styles.searchInput} /></View>
      </View>}
      ListEmptyComponent={loading ? <EnquiryListSkeleton /> : <View style={styles.emptyBox}>
        <View style={styles.emptyIconWrap}><Feather name="clipboard" size={26} color={COLORS.primary} /></View>
        <Text style={styles.emptyTitle}>{query ? 'No matching enquiries' : 'No enquiries yet'}</Text>
        <Text style={styles.message}>Your tour enquiries and their latest status will appear here.</Text>
      </View>}
      renderItem={({ item, index }) => (
        <View style={styles.enquiry}>
          <Pressable
            style={styles.enquiryBodyPress}
            onPress={() => onViewEnquiry?.(item)}
            disabled={!onViewEnquiry}
            accessibilityRole="button"
            accessibilityLabel={`View details for ${item.tourTitle || item.destination || 'enquiry'}`}
          >
            <View style={styles.listIndex}><Text style={styles.listIndexText}>{String(index + 1).padStart(2, '0')}</Text></View>
            <View style={styles.listCardBody}>
              <View style={styles.row}><Text style={styles.enquiryTitle} numberOfLines={1} ellipsizeMode="tail">{item.tourTitle || item.destination || 'Custom tour'}</Text><Text style={[styles.status, item.status === 'CONFIRMED' ? styles.statusConfirmed : styles.statusNew]} numberOfLines={1}>{item.status || 'NEW'}</Text></View>
              <View style={styles.enquiryMetaRow}><Feather name="calendar" size={12} color={COLORS.textSecondary} /><Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">{item.travelDate || 'Travel date not selected'}</Text></View>
              {item.message ? <Text style={styles.meta} numberOfLines={1} ellipsizeMode="tail">{item.message}</Text> : null}
              {item.id ? <View style={styles.referenceRow}><Text style={styles.ref} numberOfLines={1} ellipsizeMode="middle">Reference: {item.id}</Text></View> : null}
            </View>
          </Pressable>
          {item.id ? <Pressable style={styles.copyButton} hitSlop={8} onPress={() => copyReference(item.id as string)} accessibilityRole="button" accessibilityLabel="Copy enquiry reference"><Feather name="copy" size={14} color={COLORS.primary} /></Pressable> : null}
        </View>
      )}
    />
    </>
  );
};

const makeStyles = (COLORS: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 30 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 30 },
  icon: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primarySubtle, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 23, fontWeight: '900', color: COLORS.text },
  pageTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  pageTitle: { fontSize: 23, fontWeight: '900', color: COLORS.text },
  pageSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 15 },
  countPill: { minWidth: 38, textAlign: 'center', color: COLORS.primary, backgroundColor: COLORS.primarySubtle, borderRadius: 15, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontWeight: '900' },
  searchBox: { height: 46, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 11, paddingHorizontal: 13, marginBottom: 14 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 13, paddingVertical: 0, marginLeft: 9 },
  message: { fontSize: 13, lineHeight: 20, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
  emptyBox: { backgroundColor: COLORS.card, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, padding: 22, alignItems: 'center', marginTop: 20 },
  emptyIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primarySubtle, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 8 },

  listIndex: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primarySubtle, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  listIndexText: { color: COLORS.primary, fontSize: 11, fontWeight: '900' },
  listCardBody: { flex: 1, minWidth: 0 },
  tripCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 10 },
  compactTripTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  tripIdentity: { flex: 1, minWidth: 0 },
  tripCode: { fontSize: 12, fontWeight: '900', color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.35 },
  tripDestination: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 3 },
  paymentStatus: { maxWidth: 112, fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' },
  paymentPartial: { color: COLORS.goldDark, backgroundColor: COLORS.goldLight },
  paymentPaid: { color: COLORS.success, backgroundColor: COLORS.successLight },
  paymentPending: { color: COLORS.textSecondary, backgroundColor: COLORS.surface },
  tripDates: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 2 },
  tripDateItem: { display:'flex', minWidth: 0, flexDirection: 'row', alignItems: 'flex-start' },
  tripDateLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700' },
  tripDateValue: { fontSize: 10, color: COLORS.text, fontWeight: '800', marginTop: 0 ,marginLeft:2 },
  tripChevron: { marginLeft: 8 },
  viewDetailsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  viewDetails: { fontSize: 12, color: COLORS.primary, fontWeight: '800' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2, 12, 18, 0.58)', justifyContent: 'flex-end' },
  detailModal: { maxHeight: '88%', backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  invoiceDetailModal: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18 },
  travellerModal: { maxHeight: '92%', backgroundColor: COLORS.card, borderRadius: 20, marginHorizontal: 16, marginTop: 16, marginBottom: 0, padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  modalEyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 3 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  modalLoading: { alignItems: 'center', paddingVertical: 35, gap: 10 },
  modalContent: { paddingBottom: 30 },
  detailDestination: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  detailSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 17, marginBottom: 20 },
  detailItem: { width: '48%', backgroundColor: COLORS.surface, borderRadius: 10, padding: 10 },
  detailLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  detailValue: { color: COLORS.text, fontSize: 13, fontWeight: '800', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '900' },
  addText: { color: COLORS.primary, fontSize: 12, fontWeight: '900' },
  travellerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  travellerAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primarySubtle, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  travellerName: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  field: { marginBottom: 11 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', marginBottom: 5 },
  input: { height: 44, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, color: COLORS.text, paddingHorizontal: 12, fontSize: 13, backgroundColor: COLORS.surface },
  primaryToggle: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  checkbox: { width: 21, height: 21, borderWidth: 1, borderColor: COLORS.borderDark, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  saveButton: { height: 46, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: 17, marginBottom: 8 },
  saveButtonText: { color: COLORS.textLight, fontSize: 13, fontWeight: '900' },

  // shared icon + label + value row (trips & invoices)
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  metaLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  metaValue: { fontSize: 12, fontWeight: '800', color: COLORS.text, marginLeft: -2 },

  invoiceCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.card, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, padding: 13, marginBottom: 11 },
  invoiceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  invoiceCode: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  invoiceAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  invoiceAmount: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  invoiceDestination: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  invoiceMeta: { flexDirection: 'column' },

  status: { fontSize: 9, fontWeight: '800', color: COLORS.goldDark, backgroundColor: COLORS.goldLight, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  statusConfirmed: { backgroundColor: COLORS.successLight, color: COLORS.success },
  statusNew: { backgroundColor: COLORS.goldLight, color: COLORS.goldDark },

  enquiry: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 2, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  enquiryBodyPress: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  enquiryTitle: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '800', color: COLORS.text },
  enquiryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  meta: { flex: 1, minWidth: 0, fontSize: 11, color: COLORS.textSecondary },
  referenceRow: { flexDirection: 'row', alignItems: 'center', minWidth: 0, marginTop: 1 },
  ref: { flex: 1, minWidth: 0, fontSize: 10, color: COLORS.textMuted },
  copyButton: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primarySubtle, alignItems: 'center', justifyContent: 'center', marginLeft: 5 },
  multilineInput: { height: 86, paddingTop: 12, textAlignVertical: 'top' },
});
