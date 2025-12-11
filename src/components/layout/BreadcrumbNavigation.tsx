import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home, User, FileText, Calendar } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const routeMap: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [
    { label: 'Dashboard', icon: Home },
  ],
  '/profile': [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Profile', icon: User },
  ],
  '/medical-records': [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Medical Records', icon: FileText },
  ],
  '/appointments': [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Appointments', icon: Calendar },
  ],
  '/doctor-discovery': [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Find Doctors' },
  ],
  '/doctors': [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'AI Medical Assistant' },
  ],
  '/ai-assistant': [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'AI Medical Assistant' },
  ],
};

export const BreadcrumbNavigation: React.FC = () => {
  const location = useLocation();
  const breadcrumbs = routeMap[location.pathname] || [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Page Not Found' },
  ];

  if (breadcrumbs.length <= 1) {
    return null; // Don't show breadcrumbs for single-level pages
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const Icon = item.icon;

          return (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.href!} className="flex items-center gap-2">
                      {Icon && <Icon className="h-4 w-4" />}
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};