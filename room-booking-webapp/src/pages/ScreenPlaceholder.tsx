import type { ReactElement } from "react";
import { PageContent, PageTitle } from "@wso2/oxygen-ui";

// Foundation only: the screen's route and title. Its content belongs to the
// feature item that builds it (F1-F3).
export function ScreenPlaceholder({ title }: { title: string }): ReactElement {
  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>{title}</PageTitle.Header>
      </PageTitle>
    </PageContent>
  );
}
