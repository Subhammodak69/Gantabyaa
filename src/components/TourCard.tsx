import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import Video from 'react-native-video';
import { useColors } from '../theme/theme';
import { TourPackageSummary } from '../types';

interface TourCardProps {
  tour: TourPackageSummary;
  onPress: () => void;
  onEnquire?: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  layout?: 'vertical' | 'horizontal';
}

export const TourCard: React.FC<TourCardProps> = ({
  tour,
  onPress,
  onEnquire,
  isSaved = false,
  onToggleSave,
  layout = 'vertical',
}) => {
  const COLORS = useColors();
  const styles = makeStyles(COLORS);
  const [previewing, setPreviewing] = useState(false);
  const isDomestic = tour.type === 'DOMESTIC';
  const coverImage = tour.cover_image?.trim();
  const priceFormatted = tour.starting_price
    ? `₹${Number(tour.starting_price).toLocaleString('en-IN')}`
    : 'Contact Us';

  if (layout === 'horizontal') {
    return (
      <Pressable
        onPress={onPress}
        onHoverIn={() => { if (tour.banner_video) setPreviewing(true); }}
        onHoverOut={() => setPreviewing(false)}
        style={({ pressed }) => [
          styles.horizontalCard,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.horizontalImageContainer}>
          {coverImage ? (
            <Image
              source={{ uri: coverImage }}
              style={styles.horizontalImage}
              resizeMode="cover"
            />
          ) : null}
          {previewing && tour.banner_video ? (
            <Video
              source={{ uri: tour.banner_video }}
              style={styles.horizontalVideo}
              resizeMode="cover"
              repeat
              muted
              paused={false}
              playInBackground={false}
              playWhenInactive={false}
            />
          ) : null}
          {tour.banner_video && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={previewing ? 'Stop tour video preview' : 'Play tour video preview'}
              style={styles.horizontalPreviewBtn}
              onPress={() => setPreviewing(value => !value)}
            >
              <Text style={styles.previewBtnText}>{previewing ? '■' : '▶'}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.horizontalInfo}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.typeBadge,
                isDomestic ? styles.domesticBadge : styles.intlBadge,
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  isDomestic ? styles.domesticBadgeText : styles.intlBadgeText,
                ]}
              >
                {tour.type}
              </Text>
            </View>
            <Text style={styles.durationText}>{tour.duration || 'Multi-day'}</Text>
          </View>

          <Text style={styles.horizontalTitle} numberOfLines={1}>
            {tour.title}
          </Text>
          <Text style={styles.destinationText} numberOfLines={1}>
            📍 {tour.destination}
          </Text>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Starting from</Text>
              <Text style={styles.priceValue}>{priceFormatted}</Text>
            </View>
            <Text style={styles.viewLink}>View  →</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => { if (tour.banner_video) setPreviewing(true); }}
      onHoverOut={() => setPreviewing(false)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.imageContainer}>
        {coverImage ? (
          <Image
            source={{ uri: coverImage }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : null}
        {previewing && tour.banner_video && (
          <Video
            source={{ uri: tour.banner_video }}
            style={styles.imageVideo}
            resizeMode="cover"
            repeat
            muted
            paused={false}
            playInBackground={false}
            playWhenInactive={false}
          />
        )}
        <View style={styles.imageGradient} />

        <View style={styles.topBadgeRow}>
          <View
            style={[
              styles.typeBadge,
              isDomestic ? styles.domesticBadge : styles.intlBadge,
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                isDomestic ? styles.domesticBadgeText : styles.intlBadgeText,
              ]}
            >
              {tour.type}
            </Text>
          </View>

          {tour.badge && (
            <View style={styles.specialBadge}>
              <Text style={styles.specialBadgeText}>★ {tour.badge}</Text>
            </View>
          )}

          {onToggleSave && (
            <Pressable
              onPress={onToggleSave}
              hitSlop={10}
              style={styles.favoriteBtn}
            >
              <Text style={styles.favoriteIcon}>{isSaved ? '❤️' : '🤍'}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.durationOverlay}>
          <Text style={styles.durationOverlayText}>⏱ {tour.duration}</Text>
        </View>
        {tour.banner_video && (
          <Pressable style={styles.previewBtn} onPress={() => setPreviewing(value => !value)}>
            <Text style={styles.previewBtnText}>{previewing ? '■ Stop preview' : '▶ Preview'}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Text style={styles.tourCode}>{tour.tour_code}</Text>
          <Text style={styles.destinationPill}>📍 {tour.destination}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {tour.title}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {tour.description}
        </Text>

        <View style={styles.divider} />

        <View style={styles.footerRow}>
          <View>
            <Text style={styles.startingLabel}>Starting from</Text>
            <Text style={styles.priceMain}>
              {priceFormatted}
              <Text style={styles.pricePerPerson}> /person</Text>
            </Text>
          </View>

          <View style={styles.btnRow}>
            {onEnquire && (
              <Pressable
                onPress={onEnquire}
                style={styles.enquireBtn}
                hitSlop={6}
              >
                <Text style={styles.enquireBtnText}>Enquire</Text>
              </Pressable>
            )}

            <Pressable onPress={onPress} style={styles.exploreBtn} hitSlop={6}>
              <Text style={styles.exploreBtnText}>Details →</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const makeStyles = (COLORS: ReturnType<typeof useColors>) => StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  imageContainer: {
    height: 190,
    width: '100%',
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageVideo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topBadgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
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
  specialBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  specialBadgeText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '700',
  },
  favoriteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  favoriteIcon: {
    fontSize: 15,
  },
  durationOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  previewBtn: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  previewBtnText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tourCode: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  destinationPill: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  startingLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceMain: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  pricePerPerson: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enquireBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#FFFFFF',
  },
  enquireBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  exploreBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Horizontal Card styles
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  horizontalImage: {
    width: 110,
    height: '100%',
    minHeight: 115,
  },
  horizontalImageContainer: {
    width: 110,
    minHeight: 115,
    position: 'relative',
    overflow: 'hidden',
  },
  horizontalVideo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  horizontalPreviewBtn: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    minWidth: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.gold,
  },
  horizontalInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  durationText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  horizontalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  destinationText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  viewLink: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
