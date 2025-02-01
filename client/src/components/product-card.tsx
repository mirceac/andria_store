import { Link } from "wouter";
import { SelectProduct } from "@db/schema";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart } from "lucide-react";

interface ProductCardProps {
  product: SelectProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();

  return (
    <Card className="overflow-hidden">
      <Link href={`/product/${product.id}`}>
        <div className="aspect-square overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
        </div>
      </Link>
      
      <CardContent className="p-4">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-semibold text-lg hover:text-primary">
            {product.name}
          </h3>
        </Link>
        <p className="text-xl font-bold mt-2">${product.price.toFixed(2)}</p>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => addToCart(product)}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}
