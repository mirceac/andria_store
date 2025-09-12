import { useEffect, useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ShoppingCart, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function CheckoutPage() {
  const { items, getTotal } = useCart();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  
  // Calculate total from current items
  const total = getTotal();

  useEffect(() => {
    // If cart is empty, redirect to cart page
    if (items.length === 0) {
      setLocation("/cart");
      return;
    }

    const createCheckoutSession = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await apiRequest("POST", "/api/create-checkout-session", {
          items: items.map(item => ({
            productId: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity
          }))
        });
        
        const data = await response.json();
        
        // Redirect to Stripe Checkout
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL returned from server");
        }
      } catch (err) {
        console.error("Checkout error:", err);
        setError(
          err instanceof Error 
            ? err.message 
            : "Failed to create checkout session. Please try again."
        );
        setIsLoading(false);
      }
    };

    createCheckoutSession();
  }, [items, setLocation, user]);

  if (error) {
    return (
      <div className="container mx-auto py-16 px-4">
        <div className="max-w-md mx-auto text-center space-y-6">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="text-2xl font-bold">Checkout Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <div className="flex flex-col gap-4 mt-8">
            <Button onClick={() => setLocation("/cart")}>
              Return to Cart
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-md mx-auto text-center space-y-6">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <h1 className="text-2xl font-bold">Preparing Checkout</h1>
        <p className="text-muted-foreground">
          Please wait while we redirect you to our secure payment processor...
        </p>
        <div className="border rounded-md p-4 bg-muted/20 mt-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm">Items in cart:</span>
            <span className="text-sm font-medium">{items.length}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total amount:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}