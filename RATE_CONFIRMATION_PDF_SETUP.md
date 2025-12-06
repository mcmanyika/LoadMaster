# Rate Confirmation PDF Setup Guide

## ✅ Implementation Complete

Rate Confirmation PDF capture functionality has been added to your LoadMaster application. Users can now upload PDF files when creating or editing loads.

## 📋 What Was Added

1. **Database Migration** - Added `rate_confirmation_pdf_url` column to the `loads` table
2. **Type Updates** - Added `rateConfirmationPdfUrl` field to the `Load` interface
3. **Storage Service** - Created `storageService.ts` for PDF upload/delete operations
4. **UI Component** - Added file upload interface to `LoadForm` component
5. **Service Updates** - Updated `loadService.ts` to handle PDF URLs in all CRUD operations

## 🚀 Setup Steps

### Step 1: Run Database Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase_migrations/004_add_rate_confirmation_pdf.sql`
4. Click **Run** to execute the migration

### Step 2: Create Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Click **Create a new bucket**
3. Name it: `rate-confirmations`
4. Set it to **Public** (or Private with RLS policies)
5. Click **Create bucket**

### Step 3: Set Storage Policies (If Using Private Bucket)

If you set the bucket to Private, you'll need to add RLS policies. Run this SQL in the SQL Editor:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload rate confirmations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rate-confirmations');

-- Allow authenticated users to read files
CREATE POLICY "Users can read rate confirmations"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'rate-confirmations');

-- Allow authenticated users to delete files
CREATE POLICY "Users can delete rate confirmations"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'rate-confirmations');
```

### Step 4: Test the Feature

1. Start your development server: `npm run dev`
2. Navigate to the Load Management section
3. Click **Add New Load** or edit an existing load
4. You should see a new **Rate Confirmation PDF** section
5. Click to upload a PDF file (max 10MB)
6. The PDF will be uploaded to Supabase Storage and linked to the load

## 🎨 Features

- ✅ **File Upload** - Drag and drop or click to upload PDF files
- ✅ **File Validation** - Only PDF files accepted, 10MB size limit
- ✅ **Preview** - View uploaded PDFs directly from the form
- ✅ **Remove** - Remove PDF before saving
- ✅ **View Link** - Click "View PDF" to open in new tab
- ✅ **Persistence** - PDF URLs are saved with load data

## 📝 File Structure

```
supabase_migrations/
  └── 004_add_rate_confirmation_pdf.sql  (Database migration)

services/
  ├── storageService.ts                   (PDF upload/delete functions)
  └── loadService.ts                      (Updated to handle PDF URLs)

components/
  └── LoadForm.tsx                        (Added PDF upload UI)

types.ts                                  (Updated Load interface)
```

## 🔧 Technical Details

- **Storage Bucket**: `rate-confirmations`
- **File Naming**: `{loadId}-{timestamp}.pdf`
- **Max File Size**: 10MB
- **File Type**: PDF only (`application/pdf`)

## 🐛 Troubleshooting

### PDF Upload Fails

1. **Check Storage Bucket**: Ensure `rate-confirmations` bucket exists
2. **Check Policies**: If using private bucket, ensure RLS policies are set
3. **Check Console**: Look for error messages in browser console
4. **Check File Size**: Ensure file is under 10MB

### PDF Not Displaying

1. **Check URL**: Verify the PDF URL is saved in the database
2. **Check Storage**: Ensure the file exists in the storage bucket
3. **Check Permissions**: If private bucket, ensure read policies are set

### Migration Fails

1. **Check Column**: The column might already exist - that's okay, the migration uses `IF NOT EXISTS`
2. **Check Permissions**: Ensure you have ALTER TABLE permissions

## 📚 Next Steps (Optional Enhancements)

- Add PDF thumbnail previews
- Add multiple PDF support per load
- Add PDF viewer modal instead of opening in new tab
- Add PDF deletion when load is deleted
- Add PDF download functionality
- Add PDF search/indexing

## ✨ You're All Set!

The Rate Confirmation PDF feature is now ready to use. Users can upload PDFs when creating or editing loads, and the files will be stored securely in Supabase Storage.

