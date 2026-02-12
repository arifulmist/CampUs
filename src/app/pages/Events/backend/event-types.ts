export interface EventSegment {
  segment_id?: string;
  segment_title: string;
  segment_description: string;
  segment_start_date: string;
  segment_end_date: string;
  segment_start_time: string;
  segment_end_time: string;
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
  event_start_date: string;
  event_end_date: string;
  event_start_time: string;
  registration_link?: string;
  img_url?: string;
  category_id: number;
  segments: EventSegment[];
  tags: EventTag[];
}
