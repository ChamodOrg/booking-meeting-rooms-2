import type { ReactElement } from "react";
import { useLocation } from "react-router-dom";
import { Alert, AlertTitle, PageContent, PageTitle } from "@wso2/oxygen-ui";

// Placeholder until F3. It only shows the confirmation F2 hands over after a
// successful booking (router state `booked`).
export function MyBookingsPage(): ReactElement {
  const state = useLocation().state as { booked?: string } | null;
  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>My bookings</PageTitle.Header>
      </PageTitle>
      {state?.booked && (
        <Alert severity="success">
          <AlertTitle>Room booked</AlertTitle>
          {state.booked}
        </Alert>
      )}
    </PageContent>
  );
}
