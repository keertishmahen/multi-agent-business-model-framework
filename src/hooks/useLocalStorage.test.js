import { renderHook, act } from "@testing-library/react";
import useLocalStorage from "./useLocalStorage";

const KEY = "test-nexus-state";

describe("useLocalStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("debounces writes to localStorage", () => {
    const { rerender } = renderHook(
      ({ state }) => useLocalStorage(KEY, state),
      { initialProps: { state: { phase: "onboarding", story: "A" } } }
    );

    rerender({ state: { phase: "workflow", story: "B" } });
    expect(window.localStorage.getItem(KEY)).toBeNull();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(JSON.parse(window.localStorage.getItem(KEY))).toEqual({
      phase: "workflow",
      story: "B",
    });
  });

  it("clearState cancels pending debounced writes", () => {
    const { result, rerender } = renderHook(
      ({ state }) => useLocalStorage(KEY, state),
      { initialProps: { state: { phase: "workflow", story: "Old plan" } } }
    );

    rerender({ state: { phase: "workflow", story: "Updated plan" } });

    act(() => {
      result.current.clearState();
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(result.current.hasSavedState).toBe(false);
  });

  it("flushState writes synchronously and updates savedState", () => {
    const { result } = renderHook(() => useLocalStorage(KEY, { phase: "workflow" }));

    const fresh = { phase: "onboarding", story: "" };

    act(() => {
      result.current.flushState(fresh);
    });

    expect(JSON.parse(window.localStorage.getItem(KEY))).toEqual(fresh);
    expect(result.current.resume()).toEqual(fresh);
    expect(result.current.hasSavedState).toBe(true);
  });

  it("flushState cancels a pending debounced write", () => {
    const { result, rerender } = renderHook(
      ({ state }) => useLocalStorage(KEY, state),
      { initialProps: { state: { phase: "workflow", story: "Stale" } } }
    );

    rerender({ state: { phase: "workflow", story: "Would be stale" } });

    act(() => {
      result.current.flushState({ phase: "onboarding", story: "" });
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(JSON.parse(window.localStorage.getItem(KEY))).toEqual({
      phase: "onboarding",
      story: "",
    });
  });

  it("skips debounced write when serialized payload is unchanged", () => {
    const state = { phase: "workflow", story: "Same" };
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem");

    const { rerender } = renderHook(
      ({ value }) => useLocalStorage(KEY, value),
      { initialProps: { value: state } }
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    const initialCalls = setItemSpy.mock.calls.length;
    rerender({ value: { ...state } });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(setItemSpy.mock.calls.length).toBe(initialCalls);
    setItemSpy.mockRestore();
  });
});
