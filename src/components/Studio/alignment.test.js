import { alignItem } from "./alignment";

const item = { id: "moving", x: 591, y: 391, width: 400, height: 200 };
const board = { width: 1600, height: 1000, items: [item] };

test("movement snaps a photo's center to the board center", () => {
  const result = alignItem(item, board, 10);
  expect(result.item).toMatchObject({ x: 600, y: 400 });
  expect(result.guides).toEqual({ x: [800], y: [500] });
});

test("alignment matches neighboring edges without snapping outside the threshold", () => {
  const other = { id: "other", x: 300, y: 100, width: 200, height: 100 };
  const result = alignItem({ ...item, x: 493, y: 123 }, { ...board, items: [other, item] }, 8);
  expect(result.item.x).toBe(500);
  expect(result.item.y).toBe(123);
  expect(result.guides.x).toEqual([500]);
});

test("resizing snaps the trailing edge and respects the canvas boundaries", () => {
  const result = alignItem({ ...item, x: 100, y: 100, width: 1493, height: 893 }, board, 10, "resize");
  expect(result.item).toMatchObject({ x: 100, y: 100, width: 1500, height: 900 });
  expect(result.guides).toEqual({ x: [1600], y: [1000] });
});
