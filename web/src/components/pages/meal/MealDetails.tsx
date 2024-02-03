"use client";

import { FileInput } from "@/components/utils/FileInput";
import { UPLOAD_MEAL_IMAGE_ADMIN } from "@/documents/mutation/menu";
import { GET_MEAL_ADMIN } from "@/documents/query/meal";
import { useGqlMutation, useGqlQuery } from "@/fetcher";
import TableStore from "@/store/TableStore";
import { catchErrorAlerts } from "@/utils/helpers/clientUtils";
import { Listbox, ListboxItem } from "@nextui-org/react";
import { IoTrashOutline } from "@react-icons/all-files/io5/IoTrashOutline";
import { useTranslations } from "next-intl";
import Image from "next/image";
import React from "react";
import { MealProperties } from "./MealProperties";

interface MealDetailsProps {
  id: number;
  modal?: boolean;
}

export const MealDetails: React.FC<MealDetailsProps> = ({ id, modal }) => {
  const t = useTranslations<"Meal">();
  const [files, setFiles] = React.useState<File[]>([]);
  const { data: { getMealAdmin } = {}, refetch } = useGqlQuery(GET_MEAL_ADMIN, {
    where: { id: { equals: Number(id) } },
  });

  const { mutateAsync: uploadImage } = useGqlMutation(UPLOAD_MEAL_IMAGE_ADMIN);

  console.log(getMealAdmin);

  return (
    <div
      className={`w-full rounded-lg bg-content1 p-5 ${modal ? "" : "container mx-auto mt-5"} flex space-x-10`}
    >
      <div className="w-4/6">
        <h1 className="text-left text-xl font-bold">{getMealAdmin?.name}</h1>

        <div className="mt-5 w-full rounded-small border-small border-default-200 px-1 py-2 dark:border-default-100">
          <Listbox>
            {(getMealAdmin?.mealRecipe || []).map(({ id, recipe }) => (
              <ListboxItem
                key={id}
                className="text-left"
                endContent={<IoTrashOutline className="hover:text-red-500" />}
              >
                {recipe.name}
              </ListboxItem>
            ))}
          </Listbox>
        </div>
      </div>
      <div className="flex flex-1 flex-col space-y-5">
        {getMealAdmin?.image && (
          <Image
            alt={"MEAL"}
            className={`h-28 w-full rounded-xl object-cover`}
            src={`data:image/jpeg;base64,${getMealAdmin.image}`}
            width={200}
            height={200}
          />
        )}
        {
          <FileInput
            files={files}
            setFiles={async (e) => {
              try {
                await uploadImage({
                  mealId: Number(getMealAdmin?.id),
                  file: e[0],
                });
                refetch();
                TableStore?.refetchWeeklyMealGroups();
              } catch (error) {
                catchErrorAlerts(error);
              }

              setFiles([]);
            }}
          />
        }
        <MealProperties
          title={t("ALLERGENS")}
          items={getMealAdmin?.allergens || []}
        />
      </div>
    </div>
  );
};
