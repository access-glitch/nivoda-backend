import "./footer.css";
import { Mail, Phone, Twitter, Facebook, Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="ft-wrapper">

      {/* TOP BAR */}
      <div className="ft-top">
        <img src="/danhove-logo.webp" alt="Danhov" className="ft-logo" />

        <div className="ft-socials">
          <a href="#"><Twitter size={18} /></a>
          <a href="#"><Facebook size={18} /></a>
          <a href="#"><Instagram size={18} /></a>
        </div>
      </div>

      <div className="ft-divider" />

      {/* MAIN CONTENT */}
      <div className="ft-content">

        {/* CONTACT */}
        <div className="ft-col">
          <h4>Contact</h4>

          <p className="ft-contact">
            <Mail size={14} /> cs@danhov.com
          </p>

          <p className="ft-contact">
            <Phone size={14} /> (888) 326-4687
          </p>

          <p className="ft-text">
            Lorem ipsum dolor sit amet, consectetur
            adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna
          </p>
        </div>

        {/* OUR JEWELRY */}
        <div className="ft-col">
          <h4>Our Jewelry</h4>
          <ul>
            <li>Engagement Rings</li>
            <li>Wedding Bands</li>
            <li>Fine Jewelry</li>
          </ul>
        </div>

        {/* GOOD TO KNOW */}
        <div className="ft-col">
          <h4>Good To Know</h4>
          <ul>
            <li>Blog</li>
            <li>FAQs</li>
            <li>Return Policy</li>
            <li>Shipping</li>
            <li>Lifetime Warranty</li>
            <li>Privacy Policy</li>
          </ul>
        </div>

        {/* NEWSLETTER */}
        <div className="ft-col ft-newsletter">
          <h3>
            Lorem ipsum dolor sit amet,
            consectetur adipiscing elit
          </h3>

          <p>Subscribe to get latest update & news</p>

          <div className="ft-subscribe">
            <input type="email" placeholder="Email address" />
            <button>Subscribe</button>
          </div>
        </div>

      </div>

      {/* BOTTOM */}
      <div className="ft-bottom">
        © Copyright 2025 by Danhov. Design & Developed by Innovate Marketers.
      </div>

    </footer>
  );
};

export default Footer;
