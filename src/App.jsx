import { Routes, Route } from "react-router-dom";

import Header from "./components/Header";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import RingBuilder from "./pages/RingBuilder";

function App() {
  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ring-builder" element={<RingBuilder />} />
      </Routes>

      <Footer />
    </>
  );
}

export default App;
