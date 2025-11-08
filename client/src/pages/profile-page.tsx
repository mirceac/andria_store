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
  X,
  Download,
  User,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
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
  hidden: z.boolean().default(false),
});

export default function ProfilePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<SelectProduct | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());

  // Redirect if not authenticated
  if (!user) {
    setTimeout(() => navigate("/auth"), 0);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  const { data: products, isLoading } = useQuery<SelectProduct[]>({
    queryKey: [`/api/users/${user.id}/products`],
  });

  const { data: categories } = useQuery<{id: number, name: string, description: string | null, parent_id: number | null, created_at: string}[]>({
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
      storage_type: "pdf",
      storage_location: "database",
      storage_url: "",
      has_physical_variant: false,
      physical_price: 0,
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
        if (data.hidden !== (selectedProduct.hidden || false)) {
          formData.append("hidden", data.hidden.toString());
        }

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
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8" />
            My Products
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal product collection
          </p>
        </div>
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
                {/* Basic Product Information */}
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
                            <FormLabel>Storage</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select storage" />
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
                    
                    <div>
                      <Label>External URL</Label>
                      <Input
                        {...form.register("storage_url")}
                        placeholder="https://example.com/file.jpg"
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
                  
                  <div className="space-y-4">
                    {/* Physical Variant */}
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
                    
                    {/* Hidden Field */}
                    <div className="space-y-3 border rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <FormField
                          control={form.control}
                          name="hidden"
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
                                Hide from gallery
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
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
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[130px]">Preview</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products && products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No products yet. Click "Add Product" to create your first product!
                  </TableCell>
                </TableRow>
              ) : (
                products?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
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
                      ) : product.pdf_file ? (
                        <PDFThumbnail
                          pdfUrl={`${product.pdf_file}?v=${refreshTimestamp}`}
                          onClick={() => {
                            setSelectedPdf(product.pdf_file);
                            setIsPdfViewerOpen(true);
                          }}
                        />
                      ) : product.pdf_data ? (
                        <PDFThumbnail
                          pdfUrl={`/api/products/${product.id}/pdf?v=${refreshTimestamp}`}
                          onClick={() => {
                            setSelectedPdf(`/api/products/${product.id}/pdf`);
                            setIsPdfViewerOpen(true);
                          }}
                        />
                      ) : product.image_file ? (
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
                      ) : product.image_data ? (
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
                      ) : (
                        <div className="w-[130px] h-[182px] bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-400">No media</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{product.description}</TableCell>
                    <TableCell className="text-right">${Number(product.price).toFixed(2)}</TableCell>
                    <TableCell className="text-center">{product.stock}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" className="text-destructive">
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
    </div>
  );
}
