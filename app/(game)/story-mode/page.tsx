import { PageWrapper } from "@/components/page-wrapper";
import { StoryModeInfo } from "@/components/story-mode-info";
import { StoryModeGrid } from "@/components/story-mode-grid";

export default function StoryModePage() {
  return (
    <PageWrapper sidebar={<StoryModeInfo />}>
      <StoryModeGrid />
    </PageWrapper>
  );
}
