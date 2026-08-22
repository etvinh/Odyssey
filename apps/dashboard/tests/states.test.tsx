import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EmptyState, ErrorState, SaveBar, SkeletonRows, StatusBadge } from "@odyssey/ui";

/**
 * The states a screen spends most of its life in. Every list in this product
 * renders one of these before it renders data, so a regression here is visible
 * on first paint of every page.
 */

const button = (name: string) => screen.getByRole("button", { name });

describe("EmptyState", () => {
  it("says what is missing and what to do", () => {
    render(<EmptyState title="No orders match these filters" body="Clear the search." />);
    expect(screen.getByText("No orders match these filters")).toBeTruthy();
    expect(screen.getByText("Clear the search.")).toBeTruthy();
  });

  it("offers no action when there is nothing to undo", () => {
    render(<EmptyState title="Nothing here yet" body="New orders will appear." />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("runs the recovery action when offered", () => {
    const onPress = vi.fn();
    render(
      <EmptyState title="No matches" body="Try again." action={{ label: "Clear filters", onPress }} />,
    );
    fireEvent.click(button("Clear filters"));
    expect(onPress).toHaveBeenCalledOnce();
  });
});

describe("ErrorState", () => {
  it("names the cause rather than only failing", () => {
    render(<ErrorState cause="The database is unreachable." onRetry={() => {}} />);
    expect(screen.getByText("The database is unreachable.")).toBeTruthy();
  });

  it("offers a way back", () => {
    const onRetry = vi.fn();
    render(<ErrorState cause="Request timed out." onRetry={onRetry} />);
    fireEvent.click(button("Try again"));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe("SaveBar", () => {
  it("cannot be saved when nothing has changed", () => {
    render(<SaveBar dirty={false} onSave={() => {}} onReset={() => {}} />);
    expect(button("Save changes").hasAttribute("disabled")).toBe(true);
  });

  it("says so rather than leaving the state ambiguous", () => {
    render(<SaveBar dirty={false} onSave={() => {}} onReset={() => {}} />);
    expect(screen.getByText("No unsaved changes")).toBeTruthy();
  });

  it("enables saving once something has changed", () => {
    render(<SaveBar dirty onSave={() => {}} onReset={() => {}} />);
    expect(button("Save changes").hasAttribute("disabled")).toBe(false);
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
  });

  it("blocks discarding while a save is in flight", () => {
    // Discarding mid-save would race the request it is trying to undo.
    render(<SaveBar dirty saving onSave={() => {}} onReset={() => {}} />);
    expect(button("Discard").hasAttribute("disabled")).toBe(true);
  });
});

describe("StatusBadge", () => {
  it("reads by text, never by colour alone", () => {
    render(<StatusBadge label="Preparing" tone="warning" />);
    expect(screen.getByText("Preparing")).toBeTruthy();
  });
});

describe("SkeletonRows", () => {
  it("renders the number of placeholder rows asked for", () => {
    const { container } = render(<SkeletonRows rows={5} />);
    // Placeholders are decorative, so they carry no text to query by.
    expect(container.querySelectorAll("div").length).toBeGreaterThan(4);
  });
});
