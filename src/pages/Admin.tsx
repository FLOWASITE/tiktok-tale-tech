import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to admin dashboard
    navigate("/admin/dashboard", { replace: true });
  }, [navigate]);

  return null;
}
