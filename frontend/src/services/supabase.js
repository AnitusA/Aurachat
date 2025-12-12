import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nqqevivasvdcjffpvylr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcWV2aXZhc3ZkY2pmZnB2eWxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTgwMTYsImV4cCI6MjA4MDI3NDAxNn0.akgskB2-_Lx9V3LA_JLug_-T8kn4eAXyuWOv3fFxozA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload file to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} folder - The folder path (e.g., 'messages/images' or 'messages/audio')
 * @returns {Promise<{url: string, path: string}>}
 */
export const uploadToSupabase = async (file, folder = 'messages') => {
  try {
    console.log('=== UPLOAD TO SUPABASE STARTED ===');
    console.log('File:', file.name, 'Type:', file.type, 'Size:', file.size);
    console.log('Target folder:', folder);

    // Check if file is valid
    if (!file) {
      throw new Error('No file provided');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    console.log('Generated file path:', filePath);
    console.log('Target bucket: Storage');
    console.log('Starting upload...');

    const { data, error } = await supabase.storage
      .from('Storage')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) {
      console.error('Supabase upload error:', error);
      console.error('Error code:', error.statusCode);
      console.error('Error message:', error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }

    console.log('Upload successful! Data:', data);
    console.log('Getting public URL...');

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('Storage')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log('Public URL:', publicUrl);
    console.log('=== UPLOAD TO SUPABASE COMPLETED ===');

    return {
      url: publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('=== UPLOAD TO SUPABASE FAILED ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
};

/**
 * Delete file from Supabase Storage
 * @param {string} filePath - The path of the file to delete
 * @returns {Promise<void>}
 */
export const deleteFromSupabase = async (filePath) => {
  try {
    const { error } = await supabase.storage
      .from('Storage')
      .remove([filePath]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting from Supabase:', error);
    throw error;
  }
};
