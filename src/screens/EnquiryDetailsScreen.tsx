import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View, Pressable} from 'react-native';
import {ScrollView} from '../components/ScrollView';
import Feather from 'react-native-vector-icons/Feather';
import {AppColors, useColors} from '../theme/theme';
import {EnquiryData} from '../types';
import {fetchTourPackageVariants, fetchTourPackages} from '../api/tourApi';
import {SeasonVariant, TourPackageSummary} from '../types';

interface Props {
  enquiry: EnquiryData;
  onBack?: () => void;
  onViewQuotations?: () => void;
}

const valueOf = (source: object, ...keys: string[]): unknown => {
  const values = new Map(Object.entries(source));
  for (const key of keys) {
    const value = values.get(key);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const textOf = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join(', ');
  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    for (const key of ['name', 'title', 'label', 'display_name', 'description', 'value']) {
      if (objectValue[key] !== undefined && objectValue[key] !== null && objectValue[key] !== '') {
        return textOf(objectValue[key]);
      }
    }
  }
  return 'Not provided';
};

const fieldValue = (source: object, ...keys: string[]): string => textOf(valueOf(source, ...keys));

const formatDate = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'Not provided';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? textOf(value)
    : date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
};

const formatBudget = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'Not provided';
  const amount = Number(value);
  return Number.isFinite(amount) ? `₹${amount.toLocaleString('en-IN')}` : textOf(value);
};

const formatDuration = (enquiry: object): string => {
  const days = valueOf(enquiry, 'travel_duration_day', 'duration_days');
  const nights = valueOf(enquiry, 'travel_duration_night', 'duration_nights');
  const parts = [];
  if (days !== undefined && days !== null && days !== '') {
    parts.push(`${textOf(days)} ${Number(days) === 1 ? 'day' : 'days'}`);
  }
  if (nights !== undefined && nights !== null && nights !== '') {
    parts.push(`${textOf(nights)} ${Number(nights) === 1 ? 'night' : 'nights'}`);
  }
  return parts.length ? parts.join(' · ') : fieldValue(enquiry, 'travel_duration', 'duration');
};

type EnquiryTab = 'contact' | 'travel' | 'travelers' | 'message' | 'activity';
type FeatherName = React.ComponentProps<typeof Feather>['name'];

