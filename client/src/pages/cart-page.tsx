import { useState, useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { SelectProduct } from "@db/schema";
import { 
  ShoppingBag, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowLeft, 
  XCircle,
  ShoppingCart 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { ImageThumbnail } from "@/components/image-thumbnail";
import { PDFViewerDialog } from "@/components/pdf-viewer-dialog";
import { ImageViewerDialog } from "@/components/image-viewer-dialog";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

export default function CartPage() {
  const { items: cart, removeFromCart, updateQuantity, clearCart } = useCart();
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  const [, setLocation] = useLocation();

  // Add timestamp refresh to prevent stale cache
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTimestamp(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const navigateToHome = () => {
    // Instead of using window.location.href which causes a full page reload
    // Use a more controlled navigation approach that preserves state
    // Check if history API is available
    if (typeof window !== 'undefined' && window.history) {
      // This will add a new entry to the history stack without full reload
      window.history.pushState({}, '', '/');
      
      // Dispatch a popstate event to notify the app about the navigation
      window.dispatchEvent(new Event('popstate'));
    } else {
      // Fallback to traditional navigation if needed
      window.location.href = '/';
    }
  };

  const navigateToCheckout = () => {
    setLocation("/checkout");  // Use wouter's setLocation instead of direct window.location
  };

  // Helper function for rendering product media based on priority
  const renderProductMedia = (product: SelectProduct) => {
    if (product.image_file) {
      // 1. Image File (highest priority)
      return (
        <div className="relative">
          <div className="w-1 h-full bg-blue-500 absolute left-0 top-0 rounded-l"></div>
          <ImageThumbnail
            productId={product.id}
            imageUrl={`${product.image_file}?v=${refreshTimestamp}`}
            imageData={null}
            alt={product.name}
            onClick={() => {
              setSelectedImage(`${product.image_file}?v=${refreshTimestamp}`);
              setIsImageViewerOpen(true);
            }}
          />
        </div>
      );
    } else if (product.image_data) {
      // 2. Image DB
      return (
        <div className="relative">
          <div className="w-1 h-full bg-blue-500 absolute left-0 top-0 rounded-l"></div>
          <ImageThumbnail
            productId={product.id}
            imageUrl={null}
            imageData={product.image_data}
            alt={product.name}
            onClick={() => {
              setSelectedImage(`/api/products/${product.id}/img?v=${refreshTimestamp}`);
              setIsImageViewerOpen(true);
            }}
          />
        </div>
      );
    } else if (product.pdf_file) {
      // 3. PDF File
      return (
        <div className="relative">
          <div className="w-1 h-full bg-blue-500 absolute left-0 top-0 rounded-l"></div>
          <PDFThumbnail
            pdfUrl={`${product.pdf_file}?v=${refreshTimestamp}`}
            onClick={() => {
              setSelectedPdf(`${product.pdf_file}?v=${refreshTimestamp}`);
              setIsPdfViewerOpen(true);
            }}
          />
        </div>
      );
    } else if (product.pdf_data) {
      // 4. PDF DB
      return (
        <div className="relative">
          <div className="w-1 h-full bg-blue-500 absolute left-0 top-0 rounded-l"></div>
          <PDFThumbnail
            pdfUrl={`/api/products/${product.id}/pdf?v=${refreshTimestamp}`}
            onClick={() => {
              setSelectedPdf(`/api/products/${product.id}/pdf?v=${refreshTimestamp}`);
              setIsPdfViewerOpen(true);
            }}
          />
        </div>
      );
    } else if (product.storage_url) {
      // 5. Storage URL (lowest priority)
      const isImage = product.storage_url.match(/\.(jpeg|jpg|gif|png)$/i);
      if (isImage) {
        return (
          <div className="relative">
            <div className="w-1 h-full bg-blue-500 absolute left-0 top-0 rounded-l"></div>
            <ImageThumbnail
              productId={product.id}
              imageUrl={`${product.storage_url}?v=${refreshTimestamp}`}
              imageData={null}
              alt={product.name}
              onClick={() => {
                setSelectedImage(`${product.storage_url}?v=${refreshTimestamp}`);
                setIsImageViewerOpen(true);
              }}
            />
          </div>
        );
      } else {
        // Assume it's a PDF or other document
        return (
          <div className="relative">
            <div className="w-1 h-full bg-blue-500 absolute left-0 top-0 rounded-l"></div>
            <PDFThumbnail
              pdfUrl={`${product.storage_url}?v=${refreshTimestamp}`}
              onClick={() => {
                setSelectedPdf(`${product.storage_url}?v=${refreshTimestamp}`);
                setIsPdfViewerOpen(true);
              }}
            />
          </div>
        );
      }
    } else {
      // 6. No content available - show X icon
      return (
        <div className="flex items-center justify-center h-full">
          <XCircle className="h-6 w-6 text-gray-300" />
        </div>
      );
    }
  };

  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shopping Cart</h1>
        <Button variant="outline" onClick={navigateToHome}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Continue Shopping
        </Button>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-12 border rounded-md bg-white">
          <ShoppingBag className="h-12 w-12 mx-auto text-gray-300" />
          <h2 className="mt-4 text-xl font-semibold">Your cart is empty</h2>
          <p className="mt-2 text-muted-foreground">
            Looks like you haven't added anything to your cart yet.
          </p>
          <Button className="mt-6" onClick={navigateToHome}>
            Browse Products
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-full flex justify-between items-center mb-3">
            <div>
              <h3 className="text-lg font-semibold">Cart Items</h3>
              <p className="text-sm text-muted-foreground">
                Review your items before checkout
              </p>
            </div>
            <Button
              variant="outline"
              onClick={clearCart}
              className="mr-3 py-1 px-3 text-sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Cart
            </Button>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-center w-[35px]">Item</TableHead>
                  <TableHead className="px-0 text-center w-[120px]">Product Image</TableHead>
                  <TableHead className="px-3">Details</TableHead>
                  <TableHead className="w-[150px] text-center">Quantity</TableHead>
                  <TableHead className="w-[120px] text-center">Price</TableHead>
                  <TableHead className="w-[60px] text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item, index) => (
                  <TableRow key={item.product.id}>
                    <TableCell className="text-center align-middle font-medium">
                      {index + 1}
                    </TableCell>
                    
                    {/* Product Media (using priority logic) */}
                    <TableCell className="px-0 text-center align-middle">
                      {renderProductMedia(item.product)}
                    </TableCell>
                    
                    {/* Product Details */}
                    <TableCell className="align-middle">
                      <div className="space-y-1">
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                          {item.product.description}
                        </p>
                        <Badge 
                          variant={item.product.stock > 0 ? "outline" : "destructive"} 
                          className={cn(
                            "text-xs mt-1",
                            item.product.stock > 0 
                              ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" 
                              : "bg-red-50 text-red-700 hover:bg-red-100"
                          )}
                        >
                          {item.product.stock > 0 ? `In Stock: ${item.product.stock}` : "Out of Stock"}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    {/* Quantity */}
                    <TableCell className="align-middle">
                      <div className="flex items-center justify-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                className="h-7 w-7 p-0"
                                onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Decrease quantity</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <Input
                          type="number"
                          min="1"
                          max={item.product.stock}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val > 0 && val <= item.product.stock) {
                              updateQuantity(item.product.id, val);
                            }
                          }}
                          className="h-7 w-12 mx-2 text-center px-1"
                        />
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                className="h-7 w-7 p-0"
                                onClick={() => updateQuantity(item.product.id, Math.min(item.product.stock, item.quantity + 1))}
                                disabled={item.quantity >= item.product.stock}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Increase quantity</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {item.quantity >= item.product.stock && (
                        <p className="text-xs text-center text-amber-600 mt-1">
                          Max stock reached
                        </p>
                      )}
                    </TableCell>
                    
                    {/* Price */}
                    <TableCell className="text-center align-middle">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">${item.product.price.toFixed(2)} each</p>
                        <p className="text-sm font-bold">
                          ${(item.product.price * item.quantity).toFixed(2)} total
                        </p>
                      </div>
                    </TableCell>
                    
                    {/* Actions */}
                    <TableCell className="text-right align-middle pr-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 bg-red-50 text-red-500 hover:text-red-600 hover:bg-red-100 rounded-full"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Remove from cart</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Cart Summary Section */}
            <div className="border-t p-4 bg-gray-50">
              <div className="max-w-md ml-auto">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Subtotal:</span>
                  <span className="text-sm font-medium">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Shipping:</span>
                  <span className="text-sm font-medium">Free</span>
                </div>
                <div className="flex justify-between border-t pt-4">
                  <span className="text-base font-semibold">Total:</span>
                  <span className="text-lg font-bold">${total.toFixed(2)}</span>
                </div>
                <Button 
                  className="w-full mt-4 py-2 text-base"
                  onClick={navigateToCheckout}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Dialog */}
      <PDFViewerDialog
        open={isPdfViewerOpen}
        onOpenChange={setIsPdfViewerOpen}
        pdfUrl={selectedPdf}
      />

      {/* Image Viewer Dialog */}
      <ImageViewerDialog
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
        url={selectedImage}
      />
    </div>
  );
}