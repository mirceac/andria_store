import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface ProductFormProps {
  initialData?: {
    id?: number;
    name: string;
    description: string;
    price: string; // String because it comes from DB as decimal
    stock: number; // Physical stock only
    category?: string;
    image_file?: string;
    image_data?: string;
    pdf_file?: string;
    pdf_data?: string;
    storage_url?: string;
    has_physical_variant?: boolean;
    physical_price?: string;
  };
  onSubmit: (data: FormData) => Promise<void>;
}

export function ProductForm({ initialData, onSubmit }: ProductFormProps) {
  const [hasPhysicalVariant, setHasPhysicalVariant] = useState(
    initialData?.has_physical_variant || false
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Add variant checkbox state to form data
    formData.append("has_physical_variant", hasPhysicalVariant.toString());
    
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Input
          name="name"
          placeholder="Product name"
          defaultValue={initialData?.name}
          required
        />
        <Textarea
          name="description"
          placeholder="Product description"
          defaultValue={initialData?.description}
        />
        <Input
          name="category"
          placeholder="Category"
          defaultValue={initialData?.category}
        />
      </div>

      <div className="space-y-4 border rounded-lg p-4">
        <h3 className="font-semibold">Digital Product (Required)</h3>
        <p className="text-sm text-gray-600">Digital products have unlimited availability</p>
        <div className="grid grid-cols-2 gap-4">
          <Input
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="Digital Price"
            defaultValue={initialData?.price}
            required
          />
          <div className="flex items-center text-sm text-gray-500">
            <span>Stock: ∞ (Unlimited)</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 border rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has_physical_variant"
            checked={hasPhysicalVariant}
            onCheckedChange={(checked) => setHasPhysicalVariant(checked as boolean)}
          />
          <Label htmlFor="has_physical_variant">
            Also sell as physical product
          </Label>
        </div>
        
        {hasPhysicalVariant && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Input
              name="physical_price"
              type="number"
              step="0.01"
              min="0"
              placeholder="Physical Price"
              defaultValue={initialData?.physical_price}
              required={hasPhysicalVariant}
            />
            <Input
              name="stock"
              type="number"
              min="0"
              placeholder="Physical Stock"
              defaultValue={initialData?.stock}
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Media Files</h3>
        <div className="space-y-2">
          <Label>Image</Label>
          <Input
            name="image_file"
            type="file"
            accept="image/*"
          />
          {initialData?.image_file && (
            <div className="text-sm text-gray-600">
              Current image: {initialData.image_file}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label>PDF</Label>
          <Input
            name="pdf_file"
            type="file"
            accept=".pdf"
          />
          {initialData?.pdf_file && (
            <div className="text-sm text-gray-600">
              Current PDF: {initialData.pdf_file}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label>Image Data URL</Label>
          <Textarea
            name="image_data"
            placeholder="Base64 image data"
            defaultValue={initialData?.image_data}
          />
        </div>
        
        <div className="space-y-2">
          <Label>PDF Data</Label>
          <Textarea
            name="pdf_data"
            placeholder="PDF data"
            defaultValue={initialData?.pdf_data}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Storage URL</Label>
          <Input
            name="storage_url"
            placeholder="Storage URL"
            defaultValue={initialData?.storage_url}
          />
        </div>
      </div>

      <Button type="submit" className="w-full">
        {initialData ? "Update Product" : "Create Product"}
      </Button>
    </form>
  );
}
