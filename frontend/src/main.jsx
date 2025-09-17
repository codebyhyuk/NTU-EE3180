import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import App from "./App";
import About from "./pages/About";  // we’ll create this
import SingleProcessing from "./pages/SingleProcessing";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/about" element={<About />} />
        <Route path="/single-processing" element={<SingleProcessing />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
