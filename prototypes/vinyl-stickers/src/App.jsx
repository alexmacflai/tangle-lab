import { ComponentsPlayground } from "./components/ComponentsPlayground.jsx";
import { LibraryPrototype } from "./components/LibraryPrototype.jsx";

export default function App() {
  if (window.location.pathname === "/components") {
    return <ComponentsPlayground />;
  }

  return <LibraryPrototype />;
}
