import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";

/**
 * Mount once inside <BrowserRouter>; fires a `page_view` analytics event
 * each time the route changes.
 */
export const PageViewTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return null;
};

export default PageViewTracker;
