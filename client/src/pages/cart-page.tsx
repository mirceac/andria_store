import { useState, useEffect } from "react";
import { useCart } from "@/hooks/use-cart";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { cn } from "@/lib/utils";
import { ExternalUrlThumbnail } from "@/components/external-url-thumbnail";
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
  const isMobile = useIsMobile();
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  const [, setLocation] = useLocation();

  // Removed automatic refresh - timestamp is set once and only updated when needed

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
        <div className="relative pointer-events-none select-none">
          <div className="w-1 h-full bg-blue-500 absolute left-0 top-0 rounded-l"></div>
          <ImageThumbnail
            productId={product.id}
            imageUrl={`${product.image_file}?v=${refreshTimestamp}`}
            imageData={null}
            alt={product.name}
            showTryDirect={false}
          />
        </div>
      );
    } else if (product.image_data) {
      // 2. Image DB
      return (
        <div className="relative pointer-events-none select-none">
          <div className="w-1 h-full bg-green-500 absolute left-0 top-0 rounded-l"></div>
          <ImageThumbnail
            productId={product.id}
            imageUrl={null}
            imageData={product.image_data}
            alt={product.name}
            showTryDirect={false}
          />
        </div>
      );
    } else if (product.pdf_file) {
      // 3. PDF File
      return (
        <div className="relative pointer-events-none select-none">
          <div className="w-1 h-full bg-red-500 absolute left-0 top-0 rounded-l"></div>
          <PDFThumbnail
            pdfUrl={`${product.pdf_file}?v=${refreshTimestamp}`}
            showTryDirect={false}
          />
        </div>
      );
    } else if (product.pdf_data) {
      // 4. PDF DB
      return (
        <div className="relative pointer-events-none select-none">
          <div className="w-1 h-full bg-yellow-500 absolute left-0 top-0 rounded-l"></div>
          <PDFThumbnail
            pdfUrl={`data:application/pdf;base64,${product.pdf_data}`}
            showTryDirect={false}
          />
        </div>
      );
    } else if (product.storage_url) {
      // 5. External URL (enhanced detection)
      const isExternalUrl = (url: string): boolean => {
        // Support various patterns including query parameters
        const patterns = [
          /^https?:\/\//i,  // Basic http/https
          /\.(jpg|jpeg|png|gif|bmp|webp|svg|pdf|doc|docx)(\?.*)?$/i,  // File extensions with optional query params
          /drive\.google\.com/i,  // Google Drive
          /dropbox\.com/i,  // Dropbox
          /onedrive\.live\.com/i,  // OneDrive
          /github\.com.*\.(jpg|jpeg|png|gif|bmp|webp|svg|pdf)/i,  // GitHub hosted files
          /githubusercontent\.com/i,  // GitHub raw content
          /imgur\.com/i,  // Imgur
          /cloudinary\.com/i,  // Cloudinary
          /aws\.amazon\.com/i,  // AWS
          /amazonaws\.com/i,  // AWS S3
        ];
        
        return patterns.some(pattern => pattern.test(url));
      };

      if (isExternalUrl(product.storage_url)) {
        return (
          <div className="relative pointer-events-none select-none">
            <div className="w-1 h-full bg-purple-500 absolute left-0 top-0 rounded-l"></div>
            <ExternalUrlThumbnail
              url={product.storage_url}
              showTryDirect={false}
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
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <div 
      className={`container mx-auto ${isMobile ? 'px-4 py-4' : 'py-8'}`}
      onContextMenu={(e) => e.preventDefault()} // Prevent right-click context menu
    >
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-center'} mb-6`}>
        <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>Shopping Cart</h1>
        <Button 
          variant="outline" 
          onClick={navigateToHome}
          className={isMobile ? 'w-full' : ''}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Continue Shopping
        </Button>
      </div>

      {cart.length === 0 ? (
        <div className={`text-center ${isMobile ? 'py-8' : 'py-12'} border rounded-md bg-white`}>
          <ShoppingBag className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} mx-auto text-gray-300`} />
          <h2 className={`mt-4 ${isMobile ? 'text-lg' : 'text-xl'} font-semibold`}>Your cart is empty</h2>
          <p className={`mt-2 text-muted-foreground ${isMobile ? 'text-sm px-4' : ''}`}>
            Looks like you haven't added anything to your cart yet.
          </p>
          <Button className={`mt-6 ${isMobile ? 'w-full mx-4' : ''}`} onClick={navigateToHome}>
            Browse Products
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`w-full flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center'} mb-3`}>
            <div>
              <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold`}>Cart Items</h3>
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
                Review your items before checkout
              </p>
            </div>
            <Button
              variant="outline"
              onClick={clearCart}
              className={`${isMobile ? 'w-full' : 'mr-3'} py-1 px-3 text-sm`}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Cart
            </Button>
          </div>

          {/* Mobile Card Layout */}
          {isMobile ? (
            <div className="space-y-4">
              {cart.map((item, index) => (
                <div key={`${item.product.id}-${item.variant_type}`} className="border rounded-lg p-4 bg-white">
                  <div className="flex gap-3">
                    {/* Product Media */}
                    <div className="flex-shrink-0 w-16 h-16">
                      {renderProductMedia(item.product)}
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {item.product.description}
                      </p>
                      
                      {/* Badges */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge 
                          variant={item.variant_type === 'digital' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {item.variant_type === 'digital' ? 'Digital' : 'Physical + Digital'}
                        </Badge>
                        <Badge 
                          variant={
                            item.variant_type === 'digital' || item.product.stock > 0
                              ? "outline" 
                              : "destructive"
                          } 
                          className={cn(
                            "text-xs",
                            item.variant_type === 'digital' || item.product.stock > 0
                              ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" 
                              : "bg-red-50 text-red-700 hover:bg-red-100"
                          )}
                        >
                          {item.variant_type === 'digital' 
                            ? "Available"
                            : item.product.stock > 0 
                              ? `Stock: ${item.product.stock}` 
                              : "Out of Stock"}
                        </Badge>
                      </div>
                      
                      {/* Price and Quantity Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="text-sm font-semibold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Quantity Controls */}
                          {item.variant_type === 'physical' ? (
                            <div className="flex items-center">
                              <Button
                                variant="outline"
                                className="h-6 w-6 p-0"
                                onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1), item.variant_type)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <Button
                                variant="outline"
                                className="h-6 w-6 p-0"
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variant_type)}
                                disabled={item.quantity >= item.product.stock}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                          )}
                          
                          {/* Remove Button */}
                          <Button
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={() => removeFromCart(item.product.id, item.variant_type)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop Table Layout */
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
                    <TableRow key={`${item.product.id}-${item.variant_type}`}>
                      <TableCell className="text-center align-middle font-medium">
                        {index + 1}
                      </TableCell>
                      
                      {/* Product Media (using priority logic) */}
                      <TableCell 
                        className="px-0 text-center align-middle"
                        onContextMenu={(e) => e.preventDefault()} // Prevent right-click
                      >
                        {renderProductMedia(item.product)}
                      </TableCell>
                      
                      {/* Product Details */}
                      <TableCell className="align-middle">
                        <div className="space-y-1">
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                            {item.product.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={item.variant_type === 'digital' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {item.variant_type === 'digital' ? 'Digital' : 'Physical + Digital'}
                            </Badge>
                            <Badge 
                              variant={
                                item.variant_type === 'digital' || item.product.stock > 0
                                  ? "outline" 
                                  : "destructive"
                              } 
                              className={cn(
                                "text-xs",
                                item.variant_type === 'digital' || item.product.stock > 0
                                  ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" 
                                  : "bg-red-50 text-red-700 hover:bg-red-100"
                              )}
                            >
                              {item.variant_type === 'digital' 
                                ? "Always Available"
                                : item.product.stock > 0 
                                  ? `In Stock: ${item.product.stock}` 
                                  : "Out of Stock"}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      
                      {/* Quantity */}
                      <TableCell className="align-middle">
                        {item.variant_type === 'physical' ? (
                          <div className="flex items-center justify-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="h-7 w-7 p-0"
                                    onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1), item.variant_type)}
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
                                  updateQuantity(item.product.id, val, item.variant_type);
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
                                    onClick={() => {
                                      updateQuantity(item.product.id, Math.min(item.product.stock, item.quantity + 1), item.variant_type);
                                    }}
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
                        ) : (
                          <div className="text-center">
                            <span className="text-sm text-muted-foreground">Digital Copy</span>
                            <br />
                            <Badge variant="outline" className="text-xs mt-1">
                              Qty: {item.quantity}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      
                      {/* Price */}
                      <TableCell className="text-center align-middle font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </TableCell>
                      
                      {/* Actions */}
                      <TableCell className="text-right align-middle pr-4">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                onClick={() => removeFromCart(item.product.id, item.variant_type)}
                              >
                                <X className="h-3 w-3" />
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
            </div>
          )}

          {/* Cart Summary Section */}
          <div className={`border rounded-md ${isMobile ? 'mt-6' : ''}`}>
            <div className={`${isMobile ? 'p-4' : 'border-t p-4'} bg-gray-50`}>
              <div className={`${isMobile ? '' : 'max-w-md ml-auto'}`}>
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
                  className={`w-full mt-4 ${isMobile ? 'py-3 text-base' : 'py-2 text-base'}`}
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
    </div>
  );
}