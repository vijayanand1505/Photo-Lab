import { useEffect, useRef, useState } from "react";

export default function useExportFeedback() {
  const [exported, setExported] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const reset = () => { clearTimeout(timer.current); setExported(false); };
  const confirm = () => {
    clearTimeout(timer.current);
    setExported(true);
    timer.current = setTimeout(() => setExported(false), 3000);
  };
  return { exported, confirm, reset };
}
