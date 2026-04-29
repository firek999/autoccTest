import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "../src/App";

function renderApp() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("App", () => {
  it("renders dashboard page", () => {
    renderApp();
    expect(screen.getByText("验收测试概览")).toBeDefined();
  });

  it("renders layout header", () => {
    renderApp();
    expect(screen.getByText("autoccTest")).toBeDefined();
  });
});
