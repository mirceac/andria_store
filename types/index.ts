export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  pdf_file?: string;
  pdf_data?: string;
  image_file?: string;  // Changed from image_url
  image_data?: string;
  storage_url?: string; // External storage URL
  hidden: boolean;
  created_at: Date;
  updated_at: Date;
}
