"use strict";

// Right, the challenge is to remove all (or most) references to renderer.
// It currently uses a lot of state from the renderer.

function NewInfoboxHandler() {

	let handler = Object.create(null);

	handler.clickers = [];
	handler.last_highlight_dest = null;			// Used to skip redraws.

	handler.draw = function(renderer, force) {

		if (!renderer.ever_received_info) {
			infobox.innerHTML = renderer.stderr_log;
			return;
		}

		// Find the square the user is hovering over (might be null)...
		let p = renderer.mouse_to_point(renderer.mousex, renderer.mousey);

		// By default we're highlighting nothing...
		let highlight_dest = null;
		let one_click_move = "__none__";

		// But if the hovered square actually has a one-click move available, highlight its variation,
		// unless we have an active (i.e. clicked) square...
		if (p && renderer.one_click_moves[p.x][p.y] && !renderer.active_square) {
			highlight_dest = p;
			one_click_move = renderer.one_click_moves[p.x][p.y];
		}

		// The info_table.drawn property is set to false whenever new info is received from the engine.
		// So maybe we can skip drawing the infobox, and just return...

		if (renderer.info_table.drawn && !force) {
			if (highlight_dest === this.last_highlight_dest) {
				return;
			}
		}

		this.last_highlight_dest = highlight_dest;

		//

		let info_list = renderer.info_table.sorted();
		let elements = [];									// Not HTML elements, just our own objects.

		if (renderer.leela_should_go() === false) {
			elements.push({
				class: "yellow",
				text: renderer.versus === "" ? "HALTED " : "YOUR MOVE ",
			});
		}

		elements.push({
			class: "gray",
			text: `Nodes: ${renderer.info_table.nodes}, N/s: ${renderer.info_table.nps}<br><br>`
		});

		for (let i = 0; i < info_list.length && i < config.max_info_lines; i++) {

			let new_elements = [];

			let info = info_list[i];

			new_elements.push({
				class: "blue",
				text: `${info.value_string(1)} `,
			});

			let colour = renderer.node.get_board().active;

			let nice_pv = info.nice_pv();

			for (let n = 0; n < nice_pv.length; n++) {
				let nice_move = nice_pv[n];
				let element = {
					class: colour === "w" ? "white" : "pink",
					text: nice_move + " ",
					move: info.pv[n],
				};
				if (nice_move.includes("O-O")) {
					element.class += " nobr";
				}
				new_elements.push(element);
				colour = OppositeColour(colour);
			}

			new_elements.push({
				class: "gray",
				text: `(N: ${info.n.toString()}, P: ${info.p})`
			});

			if (info.move === one_click_move) {
				for (let e of new_elements) {
					e.class += " redback";
				}
			}

			if (new_elements.length > 0) {					// Always true.
				new_elements[new_elements.length - 1].text += "<br><br>";
			}

			elements = elements.concat(new_elements);
		}

		// Generate the new innerHTML for the infobox <div>

		let new_inner_parts = [];

		for (let n = 0; n < elements.length; n++) {
			let part = `<span id="infobox_${n}" class="${elements[n].class}">${elements[n].text}</span>`;
			new_inner_parts.push(part);
		}

		infobox.innerHTML = new_inner_parts.join("");		// Setting innerHTML is performant. Direct DOM manipulation is worse, somehow.

		// And save our elements so that we know what clicks mean.

		this.clickers = elements;							// We actually only need the move or its absence in each object. Meh.
		renderer.info_table.drawn = true;
	};

	handler.moves_from_click = function(event) {

		let n;

		for (let item of event.path) {
			if (typeof item.id === "string" && item.id.startsWith("infobox_")) {
				n = parseInt(item.id.slice(8), 10);
				break;
			}
		}

		if (n === undefined) {
			return [];
		}

		// This is a bit icky, it relies on the fact that our clickers list
		// has some objects that lack a move property (the blue info bits).

		if (!this.clickers || n < 0 || n >= this.clickers.length) {
			return [];
		}

		let move_list = [];

		// Work backwards until we get to the start of the line...

		for (; n >= 0; n--) {
			let element = this.clickers[n];
			if (!element || !element.move) {
				break;
			}
			move_list.push(element.move);
		}

		move_list.reverse();

		return move_list;
	};
	
	return handler;
}