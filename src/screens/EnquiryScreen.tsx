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
import { createEnquiry, fetchDestinations, fetchHotels, fetchTourPackageVariants, fetchTourPackages, fetchVehicles, getVisitorId } from '../api/tourApi';
import enums from '../utils/enums.json';
import { NavScreen } from '../types';
import { CustomDateField } from '../components/CustomDatePicker';

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
const enquiryTypeOptions: ChipOption[] = Object.entries(enums.EnquiryType)
  .filter(([, v]) => {
    const val = String(v).toUpperCase().replace(/[\s_-]+/g, '');
    return val !== 'FIXEDTOUR';
  })
  .map(([, v]) => ({
    label: (v as string).replace(/_/g, ' '),
    value: v as string,
  }));

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
  const [selectionMode, setSelectionMode] = useState<'PACKAGE' | 'DESTINATION'>(
    prefilled?.packageId ? 'PACKAGE' : 'DESTINATION',
  );
  const [packages, setPackages] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [travelDate, setTravelDate] = useState(prefilled?.travelDate || '');
  const [travelDurationDay, setTravelDurationDay] = useState('');
  const [travelDurationNight, setTravelDurationNight] = useState('');
  const [adultCount, setAdultCount] = useState('4');
  const [childCount, setChildCount] = useState('0');
  const [seniorCount, setSeniorCount] = useState('0');
  const [noRoom, setNoRoom] = useState('2');
  const [vehicleCount, setVehicleCount] = useState('0');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [vehicleType, setVehicleType] = useState('ANY');
  const [hotelId, setHotelId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [hotels, setHotels] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [mealPlan, setMealPlan] = useState('ANY');
  const [message, setMessage] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [enquiryType, setEnquiryType] = useState('CUSTOM_TOUR');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  React.useEffect(() => {
    fetchTourPackages(1, 50).then(setPackages).catch(() => setPackages([]));
    fetchDestinations(1, 100).then(setDestinations).catch(() => setDestinations([]));
  }, []);

  React.useEffect(() => {
    const packageRef = selectedPackage?.slug || (selectedPackage ? packageId : '');
    if (!packageRef) {
      setVariants([]);
      return;
    }
    fetchTourPackageVariants(packageRef)
      .then(result => {
        setVariants(result.variants);
        const current = result.variants.find(item =>
          item.id === variantId || item.key === variantId || item.name === variantId,
        );
        if (current && current.id !== variantId) setVariantId(current.id);
        else if (!current && result.variants.length > 0) {
          const defaultVariant = result.variants.find(item => item.is_default) || result.variants[0];
          setVariantId(defaultVariant.id);
        }
      })
      .catch(() => setVariants([]));
  }, [packageId, packages, selectedPackage, variantId]);

  React.useEffect(() => {
    if (!destinationId) {
      setHotels([]);
      setVehicles([]);
      return;
    }
    Promise.all([fetchHotels(1, 20, destinationId), fetchVehicles(1, 20)]).then(([hotelResponse, vehicleResponse]) => {
      setHotels(Array.isArray(hotelResponse.data) ? hotelResponse.data : []);
      setVehicles(Array.isArray(vehicleResponse.data) ? vehicleResponse.data : []);
    }).catch(() => {
      setHotels([]);
      setVehicles([]);
    });
  }, [destinationId]);

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
    setSelectionMode(prefilled?.packageId ? 'PACKAGE' : 'DESTINATION');
    setTravelDate('');
    setTravelDurationDay('');
    setTravelDurationNight('');
    setAdultCount('4');
    setChildCount('0');
    setSeniorCount('0');
    setNoRoom('2');
    setVehicleCount('0');
    setBudgetMin('');
    setBudgetMax('');
    setVehicleType('ANY');
    setHotelId('');
    setVehicleId('');
    setMealPlan('ANY');
    setMessage('');
    setSpecialRequirements('');
    setEnquiryType('CUSTOM_TOUR');
  };

  const handleSubmit = async () => {
    if (!name.trim() || !mobile.trim() || !destinationId) {
      await showDialog({
        title: 'Required Fields Missing',
        message: 'Please fill in your Name, Mobile Number, and Destination.',
        variant: 'warning',
      });
      return;
    }
    if (mobile.trim().length < 10) {
      await showDialog({
        title: 'Invalid Mobile Number',
        message: 'Please enter a valid 10-digit mobile number.',
        variant: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const visitor_id = await getVisitorId();
      const payload = {
        enquiry_type: enquiryType,
        channel: 'APP',
        visitor_id,
        customer_id: initialUser?.id || '',
        package_id: packageId,
        variant_id: variantId.trim(),
        destination_id: destinationId,
        message: message.trim(),
        name: name.trim(),
        phone: mobile.trim(),
        email: email.trim(),
        travel_date: travelDate.trim(),
        travel_duration_day: resolvedTravelDurationDay,
        travel_duration_night: resolvedTravelDurationNight,
        adult_count: Number(adultCount) || 0,
        child_count: Number(childCount) || 0,
        senior_count: Number(seniorCount) || 0,
        hotel_id: hotelId,
        vehicle_id: vehicleId,
        room_count: Number(noRoom) || 0,
        vehicle_count: Number(vehicleCount) || 0,
        budget_min: Number(budgetMin) || 0,
        budget_max: Number(budgetMax) || 0,
        special_requirements: specialRequirements.trim(),
        meal_plan: mealPlan || 'ANY',
      };

      const result = await createEnquiry(payload);
      if (onEnquirySubmitted) onEnquirySubmitted(result);

      await showDialog({
        title: 'Enquiry Received! 🌟',
        message: `Thank you ${name}! Our holiday specialist will design a personalized itinerary for ${destination} and contact you on ${mobile} within 24 hours.`,
        variant: 'success',
        confirmText: 'Great!',
      });
      resetForm();
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
              {prefilled?.tourTitle ? `Request a quote for ${prefilled.tourTitle}` : 'Tailor-make your holiday with hotels, cabs, meals & custom itinerary'}
            </Text>
          </View>
        </View>

        {/* Enquiry Type Selector */}
        <Text style={styles.label}>ENQUIRY TYPE</Text>
        <SearchableSelect
          options={enquiryTypeOptions}
          value={enquiryType}
          onChange={setEnquiryType}
          placeholder="Select enquiry type"
          styles={styles}
          colors={COLORS}
          isDark={isDark}
        />

        {/* Full Name */}
        <Text style={styles.label}>YOUR FULL NAME *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Rahul Sen"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        {/* Mobile Number */}
        <Text style={styles.label}>MOBILE NUMBER *</Text>
        <View style={styles.inputRow}>
          <View style={styles.dialCodeBox}>
            <Text style={styles.dialCodeText}>🇮🇳 +91</Text>
          </View>
          <TextInput
            style={[styles.input, styles.mobileInput]}
            placeholder="10-digit number"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            value={mobile}
            onChangeText={setMobile}
            maxLength={10}
          />
        </View>

        <Text style={styles.label}>EMAIL (OPTIONAL)</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={COLORS.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Package or destination first */}
        <Text style={styles.label}>CHOOSE PACKAGE OR DESTINATION *</Text>
        <SearchableSelect
          options={[{ label: 'Package', value: 'PACKAGE' }, { label: 'Destination', value: 'DESTINATION' }]}
          value={selectionMode}
          onChange={choice => {
            setSelectionMode(choice as 'PACKAGE' | 'DESTINATION');
            setPackageId('');
            setVariantId('');
            setDestinationId('');
            setDestination('');
          }}
          placeholder="Choose package or destination"
          styles={styles}
          colors={COLORS}
          isDark={isDark}
        />
        {selectionMode === 'PACKAGE' ? <>
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
          }}
          placeholder="Search and select a package"
          styles={styles}
          colors={COLORS}
          isDark={isDark}
        />
        {variants.length > 0 ? <>
          <Text style={styles.label}>TOUR VARIANT (OPTIONAL)</Text>
          <SearchableSelect
            options={variants.map(item => ({label: item.name || item.season_name || 'Tour variant', value: item.id}))}
            value={variantId}
            onChange={setVariantId}
            placeholder="Search and select a tour variant"
            styles={styles}
            colors={COLORS}
            isDark={isDark}
          />
        </> : null}
        </> : null}
        {selectionMode === 'DESTINATION' ? <>
        <Text style={styles.label}>DESTINATION</Text>
        <SearchableSelect
          options={destinations.map(item => ({label: item.name || item.destination_name || 'Destination', value: item.id}))}
          value={destinationId}
          onChange={value => {
            const item = destinations.find(entry => entry.id === value);
            setDestinationId(value);
            setDestination(item?.name || item?.destination_name || '');
          }}
          placeholder="Search and select a destination"
          styles={styles}
          colors={COLORS}
          isDark={isDark}
        />
        </> : null}

        {/* Travel Date & Duration */}
        <Text style={styles.label}>TRAVEL DATE</Text>
        <CustomDateField
          value={travelDate}
          onChange={setTravelDate}
          placeholder="Select travel date"
          title="Select travel date"
        />
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>DAYS</Text>
            <TextInput
              style={[styles.input, isPackageEnquiry && styles.readOnlyInput]}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={String(resolvedTravelDurationDay)}
              onChangeText={setTravelDurationDay}
              editable={!isPackageEnquiry}
              selectTextOnFocus={!isPackageEnquiry}
              accessibilityLabel={isPackageEnquiry ? 'Package duration in days, read only' : 'Travel duration in days'}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>NIGHTS</Text>
            <TextInput
              style={[styles.input, isPackageEnquiry && styles.readOnlyInput]}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={String(resolvedTravelDurationNight)}
              onChangeText={setTravelDurationNight}
              editable={!isPackageEnquiry}
              selectTextOnFocus={!isPackageEnquiry}
              accessibilityLabel={isPackageEnquiry ? 'Package duration in nights, read only' : 'Travel duration in nights'}
            />
          </View>
        </View>

        {/* Traveller and room counts */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>ADULTS</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={adultCount}
              onChangeText={setAdultCount}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>CHILDREN</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={childCount}
              onChangeText={setChildCount}
            />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>SENIORS</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={seniorCount}
              onChangeText={setSeniorCount}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>ROOMS</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={noRoom}
              onChangeText={setNoRoom}
            />
          </View>
        </View>
        <Text style={styles.label}>VEHICLES</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          value={vehicleCount}
          onChangeText={setVehicleCount}
        />

        {/* Preferred Vehicle */}
        <Text style={styles.label}>VEHICLE TYPE</Text>
        <SearchableSelect
          options={[{ label: 'Any / Not Sure', value: 'ANY' }, ...vehicleOptions]}
          value={vehicleType}
          onChange={setVehicleType}
          placeholder="Search and select a vehicle type"
          styles={styles}
          colors={COLORS}
          isDark={isDark}
        />

        <Text style={styles.label}>PREFERRED HOTEL</Text>
        <SearchableSelect
          options={[{ label: 'Any / Not Sure', value: '' }, ...hotels.map(hotel => ({ label: hotel.name, value: hotel.id }))]}
          value={hotelId}
          onChange={setHotelId}
          placeholder="Search and select a hotel"
          styles={styles}
          colors={COLORS}
          isDark={isDark}
        />

        <Text style={styles.label}>PREFERRED VEHICLE</Text>
        <SearchableSelect
          options={[{ label: 'Any / Not Sure', value: '' }, ...vehicles.map(vehicle => ({ label: `${vehicle.name}${vehicle.capacity ? ` · ${vehicle.capacity} seats` : ''}`, value: vehicle.id }))]}
          value={vehicleId}
          onChange={value => {
            setVehicleId(value);
            if (value && Number(vehicleCount) === 0) setVehicleCount('1');
          }}
          placeholder="Search and select a vehicle"
          styles={styles}
          colors={COLORS}
          isDark={isDark}
        />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>MINIMUM BUDGET</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={budgetMin}
              onChangeText={setBudgetMin}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>MAXIMUM BUDGET</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={budgetMax}
              onChangeText={setBudgetMax}
            />
          </View>
        </View>

        {/* Meal Plan */}
        <Text style={styles.label}>MEAL PLAN</Text>
        <SearchableSelect
          options={[{ label: 'Any Plan', value: 'ANY' }, ...mealOptions]}
          value={mealPlan}
          onChange={setMealPlan}
          placeholder="Search and select a meal plan"
          styles={styles}
          colors={COLORS}
          isDark={isDark}
        />

        <Text style={styles.label}>MESSAGE (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add a message for our travel team"
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={message}
          onChangeText={setMessage}
        />

        {/* Special Requirements */}
        <Text style={styles.label}>SPECIAL REQUIREMENTS (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g. Honeymoon setup, pure veg meals, senior citizen friendly, airport transfers..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={specialRequirements}
          onChangeText={setSpecialRequirements}
        />

        {/* Trust Note */}
        <View style={styles.trustNote}>
          <Text style={styles.trustIcon}>✨</Text>
          <Text style={styles.trustText}>
            Our experienced travel experts will reach out to you within 24 hours with a tailored itinerary and transparent quotation.
          </Text>
        </View>

        {/* Submit button */}
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.submitBtn,
            isSubmitting && styles.submitBtnDisabled,
            pressed && !isSubmitting && styles.submitBtnPressed,
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Submit Custom Enquiry</Text>
              <Text style={styles.submitBtnArrow}>→</Text>
            </>
          )}
        </Pressable>

        <View style={styles.bottomSpacer} />
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
