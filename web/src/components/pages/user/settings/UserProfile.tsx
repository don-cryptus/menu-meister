import { MyAutocomplete } from "@/components/elements/MyAutocomplete";
import { MyConfirmModal } from "@/components/elements/MyConfirmModal";
import { useIngredientPropertiesHook } from "@/components/hooks/useIngredientPropertiesHook";
import { useMeHook } from "@/components/hooks/useMeHook";
import { MealLocation, TimeOfDay } from "@/gql/graphql";
import { catchErrorAlerts } from "@/utils/helpers/clientUtils";
import {
  Button,
  Card,
  CardBody,
  Listbox,
  ListboxItem,
} from "@nextui-org/react";
import { FaRegTrashAlt } from "@react-icons/all-files/fa/FaRegTrashAlt";
import { useTranslations } from "next-intl";
import React, { useState } from "react";

interface UserProfileProps {}

type TimeOfDayAndMealLocation = {
  timeOfDay: string;
  mealLocation: string;
};

export const UserProfile: React.FC<UserProfileProps> = ({}) => {
  const t = useTranslations<"User" | "Allergens" | "Enums">();
  const { me, refetchMe, updateUserAllergens, createUserMealLocation } =
    useMeHook();
  const { allergens } = useIngredientPropertiesHook();
  const [allergen, setAllergen] = useState<string>("");
  const [timeOfDayAndMealLocation, setTimeOfDayAndMealLoction] =
    useState<TimeOfDayAndMealLocation>({
      timeOfDay: "",
      mealLocation: "",
    });

  const submit = async (args?: TimeOfDayAndMealLocation) => {
    const changedState = args || timeOfDayAndMealLocation;

    if (changedState.timeOfDay && changedState.mealLocation) {
      try {
        await createUserMealLocation({
          data: {
            userId: Number(me?.id),
            mealLocation: changedState.mealLocation as MealLocation,
            timeOfDay: changedState.timeOfDay as TimeOfDay,
          },
        });
        refetchMe();
        setTimeOfDayAndMealLoction({ timeOfDay: "", mealLocation: "" });
      } catch (error) {
        catchErrorAlerts(error, t);
      }
    } else {
      setTimeOfDayAndMealLoction(changedState);
    }
  };

  return (
    <section className="subpixel-antialiased">
      <p className="text-large">{t("PROFILE_DETAILS")}</p>
      <p className="mb-3 text-small text-default-400">
        {t("PROFILE_DETAILS_DESCRIPTION")}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <MyAutocomplete
              label={t("ALLERGENS")}
              labelPlacement="outside"
              placeholder=" "
              aria-label="Allergens"
              value={allergen}
              size="sm"
              onSelectionChange={async (key) => {
                const allergy = allergens?.find(
                  (allergen) => allergen.id === Number(key),
                );
                if (key && allergy) {
                  await updateUserAllergens({
                    data: {
                      allergens: {
                        connectOrCreate: [
                          {
                            create: { name: allergy.name },
                            where: { id: allergy.id },
                          },
                        ],
                      },
                    },
                  });
                  refetchMe();
                  setAllergen("");
                }
              }}
              items={(allergens || [])
                .filter((a) => !me?.allergens?.find((b) => b.name === a.name))
                .map(({ id, name }) => ({
                  id,
                  name: t(name as keyof Messages["Allergens"]),
                }))}
            />
            <Listbox
              emptyContent={t("NO_ALLERGIES")}
              aria-label={t("ALLERGENS")}
            >
              {(me?.allergens || []).map(({ id, name }) => (
                <ListboxItem
                  key={id}
                  endContent={
                    <MyConfirmModal
                      title={t("WARNING")}
                      Footer={({ onOpen }) => (
                        <div className="flex items-center justify-between">
                          <Button
                            color="danger"
                            onClick={async () => {
                              try {
                                await updateUserAllergens({
                                  data: { allergens: { delete: [{ id }] } },
                                });
                                onOpen();
                                refetchMe();
                              } catch (error) {
                                catchErrorAlerts(error, t);
                              }
                            }}
                          >
                            {t("YES")}
                          </Button>
                        </div>
                      )}
                      Trigger={({ onOpen }) => (
                        <FaRegTrashAlt
                          onClick={() => onOpen()}
                          className="m-2 cursor-pointer text-sm hover:text-red-600"
                        />
                      )}
                    >
                      <span>
                        {t.rich("ARE_YOU_SURE_YOU_WANT_TO_DELETE_THIS", {
                          item: t(name as keyof Messages["Allergens"]),
                          placeholder: (chunks) => (
                            <span className="font-bold">{chunks}</span>
                          ),
                        })}
                      </span>
                    </MyConfirmModal>
                  }
                >
                  {t(name as keyof Messages["Allergens"])}
                </ListboxItem>
              ))}
            </Listbox>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <form
              className="flex items-center space-x-3"
              onSubmit={async (e) => {
                e.preventDefault();
                await submit();
              }}
            >
              <MyAutocomplete
                label={t("TIME_OF_DAY")}
                labelPlacement="outside"
                placeholder=" "
                value={timeOfDayAndMealLocation.timeOfDay}
                required
                size="sm"
                onSelectionChange={async (key) => {
                  const changedState = {
                    ...timeOfDayAndMealLocation,
                    timeOfDay: key as string,
                  };
                  await submit(changedState);
                }}
                items={Object.values(TimeOfDay).map((time) => ({
                  id: time,
                  name: t(time as keyof Messages["Enums"]),
                }))}
              />
              <MyAutocomplete
                label={t("MEAL_LOCATION")}
                labelPlacement="outside"
                placeholder=" "
                required
                value={timeOfDayAndMealLocation.mealLocation}
                size="sm"
                onSelectionChange={async (key) => {
                  const changedState = {
                    ...timeOfDayAndMealLocation,
                    mealLocation: key as string,
                  };
                  await submit(changedState);
                }}
                items={Object.values(MealLocation).map((location) => ({
                  id: location,
                  name: t(location as keyof Messages["Enums"]),
                }))}
              />
            </form>
            <Listbox
              emptyContent={t("NO_USER_MEAL_LOCATION")}
              aria-label={t("TIME_OF_DAY")}
            >
              {(me?.userMealLocation || []).map(
                ({ id, mealLocation, timeOfDay }) => (
                  <ListboxItem
                    key={id}
                    endContent={
                      <FaRegTrashAlt className="cursor-pointer hover:text-red-600" />
                    }
                  >
                    <div className="flex items-center justify-between space-x-2">
                      <p>{t(timeOfDay as keyof Messages["Enums"])}</p>
                      <div className="text-xl">|</div>
                      <p>{t(mealLocation as keyof Messages["Enums"])}</p>
                    </div>
                  </ListboxItem>
                ),
              )}
            </Listbox>
          </CardBody>
        </Card>
      </div>
    </section>
  );
};
