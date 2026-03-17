"use client";

import * as React from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, className, children }: ModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        className={cn(
          "w-[calc(100vw-2rem)] p-0 sm:max-w-4xl",
          "max-h-[90vh] overflow-hidden",
          className
        )}
      >
        <DialogHeader className="px-6 pb-4 pt-6">
          {title ? (
            <DialogTitle className="pr-8 text-3xl font-semibold text-slate-100">{title}</DialogTitle>
          ) : (
            <DialogTitle className="sr-only">Modal</DialogTitle>
          )}
        </DialogHeader>
        <div className="max-h-[calc(90vh-7rem)] overflow-y-auto px-6 pb-6 pr-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
