import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BreadcrumbNav: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className="flex items-center space-x-2 text-sm font-mono text-phosphor-dim select-none">
      <Link
        to="/"
        className="flex items-center hover:text-neon-green transition-colors"
      >
        <span className="text-neon-green font-bold mr-1">~</span>
        <span className="sr-only">Home</span>
      </Link>

      {pathnames.length > 0 && (
        <ChevronRight className="h-4 w-4 text-phosphor-faint" />
      )}

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;

        return (
          <React.Fragment key={to}>
            <Link
              to={to}
              className={cn(
                "hover:text-neon-green transition-colors",
                isLast && "text-neon-green font-semibold"
              )}
            >
              {value}
            </Link>
            {!isLast && (
              <ChevronRight className="h-4 w-4 text-phosphor-faint" />
            )}
          </React.Fragment>
        );
      })}

      {/* Blinking cursor at the end of the path */}
      <span className="inline-block w-2 h-4 bg-neon-green ml-1 animate-blink" />
    </nav>
  );
};
