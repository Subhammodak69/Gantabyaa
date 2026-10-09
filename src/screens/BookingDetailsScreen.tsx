import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {CustomerTour, fetchBookingDocuments, fetchCustomerTour} from '../api/tourApi';
import {AppColors, useColors} from '../theme/theme';
import {TravelDocument} from '../types';
import {showApiError} from '../utils/toast';

interface Props { tour: CustomerTour; onBack?: () => void; onOpenDocument?: (document: TravelDocument) => void; }
const date = (value?: string) => { if (!value) return 'To be confirmed'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'To be confirmed' : parsed.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'}); };

export const BookingDetailsScreen: React.FC<Props> = ({tour: initialTour, onBack, onOpenDocument}) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [tour, setTour] = useState<CustomerTour>(initialTour);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  useEffect(() => {
    let current = true;
    fetchCustomerTour(initialTour.id)
      .then(detail => { if (current && detail) setTour(detail); })
      .catch(error => { if (current) showApiError(error, 'We could not load booking details.'); })
      .finally(() => { if (current) setLoading(false); });
    fetchBookingDocuments(initialTour.id)
      .then(response => {
        if (!current) return;
        setDocuments(Array.isArray(response.data) ? response.data : []);
      })
      .catch(error => { if (current) showApiError(error, 'We could not load booking documents.'); })
      .finally(() => { if (current) setDocumentsLoading(false); });
    return () => { current = false; };
  }, [initialTour.id]);
  return <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.screenHeader}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}><Feather name="arrow-left" size={20} color={colors.text} /></Pressable>
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>TRIP OVERVIEW</Text>
        <Text style={styles.title}>Booking details</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{tour.booking_code || 'Your booking'} · {tour.destination_name || tour.package?.name || 'Your journey'}</Text>
      </View>
      <Text style={styles.status}>{tour.status || 'TENTATIVE'}</Text>
    </View>
    {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>Loading booking details...</Text></View> : <>
      <View style={styles.section}><Text style={styles.sectionTitle}>Journey summary</Text><View style={styles.grid}><Info icon="map-pin" label="Destination" value={tour.destination_name || tour.package?.name || 'Your journey'} styles={styles} colors={colors} /><Info icon="calendar" label="Departure" value={date(tour.departure_date || undefined)} styles={styles} colors={colors} /><Info icon="calendar" label="Return" value={date(tour.return_date || undefined)} styles={styles} colors={colors} /><Info icon="users" label="Travellers" value={`${tour.travellers?.length || 0} person${tour.travellers?.length === 1 ? '' : 's'}`} styles={styles} colors={colors} /></View></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Payment summary</Text><View style={styles.card}><Info icon="credit-card" label="Total amount" value={`₹${tour.total_amount ?? '0'}`} styles={styles} colors={colors} /><Info icon="clock" label="Due amount" value={`₹${tour.due_amount ?? '0'}`} styles={styles} colors={colors} /></View></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Travellers</Text><View style={styles.card}>{(tour.travellers || []).length === 0 ? <Text style={styles.empty}>No travellers added yet.</Text> : (tour.travellers || []).map(traveller => <View style={styles.traveller} key={traveller.id}><View style={styles.avatar}><Feather name="user" size={15} color={colors.primary} /></View><View style={styles.travellerCopy}><Text style={styles.travellerName}>{traveller.full_name}{traveller.is_primary ? ' · Primary' : ''}</Text><Text style={styles.travellerMeta}>{traveller.email || traveller.mobile || traveller.relationship_to_customer || 'Traveller details'}</Text></View></View>)}</View></View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking documents</Text>
        <View style={styles.card}>
          {documentsLoading ? <ActivityIndicator color={colors.primary} style={{paddingVertical: 18}} /> : documents.length === 0 ? <Text style={styles.empty}>No documents are available for this booking yet.</Text> : documents.map(document => (
            <Pressable key={document.id} style={styles.documentRow} onPress={() => onOpenDocument?.(document)}>
              <View style={styles.avatar}><Feather name="file-text" size={15} color={colors.primary} /></View>
              <View style={styles.travellerCopy}>
                <Text style={styles.travellerName} numberOfLines={1}>{document.title || document.file_name || 'Booking document'}</Text>
                <Text style={styles.travellerMeta}>{document.document_type.replace(/_/g, ' ')}{document.uploaded_at ? ` · ${date(document.uploaded_at)}` : ''}</Text>
              </View>
              <Feather name="eye" size={17} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      </View>
    </>}
  </ScrollView>;
};

const Info: React.FC<{icon: string; label: string; value: string; styles: any; colors: AppColors}> = ({icon, label, value, styles, colors}) => <View style={styles.info}><View style={styles.infoIcon}><Feather name={icon} size={15} color={colors.primary} /></View><View style={styles.infoCopy}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue} numberOfLines={2}>{value}</Text></View></View>;
const makeStyles = (colors: AppColors) => StyleSheet.create({container: {flex: 1, backgroundColor: colors.bg}, content: {padding: 16, paddingBottom: 36}, screenHeader: {flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 16, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border}, backButton: {width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12}, headerCopy: {flex: 1, minWidth: 0}, eyebrow: {fontSize: 10, fontWeight: '900', letterSpacing: 1, color: colors.primary}, title: {fontSize: 23, fontWeight: '900', color: colors.text, marginTop: 3}, subtitle: {fontSize: 12, color: colors.textSecondary, marginTop: 4}, status: {fontSize: 10, fontWeight: '900', color: colors.success, backgroundColor: colors.successLight, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, marginLeft: 8}, loading: {alignItems: 'center', paddingVertical: 45}, loadingText: {fontSize: 12, color: colors.textSecondary, marginTop: 10}, section: {marginBottom: 17}, sectionTitle: {fontSize: 12, fontWeight: '900', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8}, grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 9}, card: {backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingHorizontal: 14}, info: {flexDirection: 'row', alignItems: 'center', minHeight: 66, width: '48%'}, cardInfo: {width: '100%', borderBottomWidth: 1, borderBottomColor: colors.border}, infoIcon: {width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center', marginRight: 9}, infoCopy: {flex: 1}, infoLabel: {fontSize: 10, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase'}, infoValue: {fontSize: 13, color: colors.text, fontWeight: '800', marginTop: 4}, traveller: {flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border}, documentRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border}, avatar: {width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center', marginRight: 10}, travellerCopy: {flex: 1}, travellerName: {fontSize: 13, fontWeight: '800', color: colors.text}, travellerMeta: {fontSize: 11, color: colors.textSecondary, marginTop: 3}, empty: {fontSize: 13, color: colors.textSecondary, paddingVertical: 16}});
