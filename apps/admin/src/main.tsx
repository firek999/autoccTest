/// <reference types="vite/client" />

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// antd 5.24 已兼容 React 19，但内置版本检测仍有 warning，此处主动抑制
window.__ANTD_COMPATIBLE__ = true;
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
