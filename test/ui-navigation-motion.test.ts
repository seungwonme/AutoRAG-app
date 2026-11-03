import { describe, expect, it } from "vitest";
import { navigationDirection } from "../src/renderer/src/state/navigation-motion";

const SAME = { from: 2, to: 2 };

describe("navigationDirection", () => {
	it("does not animate when the folder did not change", () => {
		expect(navigationDirection("/Users/x/Documents", "/Users/x/Documents", SAME)).toBeNull();
	});

	it("enters a descendant and leaves an ancestor, whatever the history says", () => {
		expect(navigationDirection("/Users/x", "/Users/x/Documents", { from: 3, to: 2 })).toBe("enter");
		expect(navigationDirection("/Users/x", "/Users/x/Documents/Finance/2026", { from: 1, to: 1 })).toBe("enter");
		expect(navigationDirection("/Users/x/Documents/Finance", "/Users/x", { from: 1, to: 2 })).toBe("leave");
		expect(navigationDirection("/Users/x/Documents", "/", SAME)).toBe("leave");
		expect(navigationDirection("/", "/Users", SAME)).toBe("enter");
	});

	it("does not take a sibling that shares a name prefix for a child", () => {
		// "/a/bc" starts with "/a/b" but is not inside it: the history decides.
		expect(navigationDirection("/a/b", "/a/bc", { from: 1, to: 2 })).toBe("enter");
		expect(navigationDirection("/a/bc", "/a/b", { from: 2, to: 1 })).toBe("leave");
	});

	it("reads Windows drive and UNC paths the same way", () => {
		expect(navigationDirection("C:\\Users\\x", "C:\\Users\\x\\Documents", SAME)).toBe("enter");
		expect(navigationDirection("C:\\Users\\x\\Documents", "C:\\", SAME)).toBe("leave");
		expect(navigationDirection("\\\\server\\share", "\\\\server\\share\\a", SAME)).toBe("enter");
		expect(navigationDirection("C:\\Users\\xy", "C:\\Users\\x", { from: 3, to: 3 })).toBe("enter");
	});

	it("orders unrelated folders by the tab's Back history", () => {
		// A sidebar jump or a path bar entry pushes onto the history: forward.
		expect(navigationDirection("/Users/x/Documents", "/Volumes/Work", { from: 1, to: 2 })).toBe("enter");
		// Back (or Forward-to-empty) to a folder elsewhere pops it: backward.
		expect(navigationDirection("/Volumes/Work", "/Users/x/Documents", { from: 2, to: 1 })).toBe("leave");
		// Forward again.
		expect(navigationDirection("/Users/x/Documents", "/Volumes/Work", { from: 1, to: 2 })).toBe("enter");
	});

	it("treats a history that did not move as entering", () => {
		expect(navigationDirection("/Users/x/Documents", "/Volumes/Work", SAME)).toBe("enter");
	});

	it("handles views that are not folders on disk", () => {
		expect(navigationDirection("/Users/x", "Recents", { from: 0, to: 1 })).toBe("enter");
		expect(navigationDirection("Recents", "/Users/x", { from: 1, to: 0 })).toBe("leave");
		// An empty path carries no hierarchy; it must not read as the ancestor of everything.
		expect(navigationDirection("", "/Users/x", { from: 0, to: 1 })).toBe("enter");
		expect(navigationDirection("/Users/x", "", { from: 1, to: 0 })).toBe("leave");
	});
});
