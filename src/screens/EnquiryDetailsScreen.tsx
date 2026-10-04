import React, {useEffect, useState} from 'react';
import {ScrollView, StyleSheet, Text, View, Pressable} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {AppColors, useColors} from '../theme/theme';
import {EnquiryData} from '../types';
import {fetchTourPackageVariants, fetchTourPackages} from '../api/tourApi';
import {SeasonVariant, TourPackageSummary} from '../types';

interface Props {
  enquiry: EnquiryData;
  onEdit?: () => void;
  onBack?: () => void;
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

export const EnquiryDetailsScreen: React.FC<Props> = ({enquiry, onEdit, onBack}) => {
  const colors = useColors();
  const styles = makeStyles(colors);
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

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.screenHeader}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}><Feather name="arrow-left" size={20} color={colors.text} /></Pressable>
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>TRAVEL REQUEST</Text>
        <Text style={styles.title}>Enquiry details</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.reference} numberOfLines={1}>Reference: {fieldValue(enquiry, 'enquiry_code', 'id')}</Text>
      </View>
      <Text style={[styles.status, status === 'CONFIRMED' || status === 'CONVERTED' ? styles.statusConfirmed : styles.statusPending]}>{status}</Text>
    </View>

    <Section title="Contact information" styles={styles}>
      <Detail icon="user" label="Full name" value={fieldValue(enquiry, 'fullName', 'enquirer_name', 'name', 'full_name')} styles={styles} colors={colors} />
      <Detail icon="phone" label="Mobile" value={fieldValue(enquiry, 'mobile', 'enquirer_phone', 'phone')} styles={styles} colors={colors} />
      <Detail icon="mail" label="Email" value={fieldValue(enquiry, 'email', 'enquirer_email')} styles={styles} colors={colors} />
      <Detail icon="message-circle" label="Enquiry channel" value={fieldValue(enquiry, 'channel')} styles={styles} colors={colors} />
    </Section>

    <Section title="Travel request" styles={styles}>
      <Detail icon="map-pin" label="Destination" value={fieldValue(enquiry, 'destination_name', 'destination', 'destinationName')} styles={styles} colors={colors} />
      <Detail icon="briefcase" label="Package / tour" value={packageTitle || fieldValue(enquiry, 'package_name', 'tour_title', 'subject', 'tourTitle', 'package')} styles={styles} colors={colors} />
      <Detail icon="tag" label="Package variant" value={variantTitle || fieldValue(enquiry, 'variant_name', 'variantName', 'variant')} styles={styles} colors={colors} />
      <Detail icon="calendar" label="Travel date" value={formatDate(valueOf(enquiry, 'travelDate', 'travel_date'))} styles={styles} colors={colors} />
      <Detail icon="clock" label="Duration" value={formatDuration(enquiry)} styles={styles} colors={colors} />
      <Detail icon="coffee" label="Meal plan" value={fieldValue(enquiry, 'meal_plan', 'mealPlan')} styles={styles} colors={colors} />
    </Section>

    <Section title="Travelers & arrangements" styles={styles}>
      <Detail icon="users" label="Adults" value={fieldValue(enquiry, 'adults', 'adult_count', 'pax_no')} styles={styles} colors={colors} />
      <Detail icon="user" label="Children" value={fieldValue(enquiry, 'children', 'child_count')} styles={styles} colors={colors} />
      <Detail icon="user" label="Seniors" value={fieldValue(enquiry, 'senior_count', 'seniorCount')} styles={styles} colors={colors} />
      <Detail icon="home" label="Rooms" value={fieldValue(enquiry, 'room_count', 'no_room', 'roomCount')} styles={styles} colors={colors} />
      <Detail icon="home" label="Hotel" value={fieldValue(enquiry, 'hotel_name', 'hotelName', 'hotel')} styles={styles} colors={colors} />
      <Detail icon="truck" label="Vehicles" value={fieldValue(enquiry, 'vehicle_count', 'vehicleCount')} styles={styles} colors={colors} />
      <Detail icon="truck" label="Vehicle" value={fieldValue(enquiry, 'vehicle_name', 'vehicleName', 'vehicle')} styles={styles} colors={colors} />
      <Detail icon="credit-card" label="Budget range" value={budget} styles={styles} colors={colors} />
    </Section>

    <Section title="Message & requirements" styles={styles}>
      <Detail icon="message-square" label="Message" value={fieldValue(enquiry, 'message')} styles={styles} colors={colors} />
      <Detail icon="list" label="Special requirements" value={fieldValue(enquiry, 'special_requirements', 'specialRequirements')} styles={styles} colors={colors} />
    </Section>

    <Section title="Submission information" styles={styles}>
      <Detail icon="calendar" label="Submitted" value={formatDate(valueOf(enquiry, 'createdAt', 'created_at'))} styles={styles} colors={colors} />
      <Detail icon="calendar" label="Last updated" value={formatDate(valueOf(enquiry, 'updated_at', 'updatedAt'))} styles={styles} colors={colors} />
    </Section>
    {lookupsLoading ? <Text style={styles.lookupNotice}>Loading package and variant names…</Text> : null}
    {lookupError ? <Text style={styles.lookupError}>{lookupError}</Text> : null}
    {onEdit ? <Pressable style={styles.editButton} onPress={onEdit}><Feather name="edit-2" size={17} color={colors.textLight} /><Text style={styles.editText}>Edit enquiry</Text></Pressable> : null}
  </ScrollView>;
};

const Section: React.FC<{title: string; styles: ReturnType<typeof makeStyles>; children: React.ReactNode}> = ({title, styles, children}) => <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.card}>{children}</View></View>;
const Detail: React.FC<{icon: string; label: string; value: string; styles: ReturnType<typeof makeStyles>; colors: AppColors}> = ({icon, label, value, styles, colors}) => <View style={styles.detail}><View style={styles.detailIcon}><Feather name={icon} size={15} color={colors.primary} /></View><View style={styles.detailCopy}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View></View>;

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {padding: 16, paddingBottom: 36},
  screenHeader: {flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 16, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border},
  backButton: {width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12},
  headerCopy: {flex: 1, minWidth: 0},
  eyebrow: {fontSize: 10, fontWeight: '900', letterSpacing: 1, color: colors.primary},
  title: {fontSize: 23, fontWeight: '900', color: colors.text, marginTop: 3},
  subtitle: {fontSize: 12, color: colors.textSecondary, marginTop: 4},
  status: {fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, marginLeft: 8},
  statusPending: {color: colors.goldDark, backgroundColor: colors.goldLight},
  statusConfirmed: {color: colors.success, backgroundColor: colors.successLight},
  reference: {fontSize: 10, color: colors.textMuted, marginTop: 7},
  section: {marginBottom: 17},
  sectionTitle: {fontSize: 12, fontWeight: '900', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8},
  card: {backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingHorizontal: 14},
  detail: {flexDirection: 'row', alignItems: 'center', minHeight: 62, borderBottomWidth: 1, borderBottomColor: colors.border},
  detailIcon: {width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center', marginRight: 11},
  detailCopy: {flex: 1},
  detailLabel: {fontSize: 10, color: colors.textMuted, fontWeight: '800', textTransform: 'uppercase'},
  detailValue: {fontSize: 13, color: colors.text, fontWeight: '700', marginTop: 4},
  lookupNotice: {fontSize: 11, color: colors.textMuted, textAlign: 'center', marginBottom: 12},
  lookupError: {fontSize: 11, lineHeight: 16, color: colors.danger, textAlign: 'center', marginBottom: 12},
  editButton: {height: 48, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  editText: {fontSize: 13, fontWeight: '900', color: colors.textLight},
});
