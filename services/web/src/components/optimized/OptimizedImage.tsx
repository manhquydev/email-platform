import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LazyImage, useIntersectionObserver } from '../../utils/lazy-loading';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  loading?: 'lazy' | 'eager';
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png' | 'auto';
  placeholder?: 'blur' | 'empty' | string;
  blurDataURL?: string;
  sizes?: string;
  srcSet?: string;
  onLoad?: () => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  style?: React.CSSProperties;
}

/**
 * Optimized image component with:
 * - Lazy loading
 * - Progressive enhancement
 * - WebP/AVIF support
 * - Blur placeholder
 * - Intersection Observer
 */
export function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  quality = 75,
  format = 'auto',
  placeholder = 'blur',
  blurDataURL,
  sizes,
  srcSet,
  onLoad,
  onError,
  style = {}
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [isInView, setIsInView] = useState(loading === 'eager');

  // Intersection Observer for lazy loading
  const observerRef = useRef<HTMLDivElement>(null);
  const { isIntersecting } = useIntersectionObserver(observerRef, {
    threshold: 0.01,
    rootMargin: '50px'
  });

  // Generate optimized image URLs
  const generateOptimizedSrc = useCallback((originalSrc: string, fmt: string, q: number) => {
    // If it's already an optimized URL or external, return as-is
    if (originalSrc.includes('?') || originalSrc.startsWith('http')) {
      return originalSrc;
    }

    // Add optimization parameters
    const params = new URLSearchParams();
    params.set('q', q.toString());
    params.set('f', fmt);

    return `${originalSrc}?${params.toString()}`;
  }, []);

  // Generate srcSet for responsive images
  const generateSrcSet = useCallback(() => {
    if (srcSet) return srcSet;

    const widths = [320, 640, 768, 1024, 1280, 1536];
    return widths
      .map(w => `${generateOptimizedSrc(src, format, quality)} ${w}w`)
      .join(', ');
  }, [src, format, quality, generateOptimizedSrc, srcSet]);

  // Detect supported formats
  const getSupportedFormat = useCallback(() => {
    if (format !== 'auto') return format;

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Check AVIF support
      const avifData = canvas.toDataURL('image/avif');
      if (avifData.indexOf('data:image/avif') === 0) return 'avif';

      // Check WebP support
      const webpData = canvas.toDataURL('image/webp');
      if (webpData.indexOf('data:image/webp') === 0) return 'webp';
    }

    return 'jpg';
  }, [format]);

  // Generate blur placeholder
  const generateBlurPlaceholder = useCallback(() => {
    if (placeholder === 'empty') return '';
    if (blurDataURL) return blurDataURL;
    if (placeholder === 'blur') {
      // Generate a simple blurred placeholder
      return `data:image/svg+xml,%3Csvg width='${width || 400}' height='${height || 300}' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='b'%3E%3CfeGaussianBlur stdDeviation='20'/%3E%3C/filter%3E%3Cimage href='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' filter='url(%23b)' width='100%25' height='100%25'/%3E%3C/svg%3E`;
    }
    return '';
  }, [placeholder, blurDataURL, width, height]);

  // Load image
  useEffect(() => {
    if (loading === 'eager' || (isIntersecting && !isInView)) {
      setIsInView(true);
      const supportedFormat = getSupportedFormat();
      const optimizedSrc = generateOptimizedSrc(src, supportedFormat, quality);
      setCurrentSrc(optimizedSrc);
    }
  }, [loading, isIntersecting, isInView, src, getSupportedFormat, generateOptimizedSrc, quality]);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    onError?.(e);
  }, [onError]);

  // Retry on error
  const retry = useCallback(() => {
    setHasError(false);
    setIsLoaded(false);
    const img = imgRef.current;
    if (img) {
      img.src = currentSrc;
    }
  }, [currentSrc]);

  // Error state
  if (hasError) {
    return (
      <div
        className={`optimized-image-error ${className}`}
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          ...style
        }}
        onClick={retry}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && retry()}
      >
        <div className="text-center p-4">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">Failed to load image</p>
          <button className="text-xs text-blue-500 hover:underline mt-1">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={observerRef} className={`optimized-image-container ${className}`} style={style}>
      {/* Placeholder */}
      {placeholder && !isLoaded && (
        <div
          className="optimized-image-placeholder absolute inset-0"
          style={{
            backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(10px)',
            transform: 'scale(1.1)',
            transition: 'opacity 0.3s ease-out',
            opacity: isLoaded ? 0 : 1
          }}
        />
      )}

      {/* Main image */}
      {isInView ? (
        <img
          ref={imgRef}
          src={currentSrc}
          srcSet={generateSrcSet()}
          sizes={sizes || `${width || '100vw'}`}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`optimized-image ${className}`}
          style={{
            width,
            height,
            objectFit: 'cover',
            transition: 'opacity 0.3s ease-out',
            opacity: isLoaded ? 1 : 0,
            ...style
          }}
        />
      ) : (
        // Spacer for lazy loading
        <div
          className="optimized-image-spacer"
          style={{
            width,
            height,
            backgroundColor: '#f3f4f6'
          }}
        />
      )}

      {/* Loading indicator */}
      {!isLoaded && isInView && !hasError && (
        <div className="optimized-image-loading absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Picture component for multiple formats
 */
export function ResponsivePicture({
  src,
  alt,
  className = '',
  width,
  height,
  quality = 75,
  onLoad,
  onError,
  ...props
}: Omit<OptimizedImageProps, 'format' | 'srcSet'>) {
  const [currentSrc, setCurrentSrc] = useState('');

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    <picture className={className}>
      {/* AVIF format */}
      <source
        srcSet={`${src}?format=avif&quality=${quality}`}
        type="image/avif"
      />
      {/* WebP format */}
      <source
        srcSet={`${src}?format=webp&quality=${quality}`}
        type="image/webp"
      />
      {/* Fallback */}
      <OptimizedImage
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        format="jpg"
        onLoad={onLoad}
        onError={onError}
        {...props}
      />
    </picture>
  );
}

/**
 * Avatar component with lazy loading and fallbacks
 */
export function Avatar({
  src,
  alt,
  size = 40,
  fallback,
  className = '',
  ...props
}: {
  src?: string;
  alt: string;
  size?: number;
  fallback?: string;
  className?: string;
} & Omit<OptimizedImageProps, 'width' | 'height'>) {
  const [hasError, setHasError] = useState(false);
  const avatarSrc = !src || hasError ? fallback : src;

  return (
    <div
      className={`avatar ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        backgroundColor: '#e5e7eb',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {avatarSrc ? (
        <OptimizedImage
          src={avatarSrc}
          alt={alt}
          width={size}
          height={size}
          onError={() => setHasError(true)}
          style={{
            width: size,
            height: size,
            borderRadius: '50%'
          }}
          {...props}
        />
      ) : (
        <div
          className="avatar-fallback"
          style={{
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.4,
            color: '#6b7280',
            fontWeight: 500
          }}
        >
          {alt.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}