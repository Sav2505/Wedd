// ─── Domain Types ────────────────────────────────────────────

export type RsvpStatus = 'PENDING' | 'COMING' | 'NOT_COMING';

export interface Guest {
  id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  phone: string;
  table_number: number | null;
  side: 'חתן' | 'כלה' | 'שניהם' | null;
  guest_group_id?: string | null;
  role: 'guest' | 'couple';
  rsvp_status: RsvpStatus;
  number_of_guests: number;
  rsvp_updated_at: string | null;
  created_at: string;
  gift_amount: number | null;
}

export interface GuestGroup {
  id: string;
  name: string;
  created_at: string;
  wedding_id: number;
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
  created_at: string;
  gift_amount: number | null;
}

export interface Photo {
  id: string;
  uploader_id: string;
  uploader_name?: string; // joined from guests
  url: string | null;
  caption: string | null;
  uploaded_at: string;
  // Binary storage (new photos)
  thumbnail_data?: Buffer | null;
  full_data?: Buffer | null;
  mime_type?: string;
}

export interface WeddingInfo {
  id: number;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  wedding_time: string;
  venue_name: string;
  venue_address: string;
  venue_lat: number | null;
  venue_lng: number | null;
  dress_code: string | null;
  notes: string | null;
  message: string | null;
  hero_image_url: string | null;
  stage_label: string | null;
  updated_at: string;
  is_tables_published: boolean;
}

// ─── API Response Types ───────────────────────────────────────

export interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface AuthResponse {
  guest: Pick<Guest, 'id' | 'full_name' | 'table_number' | 'side' | 'role' | 'rsvp_status' | 'number_of_guests' | 'rsvp_updated_at'>;
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
  created_at: string;
}

export interface WeddingTableWithGuests extends WeddingTable {
  guests: Array<{
    id: string;
    full_name: string;
    side: 'חתן' | 'כלה' | 'שניהם' | null;
    plus_count: number;
    rsvp_status: RsvpStatus;
    number_of_guests: number;
    effective_plus_count: number;
    effective_party_size: number;
  }>;
}

export interface WeddingRequest {
  id: number;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  status: 'new' | 'confirmed' | 'cancelled';
  updated_at: string;
  phone_number: string;
  email: string | undefined;
}

// ─── Tasks ───────────────────────────────────────────────────

export type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'completed' | 'cancelled';

export type TaskCategory =
  | 'venue' | 'photographer' | 'dj' | 'dress' | 'suit' | 'rings'
  | 'decorations' | 'invitations' | 'transportation' | 'makeup'
  | 'hair' | 'rabbi' | 'flowers' | 'food' | 'alcohol' | 'gifts'
  | 'design' | 'side_event' | 'hotel' | 'attire' | 'lighting' | 'other';

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
