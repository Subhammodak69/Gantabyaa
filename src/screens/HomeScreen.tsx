import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../theme/theme';
import { TourPackageSummary, NavScreen } from '../types';
import { TourCard } from '../components/TourCard';
import { openWhatsAppChat } from '../api/tourApi';
import { TourListSkeleton } from '../components/Skeleton';
import { DestinationRecord } from '../api/types';

interface HomeScreenProps {
  tours: TourPackageSummary[];
  destinations: DestinationRecord[];
  loading: boolean;
  onRefresh: () => void;
  onSelectTour: (tour: TourPackageSummary) => void;
  onSelectDestination: (destination: DestinationRecord) => void;
  onNavigate: (screen: NavScreen) => void;
  onFilterType: (type: 'ALL' | 'DOMESTIC' | 'INTERNATIONAL' | 'FEATURED') => void;
  onFilterSpecialOffers: () => void;
  onOpenCustomTour: () => void;
  onEnquireTour?: (tour: TourPackageSummary) => void;
  savedTours: string[];
  onToggleSave: (slug: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  tours,
  destinations,
  loading,
  onRefresh,
  onSelectTour,
  onSelectDestination,
  onNavigate,
  onFilterType,
  onFilterSpecialOffers,
  onOpenCustomTour,
  onEnquireTour,
  savedTours,
  onToggleSave,
}) => {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS, isDark);
  const featuredTours = tours.filter(t => t.is_featured);
  const domesticTours = tours.filter(t => t.type === 'DOMESTIC');
  const internationalTours = tours.filter(t => t.type === 'INTERNATIONAL');
  const internationalPosterImage = internationalTours.find(t => t.cover_image?.trim())?.cover_image?.trim();

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      {/* Hero Banner */}
      <View style={styles.heroSection}>
        <Image
          source={tours[0]?.cover_image ? { uri: tours[0].cover_image } : undefined}
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay} />

        <View style={styles.heroContent}>
          <View style={styles.sinceBadge}>
            <Text style={styles.sinceBadgeText}>SINCE 1994 · TRUSTED TRAVEL PARTNER</Text>
          </View>

          <Text style={styles.heroHeadline}>
            Explore Your{'\n'}
            <Text style={styles.heroGold}>Next Destination</Text>
          </Text>

          <Text style={styles.heroSub}>
            Curated group & private tours across India and the world, crafted with care.
          </Text>

        </View>
      </View>

      {/* Category Pills / Action Cards matching Diagram */}
      <View style={styles.categoriesContainer}>
        <Text style={styles.sectionEyebrow}>POPULAR CATEGORIES</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPills}
        >
          <Pressable
            style={[styles.categoryCard, styles.catFeatured]}
            onPress={() => {
              onFilterType('FEATURED');
              onNavigate('tours');
            }}
          >
            <Text style={styles.categoryIcon}>🌟</Text>
            <Text style={styles.categoryTitle}>Featured Tours</Text>
            <Text style={styles.categorySub}>Handpicked</Text>
          </Pressable>

          <Pressable
            style={[styles.categoryCard, styles.catDomestic]}
            onPress={() => {
              onFilterType('DOMESTIC');
              onNavigate('tours');
            }}
          >
            <Text style={styles.categoryIcon}>🏔️</Text>
            <Text style={styles.categoryTitle}>Domestic Tours</Text>
            <Text style={styles.categorySub}>Across India</Text>
          </Pressable>

          <Pressable
            style={[styles.categoryCard, styles.catIntl]}
            onPress={() => {
              onFilterType('INTERNATIONAL');
              onNavigate('tours');
            }}
          >
            <Text style={styles.categoryIcon}>✈️</Text>
            <Text style={styles.categoryTitle}>International</Text>
            <Text style={styles.categorySub}>Worldwide</Text>
          </Pressable>

          <Pressable
            style={[styles.categoryCard, styles.catCustom]}
            onPress={onOpenCustomTour}
          >
            <Text style={styles.categoryIcon}>🎨</Text>
            <Text style={styles.categoryTitle}>Custom Tour</Text>
            <Text style={styles.categorySub}>Tailor-made</Text>
          </Pressable>

          <Pressable
            style={[styles.categoryCard, styles.catOffers]}
            onPress={onFilterSpecialOffers}
          >
            <Text style={styles.categoryIcon}>🏷️</Text>
            <Text style={styles.categoryTitle}>Special Offers</Text>
            <Text style={styles.categorySub}>Early Bird</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Destinations from the destinations catalog */}
      {destinations.length > 0 && (
        <View style={styles.destinationSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionEyebrow}>TOP PLACES TO VISIT</Text>
              <Text style={styles.sectionTitle}>Trending Destinations</Text>
            </View>
            <Pressable onPress={() => onNavigate('destinations')}>
              <Text style={styles.viewAllText}>Browse All →</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.destinationScroll}
          >
            {destinations.map(destination => (
              <Pressable
                key={destination.id}
                style={styles.destinationCard}
                onPress={() => onSelectDestination(destination)}
              >
                {destination.image_url ? (
                  <Image source={{uri: destination.image_url}} style={styles.destinationImage} />
                ) : (
                  <View style={[styles.destinationImage, styles.destinationImageFallback]} />
                )}
                <View style={styles.destinationOverlay} />
                <View style={styles.destinationContent}>
                  <Text style={styles.destinationCount}>
                    {destination.country || (destination.is_domestic ? 'DOMESTIC' : 'INTERNATIONAL')}
                  </Text>
                  <Text style={styles.destinationName} numberOfLines={1}>{destination.name}</Text>
                  <Text style={styles.destinationExplore}>Explore →</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Featured Tours Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionEyebrow}>TOP RATED PACKAGES</Text>
            <Text style={styles.sectionTitle}>Featured Journeys</Text>
          </View>
          <Pressable
            onPress={() => {
              onFilterType('FEATURED');
              onNavigate('tours');
            }}
          >
            <Text style={styles.viewAllText}>View All ({featuredTours.length}) →</Text>
          </Pressable>
        </View>

        {loading && tours.length === 0 ? <TourListSkeleton /> : featuredTours.slice(0, 3).map((tour, index) => (
          <TourCard
            key={`${tour.id || tour.slug || 'featured-tour'}-${index}`}
            tour={tour}
            onPress={() => onSelectTour(tour)}
            onEnquire={onEnquireTour ? () => onEnquireTour(tour) : undefined}
            isSaved={savedTours.includes(tour.slug)}
            onToggleSave={() => onToggleSave(tour.slug)}
          />
        ))}
      </View>

      {/* Custom Tour Banner */}
      <View style={styles.customBanner}>
        <View style={styles.customBannerContent}>
          <View style={styles.customBadge}>
            <Text style={styles.customBadgeText}>TAILORED EXPERIENCES</Text>
          </View>
          <Text style={styles.customBannerTitle}>
            Want a Custom Family or Corporate Trip?
          </Text>
          <Text style={styles.customBannerSub}>
            We customize hotels, private transport, flights, and sightseeing exactly as you prefer.
          </Text>
          <View style={styles.customBtnRow}>
            <Pressable style={styles.customBannerBtn} onPress={onOpenCustomTour}>
              <Text style={styles.customBannerBtnText}>Plan Custom Trip  →</Text>
            </Pressable>
            <Pressable
              style={styles.customWhatsappBtn}
              onPress={() =>
                openWhatsAppChat(
                  'Hello Gantabya, I am interested in planning a customized group trip!'
                )
              }
            >
              <Text style={styles.customWhatsappText}>💬 WhatsApp Us</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Domestic Highlights Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionEyebrow}>INCREDIBLE INDIA</Text>
            <Text style={styles.sectionTitle}>Domestic Wonders</Text>
          </View>
          <Pressable
            onPress={() => {
              onFilterType('DOMESTIC');
              onNavigate('tours');
            }}
          >
            <Text style={styles.viewAllText}>Explore India →</Text>
          </Pressable>
        </View>

        {domesticTours.slice(0, 2).map((tour, index) => (
          <TourCard
            key={`${tour.id || tour.slug || 'domestic-tour'}-${index}`}
            tour={tour}
            onPress={() => onSelectTour(tour)}
            onEnquire={onEnquireTour ? () => onEnquireTour(tour) : undefined}
            isSaved={savedTours.includes(tour.slug)}
            onToggleSave={() => onToggleSave(tour.slug)}
          />
        ))}
      </View>

      {/* International Escapes Section */}
      <View style={styles.internationalPoster}>
        {internationalPosterImage ? (
          <Image
            source={{ uri: internationalPosterImage }}
            style={styles.internationalPosterImage}
            resizeMode="cover"
          />
        ) : null}
        <View style={styles.internationalPosterOverlay}>
          <Text style={styles.internationalPosterEyebrow}>INTERNATIONAL TOURS</Text>
          <Text style={styles.internationalPosterTitle}>The world is waiting</Text>
          <Text style={styles.internationalPosterSubtitle}>Unforgettable journeys beyond borders</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionEyebrow}>GLOBAL HORIZONS</Text>
            <Text style={styles.sectionTitle}>International Tours</Text>
          </View>
          <Pressable
            onPress={() => {
              onFilterType('INTERNATIONAL');
              onNavigate('tours');
            }}
          >
            <Text style={styles.viewAllText}>Explore World →</Text>
          </Pressable>
        </View>

        {internationalTours.slice(0, 2).map((tour, index) => (
          <TourCard
            key={`${tour.id || tour.slug || 'international-tour'}-${index}`}
            tour={tour}
            onPress={() => onSelectTour(tour)}
            onEnquire={onEnquireTour ? () => onEnquireTour(tour) : undefined}
            isSaved={savedTours.includes(tour.slug)}
            onToggleSave={() => onToggleSave(tour.slug)}
          />
        ))}
      </View>

      {/* Why Choose Gantabya */}
      <View style={styles.whySection}>
        <Text style={styles.whyEyebrow}>WHY CHOOSE US</Text>
        <Text style={styles.whyTitle}>Travel with Confidence</Text>
        <View style={styles.trustGrid}>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🏆</Text>
            <Text style={styles.trustItemTitle}>30+ Years Legacy</Text>
            <Text style={styles.trustItemDesc}>Serving travellers with trust & perfection since 1994.</Text>
          </View>

          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🤝</Text>
            <Text style={styles.trustItemTitle}>Dedicated Tour Manager</Text>
            <Text style={styles.trustItemDesc}>Expert escort traveling with you from start to finish.</Text>
          </View>

          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>💎</Text>
            <Text style={styles.trustItemTitle}>Transparent Pricing</Text>
            <Text style={styles.trustItemDesc}>No hidden fees. Inclusive of hotels, meals & transfers.</Text>
          </View>

          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>📞</Text>
            <Text style={styles.trustItemTitle}>24x7 WhatsApp Help</Text>
            <Text style={styles.trustItemDesc}>Direct access to holiday planners at any time.</Text>
          </View>
        </View>
      </View>

      {/* Reviews Showcase */}
      <View style={styles.reviewsSection}>
        <Text style={styles.sectionEyebrow}>REAL EXPERIENCES</Text>
        <Text style={styles.sectionTitle}>Traveller Stories</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reviewsScroll}>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewStars}>★★★★★</Text>
            <Text style={styles.reviewQuote}>
              “Everything was planned so smoothly. Hotels, transfers and sightseeing in Kashmir were perfectly organized!”
            </Text>
            <Text style={styles.reviewerName}>Ananya Sharma · Kolkata</Text>
          </View>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewStars}>★★★★★</Text>
            <Text style={styles.reviewQuote}>
              “The Shinkansen bullet train and Mount Fuji views in Japan were unforgettable. Very attentive tour managers.”
            </Text>
            <Text style={styles.reviewerName}>Dr. Tanmoy Banerjee · Siliguri</Text>
          </View>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewStars}>★★★★★</Text>
            <Text style={styles.reviewQuote}>
              “One of our best family trips. Gantabyaa provided delicious meals and 4-star stays throughout.”
            </Text>
            <Text style={styles.reviewerName}>Rahul Verma · Cooch Behar</Text>
          </View>
        </ScrollView>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const makeStyles = (COLORS: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    bottomSpacer: {
      height: 24,
    },
    container: {
      flex: 1,
      backgroundColor: COLORS.bg,
    },
    heroSection: {
      height: 260,
      position: 'relative',
      justifyContent: 'flex-end',
      backgroundColor: COLORS.primaryDark,
    },
    heroImage: {
      ...StyleSheet.absoluteFill,
      width: '100%',
      height: 260,
      opacity: 0.5,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(7, 36, 33, 0.65)',
    },
    heroContent: {
      padding: 20,
      paddingBottom: 24,
    },
    sinceBadge: {
      backgroundColor: 'rgba(217, 119, 6, 0.2)',
      borderWidth: 1,
      borderColor: COLORS.gold,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 20,
      alignSelf: 'flex-start',
      marginBottom: 10,
    },
    sinceBadgeText: {
      color: COLORS.gold,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1,
    },
    heroHeadline: {
      fontSize: 28,
      fontWeight: '900',
      color: '#FFFFFF',
      lineHeight: 34,
    },
    heroGold: {
      color: COLORS.gold,
    },
    heroSub: {
      color: '#E2E8F0',
      fontSize: 13,
      marginTop: 6,
      marginBottom: 16,
      lineHeight: 18,
    },
    categoriesContainer: {
      paddingVertical: 18,
      paddingHorizontal: 16,
      backgroundColor: COLORS.card,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    destinationSection: {
      padding: 16,
      paddingBottom: 6,
    },
    destinationScroll: {
      gap: 12,
      paddingRight: 16,
    },
    destinationCard: {
      width: 190,
      height: 142,
      overflow: 'hidden',
      borderRadius: 16,
      backgroundColor: COLORS.primaryDark,
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: {width: 0, height: 3},
    },
    destinationImage: {
      ...StyleSheet.absoluteFill,
      width: '100%',
      height: '100%',
    },
    destinationImageFallback: {
      backgroundColor: COLORS.primaryDark,
    },
    destinationOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(6, 20, 38, 0.48)',
    },
    destinationContent: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 11,
    },
    destinationCount: {
      alignSelf: 'flex-start',
      color: '#FFFFFF',
      backgroundColor: COLORS.goldDark,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.4,
    },
    destinationName: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '900',
      marginTop: 5,
    },
    destinationExplore: {
      color: 'rgba(255, 255, 255, 0.82)',
      fontSize: 11,
      fontWeight: '700',
      marginTop: 3,
    },
    categoryPills: {
      gap: 12,
      paddingRight: 16,
      paddingTop: 8,
    },
    categoryCard: {
      width: 125,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
    },
    catFeatured: {
      backgroundColor: isDark ? '#2D2006' : '#FEF3C7',
      borderColor: isDark ? '#573E0C' : '#FDE68A',
    },
    catDomestic: {
      backgroundColor: isDark ? '#08253B' : '#E0F2FE',
      borderColor: isDark ? '#104468' : '#BAE6FD',
    },
    catIntl: {
      backgroundColor: isDark ? '#25143A' : '#F3E8FF',
      borderColor: isDark ? '#46246B' : '#E9D5FF',
    },
    catCustom: {
      backgroundColor: isDark ? '#072E26' : '#DCFCE7',
      borderColor: isDark ? '#0F5446' : '#BBF7D0',
    },
    catOffers: {
      backgroundColor: isDark ? '#3B101E' : '#FFE4E6',
      borderColor: isDark ? '#6B1B34' : '#FECDD3',
    },
    categoryIcon: {
      fontSize: 22,
      marginBottom: 6,
    },
    categoryTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: isDark ? '#FFFFFF' : '#0F172A',
    },
    categorySub: {
      fontSize: 10,
      color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#475569',
      marginTop: 2,
    },
    internationalPoster: {
      height: 190,
      marginHorizontal: 16,
      marginBottom: 8,
      overflow: 'hidden',
      borderRadius: 14,
      backgroundColor: '#12304A',
    },
    internationalPosterImage: {
      ...StyleSheet.absoluteFill,
    },
    internationalPosterOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      padding: 12,
      backgroundColor: 'rgba(5, 20, 38, 0.48)',
    },
    internationalPosterEyebrow: {
      color: '#FDE68A',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
      marginBottom: 4,
    },
    internationalPosterTitle: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },
    internationalPosterSubtitle: {
      color: 'rgba(255, 255, 255, 0.88)',
      fontSize: 10,
      marginTop: 3,
    },
    section: {
      padding: 16,
    },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.goldDark,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: COLORS.text,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  customBanner: {
    backgroundColor: COLORS.primaryDark,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  customBannerContent: {},
  customBadge: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  customBadgeText: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  customBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 6,
  },
  customBannerSub: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 16,
  },
  customBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  customBannerBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  customBannerBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  customWhatsappBtn: {
    backgroundColor: COLORS.whatsapp,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  customWhatsappText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  whySection: {
    backgroundColor: COLORS.card,
    padding: 20,
    marginVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  whyEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.goldDark,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  whyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  trustItem: {
    width: '48%',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trustIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  trustItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  trustItemDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
  reviewsSection: {
    padding: 16,
  },
  reviewsScroll: {
    gap: 12,
    paddingTop: 12,
    paddingRight: 16,
  },
  reviewCard: {
    width: 250,
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  reviewStars: {
    color: COLORS.gold,
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 8,
  },
  reviewQuote: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  reviewerName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
