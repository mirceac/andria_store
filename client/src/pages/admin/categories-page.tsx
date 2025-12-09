import React, { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Edit, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Category = {
  id: number;
  name: string;
  description: string | null;
  parent_id: number | null;
  user_id: number | null;
  username: string | null;
  is_public: boolean;
  hidden: boolean;
  created_at: string;
};

export default function CategoriesPage() {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: '',
    is_public: true,
    hidden: false,
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  // Fetch categories using React Query
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Helper types for hierarchy
  type CategoryWithChildren = Category & { children: CategoryWithChildren[] };
  type CategoryWithLevel = Category & { level: number };

  // Helper function to build hierarchical structure
  const buildCategoryTree = (categories: Category[]): CategoryWithChildren[] => {
    const categoryMap = new Map<number, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];
    
    // First pass: create map of all categories with children array
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });
    
    // Second pass: build hierarchy
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!;
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(categoryWithChildren);
        }
      } else {
        rootCategories.push(categoryWithChildren);
      }
    });
    
    return rootCategories;
  };

  // Helper function to flatten hierarchy for display
  const flattenCategories = (categories: CategoryWithChildren[], level = 0): CategoryWithLevel[] => {
    const result: CategoryWithLevel[] = [];
    
    categories.forEach(category => {
      result.push({ ...category, level });
      if (category.children.length > 0) {
        result.push(...flattenCategories(category.children, level + 1));
      }
    });
    
    return result;
  };

  const hierarchicalCategories = flattenCategories(buildCategoryTree(categories));

  // Mutation for creating/updating categories
  const saveCategoryMutation = useMutation({
    mutationFn: async (data: { url: string; method: string; body: any }) => {
      const response = await fetch(data.url, {
        method: data.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.body),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save category');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all category queries to refresh everywhere
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories/tree'] });
      toast({
        title: 'Success',
        description: `Category ${editingCategory ? 'updated' : 'created'} successfully`,
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation for deleting categories
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete category');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all category queries to refresh everywhere
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories/tree'] });
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
    const method = editingCategory ? 'PUT' : 'POST';

    // Prepare the data with proper parent_id handling
    const submitData = {
      name: formData.name,
      description: formData.description,
      parent_id: formData.parent_id && formData.parent_id !== "none" ? parseInt(formData.parent_id) : null,
      is_public: formData.is_public,
      hidden: formData.hidden,
    };

    saveCategoryMutation.mutate({ url, method, body: submitData });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id ? category.parent_id.toString() : 'none',
      is_public: category.is_public ?? true,
      hidden: category.hidden ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: number) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    deleteCategoryMutation.mutate(categoryId);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', parent_id: 'none', is_public: true, hidden: false });
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className={`container mx-auto ${isMobile ? 'px-1 py-3' : 'ml-16 p-6'}`}>
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-center'} mb-6`}>
        <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>Category Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </DialogTitle>
              <DialogDescription>
                {editingCategory 
                  ? 'Update the category details below.'
                  : 'Fill in the details to create a new category.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Category name"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="parent_id">Parent Category</Label>
                  <Select
                    value={formData.parent_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, parent_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Parent (Root Category)</SelectItem>
                      {categories
                        .filter(cat => editingCategory ? cat.id !== editingCategory.id : true)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_public"
                      checked={formData.is_public}
                      onChange={(e) =>
                        setFormData({ ...formData, is_public: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="is_public" className="font-normal cursor-pointer">
                      Public Category (visible to all users)
                    </Label>
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hidden"
                      checked={formData.hidden}
                      onChange={(e) =>
                        setFormData({ ...formData, hidden: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="hidden" className="font-normal cursor-pointer">
                      Hide from gallery
                    </Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saveCategoryMutation.isPending}>
                  {saveCategoryMutation.isPending ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {hierarchicalCategories.map((category) => (
          <Card key={category.id} className={`${category.level > 0 ? 'ml-4 sm:ml-8' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 gap-2">
              <CardTitle className="text-lg font-semibold flex items-center flex-1 min-w-0">
                {category.level > 0 && (
                  <span className="text-gray-400 mr-2 flex-shrink-0">
                    {'├─'.repeat(category.level)}
                  </span>
                )}
                <button
                  onClick={() => setLocation(`/admin/products?category=${category.id}`)}
                  className="text-blue-600 hover:text-blue-800 hover:underline transition-colors text-left truncate"
                >
                  {category.name}
                </button>
                {category.level > 0 && (
                  <span className="text-sm text-gray-500 ml-2 hidden sm:inline">
                    (Child of: {categories.find(c => c.id === category.parent_id)?.name})
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(category)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(category.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-2">
                {!category.is_public && (
                  <Badge variant="secondary">Private</Badge>
                )}
                {category.is_public && (
                  <Badge variant="default">Public</Badge>
                )}
                {category.hidden && (
                  <Badge variant="destructive">Hidden</Badge>
                )}
                {category.user_id ? (
                  <Badge variant="outline">Created by: {category.username || `User ID ${category.user_id}`}</Badge>
                ) : (
                  <Badge variant="outline">Created by: System</Badge>
                )}
              </div>
              {category.description && (
                <p className="text-gray-600 mb-2">{category.description}</p>
              )}
              <p className="text-sm text-gray-500">
                Created: {new Date(category.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
        
        {categories.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No categories found. Create your first category to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}