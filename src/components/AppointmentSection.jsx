import "./appointmentSection.css";

const AppointmentSection = () => {
  return (
    <section className="ap-section">
      <div className="ap-container">

        {/* LEFT IMAGE */}
        <div className="ap-images">
          <img
            src="/consult-main.png"
            alt="Consultation"
            className="ap-img-main"
          />
        </div>

        {/* RIGHT CONTENT */}
        <div className="ap-content">
          <h2>
            Schedule A Virtual or <br />
            In-Person Appointment
          </h2>

          <p>
            We now offer online appointments for all jewelry
            consultations. Feel free to call +1 (888) 326-4687
          </p>

          <button className="ap-btn">SCHEDULE NOW</button>
        </div>

      </div>
    </section>
  );
};

export default AppointmentSection;
