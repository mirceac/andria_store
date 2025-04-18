import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import ProductPage from "@/pages/product-page";
import AuthPage from "@/pages/auth-page";
import CartPage from "@/pages/cart-page";
import OrdersPage from "@/pages/orders-page";
import CheckoutSuccessPage from "@/pages/checkout/success-page";
import AdminProductsPage from "@/pages/admin/products-page";
import AdminOrdersPage from "@/pages/admin/orders-page";
import { ProtectedRoute } from "./lib/protected-route";
import Navbar from "./components/navbar";
import { initPdfWorker } from '@/lib/pdf-worker';
import { SearchProvider } from '@/contexts/search-context';
import { SortProvider } from '@/contexts/sort-context';

// Initialize PDF worker
initPdfWorker();

function Router() {
  return (
    <>
      <Navbar />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/product/:id" component={ProductPage} />
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/cart" component={CartPage} />
        <ProtectedRoute path="/orders" component={OrdersPage} />
        <ProtectedRoute path="/checkout/success" component={CheckoutSuccessPage} />
        <ProtectedRoute path="/admin/products" component={AdminProductsPage} adminOnly />
        <ProtectedRoute path="/admin/orders" component={AdminOrdersPage} adminOnly />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <SearchProvider>
      <SortProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </QueryClientProvider>
      </SortProvider>
    </SearchProvider>
  );
}

export default App;