export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  pdf_file: string;
  created_at: Date;
  updated_at: Date;
}
