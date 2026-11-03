// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ColumnBrowser, type ColumnPaneView } from "../src/renderer/src/components/ColumnBrowser";
import type { BackgroundDropHandlers, RowCallbacks } from "../src/renderer/src/components/FileRow";
import { setAppLanguage } from "../src/shared/i18n";

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

let host: HTMLDivElement;
let root: Root;

beforeEach(async () => {
	await setAppLanguage("ko");
	host = document.createElement("div");
	document.body.append(host);
	root = createRoot(host);
});

afterEach(() => {
	act(() => root.unmount());
	host.remove();
});

const IGNORE = (): void => {};
const BACKGROUND: BackgroundDropHandlers = { onDragOver: IGNORE, onDrop: IGNORE, onDragLeave: IGNORE, onContextMenu: IGNORE };
// The panes below are empty, so no row ever reads a callback; the browser only needs the object to exist.
const CALLBACKS = { dropTargetPath: null } as RowCallbacks;

function pane(path: string): ColumnPaneView {
	return { path, loaded: true, rows: [], sections: [] };
}

function show(scope: number, paths: readonly string[]): void {
	act(() =>
		root.render(
			<ColumnBrowser
				scope={scope}
				panes={paths.map(pane)}
				variantColumn={null}
				onSelectVariant={IGNORE}
				listRef={{ current: null }}
				emptyText=""
				selectedKeys={[]}
				focusedZone
				flashPath={null}
				renamePath={null}
				renameDraft=""
				versionFamilyError={null}
				onRetryVersionFamilies={IGNORE}
				columnCallbacks={{ onClick: IGNORE }}
				paneBackground={() => BACKGROUND}
				dropBackgroundDir={null}
				callbacks={CALLBACKS}
			/>,
		),
	);
}

/** The data-nav-pane of each pane, left to right ("" when it arrived at rest). */
function arrivals(): string[] {
	return [...host.querySelectorAll<HTMLElement>(".column[data-path]")].map((element) => element.getAttribute("data-nav-pane") ?? "");
}

describe("ColumnBrowser pane arrival", () => {
	it("shows the panes at rest when the view opens", () => {
		show(1, ["/a", "/a/b", "/a/b/c"]);
		expect(arrivals()).toEqual(["", "", ""]);
	});

	it("slides an appended column in from the right and leaves the others alone", () => {
		show(1, ["/a"]);
		show(1, ["/a", "/a/b"]);
		expect(arrivals()).toEqual(["", "enter"]);
		show(1, ["/a", "/a/b", "/a/b/c"]);
		expect(arrivals()).toEqual(["", "enter", "enter"]);
	});

	it("replaces the column to the right of a new choice with one that slides in", () => {
		show(1, ["/a", "/a/b"]);
		show(1, ["/a", "/a/x"]);
		expect(arrivals()).toEqual(["", "enter"]);
	});

	it("slides the first column in from the left when going back to an ancestor", () => {
		show(1, ["/a/b", "/a/b/c", "/a/b/c/d"]);
		show(1, ["/a", "/a/b", "/a/b/c"]);
		expect(arrivals()).toEqual(["leave", "", ""]);
	});

	it("does not animate when another tab takes the view, nor a column that merely shifts", () => {
		show(1, ["/a", "/a/b"]);
		show(2, ["/Volumes/Work", "/Volumes/Work/photos"]);
		expect(arrivals()).toEqual(["", ""]);
		// The panes slid one step left: the second is now the first, the third is the new one.
		show(2, ["/Volumes/Work/photos", "/Volumes/Work/photos/2026"]);
		expect(arrivals()).toEqual(["", "enter"]);
	});
});
