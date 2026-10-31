import { boundItem } from "./model";

export function alignItem(candidate, board, threshold, mode = "move") {
  const item = boundItem(candidate, board);
  const others = board.items.filter((entry) => entry.id !== item.id);
  const targets = {
    x: [0, board.width / 2, board.width, ...others.flatMap((entry) => [entry.x, entry.x + entry.width / 2, entry.x + entry.width])],
    y: [0, board.height / 2, board.height, ...others.flatMap((entry) => [entry.y, entry.y + entry.height / 2, entry.y + entry.height])],
  };
  const guides = { x: [], y: [] };
  for (const [axis, size] of [["x", "width"], ["y", "height"]]) {
    const anchors = mode === "resize" ? [item[axis] + item[size]] : [item[axis], item[axis] + item[size] / 2, item[axis] + item[size]];
    let best = null;
    for (const target of targets[axis]) for (const anchor of anchors) {
      const delta = target - anchor;
      const value = mode === "resize" ? { ...item, [size]: item[size] + delta } : { ...item, [axis]: item[axis] + delta };
      const bounded = boundItem(value, board);
      const property = mode === "resize" ? size : axis;
      if (Math.abs(delta) <= threshold && Math.abs(bounded[property] - value[property]) < .01 && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, target };
    }
    if (best) {
      if (mode === "resize") item[size] += best.delta; else item[axis] += best.delta;
      guides[axis] = [best.target];
    }
  }
  return { item, guides };
}
