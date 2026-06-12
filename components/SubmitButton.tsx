"use client";

// 送信ボタン。送信中（AI処理の待ち時間など）は表示を変えて、押せないようにする。
// useFormStatus は、囲んでいる <form> の送信状態を教えてくれるフック。

import { useFormStatus } from "react-dom";

export function SubmitButton({
  idle,
  pending,
  className,
}: {
  idle: string;
  pending: string;
  className?: string;
}) {
  const status = useFormStatus();
  return (
    <button
      type="submit"
      disabled={status.pending}
      className={
        className ??
        "rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {status.pending ? pending : idle}
    </button>
  );
}
