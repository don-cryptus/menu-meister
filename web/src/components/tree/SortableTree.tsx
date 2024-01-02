import DndStore from "@/store/DndStore";
import {
  DndContext,
  DragOverlay,
  UniqueIdentifier,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

export interface DaySchedule {
  id: UniqueIdentifier;
  servingDate: string;
  schedules: Schedule[];
}

export interface Schedule {
  id: UniqueIdentifier;
  meal?: Meal;
  group?: {
    id: UniqueIdentifier;
    name: string;
    meals: Meal[];
  };
}

interface Meal {
  id: UniqueIdentifier;
  name: string;
}

function getProjection(
  items: ReturnType<typeof flatten>,
  dragOffset: number,
  activeId?: UniqueIdentifier,
  overId?: UniqueIdentifier,
) {
  if (!activeId || !overId) return null;
  const overItemIndex = items.findIndex(({ flatId }) => flatId === overId);
  const activeItemIndex = items.findIndex(({ flatId }) => flatId === activeId);
  const activeItem = items[activeItemIndex];
  const newItems = arrayMove(items, activeItemIndex, overItemIndex);
  const previousItem = newItems[overItemIndex - 1];
  const nextItem = newItems[overItemIndex + 1];
  const dragDepth = Math.round(dragOffset / 50);
  let projectedDepth = activeItem.depth + dragDepth;
  const { id } = DndStore.parseFlatId(activeId);

  const hasChildren = activeItem?.group && activeItem.group.id == id;

  if (hasChildren) {
    projectedDepth = Math.min(projectedDepth, 0);
  } else {
    projectedDepth = Math.min(projectedDepth, 1);
  }

  const maxDepth = Math.min(
    previousItem ? previousItem.depth + 1 : 0,
    hasChildren ? 0 : 1,
  );
  const minDepth = Math.min(nextItem ? nextItem.depth : 0, hasChildren ? 0 : 1);
  let depth = Math.min(Math.max(projectedDepth, minDepth), maxDepth);

  let parentId = null;
  if (depth !== 0 && previousItem) {
    parentId =
      depth <= previousItem.depth ? previousItem.parentId : previousItem.id;
  }

  return {
    depth,
    maxDepth,
    minDepth,
    parentId,
  };
}

const flatten = (item: DaySchedule) => {
  return item.schedules.flatMap((item, groupIndex) => {
    const { meal, group, id } = item;

    if (group) {
      const groupFlatId = `${id}#${item.id}`;
      const children =
        group.meals?.map((meal, mealIndex) => ({
          ...item,
          flatId: `${id}#${item.id}#${meal.id}#${mealIndex}`,
          parentId: groupFlatId,
          index: mealIndex,
          depth: 1,
        })) || [];

      return [
        {
          ...item,
          flatId: groupFlatId,
          parentId: item.id,
          index: groupIndex,
          depth: 0,
        },
        ...children,
      ];
    }

    return {
      ...item,
      index: groupIndex,
      flatId: `${id}#${item.id}#${meal?.id}`,
      parentId: item.id,
      depth: 0,
    };
  });
};

const SortableTreeItem: React.FC<{
  id: UniqueIdentifier;
  depth: number;
  indentationWidth: number;
  item: ReturnType<typeof flatten>[number];
}> = (props) => {
  const { listeners, setDraggableNodeRef, setDroppableNodeRef, transform } =
    useSortable({ id: props.id });

  return (
    <li
      ref={setDroppableNodeRef}
      className="list-none"
      style={{ paddingLeft: `${props.indentationWidth * props.depth}px` }}
    >
      <div
        ref={setDraggableNodeRef}
        className="text-xs"
        style={{ transform: CSS.Translate.toString(transform) }}
        {...listeners}
      >
        {props.item.group
          ? `${props.item.group.name}#${props.item.group.id}`
          : `${props.item.meal?.name}#${props.item.meal?.id}`}
      </div>
    </li>
  );
};

export const SortableTree: React.FC = ({}) => {
  const [items, setItems] = useState<DaySchedule[]>([
    {
      id: "day1",
      servingDate: "MONDAY",
      schedules: [
        {
          id: "schedule1",
          meal: {
            id: "meal1",
            name: "meal1",
          },
        },
        {
          id: "schedule2",
          meal: {
            id: "meal2",
            name: "meal2",
          },
        },
        {
          id: "schedule3",
          group: {
            id: "group1",
            name: "group1",
            meals: [
              { id: "meal3", name: "meal3" },
              { id: "meal4", name: "meal4" },
            ],
          },
        },
      ],
    },
  ]);

  const flattened = items.flatMap(flatten);

  const [activeId, setActiveId] = useState<UniqueIdentifier | undefined>(
    undefined,
  );
  const [overId, setOverId] = useState<UniqueIdentifier | undefined>(undefined);
  const [offsetLeft, setOffsetLeft] = useState(0);

  const projected = getProjection(flattened, offsetLeft, activeId, overId);
  const sortedIds = flattened.map(({ flatId }) => flatId);
  const activeItem = flattened.find(({ flatId }) => flatId === activeId);

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={({ active }) => {
        setActiveId(active.id);
        setOverId(active.id);
      }}
      onDragMove={({ delta, active }) => {
        setOffsetLeft(delta.x);
      }}
      onDragOver={({ over, active }) => {
        setOverId(over?.id);
      }}
      onDragEnd={({ over, active }) => {
        setActiveId(undefined);
      }}
    >
      <div className="flex gap-64">
        {items.map((schedule) => {
          const flatSchedules = flatten(schedule);
          const ids = flatSchedules.map(({ flatId }) => flatId);
          return (
            <div
              key={schedule.id}
              className="border-2 p-2"
              style={{
                maxWidth: 600,
                margin: "0 auto",
              }}
            >
              <div>{schedule.servingDate}</div>
              <SortableContext items={ids} id={schedule.servingDate}>
                {flatSchedules.map((s) => (
                  <SortableTreeItem
                    key={s.flatId}
                    id={s.flatId}
                    item={s}
                    depth={
                      s.flatId === activeId && projected
                        ? projected.depth
                        : s.depth
                    }
                    indentationWidth={25}
                  />
                ))}
                <DragOverlay>
                  {activeId && activeItem && (
                    <SortableTreeItem
                      id={activeId}
                      item={activeItem}
                      depth={activeItem?.depth}
                      indentationWidth={25}
                    />
                  )}
                </DragOverlay>
              </SortableContext>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
};
