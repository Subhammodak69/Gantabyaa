import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useColors } from '../theme/theme';
import { useAppDialog } from './AppDialog';
import { CustomDateField } from './CustomDatePicker';
import { fetchHotels, fetchTourPackages, fetchVehicles, openWhatsAppChat } from '../api/tourApi';
import enums from '../utils/enums.json';

interface CustomTourModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitSuccess?: (enquiry: any) => void;
}

type ChipOption = { label: string; value: string };

function ChipSelector({
  options,
  value,
  onChange,
  styles,
}: {
  options: ChipOption[];
  value: string;
  onChange: (v: string) => void;
  styles: any;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {options.map(opt => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          style={[styles.chip, value === opt.value && styles.chipActive]}
        >
          <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
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

export const CustomTourModal: React.FC<CustomTourModalProps> = ({
  visible,
  onClose,
  onSubmitSuccess,
}) => {
  const COLORS = useColors();
  const styles = makeStyles(COLORS);
  const { showDialog } = useAppDialog();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [packages, setPackages] = useState<any[]>([]);
  const [hotelId, setHotelId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [hotels, setHotels] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [travelDate, setTravelDate] = useState('');
  const [travelDuration, setTravelDuration] = useState('');
  const [paxNo, setPaxNo] = useState('2');
  const [noRoom, setNoRoom] = useState('1');
  const [vehicleType, setVehicleType] = useState('');
  const [mealPlan, setMealPlan] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [enquiryType, setEnquiryType] = useState('CUSTOM_TOUR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedPackage = packages.find(item => item.id === packageId || item.package_id === packageId);
  const selectedHotel = hotels.find(item => item.id === hotelId);
  const selectedVehicle = vehicles.find(item => item.id === vehicleId);

  useEffect(() => {
    if (!visible) return;
    fetchTourPackages(1, 50)
      .then(result => setPackages(result || []))
      .catch(() => setPackages([]));
  }, [visible]);

  useEffect(() => {
    if (!visible || !destinationId) {
      setHotels([]);
      setVehicles([]);
      return;
    }
    setFacilitiesLoading(true);
    Promise.all([fetchHotels(1, 20, destinationId), fetchVehicles(1, 20)])
      .then(([hotelResponse, vehicleResponse]) => {
        setHotels(Array.isArray(hotelResponse.data) ? hotelResponse.data : []);
        setVehicles(Array.isArray(vehicleResponse.data) ? vehicleResponse.data : []);
      })
      .catch(() => {
        setHotels([]);
        setVehicles([]);
      })
      .finally(() => setFacilitiesLoading(false));
  }, [visible, destinationId]);

  const resetForm = () => {
    setName('');
    setMobile('');
    setDestination('');
    setDestinationId('');
    setPackageId('');
    setHotelId('');
    setVehicleId('');
    setTravelDate('');
    setTravelDuration('');
    setPaxNo('2');
    setNoRoom('1');
    setVehicleType('');
    setMealPlan('');
    setSpecialRequirements('');
    setEnquiryType('CUSTOM_TOUR');
  };

  const handleClose = () => {
    resetForm();
    onClose();
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
      await showDialog({ title: 'Invalid Mobile', message: 'Enter a valid 10-digit mobile number.', variant: 'warning' });
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
        `Destination: ${destination.trim()}`,
        `Package: ${selectedPackage?.title || selectedPackage?.name || 'Custom package'}`,
        `Departure date: ${travelDate.trim() || 'Not selected'}`,
        `Duration: ${travelDuration.trim() || 'Not specified'}`,
        `Travellers: ${paxNo || 0}`,
        `Rooms: ${noRoom || 0}`,
        `Vehicle type: ${vehicleType || 'ANY'}`,
        `Vehicle: ${selectedVehicle?.name || selectedVehicle?.vehicle_name || vehicleId || 'Not selected'}`,
        `Hotel: ${selectedHotel?.name || selectedHotel?.hotel_name || hotelId || 'Not selected'}`,
        `Meal plan: ${mealPlan || 'ANY'}`,
        `Special requirements: ${specialRequirements.trim() || 'None'}`,
        '',
        'Please help me with availability, pricing and a personalized itinerary.',
      ].join('\n');
      if (onSubmitSuccess) onSubmitSuccess({ channel: 'WHATSAPP', message: whatsappMessage });
      await showDialog({
        title: 'Custom Plan Requested! 🌟',
        message: `Thank you ${name}! Our holiday specialist will design a personalized itinerary for ${destination} and call you on ${mobile} within 24 hours.`,
        variant: 'success',
        confirmText: 'Awesome!',
      });
      handleClose();
      openWhatsAppChat(whatsappMessage);
    } catch (error: any) {
      await showDialog({
        title: 'Could not submit',
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
          {/* Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Text style={styles.headerIconText}>🎨</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>Craft Your Custom Tour</Text>
                <Text style={styles.headerSub}>Tell us your dream holiday, we handle the rest</Text>
              </View>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={8}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Enquiry Type */}
            <Text style={styles.label}>ENQUIRY TYPE</Text>
            <ChipSelector
              options={enquiryTypeOptions}
              value={enquiryType}
              onChange={setEnquiryType}
              styles={styles}
            />

            {/* Name */}
            <Text style={styles.label}>YOUR FULL NAME *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rahul Sen"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
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
              />
            </View>

            {/* Package or destination first */}
            <Text style={styles.label}>CHOOSE PACKAGE OR DESTINATION *</Text>
            <ChipSelector
              options={[{ label: 'Package', value: 'PACKAGE' }, { label: 'Destination', value: 'DESTINATION' }]}
              value={packageId ? 'PACKAGE' : destinationId ? 'DESTINATION' : ''}
              onChange={choice => {
                setPackageId('');
                setDestinationId('');
                setDestination('');
                setHotelId('');
                setVehicleId('');
                if (choice === 'PACKAGE' && packages.length > 0) {
                  const item = packages[0];
                  setPackageId(item.id || '');
                  setDestinationId(item.destination_id || '');
                  setDestination(item.destination || item.destination_name || '');
                }
              }}
              styles={styles}
            />
            {packages.length > 0 ? (
              <>
                <Text style={styles.label}>PACKAGE</Text>
                <ChipSelector
                  options={packages.map(item => ({ label: item.title || item.destination || 'Tour package', value: item.id }))}
                  value={packageId}
                  onChange={value => {
                    const item = packages.find(entry => entry.id === value);
                    setPackageId(value);
                    setDestinationId(item?.destination_id || '');
                    setDestination(item?.destination || item?.destination_name || '');
                    setHotelId('');
                    setVehicleId('');
                  }}
                  styles={styles}
                />
                <Text style={styles.label}>DESTINATION</Text>
                <ChipSelector
                  options={Array.from(new Map(packages.filter(item => item.destination_id).map(item => [item.destination_id, { label: item.destination || item.destination_name || 'Destination', value: item.destination_id }])).values())}
                  value={destinationId}
                  onChange={value => {
                    const item = packages.find(entry => entry.destination_id === value);
                    setPackageId('');
                    setDestinationId(value);
                    setDestination(item?.destination || item?.destination_name || '');
                    setHotelId('');
                    setVehicleId('');
                  }}
                  styles={styles}
                />
              </>
            ) : null}

            {/* Travel Date & Duration row */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>TRAVEL DATE</Text>
                <CustomDateField
                  value={travelDate}
                  onChange={setTravelDate}
                  placeholder="Select travel date"
                  title="Select travel date"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>DURATION</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 7 Days"
                  placeholderTextColor={COLORS.textMuted}
                  value={travelDuration}
                  onChangeText={setTravelDuration}
                />
              </View>
            </View>

            {/* Pax & Rooms row */}
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>NO. OF TRAVELLERS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 4"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={paxNo}
                  onChangeText={setPaxNo}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>NO. OF ROOMS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={noRoom}
                  onChangeText={setNoRoom}
                />
              </View>
            </View>

            {/* Vehicle Type */}
            <Text style={styles.label}>VEHICLE TYPE</Text>
            <ChipSelector
              options={[{ label: 'Any', value: '' }, ...vehicleOptions]}
              value={vehicleType}
              onChange={setVehicleType}
              styles={styles}
            />

            <Text style={styles.label}>PREFERRED HOTEL</Text>
            {facilitiesLoading ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
            <ChipSelector
              options={[{ label: 'Any', value: '' }, ...hotels.map(hotel => ({ label: hotel.name, value: hotel.id }))]}
              value={hotelId}
              onChange={setHotelId}
              styles={styles}
            />

            <Text style={styles.label}>PREFERRED VEHICLE</Text>
            <ChipSelector
              options={[{ label: 'Any', value: '' }, ...vehicles.map(vehicle => ({ label: `${vehicle.name}${vehicle.capacity ? ` · ${vehicle.capacity} seats` : ''}`, value: vehicle.id }))]}
              value={vehicleId}
              onChange={setVehicleId}
              styles={styles}
            />

            {/* Meal Plan */}
            <Text style={styles.label}>MEAL PLAN</Text>
            <ChipSelector
              options={[{ label: 'Any', value: '' }, ...mealOptions]}
              value={mealPlan}
              onChange={setMealPlan}
              styles={styles}
            />

            {/* Special Requirements */}
            <Text style={styles.label}>SPECIAL REQUIREMENTS (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Honeymoon package, pure veg food, flight inclusive, wheelchair accessible..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={specialRequirements}
              onChangeText={setSpecialRequirements}
            />

            {/* Trust note */}
            <View style={styles.trustNote}>
              <Text style={styles.trustIcon}>✨</Text>
              <Text style={styles.trustText}>
                Our holiday specialists will create a completely personalized itinerary for you within 24 hours.
              </Text>
            </View>

            {/* Submit Button */}
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
                  <Text style={styles.submitBtnText}>Request Custom Itinerary</Text>
                  <Text style={styles.submitBtnArrow}>→</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const makeStyles = (COLORS: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    keyboardAvoid: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    sheet: {
      backgroundColor: COLORS.bg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '92%',
      paddingBottom: Platform.OS === 'ios' ? 30 : 16,
      elevation: 24,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: -6 },
    },
    handleBar: {
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.border,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    headerIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: COLORS.primarySubtle,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerIconText: {
      fontSize: 20,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.text,
    },
    headerSub: {
      fontSize: 11,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: COLORS.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeBtnText: {
      fontSize: 14,
      color: COLORS.textSecondary,
      fontWeight: '700',
    },
    formScroll: {
      maxHeight: 520,
    },
    formContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 24,
    },
    label: {
      fontSize: 11,
      fontWeight: '800',
      color: COLORS.textSecondary,
      letterSpacing: 0.6,
      marginBottom: 6,
      marginTop: 14,
    },
    input: {
      backgroundColor: COLORS.card,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: COLORS.text,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 8,
    },
    dialCodeBox: {
      backgroundColor: COLORS.surface,
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
      minHeight: 80,
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
    chipRow: {
      gap: 8,
      paddingVertical: 4,
      paddingRight: 4,
    },
    chip: {
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: COLORS.surface,
    },
    chipActive: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.primarySubtle,
    },
    chipText: {
      fontSize: 12,
      color: COLORS.textSecondary,
      fontWeight: '600',
    },
    chipTextActive: {
      color: COLORS.primary,
      fontWeight: '800',
    },
    trustNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 16,
      marginBottom: 4,
      backgroundColor: COLORS.goldLight,
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    trustIcon: {
      fontSize: 13,
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
      backgroundColor: COLORS.primary,
      borderRadius: 12,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 18,
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
  });
