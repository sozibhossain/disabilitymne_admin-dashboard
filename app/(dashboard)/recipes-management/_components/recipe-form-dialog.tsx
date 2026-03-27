"use client";

import { Plus, X } from "lucide-react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Recipe } from "@/lib/api";

import { HowToPrepareEditor, normalizeEditorHtml } from "./how-to-prepare-editor";

export type RecipeFormState = {
  recipeName: string;
  durationMinutes: string;
  recipeType: string;
  userType: "normal_user" | "premium_user";
  assignedUser: string;
  howToPrepare: string;
  ingredients: string[];
  recipeImage: string;
  caloriesKcal: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  status: "published" | "draft" | "archived";
};

type PremiumUserOption = {
  id: string;
  firstName: string;
  email: string;
};

type RecipeFormDialogProps = {
  open: boolean;
  selectedRecipe: Recipe | null;
  formData: RecipeFormState;
  ingredientInput: string;
  howToPrepareEditor: string;
  premiumUsers: PremiumUserOption[];
  recipeImagePreview: string | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setFormData: Dispatch<SetStateAction<RecipeFormState>>;
  setIngredientInput: (value: string) => void;
  setRecipeImageFile: (file: File | null) => void;
  addIngredients: (rawValue: string) => void;
  removeIngredient: (ingredient: string) => void;
  setHowToPrepareEditor: (value: string) => void;
};

export function RecipeFormDialog({
  open,
  selectedRecipe,
  formData,
  ingredientInput,
  howToPrepareEditor,
  premiumUsers,
  recipeImagePreview,
  isSaving,
  onClose,
  onSubmit,
  setFormData,
  setIngredientInput,
  setRecipeImageFile,
  addIngredients,
  removeIngredient,
  setHowToPrepareEditor,
}: RecipeFormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] p-0 sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="px-6 pb-4 pt-6">
          <DialogTitle className="pr-8 text-3xl font-semibold text-slate-100">
            {selectedRecipe ? "Edit Recipe" : "Add New Recipes"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(90vh-7rem)] overflow-y-auto px-6 pb-6 pr-4">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Recipes Name</Label>
                <Input
                  value={formData.recipeName}
                  onChange={(event) => setFormData((prev) => ({ ...prev, recipeName: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>User type</Label>
                <Select
                  value={formData.userType}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      userType: event.target.value as RecipeFormState["userType"],
                      assignedUser: event.target.value === "premium_user" ? prev.assignedUser : "",
                    }))
                  }
                >
                  <option value="normal_user">Normal user</option>
                  <option value="premium_user">Premium user</option>
                </Select>
              </div>
              {formData.userType === "premium_user" ? (
                <div className="space-y-2 md:col-span-2">
                  <Label>Assigned Premium User</Label>
                  <Select
                    value={formData.assignedUser}
                    onChange={(event) => setFormData((prev) => ({ ...prev, assignedUser: event.target.value }))}
                    required
                  >
                    <option value="">Select premium user</option>
                    {premiumUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} ({user.email})
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Recipes Duration (Minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.durationMinutes}
                  onChange={(event) => setFormData((prev) => ({ ...prev, durationMinutes: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Recipes Type</Label>
                <Select
                  value={formData.recipeType}
                  onChange={(event) => setFormData((prev) => ({ ...prev, recipeType: event.target.value }))}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                  <option value="meal">Meal</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>How to prepare a meal</Label>
                <div className="recipe-quill rounded-md">
                  <HowToPrepareEditor
                    value={howToPrepareEditor}
                    placeholder="Write preparation steps..."
                    onChange={({ html }) => {
                      const normalizedHtml = normalizeEditorHtml(html);
                      setHowToPrepareEditor(html);
                      setFormData((prev) => ({
                        ...prev,
                        howToPrepare: normalizedHtml,
                      }));
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Ingredients</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Type ingredient and press Enter or +"
                    value={ingredientInput}
                    onChange={(event) => setIngredientInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === ",") {
                        event.preventDefault();
                        addIngredients(ingredientInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-3"
                    onClick={() => addIngredients(ingredientInput)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.ingredients.map((ingredient) => (
                    <span
                      key={ingredient}
                      className="inline-flex items-center gap-1 rounded-full border border-[#7fb9e6a1] bg-[#143559] px-3 py-1 text-xs text-slate-100"
                    >
                      {ingredient}
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full p-0.5 text-slate-200 transition-colors hover:bg-white/15 hover:text-white"
                        onClick={() => removeIngredient(ingredient)}
                        aria-label={`Remove ingredient ${ingredient}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {formData.ingredients.length === 0 ? (
                  <p className="text-xs text-slate-300">Add at least one ingredient.</p>
                ) : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Recipe Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setRecipeImageFile(event.target.files?.[0] || null)}
                  required={!selectedRecipe}
                />
                {recipeImagePreview || formData.recipeImage ? (
                  <img
                    src={recipeImagePreview || formData.recipeImage}
                    alt="Recipe preview"
                    className="h-40 w-full rounded-lg object-cover"
                  />
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Calories (kcal)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.caloriesKcal}
                  onChange={(event) => setFormData((prev) => ({ ...prev, caloriesKcal: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Protein (g)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.proteinG}
                  onChange={(event) => setFormData((prev) => ({ ...prev, proteinG: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Carbs (g)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.carbsG}
                  onChange={(event) => setFormData((prev) => ({ ...prev, carbsG: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Fat (g)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.fatG}
                  onChange={(event) => setFormData((prev) => ({ ...prev, fatG: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, status: event.target.value as RecipeFormState["status"] }))
                  }
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Saving..."
                  : selectedRecipe
                    ? "Save"
                    : "Add Recipe"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
