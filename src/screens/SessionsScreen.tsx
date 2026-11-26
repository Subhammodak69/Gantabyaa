import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {ScrollView} from '../components/ScrollView';
import {deleteSession, fetchSessions, logoutAllSessions} from '../api/tourApi';
import {AppColors, useColors} from '../theme/theme';
import {NavScreen} from '../types';
import {showApiError} from '../utils/toast';
import {useAppDialog} from '../components/AppDialog';
import {SessionsSkeleton} from '../components/Skeleton';

interface Props {onLogout: (all?: boolean) => void; onNavigate: (screen: NavScreen) => void;}

export const SessionsScreen: React.FC<Props> = ({onLogout}) => {
  const COLORS = useColors();
  const styles = makeStyles(COLORS);
  const {showDialog} = useAppDialog();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchSessions();
      const data: any = response.data;
      setSessions(Array.isArray(data) ? data : Array.isArray(data?.sessions) ? data.sessions : []);
    } catch (error) {
      showApiError(error, 'We could not load your sessions.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const end = async (session: any) => {
    const id = session.id || session.session_id;
    if (!id) return;
    const confirmed = await showDialog({title: 'End this session?', message: 'This device will be signed out from your account.', variant: 'warning', confirmText: 'End session', cancelText: 'Cancel'});
    if (!confirmed) return;
    setAction(id);
    try {
      await deleteSession(id);
      setSessions(items => items.filter(item => (item.id || item.session_id) !== id));
    } catch (error) { showApiError(error, 'We could not end this session.'); }
    finally { setAction(null); }
  };

  const handleLogoutAllOther = async () => {
    const confirmed = await showDialog({
      title: 'Log out of other sessions?',
      message: 'All other active devices will be signed out. You will remain logged in on this device.',
      variant: 'warning',
      confirmText: 'Log out others',
      cancelText: 'Cancel',
    });
    if (!confirmed) return;
    try {
      await logoutAllSessions();
      await showDialog({
        title: 'Sessions Ended',
        message: 'All other devices have been signed out successfully.',
        variant: 'success',
      });
      await load();
    } catch (error) {
      showApiError(error, 'Could not log out other sessions.');
    }
  };

  const sessionDate = (session: any) => session.last_used_at || session.updated_at || session.created_at || session.last_seen;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[COLORS.primary]} />}>
      <View>
        <View style={styles.header}>
          <View><Text style={styles.title}>Active sessions</Text><Text style={styles.subtitle}>Devices currently signed in to your account</Text></View>
          <Pressable onPress={load} disabled={loading}><Text style={styles.refresh}>↻</Text></Pressable>
        </View>
        {loading && sessions.length === 0 ? <SessionsSkeleton /> : sessions.length === 0 ? <Text style={styles.empty}>No active sessions found.</Text> : sessions.map((session, index) => {
          const id = session.id || session.session_id || String(index);
          const date = sessionDate(session);
          return <View style={styles.row} key={id}>
            <View style={styles.icon}><Text style={styles.iconText}>▣</Text></View>
            <View style={styles.copy}><Text style={styles.device}>{session.device_name || session.device || session.browser || session.os || 'Unknown device'}{session.is_current ? ' · This device' : ''}</Text><Text style={styles.meta}>{date ? new Date(date).toLocaleString() : (session.ip_address || 'Active session')}</Text></View>
            <Pressable style={styles.endButton} onPress={() => end(session)} disabled={action === id}><Text style={styles.endText}>{action === id ? '…' : 'End'}</Text></Pressable>
          </View>;
        })}
        <Pressable style={styles.logoutAll} onPress={handleLogoutAllOther}><Text style={styles.logoutText}>Log out of all other sessions</Text></Pressable>
      </View>
    </ScrollView>
  );
};

const makeStyles = (COLORS: AppColors) => StyleSheet.create({container: {flex: 1, backgroundColor: COLORS.bg}, content: {padding: 16}, header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, title: {fontSize: 21, fontWeight: '900', color: COLORS.text}, subtitle: {fontSize: 11, color: COLORS.textSecondary, marginTop: 4}, refresh: {fontSize: 25, color: COLORS.primary}, loader: {marginVertical: 25}, empty: {fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 30}, row: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border}, icon: {width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center'}, iconText: {color: COLORS.text}, copy: {flex: 1}, device: {fontSize: 13, fontWeight: '800', color: COLORS.text}, meta: {fontSize: 10, color: COLORS.textMuted, marginTop: 4}, endButton: {backgroundColor: COLORS.dangerLight, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7}, endText: {fontSize: 10, fontWeight: '800', color: COLORS.danger}, logoutAll: {borderWidth: 1, borderColor: COLORS.danger, borderRadius: 9, alignItems: 'center', paddingVertical: 12, marginTop: 18}, logoutText: {color: COLORS.danger, fontWeight: '800', fontSize: 12}});
