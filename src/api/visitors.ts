import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { request } from './client';
import { ApiEnvelope } from './types';

const VISITOR_ID_KEY = '@gantabyaa/visitor_id';
const VISITOR_SERVER_ID_KEY = '@gantabyaa/visitor_server_id';
const VISITOR_SESSION_ID_KEY = '@gantabyaa/visitor_session_id';
const FINGERPRINT_KEY = '@gantabyaa/fingerprint';

export async function getVisitorId(): Promise<string> {
  let id = await AsyncStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    await AsyncStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

export async function getFingerprint(): Promise<string> {
  let value = await AsyncStorage.getItem(FINGERPRINT_KEY);
  if (!value) {
    value = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
    await AsyncStorage.setItem(FINGERPRINT_KEY, value);
  }
  return value;
}

export async function getTrackedVisitorId(): Promise<string | null> {
  return AsyncStorage.getItem(VISITOR_SERVER_ID_KEY);
}

export async function identifyVisitor(customerId = ''): Promise<string | null> {
  const existingId = await getTrackedVisitorId();
  if (existingId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existingId)) {
    return existingId;
  }

  try {
    const payload: any = {
      fingerprint: await getFingerprint(),
      ip_address: '',
      country: '',
      state: '',
      city: '',
      browser: '',
      os: Platform.OS,
      device: 'mobile',
    };
    if (customerId) payload.customer_id = customerId;

    const r = await request<ApiEnvelope<any>>('/api/v1/visitors/identify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const id = r.data?.visitor?.id;
    if (id) await AsyncStorage.setItem(VISITOR_SERVER_ID_KEY, id);
    return id || (await getTrackedVisitorId());
  } catch {
    return getTrackedVisitorId();
  }
}

export async function getAuthVisitorId(): Promise<string> {
  return (await getTrackedVisitorId()) || (await identifyVisitor()) || '';
}

export async function startVisitorSession(landingPage = 'splash'): Promise<string | null> {
  const visitor = await getTrackedVisitorId();
  if (!visitor) return null;
  try {
    const r = await request<ApiEnvelope<any>>('/api/v1/visitors/sessions/start', {
      method: 'POST',
      body: JSON.stringify({
        visitor_id: visitor,
        landing_page: landingPage,
        referrer: '',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        utm_term: '',
      }),
    });
    const id = r.data?.id;
    if (id) await AsyncStorage.setItem(VISITOR_SESSION_ID_KEY, id);
    return id || null;
  } catch {
    return null;
  }
}

export async function heartbeatVisitorSession(
  currentPage = 'home',
  pageViewsDelta = 0
): Promise<any> {
  const id = await AsyncStorage.getItem(VISITOR_SESSION_ID_KEY);
  if (!id) return null;
  try {
    const r = await request<ApiEnvelope<any>>(
      `/api/v1/visitors/sessions/${encodeURIComponent(id)}/heartbeat`,
      {
        method: 'POST',
        body: JSON.stringify({
          current_page: currentPage,
          page_views_delta: pageViewsDelta,
        }),
      }
    );
    return r.data || null;
  } catch {
    return null;
  }
}

export async function endVisitorSession(exitPage = ''): Promise<any> {
  const id = await AsyncStorage.getItem(VISITOR_SESSION_ID_KEY);
  if (!id) return null;
  await AsyncStorage.removeItem(VISITOR_SESSION_ID_KEY);
  try {
    const r = await request<ApiEnvelope<any>>(
      `/api/v1/visitors/sessions/${encodeURIComponent(id)}/end`,
      {
        method: 'POST',
        body: JSON.stringify({ exit_page: exitPage }),
      }
    );
    return r.data || null;
  } catch {
    return null;
  }
}

export async function trackVisitorEvent(
  eventName: string,
  page = 'home',
  eventMetadata: Record<string, any> = {}
): Promise<any> {
  const visitor = await getTrackedVisitorId();
  const session = await AsyncStorage.getItem(VISITOR_SESSION_ID_KEY);
  if (!visitor || !session) return null;
  try {
    const r = await request<ApiEnvelope<any>>('/api/v1/visitors/events', {
      method: 'POST',
      body: JSON.stringify({
        visitor_id: visitor,
        session_id: session,
        event_name: eventName,
        page,
        event_metadata: eventMetadata,
      }),
    });
    return r.data || null;
  } catch {
    return null;
  }
}

export async function trackVisitorEventsBatch(events: any[]): Promise<any> {
  if (!events.length) return null;
  try {
    const r = await request<ApiEnvelope<any>>('/api/v1/visitors/events/batch', {
      method: 'POST',
      body: JSON.stringify({ events }),
    });
    return r.data || null;
  } catch {
    return null;
  }
}
