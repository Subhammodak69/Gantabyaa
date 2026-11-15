import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { DestinationRecord } from '../api/types';
import { fetchTourPackages } from '../api/tourApi';
import { TourPackageSummary } from '../types';
import { TourCard } from '../components/TourCard';
import { useTheme } from '../theme/theme';

interface DestinationDetailsScreenProps {
  destination: DestinationRecord;
  onBack: () => void;
  onSelectTour: (tour: TourPackageSummary) => void;
  savedTours: string[];
  onToggleSave: (slug: string) => void;
}

export const DestinationDetailsScreen: React.FC<DestinationDetailsScreenProps> = ({
  destination,
  onBack,
  onSelectTour,
  savedTours,
  onToggleSave,
}) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [packages, setPackages] = useState<TourPackageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRelated = useCallback(async () => {
    setLoading(true);
    setError('');
    const [packageResult] = await Promise.allSettled([
      fetchTourPackages(1, 100, 'created_at', 'desc', { destination: destination.name }),
    ]);
    setPackages(packageResult.status === 'fulfilled' ? packageResult.value : []);
    if (packageResult.status === 'rejected') {
      setError('Tour packages could not be loaded. Pull down to try again.');
    }
    setLoading(false);
  }, [destination.name]);

  useEffect(() => { loadRelated(); }, [loadRelated]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to destinations" style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={21} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle} numberOfLines={1}>{destination.name}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{destination.country || 'Destination details'}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRelated} colors={[colors.primary]} />}
      >
      <View style={styles.hero}>
        {destination.image_url ? <Image source={{ uri: destination.image_url }} style={styles.heroImage} /> : null}
        <View style={styles.heroShade} />
        <View style={styles.heroCopy}>
          <Text style={styles.country}>{destination.country || (destination.is_domestic ? 'INDIA' : 'INTERNATIONAL')}</Text>
          <Text style={styles.title}>{destination.name}</Text>
          {!!destination.description && <Text style={styles.description} numberOfLines={3}>{destination.description}</Text>}
        </View>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View><Text style={styles.eyebrow}>CURATED ITINERARIES</Text><Text style={styles.sectionTitle}>Packages</Text></View>
          <Text style={styles.count}>{loading ? 'Loading' : String(packages.length)}</Text>
        </View>
        {packages.length ? packages.map((tour, index) => (
          <TourCard
            key={`${tour.id || tour.slug}-${index}`}
            tour={tour}
            onPress={() => onSelectTour(tour)}
            isSaved={savedTours.includes(tour.slug)}
            onToggleSave={() => onToggleSave(tour.slug)}
          />
        )) : <Text style={styles.empty}>{loading ? 'Loading packages...' : 'No packages are listed for this destination yet.'}</Text>}
      </View>
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bg },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, justifyContent: 'center', marginLeft: 6 },
  headerTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  headerSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  headerSpacer: { width: 40 },
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { height: 285, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: colors.primaryDark },
  heroImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(4, 17, 30, 0.58)' },
  heroCopy: { paddingHorizontal: 18, paddingBottom: 22 },
  country: { color: 'rgba(255,255,255,0.82)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 4 },
  description: { color: 'rgba(255,255,255,0.9)', fontSize: 12, lineHeight: 18, marginTop: 6 },
  section: { padding: 16, paddingBottom: 6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 13 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 3 },
  count: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  empty: { color: colors.textMuted, fontSize: 13, paddingVertical: 14 },
  error: { color: colors.danger || '#B42318', fontSize: 12, paddingHorizontal: 16, paddingTop: 12 },
});