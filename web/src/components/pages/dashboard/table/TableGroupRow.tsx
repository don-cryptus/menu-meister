import { useMeHook } from "@/components/hooks/useMeHook";
import { DashboardStore } from "@/store/DashboardStore";
import TableStore from "@/store/TableStore";
import { UniqueIdentifier } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";
import { useSnapshot } from "valtio";
import { Droppable } from "./Droppable";
import { TableGroup } from "./TableGroup";

interface TableGroupRowProps {
  id: UniqueIdentifier;
}

export const TableGroupRow: React.FC<TableGroupRowProps> = ({ id }) => {
  const { isHighRank, isOrderMenu } = useMeHook();
  const tableStore = useSnapshot(TableStore);
  const { daysThatWeek } = useSnapshot(DashboardStore);
  const group = tableStore.getGroup(id)!;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    setActivatorNodeRef,
    isDragging,
  } = useSortable({ id, disabled: !isHighRank || isOrderMenu });

  if (!group) return null;

  return (
    <section
      className={`${isDragging ? "relative z-[9999]" : ""} grid grid-cols-8 gap-2 rounded-lg bg-default-300/10 p-2 focus:outline-none`}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      {...attributes}
      role="row"
      ref={setNodeRef}
    >
      <TableGroup
        id={id}
        listeners={listeners}
        activatorRef={setActivatorNodeRef}
      />
      <Droppable day="monday" group={group.id} date={daysThatWeek.at(0)} />
      <Droppable day="tuesday" group={group.id} date={daysThatWeek.at(1)} />
      <Droppable day="wednesday" group={group.id} date={daysThatWeek.at(2)} />
      <Droppable day="thursday" group={group.id} date={daysThatWeek.at(3)} />
      <Droppable day="friday" group={group.id} date={daysThatWeek.at(4)} />
      <Droppable day="saturday" group={group.id} date={daysThatWeek.at(5)} />
      <Droppable day="sunday" group={group.id} date={daysThatWeek.at(6)} />
    </section>
  );
};
