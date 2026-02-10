import Hero from "../components/Hero";
import TopSellers from "../components/TopSellers";
import DiamondSearch from "../components/DiamondSearch";
import ProductSlider from "../components/ProductSlider";
import AwardStory from "../components/AwardStory";
import FeaturedIn from "../components/FeaturedIn";
import CollectionGrid from "../components/CollectionGrid";
import AppointmentSection from "../components/AppointmentSection";

const Home = () => {
  return (
    <>
      <Hero />
      <TopSellers />
      <DiamondSearch />
      <ProductSlider title="Wedding Bands" />
      <AwardStory />
      <FeaturedIn />
      <CollectionGrid />
      <AppointmentSection />
    </>
  );
};

export default Home;
