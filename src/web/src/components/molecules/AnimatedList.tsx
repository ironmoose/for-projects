import { useEffect, useRef } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

interface AnimatedListProps<T extends { id: string }> {
  items: T[];
  renderItem: (item: T, isNew: boolean) => React.ReactNode;
  style?: React.CSSProperties;
}

export function AnimatedList<T extends { id: string }>({ items, renderItem, style }: AnimatedListProps<T>) {
  const reduced = useReducedMotion();
  const prevIdsRef = useRef(new Set<string>());

  useEffect(() => {
    prevIdsRef.current = new Set(items.map((i) => i.id));
  }, [items]);

  const prevIds = prevIdsRef.current;

  return (
    <div style={style}>
      {items.map((item) => {
        const isNew = !reduced && prevIds.size > 0 && !prevIds.has(item.id);
        return (
          <div
            key={item.id}
            style={isNew ? { animation: "slide-in-left 0.2s ease-out" } : undefined}
          >
            {renderItem(item, isNew)}
          </div>
        );
      })}
    </div>
  );
}
