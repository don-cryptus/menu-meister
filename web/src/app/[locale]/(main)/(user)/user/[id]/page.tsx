"use client";

import { UserProfile } from "@/components/pages/user/settings/UserProfile";
import { GET_USER_ADMIN } from "@/documents/query/user";
import { useGqlQuery } from "@/fetcher";
import { ResultOf } from "gql.tada";

interface UserDetailsPageProps {
  params: { id: string };
}

export default function UserDetailsPage({ params }: UserDetailsPageProps) {
  const { data: { getUserAdmin } = {}, refetch } = useGqlQuery(GET_USER_ADMIN, {
    where: { id: { equals: params.id } },
  });
  return (
    <main className="mt-5 w-full max-w-3xl rounded-lg bg-default-50 p-5">
      <UserProfile
        user={getUserAdmin as ResultOf<typeof GET_USER_ADMIN>["getUserAdmin"]}
        refetch={refetch}
      />{" "}
    </main>
  );
}
