'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Overview', exact: true },
  { href: '/dashboard/clients', label: 'Clients', exact: false },
  { href: '/dashboard/invoices', label: 'Invoices', exact: false },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 md:flex-col">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-2 text-sm ${active ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/5 hover:text-white'}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
