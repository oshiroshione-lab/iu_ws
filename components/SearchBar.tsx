// 用語の検索バー（F-06）。
// ふつうのHTMLフォーム（GET送信）なので、JavaScriptが無くても検索できる。
// 送信すると /?q=キーワード に移動し、サーバー側で絞り込んだ一覧を表示する。

export function SearchBar({ defaultQuery = "" }: { defaultQuery?: string }) {
  return (
    <form action="/" method="get" className="flex gap-2">
      <input
        type="text"
        name="q"
        defaultValue={defaultQuery}
        placeholder="用語を検索…"
        className="flex-1 rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
      />
      <button
        type="submit"
        className="rounded-md bg-gray-800 px-4 py-2 text-white hover:bg-gray-700"
      >
        検索
      </button>
    </form>
  );
}
