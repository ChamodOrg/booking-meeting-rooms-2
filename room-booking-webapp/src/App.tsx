import { useEffect, type ReactElement } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Box, CircularProgress, Layout, Stack, Typography } from "@wso2/oxygen-ui";
import {
  AuthzProvider,
  Forbidden,
  NoAccess,
  RequireOperation,
  useAuthz,
  useScopes,
} from "./authz/gates";
import { SCREEN_ROUTES, reachableScreens, hasScopedReach } from "./authz/screens";
import { setForbiddenNavigator } from "./authz/client";
import { signIn } from "./authz/session";
import { APP_NAME } from "./appName";
import { AppShell } from "./shell/AppShell";
import { CallbackPage } from "./pages/Callback";
import { RoomsPage } from "./pages/Rooms";
import { RoomPage } from "./pages/Room";
import { BookPage } from "./pages/Book";
import { MyBookingsPage } from "./pages/MyBookings";
import { AccountPage } from "./pages/Account";
import { SignedOutPage } from "./pages/SignedOut";

/** Pages keyed by the screen keys src/authz/screens.ts declares. */
const PAGE_BY_KEY: Record<string, ReactElement> = {
  rooms: <RoomsPage />,
  room: <RoomPage />,
  book: <BookPage />,
  "my-bookings": <MyBookingsPage />,
  account: <AccountPage />,
  "signed-out": <SignedOutPage />,
};

const PUBLIC_SCREENS = SCREEN_ROUTES.filter((screen) => screen.public);

export default function App(): ReactElement {
  return (
    <>
      <ForbiddenWiring />
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        {PUBLIC_SCREENS.map((screen) => (
          <Route
            key={screen.key}
            path={screen.path}
            element={<AuthzProvider fallback={<Splash />}>{PAGE_BY_KEY[screen.key]}</AuthzProvider>}
          />
        ))}
        <Route
          path="*"
          element={
            <AuthzProvider fallback={<Splash />}>
              <SignedIn />
            </AuthzProvider>
          }
        />
      </Routes>
    </>
  );
}

/** Hands src/authz/client.ts the route a refusal goes to; once, above every route. */
function ForbiddenWiring(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setForbiddenNavigator(() => navigate("/forbidden", { replace: true }));
  }, [navigate]);
  return null;
}

export function Splash(): ReactElement {
  return (
    <Layout.Content>
      <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ height: "100%", p: 4 }}>
        <Typography variant="h5">{APP_NAME}</Typography>
        <CircularProgress size={24} />
        <Box>
          <Typography variant="body2" color="text.secondary">
            Checking your session…
          </Typography>
        </Box>
      </Stack>
    </Layout.Content>
  );
}

function SignedIn(): ReactElement {
  const { signedIn } = useAuthz();
  const scopes = useScopes();

  // Only a MISSING session starts a sign-in (an expired one was renewed silently).
  useEffect(() => {
    if (!signedIn) void signIn();
  }, [signedIn]);

  if (!signedIn) return <Splash />;

  // NoAccess REPLACES the shell: no rail around "you have no access".
  if (!hasScopedReach(scopes, signedIn)) return <NoAccess appName={APP_NAME} />;

  const reachable = reachableScreens(scopes, signedIn);
  const landing = (reachable.find((s) => !s.public && s.loads !== null) ?? reachable[0]).path;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={landing} replace />} />
        {SCREEN_ROUTES.map((screen) => {
          if (screen.public) return null;
          const page = PAGE_BY_KEY[screen.key];
          if (screen.loads === null) {
            return <Route key={screen.key} path={screen.path} element={page} />;
          }
          return (
            <Route
              key={screen.key}
              element={<RequireOperation op={screen.loads} screen={screen.label} />}
            >
              <Route path={screen.path} element={page} />
            </Route>
          );
        })}
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<Navigate to={landing} replace />} />
      </Route>
    </Routes>
  );
}
