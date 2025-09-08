import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface ProductFormProps {
  initialData?: {
    id?: number;
    name: string;
    description: string;
    price: number;
    stock: number;
    pdf_file: string;
    storage_url?: string;
  };
  onSubmit: (data: FormData) => Promise<void>;
}

export function ProductForm({ initialData, onSubmit }: ProductFormProps) {
  const [pdfPreview, setPdfPreview] = useState(initialData?.pdf_file || '');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        name="name"
        placeholder="Product name"
        defaultValue={initialData?.name}
      />
      <Textarea
        name="description"
        placeholder="Product description"
        defaultValue={initialData?.description}
      />
      <Input
        name="price"
        type="number"
        step="0.01"
        min="0"
        placeholder="Price"
        defaultValue={initialData?.price}
      />
      <Input
        name="stock"
        type="number"
        min="0"
        placeholder="Stock"
        defaultValue={initialData?.stock}
      />
      <Input
        name="storage_url"
        type="url"
        placeholder="External Storage URL (optional)"
        defaultValue={initialData?.storage_url}
      />
      <div className="space-y-2">
        <Input
          name="pdf_file"
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              setPdfPreview(url);
            }
          }}
        />
        {pdfPreview && (
          <div className="mt-2">
            <p>Current PDF: {pdfPreview}</p>
            <object
              data={pdfPreview}
              type="application/pdf"
              width="100%"
              height="600px"
            >
              <p>PDF preview not available</p>
            </object>
          </div>
        )}
      </div>
      <Button type="submit">
        {initialData ? "Update Product" : "Create Product"}
      </Button>
    </form>
  );
}
