import AdminTopBar from "./AdminTopBar";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="space-y-6 bg-admin-bg">
      <AdminTopBar />
      {children}
    </div>
  );
}
