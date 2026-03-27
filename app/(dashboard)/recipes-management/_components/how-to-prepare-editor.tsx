"use client";

import { useEffect, useRef } from "react";
import type Quill from "quill";

const quillModules = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ],
};

const normalizeEditorText = (value: string) =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .trimEnd();

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();

export const normalizeEditorHtml = (value: string) => {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    return "";
  }

  if (stripHtml(normalized).length === 0) {
    return "";
  }

  return normalized;
};

export const toEditorValue = (value: string) => {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (!normalized.trim()) {
    return "";
  }

  if (/<[a-z][\s\S]*>/i.test(normalized)) {
    return normalized;
  }

  return escapeHtml(normalized).replaceAll("\n", "<br />");
};

type HowToPrepareEditorProps = {
  value: string;
  placeholder?: string;
  onChange: (payload: { html: string; text: string }) => void;
};

export function HowToPrepareEditor({ value, placeholder, onChange }: HowToPrepareEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const lastHtmlRef = useRef("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let disposed = false;
    let handleTextChange: (() => void) | null = null;

    const init = async () => {
      const QuillModule = await import("quill");
      if (disposed || !containerRef.current) {
        return;
      }

      const QuillCtor = QuillModule.default;
      const quill = new QuillCtor(containerRef.current, {
        theme: "snow",
        modules: quillModules,
        placeholder,
      });
      quillRef.current = quill;

      const initialHtml = toEditorValue(initialValueRef.current);
      lastHtmlRef.current = initialHtml;
      quill.clipboard.dangerouslyPasteHTML(initialHtml);

      handleTextChange = () => {
        const html = quill.root.innerHTML;
        lastHtmlRef.current = html;
        onChangeRef.current({
          html,
          text: normalizeEditorText(quill.getText()),
        });
      };

      quill.on("text-change", handleTextChange);
    };

    init();

    return () => {
      disposed = true;
      if (quillRef.current && handleTextChange) {
        quillRef.current.off("text-change", handleTextChange);
      }
      quillRef.current = null;
    };
  }, [placeholder]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) {
      return;
    }

    const nextHtml = toEditorValue(value);
    if (nextHtml === lastHtmlRef.current) {
      return;
    }

    const selection = quill.getSelection();
    quill.clipboard.dangerouslyPasteHTML(nextHtml);
    lastHtmlRef.current = nextHtml;
    if (selection) {
      quill.setSelection(selection.index, selection.length);
    }
  }, [value]);

  return <div ref={containerRef} />;
}
