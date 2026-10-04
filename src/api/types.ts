export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  pagination?: any;
};

export interface EnumOption {
  value: string;
  label: string;
}

export interface EnumGroup {
  name: string;
  label: string;
  options: EnumOption[];
}

export interface EnumList {
  groups: EnumGroup[];
}

export interface UploadedFileData {
  path: string;
  url: string;
  filename: string;
  content_type: string;
  bytes: number;
}

export interface ResourceImage {
  id?: string;
  alt?: string;
  url?: string;
  type?: string;
  display_order?: number;
  [key: string]: any;
}

export interface HotelRecord {
  id: string;
  name: string;
  image?: ResourceImage[];
  destination_id?: string;
  category?: string;
  address?: string;
  contact?: string;
  description?: string;
}

export interface DestinationRecord {
  id: string;
  name: string;
  slug: string;
  country: string;
  description: string;
  image_url: string;
  is_domestic: boolean;
  is_featured: boolean;
}

export interface VehicleRecord {
  id: string;
  name: string;
  vehicle_image?: ResourceImage[];
  vehicle_type?: string;
  registration_number?: string;
  capacity?: number;
  price_per_day?: string | number;
}

export interface AuthUser {
  id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_mobile: string;
  profile_pic: string;
  source: string;
  is_active: boolean;
  is_imported?: boolean;
  customer_code: string;
  created_at: string;
  updated_at: string;
}

export interface OtpRequestData {
  identifier: string;
  identifier_type: string;
  expires_in_sec: number;
  dev_otp?: string;
}

export interface AuthTokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export type CustomerOtpPurpose =
  | 'LOGIN'
  | 'SIGNUP'
  | 'VERIFY_MOBILE'
  | 'VERIFY_EMAIL'
  | 'DELETE_ACCOUNT';

export interface SessionItem {
  id: string;
  actor_type?: string;
  user_agent?: string;
  ip_address?: string;
  device_name?: string;
  device?: string;
  browser?: string;
  os?: string;
  created_at?: string;
  last_used_at?: string;
  updated_at?: string;
  last_seen?: string;
  expires_at?: string;
  is_current?: boolean;
}

