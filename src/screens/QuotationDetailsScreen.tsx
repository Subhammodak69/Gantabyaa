import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {Quotation} from '../api/types';
import {AppColors, useColors} from '../theme/theme';

interface Props {
  quotation: Quotation;
  onBack: () => void;
}

const formatDate = (value?: string | null): string => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
};

const formatAmount = (value?: string | number | null): string => {
  if (value === undefined || value === null || value === '') return '—';
  const amount = Number(value);
  return Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN')}` : String(value);
};

const displayValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

export const QuotationDetailsScreen: React.FC<Props> = ({quotation, onBack}) => {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to quotations">
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>QUOTATION DETAILS</Text>
          <Text style={styles.title}>{quotation.quotation_code || 'Quotation'}</Text>
          <Text style={styles.subtitle}>{quotation.tour_name || 'Travel quotation'}</Text>
        </View>
        <Text style={styles.status}>{String(quotation.status || 'PENDING').replace(/_/g, ' ')}</Text>
      </View>

      <Section title="Trip details" styles={styles}>
        <Detail label="Travel date" value={formatDate(quotation.travel_date)} styles={styles} />
        <Detail label="Return date" value={formatDate(quotation.return_date)} styles={styles} />
        <Detail label="Valid until" value={formatDate(quotation.valid_until)} styles={styles} />
        <Detail label="Version" value={quotation.version} styles={styles} />
        <Detail label="Package" value={quotation.package?.name} styles={styles} />
        <Detail label="Package variant" value={[quotation.variant?.name, quotation.variant?.season_name].filter(Boolean).join(' · ')} styles={styles} />
        <Detail label="Destination" value={quotation.destination?.name} styles={styles} />
      </Section>

      <Section title="Customer" styles={styles}>
        <Detail label="Name" value={quotation.customer?.name} styles={styles} />
        <Detail label="Mobile" value={quotation.customer?.mobile} styles={styles} />
        <Detail label="Email" value={quotation.customer?.email} styles={styles} />
      </Section>

      <Section title="Price summary" styles={styles}>
        <Detail label="Subtotal" value={formatAmount(quotation.subtotal)} styles={styles} />
        <Detail label="Discount" value={formatAmount(quotation.discount_amount)} styles={styles} />
        <Detail label="Tax" value={formatAmount(quotation.tax_amount)} styles={styles} />
        <Detail label="Total" value={formatAmount(quotation.total_amount)} styles={styles} />
      </Section>

      <Section title="Quotation items" styles={styles}>
        {quotation.items?.length ? quotation.items.map((item, index) => (
          <View key={item.id || index} style={styles.record}>
            <Text style={styles.recordTitle}>{item.name || 'Quotation item'}</Text>
            <Detail label="Type" value={item.item_type} styles={styles} />
            <Detail label="Description" value={item.description} styles={styles} />
            <Detail label="Quantity" value={item.quantity} styles={styles} />
            <Detail label="Unit price" value={formatAmount(item.unit_price)} styles={styles} />
            <Detail label="Total price" value={formatAmount(item.total_price)} styles={styles} />
          </View>
        )) : <Text style={styles.emptyText}>No quotation items provided.</Text>}
      </Section>

      <Section title="Accommodation" styles={styles}>
        {quotation.hotels?.length ? quotation.hotels.map((hotel, index) => (
          <View key={hotel.id || index} style={styles.record}>
            <Text style={styles.recordTitle}>{displayValue(hotel.hotel_name)}</Text>
            <Detail label="Place" value={hotel.place} styles={styles} />
            <Detail label="Address" value={hotel.address} styles={styles} />
            <Detail label="Check in" value={formatDate(hotel.check_in)} styles={styles} />
            <Detail label="Check out" value={formatDate(hotel.check_out)} styles={styles} />
            <Detail label="Nights" value={hotel.nights} styles={styles} />
            <Detail label="Rooms" value={hotel.room_count} styles={styles} />
            <Detail label="Room type" value={hotel.room_type} styles={styles} />
            <Detail label="Paid by traveller" value={hotel.paid_by_traveller} styles={styles} />
          </View>
        )) : <Text style={styles.emptyText}>No accommodation details provided.</Text>}
      </Section>

      <Section title="Transport" styles={styles}>
        {quotation.vehicles?.length ? quotation.vehicles.map((vehicle, index) => (
          <View key={vehicle.id || index} style={styles.record}>
            <Text style={styles.recordTitle}>{displayValue(vehicle.vehicle_name)}</Text>
            <Detail label="Vehicle type" value={vehicle.vehicle_type} styles={styles} />
            <Detail label="Quantity" value={vehicle.quantity} styles={styles} />
            <Detail label="Start" value={formatDate(vehicle.start_date)} styles={styles} />
            <Detail label="End" value={formatDate(vehicle.end_date)} styles={styles} />
            <Detail label="Pickup" value={vehicle.pickup_location} styles={styles} />
            <Detail label="Drop off" value={vehicle.drop_location} styles={styles} />
            <Detail label="Registration" value={vehicle.registration_number} styles={styles} />
            <Detail label="Paid by traveller" value={vehicle.paid_by_traveller} styles={styles} />
          </View>
        )) : <Text style={styles.emptyText}>No transport details provided.</Text>}
      </Section>

      <Section title="Day-by-day itinerary" styles={styles}>
        {quotation.itinerary?.length ? quotation.itinerary.map((day, index) => (
          <View key={day.id || index} style={styles.record}>
            <Text style={styles.recordTitle}>Day {day.day_number || index + 1}: {day.title}</Text>
            <Detail label="Date" value={formatDate(day.date)} styles={styles} />
            <Detail label="Overnight location" value={day.overnight_location} styles={styles} />
            <Detail label="Meal plan" value={day.meal_plan} styles={styles} />
            {day.description ? <Text style={styles.description}>{day.description}</Text> : null}
          </View>
        )) : <Text style={styles.emptyText}>No itinerary provided.</Text>}
      </Section>

      <Section title="Notes and conditions" styles={styles}>
        <Detail label="Inclusions" value={quotation.inclusion} styles={styles} />
        <Detail label="Exclusions" value={quotation.exclusion} styles={styles} />
        <Detail label="Important notes" value={quotation.important_notes} styles={styles} />
        <Detail label="Terms and conditions" value={quotation.terms_and_conditions} styles={styles} />
        <Detail label="Decline reason" value={quotation.rejected_reason} styles={styles} />
        <Detail label="Sent" value={formatDate(quotation.sent_at)} styles={styles} />
        <Detail label="Accepted" value={formatDate(quotation.accepted_at)} styles={styles} />
        <Detail label="Rejected" value={formatDate(quotation.rejected_at)} styles={styles} />
      </Section>
    </ScrollView>
  );
};

