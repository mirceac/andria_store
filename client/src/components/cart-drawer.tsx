import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import React, { useState } from 'react';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { items, removeFromCart, getTotal } = useCart();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  // Calculate total from current items
  const total = getTotal();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      alert("Please select a PDF file to upload.");
      return;
    }
    const formData = new FormData();
    formData.append('pdf_file', pdfFile);

    // Submit form data to server
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        alert("PDF file uploaded successfully.");
      } else {
        alert("Failed to upload PDF file.");
      }
    } catch (error) {
      console.error("Error uploading PDF file:", error);
      alert("An error occurred while uploading the PDF file.");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Shopping Cart</DrawerTitle>
        </DrawerHeader>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Your cart is empty</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4 py-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {item.quantity}
                      </p>
                      <p className="font-medium">
                        ${Number(item.product.price).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => removeFromCart(item.product.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="px-4 py-2">
              <Separator className="my-4" />
              <div className="flex justify-between mb-4">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">${total.toFixed(2)}</span>
              </div>
            </div>

            <DrawerFooter>
              <Link href="/cart" className="w-full">
                <Button className="w-full">
                  Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <DrawerClose asChild>
                <Button variant="outline">Continue Shopping</Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        )}
        <form onSubmit={handleSubmit} className="px-4 py-2">
          <input type="file" accept="application/pdf" onChange={handleFileChange} />
          <button type="submit" className="mt-2">Upload PDF</button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}