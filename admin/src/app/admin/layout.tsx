import Link from "next/link";
import { auth } from "../../lib/auth";
import { redirect } from "next/navigation";
import { ListOrdered, PlusCircle } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = session?.user && (session.user as any).role;
  if (!session?.user || role !== "admin") redirect("/signin");

  return (
    <div className="grid min-h-screen grid-cols-[260px_1fr] bg-white text-gray-900">
      <aside className="border-r border-gray-200 p-4">
        <div className="mb-4 text-lg font-bold">PlazaCMS Admin</div>
        <nav className="grid gap-3">
          <Section title="Product">
            <NavItem href="/admin/products/add" icon={<PlusCircle className="h-4 w-4" />}>Add Product</NavItem>
            <NavItem href="/admin/products" icon={<ListOrdered className="h-4 w-4" />}>Product List</NavItem>
            <NavItem href="/admin/categories" icon={<ListOrdered className="h-4 w-4" />}>Categories</NavItem>
            <NavItem href="/admin/attributes" icon={<ListOrdered className="h-4 w-4" />}>Attributes</NavItem>
          </Section>
        </nav>
      </aside>
      <section>
        <header className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="text-xl font-semibold">Admin</div>
          <div>{/* top actions */}</div>
        </header>
        <div className="p-4">{children}</div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="my-2 text-xs font-semibold uppercase text-gray-500">{title}</div>
      <div className="grid gap-1">{children}</div>
    </div>
  );
}

function NavItem({ href, children, icon }: { href: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-md px-2 py-2 text-gray-900 hover:bg-gray-100">
      {icon}
      <span>{children}</span>
    </Link>
  );
}
