import { useWeeklyMealGroupHook } from "@/components/hooks/useWeeklyMealGroupHook";
import { Meal } from "@/gql/graphql";
import DashboardStore from "@/store/DashboardStore";
import TableStore from "@/store/TableStore";
import { WEEK_DAYS } from "@/utils/constants";
import { DayMeals } from "@/utils/types";
import { DndContext } from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useSnapshot } from "valtio";
import { TableGroupRow } from "./TableGroupRow";

export function TableContext() {
  const { updateWeeklyMealGroup, switchWeeklyMealGroup } =
    useWeeklyMealGroupHook();
  const t = useTranslations<"Dashboard">();
  const dashboardStore = useSnapshot(DashboardStore);
  const tableStore = useSnapshot(TableStore);

  const renderDayColumn = (dayKey: string, index: number) => {
    const dayName = t(dayKey as keyof Messages["Dashboard"]);
    const date = dayjs(dashboardStore.daysThatWeek.at(index)).format("DD.MM");

    return (
      <div key={dayKey} title={dayName}>
        {`${dayName.substring(0, 2)}. ${date}`}
      </div>
    );
  };

  const dayColumns = useMemo(() => {
    return WEEK_DAYS.map((day, index) =>
      renderDayColumn(day.toUpperCase(), index),
    );
  }, [dashboardStore.daysThatWeek, t]); // Add dependencies here

  return (
    <main className="relative z-0 mt-5 flex w-full flex-col justify-between gap-4 rounded-large bg-content1 p-4 shadow-small">
      <div className="grid grid-cols-8 gap-2 rounded-lg bg-default-100 p-2 text-tiny font-semibold text-foreground-500">
        <div />
        {dayColumns}
      </div>

      <DndContext
        onDragStart={({ active }) => (TableStore.active = active)}
        onDragEnd={({ active, over }) => {
          // group sorting
          if (active.data.current?.sortable && over?.data.current?.sortable) {
            const activeIndex = active.data.current?.sortable.index;
            const overIndex = over.data.current?.sortable.index;

            if (activeIndex !== overIndex) {
              TableStore.data = TableStore.data.map((group) => {
                if (group.id === Number(active.id)) {
                  return { ...group, orderIndex: overIndex };
                } else if (group.id === Number(over.id)) {
                  return { ...group, orderIndex: activeIndex };
                } else {
                  return group;
                }
              });
              updateWeeklyMealGroup({
                where: { id: Number(active.id) },
                data: { orderIndex: { set: overIndex } },
              });
              updateWeeklyMealGroup({
                where: { id: Number(over.id) },
                data: { orderIndex: { set: activeIndex } },
              });
            }
          }

          // meal sorting
          if (active.data.current?.meal.id && over) {
            const activeMeal = active.data.current.meal as Meal;
            const activeDay = active.data.current.day as string;
            const activeGroupId = active.data.current.group as number;
            const overDay = over?.data.current?.day as string;
            const overGroupId = over?.data.current?.group as number;

            // meal sorting changed
            if (activeDay !== overDay || activeGroupId !== overGroupId) {
              // check if over has meal already
              const overMeal = (
                TableStore.data.find((group) => group.id === overGroupId) as any
              )[`${overDay}Meal`] as Meal | undefined;

              // Update the local store
              TableStore.data = TableStore.data.map((group) => {
                if (group.id === activeGroupId) {
                  group[`${activeDay}Meal` as DayMeals] = overMeal || null;
                }
                if (group.id === overGroupId) {
                  group[`${overDay}Meal` as DayMeals] = activeMeal;
                }
                return group;
              });
              //remove activeMeal from activeDay
              switchWeeklyMealGroup({
                data: {
                  activeDay,
                  activeGroupId,
                  activeMealId: activeMeal.id,
                  overMealId: overMeal?.id,
                  overDay,
                  overGroupId,
                },
              });
            }
          }

          TableStore.active = undefined;
        }}
        onDragCancel={() => (TableStore.active = undefined)}
        modifiers={[restrictToWindowEdges]}
      >
        <SortableContext
          strategy={verticalListSortingStrategy}
          items={tableStore.dataSorted.map((i) => i.id)}
        >
          {tableStore.dataSorted.map((value) => (
            <TableGroupRow key={value.id} id={value.id} />
          ))}
        </SortableContext>
      </DndContext>
    </main>
  );
}