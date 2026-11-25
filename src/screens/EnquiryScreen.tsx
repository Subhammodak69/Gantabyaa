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
import { fetchDestinations, fetchTourPackageVariants, fetchTourPackages, openWhatsAppChat } from '../api/tourApi';
import enums from '../utils/enums.json';
import { NavScreen } from '../types';

interface EnquiryScreenProps {
  onBack: () => void;
  onNavigate?: (screen: NavScreen) => void;
  onEnquirySubmitted?: (enquiry: any) => void;
  user?: import('../api/tourApi').AuthUser | null;
  prefilled?: {
    tourTitle?: string;
    packageId?: string;
    destinationId?: string;
    destinationName?: string;
    variantId?: string;
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

function departureDateLabel(value: string): string {
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
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
const enquiryTypeOptions: ChipOption[] = Object.entries(enums.EnquiryType)
  .filter(([, v]) => {
    const val = String(v).toUpperCase().replace(/[\s_-]+/g, '');
    return val !== 'FIXEDTOUR';
  })
  .map(([, v]) => ({
    label: (v as string).replace(/_/g, ' '),
    value: v as string,
  }));
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
  const [destinations, setDestinations] = useState<any[]>([]);
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
  const [enquiryType, setEnquiryType] = useState('CUSTOM_TOUR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantsError, setVariantsError] = useState('');
  const selectedPackage = packages.find(item => item.id === packageId);
  const selectedVariant = variants.find(item =>
    item.id === variantId || item.key === variantId || item.name === variantId,
  ) || variants.find(item => item.is_default) || variants[0];
  const isPackageEnquiry = selectionMode === 'PACKAGE' && Boolean(packageId);
  const usesPrefilledVariant = packageId === prefilled?.packageId && variantId === prefilled?.variantId;
  const resolvedTravelDurationDay = isPackageEnquiry
    ? durationNumber(selectedVariant?.duration_days) ?? (usesPrefilledVariant ? durationNumber(prefilled?.durationDays) : undefined) ?? durationNumber(selectedPackage?.duration_days) ?? 0
    : Number(travelDurationDay) || 0;
  const resolvedTravelDurationNight = isPackageEnquiry
    ? durationNumber(selectedVariant?.duration_nights) ?? (usesPrefilledVariant ? durationNumber(prefilled?.durationNights) : undefined) ?? durationNumber(selectedPackage?.duration_nights) ?? 0
    : Number(travelDurationNight) || 0;
  const departureDateOptions = (selectedVariant?.dates || [])
    .filter((item: any) => item.date || item.departure_date)
    .map((item: any) => {
      const value = item.date || item.departure_date || '';
      return { label: item.return_date ? `${departureDateLabel(value)} – ${departureDateLabel(item.return_date)}` : departureDateLabel(value), value };
    });
  const selectionIsValid = selectionMode === 'PACKAGE'
    ? Boolean(packageId) && !variantsLoading && (!variants.length || Boolean(selectedVariant))
    : selectionMode === 'DESTINATION' && Boolean(destinationId);
  const contactIsValid = Boolean(name.trim()) && mobile.replace(/\D/g, '').length >= 10;

  React.useEffect(() => {
    fetchTourPackages(1, 50).then(setPackages).catch(() => setPackages([]));
    fetchDestinations(1, 100).then(setDestinations).catch(() => setDestinations([]));
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
    setEnquiryType('CUSTOM_TOUR');
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
        `Variant: ${selectedVariant?.name || selectedVariant?.season_name || 'Not selected'}`,
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
        selectedVariant?.cover_image
          ? `Package image: ${selectedVariant.cover_image}`
          : (selectedPackage?.image || selectedPackage?.cover_image
            ? `Package image: ${selectedPackage.image || selectedPackage.cover_image}`
            : ''),
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
      <View style={styles.navigationHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          onPress={onBack}
        >
          <Feather name="arrow-left" size={21} color={COLORS.text} />
        </Pressable>
        <View style={styles.navigationHeaderCopy}>
          <Text style={styles.navigationTitle}>Enquiry</Text>
          <Text style={styles.navigationSubtitle}>Plan your next journey</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header summary card */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.headerIcon}>🎨</Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.pageTitle}>{prefilled?.tourTitle ? 'Send your enquiry' : 'Custom Package Enquiry'}</Text>
            <Text style={styles.pageSubtitle}>
              {prefilled?.tourTitle ? `Request a quote for ${prefilled.tourTitle}` : 'Tailor-make your holiday with vehicles, meals & custom itinerary'}
            </Text>
          </View>
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
          <SearchableSelect
            options={[{ label: 'Choose a destination', value: 'DESTINATION' }, { label: 'Choose a tour package', value: 'PACKAGE' }]}
            value={selectionMode}
            onChange={choice => {
              setSelectionMode(choice as 'PACKAGE' | 'DESTINATION');
              setPackageId('');
              setVariantId('');
              setDestinationId('');
              setDestination('');
              setTravelDate('');
              setErrorMsg('');
            }}
            placeholder="Choose package or destination"
            styles={styles}
            colors={COLORS}
            isDark={isDark}
          />
          {selectionMode === 'PACKAGE' && <>
            <Text style={styles.label}>PACKAGE</Text>
            <SearchableSelect
              options={packages.map(item => ({ label: item.title || item.destination || 'Tour package', value: item.id }))}
              value={packageId}
              onChange={value => {
                const item = packages.find(entry => entry.id === value);
                setPackageId(value);
                setVariantId('');
                setDestinationId(item?.destination_id || '');
                setDestination(item?.destination || item?.destination_name || '');
                setTravelDate('');
              }}
              placeholder="Search and select a package"
              styles={styles}
              colors={COLORS}
              isDark={isDark}
            />
            {variantsLoading ? <Text style={styles.helperText}>Loading package variants…</Text> : null}
            {variantsError ? <Text style={styles.errorMessage}>{variantsError}</Text> : null}
            {!variantsLoading && variants.length > 0 && <>
              <Text style={styles.label}>TOUR VARIANT</Text>
              <SearchableSelect
                options={variants.map(item => ({ label: item.name || item.season_name || 'Tour variant', value: item.id }))}
                value={selectedVariant?.id || ''}
                onChange={value => {
                  setVariantId(value);
                  setTravelDate('');
                  setErrorMsg('');
                }}
                placeholder="Search and select a tour variant"
                styles={styles}
                colors={COLORS}
                isDark={isDark}
              />
            </>}
          </>}
          {selectionMode === 'DESTINATION' && <>
            <Text style={styles.label}>DESTINATION</Text>
            <SearchableSelect
              options={destinations.map(item => ({ label: item.name || item.destination_name || 'Destination', value: item.id }))}
              value={destinationId}
              onChange={value => {
                const item = destinations.find(entry => entry.id === value);
                setDestinationId(value);
                setDestination(item?.name || item?.destination_name || '');
                setErrorMsg('');
              }}
              placeholder="Search and select a destination"
              styles={styles}
              colors={COLORS}
              isDark={isDark}
            />
          </>}
        </>}

        {step === 2 && <>
          <Text style={styles.label}>PREFERRED DEPARTURE DATE</Text>
          {variantsLoading ? (
            <Text style={styles.helperText}>Loading package dates…</Text>
          ) : departureDateOptions.length > 0 ? (
            <SearchableSelect options={departureDateOptions} value={travelDate} onChange={setTravelDate} placeholder="Select departure date" styles={styles} colors={COLORS} isDark={isDark} />
          ) : (
            <CustomDateField value={travelDate} onChange={setTravelDate} placeholder="Choose a departure date" title="Choose departure date" />
          )}
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
          <SearchableSelect options={enquiryTypeOptions} value={enquiryType} onChange={setEnquiryType} placeholder="Select enquiry type" styles={styles} colors={COLORS} isDark={isDark} />
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
      </ScrollView>
      <View style={styles.stepFooter}>
        <Pressable onPress={step === 0 ? onBack : goPrevious} style={styles.stepBackButton}>
          <Text style={styles.stepBackText}>{step === 0 ? 'Cancel' : 'Back'}</Text>
        </Pressable>
        <Pressable
          onPress={step < STEPS.length - 1 ? goNext : handleSubmit}
          disabled={isSubmitting}
          style={({ pressed }) => [styles.submitBtn, styles.stepContinueButton, isSubmitting && styles.submitBtnDisabled, pressed && !isSubmitting && styles.submitBtnPressed]}
        >
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitBtnText}>{step < STEPS.length - 1 ? 'Continue' : 'Prepare WhatsApp enquiry'}</Text>}
        </Pressable>
      </View>
    </View>
  );
};

const makeStyles = (COLORS: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    navigationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      backgroundColor: COLORS.card,
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.surface,
      marginRight: 11,
    },
    navigationHeaderCopy: {
      flex: 1,
    },
    navigationTitle: {
      color: COLORS.text,
      fontSize: 17,
      fontWeight: '900',
    },
    navigationSubtitle: {
      color: COLORS.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    headerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
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
    headerIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: isDark ? '#0F3B32' : '#DCFCE7',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    headerIcon: {
      fontSize: 24,
    },
    headerTextContainer: {
      flex: 1,
    },
    pageTitle: {
      fontSize: 18,
      fontWeight: '900',
      color: COLORS.text,
    },
    pageSubtitle: {
      fontSize: 12,
      color: COLORS.textSecondary,
      marginTop: 2,
      lineHeight: 16,
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
      borderRadius: 12,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 20,
      elevation: 3,
      shadowColor: isDark ? COLORS.gold : COLORS.primary,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    stepFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      backgroundColor: COLORS.card,
    },
    stepBackButton: {
      minHeight: 48,
      minWidth: 82,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      paddingHorizontal: 16,
    },
    stepBackText: {
      color: COLORS.textSecondary,
      fontSize: 14,
      fontWeight: '800',
    },
    stepContinueButton: {
      flex: 1,
      minHeight: 48,
      marginTop: 0,
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
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.3,
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
