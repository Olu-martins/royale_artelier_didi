import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Trash2, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import api, { Address, AddressInput } from "@/services/api";
import AddressForm from "./AddressForm";

interface AddressBookProps {
  /**
   * Selection mode turns the list into a picker for checkout. The same list,
   * mutations and empty state serve both places so they cannot drift apart.
   */
  selectable?: boolean;
  selectedId?: string | null;
  onSelect?: (address: Address) => void;
  /** Hides the heading when the parent already provides one. */
  compact?: boolean;
}

export const addressesQueryKey = ["addresses"] as const;

const formatAddress = (address: Address) =>
  [address.street, address.city, address.zipCode, address.country]
    .filter((part) => part && part !== "N/A")
    .join(", ");

const AddressBook = ({
  selectable = false,
  selectedId,
  onSelect,
  compact = false,
}: AddressBookProps) => {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null);

  const {
    data: addresses = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: addressesQueryKey,
    queryFn: () => api.getAddresses(),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: addressesQueryKey });

  const createMutation = useMutation({
    mutationFn: (values: AddressInput) => api.createAddress(values),
    onSuccess: async (created) => {
      await invalidate();
      setIsFormOpen(false);
      toast.success("Address saved");
      // In checkout, a freshly added address is almost certainly the one they
      // want to use, so select it rather than making them click again.
      if (selectable) onSelect?.(created);
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: AddressInput }) =>
      api.updateAddress(id, values),
    onSuccess: async () => {
      await invalidate();
      setEditing(null);
      toast.success("Address updated");
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAddress(id),
    onSuccess: async () => {
      await invalidate();
      setPendingDelete(null);
      toast.success("Address removed");
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Loading addresses…
      </p>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive py-6 text-center">
        {(error as Error)?.message ?? "Could not load your addresses."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex justify-between items-center">
          <h2 className="font-display text-xl font-semibold">
            Saved Addresses
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFormOpen(true)}
            className="gap-2">
            <Plus size={16} />
            Add New Address
          </Button>
        </div>
      )}

      {addresses.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <MapPin size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-medium mb-1">No addresses saved yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add a delivery address to speed up checkout.
          </p>
          <Button onClick={() => setIsFormOpen(true)} className="btn-primary">
            Add an address
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => {
            const isSelected = selectable && selectedId === address.id;
            return (
              <div
                key={address.id}
                onClick={
                  selectable ? () => onSelect?.(address) : undefined
                }
                role={selectable ? "radio" : undefined}
                aria-checked={selectable ? isSelected : undefined}
                tabIndex={selectable ? 0 : undefined}
                onKeyDown={
                  selectable
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelect?.(address);
                        }
                      }
                    : undefined
                }
                className={`border rounded-lg p-4 transition-colors ${
                  selectable ? "cursor-pointer hover:border-foreground" : ""
                } ${
                  isSelected
                    ? "border-accent ring-1 ring-accent"
                    : "border-border"
                }`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{address.label}</p>
                      {address.isDefault && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          Default
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent inline-flex items-center gap-1">
                          <Check size={12} />
                          Delivering here
                        </span>
                      )}
                    </div>
                    {address.recipientName && (
                      <p className="text-sm mt-1">{address.recipientName}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1 break-words">
                      {formatAddress(address)}
                    </p>
                    {address.phone && (
                      <p className="text-sm text-muted-foreground">
                        {address.phone}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${address.label}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditing(address);
                      }}>
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${address.label}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setPendingDelete(address);
                      }}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {compact && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFormOpen(true)}
              className="gap-2 w-full">
              <Plus size={16} />
              Use a different address
            </Button>
          )}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Add an address</DialogTitle>
          </DialogHeader>
          <AddressForm
            isSubmitting={createMutation.isPending}
            onSubmit={(values) => createMutation.mutate(values)}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit address</DialogTitle>
          </DialogHeader>
          {editing && (
            <AddressForm
              initial={editing}
              submitLabel="Save changes"
              isSubmitting={updateMutation.isPending}
              onSubmit={(values) =>
                updateMutation.mutate({ id: editing.id, values })
              }
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this address?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.label} will be removed from your saved addresses.
              Orders already placed keep the address they were shipped to.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                pendingDelete && deleteMutation.mutate(pendingDelete.id)
              }>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AddressBook;
