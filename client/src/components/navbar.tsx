import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  User,
  Package,
  ClipboardList,
  Box,
  Palette, // Add this import
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

  const buttonClasses = "bg-blue-50 text-slate-600 hover:bg-blue-100 hover:text-slate-700";

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo Section */}
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <Palette className="h-6 w-6 text-white" />
          </div>
          <div className="hidden sm:flex flex-col">
            <h1 className="text-xl font-bold text-slate-900">Gallery</h1>
            <p className="text-xs text-slate-500">Digital Products</p>
          </div>
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center gap-2 md:gap-6">
          {user?.is_admin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`font-medium ${buttonClasses}`}>
                  <Box className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/admin/products" className="flex items-center text-slate-600 hover:text-slate-700">
                    <Box className="mr-2 h-4 w-4" />
                    <span>Products</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/orders" className="flex items-center text-slate-600 hover:text-slate-700">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    <span>Orders</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user && (
            <Link href="/orders">
              <Button variant="ghost" className={buttonClasses}>
                <Package className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Orders</span>
              </Button>
            </Link>
          )}

          <Link href="/cart">
            <Button variant="ghost" className={`relative ${buttonClasses}`}>
              <ShoppingCart className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-100 text-slate-600 text-xs font-medium px-2 min-w-[20px] h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>

          <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block" />

          {user ? (
            <Button
              variant="ghost"
              className={buttonClasses}
              onClick={() => logoutMutation.mutate()}
            >
              <User className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          ) : (
            <Link href="/auth">
              <Button variant="ghost" className={buttonClasses}>
                <User className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}