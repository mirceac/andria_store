import * as z from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SelectProduct } from "@db/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExternalUrlThumbnail } from "@/components/external-url-thumbnail";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  FileImage,
  X,
  XCircle,
  Download,
  User,
  Globe,
  Lock,
  Eye,
  EyeOff,
  FolderTree,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PDFViewerDialog } from "@/components/pdf-viewer-dialog";
import { ImageViewerDialog } from "@/components/image-viewer-dialog";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ImageThumbnail } from "@/components/image-thumbnail";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

// Form schema for user products
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  stock: z.coerce.number().min(0, "Stock must be non-negative").int(),
  category_id: z.coerce.number().optional(),
  file: z.custom<File | string | null>(),
  storage_type: z.enum(["pdf", "image"]),
  storage_location: z.enum(["database", "file"]).optional(),
  storage_url: z.string().optional(),
  has_physical_variant: z.boolean().default(false),
  physical_price: z.coerce.number().min(0, "Physical price must be positive").optional(),
  is_public: z.boolean().default(true),
  hidden: z.boolean().default(false),
});

export default function ProfilePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedProduct, setSelectedProduct] = useState<SelectProduct | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // Read category from URL query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    if (categoryParam) {
      setSelectedCategoryFilter(categoryParam);
    }
  }, []);

  // Redirect if not authenticated
  if (!user) {
    setTimeout(() => navigate("/auth"), 0);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedProductForDownload, setSelectedProductForDownload] = useState<SelectProduct | null>(null);
  
  // Storage removal state
  const [storageToRemove, setStorageToRemove] = useState<{
    productId: number;
    type: "image_file" | "image_data" | "pdf_file" | "pdf_data";
  } | null>(null);

  // Download function for digital products
  const openDownloadDialog = (product: SelectProduct) => {
    setSelectedProductForDownload(product);
    setDownloadDialogOpen(true);
  };

  const downloadFromStorageType = async (product: SelectProduct, storageType: string) => {
    try {
      let downloadUrl = '';
      let filename = `${product.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      switch (storageType) {
        case 'image_file':
          if (!product.image_file) {
            toast({ title: "No Content", description: "No image file available.", variant: "destructive" });
            return;
          }
          downloadUrl = product.image_file;
          filename += `.${product.image_file.split('.').pop() || 'jpg'}`;
          break;
          
        case 'image_data':
          if (!product.image_data) {
            toast({ title: "No Content", description: "No image data available.", variant: "destructive" });
            return;
          }
          downloadUrl = `/api/products/${product.id}/download/image`;
          filename += '.jpg';
          break;
          
        case 'pdf_file':
          if (!product.pdf_file) {
            toast({ title: "No Content", description: "No PDF file available.", variant: "destructive" });
            return;
          }
          downloadUrl = product.pdf_file;
          filename += '.pdf';
          break;
          
        case 'pdf_data':
          if (!product.pdf_data) {
            toast({ title: "No Content", description: "No PDF data available.", variant: "destructive" });
            return;
          }
          downloadUrl = `/api/products/${product.id}/pdf`;
          filename += '.pdf';
          break;
          
        case 'storage_url':
          if (!product.storage_url) {
            toast({ title: "No Content", description: "No storage URL available.", variant: "destructive" });
            return;
          }
          downloadUrl = product.storage_url;
          const extension = product.storage_url.split('.').pop();
          if (extension && extension.length <= 5) {
            filename += `.${extension}`;
          }
          break;
          
        default:
          toast({ title: "Invalid Selection", description: "Please select a valid storage type.", variant: "destructive" });
          return;
      }

      if (downloadUrl.startsWith('/api/')) {
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({ title: "Download Started", description: `Download of ${product.name} from ${storageType} has been initiated.` });
      setDownloadDialogOpen(false);
    } catch (error) {
      console.error('Download failed:', error);
      toast({ title: "Download Failed", description: "Please try again.", variant: "destructive" });
    }
  };

  const { data: products, isLoading } = useQuery<SelectProduct[]>({
    queryKey: [`/api/users/${user.id}/products`],
  });

  const { data: categories } = useQuery<{id: number, name: string, description: string | null, parent_id: number | null, user_id?: number | null, username?: string | null, is_public?: boolean, hidden?: boolean, created_at: string}[]>({
    queryKey: ["/api/categories"],
  });

  // Filter categories to only show ones the user can use
  const usableCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(category => {
      // Public categories - anyone can use
      if (category.is_public !== false) return true;
      
      // Private categories - only owner can use
      if (category.is_public === false && category.user_id === user.id) return true;
      
      return false;
    });
  }, [categories, user.id]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      stock: 0,
      category_id: undefined,
      file: null,
      storage_type: "pdf",
      storage_location: "database",
      storage_url: "",
      has_physical_variant: false,
      physical_price: 0,
      is_public: true,
      hidden: false,
    },
  });

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedProduct(null);
      form.reset({
        name: "",
        description: "",
        price: 0,
        stock: 0,
        category_id: undefined,
        file: null,
        storage_type: "pdf",
        storage_location: "database",
        storage_url: "",
        has_physical_variant: false,
        physical_price: 0,
        is_public: true,
        hidden: false,
      });
    }
  };

  const handleEditProduct = (product: SelectProduct) => {
    let storageType = "image";
    if (product.pdf_data || product.pdf_file) {
      storageType = "pdf";
    }
    
    let storageLocation = "file";
    if (product.pdf_data || product.image_data) {
      storageLocation = "database";
    }
    
    form.reset({
      name: product.name,
      description: product.description || "",
      price: Number(product.price),
      stock: product.stock,
      category_id: product.category_id || undefined,
      file: "",
      storage_type: storageType as "image" | "pdf",
      storage_location: storageLocation as "database" | "file",
      storage_url: product.storage_url || "",
      has_physical_variant: product.has_physical_variant || false,
      physical_price: product.physical_price ? Number(product.physical_price) : 0,
      is_public: product.is_public !== false,
      hidden: product.hidden || false,
    });
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const createProductMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Add is_public=false for user products
      formData.append("is_public", "false");
      
      const res = await apiRequest("POST", "/api/products", formData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/products`] });
      toast({
        title: "Product created",
        description: "Your product has been created successfully.",
      });
      handleDialogOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!selectedProduct?.id) {
        throw new Error("No product selected for update");
      }

      const res = await apiRequest(
        "PATCH",
        `/api/products/${selectedProduct.id}`,
        formData
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update product");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/products`] });
      setRefreshTimestamp(Date.now());
      toast({
        title: "Product updated",
        description: "Your product has been updated successfully.",
      });
      handleDialogOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeStorageMutation = useMutation({
    mutationFn: async ({
      productId,
      type,
    }: {
      productId: number;
      type: string;
    }) => {
      const res = await apiRequest("DELETE", `/api/products/${productId}/storage/${type}`);
      if (!res.ok) {
        const text = await res.text();
        let error;
        try {
          error = JSON.parse(text);
        } catch (e) {
          error = { message: text || "Failed to remove storage" };
        }
        throw new Error(error.message || "Failed to remove storage");
      }
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      } else {
        return { success: true };
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/products`] });
      setRefreshTimestamp(Date.now());
      toast({
        title: "Storage removed",
        description: `Successfully removed ${getStorageLabel(variables.type)} from product.`,
      });
    },
    onError: (error: Error) => {
      console.error("Error removing storage:", error);
      toast({
        title: "Failed to remove storage",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const res = await apiRequest("DELETE", `/api/products/${productId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/products`] });
      toast({
        title: "Product deleted",
        description: "Your product has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to delete product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRemoveStorage = (
    productId: number,
    type: "image_file" | "image_data" | "pdf_file" | "pdf_data"
  ) => {
    setStorageToRemove({ productId, type });
  };

  const confirmRemoveStorage = () => {
    if (storageToRemove) {
      removeStorageMutation.mutate(storageToRemove);
      setStorageToRemove(null);
    }
  };

  const getStorageLabel = (type: string) => {
    switch (type) {
      case "image_file":
        return "Image File";
      case "image_data":
        return "Image DB";
      case "pdf_file":
        return "PDF File";
      case "pdf_data":
        return "PDF DB";
      default:
        return "Storage";
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const formData = new FormData();

      if (selectedProduct) {
        // Update existing product
        if (data.name !== selectedProduct.name) {
          formData.append("name", data.name);
        }
        if (data.description !== selectedProduct.description) {
          formData.append("description", data.description || "");
        }
        if (Number(data.price) !== Number(selectedProduct.price)) {
          formData.append("price", Number(data.price).toFixed(2));
        }
        if (Number(data.stock) !== selectedProduct.stock) {
          formData.append("stock", Number(data.stock).toString());
        }
        if (data.category_id !== selectedProduct.category_id) {
          formData.append("category_id", data.category_id?.toString() || "");
        }
        formData.append("storage_url", data.storage_url || "");
        if (data.has_physical_variant !== selectedProduct.has_physical_variant) {
          formData.append("has_physical_variant", data.has_physical_variant.toString());
        }
        if (data.has_physical_variant && Number(data.physical_price || 0) !== Number(selectedProduct.physical_price || 0)) {
          formData.append("physical_price", Number(data.physical_price || 0).toFixed(2));
        }
        // Always include visibility fields to ensure proper updates
        formData.append("is_public", data.is_public.toString());
        formData.append("hidden", data.hidden.toString());

        if (data.file instanceof File) {
          formData.append("storage_type", data.storage_type);
          formData.append("file", data.file);
          if (data.storage_location) {
            formData.append("storage_location", data.storage_location);
            formData.append(
              "store_as_binary",
              data.storage_location === "database" ? "true" : "false"
            );
          }
        }

        if ([...formData.entries()].length === 0) {
          formData.append("name", data.name);
        }

        await updateProductMutation.mutateAsync(formData);
      } else {
        // Create new product
        formData.append("name", data.name);
        formData.append("description", data.description || "");
        formData.append("price", Number(data.price).toFixed(2));
        formData.append("stock", Number(data.stock).toString());
        formData.append("category_id", data.category_id?.toString() || "");
        formData.append("storage_type", data.storage_type);
        formData.append("storage_url", data.storage_url || "");
        formData.append("has_physical_variant", data.has_physical_variant.toString());
        if (data.has_physical_variant) {
          formData.append("physical_price", Number(data.physical_price || 0).toFixed(2));
        }
        formData.append("is_public", data.is_public.toString());
        formData.append("hidden", data.hidden.toString());

        if (data.storage_location) {
          formData.append("storage_location", data.storage_location);
        }

        if (data.file instanceof File) {
          formData.append("file", data.file);
          formData.append("store_as_binary", 
            data.storage_location === "database" ? "true" : "false");
        }
        
        await createProductMutation.mutateAsync(formData);
      }

      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to submit form",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`container mx-auto ${isMobile ? 'px-2 py-4' : 'ml-16 py-10'}`}>
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-center'} mb-8`}>
        <div>
          <h1 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold flex items-center gap-2`}>
            <User className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'}`} />
            My Products
            {selectedCategoryFilter !== "all" && categories && (() => {
              const selectedCat = categories.find(c => c.id === parseInt(selectedCategoryFilter));
              return selectedCat ? (
                <span className="text-blue-600 text-2xl">
                  / {selectedCat.name}
                </span>
              ) : null;
            })()}
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal product collection
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/profile/categories">
            <Button variant="outline">
              <FolderTree className="mr-2 h-4 w-4" />
              My Categories
            </Button>
          </Link>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription>
                {selectedProduct 
                  ? "Update your product details" 
                  : "Create a new product for your personal collection"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Product Type Section at Top */}
                <div className="space-y-3 border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-semibold text-sm">Product Type</h4>
                  
                  {/* Public Checkbox */}
                  <div className="flex items-start space-x-2">
                    <FormField
                      control={form.control}
                      name="is_public"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 mt-1"
                            />
                          </FormControl>
                          <div className="flex-1">
                            <FormLabel className="text-sm font-medium">
                              Public Product (For Sale)
                            </FormLabel>
                            <p className="text-xs text-gray-600 mt-1">
                              {field.value 
                                ? "This product will be available for purchase with price, stock, and shopping cart functionality."
                                : "This is a private portfolio/gallery item. Price, stock, and purchase options will be hidden from customers."}
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Hidden Checkbox */}
                  <div className="flex items-start space-x-2">
                    <FormField
                      control={form.control}
                      name="hidden"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 mt-1"
                            />
                          </FormControl>
                          <div className="flex-1">
                            <FormLabel className="text-sm font-medium">
                              Hidden from Gallery
                            </FormLabel>
                            <p className="text-xs text-gray-600 mt-1">
                              Hide this product from all public views (only visible in your profile panel)
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Basic Product Information */}
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Price and Stock - Only show for public products */}
                {form.watch("is_public") && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Digital Price</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value?.toString() || "none"}
                          onValueChange={(value) =>
                            field.onChange(value === "none" ? undefined : parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No category</SelectItem>
                            {usableCategories?.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* File Settings */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="storage_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>File Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select file type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pdf">PDF Document</SelectItem>
                                <SelectItem value="image">Image</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="storage_location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Storage Location</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select storage location" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="database">Database</SelectItem>
                                <SelectItem value="file">File System</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* External URL */}
                    <div>
                      <Label>External URL</Label>
                      <Input
                        {...form.register("storage_url")}
                        placeholder="Enter public image/PDF URL (e.g., https://example.com/image.jpg)"
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="file"
                      render={({ field: { value, onChange, ...field } }) => (
                        <FormItem>
                          <FormLabel>
                            {form.watch("storage_type") === "pdf"
                              ? "PDF Document"
                              : "Product Image"}
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-2 border rounded-lg p-3">
                              {value && form.watch("storage_type") === "image" ? (
                                <div className="w-24 h-24 relative mb-2 mx-auto">
                                  <img
                                    src={
                                      typeof value === "string"
                                        ? value
                                        : URL.createObjectURL(value as File)
                                    }
                                    alt="Preview"
                                    className="object-contain rounded-md w-full h-full"
                                  />
                                </div>
                              ) : (
                                value && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-5 w-5" />
                                    <span className="text-sm">
                                      {(value as File)?.name || "Current file"}
                                    </span>
                                  </div>
                                )
                              )}
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept={
                                    form.watch("storage_type") === "pdf"
                                      ? ".pdf"
                                      : ".jpg,.jpeg,.png"
                                  }
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) onChange(file);
                                  }}
                                  {...field}
                                />
                                {value instanceof File && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => onChange(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Right Column - Help Text and Physical Variant */}
                  <div className="space-y-4">
                    {/* Help Text */}
                    <div className="text-xs text-muted-foreground space-y-2 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium">Storage Options:</span>
                        <ul className="list-disc pl-4 mt-1">
                          <li><span className="font-medium">File Type:</span> Choose between PDF or Image</li>
                          <li><span className="font-medium">Storage Location:</span> Save in database or file system</li>
                        </ul>
                      </div>
                      
                      <div>
                        <span className="font-medium text-amber-600">For External URLs:</span>
                        <ul className="list-disc pl-4 mt-1">
                          <li>Use JPEG/PNG formats (HEIC may not display correctly)</li>
                          <li>URL must be publicly accessible</li>
                          <li>Include proper file extension (.jpg, .png, .pdf)</li>
                          <li>For Google Photos: Use "Share" → "Create link", ensure "Anyone with the link" is selected</li>
                        </ul>
                      </div>
                      
                      <div>
                        <span className="font-medium">Upload Options:</span>
                        <ul className="list-disc pl-4 mt-1">
                          <li>Choose storage location before uploading</li>
                          <li>Database: Best for smaller files</li>
                          <li>File System: Better for larger files</li>
                          <li>External URL: Link to files hosted elsewhere</li>
                        </ul>
                      </div>
                    </div>
                    
                    {/* Physical Variant - Only for public products */}
                    {form.watch("is_public") && (
                      <div className="space-y-3 border rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="has_physical_variant"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="h-4 w-4"
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  Also sell as physical product
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {form.watch("has_physical_variant") && (
                          <FormField
                            control={form.control}
                            name="physical_price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Physical Price</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(parseFloat(e.target.value) || 0)
                                    }
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={
                      createProductMutation.isPending ||
                      updateProductMutation.isPending
                    }
                  >
                    {createProductMutation.isPending ||
                    updateProductMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : selectedProduct ? (
                      "Update Product"
                    ) : (
                      "Create Product"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDialogOpenChange(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-0 text-center w-[60px]">Image File</TableHead>
                <TableHead className="px-0 text-center w-[60px]">Image DB</TableHead>
                <TableHead className="px-0 text-center w-[60px]">PDF File</TableHead>
                <TableHead className="px-0 text-center w-[60px]">PDF DB</TableHead>
                <TableHead className="px-0 text-center w-[60px]">Storage URL</TableHead>
                <TableHead className="text-center w-[250px]">Name & Category</TableHead>
                <TableHead className="text-center w-[180px]">Description</TableHead>
                <TableHead className="text-center w-[80px]">Digital Price</TableHead>
                <TableHead className="text-center w-[140px]">Variants</TableHead>
                <TableHead className="text-center w-[80px]">Visible</TableHead>
                <TableHead className="text-right px-4 w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products && products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No products yet. Click "Add Product" to create your first product!
                  </TableCell>
                </TableRow>
              ) : (
                products?.map((product) => (
                  <TableRow key={product.id}>
                    {/* Image File column */}
                    <TableCell className="px-0 text-center align-middle w-[60px]">
                      {product.image_file ? (
                        <div className="relative">
                          <ImageThumbnail
                            productId={product.id}
                            imageUrl={`${product.image_file}?v=${refreshTimestamp}`}
                            imageData={null}
                            alt={product.name}
                            onClick={() => {
                              setSelectedImage(product.image_file);
                              setIsImageViewerOpen(true);
                            }}
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveStorage(product.id, 'image_file');
                                  }}
                                >
                                  <XCircle className="h-3 w-3 text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remove image file</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ) : (
                        <XCircle className="h-4 w-4 mx-auto text-gray-300" />
                      )}
                    </TableCell>

                    {/* Image DB column */}
                    <TableCell className="px-0 text-center align-middle w-[60px]">
                      {product.image_data ? (
                        <div className="relative">
                          <ImageThumbnail
                            productId={product.id}
                            imageUrl={`/api/products/${product.id}/img?v=${refreshTimestamp}`}
                            imageData={null}
                            alt={product.name}
                            onClick={() => {
                              setSelectedImage(`/api/products/${product.id}/img`);
                              setIsImageViewerOpen(true);
                            }}
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveStorage(product.id, 'image_data');
                                  }}
                                >
                                  <XCircle className="h-3 w-3 text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remove image from database</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ) : (
                        <XCircle className="h-4 w-4 mx-auto text-gray-300" />
                      )}
                    </TableCell>

                    {/* PDF File column */}
                    <TableCell className="px-0 text-center align-middle w-[60px]">
                      {product.pdf_file ? (
                        <div className="relative">
                          <PDFThumbnail
                            pdfUrl={`${product.pdf_file}?v=${refreshTimestamp}`}
                            onClick={() => {
                              setSelectedPdf(product.pdf_file);
                              setIsPdfViewerOpen(true);
                            }}
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveStorage(product.id, 'pdf_file');
                                  }}
                                >
                                  <XCircle className="h-3 w-3 text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remove PDF file</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ) : (
                        <XCircle className="h-4 w-4 mx-auto text-gray-300" />
                      )}
                    </TableCell>

                    {/* PDF DB column */}
                    <TableCell className="px-0 text-center align-middle w-[60px]">
                      {product.pdf_data ? (
                        <div className="relative">
                          <PDFThumbnail
                            pdfUrl={`/api/products/${product.id}/pdf?v=${refreshTimestamp}`}
                            onClick={() => {
                              setSelectedPdf(`/api/products/${product.id}/pdf`);
                              setIsPdfViewerOpen(true);
                            }}
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveStorage(product.id, 'pdf_data');
                                  }}
                                >
                                  <XCircle className="h-3 w-3 text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remove PDF from database</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ) : (
                        <XCircle className="h-4 w-4 mx-auto text-gray-300" />
                      )}
                    </TableCell>

                    {/* Storage URL column */}
                    <TableCell className="px-0 text-center align-middle w-[60px]">
                      {product.storage_url ? (
                        <ExternalUrlThumbnail
                          url={product.storage_url}
                          width={130}
                          height={182}
                          onClick={() => {
                            if (product.storage_url?.match(/\.pdf$/i)) {
                              setSelectedPdf(product.storage_url);
                              setIsPdfViewerOpen(true);
                            } else {
                              setSelectedImage(product.storage_url);
                              setIsImageViewerOpen(true);
                            }
                          }}
                        />
                      ) : (
                        <XCircle className="h-4 w-4 mx-auto text-gray-300" />
                      )}
                    </TableCell>

                    {/* Name & Category column */}
                    <TableCell className="text-center w-[250px]">
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-sm text-gray-700 font-medium">{product.name}</p>
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full max-w-full truncate">
                          {categories?.find(c => c.id === product.category_id)?.name || 'No category'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Description column */}
                    <TableCell className="text-center w-[180px] max-w-[180px] overflow-hidden">
                      <p className="text-sm text-gray-700 truncate" style={{maxWidth: '170px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                        {product.description}
                      </p>
                    </TableCell>

                    {/* Digital Price column */}
                    <TableCell className="text-center w-[80px]">
                      <p className="text-sm font-medium">
                        ${Number(product.price).toFixed(2)}
                      </p>
                    </TableCell>

                    {/* Variants column */}
                    <TableCell className="text-center w-[140px]">
                      {product.has_physical_variant ? (
                        <div className="space-y-1">
                          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-50 text-green-700 border-green-200">
                            Physical
                          </div>
                          <div className="text-xs">
                            <span className="text-sm font-medium">${Number(product.physical_price || 0).toFixed(2)}</span>
                            <br />
                            <span 
                              className={cn(
                                "font-bold text-sm",
                                (product.stock || 0) === 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              )}
                            >
                              {product.stock || 0} in stock
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
                          Digital Only
                        </div>
                      )}
                    </TableCell>

                    {/* Visible column */}
                    <TableCell className="text-center w-[80px]">
                      <div className="flex flex-col items-center gap-1">
                        {/* Hidden status indicator */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                                product.hidden 
                                  ? "bg-red-100 text-red-700 border border-red-300" 
                                  : "bg-green-100 text-green-700 border border-green-300"
                              )}>
                                {product.hidden ? (
                                  <>
                                    <EyeOff className="h-3 w-3 mr-1" />
                                    Hidden
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3 mr-1" />
                                    Visible
                                  </>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{product.hidden ? "Not shown in gallery" : "Shown in gallery"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        {/* Public status indicator (only show if not hidden) */}
                        {!product.hidden && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                                  product.is_public !== false
                                    ? "bg-blue-100 text-blue-700 border border-blue-300" 
                                    : "bg-amber-100 text-amber-700 border border-amber-300"
                                )}>
                                  {product.is_public !== false ? (
                                    <>
                                      <Globe className="h-3 w-3 mr-1" />
                                      Public
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="h-3 w-3 mr-1" />
                                      Private
                                    </>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{product.is_public !== false ? "Visible to all users" : "Visible only to you"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions column */}
                    <TableCell className="text-right px-4 w-[100px]">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => openDownloadDialog(product)}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleEditProduct(product)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="btn-danger h-8 w-8 p-0">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Product</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{product.name}"?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteProductMutation.mutate(product.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleteProductMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Delete"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PDFViewerDialog
        open={isPdfViewerOpen}
        onOpenChange={setIsPdfViewerOpen}
        pdfUrl={selectedPdf}
      />

      <ImageViewerDialog
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
        url={selectedImage}
      />

      {/* Download Storage Selection Dialog */}
      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Download Source</DialogTitle>
            <DialogDescription>
              Select which storage type to download from for &quot;{selectedProductForDownload?.name}&quot;
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {selectedProductForDownload?.image_file && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => downloadFromStorageType(selectedProductForDownload, 'image_file')}
              >
                <FileImage className="mr-2 h-4 w-4" />
                Image File
              </Button>
            )}
            
            {selectedProductForDownload?.image_data && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => downloadFromStorageType(selectedProductForDownload, 'image_data')}
              >
                <FileImage className="mr-2 h-4 w-4" />
                Image Database (Stored in DB)
              </Button>
            )}
            
            {selectedProductForDownload?.pdf_file && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => downloadFromStorageType(selectedProductForDownload, 'pdf_file')}
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF File
              </Button>
            )}
            
            {selectedProductForDownload?.pdf_data && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => downloadFromStorageType(selectedProductForDownload, 'pdf_data')}
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF Database (Stored in DB)
              </Button>
            )}
            
            {selectedProductForDownload?.storage_url && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => downloadFromStorageType(selectedProductForDownload, 'storage_url')}
              >
                <XCircle className="mr-2 h-4 w-4" />
                External Storage URL
              </Button>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setDownloadDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Storage Removal */}
      <AlertDialog
        open={!!storageToRemove}
        onOpenChange={(open) => !open && setStorageToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Storage</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the{" "}
              {storageToRemove ? getStorageLabel(storageToRemove.type) : ""} from
              this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveStorage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
