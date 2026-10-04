import { Linking } from 'react-native';
import { request, authenticated, getAccessToken, BASE_API, WEB_APP_URL } from './client';
import {
  ApiEnvelope,
  DestinationRecord,
  RuleRegulation,
  UploadedFileData,
} from './types';
import {
  SeasonVariant,
  TourPackageDetail,
  TourPackageSummary,
  Review,
} from '../types';

export const OFFICIAL_WHATSAPP = '919832000000';

export function getTourWebUrl(slug: string): string {
  return `${WEB_APP_URL}/journey/${encodeURIComponent(slug)}`;
}

function textValue(value: any): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return '';

  for (const key of ['text', 'title', 'name', 'label', 'description', 'value']) {
    const text = textValue(value[key]);
    if (text) return text;
  }

  return Array.isArray(value.items)
    ? value.items.map(textValue).filter(Boolean).join('\n')
    : '';
}

function listValue(value: any): any[] {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.items) ? value.items : [];
}

function regulationValue(value: unknown): string[] | string | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean);
  if (typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
    return ((value as { items: unknown[] }).items).map(textValue).filter(Boolean);
  }
  return textValue(value);
}

function formatVariant(v: any, i = 0): SeasonVariant {
  const realId = v.variant_id || v.id;
  const price = v.selling_price ?? v.price ?? v.starting_price ?? v.list_price ?? 0;
  return {
    id: realId || `variant-${i}`,
    key: v.slug || `variant-${i}`,
    display_order: i,
    variant_code: v.slug || '',
    name: textValue(v.name || v.season_name),
    badge: textValue(v.badge),
    season_type: '',
    season_name: v.season_name || '',
    cover_image: v.banner?.image || v.cover_image || '',
    banner_video: v.banner?.video || '',
    valid_from: v.valid_from || '',
    valid_to: v.valid_to || '',
    duration: `${textValue(v.duration_nights) || 0}N | ${textValue(v.duration_days) || 0}D`,
    duration_days: Number(v.duration_days || 0),
    duration_nights: Number(v.duration_nights || 0),
    price: Number(price || 0),
    currency: 'INR',
    starting_price: Number(price || 0),
    seats: Number(v.available_seats ?? v.seats ?? 0),
    availability: v.availability || (Number(v.available_seats ?? 0) > 0 ? 'AVAILABLE' : 'SOLD_OUT'),
    is_active: true,
    is_default: i === 0,
    route: listValue(v.route).map((x: any) => ({
      id: String(x.id || ''),
      place: textValue(x.city) || textValue(x.place),
      nights: Number(x.nights || 0),
    })),
    highlights: listValue(v.highlights).map((highlight: any, index: number) => ({
      id: String(highlight?.id || index),
      text: textValue(highlight?.text ?? highlight),
    })),
    dates: listValue(v.departure_dates || v.dates).map((x: any) => ({
      id: String(x.id || ''),
      date: x.departure_date || x.date || '',
      departure_date: x.departure_date || x.date || '',
      return_date: x.return_date || '',
      total_seats: x.total_seats != null ? Number(x.total_seats) : undefined,
      available_seats: x.available_seats != null ? Number(x.available_seats) : undefined,
    })),
    gallery: listValue(v.gallery).map((x: any) => ({
      id: String(x.id || ''),
      photoId: x.url || '',
      url: x.url,
      alt: x.alt,
      type: x.type,
      display_order: x.display_order,
    })),
    itinerary: listValue(v.itinerary).map((x: any) => ({
      id: String(x.id || ''),
      day: String(x.day || ''),
      title: textValue(x.title),
      description: textValue(x.description),
    })),
    inclusions: listValue(v.inclusions).map(textValue).filter(Boolean),
    exclusions: listValue(v.exclusions).map(textValue).filter(Boolean),
  };
}

function formatSummary(x: any): TourPackageSummary {
  return {
    ...x,
    tour_code: textValue(x.tour_code) || textValue(x.code),
    slug: x.slug || x.id,
    title: textValue(x.title),
    destination: textValue(x.destination_name) || textValue(x.destination),
    description: textValue(x.description),
    variant_count: Number(x.variant_count || 0),
    starting_price: Number(x.selling_price ?? x.starting_price ?? x.price ?? 0),
    duration_days: Number(x.duration_days ?? 0),
    duration_nights: Number(x.duration_nights ?? 0),
    duration: textValue(x.duration),
    cover_image: x.cover_image || x.banner?.image || '',
    banner_video: x.banner_video || x.banner?.video || '',
    season_name: x.season_name || '',
    is_featured: Boolean(x.is_featured || x.featured || x.badge),
    is_active: x.is_active !== false,
    is_wishlist: Boolean(x.is_wishlist),
  };
}

export async function fetchTourPackages(
  page = 1,
  pageSize = 10,
  sortBy = 'created_at',
  sortOrder = 'desc',
  filters: {
    destination?: string;
    type?: string;
    season?: string;
    is_featured?: boolean;
    badge?: string;
    min_price?: number;
    max_price?: number;
    search?: string;
  } = {}
): Promise<TourPackageSummary[]> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort_by: sortBy,
    sort_order: sortOrder,
  });
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const r = await request<ApiEnvelope<any[]>>(`/api/v1/tour-packages?${params.toString()}`);
  return (Array.isArray(r.data) ? r.data : []).map(formatSummary);
}

