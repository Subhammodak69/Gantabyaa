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

type DetailsTab = 'overview' | 'pricing' | 'items' | 'hotels' | 'transport' | 'itinerary' | 'notes';
type FeatherName = React.ComponentProps<typeof Feather>['name'];

export const QuotationDetailsScreen: React.FC<Props> = ({quotation, onBack}) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [activeTab, setActiveTab] = React.useState<DetailsTab>('overview');
  React.useEffect(() => setActiveTab('overview'), [quotation.id]);
  const tabs: {id: DetailsTab; label: string; icon: FeatherName; count?: number; accent: string}[] = [
    {id: 'overview', label: 'Overview', icon: 'compass', accent: '#4F46E5'},
    {id: 'pricing', label: 'Pricing', icon: 'credit-card', accent: '#059669'},
    {id: 'items', label: 'Items', icon: 'file-text', count: quotation.items?.length || 0, accent: '#0891B2'},
    {id: 'hotels', label: 'Hotels', icon: 'home', count: quotation.hotels?.length || 0, accent: '#D97706'},
    {id: 'transport', label: 'Transport', icon: 'truck', count: quotation.vehicles?.length || 0, accent: '#7C3AED'},
    {id: 'itinerary', label: 'Itinerary', icon: 'map', count: quotation.itinerary?.length || 0, accent: '#E11D48'},
    {id: 'notes', label: 'Notes', icon: 'info', accent: '#0284C7'},
  ];
  const activeAccent = tabs.find(tab => tab.id === activeTab)?.accent || colors.primary;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Pressable onPress={onBack} hitSlop={10} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to quotations">
            <Feather name="arrow-left" size={19} color={colors.textLight} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>QUOTATION DETAILS</Text>
            <Text style={styles.title}>{quotation.tour_name || 'Travel quotation'}</Text>
            <Text style={styles.subtitle}>{quotation.quotation_code || 'Quotation'}</Text>
          </View>
          <View style={styles.status}>
            <Text style={styles.statusText}>{String(quotation.status || 'PENDING').replace(/_/g, ' ')}</Text>
          </View>
        </View>
        <View style={styles.heroFooter}>
          <View style={styles.versionBadge}>
            <Text style={styles.versionLabel}>VERSION</Text>
            <Text style={styles.versionValue}>{displayValue(quotation.version)}</Text>
          </View>
          <View style={styles.heroPrice}>
            <Text style={styles.heroPriceLabel}>TOTAL QUOTATION</Text>
            <Text style={styles.heroPriceValue}>{formatAmount(quotation.total_amount)}</Text>
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {tabs.map(tab => {
          const selected = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, selected ? {backgroundColor: tab.accent, borderColor: tab.accent} : null]}
              accessibilityRole="tab"
              accessibilityState={{selected}}
            >
              <Feather name={tab.icon} size={15} color={selected ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[styles.tabText, selected && styles.activeTabText]}>{tab.label}</Text>
              {tab.count !== undefined ? (
                <Text style={[styles.tabCount, selected && styles.activeTabCount]}>{tab.count}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {activeTab === 'overview' ? (
        <>
          <Section title="Trip details" styles={styles} accent={activeAccent}>
            <Detail label="Travel date" value={formatDate(quotation.travel_date)} styles={styles} />
            <Detail label="Return date" value={formatDate(quotation.return_date)} styles={styles} />
            <Detail label="Valid until" value={formatDate(quotation.valid_until)} styles={styles} />
            <Detail label="Package" value={quotation.package?.name} styles={styles} />
            <Detail label="Package variant" value={[quotation.variant?.name, quotation.variant?.season_name].filter(Boolean).join(' · ')} styles={styles} />
            <Detail label="Destination" value={quotation.destination?.name} styles={styles} />
          </Section>
          <Section title="Customer" styles={styles} accent="#0891B2">
            <Detail label="Name" value={quotation.customer?.name} styles={styles} />
            <Detail label="Mobile" value={quotation.customer?.mobile} styles={styles} />
            <Detail label="Email" value={quotation.customer?.email} styles={styles} />
          </Section>
        </>
      ) : null}

      {activeTab === 'pricing' ? (
        <View style={styles.priceGrid}>
          {[
            {label: 'Subtotal', value: quotation.subtotal, background: '#E0F2FE', accent: '#0369A1'},
            {label: 'Discount', value: quotation.discount_amount, background: '#FFE4E6', accent: '#BE123C'},
            {label: 'Tax', value: quotation.tax_amount, background: '#FEF3C7', accent: '#B45309'},
            {label: 'Total', value: quotation.total_amount, background: '#EDE9FE', accent: '#6D28D9'},
          ].map(price => (
            <View key={price.label} style={[styles.priceTile, {backgroundColor: price.background, borderColor: price.accent}]}>
              <Text style={[styles.priceLabel, {color: price.accent}]}>{price.label}</Text>
              <Text style={[styles.priceValue, {color: price.accent}]}>{formatAmount(price.value)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {activeTab === 'items' ? (
        <Section title="Quotation items" styles={styles} accent={activeAccent}>
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
      ) : null}

      {activeTab === 'hotels' ? (
        <Section title="Accommodation" styles={styles} accent={activeAccent}>
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
      ) : null}

      {activeTab === 'transport' ? (
        <Section title="Transport" styles={styles} accent={activeAccent}>
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
      ) : null}

      {activeTab === 'itinerary' ? (
        <Section title="Day-by-day itinerary" styles={styles} accent={activeAccent}>
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
      ) : null}

      {activeTab === 'notes' ? (
        <Section title="Notes and conditions" styles={styles} accent={activeAccent}>
          <Detail label="Inclusions" value={quotation.inclusion} styles={styles} />
          <Detail label="Exclusions" value={quotation.exclusion} styles={styles} />
          <Detail label="Important notes" value={quotation.important_notes} styles={styles} />
          <Detail label="Terms and conditions" value={quotation.terms_and_conditions} styles={styles} />
          <Detail label="Decline reason" value={quotation.rejected_reason} styles={styles} />
          <Detail label="Sent" value={formatDate(quotation.sent_at)} styles={styles} />
          <Detail label="Accepted" value={formatDate(quotation.accepted_at)} styles={styles} />
          <Detail label="Rejected" value={formatDate(quotation.rejected_at)} styles={styles} />
        </Section>
      ) : null}
    </ScrollView>
  );
};

const Section: React.FC<{title: string; styles: ReturnType<typeof makeStyles>; accent: string; children: React.ReactNode}> = ({title, styles, accent, children}) => (
  <View style={[styles.section, {borderLeftColor: accent}]}>
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
  hero: {padding: 16, marginBottom: 14, borderRadius: 18, backgroundColor: colors.primary, overflow: 'hidden'},
  heroTop: {flexDirection: 'row', alignItems: 'flex-start'},
  backButton: {width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginRight: 10},
  headerCopy: {flex: 1, minWidth: 0},
  eyebrow: {fontSize: 9, fontWeight: '900', letterSpacing: 1, color: '#C7D2FE'},
  title: {fontSize: 18, fontWeight: '900', color: colors.textLight, marginTop: 4},
  subtitle: {fontSize: 11, color: '#E0E7FF', marginTop: 4},
  status: {borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 6, marginLeft: 7},
  statusText: {fontSize: 8, fontWeight: '900', color: colors.textLight},
  heroFooter: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18},
  versionBadge: {paddingVertical: 6, paddingRight: 14},
  versionLabel: {fontSize: 8, fontWeight: '800', letterSpacing: 0.8, color: '#C7D2FE'},
  versionValue: {fontSize: 13, fontWeight: '900', color: colors.textLight, marginTop: 3},
  heroPrice: {minWidth: 132, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.16)'},
  heroPriceLabel: {fontSize: 8, fontWeight: '800', letterSpacing: 0.5, color: '#E0E7FF'},
  heroPriceValue: {fontSize: 18, fontWeight: '900', color: colors.textLight, marginTop: 3},
  tabsScroll: {marginHorizontal: -16, marginBottom: 14},
  tabs: {flexDirection: 'row', gap: 8, paddingHorizontal: 16},
  tab: {flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.card},
  tabText: {fontSize: 11, fontWeight: '800', color: colors.textSecondary},
  activeTabText: {color: '#FFFFFF'},
  tabCount: {minWidth: 18, overflow: 'hidden', textAlign: 'center', fontSize: 9, fontWeight: '900', color: colors.textSecondary, backgroundColor: colors.surface, borderRadius: 9, paddingHorizontal: 5, paddingVertical: 2},
  activeTabCount: {color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.2)'},
  section: {padding: 15, marginBottom: 13, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4},
  sectionTitle: {fontSize: 15, fontWeight: '900', color: colors.text, marginBottom: 8},
  priceGrid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between'},
  priceTile: {width: '48%', minHeight: 95, justifyContent: 'center', borderWidth: 1, borderRadius: 15, padding: 14, marginBottom: 10},
  priceLabel: {fontSize: 11, fontWeight: '800'},
  priceValue: {fontSize: 18, fontWeight: '900', marginTop: 8},
  detail: {paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border},
  detailLabel: {fontSize: 10, fontWeight: '700', color: colors.textMuted},
  detailValue: {fontSize: 12, lineHeight: 18, fontWeight: '700', color: colors.text, marginTop: 3},
  record: {paddingTop: 11, marginTop: 3, borderTopWidth: 1, borderTopColor: colors.border},
  recordTitle: {fontSize: 13, fontWeight: '900', color: colors.text, marginBottom: 3},
  description: {fontSize: 12, lineHeight: 18, color: colors.textSecondary, marginTop: 5},
  emptyText: {fontSize: 12, color: colors.textMuted, paddingVertical: 5},
});
