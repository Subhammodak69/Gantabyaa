import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AuthUser, updateMe, uploadFileApi } from '../api/tourApi';
import { useColors } from '../theme/theme';
import { NavScreen } from '../types';
import { showApiError } from '../utils/toast';
import { useAppDialog } from '../components/AppDialog';
import { ImageCropModal } from '../components/ImageCropModal';

const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80',
];

export const EditProfileScreen: React.FC<{
  user: AuthUser | null;
  onSaved: (user: AuthUser) => void;
  onNavigate: (screen: NavScreen) => void;
}> = ({ user, onSaved }) => {
  const COLORS = useColors();
  const styles = makeStyles(COLORS);
  const { showDialog } = useAppDialog();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState(user?.address || '');
  const [emergencyName, setEmergencyName] = useState(user?.emergency_contact_name || '');
  const [emergencyMobile, setEmergencyMobile] = useState(user?.emergency_contact_mobile || '');
  const [profilePic, setProfilePic] = useState(user?.profile_pic || '');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Crop modal state
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [selectedLocalUri, setSelectedLocalUri] = useState<string | null>(null);
  const [urlInputModal, setUrlInputModal] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState('');

  const handlePickSampleOrUrl = (imgUri: string) => {
    setSelectedLocalUri(imgUri);
    setCropModalVisible(true);
  };

  const handleOpenPhotoPicker = async () => {
    // Show user choice: Quick gallery select or enter custom image URL
    const choice = await showDialog({
      title: 'Change Profile Picture',
      message: 'Choose a photo from your gallery or presets to crop and update your avatar.',
      variant: 'info',
      confirmText: 'Choose Preset Photo',
      cancelText: 'Enter Image URL',
    });

    if (choice) {
      // Pick the first sample to immediately open the crop modal
      const randomPreset = SAMPLE_AVATARS[Math.floor(Math.random() * SAMPLE_AVATARS.length)];
      handlePickSampleOrUrl(randomPreset);
    } else {
      setUrlInputModal(true);
    }
  };

  const handleCropDone = async (croppedUri: string) => {
    setCropModalVisible(false);
    setUploadingImage(true);

    try {
      // Upload via backend file upload API
      const res = await uploadFileApi({
        uri: croppedUri,
        name: `profile_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });

      const uploadedUrl = res.data?.url || croppedUri;
      setProfilePic(uploadedUrl);

      await showDialog({
        title: 'Photo Uploaded! 📸',
        message: 'Your profile picture has been cropped and uploaded successfully. Click "Save changes" to apply it to your account.',
        variant: 'success',
      });
    } catch {
      // If server upload fails (e.g. mock environment), fallback to using the selected/cropped image directly
      setProfilePic(croppedUri);
      await showDialog({
        title: 'Photo Selected',
        message: 'Profile picture set! Click "Save changes" to update your profile.',
        variant: 'info',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      await showDialog({
        title: 'Name required',
        message: 'Please enter your full name.',
        variant: 'warning',
      });
      return;
    }
    setLoading(true);
    try {
      const response = await updateMe({
        name: name.trim(),
        mobile: user?.mobile || '',
        email: email.trim(),
        address: address.trim(),
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_mobile: emergencyMobile.trim(),
        profile_pic: profilePic,
        source: 'WEBSITE',
        is_active: user?.is_active ?? true,
      });
      if (response.data) {
        onSaved({ ...(user || {}), ...response.data, profile_pic: profilePic });
        await showDialog({
          title: 'Profile updated ✨',
          message: 'Your profile details and picture have been saved.',
          variant: 'success',
        });
      }
    } catch (error) {
      showApiError(error, 'We could not update your profile.');
    } finally {
      setLoading(false);
    }
  };

  const field = (
    label: string,
    value: string,
    setValue: (value: string) => void,
    keyboardType: any = 'default'
  ) => (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        keyboardType={keyboardType}
        editable={!loading}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Crop Modal */}
      <ImageCropModal
        visible={cropModalVisible}
        imageUri={selectedLocalUri}
        onClose={() => setCropModalVisible(false)}
        onCropDone={handleCropDone}
      />

      <View>
        <Text style={styles.title}>Edit profile</Text>
        <Text style={styles.subtitle}>Update your personal and contact information.</Text>

        {/* Profile Avatar with + Icon */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>👤</Text>
              </View>
            )}

            {/* Plus Icon Overlay */}
            <Pressable
              style={({ pressed }) => [styles.plusBadge, pressed && styles.plusBadgePressed]}
              onPress={handleOpenPhotoPicker}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.plusBadgeText}>＋</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.avatarHint}>Tap ＋ to crop & upload profile picture</Text>
          {profilePic ? (
            <Pressable
              onPress={() => setProfilePic('')}
              disabled={loading || uploadingImage}
              style={styles.removePhotoButton}
            >
              <Text style={styles.removePhotoText}>Remove profile picture</Text>
            </Pressable>
          ) : null}

          {/* Quick preset selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
            {SAMPLE_AVATARS.map((uri, idx) => (
              <Pressable
                key={idx}
                onPress={() => handlePickSampleOrUrl(uri)}
                style={[styles.presetThumbWrap, profilePic === uri && styles.presetThumbWrapActive]}
              >
                <Image source={{ uri }} style={styles.presetThumb} />
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Custom URL Input Section (if toggled) */}
        {urlInputModal && (
          <View style={styles.urlInputBox}>
            <Text style={styles.urlInputLabel}>PASTE IMAGE URL TO CROP:</Text>
            <View style={styles.urlInputRow}>
              <TextInput
                style={[styles.input, styles.urlInput]}
                placeholder="https://example.com/photo.jpg"
                placeholderTextColor={COLORS.textMuted}
                value={customImageUrl}
                onChangeText={setCustomImageUrl}
                autoCapitalize="none"
              />
              <Pressable
                style={styles.urlDoneBtn}
                onPress={() => {
                  if (customImageUrl.trim()) {
                    setUrlInputModal(false);
                    handlePickSampleOrUrl(customImageUrl.trim());
                  }
                }}
              >
                <Text style={styles.urlDoneBtnText}>Crop</Text>
              </Pressable>
            </View>
          </View>
        )}

        {field('Full name', name, setName)}
        {field('Email', email, setEmail, 'email-address')}
        {field('Address', address, setAddress)}
        {field('Emergency contact name', emergencyName, setEmergencyName)}
        {field('Emergency mobile', emergencyMobile, setEmergencyMobile, 'phone-pad')}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            loading && styles.buttonDisabled,
            pressed && !loading && styles.buttonPressed,
          ]}
          onPress={save}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save changes</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
};

const makeStyles = (COLORS: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    position: 'relative',
    borderWidth: 3,
    borderColor: COLORS.primarySubtle,
    backgroundColor: COLORS.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 40,
  },
  plusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  plusBadgePressed: {
    transform: [{ scale: 0.9 }],
    backgroundColor: COLORS.primaryLight,
  },
  plusBadgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  avatarHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontWeight: '600',
  },
  removePhotoButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  removePhotoText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '800',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  presetThumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  presetThumbWrapActive: {
    borderColor: COLORS.gold,
  },
  presetThumb: {
    width: '100%',
    height: '100%',
  },
  urlInputBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  urlInputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  urlInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  urlDoneBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urlDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    fontSize: 14,
  },
  button: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
});
