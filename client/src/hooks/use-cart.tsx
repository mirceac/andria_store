import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SelectProduct } from "@db/schema";

interface CartItem {
  product: SelectProduct;
  quantity: number;
  variant_type: 'digital' | 'physical';
  price: number; // Store the price at time of adding to cart
}

interface CartStore {
  items: CartItem[];
  addToCart: (product: SelectProduct, quantity?: number, variant?: 'digital' | 'physical') => void;
  removeFromCart: (productId: number, variant?: 'digital' | 'physical') => void;
  updateQuantity: (productId: number, quantity: number, variant?: 'digital' | 'physical') => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addToCart: (product, quantity = 1, variant = 'digital') => {
        const items = get().items;
        
        // Calculate price based on variant
        const price = variant === 'physical' && product.physical_price 
          ? parseFloat(product.physical_price || '0')
          : parseFloat(product.price);
          
        // Check if product already exists in cart (any variant)
        const existingPhysicalItem = items.find((item) => 
          item.product.id === product.id && item.variant_type === 'physical'
        );
        const existingDigitalItem = items.find((item) => 
          item.product.id === product.id && item.variant_type === 'digital'
        );

        // If trying to add digital but physical already exists, ignore (physical includes digital)
        if (variant === 'digital' && existingPhysicalItem) {
          return;
        }

        // If trying to add physical but digital exists, remove digital and add physical
        if (variant === 'physical' && existingDigitalItem) {
          set({
            items: [
              ...items.filter((item) => !(item.product.id === product.id && item.variant_type === 'digital')),
              { product, quantity, variant_type: variant, price }
            ],
          });
          return;
        }

        // If adding more of the same variant
        const existingItem = items.find((item) => 
          item.product.id === product.id && item.variant_type === variant
        );

        if (existingItem) {
          // For physical items, check stock limit
          if (variant === 'physical') {
            const newQuantity = existingItem.quantity + quantity;
            const maxStock = product.stock || 0;
            if (newQuantity > maxStock) {
              return; // Don't add if it would exceed stock
            }
          }
          
          set({
            items: items.map((item) =>
              item.product.id === product.id && item.variant_type === variant
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          // For new physical items, check stock limit
          if (variant === 'physical') {
            const maxStock = product.stock || 0;
            if (quantity > maxStock) {
              return; // Don't add if it would exceed stock
            }
          }
          
          set({ items: [...items, { product, quantity, variant_type: variant, price }] });
        }
      },
      removeFromCart: (productId, variant = 'digital') => {
        set({
          items: get().items.filter((item) => 
            !(item.product.id === productId && item.variant_type === variant)
          ),
        });
      },
      updateQuantity: (productId, quantity, variant = 'digital') => {
        if (quantity < 1) return;
        set({
          items: get().items.map((item) =>
            item.product.id === productId && item.variant_type === variant
              ? { ...item, quantity } 
              : item
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      },
    }),
    {
      name: "cart-storage",
    }
  )
);
