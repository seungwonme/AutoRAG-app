// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useNavigationMotion, type NavigationView } from "../src/renderer/src/hooks/useNavigationMotion";

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
	host = document.createElement("div");
	document.body.append(host);
	root = createRoot(host);
});

afterEach(() => {
	act(() => root.unmount());
	host.remove();
});

function Probe({ view }: { readonly view: NavigationView }) {
	const motion = useNavigationMotion(view);
	return <div id="listing" {...motion} />;
}

function show(view: Partial<NavigationView> & { readonly dir: string }): void {
	act(() => root.render(<Probe view={{ scope: "1:list", depth: 0, ...view }} />));
}

function listing(): HTMLElement {
	const element = host.querySelector<HTMLElement>("#listing");
	if (element === null) throw new Error("listing not rendered");
	return element;
}

const nav = (): string | null => listing().getAttribute("data-nav");
const phase = (): string | null => listing().getAttribute("data-nav-phase");

function finishAnimation(): void {
	act(() => {
		listing().dispatchEvent(new Event("animationend", { bubbles: true }));
	});
}

describe("useNavigationMotion", () => {
	it("starts at rest", () => {
		show({ dir: "/Users/x" });
		expect(nav()).toBeNull();
	});

	it("enters a child folder and leaves toward its parent", () => {
		show({ dir: "/Users/x", depth: 0 });
		show({ dir: "/Users/x/Documents", depth: 1 });
		expect(nav()).toBe("enter");
		show({ dir: "/Users/x", depth: 0 });
		expect(nav()).toBe("leave");
	});

	it("orders unrelated folders by history depth", () => {
		show({ dir: "/Users/x", depth: 0 });
		show({ dir: "/Volumes/Work", depth: 1 });
		expect(nav()).toBe("enter");
		show({ dir: "/Users/x", depth: 0 });
		expect(nav()).toBe("leave");
	});

	it("restarts the animation on every navigation, even before the last one ended", () => {
		show({ dir: "/a", depth: 0 });
		show({ dir: "/a/b", depth: 1 });
		const first = phase();
		show({ dir: "/a/b/c", depth: 2 });
		expect(nav()).toBe("enter");
		expect(phase()).not.toBe(first);
		show({ dir: "/a/b", depth: 1 });
		expect(nav()).toBe("leave");
		expect(phase()).toBe(first);
	});

	it("keeps the motion while only the history moves, and ignores a re-render on the same folder", () => {
		show({ dir: "/a", depth: 0 });
		show({ dir: "/a/b", depth: 1 });
		const started = phase();
		show({ dir: "/a/b", depth: 1 });
		show({ dir: "/a/b", depth: 2 });
		expect(nav()).toBe("enter");
		expect(phase()).toBe(started);
	});

	it("does not animate a tab or view-mode switch", () => {
		show({ scope: "1:list", dir: "/a", depth: 0 });
		show({ scope: "2:list", dir: "/Volumes/Work", depth: 4 });
		expect(nav()).toBeNull();
		show({ scope: "2:icons", dir: "/Volumes/Work", depth: 4 });
		expect(nav()).toBeNull();
		// ...and navigating afterwards still does, measured from the new surface.
		show({ scope: "2:icons", dir: "/Volumes/Work/photos", depth: 5 });
		expect(nav()).toBe("enter");
	});

	it("drops the motion once it has played, so a remount does not replay it", () => {
		show({ dir: "/a", depth: 0 });
		show({ dir: "/a/b", depth: 1 });
		expect(nav()).toBe("enter");
		finishAnimation();
		expect(nav()).toBeNull();
	});

	it("ignores animations that finish on a child of the listing", () => {
		show({ dir: "/a", depth: 0 });
		show({ dir: "/a/b", depth: 1 });
		const child = document.createElement("span");
		listing().append(child);
		act(() => {
			child.dispatchEvent(new Event("animationend", { bubbles: true }));
		});
		expect(nav()).toBe("enter");
	});
});
