import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Trash2, CreditCard, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, total, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-checkout-session", {
        items: items.map((item) => ({
          product: item.product,
          quantity: item.quantity,
        })),
      });
      return response.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <p className="text-muted-foreground mb-8">
          Add some products to your cart to get started
        </p>
        <Link href="/">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.product.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-4">
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div>
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Stock: {item.product.stock}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>${item.product.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      max={item.product.stock}
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(
                          item.product.id,
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div>
          <div className="bg-card p-6 rounded-lg space-y-4">
            <h3 className="text-xl font-semibold">Order Summary</h3>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            {user ? (
              <Button
                className="w-full"
                size="lg"
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Checkout
                  </>
                )}
              </Button>
            ) : (
              <Link href="/auth">
                <Button className="w-full" size="lg">
                  Login to Checkout
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}