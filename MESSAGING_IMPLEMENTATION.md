# Real-Time Messaging System - Implementation Guide

## 🎯 What Was Implemented

A complete real-time messaging system with:

1. ✅ Message persistence in Supabase database
2. ✅ Real-time message delivery across users
3. ✅ Online/active status with green indicator (like Facebook)
4. ✅ Automatic message history loading
5. ✅ Message navigation from user profile

## 📋 Setup Instructions

### Step 1: Run Database Migration

Execute the SQL migration to create the messages table:

```bash
# Navigate to your project root
cd d:\code\CampUs

# Apply the migration in Supabase Dashboard or using CLI
# Go to: Supabase Dashboard > SQL Editor > Paste the migration file content
```

Or manually run the SQL from: `supabase/migrations/20260206000000_create_messages_table.sql`

### Step 2: Enable Realtime in Supabase

1. Go to Supabase Dashboard
2. Navigate to **Database** > **Replication**
3. Enable replication for the `messages` table
4. Make sure "Realtime" is turned ON

### Step 3: Test the System

1. **Start your development server**

   ```bash
   npm run dev
   ```

2. **Test messaging flow:**
   - Login as User A
   - Navigate to another user's profile
   - Click the "Message" button
   - You'll be redirected to `/messaging?user={studentId}&name={userName}`
   - The chat drawer opens automatically
   - Send a message

3. **Test real-time delivery:**
   - Open another browser/incognito window
   - Login as User B
   - Go to `/messaging`
   - You should see the message from User A instantly

## 🔄 How It Works

### 1. Message Button Click Flow

**UserProfile.tsx** (Line ~2270):

```tsx
onClick={() => navigate(`/messaging?user=${studentId}&name=${encodeURIComponent(displayName)}`)}
```

- Navigates to messaging page with user parameters
- Automatically opens chat with selected user

### 2. Message Storage

**chatStore.ts** - `sendMessage()`:

```typescript
// Saves to Supabase messages table
await supabase.from("messages").insert({
  conversation_id: conversationId, // sorted pair of IDs
  sender_id: currentUserId,
  receiver_id: otherUserId,
  message_text: msg,
});
```

### 3. Message Loading

**chatStore.ts** - `loadMessagesFromDB()`:

- Automatically called when opening a chat
- Loads all past messages from database
- Sorted by timestamp (oldest first)

### 4. Real-Time Updates

**chatStore.ts** - `setupRealtimeSubscription()`:

```typescript
supabase.channel("messages")
  .on("postgres_changes", {
    event: "INSERT",
    table: "messages",
    filter: `receiver_id=eq.${currentUserId}`
  }, (payload) => {
    // Instantly receive new messages
    receiveMessage(...)
  })
```

### 5. Online Status Tracking

**Messaging.tsx** - Presence tracking:

```typescript
channel.on("presence", { event: "sync" }, () => {
  // Updates list of online users
  setOnlineUsers(online);
});
```

**Visual Indicators:**

- 🟢 Green pulsing dot = User is online
- "Active now" text in chat header
- Updates every 30 seconds

## 📁 Database Schema

### `messages` Table

| Column          | Type      | Description             |
| --------------- | --------- | ----------------------- |
| id              | UUID      | Primary key             |
| conversation_id | TEXT      | Sorted pair of user IDs |
| sender_id       | TEXT      | Student ID of sender    |
| receiver_id     | TEXT      | Student ID of receiver  |
| message_text    | TEXT      | Message content         |
| created_at      | TIMESTAMP | Message timestamp       |
| read_at         | TIMESTAMP | When message was read   |

### Conversation ID Format

```typescript
// Always sorted to ensure same ID for both users
const [minId, maxId] = [userId1, userId2].sort();
const conversationId = `${minId}_${maxId}`;
```

Example:

- User "2022001" and "2022005" → `"2022001_2022005"`
- User "2022005" and "2022001" → `"2022001_2022005"` (same!)

## 🔐 Security (RLS Policies)

✅ Users can only:

- View messages they sent or received
- Send messages as themselves
- Update read status of received messages

## 🎨 UI Features

### Message Status Indicators

- ⏳ **Pending**: Message being sent
- ✅ **Sent**: Successfully delivered to database
- ❌ **Failed**: Error sending message

### Online Status

- **Green pulsing dot** on avatar
- **"Active now"** text below username
- Shows in both sidebar and chat header

### Auto-scroll

- Messages auto-scroll to bottom
- New messages appear instantly

## 🐛 Troubleshooting

### Messages not appearing?

1. Check Supabase RLS policies are enabled
2. Verify realtime is enabled for `messages` table
3. Check browser console for errors

### Online status not working?

1. Ensure user has `student_id` in `user_info` table
2. Check presence channel subscription
3. Verify Supabase realtime is configured

### Can't send messages?

1. Check user is authenticated
2. Verify `user_info.student_id` exists
3. Check RLS policy for INSERT on messages

## 📊 Performance Optimization

- ✅ Indexed conversation_id for fast queries
- ✅ Indexed created_at for timestamp sorting
- ✅ RLS policies prevent unauthorized access
- ✅ Only subscribe to messages for current user
- ✅ Presence updates every 30 seconds (not on every action)

## 🚀 Future Enhancements

Possible improvements:

- [ ] Message read receipts (double checkmark)
- [ ] Typing indicators
- [ ] Image/file attachments
- [ ] Message deletion
- [ ] Group chats
- [ ] Emoji reactions
- [ ] Voice messages
- [ ] Search conversations

## 📝 Testing Checklist

- [ ] Send message from User A → User B receives instantly
- [ ] Load past messages when opening chat
- [ ] Online status shows correctly
- [ ] Message persists after page refresh
- [ ] Can navigate from profile to chat
- [ ] Multiple conversations work independently
- [ ] Messages stay in correct conversation

---

**Status:** ✅ Fully Implemented and Ready to Use!
