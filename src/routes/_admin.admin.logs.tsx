import { createFileRoute } from '@tanstack/react-router';
import { ActivityLogPage } from '@/features/activity-log/ActivityLogPage';

export const Route = createFileRoute('/_admin/admin/logs')({
  component: ActivityLogPage,
});
