"use client";

// 送信ボタン。送信中（AI処理の待ち時間など）は表示を変えて、押せないようにする。
// useFormStatus は、囲んでいる <form> の送信状態を教えてくれるフック。

import { useFormStatus } from "react-dom";
import { buttonClasses, type ButtonVariant } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function SubmitButton({
  idle,
  pending,
  variant = "primary",
  className,
  disabled = false,
}: {
  idle: string;
  pending: string;
  variant?: ButtonVariant;
  className?: string;
  /** 送信中でなくても押せないようにしたいとき（例: 何も選んでいない） */
  disabled?: boolean;
}) {
  const status = useFormStatus();
  return (
    <button
      type="submit"
      disabled={status.pending || disabled}
      aria-busy={status.pending}
      className={buttonClasses({ variant, className })}
    >
      {status.pending && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      <span className={cn(status.pending && "opacity-90")}>
        {status.pending ? pending : idle}
      </span>
    </button>
  );
}
