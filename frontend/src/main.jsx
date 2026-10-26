import { createRoot } from "react-dom/client";
import "../../styles/main.css";
import "./styles.css";
import "./game/engine.js";
import App from "./app/App.jsx";
import { startUiStore } from "./game/ui-store.js";

startUiStore();
createRoot(document.getElementById("root")).render(<App />);
