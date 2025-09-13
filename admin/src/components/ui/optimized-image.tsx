"use client";

import React from "react";
import { MediaOptimizer } from "@/lib/media-optimizer";

interface OptimizedImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> {
  src: string;
  alt: string;

  // Optimization options
  width?: number;
  height?: number;
  quality?: number | "auto";
  format?: "auto" | "webp" | "avif" | "jpg" | "png";
  crop?: "fill" | "fit" | "scale" | "crop" | "thumb";

  // Responsive options
  responsive?: boolean;
  sizes?: string; // CSS sizes attribute

  // Preset shortcuts
  preset?:
    | "thumbnail"
    | "medium"
    | "productCard"
    | "productGallery"
    | "hero"
    | "avatar";

  // Fallback behavior
  fallbackToOriginal?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = "auto",
  format = "auto",
  crop = "fill",
  responsive = false,
  sizes,
  preset,
  fallbackToOriginal = true,
  className = "",
  ...props
}: OptimizedImageProps) {
  // Use preset if provided
  if (preset) {
    const optimizedSrc = MediaOptimizer.presets[preset](src);
    return (
      <img
        src={optimizedSrc}
        alt={alt}
        className={className}
        loading="lazy"
        {...props}
      />
    );
  }

  // Responsive images
  if (responsive && width) {
    const responsiveData = MediaOptimizer.getProductResponsive(src);
    return (
      <img
        src={responsiveData.src}
        srcSet={responsiveData.srcSet}
        sizes={
          sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        }
        alt={alt}
        className={className}
        loading="lazy"
        {...props}
      />
    );
  }

  // Single optimized image
  const optimizedSrc = MediaOptimizer.getOptimizedUrl(src, {
    width,
    height,
    quality,
    format,
    crop,
  });

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
      {...props}
    />
  );
}

// Specific preset components for common use cases
export function ProductThumbnail({
  src,
  alt,
  ...props
}: {
  src: string;
  alt: string;
  [key: string]: any;
}) {
  return <OptimizedImage src={src} alt={alt} preset="thumbnail" {...props} />;
}

export function ProductCard({
  src,
  alt,
  ...props
}: {
  src: string;
  alt: string;
  [key: string]: any;
}) {
  return <OptimizedImage src={src} alt={alt} preset="productCard" {...props} />;
}

export function ProductGallery({
  src,
  alt,
  ...props
}: {
  src: string;
  alt: string;
  [key: string]: any;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      preset="productGallery"
      responsive
      {...props}
    />
  );
}

export function UserAvatar({
  src,
  alt,
  ...props
}: {
  src: string;
  alt: string;
  [key: string]: any;
}) {
  return <OptimizedImage src={src} alt={alt} preset="avatar" {...props} />;
}

export function HeroImage({
  src,
  alt,
  ...props
}: {
  src: string;
  alt: string;
  [key: string]: any;
}) {
  return (
    <OptimizedImage src={src} alt={alt} preset="hero" responsive {...props} />
  );
}
