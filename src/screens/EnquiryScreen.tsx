import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import Feather from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';
import { useAppDialog } from '../components/AppDialog';
import { CustomDateField } from '../components/CustomDatePicker';
import { fetchAllDestinations, fetchTourPackageVariants, fetchTourPackages, openWhatsAppChat } from '../api/tourApi';
import enums from '../utils/enums.json';
import { NavScreen } from '../types';

interface EnquiryScreenProps {
  onBack: () => void;
  onNavigate?: (screen: NavScreen) => void;
  onEnquirySubmitted?: (enquiry: any) => void;
  user?: import('../api/tourApi').AuthUser | null;
  prefilled?: {
    tourSlug?: string;
    tourTitle?: string;
    packageId?: string;
    destinationId?: string;
    destinationName?: string;
    variantId?: string;
    variantName?: string;
    packageImage?: string;
    variantPrice?: number;
    travelDate?: string;
    durationDays?: number;
    durationNights?: number;
  } | null;
}

type ChipOption = { label: string; value: string };

function durationNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  if (Array.isArray(value)) return durationNumber(value[0]);
  if (value && typeof value === 'object' && 'items' in value) {
    const items = (value as { items?: unknown }).items;
    return Array.isArray(items) ? durationNumber(items[0]) : undefined;
  }
  return undefined;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  styles,
  colors,
  isDark,
}: {
  options: ChipOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  styles: any;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find(option => option.value === value);
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  React.useEffect(() => {
    if (!visible) {
      setKeyboardVisible(false);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  return (
    <>
      <Pressable style={styles.selectButton} onPress={() => { setSearch(''); setVisible(true); }}>
        <Text style={[styles.selectText, !selected && styles.selectPlaceholder]} numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <Text style={styles.selectArrow}>⌄</Text>
      </Pressable>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView
          style={styles.selectBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType={isDark ? 'dark' : 'light'}
            blurAmount={18}
          />
          <View pointerEvents="none" style={styles.selectTint} />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
          <View style={[
            styles.selectDialog,
            keyboardVisible && styles.selectDialogKeyboard,
            keyboardVisible && {paddingTop: insets.top + 20},
          ]}>
            <Text style={styles.selectTitle}>{placeholder}</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              style={styles.input}
              placeholder="Search options"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <FlatList
              style={styles.selectList}
              data={filteredOptions}
              keyExtractor={option => option.value || '__empty__'}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.selectEmpty}>No matching options</Text>}
              renderItem={({item}) => (
                <Pressable
                  style={styles.selectOption}
                  onPress={() => {
                    onChange(item.value);
                    setVisible(false);
                  }}
                >
                  <Text style={[styles.selectOptionText, item.value === value && styles.selectOptionActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// Build chip options from enums
const vehicleOptions: ChipOption[] = Object.entries(enums.VehicleType).map(([, v]) => ({
  label: v as string,
  value: v as string,
}));
const mealOptions: ChipOption[] = Object.entries(enums.MealPlan).map(([, v]) => ({
  label: v as string,
  value: v as string,
}));
const hotelCategoryOptions: ChipOption[] = [
  { label: 'Budget', value: 'BUDGET' },
  { label: 'Standard', value: 'STANDARD' },
  { label: 'Deluxe', value: 'DELUXE' },
  { label: 'Luxury', value: 'LUXURY' },
];
const roomTypeOptions: ChipOption[] = [
  { label: 'Single', value: 'SINGLE' },
  { label: 'Double', value: 'DOUBLE' },
  { label: 'Twin', value: 'TWIN' },
  { label: 'Triple', value: 'TRIPLE' },
  { label: 'Family', value: 'FAMILY' },
  { label: 'Suite', value: 'SUITE' },
  { label: 'Deluxe', value: 'DELUXE' },
  { label: 'Executive', value: 'EXECUTIVE' },
  { label: 'Presidential', value: 'PRESIDENTIAL' },
];
const STEPS = [
  { title: 'Contact details', description: 'Who should we contact?' },
  { title: 'Choose your trip', description: 'Destination or tour package' },
  { title: 'Travel plans', description: 'Dates and travellers' },
  { title: 'Preferences', description: 'Stay, transport and budget' },
];

export const EnquiryScreen: React.FC<EnquiryScreenProps> = ({
  onBack,
  onEnquirySubmitted,
  user: initialUser,
  prefilled,
}) => {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS, isDark);
  const { showDialog } = useAppDialog();
  const enquiryType = 'CUSTOM_TOUR';
  const [name, setName] = useState(initialUser?.name || '');
  const [mobile, setMobile] = useState(initialUser?.mobile || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [destination, setDestination] = useState(prefilled?.destinationName || prefilled?.tourTitle || '');
  const [destinationId, setDestinationId] = useState(prefilled?.destinationId || '');
  const [packageId, setPackageId] = useState(prefilled?.packageId || '');
  const [variantId, setVariantId] = useState(prefilled?.variantId || '');
  const [selectionMode, setSelectionMode] = useState<'PACKAGE' | 'DESTINATION' | ''>(
    prefilled?.packageId ? 'PACKAGE' : prefilled?.destinationId ? 'DESTINATION' : '',
  );
  const [packages, setPackages] = useState<any[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const [destinations, setDestinations] = useState<any[]>([]);
  const [destinationsLoading, setDestinationsLoading] = useState(true);
  const [destinationsError, setDestinationsError] = useState('');
  const [variants, setVariants] = useState<any[]>([]);
  const [travelDate, setTravelDate] = useState(prefilled?.travelDate || '');
  const [travelDurationDay, setTravelDurationDay] = useState('');
  const [travelDurationNight, setTravelDurationNight] = useState('');
  const [adultCount, setAdultCount] = useState('2');
  const [childCount, setChildCount] = useState('0');
  const [seniorCount, setSeniorCount] = useState('0');
  const [noRoom, setNoRoom] = useState('1');
  const [vehicleCount, setVehicleCount] = useState('0');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [vehicleType, setVehicleType] = useState('ANY');
  const [mealPlan, setMealPlan] = useState('ANY');
  const [hotelCategory, setHotelCategory] = useState('');
  const [roomType, setRoomType] = useState('');
  const [message, setMessage] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsError, setVariantsError] = useState('');
  const selectedPackage = React.useMemo(
    () => packages.find(item => item.id === packageId)
      || (prefilled?.packageId && packageId === prefilled.packageId ? {
        id: prefilled.packageId,
        slug: prefilled.tourSlug || '',
        title: prefilled.tourTitle || '',
        destination: prefilled.destinationName || '',
        cover_image: prefilled.packageImage || '',
      } : undefined),
    [packages, packageId, prefilled],
  );
  const selectedVariant = variants.find(item =>
    item.id === variantId || item.key === variantId || item.name === variantId,
  ) || (prefilled?.variantId && variantId === prefilled.variantId ? {
    id: prefilled.variantId,
    name: prefilled.variantName || '',
    cover_image: prefilled.packageImage || '',
    starting_price: prefilled.variantPrice,
    duration_days: prefilled.durationDays,
    duration_nights: prefilled.durationNights,
  } : undefined) || (!variantId ? variants.find(item => item.is_default) || variants[0] : undefined);
  const filteredPackages = packages.filter(item =>
    `${item.title || ''} ${item.destination || item.destination_name || ''} ${item.tour_code || ''}`
      .toLowerCase()
      .includes(packageSearch.trim().toLowerCase()),
  );
  const packageOptions = selectedPackage && !filteredPackages.some(item => item.id === selectedPackage.id)
    ? [selectedPackage, ...filteredPackages]
    : filteredPackages;
  const packageImage = selectedVariant?.cover_image
    || selectedPackage?.cover_image
    || selectedPackage?.image
    || selectedPackage?.banner?.image
    || '';
  const selectedVariantName = selectedVariant?.name || selectedVariant?.season_name || prefilled?.variantName || '';
  const isPackageEnquiry = selectionMode === 'PACKAGE' && Boolean(packageId);
  const usesPrefilledVariant = packageId === prefilled?.packageId && variantId === prefilled?.variantId;
  const resolvedTravelDurationDay = isPackageEnquiry
    ? durationNumber(selectedVariant?.duration_days) ?? (usesPrefilledVariant ? durationNumber(prefilled?.durationDays) : undefined) ?? durationNumber(selectedPackage?.duration_days) ?? 0
    : Number(travelDurationDay) || 0;
  const resolvedTravelDurationNight = isPackageEnquiry
    ? durationNumber(selectedVariant?.duration_nights) ?? (usesPrefilledVariant ? durationNumber(prefilled?.durationNights) : undefined) ?? durationNumber(selectedPackage?.duration_nights) ?? 0
    : Number(travelDurationNight) || 0;
  const selectionIsValid = selectionMode === 'PACKAGE'
    ? Boolean(packageId) && !variantsLoading && (!variants.length || Boolean(selectedVariant))
    : selectionMode === 'DESTINATION' && Boolean(destinationId);
  const contactIsValid = Boolean(name.trim()) && mobile.replace(/\D/g, '').length >= 10;

  React.useEffect(() => {
    fetchTourPackages(1, 50)
      .then(setPackages)
      .catch((error: any) => setPackagesError(error?.message || 'Unable to load tour packages.'))
      .finally(() => setPackagesLoading(false));
    fetchAllDestinations(100)
      .then(setDestinations)
      .catch((error: any) => setDestinationsError(error?.message || 'Unable to load destinations.'))
      .finally(() => setDestinationsLoading(false));
  }, []);

  React.useEffect(() => {
    const packageRef = selectedPackage?.slug || (selectedPackage ? packageId : '');
    if (!packageRef) {
      setVariants([]);
      setVariantsLoading(false);
      setVariantsError('');
      return;
    }
    let active = true;
    setVariantsLoading(true);
    setVariantsError('');
    fetchTourPackageVariants(packageRef)
      .then(result => {
        if (active) setVariants(result.variants);
      })
      .catch((error: any) => {
        if (!active) return;
        setVariants([]);
        setVariantsError(error?.message || 'Unable to load package variants.');
      })
      .finally(() => {
        if (active) setVariantsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [packageId, packages, selectedPackage]);

  // Auto-sync logged in user info if available
  React.useEffect(() => {
    if (initialUser) {
      if (initialUser.name) setName(initialUser.name);
      if (initialUser.mobile) setMobile(initialUser.mobile);
      if (initialUser.email) setEmail(initialUser.email);
    }
  }, [initialUser]);

  const resetForm = () => {
    setName(initialUser?.name || '');
    setMobile(initialUser?.mobile || '');
    setEmail(initialUser?.email || '');
    setDestination('');
    setDestinationId('');
    setPackageId('');
    setVariantId('');
    setSelectionMode(prefilled?.packageId ? 'PACKAGE' : prefilled?.destinationId ? 'DESTINATION' : '');
    setTravelDate('');
    setTravelDurationDay('');
    setTravelDurationNight('');
    setAdultCount('2');
    setChildCount('0');
    setSeniorCount('0');
    setNoRoom('1');
    setVehicleCount('0');
    setBudgetMin('');
    setBudgetMax('');
    setVehicleType('ANY');
    setMealPlan('ANY');
    setHotelCategory('');
    setRoomType('');
    setMessage('');
    setSpecialRequirements('');
    setStep(0);
    setErrorMsg('');
  };

  const handleSubmit = async () => {
    if (!contactIsValid || !selectionIsValid) {
      await showDialog({
        title: 'Required Fields Missing',
        message: !contactIsValid
          ? 'Please enter your name and a valid mobile number.'
          : 'Please choose a package or destination.',
        variant: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const whatsappMessage = [
        'Hello Gantabyaa team! 👋',
        '',
        'I would like to plan a custom tour:',
        `Enquiry type: ${enquiryType || 'CUSTOM_TOUR'}`,
        `Name: ${name.trim()}`,
        `Mobile / WhatsApp: ${mobile.trim()}`,
        `Email: ${email.trim() || 'Not provided'}`,
        `Destination: ${destination.trim() || prefilled?.destinationName || 'Not specified'}`,
        `Package: ${selectedPackage?.title || prefilled?.tourTitle || 'Custom package'}`,
        `Variant: ${selectedVariantName || 'Not selected'}`,
        `Departure date: ${travelDate.trim() || 'Not selected'}`,
        `Duration: ${resolvedTravelDurationDay} days / ${resolvedTravelDurationNight} nights`,
        `Travellers: Adults ${adultCount || 0}, Children ${childCount || 0}, Seniors ${seniorCount || 0}`,
        `Rooms: ${noRoom || 0}`,
        `Hotel category: ${hotelCategoryOptions.find(option => option.value === hotelCategory)?.label || 'Not selected'}`,
        `Room type: ${roomTypeOptions.find(option => option.value === roomType)?.label || 'Not selected'}`,
        `Vehicle type: ${vehicleType || 'ANY'}`,
        `Vehicles: ${vehicleCount || 0}`,
        `Budget: ${budgetMin || 0} - ${budgetMax || 0}`,
        `Meal plan: ${mealPlan || 'ANY'}`,
        `Special requirements: ${specialRequirements.trim() || 'None'}`,
        `Message / preferences: ${message.trim() || 'None'}`,
        packageImage ? `Package image: ${packageImage}` : '',
        '',
        'Please help me with availability, pricing and a personalized itinerary.',
      ].filter(Boolean).join('\n');
      if (onEnquirySubmitted) onEnquirySubmitted({ channel: 'WHATSAPP', message: whatsappMessage });

      await showDialog({
        title: 'Enquiry Received! 🌟',
        message: 'Your enquiry details are prepared in WhatsApp. Please press Send to share them with our travel team.',
        variant: 'success',
        confirmText: 'Open WhatsApp',
      });
      resetForm();
      openWhatsAppChat(whatsappMessage);
    } catch (error: any) {
      await showDialog({
        title: 'Submission Failed',
        message: error?.message || 'We could not submit your enquiry. Please check your connection and try again.',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = () => {
    if (step === 0 && !contactIsValid) {
      setErrorMsg(!name.trim() ? 'Enter your name to continue.' : 'Enter a valid mobile number to continue.');
      return;
    }
    if (step === 1 && !selectionIsValid) {
      setErrorMsg(variantsLoading
        ? 'Please wait while package options load.'
        : 'Choose a destination or select a package and variant to continue.');
      return;
    }
    setErrorMsg('');
    setStep(current => Math.min(current + 1, STEPS.length - 1));
  };

  const goPrevious = () => {
    setErrorMsg('');
    setStep(current => Math.max(current - 1, 0));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Customisation</Text>
          <Text style={styles.pageSubtitle}>Tell us your preferences and we'll tailor the trip to you.</Text>
        </View>

        <View style={styles.stepHeader}>
          <Text style={styles.stepCount}>STEP {step + 1} OF {STEPS.length}</Text>
          <Text style={styles.stepTitle}>{STEPS[step].title}</Text>
          <Text style={styles.stepDescription}>{STEPS[step].description}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
          </View>
        </View>

        {step === 0 && <>
          <Text style={styles.label}>YOUR FULL NAME *</Text>
          <TextInput style={styles.input} placeholder="e.g. Rahul Sen" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} autoCapitalize="words" />
          <Text style={styles.label}>MOBILE NUMBER *</Text>
          <View style={styles.inputRow}>
            <View style={styles.dialCodeBox}><Text style={styles.dialCodeText}>🇮🇳 +91</Text></View>
            <TextInput style={[styles.input, styles.mobileInput]} placeholder="10-digit number" placeholderTextColor={COLORS.textMuted} keyboardType="phone-pad" value={mobile} onChangeText={setMobile} maxLength={10} />
          </View>
          <Text style={styles.label}>EMAIL (OPTIONAL)</Text>
          <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={COLORS.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </>}

        {step === 1 && <>
          <Text style={styles.label}>CHOOSE PACKAGE OR DESTINATION *</Text>
          <View style={styles.selectionModeRow}>
            {[
              { value: 'PACKAGE' as const, title: 'Tour package', subtitle: 'Choose a ready-made tour', icon: 'briefcase' as const },
              { value: 'DESTINATION' as const, title: 'Destination', subtitle: 'Plan from a place', icon: 'map-pin' as const },
            ].map(option => {
              const isSelected = selectionMode === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={[styles.selectionModeCard, isSelected && styles.selectionModeCardSelected]}
                  onPress={() => {
                    if (selectionMode === option.value) return;
                    setSelectionMode(option.value);
                    setPackageId('');
                    setVariantId('');
                    setDestinationId('');
                    setDestination('');
                    setTravelDate('');
                    setErrorMsg('');
                  }}
                >
                  <Feather name={option.icon} size={18} color={isSelected ? COLORS.primary : COLORS.textMuted} />
                  <View style={styles.selectionModeCopy}>
                    <Text style={[styles.selectionModeTitle, isSelected && styles.selectedText]}>{option.title}</Text>
                    <Text style={styles.selectionModeSubtitle}>{option.subtitle}</Text>
                  </View>
                  {isSelected ? <Feather name="check-circle" size={18} color={COLORS.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
          {selectionMode === 'PACKAGE' && <>
            <Text style={styles.label}>CHOOSE A PACKAGE</Text>
            <TextInput
              style={styles.input}
              value={packageSearch}
              onChangeText={setPackageSearch}
              placeholder="Search packages or destinations"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
            />
            {packagesError ? <Text style={styles.errorMessage}>{packagesError}</Text> : null}
            {packagesLoading ? (
              <View style={styles.loadingOptions}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.helperText}>Loading tour packages…</Text>
              </View>
            ) : packageOptions.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.packageList}
                keyboardShouldPersistTaps="handled"
              >
                {packageOptions.map(item => {
                  const isSelected = item.id === packageId;
                  const image = item.cover_image || item.image || item.banner?.image;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      style={[styles.packageOption, isSelected && styles.packageOptionSelected]}
                      onPress={() => {
                        if (isSelected) return;
                        setPackageId(item.id);
                        setVariantId('');
                        setDestinationId(item.destination_id || '');
                        setDestination(item.destination || item.destination_name || '');
                        setTravelDate('');
                        setErrorMsg('');
                      }}
                    >
                      {image ? (
                        <Image source={{ uri: image }} style={styles.packageOptionImage} />
                      ) : (
                        <View style={styles.packageImagePlaceholder}>
                          <Feather name="map" size={24} color={COLORS.textMuted} />
                        </View>
                      )}
                      <View style={styles.packageOptionBody}>
                        <Text style={styles.packageOptionTitle} numberOfLines={2}>{item.title || 'Tour package'}</Text>
                        <Text style={styles.packageOptionDestination} numberOfLines={1}>
                          {item.destination || item.destination_name || 'Destination details unavailable'}
                        </Text>
                        {isSelected ? <Text style={styles.selectedPackageLabel}>SELECTED</Text> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.emptyOptions}>
                {packageSearch ? 'No packages match your search.' : 'No tour packages are available right now.'}
              </Text>
            )}
            {packageId ? <>
              <Text style={styles.label}>CHOOSE A PACKAGE VARIANT</Text>
              {variantsLoading ? (
                <View style={styles.loadingOptions}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.helperText}>Loading package variants…</Text>
                </View>
              ) : null}
              {variantsError ? <Text style={styles.errorMessage}>{variantsError}</Text> : null}
              {!variantsLoading && variants.length > 0 ? (
                <View style={styles.variantList}>
                  {variants.map(item => {
                    const isSelected = item.id === variantId
                      || (!variantId && (item.is_default || item.id === variants[0]?.id));
                    const price = item.starting_price ?? item.price ?? item.selling_price;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        style={[styles.variantOption, isSelected && styles.variantOptionSelected]}
                        onPress={() => {
                          setVariantId(item.id);
                          setTravelDate('');
                          setErrorMsg('');
                        }}
                      >
                        <View style={styles.variantOptionCopy}>
                          <Text style={styles.variantOptionTitle} numberOfLines={2}>
                            {item.name || item.season_name || 'Standard variant'}
                          </Text>
                          <Text style={styles.variantOptionDetails}>
                            {item.duration_days || 0} days · {item.duration_nights || 0} nights
                            {price ? ` · From ₹${Number(price).toLocaleString('en-IN')}` : ''}
                          </Text>
                          {(item.valid_from || item.valid_to) ? (
                            <Text style={styles.variantOptionDetails}>
                              Valid {item.valid_from || 'anytime'}{item.valid_to ? ` – ${item.valid_to}` : ''}
                            </Text>
                          ) : null}
                        </View>
                        {isSelected ? <Feather name="check-circle" size={19} color={COLORS.primary} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : !variantsLoading && !variantsError ? (
                <Text style={styles.emptyOptions}>No variants are listed for this package.</Text>
              ) : null}
            </> : null}
          </>}
          {selectionMode === 'DESTINATION' && <>
            <Text style={styles.label}>CHOOSE A DESTINATION</Text>
            {destinationsError ? <Text style={styles.errorMessage}>{destinationsError}</Text> : null}
            {destinationsLoading ? (
              <View style={styles.loadingOptions}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.helperText}>Loading destinations…</Text>
              </View>
            ) : destinations.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.packageList}
              >
                {destinations.map(item => {
                  const isSelected = item.id === destinationId;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      style={[styles.packageOption, isSelected && styles.packageOptionSelected]}
                      onPress={() => {
                        if (isSelected) return;
                        setDestinationId(item.id);
                        setDestination(item.name || '');
                        setTravelDate('');
                        setErrorMsg('');
                      }}
                    >
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.packageOptionImage} />
                      ) : (
                        <View style={styles.packageImagePlaceholder}>
                          <Feather name="map-pin" size={24} color={COLORS.textMuted} />
                        </View>
                      )}
                      <View style={styles.packageOptionBody}>
                        <Text style={styles.packageOptionTitle} numberOfLines={2}>{item.name || 'Destination'}</Text>
                        <Text style={styles.packageOptionDestination} numberOfLines={1}>
                          {item.country || (item.is_domestic ? 'Domestic' : 'International')}
                        </Text>
                        {isSelected ? <Text style={styles.selectedPackageLabel}>SELECTED</Text> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.emptyOptions}>No destinations are available right now.</Text>
            )}
          </>}
        </>}

        {step === 2 && <>
          <Text style={styles.label}>PREFERRED DEPARTURE DATE</Text>
          <CustomDateField value={travelDate} onChange={setTravelDate} placeholder="Choose a departure date" title="Choose departure date" />
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>DAYS</Text>
              <TextInput style={[styles.input, isPackageEnquiry && styles.readOnlyInput]} keyboardType="numeric" value={String(resolvedTravelDurationDay)} onChangeText={setTravelDurationDay} editable={!isPackageEnquiry} selectTextOnFocus={!isPackageEnquiry} />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>NIGHTS</Text>
              <TextInput style={[styles.input, isPackageEnquiry && styles.readOnlyInput]} keyboardType="numeric" value={String(resolvedTravelDurationNight)} onChangeText={setTravelDurationNight} editable={!isPackageEnquiry} selectTextOnFocus={!isPackageEnquiry} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}><Text style={styles.label}>ADULTS</Text><TextInput style={styles.input} keyboardType="numeric" value={adultCount} onChangeText={setAdultCount} /></View>
            <View style={styles.col}><Text style={styles.label}>CHILDREN</Text><TextInput style={styles.input} keyboardType="numeric" value={childCount} onChangeText={setChildCount} /></View>
            <View style={styles.col}><Text style={styles.label}>SENIORS</Text><TextInput style={styles.input} keyboardType="numeric" value={seniorCount} onChangeText={setSeniorCount} /></View>
          </View>
        </>}

        {step === 3 && <>
          <Text style={styles.label}>ENQUIRY TYPE</Text>
          <View
            accessibilityRole="text"
            accessibilityLabel="Enquiry type: Custom Tour"
            style={styles.selectButton}
          >
            <Text style={styles.selectText}>CUSTOM TOUR</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.col}><Text style={styles.label}>ROOMS</Text><TextInput style={styles.input} keyboardType="numeric" value={noRoom} onChangeText={setNoRoom} /></View>
            <View style={styles.col}><Text style={styles.label}>VEHICLES</Text><TextInput style={styles.input} keyboardType="numeric" value={vehicleCount} onChangeText={setVehicleCount} /></View>
          </View>
          <Text style={styles.label}>HOTEL CATEGORY</Text>
          <SearchableSelect options={hotelCategoryOptions} value={hotelCategory} onChange={setHotelCategory} placeholder="Select hotel category" styles={styles} colors={COLORS} isDark={isDark} />
          <Text style={styles.label}>ROOM TYPE</Text>
          <SearchableSelect options={roomTypeOptions} value={roomType} onChange={setRoomType} placeholder="Select room type" styles={styles} colors={COLORS} isDark={isDark} />
          <Text style={styles.label}>VEHICLE TYPE</Text>
          <SearchableSelect options={[{ label: 'Any / Not Sure', value: 'ANY' }, ...vehicleOptions]} value={vehicleType} onChange={setVehicleType} placeholder="Search and select a vehicle type" styles={styles} colors={COLORS} isDark={isDark} />
          <View style={styles.row}>
            <View style={styles.col}><Text style={styles.label}>MINIMUM BUDGET</Text><TextInput style={styles.input} keyboardType="numeric" value={budgetMin} onChangeText={setBudgetMin} /></View>
            <View style={styles.col}><Text style={styles.label}>MAXIMUM BUDGET</Text><TextInput style={styles.input} keyboardType="numeric" value={budgetMax} onChangeText={setBudgetMax} /></View>
          </View>
          <Text style={styles.label}>MEAL PLAN</Text>
          <SearchableSelect options={[{ label: 'Any Plan', value: 'ANY' }, ...mealOptions]} value={mealPlan} onChange={setMealPlan} placeholder="Search and select a meal plan" styles={styles} colors={COLORS} isDark={isDark} />
          <Text style={styles.label}>SPECIAL REQUIREMENTS</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Dietary needs, pickup requests, or other preferences" placeholderTextColor={COLORS.textMuted} multiline value={specialRequirements} onChangeText={setSpecialRequirements} />
          <Text style={styles.label}>TRAVEL PLANS / PREFERENCES</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Tell us about your plans for the trip" placeholderTextColor={COLORS.textMuted} multiline value={message} onChangeText={setMessage} />
          <View style={styles.trustNote}>
            <Text style={styles.trustIcon}>✨</Text>
            <Text style={styles.trustText}>Our experienced travel experts will reach out with a tailored itinerary and quotation.</Text>
          </View>
        </>}

        {errorMsg ? <Text style={styles.errorMessage}>{errorMsg}</Text> : null}
        <View style={styles.formActions}>
          <Pressable onPress={step === 0 ? onBack : goPrevious} style={styles.stepBackButton}>
            <Text style={styles.stepBackText}>{step === 0 ? 'Cancel' : 'Back'}</Text>
          </Pressable>
          <Pressable
            onPress={step < STEPS.length - 1 ? goNext : handleSubmit}
            disabled={isSubmitting}
            style={({ pressed }) => [styles.submitBtn, isSubmitting && styles.submitBtnDisabled, pressed && !isSubmitting && styles.submitBtnPressed]}
          >
            {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitBtnText}>{step < STEPS.length - 1 ? 'Continue' : 'Send Enquiry'}</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const makeStyles = (COLORS: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    pageHeader: {
      marginBottom: 18,
    },
    stepHeader: {
      paddingVertical: 8,
      marginBottom: 8,
    },
    stepCount: {
      color: COLORS.primary,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
    },
    stepTitle: {
      color: COLORS.text,
      fontSize: 20,
      fontWeight: '900',
      marginTop: 4,
    },
    stepDescription: {
      color: COLORS.textMuted,
      fontSize: 12,
      marginTop: 3,
      marginBottom: 12,
    },
    progressTrack: {
      height: 5,
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: COLORS.surface,
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: COLORS.primary,
    },
    pageTitle: {
      fontSize: 23,
      fontWeight: '900',
      color: COLORS.text,
    },
    pageSubtitle: {
      fontSize: 13,
      color: COLORS.textSecondary,
      marginTop: 5,
      lineHeight: 19,
    },
    label: {
      fontSize: 11,
      fontWeight: '800',
      color: COLORS.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 6,
      marginTop: 14,
    },
    input: {
      backgroundColor: isDark ? COLORS.card : '#FFFFFF',
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: COLORS.text,
    },
    readOnlyInput: {
      backgroundColor: isDark ? COLORS.bg : '#F1F5F9',
      color: COLORS.textSecondary,
    },
    selectButton: {
      minHeight: 48,
      backgroundColor: isDark ? COLORS.card : '#FFFFFF',
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    selectText: {
      flex: 1,
      fontSize: 14,
      color: COLORS.text,
      marginRight: 12,
    },
    selectPlaceholder: {
      color: COLORS.textMuted,
    },
    selectArrow: {
      color: COLORS.textSecondary,
      fontSize: 19,
      lineHeight: 22,
    },
    selectBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'transparent',
    },
    selectTint: {
      ...StyleSheet.absoluteFill,
      backgroundColor: isDark ? 'rgba(0,0,0,0.12)' : 'rgba(15,23,42,0.12)',
    },
    selectDialog: {
      width: '100%',
      maxHeight: '60%',
      backgroundColor: COLORS.card,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 20,
    },
    selectDialogKeyboard: {
      height: '100%',
      maxHeight: '100%',
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      paddingBottom: 8,
    },
    selectList: {
      flexShrink: 1,
    },
    selectTitle: {
      color: COLORS.text,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 12,
    },
    selectOption: {
      minHeight: 46,
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
      paddingHorizontal: 4,
    },
    selectOptionText: {
      color: COLORS.text,
      fontSize: 14,
    },
    selectOptionActive: {
      color: COLORS.primary,
      fontWeight: '800',
    },
    selectEmpty: {
      color: COLORS.textMuted,
      textAlign: 'center',
      paddingVertical: 24,
    },
    helperText: {
      color: COLORS.textMuted,
      fontSize: 12,
      marginTop: 8,
    },
    selectionModeRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 2,
    },
    selectionModeCard: {
      flex: 1,
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 11,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
    },
    selectionModeCardSelected: {
      borderColor: COLORS.primary,
      backgroundColor: isDark ? 'rgba(20, 184, 166, 0.1)' : '#F0FDFA',
    },
    selectionModeCopy: {
      flex: 1,
    },
    selectionModeTitle: {
      color: COLORS.text,
      fontSize: 12,
      fontWeight: '800',
    },
    selectedText: {
      color: COLORS.primary,
    },
    selectionModeSubtitle: {
      color: COLORS.textMuted,
      fontSize: 10,
      lineHeight: 14,
      marginTop: 3,
    },
    loadingOptions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      minHeight: 54,
      paddingHorizontal: 12,
    },
    packageList: {
      gap: 12,
      paddingVertical: 2,
      paddingRight: 16,
    },
    packageOption: {
      width: 226,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 13,
      backgroundColor: COLORS.card,
    },
    packageOptionSelected: {
      borderColor: COLORS.primary,
      borderWidth: 2,
    },
    packageOptionImage: {
      width: '100%',
      height: 112,
      backgroundColor: COLORS.surface,
    },
    packageImagePlaceholder: {
      width: '100%',
      height: 112,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.surface,
    },
    packageOptionBody: {
      padding: 11,
    },
    packageOptionTitle: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 18,
    },
    packageOptionDestination: {
      color: COLORS.textMuted,
      fontSize: 11,
      marginTop: 4,
    },
    selectedPackageLabel: {
      color: COLORS.primary,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.8,
      marginTop: 8,
    },
    variantList: {
      gap: 9,
    },
    variantOption: {
      minHeight: 68,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 13,
      paddingVertical: 11,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
    },
    variantOptionSelected: {
      borderColor: COLORS.primary,
      backgroundColor: isDark ? 'rgba(20, 184, 166, 0.1)' : '#F0FDFA',
    },
    variantOptionCopy: {
      flex: 1,
    },
    variantOptionTitle: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: '800',
    },
    variantOptionDetails: {
      color: COLORS.textMuted,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 4,
    },
    emptyOptions: {
      color: COLORS.textMuted,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: COLORS.border,
      borderRadius: 11,
      padding: 13,
      fontSize: 12,
      marginTop: 5,
    },
    errorMessage: {
      color: COLORS.danger,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
      borderRadius: 10,
      padding: 12,
      marginTop: 14,
      fontSize: 12,
      fontWeight: '700',
    },
    inputRow: {
      flexDirection: 'row',
      gap: 8,
    },
    dialCodeBox: {
      backgroundColor: isDark ? COLORS.card : COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    dialCodeText: {
      fontSize: 13,
      fontWeight: '700',
      color: COLORS.text,
    },
    mobileInput: {
      flex: 1,
    },
    textArea: {
      minHeight: 90,
      textAlignVertical: 'top',
      paddingTop: 12,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    col: {
      flex: 1,
    },
    trustNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 18,
      marginBottom: 4,
      backgroundColor: COLORS.goldLight,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
    },
    trustIcon: {
      fontSize: 14,
      marginTop: 1,
    },
    trustText: {
      fontSize: 11,
      color: COLORS.goldDark,
      lineHeight: 16,
      flex: 1,
      fontWeight: '600',
    },
    submitBtn: {
      backgroundColor: isDark ? COLORS.gold : COLORS.primary,
      borderRadius: 10,
      minHeight: 42,
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      elevation: 2,
      shadowColor: isDark ? COLORS.gold : COLORS.primary,
      shadowOpacity: 0.3,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
    },
    formActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 24,
      marginBottom: 6,
    },
    stepBackButton: {
      minHeight: 42,
      minWidth: 72,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 10,
      paddingHorizontal: 14,
    },
    stepBackText: {
      color: COLORS.textSecondary,
      fontSize: 12,
      fontWeight: '800',
    },
    submitBtnDisabled: {
      opacity: 0.65,
    },
    submitBtnPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
    submitBtnText: {
      color: isDark ? COLORS.primaryDark : '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    submitBtnArrow: {
      color: isDark ? COLORS.primaryDark : '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },
    bottomSpacer: {
      height: 30,
    },
  });
