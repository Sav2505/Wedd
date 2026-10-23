// ─── Wedding Domain Types ─────────────────────────────────────

export type RsvpStatus = 'PENDING' | 'COMING' | 'NOT_COMING';

export interface Guest {
  id: string;
  full_name: string;
  table_number: number | null;
  side: 'חתן' | 'כלה' | 'שניהם' | null;
  role: 'guest' | 'couple';
  rsvp_status: RsvpStatus;
  number_of_guests: number;
  rsvp_updated_at: string | null;
  is_toured?: boolean;
  wedding_id: number;
}

export type RideKind = 'offer' | 'request';
export type RideStatus = 'active' | 'full' | 'closed' | 'expired';

export interface RidePost {
  id: string;
  kind: RideKind;
  display_name: string;
  contact_phone: string | null;
  origin_text: string;
  time_from: string;
  time_to: string | null;
  seats_available: number | null;
  passenger_count: number | null;
  notes: string | null;
  status: RideStatus;
  created_at: string;
  expires_at: string;
  is_mine: boolean;
  whatsapp_url: string | null;
}

export interface Photo {
  id: string;
  uploader_id: string;
  uploader_name: string;
  url: string;
  caption: string | null;
  uploaded_at: string;
}

export interface WeddingInfo {
  id: number;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  wedding_time: string;
  wedding_canpoy_time: string;
  venue_name: string;
  venue_address: string;
  venue_lat: number | null;
  venue_lng: number | null;
  dress_code: string | null;
  notes: string | null;
  message: string | null;
  hero_image_url: string | null;
  stage_label: string | null;
  is_tables_published: boolean;
  whatsapp_owner_confirmed: boolean;
  table_scale_factor: number;
  bride_bit_url: string | null;
  groom_bit_url: string | null;
  updated_at: string;
}

export interface WeddingMessageSchedule {
  id: number;
  wedding_id: number;
  invitation_days_before: number;
  reminder_days_before: number;
  day_before_offset_days: number;
  invitation_locked_at: string | null;
  reminder_locked_at: string | null;
  day_before_locked_at: string | null;
  invitation_image_mime_type: string | null;
  invitation_image_filename: string | null;
  invitation_image_media_id: string | null;
  has_invitation_image: boolean;
  invitation_send_at: string;
  reminder_send_at: string;
  day_before_send_at: string;
  created_at: string;
  updated_at: string;
}

export type GuestCustomMessageAudience = 'COMING' | 'PENDING' | 'ALL';
export type GuestCustomMessageStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'sending'
  | 'sent'
  | 'sent_with_errors'
  | 'expired';

export interface GuestCustomMessageRequest {
  id: string;
  wedding_id: number;
  audience: GuestCustomMessageAudience;
  message_body: string;
  scheduled_at: string;
  status: GuestCustomMessageStatus;
  admin_note: string | null;
  submitted_at: string;
  decided_at: string | null;
  sent_at: string | null;
  bride_name?: string;
  groom_name?: string;
  recipient_count?: number;
  sent_count?: number;
  failed_count?: number;
}

export interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface LoginRequest {
  fullName: string;
  lastFourDigits: string;
  weddingId?: string;
}

export interface LoginResponse {
  guest: Guest;
}

export interface WeddingRequest {
  id: number;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  status: 'new' | 'confirmed' | 'cancelled';
  updated_at: string;
  email: string;
  phone_number: string;
  first_contact_sent_at?: string | null;
  opened_at?: string | null;
  opened_by?: string | null;
  open_notes?: string | null;
}

export interface WeddingRequestMailLog {
  messageId: string;
  to: string;
  subject: string;
}

export interface CoupleCredential {
  full_name: string;
  side: 'חתן' | 'כלה';
  code: string;
}

export interface SendFirstContactResponse {
  request: WeddingRequest;
  mailLog: WeddingRequestMailLog;
}

export interface OpenWeddingResponse {
  request: WeddingRequest;
  credentials: CoupleCredential[];
  mailLog: WeddingRequestMailLog;
}

// ─── Seating ──────────────────────────────────────────────────

export interface WeddingTable {
  id: string;
  table_number: number;
  label: string | null;
  capacity: number;
  pos_x: number;
  pos_y: number;
  shape: 'round' | 'square' | 'rect';
  orientation: 'h' | 'v' | null;
}

export interface WeddingTableWithGuests extends WeddingTable {
  guests: {
    id: string;
    full_name: string;
    side: 'חתן' | 'כלה' | 'שניהם' | null;
    plus_count: number;
    rsvp_status?: RsvpStatus;
    number_of_guests?: number;
    effective_plus_count?: number;
    effective_party_size?: number;
  }[];
}

export interface UnassignedGuest {
  id: string;
  full_name: string;
  side: string | null;
  guest_group_id: string | null;
  group_name: string | null;
  plus_count: number;
  rsvp_status?: RsvpStatus;
  number_of_guests?: number;
  effective_plus_count?: number;
  effective_party_size?: number;
}

// ─── Couple Guest Management ────────────────────────────────

export interface GuestGroup {
  id: string;
  name: string;
  created_at: string;
  guest_count: number;
}

export interface ManagedGuest {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  side: 'חתן' | 'כלה' | 'שניהם' | null;
  table_number: number | null;
  guest_group_id: string | null;
  group_name: string | null;
  plus_count: number;
  rsvp_status: RsvpStatus;
  number_of_guests: number;
  rsvp_updated_at: string | null;
  vegetarian_count: number;
  vegan_count: number;
  regular_count: number;
  created_at: string;
  gift_amount: number | null;
  gift_kind: string | null;
  requested_dish_type: string | null;
  dish_notes: string | null;
  is_toured: boolean;
  wedding_id?: number;
}

// ─── Tasks & Budget ──────────────────────────────────────────

export type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'completed' | 'cancelled';

export type TaskCategory =
  | 'venue' | 'photographer' | 'dj' | 'dress' | 'suit' | 'rings'
  | 'decorations' | 'invitations' | 'transportation' | 'makeup'
  | 'hair' | 'rabbi' | 'flowers' | 'food' | 'alcohol' | 'gifts'
  | 'design' | 'lighting' | 'side_event' | 'hotel' | 'attire' | 'lighting' | 'other';

export interface WeddingTask {
  id: string;
  task_name: string;
  supplier_name: string | null;
  category: TaskCategory;
  status: TaskStatus;
  deposit: number;
  paid_amount: number;
  total_amount: number;
  /** Venue-only: price per guest plate (₪) */
  price_per_plate: number | null;
  /** Venue-only: minimum guest commitment */
  min_commitment: number | null;
  due_date: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type TaskFormData = Omit<WeddingTask, 'id' | 'created_at' | 'updated_at' | 'created_by'>;