export async function fetchDestinations(
  page = 1,
  pageSize = 20
): Promise<DestinationRecord[]> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const response = await request<ApiEnvelope<DestinationRecord[]>>(
    `/api/v1/destinations?${params.toString()}`
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchRulesRegulations(
  type: 'dom' | 'int'
): Promise<RuleRegulation[]> {
  const params = new URLSearchParams({ type });
  const response = await request<ApiEnvelope<RuleRegulation[]>>(
    `/api/v1/rules-regulations?${params.toString()}`
  );
  const rules = Array.isArray(response.data)
    ? response.data
    : listValue(response.data);
  return rules
    .filter(rule => rule?.is_active !== false)
    .map(rule => ({
      ...rule,
      id: String(rule.id || ''),
      rule_title: textValue(rule.rule_title),
      regulations: regulationValue(rule.regulations),
    }));
}

export async function fetchAllDestinations(pageSize = 100): Promise<DestinationRecord[]> {
  const destinations: DestinationRecord[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    const response = await request<ApiEnvelope<DestinationRecord[]>>(
      `/api/v1/destinations?${params.toString()}`
    );
    const items = Array.isArray(response.data) ? response.data : [];
    if (!items.length) break;
    destinations.push(...items);

    const pagination = response.pagination as { current_page?: number; total_pages?: number; has_next?: boolean } | undefined;
    const totalPages = Number(pagination?.total_pages || 0);
    if (totalPages ? page >= totalPages : pagination?.has_next === false || items.length < pageSize) break;
    page += 1;
  }

  return destinations;
}

export async function fetchTourPackageVariants(
  tourIdOrSlug: string,
  page = 1,
  pageSize = 10
): Promise<{ variants: SeasonVariant[]; pagination?: any }> {
  const r = await request<ApiEnvelope<any[]>>(
    `/api/v1/tour-packages/${encodeURIComponent(tourIdOrSlug)}/variants?page=${page}&page_size=${pageSize}`
  );
  return {
    variants: (Array.isArray(r.data) ? r.data : []).map(formatVariant),
    pagination: (r as any).pagination,
  };
}

export async function fetchTourDetail(
  slug: string,
  initialTour?: TourPackageSummary | null
): Promise<TourPackageDetail> {
  let d: any;
  if (initialTour) {
    d = formatSummary({ ...initialTour, id: initialTour.id, slug: initialTour.slug || slug });
  } else {
    // The end-user API exposes package lists and variant details, not a
    // singular /tour-packages/{slug} route.
    const r = await request<ApiEnvelope<any[]>>(
      `/api/v1/tour-packages?page=1&page_size=100&search=${encodeURIComponent(slug)}`
    );
    const items = Array.isArray(r.data) ? r.data : [];
    d = items.map(formatSummary).find(item => item.slug === slug) || items.map(formatSummary)[0];
    if (!d) throw new Error('Tour package was not found');
  }
  const packageSlug = d.slug || slug;
  const packageVariants = await fetchTourPackageVariants(packageSlug).catch(() => ({ variants: [] as SeasonVariant[] }));
  const legacyVariants = [d.default_variant, ...(d.other_variants || [])].filter(Boolean).map(formatVariant);
  let seasons = packageVariants.variants.length ? packageVariants.variants : legacyVariants;
  if (packageVariants.variants.length) {
    const defaultVariant = packageVariants.variants.find(v => v.is_default) || packageVariants.variants[0];
    const detailedDefault = await fetchTourVariant(packageSlug, defaultVariant.key || defaultVariant.id, packageVariants.variants).catch(() => null);
    if (detailedDefault?.variant) {
      seasons = [detailedDefault.variant, ...packageVariants.variants.filter(v => v.id !== defaultVariant.id)];
    }
  }
  return {
    ...d,
    title: textValue(d.title),
    destination: textValue(d.destination_name) || textValue(d.destination),
    is_featured: Boolean(d.is_featured),
    is_active: d.is_active !== false,
    seasons,
    reviews: listValue(d.reviews).map((review: any) => ({
      ...review,
      name: textValue(review.name) || textValue(review.reviewer_by) || 'Verified Traveler',
      reviewer_by: textValue(review.reviewer_by),
      review: textValue(review.review),
      is_verified: true,
      review_gallery: listValue(review.review_gallery).map((item: any) => ({
        id: item.id,
        url: item.url,
        alt: item.alt,
        type: item.type,
        photoId: item.url,
      })),
    })),
  };
}

export async function fetchTourVariant(slug: string, variantSlug: string, listedVariants?: SeasonVariant[]) {
  const variants = listedVariants ? { variants: listedVariants } : await fetchTourPackageVariants(slug).catch(() => ({ variants: [] as SeasonVariant[] }));
  const listedVariant = variants.variants.find(v => v.id === variantSlug || v.key === variantSlug);
  const r = await request<ApiEnvelope<any>>(
    `/api/v1/tour-packages/${encodeURIComponent(slug)}/variants/${encodeURIComponent(listedVariant?.key || variantSlug)}/details`
  );
  const detail = r.data?.variant || r.data;
  if (!detail) throw new Error('Tour variant was not found');
  return {
    variant: formatVariant({ ...listedVariant, ...detail }),
    details: detail,
    other_variants: r.data?.other_variants || variants.variants.filter(v => v.id !== listedVariant?.id),
  };
}

export async function fetchPackageReviews(
  slug: string,
  page = 1,
  pageSize = 10
): Promise<{ reviews: Review[]; pagination?: any }> {
  try {
    const r = await request<ApiEnvelope<any>>(
      `/api/v1/reviews/package/${encodeURIComponent(slug)}?page=${page}&page_size=${pageSize}`
    );
    const items = listValue(r.data);
    const reviews: Review[] = items.map((review: any) => ({
      id: review.id,
      review_code: review.review_code || '',
      name: textValue(review.name) || textValue(review.reviewer_by) || 'Verified Traveler',
      rating: Number(review.rating || 5),
      review: textValue(review.review),
      is_verified: Boolean(review.is_verified ?? true),
      is_published: Boolean(review.is_published ?? true),
      reviewer_by: textValue(review.reviewer_by),
      reviewer_pic: review.reviewer_pic,
      review_gallery: listValue(review.review_gallery).map((item: any) => ({
        id: item.id || item.url,
        url: item.url,
        alt: item.alt,
        type: item.type,
        photoId: item.url,
      })),
      created_at: review.created_at || new Date().toISOString(),
    }));
    return { reviews, pagination: (r as any).pagination };
  } catch {
    return { reviews: [] };
  }
}

export async function fetchReviewEligibility(
  slug: string
): Promise<{ can_review: boolean; has_reviewed: boolean; review?: any } | null> {
  try {
    const r = await authenticated<
      ApiEnvelope<{ package_id: string; can_review: boolean; has_reviewed: boolean; review?: any }>
    >(`/api/v1/reviews/eligibility/${encodeURIComponent(slug)}`);
    return r.data || null;
  } catch {
    return null;
  }
}

export async function submitReviewApi(payload: {
  package_id: string;
  rating: number;
  review: string;
  review_gallery?: any[];
}): Promise<ApiEnvelope<unknown>> {
  return authenticated<ApiEnvelope<unknown>>('/api/v1/reviews', {
    method: 'POST',
    body: JSON.stringify({ ...payload, review_gallery: payload.review_gallery || [] }),
  });
}

export async function updateReviewApi(
  reviewId: string,
  payload: {
    rating?: number;
    review?: string;
    review_gallery?: any[];
  }
): Promise<ApiEnvelope<unknown>> {
  return authenticated<ApiEnvelope<unknown>>(`/api/v1/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteReviewApi(reviewId: string): Promise<ApiEnvelope<unknown>> {
  return authenticated<ApiEnvelope<unknown>>(`/api/v1/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'DELETE',
  });
}

