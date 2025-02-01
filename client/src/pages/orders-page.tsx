import { useQuery } from "@tanstack/react-query";
import { SelectOrder } from "@db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface OrderWithItems extends SelectOrder {
  items: {
    product: {
      name: string;
      imageUrl: string;
      price: number;
    };
    quantity: number;
    price: number;
  }[];
}

export default function OrdersPage() {
  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
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
      <h1 className="text-3xl font-bold mb-8">Order History</h1>

      {orders?.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-muted-foreground">
            Your order history will appear here once you make a purchase
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders?.map((order) => (
            <div key={order.id} className="border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Order #{order.id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Placed{" "}
                    {formatDistanceToNow(new Date(order.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Total: ${order.total.toFixed(2)}</p>
                  <p
                    className={`text-sm ${
                      order.status === "completed"
                        ? "text-green-600"
                        : "text-orange-600"
                    }`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <span className="font-medium">
                            {item.product.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${item.price.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
