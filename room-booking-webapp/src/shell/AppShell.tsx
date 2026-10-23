import { useEffect, useState, type ReactElement } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppShell as OxygenAppShell,
  ColorSchemeToggle,
  Divider,
  Footer,
  Header,
  Sidebar,
  UserMenu,
} from "@wso2/oxygen-ui";
import { CalendarCheck, DoorOpen, User } from "@wso2/oxygen-ui-icons-react";
import { Can, heldRoles, useAuthz } from "../authz/gates";
import { currentUser, signOut } from "../authz/session";
import { APP_NAME } from "../appName";

// The one rail, in the prototype's nav order. Each item is gated on the
// operation its screen loads (see src/authz/screens.ts).
const NAV = [
  { id: "rooms", label: "Rooms", to: "/rooms", op: "GET /rooms", icon: <DoorOpen /> },
  { id: "my-bookings", label: "My bookings", to: "/my-bookings", op: "GET /me/bookings", icon: <CalendarCheck /> },
] as const;

function activeId(pathname: string): string {
  if (pathname.startsWith("/my-bookings")) return "my-bookings";
  if (pathname.startsWith("/rooms") || pathname.startsWith("/room/") || pathname.startsWith("/book")) {
    return "rooms";
  }
  return "";
}

export function AppShell(): ReactElement {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { username } = useAuthz();
  const [email, setEmail] = useState("");

  useEffect(() => {
    void currentUser().then((user) => {
      const value = user?.profile?.email;
      if (typeof value === "string") setEmail(value);
    });
  }, []);

  const roles = heldRoles();

  return (
    <OxygenAppShell>
      <OxygenAppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={username || "Account"} />
              <UserMenu.Header name={username} email={email} role={roles[0]} />
              <UserMenu.Item icon={<User />} label="Account" onClick={() => navigate("/account")} />
              <UserMenu.Divider />
              <UserMenu.Logout onClick={() => void signOut()} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </OxygenAppShell.Navbar>

      <OxygenAppShell.Sidebar>
        <Sidebar activeItem={activeId(pathname)}>
          <Sidebar.Nav>
            <Sidebar.Category>
              {NAV.map((item) => (
                <Can key={item.id} op={item.op}>
                  <Sidebar.Item id={item.id} link={<Link to={item.to} />}>
                    <Sidebar.ItemIcon>{item.icon}</Sidebar.ItemIcon>
                    <Sidebar.ItemLabel>{item.label}</Sidebar.ItemLabel>
                  </Sidebar.Item>
                </Can>
              ))}
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </OxygenAppShell.Sidebar>

      <OxygenAppShell.Main>
        <Outlet />
      </OxygenAppShell.Main>

      <OxygenAppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </OxygenAppShell.Footer>
    </OxygenAppShell>
  );
}
