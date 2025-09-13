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
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { getPdfUrl } from "@/lib/pdf-worker";
import { ImageThumbnail } from "@/components/image-thumbnail";
import { useState } from "react";
import { ImageViewerDialog } from "@/components/image-viewer-dialog";
import { ExternalUrlThumbnail } from "@/components/external-url-thumbnail";
import { PDFViewerDialog } from "@/components/pdf-viewer-dialog";

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  variant_type: 'digital' | 'physical';
  product: {
    id: number;
    name: string;
    image_file?: string;
    image_data?: string;
    pdf_file?: string;
    pdf_data?: string;
    storage_url?: string;
  };
}

interface OrderWithDetails extends SelectOrder {
  user: {
    id: number;
    username: string;
  };
  items: OrderItem[];
}

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/admin/orders"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Add timestamp for cache busting
  const timestamp = Date.now();
  
  // State for image/pdf viewer dialogs
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OrderItem['product'] | null>(null);
  
  // State for tracking which orders are being updated
  const [updatingOrders, setUpdatingOrders] = useState<Record<number, boolean>>({});

  if (!user?.is_admin) {
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

  if (!orders || orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Manage Orders</h1>
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-muted-foreground">
            Orders will appear here once customers make purchases
          </p>
        </div>
      </div>
    );
  }

  const updateOrderStatus = async (orderId: number, status: string) => {
    console.log(`Updating order ${orderId} status to ${status}`);
    setUpdatingOrders(prev => ({ ...prev, [orderId]: true }));
    
    try {
      const response = await apiRequest("PATCH", `/api/admin/orders/${orderId}`, { status });
      console.log('Update response:', response);
      
      // Invalidate and refetch the orders
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      console.log('Successfully updated order status');
      
      // Optional: Add success feedback here if needed
      // toast.success(`Order status updated to ${status}`);
    } catch (error) {
      console.error("Failed to update order status:", error);
      // Revert the UI back by refetching data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      
      // Optional: Add error feedback here if needed
      // toast.error("Failed to update order status. Please try again.");
      alert("Failed to update order status. Please try again.");
    } finally {
      setUpdatingOrders(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Process orders to ensure unique entries with all items (same logic as customer orders page)
  const processedOrders = orders ? orders.reduce((acc, order) => {
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
  }, [] as OrderWithDetails[]) : [];

  // Helper function to render product media with priority (exactly like customer orders page):
  // 1. Image File > 2. Image DB > 3. PDF File > 4. PDF DB > 5. Storage URL
  const renderProductMedia = (product: OrderItem['product']) => {
    if (product.image_file) {
      // 1. Image File (highest priority)
      return (
        <div className="relative shrink-0">
          <div className="w-1 h-full bg-blue-500 absolute left-0 top-0 rounded-l"></div>
          <ImageThumbnail
            productId={product.id}
            imageUrl={`${product.image_file}?v=${timestamp}`}
            imageData={null}
            alt={product.name}
            onClick={() => {
              setSelectedImage(`${product.image_file}?v=${timestamp}`);
              setSelectedProduct(product);
              setIsImageViewerOpen(true);
            }}
          />
        </div>
      );
    } else if (product.image_data) {
      // 2. Image DB
      return (
        <div className="relative shrink-0">
          <div className="w-1 h-full bg-blue-500 absolute left-0 top-0 rounded-l"></div>
          <ImageThumbnail
            productId={product.id}
            imageUrl={null}
            imageData={product.image_data}
            alt={product.name}
            onClick={() => {
              setSelectedImage(`/api/products/${product.id}/img?v=${timestamp}`);
              setSelectedProduct(product);
              setIsImageViewerOpen(true);
            }}
          />
        </div>
      );
    } else if (product.pdf_file) {
      // 3. PDF File
      return (
        <div className="relative shrink-0">
          <div className="w-1 h-full bg-blue-500 absolute left-0 top-0 rounded-l"></div>
          <PDFThumbnail
            pdfUrl={`${product.pdf_file}?v=${timestamp}`}
            onClick={() => {
              setSelectedPdf(`${product.pdf_file}?v=${timestamp}`);
              setSelectedProduct(product);
              setIsPdfViewerOpen(true);
            }}
          />
        </div>
      );
    } else if (product.pdf_data) {
      // 4. PDF DB
      return (
        <div className="relative shrink-0">
          <div className="w-1 h-full bg-blue-500 absolute left-0 top-0 rounded-l"></div>
          <PDFThumbnail
            pdfUrl={`/api/products/${product.id}/pdf?v=${timestamp}`}
            onClick={() => {
              setSelectedPdf(`/api/products/${product.id}/pdf?v=${timestamp}`);
              setSelectedProduct(product);
              setIsPdfViewerOpen(true);
            }}
          />
        </div>
      );
    } else if (product.storage_url) {
      // 5. Storage URL (lowest priority) - matching customer orders page exactly
      const isImage = product.storage_url.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i) || 
                     (product.storage_url.includes('image') || 
                      product.storage_url.includes('img') || 
                      product.storage_url.includes('photo') ||
                      product.storage_url.includes('picture'));
      
      if (isImage) {
        // External Image URL
        return (
          <div className="relative shrink-0">
            <div className="w-1 h-full bg-blue-500 absolute left-0 top-0 rounded-l"></div>
            <ExternalUrlThumbnail
              url={product.storage_url}
              onClick={() => {
                setSelectedImage(`/api/proxy/image?url=${encodeURIComponent(product.storage_url || '')}`);
                setSelectedProduct(product);
                setIsImageViewerOpen(true);
              }}
            />
          </div>
        );
      } else {
        // Assume it's a PDF or other document
        return (
          <div className="relative shrink-0">
            <div className="w-1 h-full bg-blue-500 absolute left-0 top-0 rounded-l"></div>
            <PDFThumbnail
              pdfUrl={`${product.storage_url}?v=${timestamp}`}
              onClick={() => {
                setSelectedPdf(`${product.storage_url}?v=${timestamp}`);
                setSelectedProduct(product);
                setIsPdfViewerOpen(true);
              }}
            />
          </div>
        );
      }
    } else {
      // 6. No content available - show X icon
      return (
        <div className="w-[130px] h-[182px] flex items-center justify-center border rounded bg-slate-50 shrink-0">
          <XCircle className="h-6 w-6 text-gray-300" />
        </div>
      );
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Manage Orders</h1>

        <div className="space-y-6">
          {processedOrders.map((order) => (
            <div key={order.id} className="border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Order #{order.id}
                  </p>
                  <p className="font-medium">
                    Customer: {order.user?.username || "Unknown"}
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
                  <p className="font-semibold mb-2">
                    Total: ${order.total.toFixed(2)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                      disabled={updatingOrders[order.id]}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {updatingOrders[order.id] && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
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
                          {renderProductMedia(item.product)}
                          <div className="flex flex-col">
                            <span className="font-medium">{item.product.name}</span>
                            <span className="text-sm text-gray-500">
                              ${(item.price / item.quantity).toFixed(2)} per unit
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.variant_type === 'digital' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {item.variant_type === 'digital' ? 'Digital' : 'Physical'}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>${(item.price / item.quantity).toFixed(2)}</TableCell>
                      <TableCell>
                        ${item.price.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      </div>
      
      {/* PDF Viewer Dialog */}
      <PDFViewerDialog
        open={isPdfViewerOpen}
        onOpenChange={setIsPdfViewerOpen}
        pdfUrl={selectedPdf}
        title={selectedProduct?.name}
      />
      
      {/* Image Viewer Dialog */}
      <ImageViewerDialog
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
        url={selectedImage}
      />
    </>
  );
}