export const EnquiryDetailsScreen: React.FC<Props> = ({enquiry, onBack, onViewQuotations}) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [activeTab, setActiveTab] = useState<EnquiryTab>('contact');
  const [packageTitle, setPackageTitle] = useState('');
  const [variantTitle, setVariantTitle] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookupsLoading, setLookupsLoading] = useState(false);

  useEffect(() => {
    if (!enquiry.package_id) {
      setPackageTitle('');
      setVariantTitle('');
      setLookupError('');
      setLookupsLoading(false);
      return undefined;
    }

    let active = true;
    setLookupsLoading(true);
    setLookupError('');
    setPackageTitle('');
    setVariantTitle('');

    const loadNames = async () => {
      try {
        const packages = await fetchTourPackages(1, 100);
        let selectedPackage: TourPackageSummary | undefined = packages.find(
          item => String(item.id) === String(enquiry.package_id),
        );
        if (!selectedPackage) {
          const matchingPackages = await fetchTourPackages(
            1,
            100,
            'created_at',
            'desc',
            {search: enquiry.package_id},
          );
          selectedPackage = matchingPackages.find(
            item => String(item.id) === String(enquiry.package_id),
          );
        }
        if (!active) return;
        if (selectedPackage?.title) setPackageTitle(selectedPackage.title);

        const variantsResponse = await fetchTourPackageVariants(
          selectedPackage?.slug || enquiry.package_id!,
          1,
          100,
        );
        if (!active) return;
        const selectedVariant: SeasonVariant | undefined = variantsResponse.variants.find(
          item => String(item.id) === String(enquiry.variant_id),
        );
        if (selectedVariant?.name || selectedVariant?.season_name) {
          setVariantTitle(selectedVariant.name || selectedVariant.season_name);
        } else if (enquiry.variant_id) {
          setLookupError('The package or variant name could not be resolved.');
        }
      } catch (error) {
        if (active) {
          setLookupError(error instanceof Error ? error.message : 'Package and variant names could not be loaded.');
        }
      } finally {
        if (active) setLookupsLoading(false);
      }
    };

    loadNames();
    return () => {
      active = false;
    };
  }, [enquiry.package_id, enquiry.variant_id]);

  const status = fieldValue(enquiry, 'status') === 'Not provided'
    ? 'PENDING'
    : fieldValue(enquiry, 'status').toUpperCase();
  const title = packageTitle || fieldValue(
    enquiry,
    'package_name',
    'tour_title',
    'subject',
    'tourTitle',
    'destination_name',
    'destination',
    'package',
  );
  const minBudget = valueOf(enquiry, 'budget_min', 'min_budget');
  const maxBudget = valueOf(enquiry, 'budget_max', 'max_budget');
  const budget = minBudget == null && maxBudget == null
    ? 'Not provided'
    : `${formatBudget(minBudget)} – ${formatBudget(maxBudget)}`;
  const isConfirmed = status === 'CONFIRMED' || status === 'CONVERTED';
  const tabs: {id: EnquiryTab; label: string; icon: FeatherName; accent: string}[] = [
    {id: 'contact', label: 'Contact', icon: 'user', accent: '#4F46E5'},
    {id: 'travel', label: 'Travel', icon: 'map-pin', accent: '#0891B2'},
    {id: 'travelers', label: 'Travelers', icon: 'users', accent: '#059669'},
    {id: 'message', label: 'Message', icon: 'message-square', accent: '#E11D48'},
    {id: 'activity', label: 'Activity', icon: 'clock', accent: '#D97706'},
  ];

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        {onBack ? <Pressable onPress={onBack} hitSlop={10} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to enquiries"><Feather name="arrow-left" size={19} color={colors.text} /></Pressable> : null}
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>TRAVEL REQUEST · ENQUIRY DETAILS</Text>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <Text style={styles.reference} numberOfLines={1}>Reference: {fieldValue(enquiry, 'enquiry_code', 'id')}</Text>
        </View>
        <View style={[styles.status, isConfirmed ? styles.statusConfirmed : styles.statusPending]}>
          <Text style={[styles.statusText, isConfirmed ? styles.confirmedText : styles.pendingText]}>{status}</Text>
        </View>
      </View>
      <View style={styles.heroFooter}>
        <View>
          <Text style={styles.heroMetaLabel}>TRAVEL DATE</Text>
          <Text style={styles.heroMetaValue}>{formatDate(valueOf(enquiry, 'travelDate', 'travel_date'))}</Text>
        </View>
        <View style={styles.heroBudget}>
          <Text style={styles.heroMetaLabel}>BUDGET RANGE</Text>
          <Text style={styles.heroBudgetValue}>{budget}</Text>
        </View>
      </View>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
      {tabs.map(tab => {
        const selected = activeTab === tab.id;
        return <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={[styles.tab, selected ? {backgroundColor: tab.accent, borderColor: tab.accent} : null]} accessibilityRole="tab" accessibilityState={{selected}}>
          <Feather name={tab.icon} size={15} color={selected ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[styles.tabText, selected && styles.activeTabText]}>{tab.label}</Text>
        </Pressable>;
      })}
    </ScrollView>

    {activeTab === 'contact' ? <View>
      <Section title="Contact information" styles={styles} accent={tabs[0].accent}>
        <Detail icon="user" label="Full name" value={fieldValue(enquiry, 'fullName', 'enquirer_name', 'name', 'full_name')} styles={styles} colors={colors} />
        <Detail icon="phone" label="Mobile" value={fieldValue(enquiry, 'mobile', 'enquirer_phone', 'phone')} styles={styles} colors={colors} />
        <Detail icon="mail" label="Email" value={fieldValue(enquiry, 'email', 'enquirer_email')} styles={styles} colors={colors} />
        <Detail icon="message-circle" label="Enquiry channel" value={fieldValue(enquiry, 'channel')} styles={styles} colors={colors} />
      </Section>
    </View> : null}

    {activeTab === 'travel' ? <View>
      <Section title="Travel request" styles={styles} accent={tabs[1].accent}>
        <Detail icon="map-pin" label="Destination" value={fieldValue(enquiry, 'destination_name', 'destination', 'destinationName')} styles={styles} colors={colors} />
        <Detail icon="briefcase" label="Package / tour" value={packageTitle || fieldValue(enquiry, 'package_name', 'tour_title', 'subject', 'tourTitle', 'package')} styles={styles} colors={colors} />
        <Detail icon="tag" label="Package variant" value={variantTitle || fieldValue(enquiry, 'variant_name', 'variantName', 'variant')} styles={styles} colors={colors} />
        <Detail icon="calendar" label="Travel date" value={formatDate(valueOf(enquiry, 'travelDate', 'travel_date'))} styles={styles} colors={colors} />
        <Detail icon="clock" label="Duration" value={formatDuration(enquiry)} styles={styles} colors={colors} />
        <Detail icon="coffee" label="Meal plan" value={fieldValue(enquiry, 'meal_plan', 'mealPlan')} styles={styles} colors={colors} />
      </Section>
    </View> : null}

    {activeTab === 'travelers' ? <View>
      <Section title="Travelers & arrangements" styles={styles} accent={tabs[2].accent}>
        <Detail icon="users" label="Adults" value={fieldValue(enquiry, 'adults', 'adult_count', 'pax_no')} styles={styles} colors={colors} />
        <Detail icon="user" label="Children" value={fieldValue(enquiry, 'children', 'child_count')} styles={styles} colors={colors} />
        <Detail icon="user" label="Seniors" value={fieldValue(enquiry, 'senior_count', 'seniorCount')} styles={styles} colors={colors} />
        <Detail icon="home" label="Rooms" value={fieldValue(enquiry, 'room_count', 'no_room', 'roomCount')} styles={styles} colors={colors} />
        <Detail icon="truck" label="Vehicles" value={fieldValue(enquiry, 'vehicle_count', 'vehicleCount')} styles={styles} colors={colors} />
        <Detail icon="truck" label="Vehicle" value={fieldValue(enquiry, 'vehicle_name', 'vehicleName', 'vehicle')} styles={styles} colors={colors} />
        <Detail icon="credit-card" label="Budget range" value={budget} styles={styles} colors={colors} />
      </Section>
    </View> : null}

    {activeTab === 'message' ? <View>
      <Section title="Message & requirements" styles={styles} accent={tabs[3].accent}>
        <Detail icon="message-square" label="Message" value={fieldValue(enquiry, 'message')} styles={styles} colors={colors} />
        <Detail icon="list" label="Special requirements" value={fieldValue(enquiry, 'special_requirements', 'specialRequirements')} styles={styles} colors={colors} />
      </Section>
    </View> : null}

    {activeTab === 'activity' ? <View>
      <Section title="Submission information" styles={styles} accent={tabs[4].accent}>
        <Detail icon="calendar" label="Submitted" value={formatDate(valueOf(enquiry, 'createdAt', 'created_at'))} styles={styles} colors={colors} />
        <Detail icon="calendar" label="Last updated" value={formatDate(valueOf(enquiry, 'updated_at', 'updatedAt'))} styles={styles} colors={colors} />
      </Section>
    </View> : null}
    {lookupsLoading ? <Text style={styles.lookupNotice}>Loading package and variant names…</Text> : null}
    {lookupError ? <Text style={styles.lookupError}>{lookupError}</Text> : null}
    {onViewQuotations ? <Pressable style={styles.quotationsButton} onPress={onViewQuotations}><Feather name="file-text" size={17} color={colors.primary} /><Text style={styles.quotationsText}>View quotations</Text><Feather name="arrow-right" size={16} color={colors.primary} /></Pressable> : null}
  </ScrollView>;
};

