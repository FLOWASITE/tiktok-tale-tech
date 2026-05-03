import { Navigate } from "react-router-dom";

// Legacy route → SEO Hub mới
export default function AdminSeoKeywords() {
  return <Navigate to="/admin/seo" replace />;
}
