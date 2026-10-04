import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  fetchDestinations,
  fetchHotels,
  fetchTourPackageVariants,
  fetchTourPackages,
  fetchVehicles,
  updateEnquiry,
} from '../api/tourApi';
import {AppColors, useColors} from '../theme/theme';
import {CustomDateField} from '../components/CustomDatePicker';

interface Props {
  enquiry: any;
  onSaved: () => void;
}

interface LookupOption {
  id: string;
  label: string;
}

type LookupFieldProps = {
  label: string;
  value: string;
  options: LookupOption[];
  placeholder: string;
  colors: AppColors;
  styles: ReturnType<typeof makeStyles>;
  onChange: (value: string) => void;
};

const LookupField: React.FC<LookupFieldProps> = ({
  label,
  value,
  options,
  placeholder,
  colors,
  styles,
  onChange,
}) => {
  const [visible, setVisible] = useState(false);
  const selected = options.find(option => option.id === value);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label || placeholder}`}
        style={styles.lookupButton}
        onPress={() => setVisible(true)}>
        <Text style={[styles.lookupText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label || placeholder}
        </Text>
        <Feather name="chevron-down" size={17} color={colors.textSecondary} />
      </Pressable>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <View style={styles.lookupBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Close options"
            onPress={() => setVisible(false)}
          />
          <View style={styles.lookupDialog}>
            <View style={styles.lookupHeader}>
              <Text style={styles.lookupTitle}>{label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close options"
                hitSlop={8}
                onPress={() => setVisible(false)}>
                <Feather name="x" size={21} color={colors.textSecondary} />
              </Pressable>
            </View>
            <FlatList
              data={options}
              keyExtractor={option => option.id || '__empty__'}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.emptyOptions}>No related records are available.</Text>
              }
              renderItem={({item}) => (
                <Pressable
                  style={styles.lookupOption}
                  onPress={() => {
                    onChange(item.id);
                    setVisible(false);
                  }}>
                  <Text
                    style={[
                      styles.lookupOptionText,
                      item.id === value && styles.lookupOptionSelected,
                    ]}>
                    {item.label}
                  </Text>
                  {item.id === value ? (
                    <Feather name="check" size={17} color={colors.primary} />
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export const EditEnquiryScreen: React.FC<Props> = ({enquiry, onSaved}) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [form, setForm] = useState({
    name: enquiry?.enquirer_name || enquiry?.fullName || enquiry?.name || '',
    phone: enquiry?.enquirer_phone || enquiry?.mobile || enquiry?.phone || '',
    email: enquiry?.enquirer_email || enquiry?.email || '',
    package_id: enquiry?.package_id || enquiry?.packageId || '',
    variant_id: enquiry?.variant_id || enquiry?.variantId || '',
    destination_id: enquiry?.destination_id || enquiry?.destinationId || '',
    travel_date: enquiry?.travel_date || enquiry?.travelDate || '',
    travel_duration_day: String(enquiry?.travel_duration_day ?? enquiry?.travelDurationDay ?? 0),
    travel_duration_night: String(enquiry?.travel_duration_night ?? enquiry?.travelDurationNight ?? 0),
    adult_count: String(enquiry?.adult_count ?? enquiry?.adults ?? 1),
    child_count: String(enquiry?.child_count ?? enquiry?.children ?? 0),
    senior_count: String(enquiry?.senior_count ?? 0),
    hotel_id: enquiry?.hotel_id || enquiry?.hotelId || '',
    vehicle_id: enquiry?.vehicle_id || enquiry?.vehicleId || '',
    room_count: String(enquiry?.room_count ?? enquiry?.no_room ?? 0),
    vehicle_count: String(enquiry?.vehicle_count ?? enquiry?.vehicleCount ?? 0),
    budget_min: String(enquiry?.budget_min ?? enquiry?.budgetMin ?? 0),
    budget_max: String(enquiry?.budget_max ?? enquiry?.budgetMax ?? 0),
    meal_plan: enquiry?.meal_plan || enquiry?.mealPlan || 'ANY',
    message: enquiry?.message || '',
    special_requirements: enquiry?.special_requirements || enquiry?.specialRequirements || '',
  });
  const [packages, setPackages] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      fetchTourPackages(1, 100),
      fetchDestinations(1, 100),
      fetchHotels(1, 100),
      fetchVehicles(1, 100),
    ]).then(([packageResult, destinationResult, hotelResult, vehicleResult]) => {
      if (!active) return;
      if (packageResult.status === 'fulfilled') setPackages(packageResult.value);
      if (destinationResult.status === 'fulfilled') setDestinations(destinationResult.value);
      if (hotelResult.status === 'fulfilled') {
        setHotels(Array.isArray(hotelResult.value.data) ? hotelResult.value.data : []);
      }
      if (vehicleResult.status === 'fulfilled') {
        setVehicles(Array.isArray(vehicleResult.value.data) ? vehicleResult.value.data : []);
      }
      setLookupsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const selectedPackage = packages.find(item => item.id === form.package_id);

  useEffect(() => {
    if (!form.package_id) {
      setVariants([]);
      return;
    }
    let active = true;
    const packageRef = selectedPackage?.slug || form.package_id;
    fetchTourPackageVariants(packageRef)
      .then(result => {
        if (active) setVariants(result.variants);
      })
      .catch(() => {
        if (active) setVariants([]);
      });
    return () => {
      active = false;
    };
  }, [form.package_id, selectedPackage?.slug]);

  const withCurrentOption = (
    records: LookupOption[],
    currentId: string,
    fallbackLabel: string,
  ): LookupOption[] => {
    if (!currentId || records.some(record => record.id === currentId)) return records;
    return [{id: currentId, label: fallbackLabel}, ...records];
  };

  const packageOptions = useMemo(() => withCurrentOption(
    packages.map(item => ({id: item.id, label: item.title || item.destination || 'Tour package'})),
    form.package_id,
    enquiry?.tourTitle || enquiry?.package_name || 'Previously selected package',
  ), [packages, form.package_id, enquiry]);
  const variantOptions = useMemo(() => withCurrentOption(
    variants.map(item => ({id: item.id, label: item.name || item.season_name || 'Tour variant'})),
    form.variant_id,
    enquiry?.variantName || enquiry?.variant_name || 'Previously selected variant',
  ), [variants, form.variant_id, enquiry]);
  const destinationOptions = useMemo(() => withCurrentOption(
    destinations.map(item => ({id: item.id, label: item.name || item.destination_name || 'Destination'})),
    form.destination_id,
    enquiry?.destination_name || enquiry?.destination || 'Previously selected destination',
  ), [destinations, form.destination_id, enquiry]);
  const hotelOptions = useMemo(() => withCurrentOption(
    hotels.map(item => ({id: item.id, label: item.name || 'Hotel'})),
    form.hotel_id,
    enquiry?.hotel_name || 'Previously selected hotel',
  ), [hotels, form.hotel_id, enquiry]);
  const vehicleOptions = useMemo(() => withCurrentOption(
    vehicles.map(item => ({id: item.id, label: item.name || 'Vehicle'})),
    form.vehicle_id,
    enquiry?.vehicle_name || 'Previously selected vehicle',
  ), [vehicles, form.vehicle_id, enquiry]);

  const setField = (key: keyof typeof form, value: string) =>
    setForm(current => ({...current, [key]: value}));

  const save = async () => {
    if (!enquiry?.id || !form.name.trim() || !form.phone.trim()) {
      Alert.alert('Required fields', 'Name and phone number are required.');
      return;
    }
    setSaving(true);
    try {
      await updateEnquiry(enquiry.id, {
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        package_id: form.package_id.trim(),
        variant_id: form.variant_id.trim(),
        destination_id: form.destination_id.trim(),
        hotel_id: form.hotel_id.trim(),
        vehicle_id: form.vehicle_id.trim(),
        meal_plan: form.meal_plan.trim() || 'ANY',
        travel_duration_day: Number(form.travel_duration_day) || 0,
        travel_duration_night: Number(form.travel_duration_night) || 0,
        adult_count: Number(form.adult_count) || 0,
        child_count: Number(form.child_count) || 0,
        senior_count: Number(form.senior_count) || 0,
        room_count: Number(form.room_count) || 0,
        vehicle_count: Number(form.vehicle_count) || 0,
        budget_min: Number(form.budget_min) || 0,
        budget_max: Number(form.budget_max) || 0,
      });
      onSaved();
    } catch (error) {
      Alert.alert('Could not update enquiry', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    ['name', 'Full name'],
    ['phone', 'Phone'],
    ['email', 'Email'],
    ['travel_duration_day', 'Travel duration (days)'],
    ['travel_duration_night', 'Travel duration (nights)'],
    ['adult_count', 'Adults'],
    ['child_count', 'Children'],
    ['senior_count', 'Seniors'],
    ['room_count', 'Rooms'],
    ['vehicle_count', 'Vehicles'],
    ['budget_min', 'Minimum budget'],
    ['budget_max', 'Maximum budget'],
    ['meal_plan', 'Meal plan'],
  ] as const;

  const textField = (key: keyof typeof form, label: string) => (
    <View style={styles.field} key={key}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={form[key]}
        onChangeText={value => setField(key, value)}
        style={styles.input}
        placeholder={label}
        placeholderTextColor={colors.textMuted}
        keyboardType={
          key === 'phone' ? 'phone-pad'
            : key === 'email' ? 'email-address'
              : key.includes('count') || key.includes('duration') || key.includes('budget') ? 'numeric'
                : 'default'
        }
        autoCapitalize={key === 'email' ? 'none' : 'words'}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <View style={styles.icon}><Feather name="edit-3" size={21} color={colors.primary} /></View>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>UPDATE REQUEST</Text>
            <Text style={styles.title}>Edit enquiry</Text>
            <Text style={styles.subtitle}>{enquiry?.tourTitle || enquiry?.destination || 'Travel enquiry'}</Text>
          </View>
        </View>
        {textField('name', 'Full name')}
        {textField('phone', 'Phone')}
        {textField('email', 'Email')}
        <LookupField
          label="Package"
          value={form.package_id}
          options={packageOptions}
          placeholder={lookupsLoading ? 'Loading packages...' : 'Select package'}
          colors={colors}
          styles={styles}
          onChange={value => setForm(current => ({...current, package_id: value, variant_id: ''}))}
        />
        <LookupField
          label="Variant"
          value={form.variant_id}
          options={variantOptions}
          placeholder={!form.package_id ? 'Select a package first' : 'Select variant'}
          colors={colors}
          styles={styles}
          onChange={value => setField('variant_id', value)}
        />
        <LookupField
          label="Destination"
          value={form.destination_id}
          options={destinationOptions}
          placeholder={lookupsLoading ? 'Loading destinations...' : 'Select destination'}
          colors={colors}
          styles={styles}
          onChange={setValue => setField('destination_id', setValue)}
        />
        {fields.slice(3, 8).map(([key, label]) => textField(key, label))}
        <LookupField
          label="Hotel"
          value={form.hotel_id}
          options={hotelOptions}
          placeholder={lookupsLoading ? 'Loading hotels...' : 'Select hotel'}
          colors={colors}
          styles={styles}
          onChange={value => setField('hotel_id', value)}
        />
        <LookupField
          label="Vehicle"
          value={form.vehicle_id}
          options={vehicleOptions}
          placeholder={lookupsLoading ? 'Loading vehicles...' : 'Select vehicle'}
          colors={colors}
          styles={styles}
          onChange={value => setField('vehicle_id', value)}
        />
        {fields.slice(8).map(([key, label]) => textField(key, label))}
        <View style={styles.field}>
          <Text style={styles.label}>Travel date</Text>
          <CustomDateField
            value={form.travel_date}
            onChange={value => setField('travel_date', value)}
            placeholder="Select travel date"
            title="Select travel date"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Message</Text>
          <TextInput
            value={form.message}
            onChangeText={value => setField('message', value)}
            style={[styles.input, styles.multiline]}
            multiline
            placeholder="Tell us about your requirements"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Special requirements</Text>
          <TextInput
            value={form.special_requirements}
            onChangeText={value => setField('special_requirements', value)}
            style={[styles.input, styles.multiline]}
            multiline
            placeholder="Any special requirements"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <Pressable style={styles.saveButton} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.textLight} /> : (
            <>
              <Text style={styles.saveText}>Save enquiry</Text>
              <Feather name="check" size={17} color={colors.textLight} />
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  content: {padding: 16, paddingBottom: 40},
  heading: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, marginBottom: 20},
  icon: {width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center', marginRight: 12},
  headingCopy: {flex: 1},
  eyebrow: {fontSize: 10, fontWeight: '900', letterSpacing: 1, color: colors.primary},
  title: {fontSize: 23, fontWeight: '900', color: colors.text, marginTop: 3},
  subtitle: {fontSize: 12, color: colors.textSecondary, marginTop: 3},
  field: {marginBottom: 13},
  label: {fontSize: 11, fontWeight: '800', color: colors.textSecondary, marginBottom: 6},
  input: {height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 12, fontSize: 13},
  multiline: {height: 100, paddingTop: 12, textAlignVertical: 'top'},
  lookupButton: {height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  lookupText: {flex: 1, color: colors.text, fontSize: 13, marginRight: 10},
  placeholder: {color: colors.textMuted},
  lookupBackdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 22},
  lookupDialog: {maxHeight: '75%', backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 16, paddingBottom: 8},
  lookupHeader: {height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border},
  lookupTitle: {fontSize: 16, fontWeight: '800', color: colors.text},
  lookupOption: {minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10},
  lookupOptionText: {flex: 1, color: colors.text, fontSize: 14},
  lookupOptionSelected: {fontWeight: '800', color: colors.primary},
  emptyOptions: {paddingVertical: 20, color: colors.textMuted, fontSize: 13, textAlign: 'center'},
  saveButton: {height: 50, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 7},
  saveText: {fontSize: 14, fontWeight: '900', color: colors.textLight},
});
