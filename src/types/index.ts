export interface RouteStop {
  id: string;
  place: string;
}

export interface Highlight {
  id: string;
  text: string;
}

export interface DepartureDate {
  id: string;
  date: string;
  departure_date?: string;
  return_date?: string;
  total_seats?: number;
  available_seats?: number;
}

export interface GalleryPhoto {
  id: string;
  photoId: string;
  url?: string;
  alt?: string;
  type?: 'image' | 'video' | string;
  display_order?: number;
}

export interface ItineraryDay {
  id: string;
  day: string;
  title?: string;
  description: string;
}

export interface SeasonVariant {
  id: string;
  key: string;
  display_order: number;
  variant_code: string;
  name: string;
  badge?: string;
  season_type: string;
  season_name: string;
  cover_image: string;
  banner_video?: string;
  valid_from: string;
  valid_to: string;
  duration: string;
  duration_days: number;
  duration_nights: number;
  price: number;
  currency: string;
  starting_price: number;
  seats: number;
  availability: 'AVAILABLE' | 'FEW_SEATS' | 'SOLD_OUT';
  is_active: boolean;
  is_default: boolean;
  route: RouteStop[];
  highlights: Highlight[];
  dates: DepartureDate[];
  gallery: GalleryPhoto[];
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
}

export interface Review {
  id: string;
  review_code: string;
  name: string;
  rating: number;
  review: string;
  is_verified: boolean;
  is_published: boolean;
  reviewer_by?: string;
  reviewer_pic?: string | null;
  review_gallery?: GalleryPhoto[];
  created_at: string;
}

export interface TourPackageSummary {
  id: string;
  tour_code: string;
  slug: string;
  title: string;
  destination: string;
  type: 'DOMESTIC' | 'INTERNATIONAL';
  description: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  starting_price: number;
  duration_days: number;
  duration_nights: number;
  duration: string;
  banner_video?: string;
  season_name?: string;
  variant_count: number;
  cover_image?: string;
  badge?: string;
  is_wishlist?: boolean;
}

export interface TourPackageDetail {
  id: string;
  tour_code: string;
  slug: string;
  title: string;
  destination: string;
  type: 'DOMESTIC' | 'INTERNATIONAL';
  description: string;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  banner_video?: string;
  reviews: Review[];
  seasons: SeasonVariant[];
  is_wishlist?: boolean;
}

export interface EnquiryData {
  id?: string;
  package_id?: string;
  variant_id?: string;
  tourSlug?: string;
  tourTitle?: string;
  destination?: string;
  variantName?: string;
  fullName: string;
  mobile: string;
  email?: string;
  travelDate: string;
  adults: number;
  children: number;
  message: string;
  status?: 'PENDING' | 'CONTACTED' | 'CONFIRMED';
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'OFFER' | 'TOUR' | 'SYSTEM' | 'REMINDER';
  timestamp: string;
  read: boolean;
  actionSlug?: string;
}

export type DocumentDirection = 'incoming' | 'outgoing';

export interface TravelDocument {
  id: string;
  document_type: string;
  title: string;
  type: DocumentDirection;
  description?: string;
  customer_id?: string;
  customer_name?: string;
  customer_profile_pic?: string;
  uploader_name?: string;
  uploader_profile_pic?: string;
  uploaded_at?: string;
  file_url?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  uploaded_by?: string;
  can_delete?: boolean;
}

export type NavScreen = 
  | 'splash'
  | 'home'
  | 'tours'
  | 'destinations'
  | 'destination_detail'
  | 'hotel_detail'
  | 'tour_detail'
  | 'enquiry'
  | 'auth'
  | 'notifications'
  | 'profile'
  | 'wallet'
  | 'points'
  | 'ranking'
  | 'profile_details'
  | 'edit_profile'
  | 'sessions'
  | 'notification_settings'
  | 'my_trips'
  | 'my_enquiries'
  | 'edit_enquiry'
  | 'enquiry_details'
  | 'enquiry_quotations'
  | 'bills_invoices'
  | 'invoice_details'
  | 'booking_details'
  | 'documents'
  | 'document_viewer'
  | 'wishlist'
  | 'referrals'
  | 'contact';
