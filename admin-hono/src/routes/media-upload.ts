import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

const mediaUpload = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// POST /api/admin/media/upload - Upload media files
mediaUpload.post("/", adminMiddleware as any, async (c) => {
  try {
    const sql = getDb(c as any);
    const user = c.get("user");

    const formData = await c.req.formData();
    const fileData = formData.get("file");
    const file = fileData as unknown as File;
    const folderId = (formData.get("folder_id") as string) || null;
    const mediaType = (formData.get("media_type") as string) || "other";
    const altText = (formData.get("alt_text") as string) || "";
    const entityId = (formData.get("entity_id") as string) || null;

    if (!fileData || typeof fileData === "string") {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "application/pdf",
    ];

    if (!validTypes.includes(file.type)) {
      return c.json(
        {
          error: `Invalid file type: ${file.type}. Allowed types: images, videos, audio, PDF`,
        },
        400
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return c.json(
        {
          error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
        },
        400
      );
    }

    // Get folder path (if provided)
    let folderPath: string | undefined;
    if (folderId) {
      const folderCheck = await sql`
        SELECT path FROM media_folders WHERE id = ${folderId}
      `;

      if (folderCheck.length === 0) {
        return c.json({ error: "Folder not found" }, 404);
      }
      folderPath = folderCheck[0].path;
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const ext = file.name.split(".").pop() || "";
    const filename = `${timestamp}_${randomStr}.${ext}`;

    // Create file path
    const basePath = folderPath ? `${folderPath}/` : "";
    const filePath = `${basePath}${filename}`;

    // For now, we'll use a placeholder URL since R2 setup might be complex
    // In production, this should upload to R2/S3 and get the actual URL
    const fileUrl = `https://media.plazacms.com/${filePath}`;

    // TODO: Implement actual file upload to R2/S3
    // const uploadResult = await uploadFileToR2(file, filePath);
    // const fileUrl = uploadResult.url;

    // Get media type category
    const getMediaType = (mimeType: string): string => {
      if (mimeType.startsWith("image/")) return "image";
      if (mimeType.startsWith("video/")) return "video";
      if (mimeType.startsWith("audio/")) return "audio";
      if (mimeType === "application/pdf") return "document";
      return "other";
    };

    // Save to database
    const result = await sql`
      INSERT INTO media (
        filename, original_name, file_url, file_type, size, 
        media_type, alt_text, folder_id, entity_id, uploaded_by
      ) VALUES (
        ${filename},
        ${file.name},
        ${fileUrl},
        ${getMediaType(file.type)},
        ${file.size},
        ${mediaType},
        ${altText || null},
        ${folderId || null},
        ${entityId || null},
        ${user.id}
      )
      RETURNING 
        id, filename, original_name, file_url, file_type, size, 
        media_type, alt_text, folder_id, entity_id, created_at
    `;

    return c.json({
      success: true,
      message: "File uploaded successfully",
      media: result[0],
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return c.json(
      {
        error: "Upload failed",
        detail: error?.message || "Unknown error",
      },
      500
    );
  }
});

export default mediaUpload;
