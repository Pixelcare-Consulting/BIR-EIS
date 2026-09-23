"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

export interface ActionButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: React.ReactNode;
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      loading = false,
      loadingText,
      disabled,
      children,
      asChild,
      ...props
    },
    ref,
  ) => {
    // asChild cannot host the loading spinner swap; force native button when loading.
    const resolvedAsChild = asChild && !loading;

    return (
      <Button
        ref={ref}
        asChild={resolvedAsChild}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </Button>
    );
  },
);
ActionButton.displayName = "ActionButton";

export { ActionButton };
