import { useEffect, useMemo, useState } from "react";
import Card from "../Card/Card";

const columnCount = () => window.innerWidth <= 900 ? 2 : window.innerWidth <= 1200 ? 3 : window.innerWidth >= 1700 ? 5 : 4;

export default function PhotoGrid({ photos }) {
  const [count, setCount] = useState(columnCount);
  useEffect(() => {
    const resize = () => setCount(columnCount());
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  // Assign each new photo to the shortest column without moving earlier photos.
  const columns = useMemo(() => {
    const groups = Array.from({ length: count }, () => []);
    const heights = Array(count).fill(0);
    photos.forEach((photo) => {
      const index = heights.indexOf(Math.min(...heights));
      groups[index].push(photo);
      heights[index] += (photo.height || 4) / (photo.width || 3) + .06;
    });
    return groups;
  }, [photos, count]);
  return <div className="photo-grid" style={{ "--gallery-columns": count }}>{columns.map((column, index) =>
    <div className="photo-column" key={index}>{column.map((photo) => <Card key={photo.id} item={photo} />)}</div>
  )}</div>;
}
