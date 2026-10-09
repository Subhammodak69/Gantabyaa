import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RNBlobUtil from 'react-native-blob-util';
import {getDocumentDownloadEndpoint} from '../api/user';
import {getAccessToken} from '../api/client';
import {TravelDocument} from '../types';
import {useColors} from '../theme/theme';

interface Props {
  document: TravelDocument;
  onBack: () => void;
}

const getMimeType = (document: TravelDocument) => {
  if (document.mime_type) return document.mime_type.toLowerCase();
  const fileName = document.file_name?.toLowerCase() || '';
  if (fileName.endsWith('.pdf')) return 'application/pdf';
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
  if (fileName.endsWith('.gif')) return 'image/gif';
  if (fileName.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
};

export const DocumentViewerScreen: React.FC<Props> = ({document, onBack}) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadMimeType, setDownloadMimeType] = useState('');
  const pathRef = useRef<string | null>(null);
  const inferredMimeType = useMemo(() => getMimeType(document), [document]);
  const mimeType = downloadMimeType || inferredMimeType;
  const fileName = document.file_name || document.title || 'document';
  const isImage = mimeType.startsWith('image/');

  useEffect(() => {
    let mounted = true;
    const loadDocument = async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          throw new Error('Your session has expired. Please sign in again.');
        }

        const requestHeaders: Record<string, string> = {Accept: '*/*'};
        if (token) requestHeaders.Authorization = `Bearer ${token}`;

        const result = await RNBlobUtil.config({
          fileCache: true,
          ...(fileName.includes('.') ? {appendExt: fileName.split('.').pop()} : {}),
        }).fetch(
          'GET',
          getDocumentDownloadEndpoint(document.id),
          requestHeaders,
        );

        const responseInfo = result.info();
        if (responseInfo.status < 200 || responseInfo.status >= 300) {
          throw new Error(`Document download failed (${responseInfo.status}).`);
        }
        const headerValue = Object.entries(responseInfo.headers || {}).find(
          ([name]) => name.toLowerCase() === 'content-type',
        )?.[1];
        const contentType = typeof headerValue === 'string'
          ? headerValue.split(';')[0].trim().toLowerCase()
          : undefined;
        if (mounted && contentType && contentType !== 'application/octet-stream') {
          setDownloadMimeType(contentType);
        }
        pathRef.current = result.path();
        if (mounted) setFilePath(result.path());
      } catch (loadError) {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Unable to load this document.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDocument();
    return () => {
      mounted = false;
      if (pathRef.current) RNBlobUtil.fs.unlink(pathRef.current).catch(() => undefined);
    };
  }, [document.id, fileName]);

  const openWithDeviceViewer = async () => {
    if (!filePath) return;
    try {
      if (Platform.OS === 'android') {
        await RNBlobUtil.android.actionViewIntent(filePath, mimeType, 'Open document with');
      } else {
        RNBlobUtil.ios.presentPreview(filePath);
      }
    } catch {
      Alert.alert('No compatible viewer', 'Install an app that supports this file type and try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.viewerHeader}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Document viewer</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{document.title || fileName}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Loading document…</Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
            <Text style={styles.errorTitle}>Could not load document</Text>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : isImage && filePath ? (
          <Image source={{uri: filePath.startsWith('file://') ? filePath : `file://${filePath}`}} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.fileCard}>
            <View style={styles.fileIcon}>
              <Ionicons name={mimeType === 'application/pdf' ? 'document-text-outline' : 'document-attach-outline'} size={42} color={colors.primary} />
            </View>
            <Text style={styles.fileTitle} numberOfLines={2}>{fileName}</Text>
            <Text style={styles.fileMeta}>{mimeType}</Text>
            <Text style={styles.fileHint}>This document will open with a compatible viewer on your device.</Text>
            <Pressable style={styles.openButton} onPress={openWithDeviceViewer} disabled={!filePath}>
              <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              <Text style={styles.openButtonText}>Open document</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg},
  viewerHeader: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, backgroundColor: colors.primaryDark},
  backButton: {width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)'},
  headerCopy: {flex: 1, marginLeft: 12},
  eyebrow: {fontSize: 10, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)'},
  headerTitle: {marginTop: 3, color: '#FFFFFF', fontSize: 17, fontWeight: '900'},
  content: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20},
  centerState: {alignItems: 'center', justifyContent: 'center', padding: 24},
  stateText: {marginTop: 12, color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 21},
  errorTitle: {marginTop: 14, color: colors.text, fontSize: 18, fontWeight: '900'},
  image: {width: '100%', height: '100%'},
  fileCard: {width: '100%', maxWidth: 380, alignItems: 'center', padding: 26, borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border},
  fileIcon: {width: 84, height: 84, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
  fileTitle: {marginTop: 18, color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center'},
  fileMeta: {marginTop: 8, color: colors.textMuted, fontSize: 12},
  fileHint: {marginTop: 14, color: colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center'},
  openButton: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22, minWidth: 190, height: 48, paddingHorizontal: 18, borderRadius: 14, backgroundColor: colors.primary},
  openButtonText: {color: '#FFFFFF', fontSize: 14, fontWeight: '900'},
});
