import type { ReactElement } from "react";
import { Box, Button, Layout, ParticleBackground, Stack, Typography } from "@wso2/oxygen-ui";
import { signIn } from "../authz/session";

export function SignedOutPage(): ReactElement {
  return (
    <Layout.Content>
      <ParticleBackground opacity={0.5} />
      <Box sx={{ height: "100%" }}>
        <Stack alignItems="center" justifyContent="center" spacing={3} sx={{ height: "100%", p: 4 }}>
          <Typography variant="h4">You are signed out</Typography>
          <Button variant="contained" onClick={() => void signIn()}>
            Sign in
          </Button>
        </Stack>
      </Box>
    </Layout.Content>
  );
}
