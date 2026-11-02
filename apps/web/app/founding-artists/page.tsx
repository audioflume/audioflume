import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import FoundingFaq from "./FoundingFaq";
import FoundingScrollReveal from "./FoundingScrollReveal";
import FoundingHeroPlayerHeight from "./FoundingHeroPlayerHeight";
import FoundingStepsShelf from "./FoundingStepsShelf";
import { AudioflumeMark } from "@/components/LifetimeAccessCard";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import "./founding-artists.css";

export const metadata: Metadata = {
  title: "Founding Artists | Audioflume",
  description: "Join the first 100 approved Audioflume Founding Artists. Build the future of music licensing for film with lasting recognition and artist-first benefits.",
};

const benefits = [
  { number: "01", title: "100% earnings on eligible Premium licences", copy: "Founding Artists receive 100% of eligible Premium artist-licence earnings, subject to the program terms and applicable deductions. Subscription, enterprise, and commissioned licensing are treated separately." },
  { number: "02", title: "Preferential enterprise licensing terms", copy: "Get access to founding-member terms for qualifying individually negotiated enterprise licensing opportunities." },
  { number: "03", title: "Lifetime priority promotion", copy: "Receive priority consideration for editorial placement and discovery opportunities as the Audioflume catalogue grows." },
  { number: "04", title: "Priority licensing opportunities", copy: "Be considered early for relevant briefs, curated selections, and licensing enquiries that match your music." },
  { number: "05", title: "Permanent Founding Artist recognition", copy: "Your Founding Artist status stays associated with your artist profile, recognizing your part in building Audioflume from the beginning." },
  { number: "06", title: "Exclusive artist features & promotion", copy: "Be considered for artist spotlights, launches, interviews, and other dedicated features across Audioflume channels." },
  { number: "07", title: "Priority new-release review", copy: "Your new submissions receive priority review consideration as part of the founding program." },
];

const steps = [
  { number: "01", title: "Apply", copy: "Tell us about your work, your sound, and the music you want to contribute." },
  { number: "02", title: "Get reviewed", copy: "Our team reviews applications for originality, quality, catalogue fit, and licensing readiness." },
  { number: "03", title: "Join the first 100", copy: "If approved while places remain, you'll be welcomed as a Founding Artist and receive the applicable program benefits." },
];

const questions = [
  { question: "Who can apply?", answer: "Independent artists, composers, producers, and sound designers creating original music for visual storytelling are welcome to apply. Every application is reviewed." },
  { question: "Is a place guaranteed?", answer: "No. The program is limited to the first 100 approved artists. Applying does not guarantee acceptance or reserve a place." },
  { question: "Does founding status last forever?", answer: "Founding recognition is intended to remain with approved members for the lifetime of the program, subject to compliance with the artist agreement and program terms." },
  { question: "Does 100% earnings apply to every licence?", answer: "No. It applies to eligible Premium artist licences only, as defined in the applicable terms. Subscription revenue, enterprise deals, custom commissions, and other licence types may have separate arrangements." },
  { question: "Does priority promotion guarantee placements or sales?", answer: "No. Priority means preferential consideration, not a guarantee of licensing opportunities, sales, placements, or earnings." },
];

function ApplyLink({ light = false, children = "Apply to become a Founding Artist" }: { light?: boolean; children?: string }) {
  return <Link href="/artists/apply" className={`af-founding-cta${light ? " is-light" : ""}`}>{children}<ArrowUpRightIcon size={18} strokeWidth={1.5} /></Link>;
}

export default function FoundingArtistsPage() {
  return (
    <main className="af-founding-page">
      <FoundingScrollReveal />
      <FoundingHeroPlayerHeight>
        <div className="af-founding-hero-image" aria-hidden="true" />
        <div className="af-founding-hero-shade" aria-hidden="true" />
        <div className="af-founding-hero-inner">
          
          <h1 id="af-founding-title" className="af-founding-hero-title"><span>JOIN THE FOUNDING</span><span>ARTISTS PROGRAM</span></h1>
          <div className="af-founding-hero-bottom">
            <p>The first 100 artists.<br />Founding members for life.</p>
            <ApplyLink light />
          </div>
        </div>
      </FoundingHeroPlayerHeight>

      <section className="af-founding-intro af-reveal">
        <div className="af-founding-width">
          <div className="af-founding-intro-grid">
            <h2>The Founding Artists program recognizes the first 100 approved artists who help shape the catalogue.</h2>
            <p>Founding members receive lasting financial advantages, including 100% earnings on Premium Artist licences, preferential enterprise licensing terms, and exclusive benefits designed to reward their early support for years to come.</p>
          </div>
        </div>
      </section>

      <section className="af-founding-benefits af-reveal">
        <div className="af-founding-width">
          <div className="af-founding-section-head"><h2>Founding member benefits</h2><AudioflumeMark className="af-founding-benefits-mark" /></div>
          <div className="af-founding-benefit-list">
            {benefits.map(({ number, title, copy }) => <article className="af-founding-benefit" key={number}><span className="af-founding-benefit-number">{number}</span><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
          <p className="af-founding-terms-note">*Premium licence eligibility, accounting, deductions, and other program benefits are governed by the applicable artist agreement and final program terms. Priority and promotional benefits are not guaranteed placements or earnings.</p>
        </div>
      </section>

      <section className="af-founding-statement af-reveal">
        <div className="af-founding-width"><span>WHY WE'RE DOING THIS</span><p>Human-made music deserves a platform that values the people behind it.</p></div>
      </section>

      <section className="af-founding-process af-founding-width af-reveal">
        <div className="af-founding-section-head"><h2>How to become a Founding Artist</h2><span>THREE SIMPLE STEPS</span></div>
        <FoundingStepsShelf steps={steps} />
      </section>

      <section className="af-founding-faq af-reveal">
        <div className="af-founding-width af-founding-faq-grid">
          <FoundingFaq questions={questions} />
        </div>
      </section>

      <section className="af-founding-final af-reveal">
        <div className="af-founding-width"><span>FIRST 100 APPROVED ARTISTS</span><h2>Make your mark<br />from the beginning.</h2><p>Join the people helping shape the next chapter of music for film.</p><ApplyLink light /></div>
      </section>
      <Footer showTopBorder={false} />
    </main>
  );
}
