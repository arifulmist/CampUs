export interface EventSegment {
  segment_id?: string;
  segment_title: string;
  segment_description: string;
  segment_location?: string | null;
  segment_start_date: string | null;
  segment_end_date: string | null;
  segment_start_time: string | null;
  segment_end_time: string | null;
}

export interface EventTag {
  tag_id?: number;
  skill_id?: number;
}

export interface EventPost {
  post_id?: string;
  type: string;
  title: string;
  description: string;
  author_id: string;
  location: string;
  event_start_date: string | null;
  event_end_date: string | null;
  registration_link?: string | null;
  img_url?: string | null;
  category_id: number;
  segments: EventSegment[];
  tags: EventTag[];
}
