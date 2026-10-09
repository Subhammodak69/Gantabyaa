import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, FlatList, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {errorCodes, isErrorWithCode, pick, saveDocuments, types} from '@react-native-documents/picker';
import RNBlobUtil from 'react-native-blob-util';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {deleteDocument, fetchDocuments, getDocumentDownloadEndpoint, uploadDocument, uploadFileApi} from '../api/tourApi';
import {getAccessToken} from '../api/client';
import {AppColors, useColors} from '../theme/theme';
import {DocumentDirection, NavScreen, TravelDocument} from '../types';
import {showApiError, showSuccess} from '../utils/toast';
import {useAppDialog} from '../components/AppDialog';
import {DocumentListSkeleton} from '../components/Skeleton';
import {OverflowButton, OverflowMenu} from '../components/OverflowMenu';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {SharedFile} from '../native/shareIntent';

interface Props { onNavigate: (screen: NavScreen) => void; onOpenDocument?: (document: TravelDocument) => void; sharedFile?: SharedFile | null; onSharedFileConsumed?: () => void; }

export const DocumentsScreen: React.FC<Props> = ({onOpenDocument, sharedFile, onSharedFileConsumed}) => {
  const colors = useColors();
  const styles = makeStyles(colors);
  const {showDialog} = useAppDialog();
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [activeTab, setActiveTab] = useState<DocumentDirection>('incoming');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{uri: string; name: string; type?: string} | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('ID_PROOF');
  const [description, setDescription] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [actionDocument, setActionDocument] = useState<TravelDocument | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const processedSharedFileRef = useRef<SharedFile | null>(null);
  const insets = useSafeAreaInsets();
  const documentTypeOptions = ['ID_PROOF', 'ADDRESS_PROOF'];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchDocuments();
      const data: any = response.data;
      setDocuments(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
    } catch (error) { showApiError(error, 'We could not load your documents.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const resetUploadForm = useCallback(() => {
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
    setFileUploading(false);
    setShowForm(false);
    setSelectedFile(null);
    setUploadedFileUrl('');
    setTitle('');
    setDocumentType('ID_PROOF');
    setDescription('');
    setPreviewVisible(false);
    onSharedFileConsumed?.();
  }, [onSharedFileConsumed]);

  const uploadSelectedFile = useCallback(async (file: SharedFile) => {
    uploadControllerRef.current?.abort();
    const controller = new AbortController();
    uploadControllerRef.current = controller;
    setSelectedFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, '') || file.name);
    setUploadedFileUrl('');
    setFileUploading(true);
    try {
      const response = await uploadFileApi(file, controller.signal);
      if (controller.signal.aborted) return;
      const fileUrl = response.data?.url;
      if (!fileUrl) throw new Error('The selected file could not be uploaded.');
      setUploadedFileUrl(fileUrl);
    } catch (error: any) {
      if (!controller.signal.aborted) showApiError(error, 'We could not upload this document.');
    } finally {
      if (uploadControllerRef.current === controller) {
        uploadControllerRef.current = null;
        setFileUploading(false);
      }
    }
  }, []);

  const chooseFile = async () => {
    try {
      const [picked] = await pick({type: [types.allFiles], mode: 'import'});
      const file = {uri: picked.uri, name: picked.name || 'document', type: picked.type || undefined};
      await uploadSelectedFile(file);
    } catch (error: any) {
      if (!(isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED)) showApiError(error, 'We could not upload this document.');
    }
  };

  useEffect(() => {
    if (!sharedFile || processedSharedFileRef.current === sharedFile) return;
    processedSharedFileRef.current = sharedFile;
    setActiveTab('outgoing');
    setShowForm(true);
    onSharedFileConsumed?.();
    uploadSelectedFile(sharedFile);
  }, [onSharedFileConsumed, sharedFile, uploadSelectedFile]);

  useEffect(() => () => {
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
  }, []);

  const saveDocument = async () => {
    if (!selectedFile || !uploadedFileUrl) { showApiError(new Error('Choose a file first.'), 'Select a file before saving.'); return; }
    if (!title.trim()) { showApiError(new Error('Add a title first.'), 'A document title is required.'); return; }
    try {
      setUploading(true);
      await uploadDocument(selectedFile, documentType.trim() || 'ID_PROOF', title.trim(), description.trim(), uploadedFileUrl);
      resetUploadForm();
      await load();
    } catch (error: any) {
      showApiError(error, 'We could not save this document.');
    } finally { setUploading(false); }
  };

  const openDocument = async (document: TravelDocument) => {
    try {
      const url = getDocumentDownloadEndpoint(document.id);
      const token = await getAccessToken();
      if (!token) throw new Error('Your session has expired. Please sign in again.');
      const fileName = (document.file_name || document.title || 'document').replace(/[<>:"/\\|?*]/g, '_').trim() || 'document';
      const mimeType = document.mime_type || 'application/octet-stream';
      if (Platform.OS === 'android') {
        await RNBlobUtil.config({addAndroidDownloads: {useDownloadManager: true, notification: true, mediaScannable: true, title: fileName, description: 'Downloading travel document', mime: mimeType, path: `${RNBlobUtil.fs.dirs.DownloadDir}/${fileName}`}}).fetch('GET', url, {Authorization: `Bearer ${token}`, Accept: '*/*'});
      } else {
        const extension = fileName.includes('.') ? fileName.split('.').pop() : undefined;
        const result = await RNBlobUtil.config({fileCache: true, ...(extension ? {appendExt: extension} : {})}).fetch('GET', url, {Authorization: `Bearer ${token}`, Accept: '*/*'});
        const path = result.path();
        const sourceUri = path.startsWith('file://') ? path : `file://${path}`;
        const saved = await saveDocuments({sourceUris: [sourceUri], fileName, mimeType, copy: true});
        if (saved[0]?.error) throw new Error(saved[0].error);
        await RNBlobUtil.fs.unlink(path).catch(() => undefined);
      }
      showSuccess('The document was saved to your device.');
      Alert.alert('Download complete', `${fileName} was downloaded successfully.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not download this document.';
      showApiError(error, message);
      Alert.alert('Download failed', message);
    }
  };

  const removeDocument = async (document: TravelDocument) => {
    const confirmed = await showDialog({title: 'Delete this document?', message: 'This file will be permanently removed from your account.', variant: 'warning', confirmText: 'Delete', cancelText: 'Cancel'});
    if (!confirmed) return;
    setDeleting(document.id);
    try { await deleteDocument(document.id); setDocuments(items => items.filter(item => item.id !== document.id)); }
    catch (error) { showApiError(error, 'We could not delete this document.'); }
    finally { setDeleting(null); }
  };

  const getDocumentDirection = (document: TravelDocument): DocumentDirection => {
    if (document.type) return document.type;
    const legacyDirection = (document as TravelDocument & {direction?: string}).direction;
    if (legacyDirection) return legacyDirection.toLowerCase() === 'outgoing' ? 'outgoing' : 'incoming';
    return document.uploaded_by?.toUpperCase() === 'CUSTOMER' ? 'outgoing' : 'incoming';
  };

  const visibleDocuments = documents.filter(document => getDocumentDirection(document) === activeTab && `${document.title || ''} ${document.file_name || ''} ${document.document_type || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selectedFileIsImage = Boolean(selectedFile && (selectedFile.type?.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(selectedFile.name)));

  return <>
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={visibleDocuments}
      keyExtractor={document => document.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]} />}
      ListHeaderComponent={<View>
        <View style={styles.intro}><View style={styles.introIcon}><Ionicons name="folder-open-outline" size={25} color={colors.primary} /></View><View style={styles.introCopy}><View style={styles.titleRow}><Text style={styles.title}>My documents</Text><View style={styles.headerActions}><Text style={styles.countPill}>{documents.length}</Text>{activeTab === 'outgoing' ? <Pressable style={styles.headerUploadButton} onPress={() => setShowForm(value => !value)} disabled={uploading}><Ionicons name="cloud-upload-outline" size={15} color={colors.textLight} /><Text style={styles.headerUploadText}>{uploading ? '...' : 'Upload'}</Text></Pressable> : null}</View></View><Text style={styles.subtitle}>Keep travel files together and accessible.</Text></View></View>
        <View style={styles.tabs}>{(['incoming', 'outgoing'] as DocumentDirection[]).map(tab => <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => { setActiveTab(tab); if (tab !== 'outgoing') setShowForm(false); }}><Ionicons name={tab === 'incoming' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={17} color={activeTab === tab ? colors.textLight : colors.textSecondary} /><Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab === 'incoming' ? 'Incoming' : 'Outgoing'}</Text></Pressable>)}</View>
        <View style={styles.searchBox}><Ionicons name="search-outline" size={17} color={colors.textMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Search documents..." placeholderTextColor={colors.textMuted} style={styles.searchInput} /></View>
      </View>}
      ListEmptyComponent={loading ? <DocumentListSkeleton /> : <View style={styles.empty}><Ionicons name="document-text-outline" size={34} color={colors.textMuted} /><Text style={styles.emptyTitle}>{query ? 'No matching documents' : `No ${activeTab} documents`}</Text><Text style={styles.emptyText}>{activeTab === 'incoming' ? 'Files shared with you will appear here.' : 'Upload a file to share it with your travel team.'}</Text></View>}
      renderItem={({item: document, index}) => <View style={styles.card}>
        <Pressable style={styles.cardPressable} onPress={() => onOpenDocument?.(document)}>
        <View style={styles.listIndex}><Text style={styles.listIndexText}>{String(index + 1).padStart(2, '0')}</Text></View>
        <View style={styles.cardCopy}><Text style={styles.cardTitle} numberOfLines={1}>{document.title || document.file_name || 'Untitled document'}</Text><Text style={styles.meta}>{document.document_type || 'DOCUMENT'} {document.file_name ? `· ${document.file_name}` : ''}</Text>{document.description ? <Text style={styles.description} numberOfLines={1}>{document.description}</Text> : null}<Text style={styles.date}>{document.uploaded_at ? new Date(document.uploaded_at).toLocaleDateString() : 'Recently uploaded'}</Text></View>
        </Pressable>
        <OverflowButton colors={colors} onPress={() => setActionDocument(document)} />
      </View>}
    />
    <Modal visible={showForm && activeTab === 'outgoing'} transparent animationType="slide" onRequestClose={resetUploadForm}>
      <KeyboardAvoidingView style={[styles.modalBackdrop, keyboardVisible && styles.modalBackdropKeyboard]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
        <SafeAreaView edges={keyboardVisible ? ['top'] : ['bottom']} style={[styles.uploadModal, keyboardVisible && styles.uploadModalKeyboard, {paddingBottom: keyboardVisible ? Math.max(8, insets.bottom) : 18}]}>
          <View style={styles.modalHeader}>
            <View><Text style={styles.formTitle}>Upload document</Text><Text style={styles.modalSubtitle}>Share a file with your travel team.</Text></View>
            <Pressable style={styles.closeButton} onPress={resetUploadForm} hitSlop={8}><Ionicons name="close" size={20} color={colors.text} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Pressable style={[styles.dropzone, selectedFile && styles.dropzoneSelected]} onPress={chooseFile} disabled={fileUploading || uploading}>
              {fileUploading ? <ActivityIndicator color={colors.primary} /> : <Ionicons name={selectedFile ? 'checkmark-circle-outline' : 'cloud-upload-outline'} size={34} color={colors.primary} />}
              <Text style={styles.dropzoneTitle}>{fileUploading ? 'Uploading file...' : selectedFile ? 'File selected' : 'Choose a file to upload'}</Text>
              <Text style={styles.dropzoneText} numberOfLines={2}>{selectedFile ? selectedFile.name : 'Tap here to browse images, PDFs, or other files'}</Text>
            </Pressable>
            {selectedFile ? <>
              <Pressable style={styles.uploadPreview} onPress={() => setPreviewVisible(true)}>
                {selectedFileIsImage ? <Image source={{uri: selectedFile.uri}} style={styles.uploadPreviewImage} resizeMode="cover" /> : <View style={styles.uploadPreviewFile}><Ionicons name="document-text-outline" size={30} color={colors.primary} /></View>}
                <View style={styles.uploadPreviewCopy}><Text style={styles.uploadPreviewTitle} numberOfLines={1}>{selectedFile.name}</Text><Text style={styles.uploadPreviewHint}>{uploadedFileUrl ? 'Tap to preview' : 'Uploading preview…'}</Text></View>
                <Ionicons name="expand-outline" size={18} color={colors.textMuted} />
              </Pressable>
              <Text style={styles.inputLabel}>Document name</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="Document name" placeholderTextColor={colors.textMuted} style={styles.input} />
              <Text style={styles.inputLabel}>Document type</Text>
              <View style={{flexDirection: 'row', gap: 8, marginBottom: 12}}>
                {documentTypeOptions.map(type => {
                  const selected = documentType === type;
                  return <Pressable key={type} onPress={() => setDocumentType(type)} style={{flex: 1, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySubtle : colors.surface, paddingHorizontal: 8, paddingVertical: 11}}>
                    <Text style={{color: selected ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: '800'}}>{type === 'ID_PROOF' ? 'ID proof' : 'Address proof'}</Text>
                  </Pressable>;
                })}
              </View>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="Description (optional)" placeholderTextColor={colors.textMuted} style={[styles.input, styles.multiline]} multiline />
              <Pressable style={[styles.chooseButton, (!uploadedFileUrl || uploading) && styles.disabledButton]} onPress={saveDocument} disabled={!uploadedFileUrl || uploading}>
                {uploading ? <ActivityIndicator color={colors.textLight} /> : <Text style={styles.chooseText}>Save document</Text>}
              </Pressable>
            </> : <Text style={styles.dropzoneHint}>Choose the file first. Its name will be filled automatically.</Text>}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
    <Modal visible={previewVisible && Boolean(selectedFile)} transparent animationType="fade" onRequestClose={() => setPreviewVisible(false)}>
      <View style={styles.previewBackdrop}>
        <View style={styles.previewModal}>
          <View style={styles.previewHeader}><Text style={styles.previewTitle}>Document preview</Text><Pressable style={styles.closeButton} onPress={() => setPreviewVisible(false)}><Ionicons name="close" size={20} color={colors.text} /></Pressable></View>
          {selectedFileIsImage && selectedFile ? <Image source={{uri: selectedFile.uri}} style={styles.previewImage} resizeMode="contain" /> : <View style={styles.previewFileState}><Ionicons name="document-text-outline" size={60} color={colors.primary} /><Text style={styles.previewFileName} numberOfLines={2}>{selectedFile?.name}</Text><Text style={styles.previewFileHint}>This file will be saved to your travel documents after submission.</Text></View>}
          <Pressable style={styles.previewDoneButton} onPress={() => setPreviewVisible(false)}><Text style={styles.previewDoneText}>Done</Text></Pressable>
        </View>
      </View>
    </Modal>
    <OverflowMenu colors={colors} visible={Boolean(actionDocument)} title={actionDocument?.title || 'Document actions'} onClose={() => setActionDocument(null)} actions={[
      {label: 'Preview document', icon: 'eye', onPress: () => actionDocument && onOpenDocument?.(actionDocument)},
      {label: 'Download document', icon: 'download', onPress: () => actionDocument && openDocument(actionDocument)},
      ...(actionDocument?.can_delete !== false ? [{label: 'Delete document', icon: 'trash-2', destructive: true, onPress: () => actionDocument && removeDocument(actionDocument)}] : []),
    ]} />
  </>;
};

const makeStyles = (colors: AppColors) => StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg}, content: {padding: 16, paddingBottom: 35},
  intro: {flexDirection: 'row', alignItems: 'center', marginBottom: 14}, introIcon: {width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center', marginRight: 9}, introCopy: {flex: 1, minWidth: 0}, titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8}, title: {fontSize: 20, fontWeight: '900', color: colors.text, flex: 1}, headerActions: {flexDirection: 'row', alignItems: 'center', gap: 6}, countPill: {color: colors.primary, backgroundColor: colors.primarySubtle, borderRadius: 13, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, fontWeight: '900'}, headerUploadButton: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6}, headerUploadText: {color: colors.textLight, fontWeight: '900', fontSize: 10}, subtitle: {fontSize: 11, color: colors.textSecondary, marginTop: 2},
  tabs: {flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 11, padding: 4, marginBottom: 12}, tab: {flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 8}, activeTab: {backgroundColor: colors.primary}, tabText: {fontSize: 13, fontWeight: '800', color: colors.textSecondary}, activeTabText: {color: colors.textLight},
  searchBox: {height: 46, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 11, paddingHorizontal: 13, marginBottom: 12}, searchInput: {flex: 1, color: colors.text, fontSize: 13, paddingVertical: 0, marginLeft: 9},
  form: {backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, marginBottom: 12}, formTitle: {fontSize: 17, fontWeight: '900', color: colors.text, marginBottom: 3}, modalSubtitle: {fontSize: 11, color: colors.textSecondary}, inputLabel: {fontSize: 11, fontWeight: '800', color: colors.textSecondary, marginBottom: 5}, input: {borderWidth: 1, borderColor: colors.border, borderRadius: 8, color: colors.text, paddingHorizontal: 11, paddingVertical: 10, fontSize: 13, marginBottom: 10, backgroundColor: colors.surface}, multiline: {minHeight: 64, textAlignVertical: 'top'}, chooseButton: {backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 4}, disabledButton: {opacity: 0.55}, chooseText: {color: colors.textLight, fontWeight: '800', fontSize: 12},
  modalBackdrop: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.55)'}, modalBackdropKeyboard: {justifyContent: 'flex-start'}, uploadModal: {maxHeight: '88%', backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18}, uploadModalKeyboard: {flex: 1, maxHeight: '100%', borderTopLeftRadius: 0, borderTopRightRadius: 0}, modalHeader: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16}, closeButton: {width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center'}, uploadPreview: {flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 9, marginBottom: 14, backgroundColor: colors.surface}, uploadPreviewImage: {width: 58, height: 58, borderRadius: 8, backgroundColor: colors.border}, uploadPreviewFile: {width: 58, height: 58, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySubtle}, uploadPreviewCopy: {flex: 1, minWidth: 0}, uploadPreviewTitle: {fontSize: 12, fontWeight: '900', color: colors.text}, uploadPreviewHint: {fontSize: 10, color: colors.textSecondary, marginTop: 3}, previewBackdrop: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0, 0, 0, 0.72)'}, previewModal: {width: '100%', maxHeight: '88%', borderRadius: 18, padding: 16, backgroundColor: colors.card}, previewHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12}, previewTitle: {fontSize: 17, fontWeight: '900', color: colors.text}, previewImage: {width: '100%', height: 420, borderRadius: 12, backgroundColor: colors.surface}, previewFileState: {height: 260, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.surface, borderRadius: 12}, previewFileName: {fontSize: 15, fontWeight: '900', color: colors.text, textAlign: 'center', marginTop: 14}, previewFileHint: {fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 18, marginTop: 7}, previewDoneButton: {height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10, marginTop: 14, backgroundColor: colors.primary}, previewDoneText: {color: colors.textLight, fontSize: 13, fontWeight: '900'}, dropzone: {minHeight: 150, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 14, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center', padding: 18, marginBottom: 16}, dropzoneSelected: {borderColor: colors.success, backgroundColor: colors.successLight}, dropzoneTitle: {fontSize: 14, fontWeight: '900', color: colors.text, marginTop: 9}, dropzoneText: {fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 5}, dropzoneHint: {fontSize: 11, color: colors.textMuted, textAlign: 'center', paddingVertical: 8},
  empty: {alignItems: 'center', paddingVertical: 45}, emptyTitle: {fontSize: 15, fontWeight: '900', color: colors.text, marginTop: 10}, emptyText: {fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 5},
  card: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 9, marginBottom: 8}, cardPressable: {flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center'}, listIndex: {width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center', marginRight: 8}, listIndexText: {color: colors.primary, fontSize: 11, fontWeight: '900'}, cardCopy: {flex: 1, minWidth: 0}, cardTitle: {fontSize: 13, fontWeight: '900', color: colors.text}, meta: {fontSize: 10, color: colors.textSecondary, marginTop: 3}, description: {fontSize: 10, color: colors.textSecondary, marginTop: 3}, date: {fontSize: 9, color: colors.textMuted, marginTop: 3},
});
