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
import AdminProductsPage from "@/pages/admin/products-page";
import { ProtectedRoute } from "./lib/protected-route";
import Navbar from "./components/navbar";

function Router() {
  return (
    <>
      <Navbar />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/product/:id" component={ProductPage} />
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/cart" component={CartPage} />
        <ProtectedRoute path="/admin/products" component={AdminProductsPage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
