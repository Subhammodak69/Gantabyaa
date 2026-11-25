import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  Image,
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = (val?: string) => typeof val === 'string' && UUID_REGEX.test(val.trim());

function durationValue(value: unknown, source: unknown, suffix: 'D' | 'N'): number {
  const number = Number(value);
  if (value != null && value !== '' && Number.isFinite(number) && number > 0) return number;
  const unit = suffix === 'D' ? '(?:days?|d)' : '(?:nights?|n)';
  const match = String(source || '').match(new RegExp(`(\\d+)\\s*${unit}\\b`, 'i'));
  return match ? Number(match[1]) : 0;
}

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
  const [adultCount, setAdultCount] = useState('1');
  const [childCount, setChildCount] = useState('0');
  const [seniorCount, setSeniorCount] = useState('0');

  // Variants loaded from /api/v1/tour-packages/{tour_slug}/variants
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [loadingSelect, setLoadingSelect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedVariant = variants.find(item => item.id === selectedVariantId)
    || variants.find(item => item.id === variantId)
    || (variantId ? {
      id: variantId,
      dates: departureDates,
      name: tour?.season_name,
      cover_image: tour?.cover_image,
      duration_days: tour?.duration_days,
      duration_nights: tour?.duration_nights,
      starting_price: tour?.starting_price,
    } : undefined);
  const travelDurationDay = durationValue(
    selectedVariant?.duration_days || selectedVariant?.duration_day || tour?.duration_days,
    selectedVariant?.duration || tour?.duration,
    'D',
  );
  const travelDurationNight = durationValue(
    selectedVariant?.duration_nights || selectedVariant?.duration_night || tour?.duration_nights,
    selectedVariant?.duration || tour?.duration,
    'N',
  );
  const variantLabel = selectedVariant?.name || selectedVariant?.season_name || tour?.season_name || '';
  const departureDateOptions = (selectedVariant?.dates || departureDates)
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
    setSelectedTravelDate(travelDate || departureDates[0]?.departure_date || departureDates[0]?.date || '');
    setSelectedVariantId(variantId || '');
    setVariants([]);

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

  }, [visible, tour, packageId, variantId, initialUser, travelDate, departureDates]);

  const resetForm = () => {
    setName('');
    setMobile('');
    setEmail('');
    setSelectedTravelDate('');
    setAdultCount('1');
    setChildCount('0');
    setSeniorCount('0');
    setVariants([]);
    setSelectedVariantId('');
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

      const chosenVariant = variants.find(item => item.id === selectedVariantId) || selectedVariant;
      const selectedVariantName = chosenVariant?.name || chosenVariant?.season_name || tour?.season_name || 'Selected package option';
      const imageUrl = chosenVariant?.cover_image || chosenVariant?.banner?.image || tour?.cover_image || '';
      const whatsappMessage = [
        'Hello Gantabyaa team!',
        '',
        'I would like to enquire about this fixed tour package:',
        'Enquiry type: FIXED',
        `Package: ${tour?.title || 'Tour package'}`,
        `Destination: ${tour?.destination || 'Not specified'}`,
        `Variant: ${selectedVariantName}`,
        `Departure date: ${selectedTravelDate || travelDate || 'Not selected'}`,
        `Full name: ${name.trim()}`,
        `Mobile / WhatsApp: ${mobile.trim()}`,
        `Email: ${email.trim() || 'Not provided'}`,
        `Travellers: Adults ${adultCount || 0}, Children ${childCount || 0}, Seniors ${seniorCount || 0}`,
        `Travel duration: ${travelDurationDay} days / ${travelDurationNight} nights`,
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

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.packageCard}>
              {selectedVariant?.cover_image || tour?.cover_image ? (
                <Image
                  source={{ uri: selectedVariant?.cover_image || tour?.cover_image }}
                  style={styles.packageImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.packageImage, styles.packageImageFallback]}>
                  <Feather name="map" size={30} color={COLORS.primary} />
                </View>
              )}
              <View style={styles.packageDetails}>
                <Text style={styles.packageEyebrow}>SELECTED FIXED TOUR</Text>
                <Text style={styles.packageTitle}>{tour?.title || 'Tour package'}</Text>
                {(tour?.destination || variantLabel) ? (
                  <Text style={styles.packageVariant}>{[tour?.destination, variantLabel].filter(Boolean).join(' · ')}</Text>
                ) : null}
                <View style={styles.packageMeta}>
                  <Text style={styles.packageMetaText}>{travelDurationDay} days · {travelDurationNight} nights</Text>
                  {(selectedVariant?.starting_price || selectedVariant?.price || tour?.starting_price) ? (
                    <Text style={styles.packagePrice}>
                      From ₹{Number(selectedVariant?.starting_price || selectedVariant?.price || tour?.starting_price).toLocaleString('en-IN')}
                    </Text>
                  ) : null}
                </View>
                {loadingSelect && !selectedVariant ? (
                  <View style={styles.loadingVariantsRow}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loadingVariantsText}>Loading package option…</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <Text style={styles.sectionTitle}>Departure date</Text>
            {departureDateOptions.length > 0 ? (
              <ChipSelector options={departureDateOptions} value={selectedTravelDate} onChange={setSelectedTravelDate} styles={styles} />
            ) : (
              <Text style={styles.loadingVariantsText}>No departure dates are listed for this package.</Text>
            )}

            <View style={[styles.row, styles.durationRow]}>
              <View style={styles.col}>
                <Text style={styles.label}>TRAVEL DURATION (DAYS)</Text>
                <Text style={styles.readOnlyValue}>{travelDurationDay}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>TRAVEL DURATION (NIGHTS)</Text>
                <Text style={styles.readOnlyValue}>{travelDurationNight}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Travellers</Text>
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

            <Text style={styles.sectionTitle}>Your contact details</Text>
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
          </ScrollView>
          <View style={[styles.stepFooter, { paddingBottom: 20 + insets.bottom }]}>
            <Pressable onPress={handleClose} style={styles.stepBackBtn}>
              <Text style={styles.stepBackText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                styles.stepNextBtn,
                isSubmitting && styles.submitBtnDisabled,
                pressed && !isSubmitting && styles.submitBtnPressed,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                <Text style={styles.submitBtnText}>Enquire on WhatsApp</Text>
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
  packageCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    marginBottom: 16,
  },
  packageImage: {
    width: 112,
    height: 150,
    backgroundColor: COLORS.surface,
  },
  packageImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageDetails: {
    flex: 1,
    justifyContent: 'center',
    padding: 12,
  },
  packageEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: COLORS.primary,
  },
  packageTitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
  },
  packageVariant: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  packageMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  packageMetaText: {
    overflow: 'hidden',
    borderRadius: 7,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  packagePrice: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 4,
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
  },
  durationRow: {
    marginTop: 6,
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
