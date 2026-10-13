import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  Tag,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCategories, Category } from "@/contexts/CategoriesContext";
import { useAuth } from "@/contexts/AuthContext";

const AdminCategories = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
  } = useCategories();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  const [newSubcategory, setNewSubcategory] = useState<{
    categoryId: string;
    name: string;
  } | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<{
    categoryId: string;
    oldName: string;
    newName: string;
  } | null>(null);

  const [deleteDialog, setDeleteDialog] = useState<{
    type: "category" | "subcategory";
    categoryId: string;
    subcategory?: string;
  } | null>(null);

  if (!isAuthenticated || !user?.isAdmin || user.isDisabled) {
    const isDisabledCopy = !!user?.isDisabled;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">
            {isDisabledCopy
              ? "Admin Account Disabled"
              : "Admin Access Required"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {isDisabledCopy
              ? "This admin account is disabled. Contact a super admin for help."
              : "You need admin privileges to manage categories."}
          </p>
          {!isDisabledCopy && (
            <Button onClick={() => navigate("/login")} className="btn-primary">
              Sign In as Admin
            </Button>
          )}
        </div>
      </div>
    );
  }

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
      setNewCategoryName("");
    }
  };

  const handleStartEditCategory = (category: Category) => {
    setEditingCategory(category.id);
    setEditCategoryName(category.name);
  };

  const handleSaveCategory = (id: string) => {
    if (editCategoryName.trim()) {
      updateCategory(id, editCategoryName.trim());
    }
    setEditingCategory(null);
    setEditCategoryName("");
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryName("");
  };

  const handleAddSubcategory = (categoryId: string) => {
    if (newSubcategory?.name.trim()) {
      addSubcategory(categoryId, newSubcategory.name.trim());
      setNewSubcategory(null);
    }
  };

  const handleStartEditSubcategory = (
    categoryId: string,
    subcategory: string
  ) => {
    setEditingSubcategory({
      categoryId,
      oldName: subcategory,
      newName: subcategory,
    });
  };

  const handleSaveSubcategory = () => {
    if (editingSubcategory && editingSubcategory.newName.trim()) {
      updateSubcategory(
        editingSubcategory.categoryId,
        editingSubcategory.oldName,
        editingSubcategory.newName.trim()
      );
    }
    setEditingSubcategory(null);
  };

  const handleCancelEditSubcategory = () => {
    setEditingSubcategory(null);
  };

  const handleConfirmDelete = () => {
    if (deleteDialog) {
      if (deleteDialog.type === "category") {
        deleteCategory(deleteDialog.categoryId);
      } else if (deleteDialog.subcategory) {
        deleteSubcategory(deleteDialog.categoryId, deleteDialog.subcategory);
      }
      setDeleteDialog(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Manage Categories</h1>
              <p className="text-muted-foreground">
                Add, edit, and organize product categories and subcategories
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Add New Category */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter category name..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                className="max-w-md"
              />
              <Button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Categories List */}
        <div className="grid gap-6">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    {editingCategory === category.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleSaveCategory(category.id);
                            if (e.key === "Escape") handleCancelEditCategory();
                          }}
                          className="w-48"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSaveCategory(category.id)}
                        >
                          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleCancelEditCategory}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <CardTitle className="text-xl">{category.name}</CardTitle>
                    )}
                    <Badge variant="secondary">
                      {category.subcategories.length} subcategories
                    </Badge>
                  </div>
                  {editingCategory !== category.id && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEditCategory(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDeleteDialog({
                            type: "category",
                            categoryId: category.id,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {category.subcategories.map((subcategory) => (
                      <div
                        key={subcategory}
                        className="flex items-center gap-1"
                      >
                        {editingSubcategory?.categoryId === category.id &&
                        editingSubcategory.oldName === subcategory ? (
                          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                            <Input
                              value={editingSubcategory.newName}
                              onChange={(e) =>
                                setEditingSubcategory({
                                  ...editingSubcategory,
                                  newName: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveSubcategory();
                                if (e.key === "Escape")
                                  handleCancelEditSubcategory();
                              }}
                              className="h-7 w-32 text-sm"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={handleSaveSubcategory}
                            >
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={handleCancelEditSubcategory}
                            >
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 pr-1"
                          >
                            <Tag className="h-3 w-3" />
                            {subcategory}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 ml-1 hover:bg-muted"
                              onClick={() =>
                                handleStartEditSubcategory(
                                  category.id,
                                  subcategory
                                )
                              }
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 hover:bg-destructive/10"
                              onClick={() =>
                                setDeleteDialog({
                                  type: "subcategory",
                                  categoryId: category.id,
                                  subcategory,
                                })
                              }
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Subcategory */}
                  {newSubcategory?.categoryId === category.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter subcategory name..."
                        value={newSubcategory.name}
                        onChange={(e) =>
                          setNewSubcategory({
                            ...newSubcategory,
                            name: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            handleAddSubcategory(category.id);
                          if (e.key === "Escape") setNewSubcategory(null);
                        }}
                        className="max-w-xs"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddSubcategory(category.id)}
                        disabled={!newSubcategory.name.trim()}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setNewSubcategory(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNewSubcategory({ categoryId: category.id, name: "" })
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Subcategory
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {categories.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No categories yet. Add your first category above.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteDialog}
        onOpenChange={() => setDeleteDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {deleteDialog?.type === "category" ? "Category" : "Subcategory"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog?.type === "category"
                ? "This will delete the category and all its subcategories. Products using this category may be affected."
                : "This will remove the subcategory. Products using this subcategory may be affected."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCategories;