const Section: React.FC<{title: string; styles: ReturnType<typeof makeStyles>; accent: string; children: React.ReactNode}> = ({title, styles, accent, children}) => <View style={styles.section}><Text style={[styles.sectionTitle, {color: accent}]}>{title}</Text>{children}</View>;
const Detail: React.FC<{icon: string; label: string; value: string; styles: ReturnType<typeof makeStyles>; colors: AppColors}> = ({icon, label, value, styles, colors}) => <View style={styles.detail}><Feather name={icon} size={14} color={colors.primary} style={styles.detailIcon} /><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {padding: 16, paddingBottom: 36},
  hero: {paddingBottom: 15, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border},
  heroTop: {flexDirection: 'row', alignItems: 'flex-start'},
  heroFooter: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12},
  heroMetaLabel: {fontSize: 8, fontWeight: '800', letterSpacing: 0.7, color: colors.textMuted},
  heroMetaValue: {fontSize: 12, fontWeight: '900', color: colors.text, marginTop: 4},
  heroBudget: {maxWidth: '60%', alignItems: 'flex-end'},
  heroBudgetValue: {fontSize: 12, fontWeight: '900', color: colors.text, marginTop: 4},
  backButton: {width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 10},
  headerCopy: {flex: 1, minWidth: 0},
  eyebrow: {fontSize: 8, fontWeight: '900', letterSpacing: 0.8, color: colors.primary},
  title: {fontSize: 18, fontWeight: '900', color: colors.text, marginTop: 4},
  status: {paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, marginLeft: 7},
  statusText: {fontSize: 8, fontWeight: '900'},
  statusPending: {backgroundColor: colors.goldLight},
  statusConfirmed: {backgroundColor: colors.successLight},
  pendingText: {color: colors.goldDark},
  confirmedText: {color: colors.success},
  reference: {fontSize: 10, color: colors.textMuted, marginTop: 7},
  tabsScroll: {marginHorizontal: -16, marginBottom: 14},
  tabs: {flexDirection: 'row', gap: 8, paddingHorizontal: 16},
  tab: {flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.card},
  tabText: {fontSize: 11, fontWeight: '800', color: colors.textSecondary},
  activeTabText: {color: '#FFFFFF'},
  section: {marginBottom: 15, paddingBottom: 4},
  sectionTitle: {fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 5},
  detail: {flexDirection: 'row', alignItems: 'center', minHeight: 48, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 8},
  detailIcon: {marginRight: 8},
  detailLabel: {width: '34%', fontSize: 10, color: colors.textMuted, fontWeight: '800'},
  detailValue: {flex: 1, fontSize: 12, lineHeight: 17, color: colors.text, fontWeight: '700', textAlign: 'right'},
  lookupNotice: {fontSize: 11, color: colors.textMuted, textAlign: 'center', marginBottom: 12, padding: 11, borderRadius: 10, backgroundColor: colors.surface},
  lookupError: {fontSize: 11, lineHeight: 16, color: colors.danger, textAlign: 'center', marginBottom: 12, padding: 11, borderRadius: 10, backgroundColor: colors.dangerLight},
  quotationsButton: {height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySubtle, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 10},
  quotationsText: {fontSize: 13, fontWeight: '900', color: colors.primary},
});
