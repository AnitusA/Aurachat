# Supabase Storage Setup Guide

## Problem
Images are not uploading because the Supabase bucket is not properly configured.

## Solution Steps

### 1. Create Storage Bucket in Supabase

1. Go to https://supabase.com/dashboard
2. Select your project: **nqqevivasvdcjffpvylr**
3. Click **Storage** in the left sidebar
4. Click **Create a new bucket** button
5. Enter bucket name: **Storage** (exactly as written, case-sensitive)
6. **IMPORTANT**: Toggle **Public bucket** to **ON**
7. Click **Create bucket**

### 2. Configure Bucket Policies

After creating the bucket, you need to set up policies to allow uploads:

1. Click on the **Storage** bucket you just created
2. Go to **Policies** tab
3. Click **New Policy**
4. Select **For full customization** → **Get started**
5. Create policy for INSERT (upload):
   - **Policy name**: `Allow public uploads`
   - **Policy definition**: SELECT
   - **Allowed operation**: INSERT
   - **Target roles**: public, anon
   - Click **Review** and **Save policy**

6. Create policy for SELECT (read):
   - **Policy name**: `Allow public read`
   - **Policy definition**: SELECT
   - **Allowed operation**: SELECT
   - **Target roles**: public, anon
   - Click **Review** and **Save policy**

### 3. Alternative: Quick Policy Setup

If you want to allow all operations (for development), add this policy:

```sql
CREATE POLICY "Allow all operations" ON storage.objects
  FOR ALL
  TO public
  USING (bucket_id = 'Storage')
  WITH CHECK (bucket_id = 'Storage');
```

### 4. Verify Configuration

After setup, test by:

1. Open your Aurachat app
2. Open browser DevTools (F12)
3. Go to Console tab
4. Try uploading an image in Messages
5. Watch for detailed logs starting with "=== UPLOAD TO SUPABASE STARTED ==="

## Expected Console Output (Success)

```
=== UPLOAD TO SUPABASE STARTED ===
File: example.jpg Type: image/jpeg Size: 123456
Target folder: messages/images
Generated file path: messages/images/1234567890_abc123.jpg
Target bucket: Storage
Starting upload...
Upload successful! Data: {...}
Getting public URL...
Public URL: https://nqqevivasvdcjffpvylr.supabase.co/storage/v1/object/public/Storage/messages/images/...
=== UPLOAD TO SUPABASE COMPLETED ===
```

## Common Errors

### Error: "Bucket not found"
- Make sure bucket name is exactly **Storage** (capital S)
- Verify bucket exists in Supabase dashboard

### Error: "new row violates row-level security policy"
- Policies are not set up correctly
- Follow step 2 to add policies
- OR make bucket public in step 1

### Error: "The resource already exists"
- File with same name exists
- This shouldn't happen due to timestamp + random string naming
- If it does, try upsert: true in upload options

### Error: "Not authorized"
- Anon key doesn't have permissions
- Check that policies allow 'anon' role
- Verify bucket is public OR has proper RLS policies

## Folder Structure

The app will create these folders automatically:
- `messages/images/` - For shared images
- `messages/audio/` - For voice notes

These folders don't need to be created manually; they'll be created when the first file is uploaded.

## Security Note

For production, you should:
1. Implement user authentication
2. Add Row Level Security (RLS) policies based on user_id
3. Restrict file types and sizes server-side
4. Add rate limiting for uploads
5. Consider making bucket private with signed URLs
