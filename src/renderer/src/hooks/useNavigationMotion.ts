import { useState, type AnimationEvent } from "react";
import { navigationDirection, type NavigationDirection } from "../state/navigation-motion";

/** What the hook watches: the listing on screen, and which tab and view it belongs to. */
export interface NavigationView {
	/**
	 * Identity of the surface the listing is drawn on (tab and view mode). Another scope is a switch
	 * of tab or view, never a navigation, so it does not animate.
	 */
	readonly scope: string;
	/** The folder whose listing is on screen (not the one still loading). */
	readonly dir: string;
	/** Length of the tab's Back history, which orders two unrelated folders. */
	readonly depth: number;
}

/**
 * Attributes for the element that holds the listing. `styles/base.css` turns
 * `data-nav` into the slide; `data-nav-phase` flips on every change so a second
 * navigation restarts the animation instead of waiting for the first to end.
 */
export interface NavigationMotionProps {
	readonly "data-nav"?: NavigationDirection | undefined;
	readonly "data-nav-phase": "0" | "1";
	readonly onAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
}

interface MotionState {
	readonly view: NavigationView;
	readonly direction: NavigationDirection | null;
	readonly phase: 0 | 1;
}

/**
 * Derives the entering/leaving motion of a Finder listing from the folder it
 * shows. It follows the folder on screen rather than the tab's path, so a slow
 * folder animates when its rows arrive, not over the listing it replaced. The
 * motion never gates input: it only sets attributes, and the CSS animates
 * opacity and transform.
 */
export function useNavigationMotion(view: NavigationView): NavigationMotionProps {
	const [state, setState] = useState<MotionState>({ view, direction: null, phase: 0 });
	if (state.view.scope !== view.scope || state.view.dir !== view.dir) {
		// Adjusting state while rendering (React's "derive from props" pattern): the commit already has the new motion.
		const direction =
			state.view.scope === view.scope
				? navigationDirection(state.view.dir, view.dir, { from: state.view.depth, to: view.depth })
				: null;
		setState({ view, direction, phase: state.phase === 0 ? 1 : 0 });
	}
	return {
		"data-nav": state.direction ?? undefined,
		"data-nav-phase": state.phase === 0 ? "0" : "1",
		// Once played, drop the motion so remounting the element (another view and back) does not replay it.
		onAnimationEnd: (event) => {
			if (event.target !== event.currentTarget) return;
			setState((current) => (current.direction === null ? current : { ...current, direction: null }));
		},
	};
}
