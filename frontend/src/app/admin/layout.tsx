import AdminTopBar from "./AdminTopBar";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="space-y-4">
      <AdminTopBar />
      {children}
    </div>
  );
}
