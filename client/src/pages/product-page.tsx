import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { SelectProduct } from "@db/schema";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { Loader2, ShoppingCart } from "lucide-react";

export default function ProductPage() {
  const [, params] = useRoute("/product/:id");
  const { addToCart } = useCart();

  const { data: product, isLoading } = useQuery<SelectProduct>({
    queryKey: [`/api/products/${params?.id}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">


        <div className="space-y-6">
          <h1 className="text-4xl font-bold">{product.name}</h1>
          <p className="text-3xl font-semibold">${product.price.toFixed(2)}</p>
          <p className="text-muted-foreground">{product.description}</p>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Stock: {product.stock} units
            </p>
            <Button
              className="btn-primary"
              onClick={() => addToCart(product)}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
