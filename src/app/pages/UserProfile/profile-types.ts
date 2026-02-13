export type UserInfoRow = {
  name: string | null;
  batch: number | null;
  department: string | null;
  student_id: string | null;
  departments_lookup?: {
    department_name: string | null;
  } | null;
};

export type UserProfileRow = {
  bio: string | null;
  profile_picture_url: string | null;
  background_img_url: string | null;
};

export type UserPostItem = {
  postId: string;
  type: string;
  title: string;
  description: string;
  createdAt: number;
};

export type ContactPlatformRow = {
  id: number;
  platform: string;
};

export type UserContactItem = {
  platformId: number;
  platform: string;
  contactLink: string;
};

export type UserContactDraftItem = {
  key: string;
  platformId: number;
  contactLink: string;
};