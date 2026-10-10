import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useColors } from '../theme/theme';
import { NavScreen } from '../types';
import { openWhatsAppChat } from '../api/tourApi';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.72, 250);

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: NavScreen) => void;
  onFilterTours?: (type: 'ALL' | 'DOMESTIC' | 'INTERNATIONAL' | 'FEATURED') => void;
  onOpenCustomTour?: () => void;
  userPhone?: string;
  isLoggedIn?: boolean;
}

export const DrawerMenu: React.FC<DrawerMenuProps> = ({
  visible,
  onClose,
  onNavigate,
  onFilterTours,
  onOpenCustomTour,
  userPhone,
  isLoggedIn = false,
}) => {
  const COLORS = useColors();
  const styles = makeStyles(COLORS);

  // Animation values (Left to Right)
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setRendered(false);
      });
    }
  }, [visible, translateX, backdropOpacity]);

  if (!rendered && !visible) {
    return null;
  }

  const handleNav = (screen: NavScreen) => {
    onClose();
    onNavigate(screen);
  };

  const handleFilter = (type: 'ALL' | 'DOMESTIC' | 'INTERNATIONAL' | 'FEATURED') => {
    onClose();
    if (onFilterTours) {
      onFilterTours(type);
    }
    onNavigate('tours');
  };

  return (
    <View style={styles.container} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Dimmed backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.55],
            }),
          },
        ]}
      >
        <Pressable style={styles.flexFill} onPress={onClose} />
      </Animated.View>

      {/* Slide-in drawer container (Right to Left) */}
      <Animated.View
        style={[
          styles.drawerContent,
          {
            transform: [{ translateX }],
          },
        ]}
      >

        <ScrollView
          style={styles.menuScroll}
          contentContainerStyle={styles.menuScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionHeader}>EXPLORE DESTINATIONS</Text>

          <Pressable style={styles.menuItem} onPress={() => handleNav('destinations')}>
            <Text style={styles.menuIcon}>🗺️</Text>
            <Text style={styles.menuLabel}>All Destinations</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => handleFilter('ALL')}
          >
            <Text style={styles.menuIcon}>🗺️</Text>
            <Text style={styles.menuLabel}>All Tour Packages</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => handleFilter('DOMESTIC')}
          >
            <Text style={styles.menuIcon}>🏔️</Text>
            <Text style={styles.menuLabel}>Domestic India Tours</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => handleFilter('INTERNATIONAL')}
          >
            <Text style={styles.menuIcon}>✈️</Text>
            <Text style={styles.menuLabel}>International Journeys</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => handleFilter('FEATURED')}
          >
            <Text style={styles.menuIcon}>🌟</Text>
            <Text style={styles.menuLabel}>Featured & Popular</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>

          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>SERVICES & TOOLS</Text>

          <Pressable
            style={styles.menuItem}
            onPress={() => handleNav('ranking')}
          >
            <Text style={styles.menuIcon}>🏆</Text>
            <Text style={styles.menuLabel}>Public leaderboard</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => {
              onClose();
              if (onOpenCustomTour) onOpenCustomTour();
            }}
          >
            <Text style={styles.menuIcon}>🎨</Text>
            <Text style={styles.menuLabel}>Custom Tour Request</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => handleNav('enquiry')}
          >
            <Text style={styles.menuIcon}>📝</Text>
            <Text style={styles.menuLabel}>Book / Send Enquiry</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => handleNav('notifications')}
          >
            <Text style={styles.menuIcon}>🔔</Text>
            <Text style={styles.menuLabel}>Notifications & Offers</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>

          <Pressable
            style={styles.menuItem}
            onPress={() => handleNav('profile')}
          >
            <Text style={styles.menuIcon}>👤</Text>
            <Text style={styles.menuLabel}>My Account & History</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>

          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>INSTANT SUPPORT</Text>

          <Pressable style={styles.menuItem} onPress={() => handleNav('contact')}>
            <Text style={styles.menuIcon}>☎</Text>
            <Text style={styles.menuLabel}>Contact Us</Text>
            <Text style={styles.menuArrow}>›</Text>
          </Pressable>

          <Pressable
            style={[styles.menuItem, styles.whatsappItem]}
            onPress={() => {
              onClose();
              openWhatsAppChat(
                'Hello Gantabya, I would like to inquire about your holiday tour packages!'
              );
            }}
          >
            <Text style={styles.menuIcon}>💬</Text>
            <View style={styles.flexFill}>
              <Text style={styles.whatsappLabel}>WhatsApp Helpline</Text>
              <Text style={styles.whatsappSub}>Instant response 24x7</Text>
            </View>
            <Text style={styles.menuArrow}>↗</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const makeStyles = (COLORS: ReturnType<typeof useColors>) => StyleSheet.create({
  flexFill: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4d494972',
  },
  drawerContent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: COLORS.bg,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    display: 'flex',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 13,
    marginHorizontal: 12,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  userStatus: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  signInBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 6,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 24,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIcon: {
    fontSize: 16,
    width: 26,
  },
  menuLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.text,
  },
  menuArrow: {
    fontSize: 18,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  newBadge: {
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.goldDark,
  },
  whatsappItem: {
    backgroundColor: COLORS.primarySubtle,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderBottomWidth: 0,
    marginTop: 6,
  },
  whatsappLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.whatsappDark,
  },
  whatsappSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
});
