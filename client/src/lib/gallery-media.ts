import type { SelectProduct, SelectUser } from "@db/schema";
import { getPdfUrl } from "@/lib/pdf-worker";

// Hidden items never show in the gallery; private items only show to their owner (or admins for system items)
export function canViewInGallery(product: SelectProduct, user: SelectUser | null): boolean {
  if (product.hidden) return false;
  if (product.is_public !== false) return true;
  const isOwner = user && Number(product.user_id) === Number(user.id);
  return Boolean(isOwner || (user?.is_admin && product.user_id === null));
}

// "video" is reserved for the planned video support
export type GalleryMediaKind = "image" | "pdf" | "video";

export type GalleryItem = {
  product: SelectProduct;
  kind: GalleryMediaKind;
  thumbUrl: string;
  fullUrl: string;
  // Private (portfolio) items are shown without the copyright watermark
  isPrivate: boolean;
};

const looksLikePdf = (url: string) =>
  /\.pdf(\?|$)/i.test(url) || url.includes("pdf") || url.includes("document");

const looksLikeVideo = (url: string) => {
  try {
    return /\.(mp4|m4v|webm|mov|ogv|ogg)$/i.test(new URL(url, window.location.origin).pathname);
  } catch {
    return /\.(mp4|m4v|webm|mov|ogv|ogg)(\?|$)/i.test(url);
  }
};

// Same media priority used across the app: image file, image db, pdf file, pdf db, external url
export function getGalleryItem(product: SelectProduct): GalleryItem | null {
  const version = product.updated_at ? new Date(product.updated_at).getTime() : 0;
  const isPrivate = product.is_public === false;

  if (product.image_file || product.image_data) {
    const endpoint = `/api/products/${product.id}/img`;
    return {
      product,
      kind: "image",
      isPrivate,
      thumbUrl: `${endpoint}?thumbnail=1&v=${version}`,
      fullUrl: product.image_file ? `${product.image_file}?v=${version}` : `${endpoint}?v=${version}`,
    };
  }

  if (product.pdf_file || product.pdf_data) {
    const url = product.pdf_file ? `${product.pdf_file}?v=${version}` : `${getPdfUrl(product.id)}?v=${version}`;
    return { product, kind: "pdf", isPrivate, thumbUrl: url, fullUrl: url };
  }

  if (product.storage_url) {
    if (looksLikePdf(product.storage_url)) {
      return { product, kind: "pdf", isPrivate, thumbUrl: product.storage_url, fullUrl: product.storage_url };
    }
    if (looksLikeVideo(product.storage_url)) {
      return { product, kind: "video", isPrivate, thumbUrl: product.storage_url, fullUrl: product.storage_url };
    }
    const proxy = `/api/proxy/image?url=${encodeURIComponent(product.storage_url)}`;
    return { product, kind: "image", isPrivate, thumbUrl: `${proxy}&thumbnail=1`, fullUrl: proxy };
  }

  return null;
}
