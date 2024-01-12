import {
  GroupedSchedules,
  INITIAL_DATAS,
  ItemType,
  Meal,
} from "@/utils/constants";
import {
  Active,
  DragEndEvent,
  DragOverEvent,
  Over,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import dayjs from "dayjs";
import { Group } from "next/dist/shared/lib/router/utils/route-regex";
import { proxy } from "valtio";
import DashboardStore from "./DashboardStore";

export const PLACEHOLDER_KEY = "!";

const TableStore = proxy({
  active: undefined as Active | undefined,
  initialSchedules: INITIAL_DATAS,
  schedules: {} as GroupedSchedules,
  getItem: (
    group: string,
    uniqueId: UniqueIdentifier,
  ): Meal | Group | null | undefined => {
    if (!uniqueId) return null;
    const { id, mealId, groupIndex } = TableStore.parseId(uniqueId);
    const daySchedule = TableStore.initialSchedules.find(
      ({ servingDate }) => !dayjs(servingDate).diff(group, "day"),
    );
    const schedule = daySchedule?.schedules.find(
      ({ id: scheduleId }) => id === scheduleId,
    );
    return schedule?.meal ?? schedule?.group?.id === mealId
      ? schedule.group
      : schedule?.group?.meals[parseInt(groupIndex)];
  },
  parseId: (uniqueId?: UniqueIdentifier) => {
    const [id, mealId, groupIndex] = uniqueId?.toString().split("#") ?? [];
    return { id, mealId, groupIndex };
  },
  regroupSchedules: () => {
    const newGroupedSchedules: GroupedSchedules = {};
    DashboardStore.daysThatWeek.forEach(
      (day) => (newGroupedSchedules[dayjs(day).format("YYYY-MM-DD")] = []),
    );

    TableStore.initialSchedules.forEach(({ schedules, servingDate }) => {
      const formattedDate = dayjs(servingDate).format("YYYY-MM-DD");
      schedules.forEach(
        (schedule) =>
          newGroupedSchedules[formattedDate]?.push(
            ...(schedule.group
              ? [
                  {
                    id: `${schedule.id}#${schedule.group.id}`,
                    container: true,
                  },
                  ...schedule.group.meals.map((meal, index) => ({
                    id: `${schedule.id}#${meal.id}#${index}`,
                    parent: `${schedule.id}#${schedule.group?.id}`,
                  })),
                ]
              : [{ id: `${schedule.id}#${schedule.meal?.id}` }]),
          ),
      );
    });
    TableStore.schedules = newGroupedSchedules;
  },

  // ###########################################################
  findItem: (group: string, id?: UniqueIdentifier) =>
    group
      ? TableStore.schedules[group].find((item) => item.id === id)
      : undefined,
  getItems: (group: string, parent?: UniqueIdentifier) =>
    group
      ? TableStore.schedules[group].filter((item) =>
          parent ? item.parent === parent : !item.parent,
        )
      : [],
  isContainer: (group: string, id?: UniqueIdentifier) =>
    !!TableStore.findItem(group, id)?.container,
  getItemIds: (group: string, parent?: UniqueIdentifier) =>
    TableStore.getItems(group, parent)?.map((item) => item.id),
  findParent: (group: string, id?: UniqueIdentifier) =>
    TableStore.findItem(group, id)?.parent,

  getGroup: (item: Active | Over | null | undefined): string =>
    item?.data.current?.sortable?.containerId ||
    item?.data.current?.group ||
    TableStore.active?.data.current?.sortable?.containerId ||
    TableStore.active?.data.current?.group,
  dragEvenData: ({ active, over }: { active: Active; over: Over | null }) => {
    const overGroup = TableStore.getGroup(over);
    const activeGroup = TableStore.getGroup(active);
    const activeItem = TableStore.findItem(activeGroup, active.id);
    const overItem = TableStore.findItem(overGroup, over?.id);
    const key = overGroup ?? activeGroup;
    const activeIndex = TableStore.schedules[activeGroup || key].findIndex(
      (item) => item.id === active.id,
    );
    const overIndex = TableStore.schedules[overGroup || key].findIndex(
      (item) => item.id === over?.id,
    );

    return {
      overGroup,
      activeGroup,
      activeItem,
      overItem,
      key,
      activeIndex,
      overIndex,
    };
  },
  // ###########################################################

  handleFooterAreaDrag: (active: Active, over: Over | null) => {
    const containerId = over?.id.toString().split(PLACEHOLDER_KEY).at(0);
    if (!containerId) return;
    const overGroup = TableStore.getGroup(over);
    const updatedItems = TableStore.schedules[overGroup].filter(
      (item) => item.id !== active.id,
    );
    const containerIndex = updatedItems.findIndex(
      (item) => item.id === containerId,
    );
    updatedItems.splice(containerIndex + 1, 0, { id: active.id });
    TableStore.schedules[overGroup] = updatedItems;
  },

  onDragOver: ({ active, over, collisions }: DragOverEvent) => {
    const data = TableStore.dragEvenData({ active, over });
    const overId = over?.id;
    if (!overId) return;

    const activeContainer = TableStore.getGroup(active);
    const overContainer = TableStore.getGroup(over);

    const items = [
      TableStore.findItem(data.activeGroup, active.id),
      ...(TableStore.isContainer(data.activeGroup, active.id)
        ? TableStore.getItems(data.activeGroup, active.id)
        : []),
    ].filter(Boolean) as ItemType[];
    if (activeContainer !== overContainer) {
      const data = TableStore.dragEvenData({ active, over });
      TableStore.moveBetweenContainers(
        activeContainer,
        data.activeIndex,
        overContainer,
        data.overIndex,
        items,
      );
    }
    // const overParent = TableStore.findParent(data.overGroup, over?.id);
    // if (
    //   !data.activeItem ||
    //   (data.activeItem?.container && data.overItem?.container) || // dragging over a container
    //   overParent === active.id // dragging over a child
    // )
    //   return;
    // if (data.overGroup === over?.id) {
    //   const items = [
    //     TableStore.findItem(data.activeGroup, active.id),
    //     ...(TableStore.isContainer(data.activeGroup, active.id)
    //       ? TableStore.getItems(data.activeGroup, active.id)
    //       : []),
    //   ].filter(Boolean) as ItemType[];
    //   TableStore.schedules[data.activeGroup] = TableStore.schedules[
    //     data.activeGroup
    //   ].filter((item) => !items.some((i) => i.id === item.id));
    //   TableStore.schedules[over?.id] = items;
    //   return;
    // }
    // if (
    //   over?.id.toString().includes(PLACEHOLDER_KEY) &&
    //   !TableStore.isContainer(data.activeGroup, active.id)
    // ) {
    //   return TableStore.handleFooterAreaDrag(active, over);
    // }
    // if (!data.activeGroup) return;
    // let newIndex;
    // if (data.overIndex >= 0) {
    //   const isLastIndex =
    //     over &&
    //     data.overIndex ===
    //       TableStore.schedules[data.overGroup || data.key].length - 1;
    //   if (isLastIndex) {
    //     newIndex = data.overIndex + 1;
    //   } else {
    //     newIndex = data.overIndex;
    //   }
    // } else {
    //   newIndex = TableStore.schedules[data.overGroup || data.key].length;
    // }
    // // Finding the next parent for the dragged item
    // let nextParent;
    // if (TableStore.isContainer(data.overGroup, over?.id)) {
    //   nextParent = over?.id;
    // } else {
    //   nextParent = TableStore.findParent(data.overGroup, over?.id);
    // }
    // // Updating the parent of the active item and moving it in the array
    // if(!TableStore.schedules[data.key][data.activeIndex]) return;
    // TableStore.schedules[data.key][data.activeIndex].parent = nextParent;
    // TableStore.schedules[data.key] = arrayMove(
    //   TableStore.schedules[data.key],
    //   data.activeIndex,
    //   newIndex,
    // );
  },
  onDragEnd: ({ active, over, delta }: DragEndEvent) => {
    let data = TableStore.dragEvenData({ active, over });
    if (!over) {
      TableStore.active = undefined;
      return;
    }

    const items = [
      TableStore.findItem(data.activeGroup, active.id),
      ...(TableStore.isContainer(data.activeGroup, active.id)
        ? TableStore.getItems(data.activeGroup, active.id)
        : []),
    ].filter(Boolean) as ItemType[];
    if (active.id !== over.id) {
      const activeContainer = TableStore.getGroup(active);
      const overContainer = TableStore.getGroup(over);
      const activeIndex = active.data.current?.sortable.index;
      const overIndex = over.data.current?.sortable.index;

      if (activeContainer === overContainer) {
        TableStore.active = undefined;
        TableStore.schedules[activeContainer] = arrayMove(
          TableStore.schedules[activeContainer],
          activeIndex,
          overIndex,
        );
      } else {
        TableStore.moveBetweenContainers(
          activeContainer,
          activeIndex,
          overContainer,
          overIndex,
          items,
        );
      }
    }

    // if (!data.activeItem) return (TableStore.active = undefined);

    // //drag to empty new day
    // if (data.overGroup === over?.id) {
    //   return (TableStore.active = undefined);
    // }

    // if (
    //   over?.id.toString().includes(PLACEHOLDER_KEY) &&
    //   !TableStore.isContainer(TableStore.getGroup(active), active.id)
    // ) {
    //   TableStore.handleFooterAreaDrag(active, over);
    //   return (TableStore.active = undefined);
    // }

    // data.overIndex =
    //   data.overIndex < 0
    //     ? delta.y > 0
    //       ? TableStore.schedules[data.key].length
    //       : 0
    //     : data.overIndex;

    // if (data.activeIndex !== data.overIndex) {
    //   TableStore.schedules[data.key] = arrayMove(
    //     TableStore.schedules[data.key],
    //     data.activeIndex,
    //     data.overIndex,
    //   );
    // }

    // TableStore.active = undefined;
  },

  moveBetweenContainers: (
    activeContainer: string,
    activeIndex: number,
    overContainer: string,
    overIndex: number,
    items: ItemType[],
  ) => {
    TableStore.schedules = {
      ...TableStore.schedules,
      [activeContainer]: [
        ...TableStore.schedules[activeContainer].slice(0, activeIndex),
        ...TableStore.schedules[activeContainer].slice(
          activeIndex + items.length,
        ),
      ],
      [overContainer]: [
        ...TableStore.schedules[overContainer].slice(0, overIndex),
        ...items,
        ...TableStore.schedules[overContainer].slice(overIndex),
      ],
    };
  },
});

export default TableStore;
