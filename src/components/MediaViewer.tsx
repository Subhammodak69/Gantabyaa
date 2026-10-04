import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Image,
  Share,
  StatusBar,
  StyleSheet,
  Linking,
  PanResponder,
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../theme/theme';

export interface MediaSelection {
  uri: string;
  type: 'image' | 'video';
  title?: string;
}

function getVideoHeaders(uri: string) {
  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
    Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.8',
  };
  if (uri.includes('mixkit.co')) {
    headers.Referer = 'https://mixkit.co/';
    headers.Origin = 'https://mixkit.co';
  }
  return headers;
}

interface Props {
  mediaList?: MediaSelection[];
  initialIndex?: number;
  media?: MediaSelection | null;
  onClose: () => void;
}

export const MediaViewer: React.FC<Props> = ({
  mediaList = [],
  initialIndex = 0,
  media,
  onClose,
}) => {
  const items: MediaSelection[] =
    mediaList.length > 0
      ? mediaList
      : media
      ? [media]
      : [];

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [error, setError] = useState('');

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < items.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, items.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setError('');
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setError('');
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, items.length]);

  // PanResponder to handle left/right swipe gestures
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Detect horizontal swipe with minimum movement
          return (
            Math.abs(gestureState.dx) > 20 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -50 && hasNext) {
            handleNext();
          } else if (gestureState.dx > 50 && hasPrev) {
            handlePrev();
          }
        },
      }),
    [hasPrev, hasNext, handlePrev, handleNext]
  );

  if (items.length === 0 || currentIndex < 0 || currentIndex >= items.length) {
    return null;
  }

  const currentMedia = items[currentIndex];

  const share = () =>
    Share.share({
      message: currentMedia.uri,
      title: currentMedia.title || 'Gantabyaa media',
    });

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={styles.iconButton}
            accessibilityLabel="Close media viewer"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.title} numberOfLines={1}>
              {currentMedia.title || 'Tour Gallery'}
            </Text>
            {items.length > 1 && (
              <Text style={styles.counterText}>
                {currentIndex + 1} / {items.length}
              </Text>
            )}
          </View>

          <Pressable
            onPress={share}
            style={styles.iconButton}
            accessibilityLabel="Share media"
          >
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Main Content Area with Swipe Gesture Support */}
        <View style={styles.content} {...panResponder.panHandlers}>
          {currentMedia.type === 'video' ? (
            <>
              <Video
                key={currentMedia.uri}
                source={{
                  uri: currentMedia.uri,
                  type: 'mp4',
                  headers: getVideoHeaders(currentMedia.uri),
                }}
                style={styles.video}
                resizeMode="contain"
                controls
                paused={false}
                fullscreenAutorotate
                fullscreenOrientation="all"
                preventsDisplaySleepDuringVideoPlayback
                playInBackground={false}
                playWhenInactive={false}
                ignoreSilentSwitch="ignore"
                onLoad={() => setError('')}
                onError={event => {
                  const detail = event?.error;
                  const message =
                    detail?.errorString ||
                    detail?.localizedDescription ||
                    'This video could not be played on this device.';
                  setError(message);
                }}
              />
              {error ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorTitle}>Unable to play this video</Text>
                  <Text style={styles.errorText}>{error}</Text>
                  <Pressable
                    onPress={() => Linking.openURL(currentMedia.uri)}
                    style={styles.browserButton}
                  >
                    <Text style={styles.browserButtonText}>Open in browser</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : (
            <Image
              key={currentMedia.uri}
              source={{ uri: currentMedia.uri }}
              style={styles.image}
              resizeMode="contain"
            />
          )}

          {/* Left / Prev Subtle Navigation Tap Area */}
          {hasPrev && (
            <Pressable
              style={[styles.tapZone, styles.tapZoneLeft]}
              onPress={handlePrev}
              hitSlop={10}
            >
              <View style={styles.subtlePill}>
                <Ionicons name="chevron-back" size={22} color="rgba(255, 255, 255, 0.7)" />
              </View>
            </Pressable>
          )}

          {/* Right / Next Subtle Navigation Tap Area */}
          {hasNext && (
            <Pressable
              style={[styles.tapZone, styles.tapZoneRight]}
              onPress={handleNext}
              hitSlop={10}
            >
              <View style={styles.subtlePill}>
                <Ionicons name="chevron-forward" size={22} color="rgba(255, 255, 255, 0.7)" />
              </View>
            </Pressable>
          )}
        </View>

        {/* Bottom Footer Controls */}
        <View style={styles.footer}>
          <Pressable onPress={onClose} style={styles.doneButton}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#041312',
  },
  header: {
    height: 70,
    paddingHorizontal: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
  },
  counterText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  tapZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '25%',
    justifyContent: 'center',
    zIndex: 20,
  },
  tapZoneLeft: {
    left: 0,
    alignItems: 'flex-start',
    paddingLeft: 12,
  },
  tapZoneRight: {
    right: 0,
    alignItems: 'flex-end',
    paddingRight: 12,
  },
  subtlePill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 82,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorText: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  browserButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gold,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  browserButtonText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  footer: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
