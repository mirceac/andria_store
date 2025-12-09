import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  User,
  Package,
  ClipboardList,
  Box,
  Pyramid,
  Pencil,
  Search,
  Settings,
  LogOut,
  Menu,
  LayoutGrid,
  Users,
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
  const isMobile = useIsMobile();
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
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 w-full overflow-x-hidden">
      <div className="w-full px-2 sm:px-4 h-16 flex items-center overflow-x-hidden relative">
        {/* Left Side: Architectural Logo */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 flex-1 md:flex-none">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0 py-2">
            <div className="relative h-12 w-16 sm:h-14 sm:w-20 border-2 border-slate-600 bg-blue-50 flex items-center justify-center group-hover:bg-slate-600 transition-all duration-300 flex-shrink-0">
              <div className="absolute inset-0 flex items-center justify-center">
                {/* T-Square horizontal with 75% inside cylinder - centered */}
                <svg className="h-8 w-8 sm:h-9 sm:w-9 text-slate-600 group-hover:text-blue-50 transition-colors duration-300" viewBox="0 0 24 24" fill="none">
                  <g transform="translate(12, 12) rotate(-15) scale(1.1)">
                    {/* Back ellipse of cylinder (left side) */}
                    <ellipse cx="-3" cy="0" rx="2" ry="5" fill="currentColor" opacity="0.2"/>
                    
                    {/* Cylinder body - opaque */}
                    <rect x="-3" y="-5" width="11" height="10" fill="currentColor" opacity="0.12"/>
                    
                    {/* Cylinder walls (top and bottom) */}
                    <line x1="-3" y1="-5" x2="8" y2="-5" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="-3" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.5"/>
                    
                    {/* Front ellipse of cylinder (right side opening) */}
                    <ellipse cx="8" cy="0" rx="2" ry="5" fill="currentColor" opacity="0.08" stroke="currentColor" strokeWidth="1.5"/>
                    
                    {/* T-Square horizontal: I-|  (horizontal extending left, vertical bar on right) */}
                    <g transform="translate(10, 0) rotate(180)">
                      {/* Vertical bar of T (perpendicular) - visible outside */}
                      <rect x="-1" y="-4" width="2" height="8" fill="currentColor" rx="0.3"/>
                      
                      {/* Horizontal ruler extending right - 25% visible */}
                      <rect x="0" y="-0.7" width="3.5" height="1.4" fill="currentColor" rx="0.2"/>
                      
                      {/* Graduation marks on visible horizontal part */}
                      <line x1="0.8" y1="-1.2" x2="0.8" y2="1.2" stroke="white" strokeWidth="0.2" opacity="0.8"/>
                      <line x1="2" y1="-1.2" x2="2" y2="1.2" stroke="white" strokeWidth="0.2" opacity="0.8"/>
                      <line x1="3.2" y1="-1.2" x2="3.2" y2="1.2" stroke="white" strokeWidth="0.2" opacity="0.8"/>
                    </g>
                  </g>
                </svg>
              </div>
              <div className="absolute inset-0 border border-slate-400" style={{ margin: '4px' }}></div>
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <h1 className="text-xl sm:text-2xl font-light tracking-wider text-black group-hover:text-gray-700 transition-colors uppercase" style={{ fontFamily: 'Georgia, serif' }}>Architecture</h1>
              <p className="text-xs tracking-widest text-gray-500 uppercase" style={{ fontFamily: 'Georgia, serif' }}>Gallery & Design</p>
            </div>
          </Link>
        </div>

        {/* Right Side: Search + Sort + Profile - Absolutely positioned to always stay in same place */}
        <div className="absolute right-0.5 sm:right-2 flex items-center justify-end gap-0.5 sm:gap-2 flex-shrink-0">
          {/* Search Bar */}
          <div className="relative w-64 hidden md:block flex-shrink-0">
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
            <SelectTrigger className="w-[140px] bg-slate-50 hidden md:flex flex-shrink-0">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="price_asc">Price (Low-High)</SelectItem>
              <SelectItem value="price_desc">Price (High-Low)</SelectItem>
            </SelectContent>
          </Select>

          <div className="h-6 w-px bg-slate-200 hidden md:block" />
          {!user?.is_admin && <div className="h-10 w-10 opacity-0 flex-shrink-0" />}
          {user?.is_admin && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`${buttonClasses} h-10 w-10 p-0`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Box className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-56 max-w-sm">
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
                  <Link href="/admin/users" className="flex items-center text-slate-600 hover:text-slate-700">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Users</span>
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

          {user ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`${buttonClasses} flex-shrink-0 h-10 w-10 p-0`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.picture || undefined} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-56 max-w-sm">
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
                <DropdownMenuItem asChild className="md:hidden">
                  <Link href="/orders" className="flex items-center cursor-pointer">
                    <Package className="mr-2 h-4 w-4" />
                    <span>My Orders</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="md:hidden">
                  <Link href="/cart" className="flex items-center cursor-pointer">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    <span>Cart {itemCount > 0 && `(${itemCount})`}</span>
                  </Link>
                </DropdownMenuItem>
                {!user.is_admin && (
                  <DropdownMenuItem asChild className="hidden md:flex">
                    <Link href="/orders" className="flex items-center cursor-pointer">
                      <Package className="mr-2 h-4 w-4" />
                      <span>My Orders</span>
                    </Link>
                  </DropdownMenuItem>
                )}
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
              <Button variant="ghost" className={`${buttonClasses} flex-shrink-0 h-10 w-10 p-0`}>
                <User className="h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}