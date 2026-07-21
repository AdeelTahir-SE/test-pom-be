"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  showHandle?: boolean;
}

export function SortableItem({ id, children, showHandle = true }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} className="w-full">
      {showHandle && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          suppressHydrationWarning
          className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 p-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 bg-white/80 rounded-md border border-slate-200 shadow-sm outline-none"
          aria-label="Premakni kartico"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      {children}
    </div>
  );
}
