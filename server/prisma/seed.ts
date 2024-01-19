import { faker } from "@faker-js/faker";
import { PrismaClient, UserRoleName } from "@prisma/client";
import argon2 from "argon2";
import { error } from "console";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";

const prisma = new PrismaClient();

const EMAIL = "admin@admin.de";

const BLACKLISTED_IMG = [
  "2094537432367104",
  "1049880564858880",
  "8889722722058240",
  "5180683746017280",
  "2856251358707712",
  "1309938542444544",
];

const randomInt = (min = 0, max = 10) =>
  Math.floor(Math.random() * (max - min + 1) + min);

const coinFlip = (probability = 0.5) =>
  Math.random() <= probability ? true : false;

const getImageFile = (name: string) => join(resolve(), "images", name);

const seed = async () => {
  const userCount = await prisma.user.count();
  if (userCount > 0) return;

  await createUser({
    email: EMAIL,
    password: "!admin",
    roles: ["ADMIN"],
  });

  await seedIngredientsAndNutritions();
  await seedMeals();
  await seedWeeklyMealGroups();
};

async function downloadImage(url: string) {
  const name = new URL(url).searchParams.get("lock");
  const category = new URL(url).pathname.split("/").at(-1);
  const filename = `${category}-${name}.jpg`;

  const filePath = getImageFile(filename);

  if (existsSync(filePath)) {
    return { file: readFileSync(filePath, "base64"), filename };
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const imageBuffer = await response.arrayBuffer();
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, Buffer.from(imageBuffer), "base64");
  return { file: Buffer.from(imageBuffer).toString("base64"), filename };
}

const seedIngredientsAndNutritions = async () => {
  const user = await prisma.user.findFirst({
    where: { email: EMAIL },
  });

  for (const _ of Array(100).keys()) {
    const ingredientName = faker.commerce.product();

    const imgUrl = faker.image.urlLoremFlickr({
      category: "ingredients",
      width: 200,
      height: 200,
    });

    let blacklist = false;

    for (const blacklisted of BLACKLISTED_IMG) {
      if (imgUrl.includes(blacklisted)) {
        blacklist = true;
      }
    }

    const image = !blacklist
      ? await downloadImage(imgUrl)
      : { file: null, filename: null };

    // Create ingredient individually
    const ingredient = await prisma.ingredient.create({
      data: {
        name: ingredientName,
        allergens: faker.helpers.arrayElement([
          "nuts",
          "dairy",
          "gluten",
          null,
        ]),
        imageName: image.filename,
        image: image.file,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    // Create corresponding nutrition data
    await prisma.nutrition.create({
      data: {
        ingredientId: ingredient.id,
        calories: faker.number.float({ min: 0, max: 500 }),
        protein: faker.number.float({ min: 0, max: 100 }),
        carbohydrates: faker.number.float({ min: 0, max: 100 }),
        fats: faker.number.float({ min: 0, max: 100 }),
        fiber: faker.number.float({ min: 0, max: 100 }),
        createdBy: user.id,
        updatedBy: user.id,
      },
    });
  }
};

const seedMeals = async () => {
  const user = await prisma.user.findFirst({
    where: { email: EMAIL },
  });

  for (const _ of Array(100).keys()) {
    const imgUrl = faker.image.urlLoremFlickr({
      category: "meal",
      width: 200,
      height: 200,
    });

    let blacklist = false;
    for (const blacklisted of BLACKLISTED_IMG) {
      if (imgUrl.includes(blacklisted)) {
        blacklist = true;
      }
    }

    const image = !blacklist
      ? await downloadImage(imgUrl)
      : { file: null, filename: null };

    const meal = await prisma.meal.create({
      data: {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        imageName: image.filename,
        image: image.file,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    await seedMealIngredients(meal.id, user.id);
  }
};

async function seedWeeklyMealGroups() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });

  const meals = await prisma.meal.findMany();

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 2;
  const endYear = currentYear + 2;
  const groupsPerWeek = 3;
  const dayFields = [
    "mondayMealId",
    "tuesdayMealId",
    "wednesdayMealId",
    "thursdayMealId",
    "fridayMealId",
    "saturdayMealId",
    "sundayMealId",
  ];
  for (let year = startYear; year <= endYear; year++) {
    for (let week = 1; week <= 52; week++) {
      for (let groupIndex = 0; groupIndex < groupsPerWeek; groupIndex++) {
        if (coinFlip(0.25)) continue;
        const weeklyMealGroup = await prisma.weeklyMealGroup.create({
          data: {
            name: faker.commerce.productName(),
            description: faker.lorem.sentence(),
            color: faker.internet.color({
              redBase: 100,
              greenBase: 100,
              blueBase: 100,
            }),
            weekOfYear: week,
            orderIndex: groupIndex,
            year,
            createdBy: user.id,
            updatedBy: user.id,
          },
        });

        for (const dayField of dayFields) {
          const randomMeal = meals[randomInt(0, meals.length - 1)];

          if (coinFlip(0.75)) {
            await prisma.weeklyMealGroup.update({
              where: { id: weeklyMealGroup.id },
              data: {
                [dayField]: randomMeal.id,
              },
            });
          }
        }
      }
    }
  }
}

const seedMealIngredients = async (mealId: number, userId: number) => {
  const ingredients = await prisma.ingredient.findMany();
  const selectedIngredients = faker.helpers.uniqueArray(
    ingredients,
    randomInt(2, 5),
  );

  for (const ingredient of selectedIngredients) {
    await prisma.mealIngredient.create({
      data: {
        mealId: mealId,
        ingredientId: ingredient.id,
        weightGrams: faker.number.float({ min: 1, max: 500 }),
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }
};

const createUser = async ({
  roles,
  email,
  password,
}: {
  email: string;
  password: string;
  roles: (keyof typeof UserRoleName)[];
}) => {
  const user = await prisma.user.create({
    data: {
      email,
      username: faker.internet.userName(),
      password: await argon2.hash(password),
      lastOnline: faker.date.past(),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  for (const role of roles) {
    await prisma.userRole.create({
      data: {
        userId: user.id,
        name: role,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });
  }

  return user;
};

seed()
  .catch((e) => {
    error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
