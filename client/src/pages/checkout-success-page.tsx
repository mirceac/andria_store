import { useEffect, useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Home, FileText, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    // Clear the cart when the success page loads
    clearCart();

    // Try to get session ID from URL to display
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    if (sessionId) {
      // Use the last 8 characters of the session ID as an "order number"
      setOrderNumber(sessionId.slice(-8));
    }
  }, [clearCart]);

  const navigateToHome = () => {
    window.location.href = "/";
  };

  const navigateToOrders = () => {
    window.location.href = "/orders";
  };

  return (
    <div className="container mx-auto py-10 max-w-3xl">
      <Card className="border-green-200 shadow-md">
        <CardHeader className="pb-4 text-center border-b bg-green-50 text-green-800">
          <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-2" />
          <CardTitle className="text-2xl">Order Confirmed!</CardTitle>
          <CardDescription className="text-green-700">
            Thank you for your purchase. Your order has been successfully placed.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {orderNumber && (
            <div className="flex justify-between text-sm bg-slate-50 p-4 rounded-md">
              <span className="font-medium">Order Reference:</span>
              <span className="font-mono">{orderNumber}</span>
            </div>
          )}
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">What happens next?</h3>
            <p className="text-sm text-muted-foreground">
              We're processing your order now. You will receive an email confirmation shortly with your order details.
            </p>
          </div>

          <Separator />
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Accessing your purchase</h3>
            <p className="text-sm text-muted-foreground">
              You can view and download your purchased products by visiting your order history page.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={navigateToHome}>
            <Home className="mr-2 h-4 w-4" />
            Return to Shop
          </Button>
          <Button className="w-full sm:w-auto" onClick={navigateToOrders}>
            <FileText className="mr-2 h-4 w-4" />
            View My Orders
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}