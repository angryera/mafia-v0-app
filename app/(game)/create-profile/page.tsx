"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { CreateProfileAction } from "@/components/create-profile-action";
import { CreateProfileInfo } from "@/components/create-profile-info";

export default function CreateProfilePage() {
  return (
    <PageWrapper sidebar={<CreateProfileInfo />}>
      <CreateProfileAction />
    </PageWrapper>
  );
}
