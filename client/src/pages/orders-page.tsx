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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, XCircle, Download, FileText, FileImage } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { getPdfUrl } from "@/lib/pdf-worker";
import { ImageThumbnail } from "@/components/image-thumbnail";
import { useState } from "react";
import { ImageViewerDialog } from "@/components/image-viewer-dialog";
import { ExternalUrlThumbnail } from "@/components/external-url-thumbnail";
import { PDFViewerDialog } from "@/components/pdf-viewer-dialog";
import { useToast } from "@/hooks/use-toast";

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

interface OrderWithItems extends SelectOrder {
  items: OrderItem[];
}

export default function OrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: orders, isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders", user?.id],
    enabled: !!user,
  });
  
  // Add timestamp for cache busting
  const timestamp = Date.now();
  
  // State for image/pdf viewer dialogs
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OrderItem['product'] | null>(null);

  // State for download dialog
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedProductForDownload, setSelectedProductForDownload] = useState<OrderItem['product'] | null>(null);

  // Download function for digital products
  const openDownloadDialog = (product: OrderItem['product']) => {
    setSelectedProductForDownload(product);
    setDownloadDialogOpen(true);
  };

  const downloadFromStorageType = async (product: OrderItem['product'], storageType: string) => {
    try {
      let downloadUrl = '';
      let filename = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      switch (storageType) {
        case 'image_file':
          if (!product.image_file) {
            throw new Error('Image file not available');
          }
          downloadUrl = product.image_file;
          filename += `.${product.image_file.split('.').pop() || 'jpg'}`;
          break;
          
        case 'image_data':
          if (!product.image_data) {
            throw new Error('Image data not available');
          }
          downloadUrl = `/api/products/${product.id}/download/image`;
          filename += '.jpg'; // Server will determine correct extension
          break;
          
        case 'pdf_file':
          if (!product.pdf_file) {
            throw new Error('PDF file not available');
          }
          downloadUrl = product.pdf_file;
          filename += '.pdf';
          break;
          
        case 'pdf_data':
          if (!product.pdf_data) {
            throw new Error('PDF data not available');
          }
          downloadUrl = `/api/products/${product.id}/pdf`;
          filename += '.pdf';
          break;
          
        case 'storage_url':
          if (!product.storage_url) {
            throw new Error('Storage URL not available');
          }
          downloadUrl = product.storage_url;
          const extension = product.storage_url.split('.').pop();
          if (extension && extension.length <= 5) {
            filename += `.${extension}`;
          }
          break;
          
        default:
          throw new Error('Invalid storage type');
      }

      // Handle internal API endpoints with fetch (for auth and proper headers)
      if (downloadUrl.startsWith('/api/')) {
        try {
          const response = await fetch(downloadUrl);
          if (!response.ok) {
            throw new Error(`Download failed: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up the object URL
          window.URL.revokeObjectURL(url);
        } catch (fetchError) {
          console.error('API fetch failed:', fetchError);
          throw fetchError;
        }
      } else {
        // For external URLs and direct file URLs, use direct navigation
        // This avoids CORS issues with external storage providers
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Download started",
        description: `Downloading ${product.name}...`,
      });
      
      setDownloadDialogOpen(false);
      
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "An error occurred during download",
        variant: "destructive",
      });
    }
  };

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
  
  // Log one product to see available fields
  if (processedOrders.length > 0 && processedOrders[0].items && processedOrders[0].items.length > 0) {
    console.log('Sample product data:', processedOrders[0].items[0].product);
    console.log('Product has storage_url:', !!processedOrders[0].items[0].product.storage_url);
  }

  // Helper function to render product media with priority (matching cart grid exactly):
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
      // 5. Storage URL (lowest priority) - matching cart grid exactly
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
                    <TableHead>Variant</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Download</TableHead>
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
                          {item.variant_type === 'digital' ? 'Digital' : 'Physical + Digital'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.variant_type === 'physical' ? item.quantity : 'Digital License'}
                      </TableCell>
                      <TableCell>${(item.price / item.quantity).toFixed(2)}</TableCell>
                      <TableCell>
                        ${item.price.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          onClick={() => openDownloadDialog(item.product)}
                          className="h-8 px-3 text-sm"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
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

      {/* Download Storage Selection Dialog */}
      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Download Source</DialogTitle>
            <DialogDescription>
              Select which storage type to download from for &quot;{selectedProductForDownload?.name}&quot;
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {selectedProductForDownload?.image_file && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => downloadFromStorageType(selectedProductForDownload, 'image_file')}
              >
                <FileImage className="mr-2 h-4 w-4" />
                Image File
              </Button>
            )}
            
            {selectedProductForDownload?.image_data && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => downloadFromStorageType(selectedProductForDownload, 'image_data')}
              >
                <FileImage className="mr-2 h-4 w-4" />
                Image Database (Stored in DB)
              </Button>
            )}
            
            {selectedProductForDownload?.pdf_file && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => downloadFromStorageType(selectedProductForDownload, 'pdf_file')}
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF File
              </Button>
            )}
            
            {selectedProductForDownload?.pdf_data && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => downloadFromStorageType(selectedProductForDownload, 'pdf_data')}
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF Database (Stored in DB)
              </Button>
            )}
            
            {selectedProductForDownload?.storage_url && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => downloadFromStorageType(selectedProductForDownload, 'storage_url')}
              >
                <XCircle className="mr-2 h-4 w-4" />
                External Storage URL
              </Button>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setDownloadDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}