export async function uploadFileApi(
  file: { uri: string; name?: string; type?: string } | FormData | any,
  signal?: AbortSignal
): Promise<ApiEnvelope<UploadedFileData>> {
  const token = await getAccessToken();
  let body: any;

  if (file instanceof FormData) {
    body = file;
  } else if (file && typeof file === 'object' && file.uri) {
    const formData = new FormData();
    const uri = file.uri;
    const filename = file.name || uri.split('/').pop() || 'upload_file';
    let mimeType = file.type;
    if (!mimeType) {
      const ext = filename.split('.').pop()?.toLowerCase();
      if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'png') mimeType = 'image/png';
      else if (ext === 'gif') mimeType = 'image/gif';
      else if (ext === 'webp') mimeType = 'image/webp';
      else if (ext === 'mp4') mimeType = 'video/mp4';
      else if (ext === 'pdf') mimeType = 'application/pdf';
      else if (ext === 'doc') mimeType = 'application/msword';
      else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else mimeType = 'application/octet-stream';
    }
    formData.append('file', {
      uri,
      name: filename,
      type: mimeType,
    } as any);
    body = formData;
  } else {
    body = file;
  }

  const res = await fetch(`${BASE_API}/api/v1/public/files/upload`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
    signal,
  });

  const resBody = await res.json().catch(() => ({}));
  if (!res.ok || resBody?.success === false) {
    throw new Error(resBody?.message || `File upload failed (${res.status})`);
  }
  return resBody as ApiEnvelope<UploadedFileData>;
}

export function openWhatsAppChat(text: string, phone = OFFICIAL_WHATSAPP) {
  const encoded = encodeURIComponent(text);
  const app = `whatsapp://send?phone=${phone}&text=${encoded}`;
  Linking.canOpenURL(app)
    .then(ok => Linking.openURL(ok ? app : `https://wa.me/${phone}?text=${encoded}`))
    .catch(() => Linking.openURL(`https://wa.me/${phone}?text=${encoded}`));
}
