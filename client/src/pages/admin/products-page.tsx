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
import { Plus, Pencil, Trash2, Loader2, FileText, ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { PDFViewerDialog } from "@/components/pdf-viewer-dialog";
import { getPdfUrl, checkPdfAvailability } from "@/lib/pdf-worker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PDFThumbnail } from "@/components/pdf-thumbnail";
import { cn } from "@/lib/utils";

// Update the form schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  stock: z.number().min(0, "Stock must be positive"),
  pdf_file: z.custom<File | string | null>(), // Allow File, string, or null
  storage_type: z.enum(["database", "file"]),
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
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
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
      pdf_file: null as null, // Explicitly type as null
      storage_type: "database" as const,
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
        pdf_file: "", // Changed from image_url
        storage_type: "database",
      });
    }
  };

  const handleEditProduct = (product: SelectProduct) => {
    form.reset({
      name: product.name,
      description: product.description || "",
      price: Number(product.price),
      stock: product.stock,
      pdf_file: "",
      storage_type: product.pdf_data ? "database" : "file",
    });
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === "pdf_file" && value instanceof File) {
          formData.append("pdf_file", value);
          formData.append(
            "store_as_binary",
            data.storage_type === "database" ? "true" : "false"
          );
        } else if (key !== "storage_type" && value !== null) {
          formData.append(key, String(value));
        }
      });

      const res = await apiRequest("POST", "/api/products", formData);
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
        if (key === "pdf_file") {
          if (value instanceof File) {
            formData.append("pdf_file", value);
            formData.append(
              "store_as_binary",
              data.storage_type === "database" ? "true" : "false"
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

  const onSubmit = (data: any) => {
    if (selectedProduct) {
      updateProductMutation.mutate(data);
    } else {
      createProductMutation.mutate(data);
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
    <div className="container mx-auto px-4 py-8">
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
                    <FormItem className="space-y-3">
                      <FormLabel>PDF Storage Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="database" id="database" />
                            <Label htmlFor="database">
                              Store in Database (Better for small PDFs)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="file" id="file" />
                            <Label htmlFor="file">
                              Store as File (Better for large PDFs)
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pdf_file"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormControl>
                        <div className="space-y-2">
                          {(selectedProduct?.pdf_data || pdfAvailable) && (
                            <Button
                              type="button"
                              className="btn-success"
                              onClick={() => {
                                if (selectedProduct) {
                                  setSelectedPdf(getPdfUrl(selectedProduct.id));
                                }
                                setIsPdfViewerOpen(true);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Current PDF
                            </Button>
                          )}
                          <Input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                onChange(file);
                              }
                            }}
                            {...field}
                          />
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
                <TableHead className="w-[100px]">PDF</TableHead>
                <SortHeader column="name" label="Name" className="w-[300px]" />
                <SortHeader column="price" label="Price" className="w-[120px]" />
                <SortHeader column="stock" label="Stock" className="w-[100px]" />
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products && paginateProducts(sortProducts(products)).map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="w-[100px]">
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
    </div>
  );
}