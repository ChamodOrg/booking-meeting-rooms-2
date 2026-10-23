import { useEffect, useRef, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Layout, Stack, Typography, CircularProgress } from "@wso2/oxygen-ui";
import { handleCallback } from "../authz/session";

export function CallbackPage(): ReactElement {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    handleCallback().then(
      () => navigate("/", { replace: true }),
      (e: unknown) => setError(e instanceof Error ? e.message : "Sign-in failed"),
    );
  }, [navigate]);

  return (
    <Layout.Content>
      <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ height: "100%", p: 4 }}>
        {error ? (
          <Alert severity="error">Sign-in could not be completed: {error}</Alert>
        ) : (
          <>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Signing you in…
            </Typography>
          </>
        )}
      </Stack>
    </Layout.Content>
  );
}
