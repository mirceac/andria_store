import { useQuery } from "@tanstack/react-query";
import { SelectProduct } from "@db/schema";
import ProductCard from "@/components/product-card";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { data: products, isLoading } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Featured Products</h1>
        <p className="text-muted-foreground mt-2">
          Discover our handpicked selection of premium products
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products?.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
