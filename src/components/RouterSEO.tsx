import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import SEO from "@/components/SEO";
import { getRouteSEOConfig } from "@/lib/seo";

const RouterSEO = () => {
  const location = useLocation();

  const seoConfig = useMemo(
    () => getRouteSEOConfig(location.pathname),
    [location.pathname]
  );

  return <SEO path={`${location.pathname}${location.search}`} {...seoConfig} />;
};

export default RouterSEO;
