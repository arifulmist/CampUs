import { supabase } from "@/supabase/supabaseClient";

// Types matching the database schema
export interface DBNote {
  note_id: string;
  semester_id: string;
  title: string;
  course: string;
  course_code: string;
  file_url: string;
  author_id: string | null;
  upload_date: string;
  upload_time: string;
  // Joined from user_info
  author?: {
    auth_uid: string;
    name: string;
    batch: string;
    profile_picture: string | null;
  };
}

export interface DBResource {
  resource_id: string;
  semester_id: string;
  author_id: string | null;
  title: string;
  course: string;
  course_code: string;
  resource_link: string;
  upload_date: string;
  upload_time: string;
  // Joined from user_info
  author?: {
    auth_uid: string;
    name: string;
    batch: string;
    profile_picture: string | null;
  };
}

export interface DBSemester {
  semester_id: string;
  batch_id: string;
  level: number;
  term: number;
}

export interface DBBatch {
  batch_id: string;
  batch_name: string;
}

// Frontend-friendly types
export interface Note {
  id: string;
  title: string;
  uploadedBy: string;
  courseCode: string;
  uploadDate: string;
  uploadTime: string;
  fileLink: string;
  fileName?: string;
  authorId?: string;
}

export interface ResourceItem {
  id: string;
  user: {
    name: string;
    batch: string;
    imgURL: string;
  };
  title: string;
  course: string;
  resourceLink: string;
}

// Get or create batch by name
export async function getOrCreateBatch(batchName: string): Promise<string> {
  // Try to find existing batch
  const { data: existing } = await supabase
    .from("student_batch")
    .select("batch_id")
    .eq("batch_name", batchName)
    .single();

  if (existing) return existing.batch_id;

  // Create new batch if not found
  const { data: newBatch, error: createError } = await supabase
    .from("student_batch")
    .insert({ batch_name: batchName })
    .select("batch_id")
    .single();

  if (createError) throw createError;
  return newBatch.batch_id;
}

// Get or create semester
export async function getOrCreateSemester(
  batchName: string,
  level: number,
  term: number,
): Promise<string> {
  const batchId = await getOrCreateBatch(batchName);

  // Try to find existing semester
  const { data: existing } = await supabase
    .from("semesters")
    .select("semester_id")
    .eq("batch_id", batchId)
    .eq("level", level)
    .eq("term", term)
    .single();

  if (existing) return existing.semester_id;

  // Create new semester if not found
  const { data: newSemester, error: createError } = await supabase
    .from("semesters")
    .insert({ batch_id: batchId, level, term })
    .select("semester_id")
    .single();

  if (createError) throw createError;
  return newSemester.semester_id;
}

// Fetch notes for a specific level/term
export async function fetchNotes(
  batchName: string,
  level: number,
  term: number,
): Promise<Note[]> {
  // First get the semester_id
  const batchId = await getOrCreateBatch(batchName);

  const { data: semester } = await supabase
    .from("semesters")
    .select("semester_id")
    .eq("batch_id", batchId)
    .eq("level", level)
    .eq("term", term)
    .single();

  if (!semester) return [];

  // Fetch notes; include joined `user_info` (if available) to get author name directly
  const { data: notes, error } = await supabase
    .from("notes")
    .select(
      `note_id, title, course, course_code, file_url, upload_date, upload_time, author_id, user_info ( auth_uid, name )`,
    )
    .eq("semester_id", semester.semester_id)
    .order("upload_date", { ascending: false });

  if (error) {
    console.error("Error fetching notes:", error);
    return [];
  }

  if (!notes || notes.length === 0) return [];

  // Batch-fetch author info for all unique author_ids (only names missing from join)
  const authorIds = [
    ...new Set(notes.map((n: any) => n.author_id).filter(Boolean)),
  ];
  const authorMap = await fetchAuthorMap(authorIds);

  // Transform to frontend format. Prefer joined `user_info.name` when present,
  // otherwise fall back to authorMap lookup and finally "Unknown".
  const result = [];
  for (const n of notes) {
    const joinedName = n.user_info?.name ?? null;
    const mappedName = authorMap[n.author_id]?.name ?? null;
    result.push({
      id: n.note_id,
      title: n.title,
      uploadedBy: joinedName ?? mappedName ?? "Unknown",
      courseCode: `${n.course}-${n.course_code}`,
      uploadDate: formatDate(n.upload_date),
      uploadTime: formatTime(n.upload_time),
      fileLink: n.file_url,
      fileName: extractFileName(n.file_url),
      authorId: n.author_id,
    });
  }

  return result;
}

