import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../theme/theme';

interface SplashScreenProps {
  onFinished: () => void;
  autoAdvance?: boolean;
  showActions?: boolean;
  onExplorePress?: () => void;
  onLoginPress?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinished,
  autoAdvance = true,
  showActions = false,
  onExplorePress,
  onLoginPress,
}) => {
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start();

    if (!autoAdvance) {
      return undefined;
    }

    const timer = setTimeout(onFinished, 3500);
    return () => clearTimeout(timer);
  }, [autoAdvance, entrance, onFinished]);

  return (
    <View style={styles.background}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=85' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: entrance,
            transform: [{
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            }],
          },
        ]}
      >
        {/* Match the transparent logo lockup used on the auth screen. */}
        <View style={styles.logoContainer}>
          <Text style={styles.brandEyebrow}>TRAVEL · DISCOVER · REPEAT</Text>
          <View style={styles.logoCircle}>
            <Image
              source={require('../assets/gantabya-transparent.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandTitle}>GANTABYAA</Text>
          <Text style={styles.brandSubtitle}>TRAVEL</Text>
          <View style={styles.brandDivider}>
            <View style={styles.goldLine} />
            <Text style={styles.brandSince}>EST. 1994</Text>
            <View style={styles.goldLine} />
          </View>
          <Text style={styles.tagline}>Explore the World with Us</Text>
        </View>

        {/* Feature Pills */}
        <View style={styles.featuresRow}>
          <View style={styles.featurePill}>
            <Text style={styles.featurePillText}>✈️  Curated Tours</Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.featurePillText}>🛡️  Verified Stays</Text>
          </View>
          <View style={styles.featurePill}>
            <Text style={styles.featurePillText}>⭐  Trusted Since 1994</Text>
          </View>
        </View>

        {!showActions ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator size="small" color={COLORS.gold} />
            <Text style={styles.loadingText}>Preparing your next adventure</Text>
          </View>
        ) : null}
        {showActions ? (
          <View style={styles.actions}>
            <Text style={styles.actionsHeading}>Your next journey starts here</Text>
            <Pressable
              onPress={onExplorePress ?? onFinished}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>Explore Tours (Guest Access)  →</Text>
            </Pressable>

            <Pressable
              onPress={onLoginPress ?? onFinished}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <Text style={styles.secondaryBtnText}>Sign In / Member Login</Text>
            </Pressable>

            <Text style={styles.noLoginNote}>
              ✓ No login required to browse & view complete itineraries
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 36, 33, 0.78)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 0,
  },
  brandEyebrow: {
    color: '#FDE68A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.4,
    marginBottom: 8,
  },
  logoCircle: {
    width: 104,
    height: 98,
    borderRadius: 0,
    backgroundColor: 'transparent',
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    overflow: 'visible',
  },
  brandLogo: {
    width: 104,
    height: 98,
    borderRadius: 0,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  brandSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gold,
    letterSpacing: 6,
    marginTop: 2,
  },
  brandDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  goldLine: {
    width: 34,
    height: 2,
    backgroundColor: COLORS.gold,
    borderRadius: 1,
  },
  brandSince: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '600',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 30,
  },
  featurePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  featurePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    marginTop: 30,
  },
  actionsHeading: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  loadingArea: {
    alignItems: 'center',
    marginTop: 30,
  },
  loadingText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    letterSpacing: 0.3,
  },
  primaryBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 12,
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  noLoginNote: {
    color: '#CBD5E1',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 4,
  },
});
