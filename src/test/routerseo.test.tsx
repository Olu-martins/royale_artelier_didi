import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import RouterSEO from "@/components/RouterSEO";

afterEach(() => {
  cleanup();
  document.head.querySelectorAll("[data-rh]").forEach((el) => el.remove());
});

const renderAt = (path: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <RouterSEO />
      </MemoryRouter>
    </HelmetProvider>
  );

const robots = () =>
  [...document.head.querySelectorAll('meta[name="robots"]')].map((e) =>
    e.getAttribute("content")
  );

describe("RouterSEO", () => {
  it("noindexes an unmatched (404) path", async () => {
    renderAt("/this-page-does-not-exist");
    await waitFor(() => expect(robots()).toHaveLength(1));
    expect(robots()[0]).toBe("noindex, nofollow");
    expect(document.title).toBe("Page Not Found | Royale Artelier");
  });

  it("noindexes the cart", async () => {
    renderAt("/cart");
    await waitFor(() => expect(robots()).toHaveLength(1));
    expect(robots()[0]).toBe("noindex, nofollow");
  });

  it("indexes a content route", async () => {
    renderAt("/faqs");
    await waitFor(() => expect(robots()).toHaveLength(1));
    expect(robots()[0]).toContain("index, follow");
  });
});
