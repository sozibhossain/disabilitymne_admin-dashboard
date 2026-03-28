"use client";

import { Check, SquarePen, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  getErrorMessage,
  getSubscriptionPlans,
  updateSubscriptionPlan,
  type SubscriptionPlan,
} from "@/lib/api";

const defaultForm = {
  key: "monthly",
  name: "",
  price: "29.99",
  currency: "USD",
  durationLabel: "1 month",
  durationMonths: "1",
  trialDays: "0",
  features: "",
};

const planThemeByKey: Record<string, { border: string; price: string; check: string }> = {
  annual: {
    border: "border-[#2cd46d]",
    price: "text-[#2cd46d]",
    check: "text-[#2cd46d]",
  },
  monthly: {
    border: "border-[#1f97ff]",
    price: "text-[#1f97ff]",
    check: "text-[#1f97ff]",
  },
  quarterly: {
    border: "border-[#ffcb00]",
    price: "text-[#ffcb00]",
    check: "text-[#ffcb00]",
  },
  premium: {
    border: "border-[#ff9f31]",
    price: "text-[#ff9f31]",
    check: "text-[#ff9f31]",
  },
};

const planDefaultsByKey: Record<string, Pick<typeof defaultForm, "name" | "price" | "durationLabel" | "durationMonths">> = {
  monthly: {
    name: "Monthly Plan",
    price: "29.99",
    durationLabel: "1 month",
    durationMonths: "1",
  },
  quarterly: {
    name: "Quarterly Plan",
    price: "149.99",
    durationLabel: "3 months",
    durationMonths: "3",
  },
  annual: {
    name: "Annual Plan",
    price: "144",
    durationLabel: "12 months",
    durationMonths: "12",
  },
  premium: {
    name: "Premium Plan",
    price: "150",
    durationLabel: "1 month",
    durationMonths: "1",
  },
};

export default function SubscriptionManagementPage() {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formData, setFormData] = useState(defaultForm);

  const plansQuery = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => getSubscriptionPlans(true),
  });

  const createMutation = useMutation({
    mutationFn: createSubscriptionPlan,
    onSuccess: () => {
      toast.success("Plan created.");
      setFormOpen(false);
      setFormData(defaultForm);
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: Parameters<typeof updateSubscriptionPlan>[1] }) =>
      updateSubscriptionPlan(key, payload),
    onSuccess: () => {
      toast.success("Plan updated.");
      setFormOpen(false);
      setSelectedPlan(null);
      setFormData(defaultForm);
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubscriptionPlan,
    onSuccess: () => {
      toast.success("Plan deleted.");
      setDeleteOpen(false);
      setSelectedPlan(null);
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const plans = useMemo(() => (plansQuery.data || []).filter((plan) => plan.isActive), [plansQuery.data]);

  const onOpenEdit = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setFormData({
      key: plan.key,
      name: plan.name,
      price: String(plan.price),
      currency: plan.currency,
      durationLabel: plan.durationLabel,
      durationMonths: String(plan.durationMonths),
      trialDays: String(plan.trialDays),
      features: (plan.features || []).join("\n"),
    });
    setFormOpen(true);
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      key: formData.key as "monthly" | "quarterly" | "annual" | "premium",
      name: formData.name,
      price: Number(formData.price),
      currency: formData.currency,
      durationLabel: formData.durationLabel,
      durationMonths: Number(formData.durationMonths),
      trialDays: Number(formData.trialDays),
      features: formData.features
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    };

    if (selectedPlan) {
      updateMutation.mutate({ key: selectedPlan.key, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-5">
      <PageTitle title="Subscription Management" breadcrumb="Dashboard  >  Subscription Management" />

      {plansQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          <Card><CardContent className="h-40" /></Card>
          <Card><CardContent className="h-40" /></Card>
          <Card><CardContent className="h-40" /></Card>
        </div>
      ) : plans.length === 0 ? (
        <EmptyState title="No plans" description="Create your first plan." />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {plans.map((plan) => {
            const theme = planThemeByKey[plan.key] || planThemeByKey.monthly;
            const priceLabel = `${Number(plan.price || 0).toFixed(2)}$`;

            return (
              <Card key={plan.key} className={`border ${theme.border}`}>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-3xl font-semibold text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-300">{plan.durationLabel}</p>
                    </div>
                    <div className="flex flex-col items-end gap-3 text-right">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-full bg-[#22bf61] text-white transition-colors hover:bg-[#2cd46d]"
                          onClick={() => onOpenEdit(plan)}
                          aria-label="Edit plan"
                        >
                          <SquarePen className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex size-8 items-center justify-center rounded-full bg-[#ff2f5f] text-white transition-colors hover:bg-[#ff416f]"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setDeleteOpen(true);
                          }}
                          aria-label="Delete plan"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <p className={`text-4xl font-bold ${theme.price}`}>{priceLabel}</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-100">
                    {(plan.features || []).map((feature) => (
                      <li key={`${plan.key}-${feature}`} className="flex items-start gap-2">
                        <Check className={`mt-0.5 size-4 ${theme.check}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedPlan(null);
        }}
        title={selectedPlan ? `Edit ${selectedPlan.name}` : "Add Subscription Plan"}
      >
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Plan Key</Label>
              <Select
                value={formData.key}
                disabled={Boolean(selectedPlan)}
                onChange={(event) =>
                  setFormData((prev) => {
                    const nextKey = event.target.value;
                    const defaults = planDefaultsByKey[nextKey];
                    if (!defaults) {
                      return { ...prev, key: nextKey };
                    }

                    return {
                      ...prev,
                      key: nextKey,
                      ...defaults,
                      trialDays: "0",
                    };
                  })
                }
              >
                <option value="monthly">Monthly Plan</option>
                <option value="quarterly">Quarterly Plan</option>
                <option value="annual">Annual Plan</option>
                <option value="premium">Premium Plan</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Plan Price</Label>
              <Input
                type="number"
                min={0}
                value={formData.price}
                onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={formData.currency}
                onChange={(event) => setFormData((prev) => ({ ...prev, currency: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Plan Duration Label</Label>
              <Input
                value={formData.durationLabel}
                onChange={(event) => setFormData((prev) => ({ ...prev, durationLabel: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Duration Months</Label>
              <Input
                type="number"
                min={0}
                value={formData.durationMonths}
                onChange={(event) => setFormData((prev) => ({ ...prev, durationMonths: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Plan Features (comma or new line)</Label>
              <Textarea
                value={formData.features}
                onChange={(event) => setFormData((prev) => ({ ...prev, features: event.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : selectedPlan
                  ? "Save Plan"
                  : "Create Plan"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (selectedPlan) {
            deleteMutation.mutate(selectedPlan.key);
          }
        }}
        title="Are you sure?"
        description="You want to delete this subscription plan from dashboard and user app."
        confirmText="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
