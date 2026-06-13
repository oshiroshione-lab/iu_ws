// 用語の検索バー（F-06）。
// ふつうのHTMLフォーム（GET送信）なので、JavaScriptが無くても検索できる。
// 送信すると /?q=キーワード に移動し、サーバー側で絞り込んだ一覧を表示する。

import { Input } from "@/components/ui/Input";
import { SearchIcon } from "@/components/ui/icons";

export function SearchBar({ defaultQuery = "" }: { defaultQuery?: string }) {
  return (
    <form action="/" method="get" className="relative" role="search">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="用語・説明・関連ワード・タグから検索…"
        aria-label="用語を検索"
        className="h-11 pl-10 pr-4"
      />
    </form>
  );
}
