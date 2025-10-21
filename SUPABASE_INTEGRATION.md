# Supabase Client Integration

This document explains how to use the newly added Supabase client features for Storage and Real-time functionality while maintaining your existing Prisma database setup.

## 🏗️ Architecture Overview

```
Your App → Prisma Client → Prisma Accelerate → Supabase PostgreSQL Database
         ↘ Supabase Client → Supabase Storage & Real-time
```

- **Database Operations**: Continue using Prisma Client (no changes needed)
- **File Storage**: Use Supabase Storage via the new storage utilities
- **Real-time Features**: Use Supabase Real-time via the new React hooks

## 📁 New Files Added

### 1. `client/lib/supabase.ts`
- Supabase client configuration
- Storage bucket definitions
- Helper functions for public URLs and bucket management

### 2. `client/lib/storage.ts`
- File upload utilities
- Specialized functions for avatars, player photos, academy media, documents
- File validation and management functions

### 3. `client/hooks/use-realtime.ts`
- React hooks for real-time database subscriptions
- Presence tracking (who's online)
- Broadcasting capabilities
- Specialized hooks for notifications, players, academies, support tickets

## 🔧 Environment Setup

Add these variables to your `.env.local` file:

```env
# Supabase Configuration (for Storage and Real-time features)
REACT_APP_SUPABASE_URL=https://lpsujzvospfaomgkrcew.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_actual_anon_key_here

# Alternative Vite environment variables (if using Vite)
VITE_SUPABASE_URL=https://lpsujzvospfaomgkrcew.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

## 📦 Storage Usage Examples

### Upload Avatar
```typescript
import { uploadAvatar } from '../lib/storage'

const handleAvatarUpload = async (file: File, userId: string) => {
  const result = await uploadAvatar(file, userId)
  
  if (result.success) {
    console.log('Avatar uploaded:', result.url)
    // Update user profile with result.url
  } else {
    console.error('Upload failed:', result.error)
  }
}
```

### Upload Player Photo
```typescript
import { uploadPlayerPhoto } from '../lib/storage'

const handlePlayerPhotoUpload = async (file: File, playerId: string) => {
  const result = await uploadPlayerPhoto(file, playerId)
  
  if (result.success) {
    // Update player record with photo URL
    await updatePlayerPhoto(playerId, result.url)
  }
}
```

### Upload Academy Media
```typescript
import { uploadAcademyMedia } from '../lib/storage'

const handleLogoUpload = async (file: File, academyId: string) => {
  const result = await uploadAcademyMedia(file, academyId, 'logo')
  
  if (result.success) {
    // Update academy record with logo URL
    await updateAcademyLogo(academyId, result.url)
  }
}
```

## 🔄 Real-time Usage Examples

### Listen to New Notifications
```typescript
import { useNotificationsRealtime } from '../hooks/use-realtime'

const NotificationComponent = ({ userId }: { userId: string }) => {
  const { data, isConnected } = useNotificationsRealtime(
    userId,
    (notification) => {
      // Handle new notification
      console.log('New notification:', notification.new)
      showToast(`New notification: ${notification.new.message}`)
    }
  )

  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
      {data && <div>Latest: {data.new?.message}</div>}
    </div>
  )
}
```

### Track Player Updates
```typescript
import { usePlayersRealtime } from '../hooks/use-realtime'

const PlayersListComponent = ({ academyId }: { academyId: string }) => {
  const { data, isConnected } = usePlayersRealtime(
    academyId,
    (playerUpdate) => {
      if (playerUpdate.eventType === 'INSERT') {
        console.log('New player added:', playerUpdate.new)
      } else if (playerUpdate.eventType === 'UPDATE') {
        console.log('Player updated:', playerUpdate.new)
      }
    }
  )

  return (
    <div>
      Real-time Status: {isConnected ? '🟢 Live' : '🔴 Offline'}
    </div>
  )
}
```

### Presence Tracking (Who's Online)
```typescript
import { usePresence } from '../hooks/use-realtime'

const OnlineUsersComponent = ({ userId }: { userId: string }) => {
  const { presenceState, onlineUsers, updatePresence } = usePresence(
    'academy-dashboard',
    userId
  )

  useEffect(() => {
    // Update presence with additional data
    updatePresence({
      status: 'active',
      page: 'dashboard'
    })
  }, [updatePresence])

  return (
    <div>
      Online Users: {onlineUsers}
      <ul>
        {Object.entries(presenceState).map(([key, users]) => (
          <li key={key}>
            {users[0]?.user_id} - {users[0]?.status}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## 🔐 Storage Buckets

The following storage buckets are pre-configured:

- **`avatars`**: User profile pictures
- **`documents`**: PDF files, compliance documents
- **`academy-media`**: Academy logos, banners, gallery images
- **`player-photos`**: Player profile photos

## 🛡️ Security Notes

1. **Authentication**: The Supabase client is configured to disable auth since you're using custom authentication
2. **File Validation**: Always validate files before uploading using the `validateFile` function
3. **Bucket Permissions**: Ensure proper bucket policies are set in your Supabase dashboard
4. **Real-time Security**: Real-time subscriptions respect your database RLS policies

## 🚀 Getting Started

1. **Environment Variables**: Add the Supabase URL and anon key to your `.env.local`
2. **Storage Buckets**: Create the required buckets in your Supabase dashboard
3. **Import and Use**: Import the utilities and hooks in your components
4. **Test**: Upload a file or subscribe to real-time changes to verify everything works

## 📚 Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [React Hooks Best Practices](https://react.dev/reference/react)

## 🔧 Troubleshooting

### Storage Issues
- Verify bucket exists and has proper permissions
- Check file size limits (default: 10MB)
- Ensure file types are allowed

### Real-time Issues
- Check network connectivity
- Verify database permissions
- Monitor browser console for connection errors

### Environment Issues
- Ensure environment variables are properly set
- Restart development server after adding new variables
- Check for typos in variable names