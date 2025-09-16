import * as z from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SelectProduct } from "@db/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PDFViewerDialog } from "@/components/pdf-viewer-dialog";
import { ImageViewerDialog } from "@/components/image-viewer-dialog";
import { getPdfUrl, checkPdfAvailability } from "@/lib/pdf-worker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ImageThumbnail } from "@/components/image-thumbnail";

// Update the form schema
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
});

// Add these types at the top of the file
type SortConfig = {
  key: string;
  direction: "asc" | "desc";
};

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<SelectProduct | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [pdfAvailable, setPdfAvailable] = useState(false);

  // Add these states
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "name",
    direction: "asc",
  });
  const itemsPerPage = 10;

  // Add a timestamp state to force refreshes
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  
  // Add a state to track failed image loads
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set());

  // Add this after other state declarations (around line 60)
  const [storageToRemove, setStorageToRemove] = useState<{
    productId: number;
    type: "image_file" | "image_data" | "pdf_file" | "pdf_data";
  } | null>(null);

  // Download dialog state
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedProductForDownload, setSelectedProductForDownload] = useState<SelectProduct | null>(null);

  // Download function for digital products (admin)
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
            toast({
              title: "No Content",
              description: "No image file available for this product.",
              variant: "destructive",
            });
            return;
          }
          downloadUrl = product.image_file;
          filename += `.${product.image_file.split('.').pop() || 'jpg'}`;
          break;
          
        case 'image_data':
          if (!product.image_data) {
            toast({
              title: "No Content",
              description: "No image data available for this product.",
              variant: "destructive",
            });
            return;
          }
          downloadUrl = `/api/products/${product.id}/img`;
          filename += '.jpg';
          break;
          
        case 'pdf_file':
          if (!product.pdf_file) {
            toast({
              title: "No Content",
              description: "No PDF file available for this product.",
              variant: "destructive",
            });
            return;
          }
          downloadUrl = product.pdf_file;
          filename += '.pdf';
          break;
          
        case 'pdf_data':
          if (!product.pdf_data) {
            toast({
              title: "No Content",
              description: "No PDF data available for this product.",
              variant: "destructive",
            });
            return;
          }
          downloadUrl = `/api/products/${product.id}/pdf`;
          filename += '.pdf';
          break;
          
        case 'storage_url':
          if (!product.storage_url) {
            toast({
              title: "No Content",
              description: "No storage URL available for this product.",
              variant: "destructive",
            });
            return;
          }
          downloadUrl = product.storage_url;
          const extension = product.storage_url.split('.').pop();
          if (extension && extension.length <= 5) {
            filename += `.${extension}`;
          }
          break;
          
        default:
          toast({
            title: "Invalid Selection",
            description: "Please select a valid storage type.",
            variant: "destructive",
          });
          return;
      }

      // Handle internal API endpoints with fetch (for auth and proper headers)
      if (downloadUrl.startsWith('/api/')) {
        try {
          const response = await fetch(downloadUrl);
          if (!response.ok) {
            throw new Error(`Download failed: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up the object URL
          window.URL.revokeObjectURL(url);
        } catch (fetchError) {
          console.error('API fetch failed:', fetchError);
          throw fetchError;
        }
      } else {
        // For external URLs and direct file URLs, use direct navigation
        // This avoids CORS issues with external storage providers
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Download Started",
        description: `Download of ${product.name} from ${storageType} has been initiated.`,
      });
      
      setDownloadDialogOpen(false);
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: "Download failed. Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (selectedProduct?.id) {
      checkPdfAvailability(selectedProduct.id).then(setPdfAvailable);
    }
  }, [selectedProduct]);

  const { data: products, isLoading } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories } = useQuery<{id: number, name: string, description: string | null}[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      stock: 0,
      category_id: undefined,
      file: null,
      storage_type: "pdf", // Set a default value
      storage_location: "database", // Set a default value
      storage_url: "",
      has_physical_variant: false,
      physical_price: 0,
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
      });
    }
  };

  const handleEditProduct = (product: SelectProduct) => {
    // Determine storage type correctly
    let storageType = "image"; // default to image
    if (product.pdf_data || product.pdf_file) {
      storageType = "pdf";
    }
    
    // Determine storage location correctly
    let storageLocation = "file"; // default to file
    if (product.pdf_data || product.image_data) {
      storageLocation = "database";
    }
    
    console.log("Editing product:", {
      id: product.id,
      name: product.name,
      storage_url: product.storage_url,
      pdf_data: !!product.pdf_data,
      pdf_file: !!product.pdf_file,
      image_data: !!product.image_data,
      image_file: !!product.image_file,
      storage_type: storageType,
      storage_location: storageLocation,
    });
    
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
    });
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const createProductMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/products", formData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      // Clear the failed URLs cache
      setFailedImageUrls(new Set());
      toast({
        title: "Product created",
        description: "The product has been created successfully.",
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

      console.log("Updating product with ID:", selectedProduct.id);
      console.log("FormData contents:");
      for (const pair of formData.entries()) {
        console.log(`${pair[0]}: ${pair[1]}`);
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
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      // Add this line to update the timestamp
      setRefreshTimestamp(Date.now());
      // Clear the failed URLs cache
      setFailedImageUrls(new Set());
      toast({
        title: "Product updated",
        description: "The product has been updated successfully.",
      });
      handleDialogOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Error updating product:", error);
      toast({
        title: "Failed to update product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const res = await apiRequest("DELETE", `/api/products/${productId}`);
      if (!res.ok) {
        const error = await res.json();
        console.log("Delete product error:", error); // Debug log
        throw new Error(error.message, { cause: error });
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      // Clear the failed URLs cache
      setFailedImageUrls(new Set());
      toast({
        title: "Product deleted",
        description: "The product has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      const cause = (error as any).cause;
      console.log("Delete mutation error:", error, "Cause:", cause); // Debug log
      if (cause?.type === "PRODUCT_HAS_ORDERS") {
        toast({
          title: "Cannot Delete Product",
          description:
            "This product has been ordered by customers and cannot be deleted to maintain order history integrity. Consider setting its stock to 0 to prevent future purchases instead.",
          variant: "default",
        });
      } else {
        toast({
          title: "Unable to Delete Product",
          description:
            "There was a problem deleting this product. Please try again.",
          variant: "destructive",
        });
      }
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
          // Try to parse as JSON
          error = JSON.parse(text);
        } catch (e) {
          // If not valid JSON, use text as message
          error = { message: text || "Failed to remove storage" };
        }
        throw new Error(error.message || "Failed to remove storage");
      }
      
      // Handle empty or non-JSON responses
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      } else {
        // Return a simple success object if no JSON is returned
        return { success: true };
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setRefreshTimestamp(Date.now()); // Force re-render
      // Clear the failed URLs cache
      setFailedImageUrls(new Set());
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

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const formData = new FormData();

      if (selectedProduct) {
        // If updating, only include changed fields
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
        
        // Always include storage_url to ensure it's updated correctly
        formData.append("storage_url", data.storage_url || "");
        
        // Handle variant fields
        if (data.has_physical_variant !== selectedProduct.has_physical_variant) {
          formData.append("has_physical_variant", data.has_physical_variant.toString());
        }
        
        if (data.has_physical_variant && Number(data.physical_price || 0) !== Number(selectedProduct.physical_price || 0)) {
          formData.append("physical_price", Number(data.physical_price || 0).toFixed(2));
        }

        // Add a flag if we're switching file types
        const currentType =
          selectedProduct?.pdf_data || selectedProduct?.pdf_file
            ? "pdf"
            : "image";

        console.log("Current product file type:", currentType);
        console.log("Selected storage type:", data.storage_type);
        console.log("Current product state:", {
          id: selectedProduct?.id,
          hasPdfData: !!selectedProduct?.pdf_data,
          hasPdfFile: !!selectedProduct?.pdf_file,
          hasImageData: !!selectedProduct?.image_data,
          hasImageFile: !!selectedProduct?.image_file,
          storage_url: data.storage_url
        });

        // IMPORTANT: Only include storage_type ONCE!
        if (data.file instanceof File) {
          // Include storage_type with the file, but NOT elsewhere
          formData.append("storage_type", data.storage_type);
          formData.append("file", data.file);

          if (data.storage_location) {
            formData.append("storage_location", data.storage_location);
            formData.append(
              "store_as_binary",
              data.storage_location === "database" ? "true" : "false"
            );
          }

          // Add type conversion flags if needed
          if (data.storage_type !== currentType) {
            if (data.storage_type === "pdf") {
              formData.append("clear_image", "true");
            } else {
              formData.append("clear_pdf", "true");
            }
          }
        } else if (data.storage_type !== currentType) {
          // Only include storage_type here if we're changing file type without uploading new file
          formData.append("storage_type", data.storage_type);
          formData.append("convert_to_" + data.storage_type, "true");
        }

        // If form is empty (no changes), add a dummy field
        if ([...formData.entries()].length === 0) {
          formData.append("name", data.name);
        }

        // Debug log
        console.log("Form data entries for update:");
        for (const pair of formData.entries()) {
          console.log(`${pair[0]}: ${pair[1]}`);
        }

        await updateProductMutation.mutateAsync(formData);
      } else {
        // Create product logic (stays the same)
        formData.append("name", data.name);
        formData.append("description", data.description || "");
        formData.append("price", Number(data.price).toFixed(2));
        formData.append("stock", Number(data.stock).toString());
        formData.append("category_id", data.category_id?.toString() || "");
        formData.append("storage_type", data.storage_type);
        formData.append("storage_url", data.storage_url || "");
        
        // Add variant fields
        formData.append("has_physical_variant", data.has_physical_variant.toString());
        if (data.has_physical_variant) {
          formData.append("physical_price", Number(data.physical_price || 0).toFixed(2));
        }

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

  // Add sorting function
  const sortProducts = (products: SelectProduct[]) => {
    return [...products].sort((a, b) => {
      if (!a[sortConfig.key as keyof SelectProduct] || !b[sortConfig.key as keyof SelectProduct])
        return 0;

      const aValue = a[sortConfig.key as keyof SelectProduct];
      const bValue = b[sortConfig.key as keyof SelectProduct];

      if (sortConfig.direction === "asc") {
        return (aValue ?? "") < (bValue ?? "") ? -1 : 1;
      } else {
        return (aValue ?? "") > (bValue ?? "") ? -1 : 1;
      }
    });
  };

  // Add pagination logic
  const paginateProducts = (products: SelectProduct[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return products.slice(startIndex, startIndex + itemsPerPage);
  };

  // Add sort handler
  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Update the SortHeader component to handle alignment better
  const SortHeader = ({
    column,
    label,
    className,
  }: {
    column: string;
    label: string;
    className?: string;
  }) => (
    <TableHead
      className={cn(
        "cursor-pointer hover:bg-slate-100 transition-colors",
        className
      )}
      onClick={() => handleSort(column)}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          className?.includes("text-right")
            ? "justify-end"
            : "justify-start"
        )}
      >
        {label}
        {sortConfig.key === column ? (
          sortConfig.direction === "asc" ? (
            <ChevronUp className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )
        ) : (
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        )}
      </div>
    </TableHead>
  );

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

  // Helper function to get storage type label
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
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
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Product Information Row */}
                <div className="grid grid-cols-3 gap-4">
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
                            {categories?.map((category) => (
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
                
                {/* File Settings and Upload Row */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column - File Settings and Upload */}
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

                    {/* File Upload */}
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
                                      {(value as File)?.name || "Current PDF"}
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
                    </div>

                    {/* Physical Variant Section */}
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

      <div className="space-y-4">
        <div className="w-full flex justify-between items-center mb-3 mt-1 pl-3">
          <div>
            <h3 className="text-lg font-semibold">Products</h3>
            <p className="text-sm text-muted-foreground">
              Manage your product catalog
            </p>
          </div>
          {/* Add your create product button here */}
        </div>

        {/* Add margin to the table container */}
  <div className="border rounded-md mx-3 overflow-x-hidden" style={{maxWidth: '100vw'}}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center w-[30px]">Item</TableHead>
                <TableHead className="px-0 text-center w-[60px]">Image File</TableHead>
                <TableHead className="px-0 text-center w-[60px]">Image DB</TableHead>
                <TableHead className="px-0 text-center w-[60px]">PDF File</TableHead>
                <TableHead className="px-0 text-center w-[60px]">PDF DB</TableHead>
                <TableHead className="px-0 text-center w-[60px]">Storage URL</TableHead>
                <TableHead className="text-center w-[120px]">Name</TableHead>
                <TableHead className="text-center w-[100px]">Category</TableHead>
                <TableHead className="text-center w-[180px]">Description</TableHead>
                <TableHead className="text-center w-[80px]">Digital Price</TableHead>
                <TableHead className="text-center w-[60px]">Physical Stock</TableHead>
                <TableHead className="text-center w-[100px]">Variants</TableHead>
                <TableHead className="text-right px-4 w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products &&
                paginateProducts(sortProducts(products)).map((product, index) => (
                  <TableRow key={product.id}>
                    <TableCell className="text-center align-middle font-medium w-[30px]">
                      {index + 1}
                    </TableCell>
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
                        product.image_data ? null : (
                          product.pdf_file ? null : (
                            product.pdf_data ? null : (
                              <XCircle className="h-4 w-4 mx-auto text-gray-300" />
                            )
                          )
                        )
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
                              setSelectedImage(`/api/products/${product.id}/img?v=${refreshTimestamp}`);
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
                              setSelectedPdf(`${product.pdf_file}?v=${refreshTimestamp}`);
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
                              setSelectedPdf(`/api/products/${product.id}/pdf?v=${refreshTimestamp}`);
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
                    <TableCell className="px-0 text-center align-middle" style={{ width: '130px', height: '182px' }}>
                      {product.storage_url ? (
                        <div className="relative">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="p-0"
                                  style={{ width: '130px', height: '182px' }}
                                  onClick={() => {
                                    // Try to determine if it's an image or a PDF
                                    // First, check if the URL has a common image extension (handle query parameters)
                                    const hasImageExtension = product.storage_url && product.storage_url.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)(\?|$)/i);
                                    
                                    // Second, if it doesn't have a known image extension but has .pdf, it's a PDF
                                    const hasPdfExtension = product.storage_url && product.storage_url.match(/\.(pdf)(\?|$)/i);
                                    
                                    // Third, try to guess by checking if the URL contains image-related keywords
                                    const looksLikeImage = product.storage_url && 
                                      (product.storage_url.includes('image') || 
                                       product.storage_url.includes('img') || 
                                       product.storage_url.includes('photo') ||
                                       product.storage_url.includes('picture'));
                                    
                                    // Determine if we should treat it as an image
                                    const isImage = hasImageExtension || (!hasPdfExtension && looksLikeImage);
                                    
                                    console.log('URL type detection:', {
                                      url: product.storage_url,
                                      hasImageExtension,
                                      hasPdfExtension,
                                      looksLikeImage,
                                      treatAsImage: isImage
                                    });
                                    
                                    // Always use the proxy URL for external URLs
                                    const proxyUrl = `/api/proxy/image?url=${encodeURIComponent(product.storage_url || '')}`;
                                    
                                    if (isImage) {
                                      setSelectedImage(proxyUrl);
                                      setIsImageViewerOpen(true);
                                    } else {
                                      // For PDFs, we try direct URL first
                                      setSelectedPdf(product.storage_url);
                                      setIsPdfViewerOpen(true);
                                    }
                                  }}
                                >
                                  {product.storage_url && (
                                    product.storage_url.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)(\?|$)/i) || 
                                    (!product.storage_url.match(/\.(pdf)(\?|$)/i) && 
                                     (product.storage_url.includes('image') || 
                                      product.storage_url.includes('img') || 
                                      product.storage_url.includes('photo') ||
                                      product.storage_url.includes('picture'))) ? (
                                      <ExternalUrlThumbnail
                                        url={product.storage_url}
                                        onClick={() => {
                                          setSelectedImage(`/api/proxy/image?url=${encodeURIComponent(product.storage_url || '')}`);
                                          setIsImageViewerOpen(true);
                                        }}
                                        width={130}
                                        height={182}
                                        className=""
                                      />
                                    ) : (
                                      <ExternalUrlThumbnail
                                        url={product.storage_url}
                                        onClick={() => {
                                          setSelectedPdf(product.storage_url);
                                          setIsPdfViewerOpen(true);
                                        }}
                                        width={130}
                                        height={182}
                                        className=""
                                      />
                                    )
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={5} className="max-w-md">
                                <div className="text-xs text-left">
                                  <p className="font-semibold">External URL:</p>
                                  <p className="break-all">{product.storage_url}</p>
                                  {product.storage_url.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)(\?|$)/i) || 
                                   (!product.storage_url.match(/\.(pdf)(\?|$)/i) && 
                                    (product.storage_url.includes('image') || 
                                     product.storage_url.includes('img') || 
                                     product.storage_url.includes('photo') ||
                                     product.storage_url.includes('picture'))) ? (
                                    <div className="mt-1">
                                      <p className="text-amber-600 font-medium">
                                        {failedImageUrls.has(product.storage_url || '') ? 
                                          "⚠️ This image could not be loaded." : 
                                          "Click to view full image"}
                                      </p>
                                      {failedImageUrls.has(product.storage_url || '') && (
                                        <ul className="text-gray-500 mt-1 list-disc pl-3 text-[10px]">
                                          <li>The URL might be private or restricted</li>
                                          <li>The image format might not be supported (HEIC/HEIF)</li>
                                          <li>The server might be blocking external access</li>
                                        </ul>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="absolute right-0 top-0 h-4 w-4 rounded-full p-0 bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Create a FormData to update the product
                                    const formData = new FormData();
                                    formData.append("storage_url", "");
                                    
                                    // Set the selected product temporarily so the mutation knows which ID to use
                                    setSelectedProduct(product);
                                    
                                    // Use mutateAsync to ensure we complete the operation before resetting
                                    updateProductMutation.mutateAsync(formData)
                                      .then(() => {
                                        toast({
                                          title: "External URL removed",
                                          description: "The external storage URL has been removed.",
                                        });
                                        // Force refresh of the data
                                        setRefreshTimestamp(Date.now());
                                        // Clear the failed URLs cache
                                        setFailedImageUrls(new Set());
                                      })
                                      .catch(err => {
                                        console.error("Error removing storage URL:", err);
                                        toast({
                                          title: "Error",
                                          description: "Failed to remove external URL. Please try again.",
                                          variant: "destructive",
                                        });
                                      })
                                      .finally(() => {
                                        // Reset selectedProduct to avoid issues with other operations
                                        setSelectedProduct(null);
                                      });
                                  }}
                                >
                                  <XCircle className="h-3 w-3 text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remove Storage URL</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ) : (
                        <XCircle className="h-4 w-4 mx-auto text-gray-300" />
                      )}
                    </TableCell>

                    <TableCell className="text-center w-[120px]">
                      <p className="text-sm text-gray-700">{product.name}</p>
                    </TableCell>
                    <TableCell className="text-center w-[100px]">
                      <p className="text-sm text-gray-700">{(product as any).category_name || 'No category'}</p>
                    </TableCell>
                    <TableCell className="text-center w-[180px] max-w-[180px] overflow-hidden">
                      <p className="text-sm text-gray-700 truncate" style={{maxWidth: '170px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{product.description}</p>
                    </TableCell>
                    <TableCell className="text-center w-[80px]">
                      <p className="table-cell-subtext">
                        ${Number(product.price).toFixed(2)}
                      </p>
                    </TableCell>
                    <TableCell className="text-center w-[60px]">
                      {product.has_physical_variant ? (
                        <p
                          className={cn(
                            "table-cell-subtext",
                            (product.stock || 0) === 0
                              ? "text-red-500"
                              : "text-green-600"
                          )}
                        >
                          {product.stock || 0}
                        </p>
                      ) : (
                        <p className="table-cell-subtext text-gray-400">
                          N/A
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-center w-[100px]">
                      {product.has_physical_variant ? (
                        <div className="space-y-1">
                          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-50 text-green-700 border-green-200">
                            Physical
                          </div>
                          <div className="text-xs text-gray-600">
                            ${Number(product.physical_price || 0).toFixed(2)} / {product.stock || 0} stock
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
                          Digital Only
                        </div>
                      )}
                    </TableCell>
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
                                onClick={() =>
                                  deleteProductMutation.mutate(product.id)
                                }
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
                ))}
            </TableBody>
          </Table>

          {/* Update the pagination container too */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Showing{" "}
              {((currentPage - 1) * itemsPerPage) + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, products?.length || 0)} of{" "}
              {products?.length || 0} products
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(
                      Math.ceil((products?.length || 0) / itemsPerPage),
                      p + 1
                    )
                  )}
                disabled={
                  currentPage === Math.ceil((products?.length || 0) / itemsPerPage)
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
    </div>
  );
}