// Fetch resources for a specific level/term
export async function fetchResources(
  batchName: string,
  level: number,
  term: number,
): Promise<ResourceItem[]> {
  // First get the semester_id
  const batchId = await getOrCreateBatch(batchName);

  const { data: semester } = await supabase
    .from("semesters")
    .select("semester_id")
    .eq("batch_id", batchId)
    .eq("level", level)
    .eq("term", term)
    .single();

  if (!semester) return [];

  // Fetch resources
  const { data: resources, error } = await supabase
    .from("resources")
    .select(
      "resource_id, title, course, course_code, resource_link, upload_date, upload_time, author_id",
    )
    .eq("semester_id", semester.semester_id)
    .order("upload_date", { ascending: false });

  if (error) {
    console.error("Error fetching resources:", error);
    return [];
  }

  if (!resources || resources.length === 0) return [];

  // Batch-fetch author info for all unique author_ids
  const authorIds = [
    ...new Set(resources.map((r: any) => r.author_id).filter(Boolean)),
  ];
  const authorMap = await fetchAuthorMap(authorIds);

  // Transform to frontend format
  return resources.map((r: any) => ({
    id: r.resource_id,
    user: {
      name: authorMap[r.author_id]?.name ?? "Unknown",
      batch: String(authorMap[r.author_id]?.batch ?? ""),
      imgURL: authorMap[r.author_id]?.profile_picture ?? "",
    },
    title: r.title,
    course: `${r.course}-${r.course_code}`,
    resourceLink: r.resource_link,
  }));
}

// Create a new note
export async function createNote(data: {
  batchName: string;
  level: number;
  term: number;
  title: string;
  course: string;
  courseCode: string;
  fileUrl: string;
}): Promise<Note> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("You must be logged in to upload notes");

  const semesterId = await getOrCreateSemester(
    data.batchName,
    data.level,
    data.term,
  );

  const { data: note, error } = await supabase
    .from("notes")
    .insert({
      semester_id: semesterId,
      title: data.title,
      course: data.course.toUpperCase(),
      course_code: data.courseCode,
      file_url: data.fileUrl,
      author_id: user.id,
    })
    .select(
      `
      note_id,
      title,
      course,
      course_code,
      file_url,
      upload_date,
      upload_time,
      author_id
    `,
    )
    .single();

  if (error) throw error;

  // Get author info
  const { data: authorInfo } = await supabase
    .from("user_info")
    .select("name")
    .eq("auth_uid", user.id)
    .single();

  return {
    id: note.note_id,
    title: note.title,
    uploadedBy: authorInfo?.name ?? "Unknown",
    courseCode: `${note.course}-${note.course_code}`,
    uploadDate: formatDate(note.upload_date),
    uploadTime: formatTime(note.upload_time),
    fileLink: note.file_url,
    fileName: extractFileName(note.file_url),
    authorId: note.author_id,
  };
}

// Create a new resource
export async function createResource(data: {
  batchName: string;
  level: number;
  term: number;
  title: string;
  course: string;
  courseCode: string;
  resourceLink: string;
}): Promise<ResourceItem> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("You must be logged in to upload resources");

  const semesterId = await getOrCreateSemester(
    data.batchName,
    data.level,
    data.term,
  );

  const { data: resource, error } = await supabase
    .from("resources")
    .insert({
      semester_id: semesterId,
      title: data.title,
      course: data.course.toUpperCase(),
      course_code: data.courseCode,
      resource_link: data.resourceLink,
      author_id: user.id,
    })
    .select(
      `
      resource_id,
      title,
      course,
      course_code,
      resource_link,
      upload_date,
      upload_time,
      author_id
    `,
    )
    .single();

  if (error) throw error;

  // Get author info
  const { data: authorInfo } = await supabase
    .from("user_info")
    .select("name, batch, profile_picture")
    .eq("auth_uid", user.id)
    .single();

  return {
    id: resource.resource_id,
    user: {
      name: authorInfo?.name ?? "Unknown",
      batch: authorInfo?.batch ?? "",
      imgURL: authorInfo?.profile_picture ?? "",
    },
    title: resource.title,
    course: `${resource.course}-${resource.course_code}`,
    resourceLink: resource.resource_link,
  };
}

// Upload file to Supabase Storage
export async function uploadNoteFile(file: File): Promise<string> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("You must be logged in to upload files");

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage.from("notes").upload(fileName, file);

  if (error) {
    // Provide a clearer message for missing bucket to help debugging
    if (String(error.message).toLowerCase().includes("bucket not found")) {
      throw new Error(
        'Storage bucket "notes" not found. Create a bucket named "notes" in your Supabase project (Storage → Buckets) or update the code to use the correct bucket name.',
      );
    }
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("notes")
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// Fetch author info for a list of author IDs in one query
async function fetchAuthorMap(
  authorIds: string[],
): Promise<
  Record<string, { name: string; batch: any; profile_picture: string | null }>
> {
  if (authorIds.length === 0) return {};

  const { data, error } = await supabase
    .from("user_info")
    .select("auth_uid, name, batch, profile_picture")
    .in("auth_uid", authorIds);

  if (error) {
    console.error("Error fetching authors:", error);
    return {};
  }

  const map: Record<
    string,
    { name: string; batch: any; profile_picture: string | null }
  > = {};
  for (const author of data || []) {
    map[author.auth_uid] = {
      name: author.name ?? "Unknown",
      batch: author.batch,
      profile_picture: author.profile_picture,
    };
  }
  return map;
}

// Helper functions
function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  // Handle time string like "10:30:00" or "10:30:00+06"
  const timePart = timeStr.split("+")[0].split("-")[0];
  const [hours, minutes] = timePart.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes}${ampm}`;
}

function extractFileName(url: string): string | undefined {
  if (!url) return undefined;
  const parts = url.split("/");
  return parts[parts.length - 1]?.split("?")[0];
}
