"use client";

import { useState } from "react";
import { FolderSearch, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type PickerData = {
  action: string;
  docs?: Array<{ id?: string }>;
};

type PickerView = {
  setIncludeFolders: (include: boolean) => PickerView;
  setSelectFolderEnabled: (enabled: boolean) => PickerView;
};

type PickerInstance = { setVisible: (visible: boolean) => void };

type PickerBuilder = {
  setAppId: (appId: string) => PickerBuilder;
  setDeveloperKey: (apiKey: string) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  addView: (view: PickerView) => PickerBuilder;
  setTitle: (title: string) => PickerBuilder;
  setCallback: (callback: (data: PickerData) => void | Promise<void>) => PickerBuilder;
  build: () => PickerInstance;
};

type PickerApi = {
  Action: { PICKED: string; CANCEL: string };
  ViewId: { FOLDERS: string };
  DocsView: new (viewId: string) => PickerView;
  PickerBuilder: new () => PickerBuilder;
};

declare global {
  interface Window {
    gapi?: { load: (name: string, callback: () => void) => void };
    google?: { picker: PickerApi };
  }
}

export function FolderPicker({ branchId, apiKey, appId }: { branchId: string; apiKey?: string; appId?: string }) {
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const router = useRouter();
  async function openPicker() {
    if (!apiKey || !appId) { setError("Google Picker non e configurato: incolla il link della cartella qui sotto."); return; }
    setLoading(true); setError("");
    try {
      if (!window.gapi) await new Promise<void>((resolve, reject) => { const script = document.createElement("script"); script.src = "https://apis.google.com/js/api.js"; script.onload = () => resolve(); script.onerror = () => reject(new Error("Impossibile caricare Google Picker")); document.head.appendChild(script); });
      await new Promise<void>((resolve) => window.gapi!.load("picker", resolve));
      const tokenResponse = await fetch(`/api/google/token?branchId=${encodeURIComponent(branchId)}`);
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.accessToken) throw new Error(tokenData.error || "Token Google non disponibile");
      const pickerApi = window.google!.picker;
      const view = new pickerApi.DocsView(pickerApi.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true);
      const picker = new pickerApi.PickerBuilder().setAppId(appId).setDeveloperKey(apiKey).setOAuthToken(tokenData.accessToken).addView(view).setTitle("Scegli la cartella della branca").setCallback(async (data: PickerData) => {
        if (data.action === pickerApi.Action.PICKED && data.docs?.[0]?.id) {
          const response = await fetch("/api/google/folder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branchId, folderId: data.docs[0].id }) });
          if (!response.ok) { const body = await response.json(); setError(body.error || "Cartella non accessibile"); } else { router.refresh(); }
        }
        if (data.action === pickerApi.Action.PICKED || data.action === pickerApi.Action.CANCEL) setLoading(false);
      }).build();
      picker.setVisible(true);
    } catch (pickerError) { setError(pickerError instanceof Error ? pickerError.message : "Google Picker non disponibile"); setLoading(false); }
  }
  return <div><button className="button button--secondary" type="button" onClick={openPicker} disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <FolderSearch size={18} />} Scegli da Drive</button>{error && <p style={{ color: "var(--danger)", fontSize: ".78rem", margin: "8px 0 0" }}>{error}</p>}</div>;
}
