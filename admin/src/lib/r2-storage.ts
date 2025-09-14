import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// R2 Storage Configuration
const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID!,
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  bucketName: process.env.R2_BUCKET_NAME!,
  publicUrl: process.env.R2_PUBLIC_URL!,
};

// S3 Client configured for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

/**
 * Sanitize filename untuk URL-friendly format
 */
function sanitizeFilename(filename: string): string {
  const extension = filename.split('.').pop();
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  const cleanName = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50); // Limit length untuk readability
    
  return `${cleanName}.${extension}`;
}

/**
 * Generate file path berdasarkan media manager folder structure
 */
export function generateFilePath(
  originalFilename: string, 
  folderPath?: string,
  mediaType: string = "other"
): string {
  const year = new Date().getFullYear();
  const cleanFilename = sanitizeFilename(originalFilename);
  
  // Jika ada folder path dari media manager, gunakan itu
  if (folderPath) {
    // Remove leading/trailing slashes dan normalize path
    const cleanFolderPath = folderPath
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/') // Fix typo in regex: normalize multiple slashes correctly
      .toLowerCase()
      .replace(/[^a-z0-9\/]/g, '-')
      .replace(/-+/g, '-')
      .replace(/\/${year}$/, ''); // Remove year if already in path
    
    return `uploads/${cleanFolderPath}/${year}/${cleanFilename}`;
  }
  
  // Fallback ke media type organization
  return `uploads/${mediaType}/${year}/${cleanFilename}`;
}

// Upload file to R2
export async function uploadFileToR2(
  file: Buffer | Uint8Array,
  filePath: string,
  contentType: string,
  metadata?: Record<string, string>
): Promise<string> {
  try {
    const uploadParams = {
      Bucket: R2_CONFIG.bucketName,
      Key: filePath,
      Body: file,
      ContentType: contentType,
      Metadata: metadata || {},
    };

    // Use Upload for better progress tracking and multipart support
    const upload = new Upload({
      client: s3Client,
      params: uploadParams,
    });

    await upload.done();

    // Return public URL
    return `${R2_CONFIG.publicUrl}/${filePath}`;
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error(`Failed to upload file to R2: ${error}`);
  }
}

// Delete file from R2
export async function deleteFileFromR2(filePath: string): Promise<void> {
  try {
    // Extract file path from URL if full URL is provided
    const cleanPath = filePath.startsWith('http') 
      ? filePath.replace(`${R2_CONFIG.publicUrl}/`, '')
      : filePath;

    const deleteParams = {
      Bucket: R2_CONFIG.bucketName,
      Key: cleanPath,
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));
  } catch (error) {
    console.error('R2 delete error:', error);
    throw new Error(`Failed to delete file from R2: ${error}`);
  }
}

// Get file from R2 (for processing/serving)
export async function getFileFromR2(filePath: string): Promise<Buffer> {
  try {
    const getParams = {
      Bucket: R2_CONFIG.bucketName,
      Key: filePath,
    };

    const response = await s3Client.send(new GetObjectCommand(getParams));
    
    if (!response.Body) {
      throw new Error('No file body received');
    }

    // Convert stream to buffer
    const reader = response.Body.transformToByteArray();
    return Buffer.from(await reader);
  } catch (error) {
    console.error('R2 get file error:', error);
    throw new Error(`Failed to get file from R2: ${error}`);
  }
}

// Generate different image sizes for thumbnails
export async function uploadImageWithSizes(
  originalFile: Buffer,
  originalFilename: string,
  contentType: string,
  folder?: string
): Promise<{
  original: string;
  thumbnail: string;
  medium: string;
  large: string;
}> {
  const basePath = generateFilePath(originalFilename, folder);

  // For now, upload only original
  // In production, you'd use sharp or similar to resize images
  const originalUrl = await uploadFileToR2(originalFile, basePath, contentType);

  // TODO: Implement actual image resizing with sharp
  // For now, return same URL for all sizes
  return {
    original: originalUrl,
    thumbnail: originalUrl,
    medium: originalUrl,
    large: originalUrl,
  };
}

// Helper to validate R2 configuration
export function validateR2Config(): boolean {
  const requiredVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`Missing required environment variable: ${varName}`);
      return false;
    }
  }
  
  return true;
}

// Test R2 connection
export async function testR2Connection(): Promise<boolean> {
  try {
    if (!validateR2Config()) {
      return false;
    }

    // Try to upload a small test file
    const testContent = Buffer.from('test-connection', 'utf-8');
    const testPath = `test/connection-${Date.now()}.txt`;
    
    await uploadFileToR2(testContent, testPath, 'text/plain');
    await deleteFileFromR2(testPath);
    
    return true;
  } catch (error) {
    console.error('R2 connection test failed:', error);
    return false;
  }
}