import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// When VITE_API_URL is set (e.g. https://my-api.render.com), all API calls
// will be prefixed with that URL. Leave unset to use the Vite proxy (local dev)
// or same-origin serving (production).
const apiUrl = import.meta.env["VITE_API_URL"] as string | undefined;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