export interface EnquiryRecord {
  id: string;
  enquiry_type?: string;
  channel?: string;
  package_id?: string;
  variant_id?: string;
  destination_id?: string;
  subject?: string;
  message?: string;
  enquiry_code?: string;
  visitor_id?: string;
  customer_id?: string;
  status?: string;
  enquirer_name?: string;
  enquirer_phone?: string;
  enquirer_email?: string;
  hotel_id?: string;
  hotel_name?: string;
  room_id?: string;
  vehicle_id?: string;
  vehicle_name?: string;
  vehicle_registration_number?: string;
  destination?: string;
  destination_name?: string;
  travel_date?: string;
  travel_duration?: string;
  travel_duration_day?: number;
  travel_duration_night?: number;
  pax_no?: number;
  adult_count?: number;
  child_count?: number;
  senior_count?: number;
  room_count?: number;
  vehicle_count?: number;
  no_room?: number;
  vehicle_type?: string;
  meal_plan?: string;
  budget_min?: number;
  budget_max?: number;
  special_requirements?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface EnquiryCreateInput {
  enquiry_type: string;
  visitor_id?: string;
  customer_id?: string;
  package_id?: string;
  variant_id?: string;
  destination_id?: string;
  channel: string;
  message?: string;
  name: string;
  phone: string;
  email?: string;
  travel_date?: string;
  travel_duration_day?: number;
  travel_duration_night?: number;
  adult_count?: number;
  child_count?: number;
  senior_count?: number;
  hotel_id?: string;
  vehicle_id?: string;
  room_count?: number;
  vehicle_count?: number;
  budget_min?: number;
  budget_max?: number;
  special_requirements?: string;
  meal_plan?: string;
}

export type EnquiryUpdateInput = Partial<Omit<EnquiryCreateInput, 'enquiry_type' | 'visitor_id' | 'customer_id' | 'channel'>>;

export interface Trip {
  id: string;
  enquiry_code?: string;
  destination?: string;
  travel_date?: string;
  pax_no?: number;
  status?: string;
  subject?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface CustomerTourCustomer {
  id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  profile_pic?: string;
}

export interface CustomerTourPackage {
  id?: string;
  name?: string;
  season?: string;
}

export interface CustomerTourVariant {
  id?: string;
  name?: string;
  banner?: Record<string, any>;
}

export interface BookingTraveller {
  id: string;
  booking_id?: string;
  full_name: string;
  gender?: string | null;
  date_of_birth?: string | null;
  mobile?: string | null;
  email?: string | null;
  relationship_to_customer?: string | null;
  is_primary?: boolean;
}

export interface CustomerTour {
  id: string;
  booking_code?: string;
  customer?: CustomerTourCustomer | null;
  enquiry_id?: string | null;
  destination_id?: string | null;
  destination_name?: string | null;
  package?: CustomerTourPackage | null;
  variant?: CustomerTourVariant | null;
  departure_id?: string | null;
  departure_date?: string | null;
  return_date?: string | null;
  booking_type?: string | null;
  source?: string | null;
  status?: string | null;
  total_amount?: string | number | null;
  paid_amount?: string | number | null;
  due_amount?: string | number | null;
  travellers?: BookingTraveller[];
  [key: string]: any;
}

export type CustomerTourDetail = CustomerTour;

export interface CustomerTourPagination {
  current_page?: number;
  page_size?: number;
  total_items?: number;
  total_pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
}

export interface CustomerTourListResult {
  items: CustomerTour[];
  pagination?: CustomerTourPagination;
}

export interface BookingTravellerInput {
  full_name: string;
  gender?: string;
  date_of_birth?: string;
  mobile?: string;
  email?: string;
  relationship_to_customer?: string;
  is_primary: boolean;
}

export interface UserStats {
  journeys_taken: number;
  countries_visited: number;
  total_travel_days: number;
  member_since?: string;
  total_spent?: number;
}

export interface NotificationPreferences {
  push_notifications: boolean;
  newsletter: boolean;
  sms_alerts: boolean;
  email_updates: boolean;
}

export interface NotificationRecord {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  image_url?: string | null;
  action_url?: string | null;
  data?: Record<string, any> | null;
  is_read?: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationList {
  items: NotificationRecord[];
  unread_count: number;
}

export interface Invoice {
  id: string;
  invoice_code?: string;
  destination?: string;
  amount?: number;
  currency?: string;
  booking_date?: string;
  status?: string;
  travel_date?: string;
  [key: string]: any;
}

export interface QuotationItem {
  id: string;
  item_type?: string;
  name: string;
  description?: string | null;
  quantity?: number;
  unit_price?: string | number;
  total_price?: string | number;
}

export interface Quotation {
  id: string;
  quotation_code: string;
  enquiry_id: string;
  tour_name: string;
  travel_date?: string | null;
  return_date?: string | null;
  subtotal?: string | number;
  discount_amount?: string | number;
  tax_amount?: string | number;
  total_amount?: string | number;
  valid_until?: string | null;
  status: string;
  version?: number;
  terms_and_conditions?: string | null;
  important_notes?: string | null;
  inclusion?: string | null;
  exclusion?: string | null;
  rejected_reason?: string | null;
  accepted_at?: string | null;
  rejected_at?: string | null;
  items?: QuotationItem[];
  hotels?: any[];
  vehicles?: any[];
  itinerary?: any[];
  [key: string]: any;
}

export interface WalletBalance {
  account_id: string;
  customer_id: string;
  balance: string | number;
  currency: string;
}

export interface FinancialTransaction {
  id: string;
  amount: string | number;
  transaction_type: string;
  category?: string | null;
  description?: string | null;
  transaction_date?: string | null;
  status?: string;
  currency?: string;
  payment_method?: string | null;
  booking_id?: string | null;
  booking_code?: string | null;
  customer_id?: string | null;
  reference?: string | null;
  created_at?: string | null;
  [key: string]: any;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination?: CustomerTourPagination;
}

export interface PointsCustomer {
  rank: number;
  customer_name: string;
  customer_profile_picture?: string | null;
  customer_joined_at?: string | null;
  point_balance: number;
}

export interface PointsTransaction {
  id: string;
  booking_id?: string | null;
  package_id?: string | null;
  booking_code?: string | null;
  tour_title?: string | null;
  transaction_type: string;
  points: number;
  balance_before: string | number;
  balance_after: string | number;
  amount_per_point?: string | number | null;
  reason?: string | null;
  created_at: string;
}

export interface PointsPagination {
  current_page: number;
  has_next: boolean;
  has_previous: boolean;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface AccountPoints {
  points_balance: string | number;
  rank: number;
  around: PointsCustomer[];
  transactions: PointsTransaction[];
  transaction_pagination: PointsPagination;
}
