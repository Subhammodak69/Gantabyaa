import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useColors } from '../theme/theme';
import { TourPackageSummary, NavScreen } from '../types';
import { TourCard } from '../components/TourCard';
import { TourListSkeleton } from '../components/Skeleton';
import { fetchTourPackages } from '../api/tourApi';

interface TourListScreenProps {
  tours: TourPackageSummary[];
  loading: boolean;
  onRefresh: () => void;
  onSelectTour: (tour: TourPackageSummary) => void;
  onNavigate: (screen: NavScreen) => void;
  initialFilter?: 'ALL' | 'DOMESTIC' | 'INTERNATIONAL' | 'FEATURED' | 'SPECIAL_OFFER';
  savedTours: string[];
  onToggleSave: (slug: string) => void;
  onEnquireTour?: (tour: TourPackageSummary) => void;
}

export const TourListScreen: React.FC<TourListScreenProps> = ({
  tours,
  loading,
  onRefresh,
  onSelectTour,
  onNavigate,
  initialFilter = 'ALL',
  savedTours,
  onToggleSave,
  onEnquireTour,
}) => {
  const COLORS = useColors();
  const styles = makeStyles(COLORS);
  const [filterType, setFilterType] = useState<'ALL' | 'DOMESTIC' | 'INTERNATIONAL' | 'FEATURED' | 'SPECIAL_OFFER'>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recommended' | 'duration'>('recommended');
  const [featuredTours, setFeaturedTours] = useState<TourPackageSummary[] | null>(null);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const [specialOfferTours, setSpecialOfferTours] = useState<TourPackageSummary[] | null>(null);
  const [specialOfferLoading, setSpecialOfferLoading] = useState(false);

  const loadFeaturedTours = useCallback(async () => {
    setFeaturedLoading(true);
    setFeaturedError(null);
    try {
      const items = await fetchTourPackages(1, 12, 'created_at', 'desc', { is_featured: true });
      setFeaturedTours(items);
    } catch (error) {
      setFeaturedTours([]);
      setFeaturedError(error instanceof Error ? error.message : 'Unable to load featured tours.');
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  const loadSpecialOffers = useCallback(async () => {
    setSpecialOfferLoading(true);
    try {
      const items = await fetchTourPackages(1, 100, 'created_at', 'desc', {badge: 'SPECIAL_OFFER'});
      setSpecialOfferTours(items);
    } catch {
      setSpecialOfferTours([]);
    } finally {
      setSpecialOfferLoading(false);
    }
  }, []);

  useEffect(() => {
    setFilterType(initialFilter);
    if (initialFilter === 'FEATURED') {
      loadFeaturedTours();
      setSpecialOfferTours(null);
    } else if (initialFilter === 'SPECIAL_OFFER') {
      loadSpecialOffers();
      setFeaturedTours(null);
    } else {
      setFeaturedTours(null);
      setSpecialOfferTours(null);
    }
  }, [initialFilter, loadFeaturedTours, loadSpecialOffers]);

  const changeFilter = (filter: 'ALL' | 'DOMESTIC' | 'INTERNATIONAL' | 'FEATURED' | 'SPECIAL_OFFER') => {
    setFilterType(filter);
    if (filter === 'FEATURED') {
      loadFeaturedTours();
      setSpecialOfferTours(null);
    } else if (filter === 'SPECIAL_OFFER') {
      loadSpecialOffers();
      setFeaturedTours(null);
    } else {
      setFeaturedTours(null);
      setSpecialOfferTours(null);
    }
  };

  const sourceTours = useMemo(
    () => filterType === 'FEATURED'
      ? (featuredTours || [])
      : filterType === 'SPECIAL_OFFER'
      ? (specialOfferTours || [])
      : tours,
    [filterType, featuredTours, specialOfferTours, tours],
  );
  const listLoading = filterType === 'FEATURED'
    ? featuredLoading
    : filterType === 'SPECIAL_OFFER'
    ? specialOfferLoading
    : loading;
  const showFeaturedError = filterType === 'FEATURED' && featuredError !== null;

  const filteredTours = useMemo(() => {
    let result = [...sourceTours];

    // Filter by type
    if (filterType === 'DOMESTIC') {
      result = result.filter(t => t.type === 'DOMESTIC');
    } else if (filterType === 'INTERNATIONAL') {
      result = result.filter(t => t.type === 'INTERNATIONAL');
    } else if (filterType === 'FEATURED') {
      result = result.filter(t => t.is_featured);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.destination.toLowerCase().includes(q) ||
          t.tour_code.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortBy === 'duration') {
      result.sort((a, b) => b.duration_days - a.duration_days);
    }

    return result;
  }, [sourceTours, filterType, searchQuery, sortBy]);

  const listHeader = (
    <View style={styles.searchHeader}>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search destination, tour code, style..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
            <Text style={styles.clearIcon}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterPillsRow}
      >
        {(['ALL', 'DOMESTIC', 'INTERNATIONAL', 'FEATURED', 'SPECIAL_OFFER'] as const).map(tab => (
          <Pressable
            key={tab}
            onPress={() => changeFilter(tab)}
            style={[styles.filterPill, filterType === tab && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, filterType === tab && styles.filterPillTextActive]}>
              {tab === 'ALL'
                ? 'All Tours'
                : tab === 'DOMESTIC'
                ? '🇮🇳 Domestic'
                : tab === 'INTERNATIONAL'
                ? '✈️ International'
                : tab === 'FEATURED'
                ? '🌟 Featured'
                : '🏷️ Offers'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.infoBar}>
        <Text style={styles.countText}>
          Showing <Text style={styles.countHighlight}>{filteredTours.length}</Text> packages
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tour List Content */}
      <FlatList
        data={listLoading && sourceTours.length === 0 ? [] : filteredTours}
        keyExtractor={item => item.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={listLoading}
            onRefresh={filterType === 'FEATURED' ? loadFeaturedTours : filterType === 'SPECIAL_OFFER' ? loadSpecialOffers : onRefresh}
            colors={[COLORS.primary]}
          />
        }
        renderItem={({ item }) => (
          <TourCard
            tour={item}
            layout="vertical"
            onPress={() => onSelectTour(item)}
            onEnquire={onEnquireTour ? () => onEnquireTour(item) : () => { onSelectTour(item); onNavigate('enquiry'); }}
            isSaved={savedTours.includes(item.slug)}
            onToggleSave={() => onToggleSave(item.slug)}
          />
        )}
        ListEmptyComponent={listLoading ? <TourListSkeleton /> : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>
              {showFeaturedError ? 'Unable to Load Featured Tours' : 'No Matching Tours Found'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {showFeaturedError ? featuredError : 'Try adjusting your search terms or filter selection.'}
            </Text>
            <Pressable
              style={styles.resetBtn}
              onPress={() => {
                if (showFeaturedError) {
                  loadFeaturedTours();
                } else {
                  changeFilter('ALL');
                  setSearchQuery('');
                  setSortBy('recommended');
                }
              }}
            >
              <Text style={styles.resetBtnText}>
                {showFeaturedError ? 'Retry' : 'Reset All Filters'}
              </Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
};

const makeStyles = (COLORS: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  searchHeader: {
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    marginBottom: 6,

    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    padding: 0,
  },
  clearIcon: {
    fontSize: 14,
    color: COLORS.textMuted,
    paddingHorizontal: 4,
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },

  filterPill: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  countText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  countHighlight: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 260,
  },
  resetBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
