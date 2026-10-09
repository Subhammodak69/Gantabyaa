import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Easing,
  StatusBar,
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { useTheme } from '../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { OtpRequestData, getStoredReferralCode, googleAuth, requestOtp, verifyOtp } from '../api/tourApi';
import { showApiError } from '../utils/toast';
import { useAppDialog } from '../components/AppDialog';

type AuthMode = 'LOGIN' | 'SIGNUP';
const GOOGLE_CLIENT_ID_WEB = '862608710351-m9n9qdpm33q9qvbmbjok9ia1cnftv0d7.apps.googleusercontent.com';

interface Props {
  onLoginSuccess: (identifier: string) => void;
}

export const AuthScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const { colors: COLORS, isDark } = useTheme();
  const styles = makeStyles(COLORS, isDark);
  const insets = useSafeAreaInsets();
  const { showDialog } = useAppDialog();
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const bubbleOne = useRef(new Animated.Value(0)).current;
  const bubbleTwo = useRef(new Animated.Value(0)).current;
  const bubbleThree = useRef(new Animated.Value(0)).current;
  const bubbleFour = useRef(new Animated.Value(0)).current;
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [expiresIn, setExpiresIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [hasReferral, setHasReferral] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({ webClientId: GOOGLE_CLIENT_ID_WEB });
    getStoredReferralCode().then(code => setHasReferral(Boolean(code))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!otpSent || expiresIn <= 0) return;
    const timer = setInterval(() => setExpiresIn(value => value - 1), 1000);
    return () => clearInterval(timer);
  }, [otpSent, expiresIn]);

  useEffect(() => {
    const animateBubble = (value: Animated.Value, duration: number, delay: number) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return loop;
    };

    const animations = [
      animateBubble(bubbleOne, 6200, 0),
      animateBubble(bubbleTwo, 7100, 700),
      animateBubble(bubbleThree, 5600, 1100),
      animateBubble(bubbleFour, 7600, 400),
    ];

    return () => animations.forEach(animation => animation.stop());
  }, [bubbleFour, bubbleOne, bubbleThree, bubbleTwo]);

  useEffect(() => {
    const statusBar = StatusBar as typeof StatusBar & {
      setBackgroundColor?: (color: string, animated?: boolean) => void;
    };
    statusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
    statusBar.setBackgroundColor?.(isDark ? COLORS.primaryDark : '#EAFBFB', true);
  }, [COLORS.primaryDark, isDark]);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setOtpSent(false);
    setOtp('');
    setExpiresIn(0);
  };

  const sendOtp = async () => {
    const value = identifier.trim();
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!looksLikeEmail) {
      await showDialog({
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
        variant: 'warning',
      });
      return;
    }
    if (mode === 'SIGNUP' && name.trim().length < 2) {
      await showDialog({
        title: 'Name Required',
        message: 'Please enter your full name to create an account.',
        variant: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      const response = await requestOtp(value, mode);
      const otpData = response.data as OtpRequestData | undefined;
      setOtpSent(true);
      setOtp('');
      setExpiresIn(otpData?.expires_in_sec ?? 300);
      await showDialog({
        title: 'Verification Code Sent! 📩',
        message: response.message || `We have sent a verification code to ${value}.`,
        variant: 'success',
      });
    } catch (error) {
      showApiError(error, 'We could not send the OTP. Please check the details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (otp.trim().length < 4) {
      await showDialog({
        title: 'Incomplete Code',
        message: 'Please enter the verification code you received.',
        variant: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(identifier.trim(), otp.trim(), mode === 'SIGNUP' ? name.trim() : '', mode, (await getStoredReferralCode()) || undefined);
      onLoginSuccess(identifier.trim());
    } catch (error) {
      showApiError(error, 'The verification code could not be verified. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signOut();

      const response = await GoogleSignin.signIn();
      if (response.type === 'cancelled') {
        return;
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        throw new Error('Google did not return an ID token. Please try again.');
      }

      await googleAuth(idToken, (await getStoredReferralCode()) || undefined);
      onLoginSuccess(response.data.user.email || response.data.user.name || 'google_user');
    } catch (error: unknown) {
      if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) {
        return;
      }
      const message = isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
        ? 'Google Play Services is unavailable. Please update it and try again.'
        : error instanceof Error ? error.message : 'Google sign-in failed. Please try again.';
      showApiError(error, message);
    } finally {
      setGoogleLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      {/* Soft multicolored bubbles animate behind the working form. */}
      <View pointerEvents="none" style={styles.bubbleBackdrop}>
        <Animated.View
          style={[
            styles.bubble,
            styles.bubbleOne,
            {
              transform: [
                { translateY: bubbleOne.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) },
                { translateX: bubbleOne.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) },
                { scale: bubbleOne.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            styles.bubbleTwo,
            {
              transform: [
                { translateY: bubbleTwo.interpolate({ inputRange: [0, 1], outputRange: [0, -28] }) },
                { translateX: bubbleTwo.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) },
                { scale: bubbleTwo.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            styles.bubbleThree,
            {
              transform: [
                { translateY: bubbleThree.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
                { translateX: bubbleThree.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.bubble,
            styles.bubbleFour,
            {
              transform: [
                { translateY: bubbleFour.interpolate({ inputRange: [0, 1], outputRange: [0, -24] }) },
                { translateX: bubbleFour.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
                { scale: bubbleFour.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
              ],
            },
          ]}
        />
      </View>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Branding Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../assets/gantabya-transparent.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandTitle}>GANTABYAA</Text>
          <Text style={styles.title}>
            {mode === 'LOGIN'
              ? 'Log in to stay on top of your journeys.'
              : 'Create your account and simplify travel.'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'LOGIN'
              ? 'Manage bookings, tour enquiries, and travel plans from one place.'
              : 'Join Gantabyaa to plan trips, save favourites, and get personalized offers.'}
          </Text>
        </View>

        {/* Functional form: intentionally kept outside a card for a cleaner production layout. */}
        <View style={styles.card}>
          {hasReferral && (
            <View style={styles.referralNotice} accessibilityRole="text">
              <Text style={styles.referralNoticeTitle}>Invite applied</Text>
              <Text style={styles.referralNoticeText}>Your invite will be linked to this account.</Text>
            </View>
          )}
          {mode === 'SIGNUP' && !otpSent && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Rahul Sen"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS *</Text>
            <TextInput
              style={[styles.input, otpSent && styles.inputDisabled]}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="name@example.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!otpSent}
              returnKeyType={otpSent ? 'next' : 'done'}
            />
          </View>

          {otpSent && (
            <View style={styles.otpSection}>
              <View style={styles.otpHeaderRow}>
                <Text style={styles.label}>ENTER VERIFICATION CODE</Text>
                <Pressable
                  onPress={() => {
                    setOtpSent(false);
                    setOtp('');
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.changeLinkText}>Change Number</Text>
                </Pressable>
              </View>

              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otp}
                onChangeText={val => setOtp(val.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              <View style={styles.timerRow}>
                <Text style={styles.timerText}>
                  {expiresIn > 0
                    ? `Expires in ${Math.floor(expiresIn / 60)}:${(expiresIn % 60)
                        .toString()
                        .padStart(2, '0')}`
                    : 'Code expired'}
                </Text>
                <Pressable onPress={sendOtp} disabled={loading} accessibilityRole="button" accessibilityLabel="Resend verification code">
                  <Text style={[styles.resendText, loading && styles.submitBtnDisabled]}>{loading ? 'Sending...' : 'Resend Code'}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Submit CTA Button */}
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              loading && styles.submitBtnDisabled,
              pressed && !loading && styles.submitBtnPressed,
            ]}
            onPress={otpSent ? verify : sendOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {otpSent
                  ? mode === 'SIGNUP'
                    ? 'Verify & Create Account →'
                    : 'Verify & Sign In →'
                  : 'Send Verification Code →'}
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${mode === 'LOGIN' ? 'Sign in' : 'Sign up'} with Google`}
            style={({ pressed }) => [styles.googleBtn, (loading || googleLoading) && styles.submitBtnDisabled, pressed && styles.submitBtnPressed]}
            onPress={signInWithGoogle}
            disabled={loading || googleLoading}
          >
            {googleLoading ? <ActivityIndicator color={COLORS.primary} size="small" /> : <Text style={styles.googleBtnText}>Continue with Google</Text>}
          </Pressable>
        </View>

        {/* Footer switch prompt */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>
            {mode === 'SIGNUP' ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          </Text>
          <Pressable onPress={() => changeMode(mode === 'SIGNUP' ? 'LOGIN' : 'SIGNUP')} hitSlop={8}>
            <Text style={styles.footerLinkText}>
              {mode === 'SIGNUP' ? 'Sign In' : 'Create an Account'}
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
};

const makeStyles = (COLORS: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? COLORS.primaryDark : '#EAFBFB',
    },
    bubbleBackdrop: {
      ...StyleSheet.absoluteFill,
      overflow: 'hidden',
    },
    bubble: {
      position: 'absolute',
      borderRadius: 999,
    },
    bubbleOne: {
      width: 250,
      height: 250,
      top: 18,
      left: -72,
      backgroundColor: isDark ? 'rgba(26, 181, 190, 0.22)' : 'rgba(43, 191, 211, 0.38)',
    },
    bubbleTwo: {
      width: 210,
      height: 210,
      top: 74,
      right: -92,
      backgroundColor: isDark ? 'rgba(137, 92, 236, 0.22)' : 'rgba(255, 153, 190, 0.32)',
    },
    bubbleThree: {
      width: 150,
      height: 150,
      top: 320,
      left: -64,
      backgroundColor: isDark ? 'rgba(242, 140, 65, 0.18)' : 'rgba(255, 204, 92, 0.34)',
    },
    bubbleFour: {
      width: 260,
      height: 260,
      bottom: -142,
      right: -100,
      backgroundColor: isDark ? 'rgba(41, 153, 210, 0.18)' : 'rgba(139, 149, 255, 0.28)',
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 38,
      paddingBottom: 36,
      alignItems: 'stretch',
    },
    heroSection: {
      alignItems: 'center',
      marginBottom: 26,
      maxWidth: 350,
      alignSelf: 'center',
    },
    logoCircle: {
      width: 208,
      height: 194,
      borderRadius: 0,
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 0,
      marginBottom: 2,
      overflow: 'visible',
    },
    brandLogo: {
      width: 208,
      height: 194,
      borderRadius: 0,
    },
    brandTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: isDark ? COLORS.gold : '#0E8D98',
      letterSpacing: 2,
      marginBottom: 9,
    },
    title: {
      fontSize: 26,
      fontWeight: '900',
      color: isDark ? '#FFFFFF' : COLORS.text,
      letterSpacing: -0.4,
      lineHeight: 32,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: isDark ? 'rgba(255, 255, 255, 0.72)' : COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginTop: 8,
      maxWidth: 340,
    },
    card: {
      width: '100%',
      backgroundColor: 'transparent',
      borderRadius: 0,
      padding: 0,
      borderWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
    },
    inputGroup: {
      marginBottom: 14,
    },
    label: {
      fontSize: 10,
      fontWeight: '800',
      color: isDark ? 'rgba(255, 255, 255, 0.85)' : COLORS.textSecondary,
      letterSpacing: 0.8,
      marginBottom: 7,
    },
    input: {
      height: 52,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.18)' : '#DCEFF0',
      borderRadius: 13,
      paddingHorizontal: 14,
      color: isDark ? '#FFFFFF' : COLORS.text,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.22)' : '#F7FCFC',
      fontSize: 14,
    },
    inputDisabled: {
      opacity: 0.6,
    },
    otpSection: {
      marginTop: 4,
      marginBottom: 14,
    },
    otpHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    changeLinkText: {
      fontSize: 12,
      color: isDark ? COLORS.gold : COLORS.primary,
      fontWeight: '700',
    },
    otpInput: {
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: 8,
      textAlign: 'center',
      height: 54,
      color: isDark ? '#FFFFFF' : COLORS.text,
    },
    timerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    timerText: {
      fontSize: 12,
      color: isDark ? 'rgba(255, 255, 255, 0.65)' : COLORS.textSecondary,
      fontWeight: '600',
    },
    resendText: {
      fontSize: 12,
      color: isDark ? COLORS.gold : COLORS.primary,
      fontWeight: '800',
    },
    submitBtn: {
      backgroundColor: isDark ? '#26C6C9' : '#16BEC5',
      borderRadius: 13,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
      elevation: 3,
      shadowColor: isDark ? '#26C6C9' : '#16BEC5',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.99 }],
    },
    submitBtnText: {
      color: isDark ? '#062B31' : '#FFFFFF',
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0.2,
    },
    googleBtn: {
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : '#D7E8E9',
      borderRadius: 13,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FAFEFE',
    },
    googleBtnText: {
      color: isDark ? '#FFFFFF' : COLORS.text,
      fontSize: 14,
      fontWeight: '800',
    },
    referralNotice: {
      backgroundColor: isDark ? 'rgba(251, 191, 36, 0.12)' : COLORS.goldLight,
      borderRadius: 10,
      padding: 11,
      marginBottom: 12,
    },
    referralNoticeTitle: {
      color: isDark ? COLORS.gold : COLORS.goldDark,
      fontSize: 12,
      fontWeight: '900',
    },
    referralNoticeText: {
      color: isDark ? 'rgba(255, 255, 255, 0.72)' : COLORS.textSecondary,
      fontSize: 11,
      marginTop: 3,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 18,
      flexWrap: 'wrap',
    },
    footerText: {
      fontSize: 13,
      color: isDark ? 'rgba(255, 255, 255, 0.7)' : COLORS.textSecondary,
    },
    footerLinkText: {
      fontSize: 13,
      color: isDark ? COLORS.gold : '#0E9DA5',
      fontWeight: '800',
      textDecorationLine: 'underline',
    },
  });
