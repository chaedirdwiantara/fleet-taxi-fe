import { createFileRoute } from '@tanstack/react-router';
import { GojekPortalSyncPage } from '@/features/gojek-portal-sync/GojekPortalSyncPage';

export const Route = createFileRoute('/_admin/admin/gojek/portal-sync')({
  component: GojekPortalSyncPage,
});
