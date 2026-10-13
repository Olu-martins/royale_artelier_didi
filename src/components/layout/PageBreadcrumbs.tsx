import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

export interface BreadcrumbCrumb {
  label: string;
  href?: string;
}

interface PageBreadcrumbsProps {
  items: BreadcrumbCrumb[];
  className?: string;
}

/**
 * Shared inner-page trail: Home (and optional parents) → current page.
 * Product/Shop pages keep their own richer crumbs; use this elsewhere.
 */
const PageBreadcrumbs = ({ items, className }: PageBreadcrumbsProps) => {
  if (items.length === 0) return null;

  return (
    <Breadcrumb className={cn("mb-6", className)}>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default PageBreadcrumbs;
