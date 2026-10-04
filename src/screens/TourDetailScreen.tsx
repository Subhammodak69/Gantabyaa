import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Share,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useColors } from '../theme/theme';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Video from 'react-native-video';
import { TourPackageDetail, TourPackageSummary, SeasonVariant, NavScreen } from '../types';
import { fetchTourDetail, fetchTourVariant, fetchRulesRegulations, getTourWebUrl, openWhatsAppChat, submitReviewApi, updateReviewApi, fetchPackageReviews, fetchReviewEligibility } from '../api/tourApi';
import { RuleRegulation } from '../api/types';
import { TourDetailSkeleton } from '../components/Skeleton';
import { MediaViewer, MediaSelection } from '../components/MediaViewer';
import { showApiError } from '../utils/toast';

interface TourDetailScreenProps {
  slug: string;
  initialTour?: TourPackageSummary | null;
  onBack: () => void;
  onNavigate: (screen: NavScreen) => void;
  onStartEnquiry: (details: {
    tourSlug: string;
    tourTitle: string;
    variantName: string;
    variantId: string;
    destinationId: string;
    travelDate: string;
    durationDays?: number;
    durationNights?: number;
  }) => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  isLoggedIn: boolean;
}

const formatDepartureDate = (val?: string) => {
  if (!val) return 'N/A';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return val;
  }
};