const Section: React.FC<{title: string; styles: ReturnType<typeof makeStyles>; children: React.ReactNode}> = ({title, styles, children}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Detail: React.FC<{label: string; value: unknown; styles: ReturnType<typeof makeStyles>}> = ({label, value, styles}) => (
  <View style={styles.detail}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{displayValue(value)}</Text>
  </View>
);

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {padding: 16, paddingBottom: 36},
  header: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border},
  backButton: {width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12},
  headerCopy: {flex: 1, minWidth: 0},
  eyebrow: {fontSize: 10, fontWeight: '900', letterSpacing: 1, color: colors.primary},
  title: {fontSize: 21, fontWeight: '900', color: colors.text, marginTop: 3},
  subtitle: {fontSize: 12, color: colors.textSecondary, marginTop: 4},
  status: {fontSize: 9, fontWeight: '900', color: colors.primary, backgroundColor: colors.primarySubtle, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginLeft: 8, overflow: 'hidden'},
  section: {padding: 15, marginBottom: 13, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border},
  sectionTitle: {fontSize: 15, fontWeight: '900', color: colors.text, marginBottom: 8},
  detail: {paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border},
  detailLabel: {fontSize: 10, fontWeight: '700', color: colors.textMuted},
  detailValue: {fontSize: 12, lineHeight: 18, fontWeight: '700', color: colors.text, marginTop: 3},
  record: {paddingTop: 11, marginTop: 3, borderTopWidth: 1, borderTopColor: colors.border},
  recordTitle: {fontSize: 13, fontWeight: '900', color: colors.text, marginBottom: 3},
  description: {fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 5},
  emptyText: {fontSize: 12, color: colors.textMuted, paddingVertical: 5},
});
