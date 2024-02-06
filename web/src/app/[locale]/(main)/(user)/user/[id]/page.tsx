"use client";

import { UserProfile } from "@/components/pages/user/settings/UserProfile";
import { GET_USER_ADMIN } from "@/documents/query/user";
import { useGqlQuery } from "@/fetcher";
import { User } from "@/gql/graphql";

interface UserDetailsPageProps {
  params: { id: number };
}

export default function UserDetailsPage({ params }: UserDetailsPageProps) {
  const { data: { getUserAdmin } = {}, refetch } = useGqlQuery(GET_USER_ADMIN, {
    where: { id: { equals: params.id } },
  });
  return <UserProfile user={getUserAdmin as User} refetch={refetch} />;
}
