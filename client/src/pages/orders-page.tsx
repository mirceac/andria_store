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
import { useAuth } from "@/hooks/use-auth";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { getPdfUrl } from "@/lib/pdf-worker";

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  product: {
    id: number;
    name: string;
    image_url: string;
  };
}

interface OrderWithItems extends SelectOrder {
  items: OrderItem[];
}

export default function OrdersPage() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders", user?.id],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Orders</h1>
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-muted-foreground">
            Your order history will appear here once you make a purchase
          </p>
        </div>
      </div>
    );
  }

  console.log('Raw orders data:', orders); // Debug log

  // Process orders to ensure unique entries with all items
  const processedOrders = orders.reduce((acc, order) => {
    const existingOrder = acc.find(o => o.id === order.id);
    if (!existingOrder) {
      // Add a new order with its items
      acc.push({
        ...order,
        items: Array.isArray(order.items) ? order.items : []
      });
    } else {
      // If the order exists and has items, merge them
      if (Array.isArray(order.items)) {
        existingOrder.items = [
          ...existingOrder.items,
          ...order.items
        ];
      }
    }
    return acc;
  }, [] as OrderWithItems[]);

  console.log('Processed orders:', processedOrders); // Debug log

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>
      <div className="space-y-6">
        {processedOrders.map((order) => (
          <div key={order.id} className="border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Order #{order.id}
                </p>
                <p className="text-sm text-muted-foreground">
                  Placed{" "}
                  {order.created_at
                    ? formatDistanceToNow(new Date(order.created_at), {
                        addSuffix: true,
                      })
                    : "Unknown date"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  Total: ${order.total.toFixed(2)}
                </p>
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
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items && order.items.map((item) => (
                  <TableRow key={`${order.id}-${item.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <PDFThumbnail
                          pdfUrl={getPdfUrl(item.product.id)}
                          width={60}    // Smaller thumbnail for the table
                          height={84}   // Maintaining 1.4 aspect ratio
                          className="shrink-0"
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{item.product.name}</span>
                          <span className="text-sm text-gray-500">
                            ${(item.price / item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>${item.price.toFixed(2)}</TableCell>
                    <TableCell>
                      ${(item.price * item.quantity).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
    </div>
  );
}