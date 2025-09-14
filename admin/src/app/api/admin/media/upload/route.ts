// DISABLED: This API route is replaced by Hono backend
// Use https://admin-hono.agatekarin.workers.dev instead

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function POST() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function PUT() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function PATCH() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

export async function DELETE() {
  return NextResponse.json({ 
    error: "This API route has been migrated to Hono backend. Use https://admin-hono.agatekarin.workers.dev instead" 
  }, { status: 410 }); // 410 Gone
}

/*
ORIGINAL CODE COMMENTED OUT:
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { uploadFileToR2, generateFilePath, validateR2Config } from "@/lib/r2-storage";

// POST /api/admin/media/upload - Upload media files
export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Debug session
    console.log('Upload session:', {
      user: session.user,
      userId: session.user?.id,
      role: (session.user as any)?.role
    });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folder_id') as string || null;
    const mediaType = formData.get('media_type') as string || 'other';
    const altText = formData.get('alt_text') as string || '';
    const entityId = formData.get('entity_id') as string || null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf'
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: `Invalid file type: ${file.type}. Allowed types: images, videos, audio, PDF` 
      }, { status: 400 });
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB` 
      }, { status: 400 });
    }

    // Get folder path (if provided)
    let folderPath: string | undefined;
    if (folderId) {
      const folderCheck = await pool.query(
        "SELECT id, path FROM media_folders WHERE id = $1",
        [folderId]
      );
      
      if (folderCheck.rows.length === 0) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
      
      folderPath = folderCheck.rows[0].path;
    }

    // Validate R2 configuration
    if (!validateR2Config()) {
      return NextResponse.json({ 
        error: "R2 storage is not properly configured" 
      }, { status: 500 });
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Generate file path berdasarkan folder path dari media manager
    const filePath = generateFilePath(file.name, folderPath, mediaType);
    
    // Upload to R2
    const fileUrl = await uploadFileToR2(
      fileBuffer, 
      filePath, 
      file.type,
      {
        originalName: file.name,
        uploadedBy: session.user.id as string,
        mediaType: mediaType
      }
    );

    // Save media record to database
    const insertParams = [
      file.name,
      fileUrl, // R2 cloud storage URL
      file.type,
      file.size,
      altText || null,
      mediaType,
      folderId || null,
      session.user.id,
      entityId || null
    ];

    console.log('Insert params:', insertParams);
    console.log('User ID being inserted:', session.user.id);

    const result = await pool.query(
      `INSERT INTO media (
        filename, file_url, file_type, size, alt_text, 
        media_type, folder_id, uploaded_by, entity_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *`,
      insertParams
    );

    // Get media with user name and folder info
    const mediaWithDetails = await pool.query(
      `SELECT 
        m.*, 
        f.name as folder_name, 
        f.path as folder_path,
        u.name as uploaded_by_name
      FROM media m
      LEFT JOIN media_folders f ON f.id = m.folder_id
      LEFT JOIN users u ON u.id = m.uploaded_by
      WHERE m.id = $1`,
      [result.rows[0].id]
    );

    const media = mediaWithDetails.rows[0];

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      media: {
        id: media.id,
        filename: media.filename,
        file_url: media.file_url,
        file_type: media.file_type,
        size: media.size,
        alt_text: media.alt_text,
        media_type: media.media_type,
        folder_id: media.folder_id,
        folder_name: media.folder_name,
        folder_path: media.folder_path,
        uploaded_by: media.uploaded_by,
        uploaded_by_name: media.uploaded_by_name,
        entity_id: media.entity_id,
        created_at: media.created_at,
        updated_at: media.updated_at
      }
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ 
      error: "Failed to upload file: " + (error.message || "Unknown error")
    }, { status: 500 });
  }
}
*/
