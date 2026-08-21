import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/interview")({
  beforeLoad: () => {
    throw redirect({ to: "/ai-interview" });
  },
  component: () => null,
});

