import { useState } from "react";
import { SelectProduct } from "@db/schema";
import { ShoppingCart, Package, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

interface VariantSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: SelectProduct;
}

export function VariantSelectionDialog({
  open,
  onOpenChange,
  product,
}: VariantSelectionDialogProps) {
  const { addToCart } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<'digital' | 'physical' | null>(null);

  const hasDigitalVariant = Number(product.price || 0) > 0; // price field is digital price
  const hasPhysicalVariant = product.physical_price && Number(product.physical_price) > 0;
  const physicalStock = product.stock || 0;
  const isPhysicalOutOfStock = physicalStock <= 0;

  const handleAddToCart = (variant: 'digital' | 'physical') => {
    addToCart(product, 1, variant);
    onOpenChange(false);
  };

  // If only one variant is available, show simplified dialog
  const variantCount = (hasDigitalVariant ? 1 : 0) + (hasPhysicalVariant && !isPhysicalOutOfStock ? 1 : 0);
  
  if (variantCount === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Product Unavailable</DialogTitle>
            <DialogDescription>
              This product is currently out of stock and not available for purchase.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  if (variantCount === 1) {
    const availableVariant = hasDigitalVariant ? 'digital' : 'physical';
    const price = availableVariant === 'digital' ? Number(product.price) : Number(product.physical_price || 0);
    
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Cart</DialogTitle>
            <DialogDescription>
              Add "{product.name}" to your cart
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {availableVariant === 'digital' ? (
                    <Download className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Package className="h-4 w-4 text-green-600" />
                  )}
                  <span className="font-medium">
                    {availableVariant === 'digital' ? 'Digital Version' : 'Physical Version'}
                  </span>
                </div>
                <span className="text-lg font-bold">${price.toFixed(2)}</span>
              </div>
              
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  availableVariant === 'digital' 
                    ? "bg-blue-50 text-blue-700 border-blue-200" 
                    : "bg-green-50 text-green-700 border-green-200"
                )}
              >
                {availableVariant === 'digital' ? 'Always Available' : `${physicalStock} left in stock`}
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleAddToCart(availableVariant)}
                className="flex-1"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
              <Button onClick={() => onOpenChange(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Multiple variants available
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose Version</DialogTitle>
          <DialogDescription>
            Select the version of "{product.name}" you'd like to add to your cart
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {hasDigitalVariant && (
            <div 
              className={cn(
                "border rounded-lg p-4 cursor-pointer transition-all",
                selectedVariant === 'digital' 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-200 hover:border-blue-300"
              )}
              onClick={() => setSelectedVariant('digital')}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Digital Version</span>
                </div>
                <span className="text-lg font-bold">${Number(product.price).toFixed(2)}</span>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                Instant download, unlimited access
              </p>
              
              <Badge 
                variant="outline" 
                className="text-xs bg-blue-50 text-blue-700 border-blue-200"
              >
                Always Available
              </Badge>
            </div>
          )}

          {hasPhysicalVariant && !isPhysicalOutOfStock && (
            <div 
              className={cn(
                "border rounded-lg p-4 cursor-pointer transition-all",
                selectedVariant === 'physical' 
                  ? "border-green-500 bg-green-50" 
                  : "border-gray-200 hover:border-green-300"
              )}
              onClick={() => setSelectedVariant('physical')}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Physical Version</span>
                </div>
                <span className="text-lg font-bold">${Number(product.physical_price).toFixed(2)}</span>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                Shipped to your address
              </p>
              
              <Badge 
                variant="outline" 
                className="text-xs bg-green-50 text-green-700 border-green-200"
              >
                {physicalStock} left in stock
              </Badge>
            </div>
          )}

          {hasPhysicalVariant && isPhysicalOutOfStock && (
            <div className="border rounded-lg p-4 opacity-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-gray-500">Physical Version</span>
                </div>
                <span className="text-lg font-bold text-gray-500">
                  ${Number(product.physical_price || 0).toFixed(2)}
                </span>
              </div>
              
              <p className="text-sm text-gray-500 mb-2">
                Shipped to your address
              </p>
              
              <Badge variant="destructive" className="text-xs">
                Out of Stock
              </Badge>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={() => selectedVariant && handleAddToCart(selectedVariant)}
            disabled={!selectedVariant}
            className="flex-1"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}