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
import { useColors } from '../theme/theme';
import { useAppDialog } from './AppDialog';
import {
  getAccessToken,
  fetchTourPackageVariants,
  fetchTourVariant,
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
  const styles = makeStyles(COLORS);
  const { showDialog } = useAppDialog();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [selectedTravelDate, setSelectedTravelDate] = useState(travelDate);
  const [vehicleType, setVehicleType] = useState('ANY');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Variants loaded from /api/v1/tour-packages/{tour_slug}/variants
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [loadingSelect, setLoadingSelect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedVariant = variants.find(item => item.id === selectedVariantId)
    || (selectedVariantId ? { id: selectedVariantId, dates: departureDates } : undefined);
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
    setSubject('');
    setMessage('');
    setVariants([]);
    setSelectedVariantId('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleVariantChange = async (variant: any) => {
    setSelectedVariantId(variant.id);
    setSelectedTravelDate('');
    const lookupKey = tour?.slug || (packageId && !isValidUUID(packageId) ? packageId : '');
    if (!lookupKey || variant.dates?.length) return;

    try {
      const result = await fetchTourVariant(lookupKey, variant.key || variant.id, variants);
      setVariants(current => current.map(item => item.id === variant.id || item.id === result.variant.id ? result.variant : item));
    } catch {
      // Keep the selected variant available if its details request fails.
    }
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
        `Vehicle type: ${vehicleType || 'ANY'}`,
        `Subject: ${subject.trim() || 'Not provided'}`,
        `Message / requirements: ${message.trim() || 'None'}`,
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.keyboardAvoid}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Text style={styles.headerIconText}>✉️</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>Send Enquiry</Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {tour?.title || 'Get in touch with our team'}
                </Text>
              </View>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
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

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Package variants loaded from the slug-based variants endpoint */}
            {loadingSelect ? (
              <View style={styles.loadingVariantsRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingVariantsText}>Loading package options…</Text>
              </View>
            ) : variants.length > 0 ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.label}>SELECT TOUR OPTION / VARIANT</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {variants.map((v) => {
                    const isSelected = selectedVariantId === v.id;
                    return (
                      <Pressable
                        key={v.id}
                        onPress={() => {
                          handleVariantChange(v);
                        }}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {v.name || v.season_name}
                        </Text>
                        {v.season_name && v.name !== v.season_name && (
                          <Text style={[styles.chipSub, isSelected && styles.chipSubActive]}>
                            {v.season_name}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Vehicle preference */}
            <View style={styles.sectionBlock}>
              <Text style={styles.label}>VEHICLE TYPE</Text>
              <ChipSelector
                options={vehicleTypeOptions}
                value={vehicleType}
                onChange={setVehicleType}
                styles={styles}
              />
            </View>

            {/* Name */}
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

            {/* Mobile */}
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

            {/* Subject */}
            <Text style={styles.label}>SUBJECT</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Group booking enquiry"
              placeholderTextColor={COLORS.textMuted}
              value={subject}
              onChangeText={setSubject}
              returnKeyType="next"
            />

            <Text style={styles.label}>DEPARTURE DATE</Text>
            {departureDateOptions.length > 0 ? (
              <ChipSelector
                options={departureDateOptions}
                value={selectedTravelDate}
                onChange={setSelectedTravelDate}
                styles={styles}
              />
            ) : (
              <Text style={styles.loadingVariantsText}>Select a tour variant to see departure dates.</Text>
            )}

            {/* Message */}
            <Text style={styles.label}>MESSAGE / REQUIREMENTS</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us travel dates, number of guests, special requests…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
            />

            {/* Trust reassurance */}
            <View style={styles.trustBox}>
              <Text style={styles.trustIcon}>🔒</Text>
              <Text style={styles.trustText}>
                Your details are safe. We will only contact you regarding this tour request.
              </Text>
            </View>

            {/* Submit button */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                isSubmitting && styles.submitBtnDisabled,
                pressed && !isSubmitting && styles.submitBtnPressed,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Submit Enquiry</Text>
                  <Text style={styles.submitBtnArrow}>→</Text>
                </>
              )}
            </Pressable>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeStyles = (COLORS: ReturnType<typeof useColors>) => StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 10,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 8,
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
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
  formScroll: {
    maxHeight: 460,
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
  sectionBlock: {
    marginBottom: 4,
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
    marginTop: 16,
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
  bottomSpacer: {
    height: 10,
  },
});
