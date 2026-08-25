import { RouterProvider } from "react-router-dom";
import { AuthGate } from "./app/AuthGate";
import { router } from "./app/router";

export default function App() {
  return (
    <AuthGate>
      <RouterProvider router={router} />
    </AuthGate>
  );
}