import { useQuery } from "@tanstack/react-query";
import { SelectProduct } from "@db/schema";
import { Loader2, Search, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { PDFViewerDialog, PDFViewer } from "@/components/pdf-viewer-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPdfUrl } from "@/lib/pdf-worker"; // Add this import

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"price_asc" | "price_desc" | "name">("name");
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SelectProduct | null>(null);

  const { data: products, isLoading } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products"],
  });

  const { addToCart } = useCart();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredProducts = products
    ?.filter((product) =>
      product.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sort) {
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      {/* Search and sort controls */}
      <div className="flex items-center justify-between mb-8">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(value: typeof sort) => setSort(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="price_asc">Price (Low to High)</SelectItem>
            <SelectItem value="price_desc">Price (High to Low)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1"> {/* Reduced gap-2 to gap-1 */}
        {filteredProducts?.map((product) => (
          <div key={product.id} className="flex flex-col border rounded-lg bg-white max-w-[310px] mx-auto w-full"> {/* Increased from 180px to 310px */}
            <div 
              className="w-full p-0.5 flex items-center justify-center bg-gray-50"
              onClick={() => {
                setSelectedPdf(getPdfUrl(product.id));
                setSelectedProduct(product);
                setIsPdfViewerOpen(true);
              }}
            >
              <PDFThumbnail
                pdfUrl={getPdfUrl(product.id)}
                width={220}    // Maintained original size
                height={308}   // Maintained original size
                onClick={() => {
                  setSelectedPdf(getPdfUrl(product.id));
                  setSelectedProduct(product);
                  setIsPdfViewerOpen(true);
                }}
              />
            </div>
            
            <div className="p-3 flex flex-col gap-2">
              <div className="flex justify-between items-start gap-2">
                <h3 
                  className="font-medium text-base hover:text-primary cursor-pointer"
                  onClick={() => {
                    setSelectedPdf(getPdfUrl(product.id));
                    setSelectedProduct(product);
                    setIsPdfViewerOpen(true);
                  }}
                >
                  {product.name}
                </h3>
                <Badge 
                  variant={product.stock > 0 ? "secondary" : "destructive"} 
                  className="text-xs shrink-0"
                >
                  {product.stock > 0 ? `${product.stock} left` : "Out of stock"}
                </Badge>
              </div>

              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-auto pt-2">
                <p className="font-semibold">${Number(product.price).toFixed(2)}</p>
                <Button
                  size="sm"
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0}
                >
                  Add to Cart
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PDF Viewer Dialog */}
      <PDFViewerDialog
        open={isPdfViewerOpen}
        onOpenChange={setIsPdfViewerOpen}
        pdfUrl={selectedPdf}
        title={selectedProduct?.name}
      />
    </div>
  );
}