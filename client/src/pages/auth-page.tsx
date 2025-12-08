import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { InsertUser } from "@db/schema";
import { Redirect } from "wouter";
import { Loader2, LockKeyhole, User, KeyRound, ShoppingCart, Package, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCart } from "@/hooks/use-cart";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');
  const [resetToken, setResetToken] = useState('');
  const [resetUsername, setResetUsername] = useState('');
  const isMobile = useIsMobile();
  const { items: cartItems } = useCart();
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loginForm = useForm<InsertUser>();
  const registerForm = useForm<InsertUser>();
  const resetRequestForm = useForm<{ username: string }>();
  const resetPasswordForm = useForm<{ resetToken: string; newPassword: string; confirmPassword: string }>();

  const resetRequestMutation = useMutation({
    mutationFn: async (data: { username: string }) => {
      const response = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to request password reset');
      return response.json();
    },
    onSuccess: (data) => {
      setResetToken(data.resetToken || '');
      setResetUsername(data.username);
      setResetStep('reset');
      
      const description = data.emailSent 
        ? "A reset token has been sent to your email address. Please check your email."
        : "Reset token generated. Please check with your administrator for the token.";
      
      toast({
        title: "Reset Token Sent",
        description,
        duration: 8000,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to request password reset",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { username: string; resetToken: string; newPassword: string }) => {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reset password');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset successfully. Please login with your new password.",
      });
      setResetDialogOpen(false);
      setResetStep('request');
      setResetToken('');
      setResetUsername('');
      resetRequestForm.reset();
      resetPasswordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className={`flex relative overflow-x-hidden ${isMobile ? '' : 'ml-16'}`} style={{ width: isMobile ? '100vw' : 'calc(100vw - 64px)' }}>

      {/* Sidebar Overlay - Shows when sidebar is open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed position, slides in from left on both mobile and desktop */}
      <div className={cn(
        "fixed left-0 top-0 bottom-0 z-50 w-64 bg-white border-r border-gray-200 shadow-lg transform transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4"> {/* Add top padding on mobile for header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
              Categories
            </h2>
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(false);
              }}
              className="h-8 w-8 p-0 flex-shrink-0"
              title="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-1">
            <div
              className={cn(
                "flex items-center h-9 px-2 rounded-md cursor-pointer transition-all duration-200",
                "hover:bg-gray-50 active:bg-gray-100",
                "bg-indigo-50 border border-indigo-200 shadow-sm"
              )}
              onClick={() => setLocation("/")}
            >
              <span className="text-sm font-medium transition-colors duration-200 text-indigo-900 hover:text-gray-900">
                All Products
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-full px-1 py-3">
        <div className="min-h-screen md:min-h-[calc(100vh-4rem)] flex items-center justify-center w-full p-4 sm:p-6 md:p-8 overflow-hidden">
          <Card className="w-full max-w-md p-5 sm:p-6 overflow-hidden">
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit((data) =>
                    loginMutation.mutate(data)
                  )}
                  className="space-y-3 sm:space-y-4"
                >
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} required />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} required />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <LockKeyhole className="mr-2 h-4 w-4" />
                        Login
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setResetDialogOpen(true)}
                  >
                    Forgot password?
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register" className="mt-0">
              <Form {...registerForm}>
                <form
                  onSubmit={registerForm.handleSubmit((data) =>
                    registerMutation.mutate(data)
                  )}
                  className="space-y-3 sm:space-y-4"
                >
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} required />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} required />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <User className="mr-2 h-4 w-4" />
                        Register
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </Card>
        </div>
      </div>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {resetStep === 'request'
                ? 'Enter your username below. A reset token will be sent to your email address.'
                : 'Enter the reset token from your email, then set your new password.'}
            </DialogDescription>
          </DialogHeader>

          {resetStep === 'request' ? (
            <Form {...resetRequestForm}>
              <form
                onSubmit={resetRequestForm.handleSubmit((data) =>
                  resetRequestMutation.mutate(data)
                )}
                className="space-y-3 sm:space-y-4"
              >
                <FormField
                  control={resetRequestForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} required />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetRequestMutation.isPending}
                >
                  {resetRequestMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Request Reset Token
                    </>
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...resetPasswordForm}>
              <form
                onSubmit={resetPasswordForm.handleSubmit((data) => {
                  if (data.newPassword !== data.confirmPassword) {
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: "Passwords do not match",
                    });
                    return;
                  }
                  resetPasswordMutation.mutate({
                    username: resetUsername,
                    resetToken: data.resetToken,
                    newPassword: data.newPassword,
                  });
                })}
                className="space-y-3 sm:space-y-4"
              >
                <FormField
                  control={resetPasswordForm.control}
                  name="resetToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reset Token</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          required 
                          placeholder="Enter the token from your email"
                          className="font-mono text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetPasswordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} required />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetPasswordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} required />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setResetStep('request');
                      setResetToken('');
                      setResetUsername('');
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={resetPasswordMutation.isPending}
                  >
                    {resetPasswordMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Reset Password'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
