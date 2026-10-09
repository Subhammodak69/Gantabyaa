import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_API, request, authenticated } from './client';
import { uploadFileApi } from './tours';
import {
  ApiEnvelope,
  EnquiryRecord,
  Trip,
  Invoice,
  UserStats,
  NotificationPreferences,
  NotificationList,
  NotificationRecord,
  CustomerTour,
  CustomerTourDetail,
  CustomerTourListResult,
  CustomerTourPagination,
  BookingTraveller,
  BookingTravellerInput,
  EnquiryCreateInput,
  EnquiryUpdateInput,
  HotelRecord,
  VehicleRecord,
  Quotation,
  WalletBalance,
  FinancialTransaction,
  PaginatedResult,
  EnumList,
  AccountPoints,
  PointsCustomer,
  PointsPagination,
} from './types';
import { TravelDocument } from '../types';

const NOTIFICATION_PREFERENCES_KEY = '@gantabyaa/notification_preferences';
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  push_notifications: true,
  newsletter: true,
  sms_alerts: false,
  email_updates: true,
};

// ── Enquiries ──────────────────────────────────────────────────────────
export async function fetchEnquiries(skip = 0, limit = 50): Promise<EnquiryRecord[]> {
  const response = await authenticated<ApiEnvelope<EnquiryRecord[]>>(
    `/api/v1/enquiries?skip=${skip}&limit=${limit}`
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchEnums(group = '', search = ''): Promise<EnumList | null> {
  const params = new URLSearchParams();
  if (group) params.set('group', group);
  if (search) params.set('search', search);
  const query = params.toString();
  const response = await authenticated<ApiEnvelope<EnumList>>(`/api/v1/enums${query ? `?${query}` : ''}`);
  return response.data || null;
}

export async function createEnquiry(payload: EnquiryCreateInput): Promise<ApiEnvelope<EnquiryRecord>> {
  return request<ApiEnvelope<EnquiryRecord>>('/api/v1/enquiries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateEnquiry(
  id: string,
  payload: EnquiryUpdateInput
): Promise<ApiEnvelope<EnquiryRecord>> {
  return authenticated<ApiEnvelope<EnquiryRecord>>(`/api/v1/enquiries/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteEnquiry(id: string): Promise<ApiEnvelope<unknown>> {
  return authenticated<ApiEnvelope<unknown>>(`/api/v1/enquiries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function fetchHotels(
  page = 1,
  pageSize = 20,
  destinationId = '',
  category = ''
): Promise<ApiEnvelope<HotelRecord[]>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (destinationId) params.set('destination_id', destinationId);
  if (category) params.set('category', category);
  return request<ApiEnvelope<HotelRecord[]>>(`/api/v1/hotels?${params.toString()}`);
}

export async function fetchVehicles(
  page = 1,
  pageSize = 20,
  vehicleType = '',
  search = ''
): Promise<ApiEnvelope<VehicleRecord[]>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (vehicleType) params.set('vehicle_type', vehicleType);
  if (search) params.set('search', search);
  return request<ApiEnvelope<VehicleRecord[]>>(`/api/v1/vehicles?${params.toString()}`);
}

// ── Wishlist ───────────────────────────────────────────────────────────
export async function fetchWishlist(
  page = 1,
  pageSize = 20,
  filters: {
    destination?: string;
    type?: string;
    season?: string;
    is_featured?: boolean;
    search?: string;
    sort_order?: 'asc' | 'desc';
  } = {}
): Promise<ApiEnvelope<any[]>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return authenticated<ApiEnvelope<any[]>>(`/api/v1/wishlist?${params.toString()}`);
}

export async function addWishlistItem(slug: string): Promise<ApiEnvelope<unknown>> {
  return authenticated<ApiEnvelope<unknown>>(`/api/v1/wishlist/${encodeURIComponent(slug)}`, {
    method: 'POST',
  });
}

export async function removeWishlistItem(slug: string): Promise<ApiEnvelope<unknown>> {
  return authenticated<ApiEnvelope<unknown>>(`/api/v1/wishlist/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  });
}

// ── Referrals ──────────────────────────────────────────────────────────
export async function fetchReferralCode(): Promise<ApiEnvelope<{ referral_code: string }>> {
  return authenticated<ApiEnvelope<{ referral_code: string }>>('/api/v1/referrals/code');
}

export async function validateReferralCode(
  code: string
): Promise<ApiEnvelope<{ referral_code: string; referrer_name: string }>> {
  return request<ApiEnvelope<{ referral_code: string; referrer_name: string }>>(
    `/api/v1/referrals/invite/${encodeURIComponent(code)}`
  );
}

export async function fetchReferrals(page = 1, pageSize = 20): Promise<ApiEnvelope<any[]>> {
  return authenticated<ApiEnvelope<any[]>>(`/api/v1/referrals?page=${page}&page_size=${pageSize}`);
}

// ── Documents ──────────────────────────────────────────────────────────
export async function fetchDocuments(page = 1, pageSize = 20): Promise<ApiEnvelope<TravelDocument[]>> {
  return authenticated<ApiEnvelope<TravelDocument[]>>(`/api/v1/documents?page=${page}&page_size=${pageSize}`);
}

export async function fetchBookingDocuments(
  bookingId: string,
  page = 1,
  pageSize = 100
): Promise<ApiEnvelope<TravelDocument[]>> {
  const params = new URLSearchParams({
    booking_id: bookingId,
    page: String(page),
    page_size: String(pageSize),
  });
  return authenticated<ApiEnvelope<TravelDocument[]>>(`/api/v1/documents/booking?${params.toString()}`);
}

export async function createDocumentRecord(
  fileUrl: string,
  fileName: string,
  documentType: string,
  title: string,
  description: string
): Promise<ApiEnvelope<unknown>> {
  return authenticated<ApiEnvelope<unknown>>('/api/v1/documents', {
    method: 'POST',
    body: JSON.stringify({
      file: fileUrl,
      file_name: fileName || 'document',
      document_type: documentType,
      title,
      description: description || null,
    }),
  });
}

export async function uploadDocument(
  file: { uri: string; name?: string; type?: string },
  documentType: string,
  title: string,
  description: string,
  uploadedFileUrl?: string
): Promise<ApiEnvelope<unknown>> {
  const fileUrl = uploadedFileUrl || (await uploadFileApi(file)).data?.url;
  if (!fileUrl) throw new Error('The document upload did not return a file URL.');
  return createDocumentRecord(fileUrl, file.name || 'document', documentType, title, description);
}

export function getDocumentDownloadEndpoint(id: string): string {
  return `${BASE_API}/api/v1/documents/${encodeURIComponent(id)}/download`;
}

export function getDocumentDownloadUrl(downloadUrl: string): string {
  return downloadUrl.startsWith('http') ? downloadUrl : `${BASE_API}${downloadUrl}`;
}

export async function deleteDocument(id: string): Promise<ApiEnvelope<unknown>> {
  return authenticated<ApiEnvelope<unknown>>(`/api/v1/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ── Trips, Invoices, User Stats, Notification Preferences ──────────────
export async function fetchCustomerTours(
  page = 1,
  pageSize = 20,
  filters: { month?: number; year?: number; status?: string } = {}
): Promise<CustomerTourListResult> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (filters.month) params.set('month', String(filters.month));
  if (filters.year) params.set('year', String(filters.year));
  if (filters.status) params.set('status', filters.status);
  const response = await authenticated<ApiEnvelope<CustomerTour[]>>(
    `/api/v1/customer-tours?${params.toString()}`
  );
  return {
    items: Array.isArray(response.data) ? response.data : [],
    pagination: response.pagination as CustomerTourPagination | undefined,
  };
}

export async function fetchCustomerTour(id: string): Promise<CustomerTourDetail | null> {
  const response = await authenticated<ApiEnvelope<CustomerTour | CustomerTour[]>>(
    `/api/v1/customer-tours/${encodeURIComponent(id)}`
  );
  if (Array.isArray(response.data)) return response.data[0] || null;
  return response.data || null;
}

export async function addCustomerTourTraveller(
  bookingId: string,
  payload: BookingTravellerInput
): Promise<ApiEnvelope<BookingTraveller>> {
  return authenticated<ApiEnvelope<BookingTraveller>>(
    `/api/v1/customer-tours/${encodeURIComponent(bookingId)}/travellers`,
    { method: 'POST', body: JSON.stringify(payload) }
  );
}

export async function updateCustomerTourTraveller(
  bookingId: string,
  travellerId: string,
  payload: Partial<BookingTravellerInput>
): Promise<ApiEnvelope<unknown>> {
  return authenticated<ApiEnvelope<unknown>>(
    `/api/v1/customer-tours/${encodeURIComponent(bookingId)}/travellers/${encodeURIComponent(travellerId)}`,
    { method: 'PATCH', body: JSON.stringify(payload) }
  );
}

export async function deleteCustomerTourTraveller(
  bookingId: string,
  travellerId: string
): Promise<ApiEnvelope<unknown>> {
  return authenticated<ApiEnvelope<unknown>>(
    `/api/v1/customer-tours/${encodeURIComponent(bookingId)}/travellers/${encodeURIComponent(travellerId)}`,
    { method: 'DELETE' }
  );
}

export async function fetchTrips(): Promise<Trip[]> {
  try {
    const response = await fetchCustomerTours();
    return response.items.map((tour) => ({
      ...tour,
      id: tour.id,
      enquiry_code: tour.booking_code,
      destination: tour.destination_name || tour.package?.name || '',
      travel_date: tour.departure_date || '',
      pax_no: tour.travellers?.length || 1,
      subject: tour.variant?.name || tour.package?.name || '',
      status: tour.status || undefined,
    }));
  } catch {
    try {
      const response = await fetchEnquiries();
      return (response || []).filter((trip: Trip) => trip.travel_date || trip.destination);
    } catch {
      return [];
    }
  }
}

export async function fetchUserStats(): Promise<UserStats> {
  const trips = await fetchTrips();
  const uniqueDestinations = new Set(trips.map(t => t.destination).filter(Boolean));
  return {
    journeys_taken: trips.length,
    countries_visited: uniqueDestinations.size,
    total_travel_days: 0,
    member_since: new Date().toISOString(),
  };
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
    return stored
      ? { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) }
      : DEFAULT_NOTIFICATION_PREFERENCES;
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const next = { ...(await fetchNotificationPreferences()), ...prefs };
  await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(next));
  return next;
}

export async function fetchNotifications(limit = 50): Promise<NotificationList> {
  const response = await authenticated<ApiEnvelope<NotificationList>>(
    `/api/v1/notifications?limit=${limit}`
  );
  return response.data || { items: [], unread_count: 0 };
}

export async function markNotificationRead(id: string): Promise<NotificationRecord | null> {
  const response = await authenticated<ApiEnvelope<NotificationRecord>>(
    `/api/v1/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' }
  );
  return response.data || null;
}

export async function markAllNotificationsRead(): Promise<void> {
  await authenticated('/api/v1/notifications/read-all', { method: 'POST' });
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const response = await fetchTransactions(1, 100);
  return response.items.map((transaction) => ({
    id: transaction.id,
    invoice_code: transaction.reference || transaction.booking_code || transaction.id,
    destination: transaction.description || 'Travel booking',
    amount: Number(transaction.amount || 0),
    currency: transaction.currency || 'INR',
    booking_date: transaction.created_at || transaction.transaction_date || undefined,
    travel_date: transaction.transaction_date || undefined,
    status: transaction.status,
    transaction,
  }));
}

// ── Quotations ───────────────────────────────────────────────────────
export async function fetchEnquiryQuotations(enquiryId: string): Promise<Quotation[]> {
  const response = await authenticated<ApiEnvelope<Quotation[]>>(
    `/api/v1/quotations/enquiry/${encodeURIComponent(enquiryId)}`
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function acceptQuotation(
  quotationId: string,
  travellers: BookingTravellerInput[]
): Promise<ApiEnvelope<unknown>> {
  return authenticated<ApiEnvelope<unknown>>(
    `/api/v1/quotations/${encodeURIComponent(quotationId)}/accept`,
    { method: 'POST', body: JSON.stringify({ travellers }) }
  );
}

export async function rejectQuotation(
  quotationId: string,
  reason: string
): Promise<ApiEnvelope<unknown>> {
  return authenticated<ApiEnvelope<unknown>>(
    `/api/v1/quotations/${encodeURIComponent(quotationId)}/reject`,
    { method: 'POST', body: JSON.stringify({ reason }) }
  );
}

// ── Wallet and transactions ─────────────────────────────────────────
export async function fetchWalletBalance(): Promise<WalletBalance | null> {
  const response = await authenticated<ApiEnvelope<WalletBalance>>('/api/v1/transactions/balance');
  return response.data || null;
}

export async function fetchTransactions(
  page = 1,
  pageSize = 20
): Promise<PaginatedResult<FinancialTransaction>> {
  const response = await authenticated<ApiEnvelope<FinancialTransaction[]>>(
    `/api/v1/transactions?page=${page}&page_size=${pageSize}`
  );
  return {
    items: Array.isArray(response.data) ? response.data : [],
    pagination: response.pagination as CustomerTourPagination | undefined,
  };
}

export async function fetchAccountPoints(
  page = 1,
  pageSize = 20
): Promise<ApiEnvelope<AccountPoints>> {
  return authenticated<ApiEnvelope<AccountPoints>>(
    `/api/v1/account/points?page=${page}&page_size=${pageSize}`
  );
}

export async function fetchPublicRanking(
  page = 1,
  pageSize = 10
): Promise<ApiEnvelope<PointsCustomer[]> & { pagination?: PointsPagination }> {
  return request<ApiEnvelope<PointsCustomer[]> & { pagination?: PointsPagination }>(
    `/api/v1/public/ranking?page=${page}&page_size=${pageSize}`
  );
}
