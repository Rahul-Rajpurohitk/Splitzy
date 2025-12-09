import React, { useEffect, useState } from "react";
import "../../login.css";
import SplitzyLogo from "../common/SplitzyLogo";

function AuthLayout({
  title,
  subtitle,
  children,
  footnote,
}) {
  const features = [
    "Categorized splits for every coffee run, rent share, or grocery dash.",
    "Group & friend hubs for trips, roommates, and side projects.",
    "Expense insights so everyone knows who owes what, instantly.",
    "Real-time chat to keep nudges, reminders, and receipts in one place.",
  ];

  const [currentFeature, setCurrentFeature] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setCurrentFeature((idx) => (idx + 1) % features.length),
      2800
    );
    return () => clearInterval(id);
  }, [features.length]);

  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div className="auth-hero__content">
          <SplitzyLogo variant="badge" />
          <h1 className="hero-headline">
            Expense sharing
            <br />
            <span className="gradient-text">that feels effortless.</span>
          </h1>

          <div className="feature-rotator">
            <div key={currentFeature} className="feature-line">
              {features[currentFeature]}
            </div>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <header>
          <p className="auth-kicker">Welcome to Splitzy</p>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
        </header>

        {children}

        {footnote && <p className="auth-footnote">{footnote}</p>}
      </section>
    </div>
  );
}

export default AuthLayout;

