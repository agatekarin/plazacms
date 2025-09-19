import { Hono } from "hono";
import { adminMiddleware } from "../lib/auth";
import { getDb } from "../lib/db";

const mediaUpload = new Hono<{ Bindings: Env; Variables: { user: any } }>();

function sanitizeFilename(filename: string): string {
  const extension = filename.split(".").pop() || "";
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  const cleanName = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
  return `${cleanName}.${extension}`;
}

function generateFilePath(
  originalFilename: string,
  folderPath?: string,
  mediaType: string = "other"
): string {
  const year = new Date().getFullYear();
  const cleanFilename = sanitizeFilename(originalFilename);
  if (folderPath) {
    const cleanFolderPath = folderPath
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/+?/g, "/")
      .toLowerCase()
      .replace(/[^a-z0-9\/]/g, "-")
      .replace(/-+/g, "-")
      .replace(new RegExp(`/\${year}$`), "");
    return `uploads/${cleanFolderPath}/${year}/${cleanFilename}`;
  }
  return `uploads/${mediaType}/${year}/${cleanFilename}`;
}

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

    // Validate requested media_type against allowed values
    const allowedMediaTypes = new Set([
      "product_image",
      "product_variant_image",
      "user_profile",
      "review_image",
      "site_asset",
      "other",
    ]);
    const finalMediaType = allowedMediaTypes.has(mediaType)
      ? mediaType
      : "other";

    // Build object key using the media manager's folder structure
    const filePath = generateFilePath(file.name, folderPath, finalMediaType);

    // Upload to R2 bucket binding
    if (!(c as any).env?.R2) {
      return c.json({ error: "R2 binding is not configured" }, 500);
    }
    await ((c as any).env.R2 as R2Bucket).put(filePath, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: {
        originalName: file.name,
        uploadedBy: String(user.id || ""),
        mediaType: finalMediaType,
      },
    });
    const fileUrl = `${(c as any).env.R2_PUBLIC_URL || ""}/${filePath}`;

    // Save to database
    const result = await sql`
      INSERT INTO media (
        filename, file_url, file_type, size,
        media_type, alt_text, folder_id, entity_id, uploaded_by
      ) VALUES (
        ${file.name},
        ${fileUrl},
        ${file.type},
        ${file.size},
        ${finalMediaType},
        ${altText || null},
        ${folderId || null},
        ${entityId || null},
        ${user.id}
      )
      RETURNING 
        id, filename, file_url, file_type, size,
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
