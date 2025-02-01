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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface OrderWithDetails extends SelectOrder {
  user: {
    username: string;
  };
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

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/admin/orders"],
  });

  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold">Unauthorized Access</h1>
        <p className="text-muted-foreground mt-2">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const updateOrderStatus = async (orderId: number, status: string) => {
    await apiRequest("PATCH", `/api/admin/orders/${orderId}`, { status });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Manage Orders</h1>

      <div className="space-y-6">
        {orders?.map((order) => (
          <div key={order.id} className="border rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Order #{order.id}</p>
                <p className="font-medium">Customer: {order.user.username}</p>
                <p className="text-sm text-muted-foreground">
                  Placed{" "}
                  {formatDistanceToNow(new Date(order.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold mb-2">
                  Total: ${order.total.toFixed(2)}
                </p>
                <Select
                  defaultValue={order.status}
                  onValueChange={(value) => updateOrderStatus(order.id, value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
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
                        <span className="font-medium">{item.product.name}</span>
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
    </div>
  );
}
