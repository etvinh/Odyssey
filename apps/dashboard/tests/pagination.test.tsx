import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pagination } from "@odyssey/ui";

/**
 * The states a paged table can be in. These encode real rules — a footer that
 * lets you page past the end, or that reports the page instead of the range,
 * is the kind of defect that only shows on the last page.
 */
describe("Pagination", () => {
  const noop = () => {};

  /**
   * By role and accessible name, not by text: React Native Web renders the
   * label into the button and into its aria-label, so a text query matches
   * twice — and the name is what a keyboard or screen-reader user acts on.
   */
  const button = (name: string) => screen.getByRole("button", { name });

  it("reports the range rather than only the page", () => {
    render(<Pagination page={2} pageSize={25} total={240} onPageChange={noop} noun="customers" />);
    expect(screen.getByText("26–50 of 240 customers")).toBeTruthy();
  });

  it("disables Previous on the first page", () => {
    render(<Pagination page={1} pageSize={25} total={240} onPageChange={noop} />);
    expect(button("Previous").hasAttribute("disabled")).toBe(true);
  });

  it("enables Next when there are more pages", () => {
    render(<Pagination page={1} pageSize={25} total={240} onPageChange={noop} />);
    expect(button("Next").hasAttribute("disabled")).toBe(false);
  });

  it("disables Next on the last page", () => {
    render(<Pagination page={10} pageSize={25} total={240} onPageChange={noop} />);
    expect(button("Next").hasAttribute("disabled")).toBe(true);
  });

  it("caps the final range at the total, not at the page size", () => {
    render(<Pagination page={10} pageSize={25} total={236} onPageChange={noop} noun="orders" />);
    expect(screen.getByText("226–236 of 236 orders")).toBeTruthy();
  });

  it("says nothing matched instead of reporting a zero range", () => {
    render(<Pagination page={1} pageSize={25} total={0} onPageChange={noop} noun="orders" />);
    expect(screen.getByText("No orders")).toBeTruthy();
  });

  it("disables both controls when nothing matched", () => {
    render(<Pagination page={1} pageSize={25} total={0} onPageChange={noop} />);
    expect(button("Previous").hasAttribute("disabled")).toBe(true);
    expect(button("Next").hasAttribute("disabled")).toBe(true);
  });

  it("asks for the next page when Next is pressed", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} pageSize={25} total={240} onPageChange={onPageChange} />);
    button("Next").click();
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
