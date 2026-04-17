import { Navigate, useLocation } from "react-router-dom";

export default function OrganizationSettings() {
  const location = useLocation();
  return <Navigate to={`/account?tab=organization${location.hash || ""}`} replace />;
}
