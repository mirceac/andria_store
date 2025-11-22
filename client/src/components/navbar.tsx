import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  User,
  Package,
  ClipboardList,
  Box,
  Palette,
  Search,
  Settings,
  LogOut,
  Menu,
  LayoutGrid,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useSearch } from "@/contexts/search-context";
import { useSort } from "@/contexts/sort-context";
import { useCart } from "@/hooks/use-cart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

export default function Navbar() {
  const { user, logoutMutation } = useAuth();
  const { items } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const { search, setSearch } = useSearch();
  const { sort, setSort } = useSort();

  // Fetch user profile for picture
  const { data: profile } = useQuery<{
    id: number;
    username: string;
    first_name: string | null;
    last_name: string | null;
    picture: string | null;
  }>({
    queryKey: ["/api/user/profile", user?.id],
    enabled: !!user,
  });

  const buttonClasses = "bg-blue-50 text-slate-600 hover:bg-blue-100 hover:text-slate-700";

  // Get user initials for avatar fallback
  const userInitials = user
    ? `${profile?.first_name?.[0] || user.username[0]}${profile?.last_name?.[0] || ""}`.toUpperCase()
    : "U";

  return (
    <nav className="bg-gray-50 border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <div className="w-full px-2 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Menu Button (on home page) + Gallery Logo */}
        <div className="flex items-center gap-3">
          {/* Menu Button - only shown on home page */}
          {window.location.pathname === "/" && (
            <Button
              variant="ghost"
              className={`h-10 w-10 p-0 ${buttonClasses}`}
              onClick={() => {
                // This will be handled by the home page component
                window.dispatchEvent(new CustomEvent('toggleSidebar'));
              }}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <Link href="/" className="flex items-center space-x-2 group px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Palette className="h-6 w-6 text-white" />
            </div>
            <div className="hidden sm:flex flex-col">
              <h1 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Gallery</h1>
              <p className="text-xs text-slate-500 group-hover:text-slate-600 transition-colors">Digital Products</p>
            </div>
          </Link>
        </div>

        {/* Right Side: Search + Sort + Profile */}
        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 bg-white border-slate-200 focus:border-blue-500"
            />
          </div>
          <Select value={sort} onValueChange={(value: typeof sort) => setSort(value)}>
            <SelectTrigger className="w-[140px] bg-slate-50 hidden md:flex">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="price_asc">Price (Low-High)</SelectItem>
              <SelectItem value="price_desc">Price (High-Low)</SelectItem>
            </SelectContent>
          </Select>

          <div className="h-6 w-px bg-slate-200 hidden md:block" />
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
                  <Link href="/admin/categories" className="flex items-center text-slate-600 hover:text-slate-700">
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    <span>Categories</span>
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

          <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block" />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <Avatar className="h-8 w-8 ring-2 ring-slate-200 hover:ring-blue-300 transition-all">
                    <AvatarImage src={profile?.picture || undefined} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-medium text-slate-700">
                    {profile?.first_name || user.username}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.picture || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">
                      {profile?.first_name && profile?.last_name
                        ? `${profile.first_name} ${profile.last_name}`
                        : user.username}
                    </p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile/settings" className="flex items-center cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>My Products</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/orders" className="flex items-center cursor-pointer">
                    <Package className="mr-2 h-4 w-4" />
                    <span>My Orders</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button variant="ghost" className={buttonClasses}>
                <User className="mr-2 h-4 w-4" />
                <span>Sign In</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}