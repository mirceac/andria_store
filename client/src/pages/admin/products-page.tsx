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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Trash2, Loader2, FileText, ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
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
import { ImageThumbnail } from "@/components/ui/image-thumbnail";

// Update the form schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  stock: z.coerce.number().min(0, "Stock must be non-negative").int(),
  file: z.custom<File | string | null>(),
  storage_type: z.enum(["pdf", "image"]),
  storage_location: z.enum(["database", "file"]).optional(),
});

// Add these types at the top of the file
type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
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
    key: 'name', 
    direction: 'asc' 
  });
  const itemsPerPage = 10;

  useEffect(() => {
    if (selectedProduct?.id) {
      checkPdfAvailability(selectedProduct.id).then(setPdfAvailable);
    }
  }, [selectedProduct]);

  const { data: products, isLoading } = useQuery<SelectProduct[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      stock: 0,
      file: null,
      storage_type: "pdf", // Set a default value
      storage_location: "database", // Set a default value
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
        file: null,
        storage_type: "pdf",
        storage_location: "database"
      });
    }
  };

  const handleEditProduct = (product: SelectProduct) => {
    form.reset({
      name: product.name,
      description: product.description || "",
      price: Number(product.price),
      stock: product.stock,
      file: "",
      storage_type: product.pdf_data ? "pdf" : "image",
      storage_location: product.pdf_data || product.image_data ? "database" : "file"
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
    mutationFn: async (data: any) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === "file") {
          if (value instanceof File) {
            formData.append("file", value);
            formData.append(
              "store_as_binary",
              data.storage_type === "pdf" ? "true" : "false"
            );
          } else if (typeof value === "string" && value !== "") {
            // Keep existing file path if no new file is uploaded
            formData.append(key, value);
          }
        } else if (key !== "storage_type" && value !== null) {
          formData.append(key, String(value));
        }
      });

      const res = await apiRequest(
        "PATCH",
        `/api/products/${selectedProduct?.id}`,
        formData
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Product updated",
        description: "The product has been updated successfully.",
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
        console.log("Delete product error:", error); // Debug log
        throw new Error(error.message, { cause: error });
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
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

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const formData = new FormData();
      
      // Convert price and stock to valid numbers
      const price = Number(data.price);
      const stock = Number(data.stock);

      if (Number.isNaN(price) || Number.isNaN(stock)) {
        throw new Error("Invalid price or stock value");
      }

      // Append basic fields
      formData.append("name", data.name);
      formData.append("description", data.description || "");
      formData.append("price", price.toFixed(2));
      formData.append("stock", stock.toString());
      formData.append("storage_type", data.storage_type);
      if (data.storage_location !== undefined) {
        formData.append("storage_location", data.storage_location);
      }

      // Handle file upload
      if (data.file instanceof File) {
        formData.append("file", data.file);
        formData.append("store_as_binary", data.storage_location === "database" ? "true" : "false");
      }

      // Debug log
      console.log('Form data entries:');
      for (const pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      if (selectedProduct) {
        await updateProductMutation.mutateAsync(formData);
      } else {
        await createProductMutation.mutateAsync(formData);
      }
      
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit form",
        variant: "destructive",
      });
    }
  };

  // Add sorting function
  const sortProducts = (products: SelectProduct[]) => {
    return [...products].sort((a, b) => {
      if (!a[sortConfig.key as keyof SelectProduct] || !b[sortConfig.key as keyof SelectProduct]) return 0;
      
      const aValue = a[sortConfig.key as keyof SelectProduct];
      const bValue = b[sortConfig.key as keyof SelectProduct];
      
      if (sortConfig.direction === 'asc') {
        return (aValue ?? '') < (bValue ?? '') ? -1 : 1;
      } else {
        return (aValue ?? '') > (bValue ?? '') ? -1 : 1;
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
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Update the SortHeader component to handle alignment better
  const SortHeader = ({ column, label, className }: { column: string, label: string, className?: string }) => (
    <TableHead 
      className={cn("cursor-pointer hover:bg-slate-100 transition-colors", className)}
      onClick={() => handleSort(column)}
    >
      <div className={cn(
        "flex items-center gap-2",
        className?.includes("text-right") ? "justify-end" : "justify-start"
      )}>
        {label}
        {sortConfig.key === column ? (
          sortConfig.direction === 'asc' ? (
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
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
                  name="storage_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>File Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                <FormField
                  control={form.control}
                  name="file"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch("storage_type") === "pdf" ? "PDF Document" : "Product Image"}
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-2 border rounded-lg p-4">
                          {value && (
                            form.watch("storage_type") === "image" ? (
                              <div className="w-32 h-32 relative mb-2">
                                <img
                                  src={typeof value === "string" ? value : URL.createObjectURL(value as File)}
                                  alt="Preview"
                                  className="object-cover rounded-md w-full h-full"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-5 w-5" />
                                <span className="text-sm">{(value as File)?.name || "Current PDF"}</span>
                              </div>
                            )
                          )}
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept={form.watch("storage_type") === "pdf" ? ".pdf" : ".jpg,.jpeg,.png"}
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
                <div className="flex gap-2">
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
            <h3 className="table-title">Products</h3>
            <p className="table-subtitle">Manage your product catalog</p>
          </div>
          {/* Add your create product button here */}
        </div>

        <div className="table-container">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Image</TableHead>
                <TableHead className="w-[100px]">PDF</TableHead>
                <SortHeader column="name" label="Name" className="w-[300px]" />
                <SortHeader column="description" label="Description" className="w-[300px]" />
                <SortHeader column="price" label="Price" className="w-[120px]" />
                <SortHeader column="stock" label="Stock" className="w-[100px]" />
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products && paginateProducts(sortProducts(products)).map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="px-2 text-center align-middle">
                    <ImageThumbnail 
                      productId={product.id}
                      imageUrl={product.image_file} 
                      imageData={product.image_data}
                      alt={product.name}
                      onClick={() => {
                        if (product.image_data) {
                          setSelectedImage(`/api/products/${product.id}/img`);
                        } else if (product.image_file) {
                          setSelectedImage(product.image_file);
                        }
                        setIsImageViewerOpen(true);
                      }}
                    />
                  </TableCell>
                  <TableCell className="pl-0 align-middle">
                    <PDFThumbnail
                      pdfUrl={getPdfUrl(product.id)}
                      onClick={() => {
                        setSelectedPdf(getPdfUrl(product.id));
                        setIsPdfViewerOpen(true);
                      }}
                    />
                  </TableCell>
                  <TableCell className="w-[300px]">
                    <p className="table-cell-text">{product.name}</p>
                  </TableCell>
                  <TableCell className="w-[300px]">
                    <p className="table-cell-text truncate">{product.description}</p>
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <p className="table-cell-subtext">
                      ${product.price.toFixed(2)}
                    </p>
                  </TableCell>
                  <TableCell className="w-[100px]">
                    <p className={cn(
                      "table-cell-subtext",
                      product.stock === 0 ? "text-red-500" : "text-green-600"
                    )}>
                      {product.stock}
                    </p>
                  </TableCell>
                  <TableCell className="w-[100px] text-right">
                    <div className="flex items-center justify-end gap-2">
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
          
          {/* Add pagination controls */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, products?.length || 0)} of {products?.length || 0} products
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil((products?.length || 0) / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil((products?.length || 0) / itemsPerPage)}
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
    </div>
  );
}