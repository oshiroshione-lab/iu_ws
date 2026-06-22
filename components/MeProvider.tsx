"use client";

// 「あなたの名前」をブラウザ(localStorage)で覚えておく仕組み。
// ログイン（入口の壁）は廃止したので、名前はここで持ち、画面のどこからでも読める。
// 別ドメインの枠(iframe)でもクッキーに頼らず動く（localStorage は埋め込みでも使える）。

import { createContext, useContext, useEffect, useState } from "react";

const KEY = "iukw:me";

type MeContextValue = {
  /** いまの名前（未設定なら ""） */
  me: string;
  /** 名前を変える（localStorage にも保存する） */
  setMe: (name: string) => void;
  /** localStorage の読み込みが終わったか（初回のちらつき回避用） */
  ready: boolean;
};

const MeContext = createContext<MeContextValue>({
  me: "",
  setMe: () => {},
  ready: false,
});

export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMeState] = useState("");
  const [ready, setReady] = useState(false);

  // 初回マウントで localStorage から読む（サーバー側では読めないので mount 後）。
  useEffect(() => {
    try {
      setMeState(localStorage.getItem(KEY) ?? "");
    } catch {
      // localStorage が使えない環境でも画面は普通に使えるようにする
    }
    setReady(true);
  }, []);

  function setMe(name: string) {
    const v = name.trim();
    setMeState(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {}
  }

  return (
    <MeContext.Provider value={{ me, setMe, ready }}>
      {children}
    </MeContext.Provider>
  );
}

export function useMe(): MeContextValue {
  return useContext(MeContext);
}