export const TourDetailScreen: React.FC<TourDetailScreenProps> = ({
  slug,
  initialTour,
  onBack,
  onNavigate,
  onStartEnquiry,
  isSaved = false,
  onToggleSave,
  isLoggedIn,
}) => {
  const COLORS = useColors();
  const styles = makeStyles(COLORS);
  const [tour, setTour] = useState<TourPackageDetail | null>(null);
  const [heroVideoPlaying, setHeroVideoPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({
    '0': true,
    '1': true,
  });
  const [selectedMedia, setSelectedMedia] = useState<MediaSelection | null>(null);
  const [selectedMediaList, setSelectedMediaList] = useState<MediaSelection[] | null>(null);
  const [selectedDateDetail, setSelectedDateDetail] = useState<any | null>(null);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number>(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewEligibility, setReviewEligibility] = useState<{
    can_review: boolean;
    has_reviewed: boolean;
    review?: any;
  } | null>(null);
  const [reviewEligibilityLoading, setReviewEligibilityLoading] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const [rulesRegulations, setRulesRegulations] = useState<RuleRegulation[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState('');

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTourDetail(slug, initialTour);
      let reviews = data.reviews || [];
      try {
        const revRes = await fetchPackageReviews(slug);
        if (revRes.reviews && revRes.reviews.length > 0) {
          reviews = revRes.reviews;
        }
      } catch {
        // Keep the embedded reviews if the separate reviews request fails.
      }
      setTour({ ...data, reviews });
      if (data.seasons && data.seasons.length > 0) {
        const defaultIdx = data.seasons.findIndex(s => s.is_default);
        const activeIdx = defaultIdx >= 0 ? defaultIdx : 0;
        setSelectedSeasonIndex(activeIdx);
        if (data.seasons[activeIdx].dates?.length > 0) setSelectedDate(data.seasons[activeIdx].dates[0].date);
      }
    } catch (error) { showApiError(error, 'Could not load tour details.'); }
    finally { setLoading(false); }
  }, [slug, initialTour]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const loadRulesRegulations = useCallback(async () => {
    if (!tour?.type) return;
    setRulesLoading(true);
    setRulesError('');
    try {
      const rules = await fetchRulesRegulations(tour.type === 'DOMESTIC' ? 'dom' : 'int');
      setRulesRegulations(rules);
    } catch (error) {
      setRulesRegulations([]);
      setRulesError(error instanceof Error ? error.message : 'Could not load package rules and regulations.');
    } finally {
      setRulesLoading(false);
    }
  }, [tour?.type]);

  useEffect(() => {
    setRulesRegulations([]);
    setRulesError('');
    if (tour?.type) loadRulesRegulations();
  }, [loadRulesRegulations, tour?.type]);

  useEffect(() => {
    let active = true;
    const reviewSlug = tour?.slug || slug;

    if (!isLoggedIn || !reviewSlug) {
      setReviewEligibility(null);
      setReviewEligibilityLoading(false);
      return () => { active = false; };
    }

    setReviewEligibilityLoading(true);
    fetchReviewEligibility(reviewSlug)
      .then(result => {
        if (active) {
          setReviewEligibility(result);
          if (result?.has_reviewed && result?.review) {
            setReviewRating(result.review.rating || 5);
            setReviewText(result.review.review || '');
          }
        }
      })
      .catch(() => {
        if (active) setReviewEligibility(null);
      })
      .finally(() => {
        if (active) setReviewEligibilityLoading(false);
      });

    return () => { active = false; };
  }, [isLoggedIn, slug, tour?.slug]);

  const activeSeason: SeasonVariant | undefined =
    tour?.seasons?.[selectedSeasonIndex] || tour?.seasons?.[0];

  const handleSeasonChange = async (index: number) => {
    setSelectedSeasonIndex(index);
    const selected = tour?.seasons?.[index];
    if (!selected || !tour) return;
    if (selected.id || selected.key) {
      try {
        const result = await fetchTourVariant(tour.slug, selected.key || selected.id);
        setTour(current => current ? {...current, seasons: [current.seasons[0], result.variant, ...current.seasons.slice(2)]} : current);
      } catch (error) {
        showApiError(error, 'Could not load this package option.');
      }
    }
    if (selected.dates?.length) {
      setSelectedDate(selected.dates[0].date);
    }
  };

  const toggleDay = (index: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const expandAllDays = () => {
    if (!activeSeason?.itinerary) return;
    const allExpanded: Record<string, boolean> = {};
    activeSeason.itinerary.forEach((_, idx) => {
      allExpanded[String(idx)] = true;
    });
    setExpandedDays(allExpanded);
  };

  const handleShare = async () => {
    if (!tour) return;
    try {
      const shareUrl = getTourWebUrl(tour.slug);
      await Share.share({
        title: tour.title,
        message: `Check out ${tour.title} with Gantabya!\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // share canceled
    }
  };

  const handleWhatsAppInquiry = () => {
    if (!tour || !activeSeason) return;
    const msg = `Hello Gantabya, I am interested in:\n- Tour: ${tour.title} (${tour.tour_code})\n- Season / Package: ${activeSeason.name}\n- Preferred Date: ${selectedDate || 'Upcoming departure'}\n- Duration: ${activeSeason.duration}\n- Quoted Price: ₹${activeSeason.price?.toLocaleString('en-IN')}\n\nPlease share booking details and seat availability!`;
    openWhatsAppChat(msg);
  };

  const handleEnquirePress = () => {
    if (!tour || !activeSeason) return;
    onStartEnquiry({
      tourSlug: tour.slug,
      tourTitle: tour.title,
      variantName: activeSeason.name,
      variantId: activeSeason.id,
      destinationId: (tour as any).destination_id || '',
      travelDate: selectedDate || (activeSeason.dates?.[0]?.date ?? ''),
      durationDays: activeSeason.duration_days,
      durationNights: activeSeason.duration_nights,
    });
  };

  const handleReviewSubmit = async () => {
    if (!reviewEligibility?.can_review && !(reviewEligibility?.has_reviewed && editingReview)) {
      setReviewMessage('You need to complete this journey to write a verified review.');
      return;
    }
    if (!reviewText.trim()) { setReviewMessage('Please write a short review first.'); return; }
    setReviewSubmitting(true);
    setReviewMessage('');
    try {
      if (editingReview) {
        const reviewId = reviewEligibility?.review?.id;
        if (!reviewId) throw new Error('Could not find your review to update. Please refresh and try again.');
        await updateReviewApi(reviewId, {
          rating: reviewRating,
          review: reviewText.trim(),
          review_gallery: reviewEligibility.review.review_gallery || [],
        });
      } else {
        await submitReviewApi({package_id: tour?.id || '', rating: reviewRating, review: reviewText.trim(), review_gallery: []});
      }
      if (!editingReview) setReviewText('');
      setEditingReview(false);
      setReviewMessage(editingReview ? 'Your review has been updated.' : 'Thank you! Your review was submitted for approval.');
      const reviewSlug = tour?.slug || slug;
      if (reviewSlug) {
        const [eligibilityResult, reviewsResult] = await Promise.all([
          fetchReviewEligibility(reviewSlug),
          fetchPackageReviews(reviewSlug),
        ]);
        setReviewEligibility(eligibilityResult);
        if (reviewsResult.reviews) {
          setTour(current => current ? { ...current, reviews: reviewsResult.reviews } : current);
        }
      }
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : 'Could not submit your review. Please sign in and try again.');
    } finally { setReviewSubmitting(false); }
  };

  if (loading) {
    return <TourDetailSkeleton />;
  }

  if (!tour || !activeSeason) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Could not load tour details.</Text>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go Back to Tours</Text>
        </Pressable>
      </View>
    );
  }

  const isDomestic = tour.type === 'DOMESTIC';
  const heroVideo = activeSeason.banner_video || tour.banner_video;
  const priceFormatted = activeSeason.price
    ? `₹${Number(activeSeason.price).toLocaleString('en-IN')}`
    : 'Call for Price';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDetail} colors={[COLORS.primary]} />}>
        {/* Top Hero Image & Actions */}
        <View style={styles.heroWrapper}>
          <Image
            source={{ uri: activeSeason.cover_image }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {heroVideo && heroVideoPlaying && (
            <View style={styles.heroVideoLayer} pointerEvents="none">
              <Video
                source={{ uri: heroVideo }}
                style={styles.heroImage}
                resizeMode="cover"
                repeat
                muted
                paused={false}
                playInBackground={false}
                playWhenInactive={false}
              />
            </View>
          )}
          <View style={styles.heroGradient} />

          {/* Floating Actions */}
          <View style={styles.topActions}>
            <Pressable onPress={onBack} style={styles.circleBtn} hitSlop={10}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>

            <View style={styles.topRightBtns}>
              {heroVideo && (
                <Pressable
                  onPress={() => setHeroVideoPlaying(value => !value)}
                  onHoverIn={() => setHeroVideoPlaying(true)}
                  onHoverOut={() => setHeroVideoPlaying(false)}
                  accessibilityRole="button"
                  accessibilityLabel={heroVideoPlaying ? 'Pause tour video preview' : 'Play tour video preview'}
                  style={styles.circleBtn}
                  hitSlop={10}
                >
                  <Text style={styles.videoPreviewIcon}>{heroVideoPlaying ? 'Ⅱ' : '▶'}</Text>
                </Pressable>
              )}
              <Pressable onPress={handleShare} style={styles.circleBtn} hitSlop={10}>
                <Text style={styles.shareIcon}>📤</Text>
              </Pressable>

              {onToggleSave && (
                <Pressable onPress={onToggleSave} style={styles.circleBtn} hitSlop={10}>
                  <Text style={styles.favIcon}>{isSaved ? '❤️' : '🤍'}</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Badges in Hero */}
          <View style={styles.heroBottomContent}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badge,
                  isDomestic ? styles.domesticBadge : styles.intlBadge,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isDomestic ? styles.domesticBadgeText : styles.intlBadgeText,
                  ]}
                >
                  {tour.type}
                </Text>
              </View>

              {activeSeason.badge && (
                <View style={styles.seasonBadge}>
                  <Text style={styles.seasonBadgeText}>★ {activeSeason.badge}</Text>
                </View>
              )}
            </View>

            <Text style={styles.heroTitle}>{tour.title}</Text>
            <Text style={styles.heroLocation}>📍 {tour.destination} · {tour.tour_code}</Text>
          </View>
        </View>

        {/* Pricing & Duration Bar */}
        <View style={styles.priceDurationBar}>
          <View>
            <Text style={styles.priceBarLabel}>Starting from</Text>
            <Text style={styles.priceBarValue}>
              {priceFormatted}
              <Text style={styles.priceBarUnit}> / person</Text>
            </Text>
          </View>

          <View style={styles.durationPill}>
            <Text style={styles.durationPillText}>⏱ {activeSeason.duration}</Text>
            {activeSeason.seats ? (
              <Text style={styles.seatsText}>🟢 {activeSeason.seats} Seats Left</Text>
            ) : null}
          </View>
        </View>

        {/* Tour Overview / Description */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.overviewText}>{tour.description}</Text>
        </View>

        {/* Season & Variant Switcher */}
        {tour.seasons && tour.seasons.length > 1 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Choose Season / Variant</Text>
            <Text style={styles.sectionSubtitle}>
              Select a package variation to see route, dates, and pricing
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonChipsRow}>
              {tour.seasons.map((season, idx) => {
                const isSelected = selectedSeasonIndex === idx;
                return (
                  <Pressable
                    key={season.id || season.key}
                    onPress={() => handleSeasonChange(idx)}
                    style={[
                      styles.seasonChip,
                      isSelected && styles.seasonChipActive,
                    ]}
                  >
                    <Text style={[styles.seasonChipTitle, isSelected && styles.seasonChipTitleActive]}>
                      {season.name}
                    </Text>
                    <Text style={[styles.seasonChipPrice, isSelected && styles.seasonChipPriceActive]}>
                      ₹{Number(season.price).toLocaleString('en-IN')} · {season.duration}
                    </Text>
                    {season.badge && (
                      <View style={styles.chipMiniBadge}>
                        <Text style={styles.chipMiniBadgeText}>{season.badge}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Route Stops / Timeline */}
        {activeSeason.route && activeSeason.route.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tour Route & Night Stays</Text>
            <View style={styles.routeContainer}>
              {activeSeason.route.map((stop, index) => (
                <View key={stop.id || index} style={styles.routeStep}>
                  <View style={styles.routeStepLeft}>
                    <View style={styles.routeBullet}>
                      <Text style={styles.routeBulletNum}>{index + 1}</Text>
                    </View>
                    {index < activeSeason.route.length - 1 && <View style={styles.routeLine} />}
                  </View>
                  <View style={styles.routeStepRight}>
                    <Text style={styles.routePlace}>{stop.place}{(stop as any).nights ? ' · ' + (stop as any).nights + 'N' : ''}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Key Highlights */}
        {activeSeason.highlights && activeSeason.highlights.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tour Highlights</Text>
            <View style={styles.highlightsGrid}>
              {activeSeason.highlights.map((h, i) => (
                <View key={h.id || i} style={styles.highlightItem}>
                  <Text style={styles.highlightStar}>✦</Text>
                  <Text style={styles.highlightText}>{h.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeSeason.gallery && activeSeason.gallery.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Journey Gallery</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
              {activeSeason.gallery.map((media, index) => media.url ? (
                media.type === 'video' ? (
                  <Pressable
                    key={media.id || index}
                    style={styles.galleryVideo}
                    onPress={() => {
                      const mediaList = (activeSeason?.gallery || []).filter(item => Boolean(item.url)).map(item => ({
                        uri: item.url as string,
                        type: (item.type === 'video' || /\.(mp4|webm|mov)(?:$|[?#])/i.test(item.url || '') ? 'video' : 'image') as 'image' | 'video',
                        title: item.alt || tour?.title || 'Tour Gallery',
                      }));
                      setSelectedMediaList(mediaList);
                      setSelectedMediaIndex(mediaList.findIndex(item => item.uri === media.url));
                      setSelectedMedia({
                        uri: media.url as string,
                        type: 'video',
                        title: media.alt || `${tour?.title || 'Tour'} video`,
                      });
                    }}
                  >
                    <Text style={styles.galleryVideoIcon}>▶</Text>
                    <Text style={styles.galleryVideoText}>Watch video</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    key={media.id || index}
                    onPress={() => {
                      const mediaList = (activeSeason?.gallery || []).filter(item => Boolean(item.url)).map(item => ({
                        uri: item.url as string,
                        type: (item.type === 'video' || /\.(mp4|webm|mov)(?:$|[?#])/i.test(item.url || '') ? 'video' : 'image') as 'image' | 'video',
                        title: item.alt || tour?.title || 'Tour Gallery',
                      }));
                      setSelectedMediaList(mediaList);
                      setSelectedMediaIndex(mediaList.findIndex(item => item.uri === media.url));
                      setSelectedMedia({
                        uri: media.url as string,
                        type: 'image',
                        title: media.alt || `${tour?.title || 'Tour'} gallery`,
                      });
                    }}
                  >
                    <Image source={{uri: media.url}} style={styles.galleryImage} accessibilityLabel={media.alt || 'Tour gallery image'} />
                  </Pressable>
                )
              ) : null)}
            </ScrollView>
          </View>
        )}

        {/* Upcoming Departure Dates */}
        {activeSeason.dates && activeSeason.dates.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Upcoming Departures</Text>
            <Text style={styles.sectionSubtitle}>
              Tap any date to check seat availability & details:
            </Text>

            <View style={styles.datesList}>
              {activeSeason.dates.map((d, i) => {
                const dateVal = d.departure_date || d.date || '';
                const isSelected = selectedDate === dateVal || selectedDate === d.date;
                const hasSeats = d.available_seats !== undefined && d.available_seats !== null;
                const isSoldOut = hasSeats && (d.available_seats as number) <= 0;
                const isFewSeats = hasSeats && (d.available_seats as number) > 0 && (d.available_seats as number) <= 5;

                return (
                  <Pressable
                    key={d.id || i}
                    onPress={() => {
                      setSelectedDate(dateVal);
                      setSelectedDateDetail(d);
                      setDateModalVisible(true);
                    }}
                    style={[
                      styles.dateRowCard,
                      isSelected && styles.dateRowCardSelected,
                    ]}
                  >
                    <View style={styles.dateCardLeft}>
                      <View style={[styles.dateCalIconBox, isSelected && styles.dateCalIconBoxSelected]}>
                        <Text style={styles.dateCalEmoji}>📅</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dateCardTitle, isSelected && styles.dateCardTitleSelected]}>
                          {dateVal}
                        </Text>
                        {Boolean(d.return_date) && (
                          <Text style={styles.dateCardReturn}>Return: {d.return_date}</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.dateCardRight}>
                      {hasSeats ? (
                        <View style={[
                          styles.seatStatusBadge,
                          isSoldOut ? styles.seatBadgeSoldOut : isFewSeats ? styles.seatBadgeFew : styles.seatBadgeAvailable,
                        ]}>
                          <Text style={[
                            styles.seatStatusText,
                            isSoldOut ? styles.seatTextSoldOut : isFewSeats ? styles.seatTextFew : styles.seatTextAvailable,
                          ]}>
                            {isSoldOut ? 'Sold Out' : isFewSeats ? `${d.available_seats} Left` : `${d.available_seats} Seats`}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.checkSeatsBadge}>
                          <Text style={styles.checkSeatsText}>Check Seats →</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Day by Day Itinerary */}
        {activeSeason.itinerary && activeSeason.itinerary.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.itineraryHeaderRow}>
              <Text style={styles.sectionTitle}>Day-by-Day Itinerary</Text>
              <Pressable onPress={expandAllDays}>
                <Text style={styles.expandAllText}>Expand All</Text>
              </Pressable>
            </View>

            {activeSeason.itinerary.map((dayItem, idx) => {
              const isExpanded = !!expandedDays[String(idx)];
              return (
                <View key={dayItem.id || idx} style={styles.itineraryCard}>
                  <Pressable
                    onPress={() => toggleDay(String(idx))}
                    style={styles.itineraryCardHeader}
                  >
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>DAY {idx + 1}</Text>
                    </View>
                    <Text style={styles.itineraryDayTitle} numberOfLines={1}>
                      {dayItem.title || 'Day ' + dayItem.day}
                    </Text>
                    <Text style={styles.expandChevron}>{isExpanded ? '▲' : '▼'}</Text>
                  </Pressable>

                  {isExpanded && (
                    <View style={styles.itineraryCardBody}>
                      <Text style={styles.itineraryDesc}>{dayItem.description}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Inclusions and Exclusions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>What's Included & Excluded</Text>

          <Text style={styles.subSectionTitle}>✅ Inclusions</Text>
          {activeSeason.inclusions?.map((inc, i) => (
            <View key={i} style={styles.checkItem}>
              <Text style={styles.greenCheck}>✓</Text>
              <Text style={styles.includeText}>{inc}</Text>
            </View>
          ))}

          <Text style={[styles.subSectionTitle, styles.exclusionsTitle]}>❌ Exclusions</Text>
          {activeSeason.exclusions?.map((exc, i) => (
            <View key={i} style={styles.checkItem}>
              <Text style={styles.redCross}>✕</Text>
              <Text style={styles.excludeText}>{exc}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rules &amp; Regulations</Text>
          <Text style={styles.sectionSubtitle}>
            {isDomestic ? 'Domestic tour' : 'International tour'} travel requirements
          </Text>
          {rulesLoading ? (
            <View style={styles.rulesLoading}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={styles.rulesMessage}>Loading rules and regulations...</Text>
            </View>
          ) : rulesError ? (
            <View>
              <Text style={styles.rulesError}>{rulesError}</Text>
              <Pressable onPress={loadRulesRegulations} style={styles.rulesRetry}>
                <Text style={styles.rulesRetryText}>Try again</Text>
              </Pressable>
            </View>
          ) : rulesRegulations.length ? (
            rulesRegulations.map(rule => (
              <View key={rule.id} style={styles.ruleItem}>
                <Text style={styles.ruleTitle}>{rule.rule_title}</Text>
                {!!rule.regulations && <Text style={styles.ruleText}>{rule.regulations}</Text>}
              </View>
            ))
          ) : (
            <Text style={styles.rulesMessage}>No additional rules or regulations are available for this package.</Text>
          )}
        </View>

        {/* Reviews Section */}
        <View style={styles.sectionCard}>
          <View style={styles.reviewSummaryHeader}>
            <View>
              <Text style={styles.sectionTitle}>Traveller Reviews</Text>
              <Text style={styles.reviewScore}>⭐ {tour.reviews?.length ? (tour.reviews.reduce((sum, review) => sum + review.rating, 0) / tour.reviews.length).toFixed(1) : '0.0'} <Text style={styles.reviewCount}>({tour.reviews?.length || 0} review{tour.reviews?.length === 1 ? '' : 's'})</Text></Text>
            </View>
          </View>

          {reviewEligibilityLoading ? (
            <View style={styles.reviewState}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={styles.reviewStateText}>Checking review eligibility...</Text>
            </View>
          ) : !isLoggedIn ? (
            <View style={styles.reviewState}>
              <Text style={styles.reviewStateText}>Sign in to share your verified review.</Text>
              <Pressable style={styles.reviewSecondaryButton} onPress={() => onNavigate('auth')}>
                <Text style={styles.reviewSecondaryText}>Sign in</Text>
              </Pressable>
            </View>
          ) : reviewEligibility?.has_reviewed && !editingReview ? (
            <View style={styles.reviewState}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={{ fontSize: 16 }}>✅</Text>
                <Text style={[styles.reviewStateText, { fontWeight: '700', color: COLORS.success }]}>
                  You have reviewed this tour
                </Text>
              </View>
              {reviewEligibility.review?.review ? (
                <Text style={[styles.reviewBody, { marginTop: 4, fontStyle: 'italic' }]}>
                  “{reviewEligibility.review.review}”
                </Text>
              ) : null}
              <Text style={[styles.reviewStateText, { marginTop: 4, fontSize: 12 }]}>
                Thank you for sharing your verified experience!
              </Text>
              {reviewEligibility.review?.id ? (
                <Pressable
                  style={styles.reviewSecondaryButton}
                  onPress={() => setEditingReview(true)}
                >
                  <Text style={styles.reviewSecondaryText}>Edit review</Text>
                </Pressable>
              ) : null}
            </View>
          ) : !reviewEligibility?.can_review && !editingReview ? (
            <View style={styles.reviewState}>
              <Text style={styles.reviewStateText}>You need to complete this journey to write a verified review.</Text>
              <Text style={[styles.reviewStateText, { fontSize: 11, color: COLORS.textMuted, marginTop: 4 }]}>
                Reviews can be submitted once your tour package booking has been completed.
              </Text>
            </View>
          ) : (
          <View style={styles.reviewForm}>
            <Text style={styles.reviewFormTitle}>{editingReview ? 'Edit your review' : 'Share your experience'}</Text>
            <View style={styles.ratingPicker}>
              {[1, 2, 3, 4, 5].map(value => <Pressable key={value} onPress={() => setReviewRating(value)} hitSlop={4}><Text style={[styles.ratingStar, value <= reviewRating && styles.ratingStarActive]}>★</Text></Pressable>)}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Tell other travellers about your trip..."
              placeholderTextColor={COLORS.textMuted}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              textAlignVertical="top"
            />
            {reviewMessage ? <Text style={styles.reviewFormMessage}>{reviewMessage}</Text> : null}
            <Pressable style={[styles.reviewSubmit, reviewSubmitting && styles.reviewSubmitDisabled]} onPress={handleReviewSubmit} disabled={reviewSubmitting}>
              {reviewSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.reviewSubmitText}>{editingReview ? 'Update review' : 'Submit review'}</Text>}
            </Pressable>
          </View>
          )}

          {tour.reviews?.map(rev => (
            <View key={rev.id} style={styles.reviewItem}>
              <View style={styles.reviewTopRow}>
                <View style={styles.reviewerIdentity}>
                  {rev.reviewer_pic ? <Image source={{uri: rev.reviewer_pic}} style={styles.reviewerPic} /> : null}
                  <Text style={styles.reviewerName}>{rev.name || rev.reviewer_by}</Text>
                </View>
                <Text style={styles.reviewStars}>{'★'.repeat(rev.rating)}</Text>
              </View>
              <Text style={styles.reviewBody}>“{rev.review}”</Text>
              {rev.review_gallery && rev.review_gallery.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reviewGalleryRow}>
                  {rev.review_gallery.map((media, index) => media.url && media.type !== 'video' && !/\.(mp4|webm|mov)(?:$|[?#])/i.test(media.url) ? (
                    <Pressable key={media.id || index} onPress={() => {
                      const mediaList = rev.review_gallery?.filter(item => Boolean(item.url)).map(item => ({
                        uri: item.url as string,
                        type: (item.type === 'video' || /\.(mp4|webm|mov)(?:$|[?#])/i.test(item.url || '') ? 'video' : 'image') as 'image' | 'video',
                        title: item.alt || 'Review media',
                      })) || [];
                      setSelectedMediaList(mediaList);
                      setSelectedMediaIndex(mediaList.findIndex(item => item.uri === media.url));
                      setSelectedMedia({uri: media.url as string, type: 'image', title: media.alt || 'Review photo'});
                    }}>
                      <Image source={{uri: media.url}} style={styles.reviewGalleryImage} />
                    </Pressable>
                  ) : media.url ? (
                    <Pressable key={media.id || index} onPress={() => {
                      const mediaList = rev.review_gallery?.filter(item => Boolean(item.url)).map(item => ({
                        uri: item.url as string,
                        type: (item.type === 'video' || /\.(mp4|webm|mov)(?:$|[?#])/i.test(item.url || '') ? 'video' : 'image') as 'image' | 'video',
                        title: item.alt || 'Review media',
                      })) || [];
                      setSelectedMediaList(mediaList);
                      setSelectedMediaIndex(mediaList.findIndex(item => item.uri === media.url));
                      setSelectedMedia({uri: media.url as string, type: 'video', title: media.alt || 'Review video'});
                    }} style={styles.reviewVideoLink}>
                      <Text style={styles.reviewVideoText}>▶ Video</Text>
                    </Pressable>
                  ) : null)}
                </ScrollView>
              )}
              {rev.is_verified && (
                <Text style={styles.verifiedPill}>✓ Verified Guest</Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Bottom Booking Bar matching design */}
      <View style={styles.fixedBottomBar}>
        <Pressable
          style={styles.whatsappActionBtn}
          onPress={handleWhatsAppInquiry}
        >
          <FontAwesome name="whatsapp" size={20} color="#25D366" style={{ marginRight: 6 }} />
          <Text style={styles.whatsappActionText}>WhatsApp</Text>
        </Pressable>

        <Pressable
          style={styles.enquireActionBtn}
          onPress={handleEnquirePress}
        >
          <Text style={styles.enquireActionText}>Enquire Now  →</Text>
        </Pressable>
      </View>

      {/* Fullscreen Media Viewer with Prev/Next Navigation */}
      {selectedMedia && (
        <MediaViewer
          mediaList={selectedMediaList || (activeSeason?.gallery || [])
            .filter(item => Boolean(item.url))
            .map(item => ({
              uri: item.url as string,
              type: (item.type === 'video' ? 'video' : 'image') as 'image' | 'video',
              title: item.alt || tour?.title || 'Tour Gallery',
            }))}
          initialIndex={selectedMediaIndex}
          media={selectedMedia}
          onClose={() => {
            setSelectedMedia(null);
            setSelectedMediaList(null);
          }}
        />
      )}
      {/* Departure Date Detail Modal matching Web App */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={dateModalVisible && !!selectedDateDetail}
        onRequestClose={() => setDateModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDateModalVisible(false)}
        >
          <Pressable
            style={styles.modalSheet}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Top Sheet Handle */}
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalCalIcon}>
                <Text style={styles.modalCalIconText}>📅</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderLabel}>Departure Information</Text>
                <Text style={styles.modalHeaderTitle} numberOfLines={2}>
                  {tour?.title || 'Tour Package'}
                </Text>
              </View>
              <Pressable
                onPress={() => setDateModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={12}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </Pressable>
            </View>

            {/* Date Cards */}
            {selectedDateDetail && (
              <>
                <View style={styles.modalDateRow}>
                  <View style={styles.modalDateCard}>
                    <Text style={styles.modalDateLabel}>Departure Date</Text>
                    <Text style={styles.modalDateValue}>
                      {formatDepartureDate(selectedDateDetail.departure_date || selectedDateDetail.date)}
                    </Text>
                  </View>
                  <View style={styles.modalDateCard}>
                    <Text style={styles.modalDateLabel}>Return Date</Text>
                    <Text style={styles.modalDateValue}>
                      {formatDepartureDate(selectedDateDetail.return_date)}
                    </Text>
                  </View>
                </View>

                {/* Seat Availability Card */}
                {(() => {
                  const totalSeats = selectedDateDetail.total_seats != null ? Number(selectedDateDetail.total_seats) : null;
                  const availableSeats = selectedDateDetail.available_seats != null ? Number(selectedDateDetail.available_seats) : null;
                  const bookedSeats = totalSeats !== null && availableSeats !== null ? Math.max(0, totalSeats - availableSeats) : null;
                  const occupancyPercent =
                    totalSeats && totalSeats > 0 && availableSeats !== null
                      ? Math.min(100, Math.round(((totalSeats - availableSeats) / totalSeats) * 100))
                      : null;
                  const isSoldOut = availableSeats !== null && availableSeats <= 0;
                  const isFewSeats = availableSeats !== null && availableSeats > 0 && availableSeats <= 5;

                  return (
                    <View style={styles.modalSeatCard}>
                      <View style={styles.modalSeatHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 16 }}>👥</Text>
                          <Text style={styles.modalSeatTitle}>Seat Availability</Text>
                        </View>
                        <View style={[
                          styles.seatPill,
                          isSoldOut ? styles.seatPillSoldOut : isFewSeats ? styles.seatPillFew : styles.seatPillOk,
                        ]}>
                          <Text style={[
                            styles.seatPillText,
                            isSoldOut ? styles.seatPillTextSoldOut : isFewSeats ? styles.seatPillTextFew : styles.seatPillOk,
                          ]}>
                            {isSoldOut ? 'Sold Out' : isFewSeats ? 'Few Seats Left' : 'Available'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.modalSeatCountRow}>
                        <View style={styles.modalSeatCountCard}>
                          <Text style={styles.modalSeatCountLabel}>Available Seats</Text>
                          <Text style={[
                            styles.modalSeatCountValue,
                            isSoldOut ? { color: COLORS.danger } : isFewSeats ? { color: COLORS.warning } : { color: COLORS.success },
                          ]}>
                            {availableSeats !== null ? availableSeats : 'Open'}
                          </Text>
                        </View>
                        <View style={styles.modalSeatCountCard}>
                          <Text style={styles.modalSeatCountLabel}>Total Seats</Text>
                          <Text style={[styles.modalSeatCountValue, { color: COLORS.text }]}>
                            {totalSeats !== null ? totalSeats : '20+'}
                          </Text>
                        </View>
                      </View>

                      {occupancyPercent !== null && bookedSeats !== null && (
                        <View style={{ marginTop: 12 }}>
                          <View style={styles.progressLabelRow}>
                            <Text style={styles.progressLabel}>{bookedSeats} booked</Text>
                            <Text style={styles.progressLabel}>{occupancyPercent}% filled</Text>
                          </View>
                          <View style={styles.progressTrack}>
                            <View style={[
                              styles.progressFill,
                              {
                                width: (occupancyPercent + '%'),
                                backgroundColor: occupancyPercent >= 90 ? COLORS.danger : occupancyPercent >= 60 ? COLORS.warning : COLORS.primary,
                              }
                            ]} />
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Modal Action Buttons */}
                <View style={styles.modalActions}>
                  <Pressable
                    style={styles.modalCloseAction}
                    onPress={() => setDateModalVisible(false)}
                  >
                    <Text style={styles.modalCloseActionText}>Close</Text>
                  </Pressable>
                  <Pressable
                    style={styles.modalEnquireAction}
                    onPress={() => {
                      const chosenDate = selectedDateDetail.departure_date || selectedDateDetail.date || '';
                      setSelectedDate(chosenDate);
                      setDateModalVisible(false);
                      onStartEnquiry({
                        tourSlug: tour?.slug || slug,
                        tourTitle: tour?.title || '',
                        variantName: activeSeason?.name || '',
                        variantId: activeSeason?.id || '',
                        destinationId: (tour as any)?.destination_id || '',
                        travelDate: chosenDate,
                        durationDays: activeSeason?.duration_days || 0,
                        durationNights: activeSeason?.duration_nights || 0,
                      });
                    }}
                  >
                    <Text style={styles.modalEnquireActionText}>Book / Enquire Date →</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const makeStyles = (COLORS: ReturnType<typeof useColors>) => StyleSheet.create({
  rulesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rulesMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  rulesError: {
    fontSize: 13,
    color: COLORS.danger,
    lineHeight: 19,
  },
  rulesRetry: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  rulesRetryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  ruleItem: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ruleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  ruleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  exclusionsTitle: {
    marginTop: 16,
  },
  bottomSpacer: {
    height: 100,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroWrapper: {
    height: 340,
    position: 'relative',
    backgroundColor: COLORS.primaryDark,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroVideoLayer: {
    ...StyleSheet.absoluteFill,
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  topActions: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRightBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  shareIcon: {
    fontSize: 16,
  },
  favIcon: {
    fontSize: 16,
  },
  videoPreviewIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  heroBottomContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  domesticBadge: {
    backgroundColor: '#0284C7',
  },
  domesticBadgeText: {
    color: '#FFFFFF',
  },
  intlBadge: {
    backgroundColor: '#7C3AED',
  },
  intlBadgeText: {
    color: '#FFFFFF',
  },
  seasonBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  seasonBadgeText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 30,
  },
  heroLocation: {
    fontSize: 13,
    color: '#E2E8F0',
    marginTop: 4,
    fontWeight: '600',
  },
  priceDurationBar: {
    backgroundColor: COLORS.card,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  priceBarLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  priceBarValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },
  priceBarUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  durationPill: {
    alignItems: 'flex-end',
  },
  durationPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  seatsText: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  overviewText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  seasonChipsRow: {
    gap: 10,
    paddingTop: 4,
  },
  seasonChip: {
    padding: 12,
    borderRadius: 10,
    maxWidth: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    minWidth: 160,
  },
  seasonChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  seasonChipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  seasonChipTitleActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  seasonChipPrice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  seasonChipPriceActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  chipMiniBadge: {
    marginTop: 6,
    backgroundColor: COLORS.goldLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chipMiniBadgeText: {
    fontSize: 9,
    color: COLORS.goldDark,
    fontWeight: '800',
  },
  routeContainer: {
    marginTop: 8,
  },
  routeStep: {
    flexDirection: 'row',
    minHeight: 38,
  },
  routeStepLeft: {
    alignItems: 'center',
    width: 28,
  },
  routeBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeBulletNum: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  routeLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },
  routeStepRight: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 14,
  },
  routePlace: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  highlightsGrid: {
    gap: 8,
    marginTop: 4,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  highlightStar: {
    color: COLORS.gold,
    fontSize: 14,
    marginTop: 2,
  },
  highlightText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  datesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  galleryRow: {
    gap: 10,
    paddingTop: 10,
  },
  galleryImage: {
    width: 230,
    height: 150,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
  },
  galleryVideo: {
    width: 230,
    height: 150,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryVideoIcon: {
    color: COLORS.gold,
    fontSize: 28,
  },
  galleryVideoText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 6,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dateChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  selectedCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  itineraryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expandAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  itineraryCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  itineraryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.surface,
  },
  dayBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  dayBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  itineraryDayTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  expandChevron: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  itineraryCardBody: {
    padding: 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  itineraryDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 6,
    marginBottom: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  greenCheck: {
    color: COLORS.success,
    fontWeight: '900',
    fontSize: 13,
  },
  redCross: {
    color: COLORS.danger,
    fontWeight: '900',
    fontSize: 13,
  },
  includeText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  excludeText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  reviewSummaryHeader: {
    marginBottom: 12,
  },
  reviewForm: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  reviewState: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 4,
  },
  reviewStateText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  reviewSecondaryButton: {
    borderColor: COLORS.primary,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reviewSecondaryText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  reviewFormTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  ratingPicker: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 5,
    marginBottom: 8,
  },
  ratingStar: {
    fontSize: 25,
    color: COLORS.borderDark,
  },
  ratingStarActive: {
    color: COLORS.gold,
  },
  reviewInput: {
    minHeight: 76,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
  },
  reviewFormMessage: {
    color: COLORS.success,
    fontSize: 11,
    marginTop: 7,
  },
  reviewSubmit: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 9,
  },
  reviewSubmitDisabled: {
    opacity: 0.65,
  },
  reviewSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  reviewScore: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.goldDark,
    marginTop: 2,
  },
  reviewCount: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  reviewItem: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 12,
  },
  reviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewerPic: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  reviewStars: {
    color: COLORS.gold,
    fontSize: 12,
  },
  reviewBody: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  reviewGalleryRow: {
    gap: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  reviewGalleryImage: {
    width: 100,
    height: 72,
    borderRadius: 7,
  },
  reviewVideoLink: {
    width: 100,
    height: 72,
    borderRadius: 7,
    backgroundColor: COLORS.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewVideoText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  verifiedPill: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: '700',
    marginTop: 4,
  },
  fixedBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },
  whatsappActionBtn: {
    flex: 1,
    borderWidth:1,
    borderColor: COLORS.success,
    backgroundColor: '#ffffffff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 8,
  },
  whatsappActionIcon: {
    fontSize: 18,
  },
  whatsappActionText: {
    color: '#0c0c0cff',
    fontWeight: '800',
    fontSize: 14,
  },
  enquireActionBtn: {
    flex: 1.4,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  enquireActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  // ── Departure Dates List & Modal Styles ──
  datesList: {
    gap: 8,
    marginTop: 4,
  },
  dateRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateRowCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySubtle,
  },
  dateCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dateCalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateCalIconBoxSelected: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.primary,
  },
  dateCalEmoji: {
    fontSize: 16,
  },
  dateCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  dateCardTitleSelected: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  dateCardReturn: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  dateCardRight: {
    marginLeft: 8,
  },
  seatStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  seatBadgeSoldOut: {
    backgroundColor: '#FEE2E2',
  },
  seatBadgeFew: {
    backgroundColor: '#FEF3C7',
  },
  seatBadgeAvailable: {
    backgroundColor: '#D1FAE5',
  },
  seatStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  seatTextSoldOut: {
    color: '#DC2626',
  },
  seatTextFew: {
    color: '#B45309',
  },
  seatTextAvailable: {
    color: '#059669',
  },
  checkSeatsBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  checkSeatsText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 26, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalCalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCalIconText: {
    fontSize: 22,
  },
  modalHeaderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 20,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  modalDateRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  modalDateCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  modalDateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  modalDateValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 17,
  },
  modalSeatCard: {
    backgroundColor: COLORS.primarySubtle,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 16,
  },
  modalSeatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalSeatTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seatPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  seatPillSoldOut: {
    backgroundColor: '#FEE2E2',
  },
  seatPillFew: {
    backgroundColor: '#FEF3C7',
  },
  seatPillOk: {
    backgroundColor: '#D1FAE5',
  },
  seatPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  seatPillTextSoldOut: {
    color: '#DC2626',
  },
  seatPillTextFew: {
    color: '#B45309',
  },
  seatPillTextOk: {
    color: '#059669',
  },
  modalSeatCountRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalSeatCountCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  modalSeatCountLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 3,
  },
  modalSeatCountValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  progressTrack: {
    height: 7,
    backgroundColor: COLORS.border,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCloseAction: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  modalCloseActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modalEnquireAction: {
    flex: 1.6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalEnquireActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
