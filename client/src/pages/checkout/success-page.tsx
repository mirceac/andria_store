import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { CheckCircle } from "lucide-react";

export default function CheckoutSuccessPage() {
  const [, setLocation] = useLocation();
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="max-w-md mx-auto">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-muted-foreground mb-8">
          Thank you for your purchase. Your order has been processed successfully.
        </p>
        <Button onClick={() => setLocation("/")}>Continue Shopping</Button>
      </div>
    </div>
  );
}
