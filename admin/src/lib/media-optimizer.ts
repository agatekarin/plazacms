/**
 * Media Optimizer - Cloudinary Integration dengan R2 Fallback
 *
 * Menggunakan Cloudinary fetch untuk optimize images dari R2 storage
 * Fallback ke original R2 URL jika Cloudinary tidak available
 */

interface OptimizationOptions {
  width?: number;
  height?: number;
  quality?: number | "auto";
  format?: "auto" | "webp" | "avif" | "jpg" | "png";
  crop?: "fill" | "fit" | "scale" | "crop" | "thumb";
  gravity?: "center" | "face" | "faces" | "north" | "south" | "east" | "west";
  blur?: number;
  sharpen?: number;
}

interface ResponsiveOptions {
  sizes: Array<{
    width: number;
    height?: number;
    descriptor?: string; // '1x', '2x', or width like '800w'
  }>;
  quality?: number;
  format?: "auto" | "webp" | "avif";
}

export class MediaOptimizer {
  private static cloudinaryEnabled =
    !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  private static cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  /**
   * Get optimized URL untuk single image
   */
  static getOptimizedUrl(
    originalUrl: string,
    options: OptimizationOptions = {}
  ): string {
    // Fallback ke original URL jika Cloudinary tidak configured
    if (!this.cloudinaryEnabled || !this.cloudName) {
      return originalUrl;
    }

    const {
      width,
      height,
      quality = "auto",
      format = "auto",
      crop = "fill",
      gravity = "center",
      blur,
      sharpen,
    } = options;

    // Build transformation string
    const transforms: string[] = [];

    // Format dan quality (always include for optimization)
    transforms.push(`f_${format}`, `q_${quality}`);

    // Dimensions dan cropping
    if (width || height) {
      if (width) transforms.push(`w_${width}`);
      if (height) transforms.push(`h_${height}`);
      transforms.push(`c_${crop}`);

      if (crop === "fill" || crop === "crop") {
        transforms.push(`g_${gravity}`);
      }
    }

    // Effects
    if (blur) transforms.push(`e_blur:${blur}`);
    if (sharpen) transforms.push(`e_sharpen:${sharpen}`);

    const transformString = transforms.join(",");

    // Cloudinary fetch URL
    const cloudinaryUrl = `https://res.cloudinary.com/${
      this.cloudName
    }/image/fetch/${transformString}/${encodeURIComponent(originalUrl)}`;

    return cloudinaryUrl;
  }

  /**
   * Generate responsive image srcset
   */
  static getResponsiveSrcSet(
    originalUrl: string,
    options: ResponsiveOptions
  ): {
    src: string;
    srcSet: string;
    sizes?: string;
  } {
    if (!this.cloudinaryEnabled) {
      return {
        src: originalUrl,
        srcSet: originalUrl,
      };
    }

    const { sizes, quality = "auto", format = "auto" } = options;

    // Generate srcset entries
    const srcSetEntries = sizes.map((size) => {
      const optimizedUrl = this.getOptimizedUrl(originalUrl, {
        width: size.width,
        height: size.height,
        quality,
        format,
        crop: "fill",
      });

      const descriptor = size.descriptor || `${size.width}w`;
      return `${optimizedUrl} ${descriptor}`;
    });

    // Default src (largest size)
    const defaultSize = sizes[sizes.length - 1];
    const defaultSrc = this.getOptimizedUrl(originalUrl, {
      width: defaultSize.width,
      height: defaultSize.height,
      quality,
      format,
    });

    return {
      src: defaultSrc,
      srcSet: srcSetEntries.join(", "),
    };
  }

  /**
   * Common presets untuk different use cases
   */
  static presets = {
    thumbnail: (url: string) =>
      this.getOptimizedUrl(url, {
        width: 150,
        height: 150,
        crop: "fill",
        quality: 80,
        format: "auto",
      }),

    medium: (url: string) =>
      this.getOptimizedUrl(url, {
        width: 300,
        height: 300,
        crop: "fill",
        quality: 80,
        format: "auto",
      }),

    productCard: (url: string) =>
      this.getOptimizedUrl(url, {
        width: 400,
        height: 400,
        crop: "fill",
        quality: 85,
        format: "auto",
      }),

    productGallery: (url: string) =>
      this.getOptimizedUrl(url, {
        width: 800,
        height: 600,
        crop: "fit",
        quality: 90,
        format: "auto",
      }),

    hero: (url: string) =>
      this.getOptimizedUrl(url, {
        width: 1200,
        height: 600,
        crop: "fill",
        gravity: "center",
        quality: 85,
        format: "auto",
      }),

    avatar: (url: string) =>
      this.getOptimizedUrl(url, {
        width: 100,
        height: 100,
        crop: "fill",
        gravity: "face",
        quality: 80,
        format: "auto",
      }),
  };

  /**
   * Get responsive images untuk product gallery
   */
  static getProductResponsive(url: string) {
    return this.getResponsiveSrcSet(url, {
      sizes: [
        { width: 400, descriptor: "400w" },
        { width: 800, descriptor: "800w" },
        { width: 1200, descriptor: "1200w" },
      ],
      quality: 85,
      format: "auto",
    });
  }

  /**
   * Check if Cloudinary is available
   */
  static isEnabled(): boolean {
    return this.cloudinaryEnabled;
  }

  /**
   * Get optimization info for debugging
   */
  static getOptimizationInfo(
    originalUrl: string,
    options: OptimizationOptions = {}
  ) {
    return {
      original: originalUrl,
      optimized: this.getOptimizedUrl(originalUrl, options),
      cloudinaryEnabled: this.cloudinaryEnabled,
      cloudName: this.cloudName,
      options,
    };
  }
}

// Export untuk easy access
export const { presets } = MediaOptimizer;
