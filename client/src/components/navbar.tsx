import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  User,
  Package,
  ClipboardList,
  Box,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const { user, logoutMutation } = useAuth();
  const { items } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/">
          <h1 className="text-2xl font-bold text-primary">Store</h1>
        </Link>

        <div className="flex items-center gap-4">
          {user?.isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">Admin</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/admin/products">
                    <Box className="mr-2 h-4 w-4" />
                    Products
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/orders">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Orders
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user && (
            <Link href="/orders">
              <Button variant="ghost">
                <Package className="h-4 w-4" />
              </Button>
            </Link>
          )}

          <Link href="/cart">
            <Button variant="outline" className="relative">
              <ShoppingCart className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>

          {user ? (
            <Button variant="ghost" onClick={() => logoutMutation.mutate()}>
              <User className="mr-2 h-4 w-4" />
              Logout
            </Button>
          ) : (
            <Link href="/auth">
              <Button>
                <User className="mr-2 h-4 w-4" />
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}