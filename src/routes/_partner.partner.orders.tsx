import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_partner/partner/orders')({
  component: Outlet,
});
