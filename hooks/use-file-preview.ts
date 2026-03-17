"use client";

import { useEffect, useMemo } from "react";

export function useFilePreview(file: File | null | undefined) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return previewUrl;
}
