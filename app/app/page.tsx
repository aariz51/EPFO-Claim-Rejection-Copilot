import { AppShell } from '../components/app-shell';

/**
 * The working application.
 *
 * The public landing page lives at "/" and explains the product. This route is
 * the workspace, so an urgent journey never competes with marketing content.
 */
export const metadata = {
  title: 'PF Precheck - the workspace',
};

export default function AppPage() {
  return <AppShell />;
}
