/**
 * Which way a folder change reads as: opening a folder pushes the listing in
 * from the right, going up or back pulls the previous one in from the left
 * (issue #1). Pure, so the rule is testable without a window.
 */

import { parentPrefix } from "./paths";

export type NavigationDirection = "enter" | "leave";

/** How deep the tab's Back history was when the old and the new listing were shown. */
export interface NavigationDepth {
	readonly from: number;
	readonly to: number;
}

/** `path` lies below `folder` (never `folder` itself, never a sibling that shares a name prefix). */
function isInside(path: string, folder: string): boolean {
	return path !== folder && path.startsWith(parentPrefix(folder));
}

/**
 * The direction of the move from the listing of `from` to the listing of `to`,
 * or null when the folder did not change.
 *
 * A descendant is "enter" and an ancestor is "leave", whichever way the user
 * got there (double-click, path bar, sidebar, Back). Two unrelated folders have
 * no hierarchy to read, so the tab's history decides: stepping back through it
 * is "leave", anything else (a new destination, Forward) is "enter".
 */
export function navigationDirection(from: string, to: string, depth: NavigationDepth): NavigationDirection | null {
	if (from === to) return null;
	if (from !== "" && to !== "") {
		if (isInside(to, from)) return "enter";
		if (isInside(from, to)) return "leave";
	}
	return depth.to < depth.from ? "leave" : "enter";
}
