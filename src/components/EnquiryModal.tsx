import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useColors } from '../theme/theme';
import { useAppDialog } from './AppDialog';
import {
  getAccessToken,
  fetchTourPackageVariants,
  fetchMe,
  AuthUser,
  openWhatsAppChat,
} from '../api/tourApi';
import { TourPackageSummary } from '../types';
import enums from '../utils/enums.json';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = (val?: string) => typeof val === 'string' && UUID_REGEX.test(val.trim());
const vehicleTypeOptions = [
  { label: 'Any / Not Sure', value: 'ANY' },
  ...Object.values(enums.VehicleType || {}).map(value => ({ label: String(value), value: String(value) })),
];
const hotelCategoryOptions = [
  { label: 'Budget', value: 'BUDGET' },
  { label: 'Standard', value: 'STANDARD' },
  { label: 'Deluxe', value: 'DELUXE' },
  { label: 'Luxury', value: 'LUXURY' },
];
const roomTypeOptions = [
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
const mealPlanOptions = [
  { label: 'Any plan', value: 'ANY' },
  ...Object.values(enums.MealPlan || {}).map(value => ({ label: String(value), value: String(value) })),
];
const STEPS = [
  { title: 'Contact details', description: 'Who should we contact?' },
  { title: 'Travel plans', description: 'Dates and travellers' },
  { title: 'Preferences', description: 'Stay, transport and budget' },
];

const departureDateLabel = (value: string) => {
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

function ChipSelector({
  options,
  value,
  onChange,
  styles,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  styles: any;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
      {options.map(option => (
        <Pressable
          key={option.value || option.label}
          onPress={() => onChange(option.value)}
          style={[styles.chip, value === option.value && styles.chipActive]}
        >
          <Text style={[styles.chipText, value === option.value && styles.chipTextActive]}>{option.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

interface EnquiryModalProps {
  visible: boolean;
  onClose: () => void;
  tour?: TourPackageSummary | null;
  packageId?: string;
  variantId?: string;
  destinationId?: string;
  travelDate?: string;
  departureDates?: any[];
  user?: AuthUser | null;
}

export const EnquiryModal: React.FC<EnquiryModalProps> = ({
  visible,
  onClose,
  tour,
  packageId,
  variantId,
  travelDate = '',
  departureDates = [],
  user: initialUser,
}) => {
  const COLORS = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(COLORS);
  const { showDialog } = useAppDialog();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [selectedTravelDate, setSelectedTravelDate] = useState(travelDate);
  const [vehicleType, setVehicleType] = useState('ANY');
  const [adultCount, setAdultCount] = useState('1');
  const [childCount, setChildCount] = useState('0');
  const [seniorCount, setSeniorCount] = useState('0');
  const [roomCount, setRoomCount] = useState('0');
  const [vehicleCount, setVehicleCount] = useState('0');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [hotelCategory, setHotelCategory] = useState('');
  const [roomType, setRoomType] = useState('');
  const [mealPlan, setMealPlan] = useState('ANY');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(0);

  // Variants loaded from /api/v1/tour-packages/{tour_slug}/variants
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [loadingSelect, setLoadingSelect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedVariant = variants.find(item => item.id === selectedVariantId)
    || (selectedVariantId ? { id: selectedVariantId, dates: departureDates } : undefined);
  const travelDurationDay = Number(selectedVariant?.duration_days || tour?.duration_days || 0);
  const travelDurationNight = Number(selectedVariant?.duration_nights || tour?.duration_nights || 0);
  const departureDateOptions = (selectedVariant?.dates || [])
    .filter((item: any) => item.date || item.departure_date)
    .map((item: any) => {
      const value = item.date || item.departure_date || '';
      return {
        label: item.return_date ? `${departureDateLabel(value)} – ${departureDateLabel(item.return_date)}` : departureDateLabel(value),
        value,
      };
    });

  useEffect(() => {
    if (!visible) return;
    setSelectedTravelDate(travelDate || '');
    setStep(0);

    // 1. Pre-fill user profile information when available.
    (async () => {
      if (initialUser) {
        setName(initialUser.name || '');
        setMobile(initialUser.mobile || '');
        setEmail(initialUser.email || '');
      } else {
        try {
          const token = await getAccessToken();
          if (token) {
            const meRes = await fetchMe();
            if (meRes.data) {
              setName(prev => prev || meRes.data?.name || '');
              setMobile(prev => prev || meRes.data?.mobile || '');
              setEmail(prev => prev || meRes.data?.email || '');
            }
          }
        } catch {
          // guest user
        }
      }
    })();

    // 2. Fetch package variants using the public slug-based endpoint.
    const tourSlug = tour?.slug || (packageId && !isValidUUID(packageId) ? packageId : '');
    if (tourSlug) {
      setLoadingSelect(true);
      fetchTourPackageVariants(tourSlug)
        .then(result => {
          const loadedVariants = result.variants.map(item => (
            item.id === variantId && departureDates.length > 0
              ? { ...item, dates: departureDates }
              : item
          ));
          setVariants(loadedVariants);
          // Pre-select variant
          if (variantId && loadedVariants.some(v => v.id === variantId || v.name === variantId || v.key === variantId)) {
            const match = loadedVariants.find(v => v.id === variantId || v.name === variantId || v.key === variantId);
            if (match) setSelectedVariantId(match.id);
          } else if (loadedVariants.length > 0) {
            setSelectedVariantId(loadedVariants[0].id);
          }
        })
        .catch(() => {
          setVariants([]);
        })
        .finally(() => {
          setLoadingSelect(false);
        });
    } else {
      setVariants([]);
    }

    // 3. Pre-fill subject
    if (tour) {
      setSubject(`Enquiry about ${tour.title}`);
    } else {
      setSubject('');
    }
  }, [visible, tour, packageId, variantId, initialUser, travelDate, departureDates]);

  const resetForm = () => {
    setName('');
    setMobile('');
    setEmail('');
    setSelectedTravelDate('');
    setVehicleType('ANY');
    setAdultCount('1');
    setChildCount('0');
    setSeniorCount('0');
    setRoomCount('0');
    setVehicleCount('0');
    setBudgetMin('');
    setBudgetMax('');
    setHotelCategory('');
    setRoomType('');
    setMealPlan('ANY');
    setSpecialRequirements('');
    setSubject('');
    setMessage('');
    setVariants([]);
    setSelectedVariantId('');
    setStep(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      await showDialog({ title: 'Name Required', message: 'Please enter your full name.', variant: 'warning' });
      return;
    }
    if (!mobile.trim() || mobile.trim().length < 10) {
      await showDialog({ title: 'Mobile Required', message: 'Please enter a valid 10-digit mobile number.', variant: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      const confirmed = await showDialog({
        title: 'Confirm enquiry',
        message: `Open WhatsApp with your enquiry for ${tour?.title || 'this tour'}?`,
        variant: 'info',
        confirmText: 'Open WhatsApp',
        cancelText: 'Edit',
      });
      if (!confirmed) {
        setIsSubmitting(false);
        return;
      }

      const chosenVariant = variants.find(item => item.id === selectedVariantId);
      const selectedVariantName = chosenVariant?.name || chosenVariant?.season_name || 'Selected package option';
      const imageUrl = chosenVariant?.cover_image || chosenVariant?.banner?.image || tour?.cover_image || '';
      const whatsappMessage = [
        'Hello Gantabyaa team! 👋',
        '',
        'I would like to customise this tour package:',
        `Package: ${tour?.title || 'Tour package'}`,
        `Destination: ${tour?.destination || 'Not specified'}`,
        `Variant: ${selectedVariantName}`,
        `Departure date: ${selectedTravelDate || travelDate || 'Not selected'}`,
        `Full name: ${name.trim()}`,
        `Mobile / WhatsApp: ${mobile.trim()}`,
        `Email: ${email.trim() || 'Not provided'}`,
        `Travellers: Adults ${adultCount || 0}, Children ${childCount || 0}, Seniors ${seniorCount || 0}`,
        `Travel duration: ${travelDurationDay} days / ${travelDurationNight} nights`,
        `Rooms: ${roomCount || 0}`,
        `Hotel category: ${hotelCategoryOptions.find(option => option.value === hotelCategory)?.label || 'Not selected'}`,
        `Room type: ${roomTypeOptions.find(option => option.value === roomType)?.label || 'Not selected'}`,
        `Vehicle type: ${vehicleType || 'ANY'}`,
        `Vehicles: ${vehicleCount || 0}`,
        `Budget: ${budgetMin || 0} - ${budgetMax || 0}`,
        `Meal plan: ${mealPlan || 'ANY'}`,
        `Subject: ${subject.trim() || 'Not provided'}`,
        `Special requirements: ${specialRequirements.trim() || 'None'}`,
        `Travel plans / preferences: ${message.trim() || 'None'}`,
        imageUrl ? `Package banner: ${imageUrl}` : '',
        '',
        'Please share availability, pricing and booking details.',
      ].filter(Boolean).join('\n');

      await showDialog({
        title: 'Enquiry Ready in WhatsApp! 🎉',
        message: 'Your enquiry details are prepared in WhatsApp. Please press Send to share them with our travel team.',
        variant: 'success',
        confirmText: 'Done',
      });
      handleClose();
      openWhatsAppChat(whatsappMessage);
    } catch (error: any) {
      await showDialog({
        title: 'Could not send enquiry',
        message: error?.message || 'Please try again.',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goNext = async () => {
    if (step === 0 && (!name.trim() || !mobile.trim() || mobile.trim().length < 10)) {
      await showDialog({
        title: !name.trim() ? 'Name Required' : 'Mobile Required',
        message: !name.trim() ? 'Please enter your full name.' : 'Please enter a valid 10-digit mobile number.',
        variant: 'warning',
      });
      return;
    }
    setStep(current => Math.min(current + 1, STEPS.length - 1));
  };

  const goPrevious = () => setStep(current => Math.max(current - 1, 0));

  return (
    <Modal visible={visible} animationType="slide" transparent={false} presentationStyle="fullScreen" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.keyboardAvoid}
      >
        <View style={styles.sheet}>
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <Pressable
              onPress={handleClose}
              style={styles.backBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Feather name="arrow-left" size={20} color={COLORS.text} />
            </Pressable>
            <View style={styles.headerLeft}>
              <View>
                <Text style={styles.headerTitle}>Holiday enquiry</Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {tour?.title || 'Get in touch with our team'}
                </Text>
              </View>
            </View>
          </View>

          {/* Tour info chip */}
          {tour && (
            <View style={styles.tourChip}>
              <Text style={styles.tourChipLabel}>📍 {tour.destination}</Text>
              {tour.starting_price ? (
                <Text style={styles.tourChipPrice}>
                  from ₹{Number(tour.starting_price).toLocaleString('en-IN')}
                </Text>
              ) : null}
            </View>
          )}

          <View style={styles.progressContainer}>
            <View style={styles.progressCopy}>
              <Text style={styles.progressStep}>STEP {step + 1} OF {STEPS.length}</Text>
              <Text style={styles.progressTitle}>{STEPS[step].title}</Text>
              <Text style={styles.progressDescription}>{STEPS[step].description}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
            </View>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 0 && (
              <>
                <Text style={styles.label}>YOUR NAME *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Rahul Sen"
                  placeholderTextColor={COLORS.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
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
                    returnKeyType="next"
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
              </>
            )}

            {step === 1 && (
              <>
                <Text style={styles.label}>DEPARTURE DATE</Text>
                {loadingSelect ? (
                  <View style={styles.loadingVariantsRow}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loadingVariantsText}>Loading package details…</Text>
                  </View>
                ) : departureDateOptions.length > 0 ? (
                  <ChipSelector options={departureDateOptions} value={selectedTravelDate} onChange={setSelectedTravelDate} styles={styles} />
                ) : (
                  <Text style={styles.loadingVariantsText}>No departure dates are listed for this package.</Text>
                )}
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>TRAVEL DURATION (DAYS)</Text>
                    <Text style={styles.readOnlyValue}>{travelDurationDay}</Text>
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>TRAVEL DURATION (NIGHTS)</Text>
                    <Text style={styles.readOnlyValue}>{travelDurationNight}</Text>
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>ADULTS</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={adultCount} onChangeText={setAdultCount} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>CHILDREN</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={childCount} onChangeText={setChildCount} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>SENIORS</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={seniorCount} onChangeText={setSeniorCount} />
                  </View>
                </View>
              </>
            )}

            {step === 2 && (
              <>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>ROOMS</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={roomCount} onChangeText={setRoomCount} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>VEHICLES</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={vehicleCount} onChangeText={setVehicleCount} />
                  </View>
                </View>
                <Text style={styles.label}>HOTEL CATEGORY</Text>
                <ChipSelector options={hotelCategoryOptions} value={hotelCategory} onChange={setHotelCategory} styles={styles} />
                <Text style={styles.label}>ROOM TYPE</Text>
                <ChipSelector options={roomTypeOptions} value={roomType} onChange={setRoomType} styles={styles} />
                <Text style={styles.label}>VEHICLE TYPE</Text>
                <ChipSelector options={vehicleTypeOptions} value={vehicleType} onChange={setVehicleType} styles={styles} />
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>MINIMUM BUDGET</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={budgetMin} onChangeText={setBudgetMin} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>MAXIMUM BUDGET</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={budgetMax} onChangeText={setBudgetMax} />
                  </View>
                </View>
                <Text style={styles.label}>MEAL PLAN</Text>
                <ChipSelector options={mealPlanOptions} value={mealPlan} onChange={setMealPlan} styles={styles} />
                <Text style={styles.label}>SUBJECT</Text>
                <TextInput style={styles.input} placeholder="e.g. Group booking enquiry" placeholderTextColor={COLORS.textMuted} value={subject} onChangeText={setSubject} />
                <Text style={styles.label}>SPECIAL REQUIREMENTS</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Dietary needs, pickup requests, or other preferences"
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  value={specialRequirements}
                  onChangeText={setSpecialRequirements}
                />
                <Text style={styles.label}>TRAVEL PLANS & PREFERENCES</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell us about your plans or specific requirements"
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  value={message}
                  onChangeText={setMessage}
                />
                <View style={styles.trustBox}>
                  <Text style={styles.trustIcon}>🔒</Text>
                  <Text style={styles.trustText}>Your details are safe. We will only contact you regarding this tour request.</Text>
                </View>
              </>
            )}
          </ScrollView>
          <View style={[styles.stepFooter, { paddingBottom: 20 + insets.bottom }]}>
            <Pressable onPress={step === 0 ? handleClose : goPrevious} style={styles.stepBackBtn}>
              <Text style={styles.stepBackText}>{step === 0 ? 'Cancel' : 'Back'}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                styles.stepNextBtn,
                isSubmitting && styles.submitBtnDisabled,
                pressed && !isSubmitting && styles.submitBtnPressed,
              ]}
              onPress={step < STEPS.length - 1 ? goNext : handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                <Text style={styles.submitBtnText}>{step < STEPS.length - 1 ? 'Continue' : 'Prepare WhatsApp enquiry'}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeStyles = (COLORS: ReturnType<typeof useColors>) => StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  sheet: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerIconText: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tourChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.primarySubtle,
    borderRadius: 10,
  },
  tourChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tourChipPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressCopy: {
    marginBottom: 12,
  },
  progressStep: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: COLORS.primary,
  },
  progressTitle: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },
  progressDescription: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressTrack: {
    height: 5,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: COLORS.surface,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  loadingVariantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  loadingVariantsText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  chipTextActive: {
    color: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  readOnlyValue: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  chipSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  chipSubActive: {
    color: COLORS.primary,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dialCodeBox: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
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
    minHeight: 75,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  trustBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 10,
  },
  trustIcon: {
    fontSize: 13,
  },
  trustText: {
    fontSize: 11,
    color: COLORS.textMuted,
    flex: 1,
    lineHeight: 15,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    elevation: 3,
    shadowColor: COLORS.primary,
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  submitBtnArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  stepFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  stepBackBtn: {
    minWidth: 82,
    minHeight: 48,
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
  stepNextBtn: {
    flex: 1,
    minHeight: 48,
    marginTop: 0,
  },
});
